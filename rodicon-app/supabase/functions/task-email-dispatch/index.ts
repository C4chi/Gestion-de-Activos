// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ClaimedJob = {
  id: number;
  task_id: number;
  reminder_id: number | null;
  to_email: string;
  subject: string;
  body: string;
  attempts: number;
  created_at: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
  const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Rodicon';
  const maxJobs = Number(Deno.env.get('TASK_EMAIL_MAX_JOBS') || '25');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase credentials in secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!sendgridApiKey || !fromEmail) {
    return new Response(JSON.stringify({ error: 'Missing SendGrid secrets (SENDGRID_API_KEY or SENDGRID_FROM_EMAIL)' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: jobs, error: claimError } = await supabase
    .rpc('claim_task_email_jobs', { p_limit: maxJobs })
    .returns<ClaimedJob[]>();

  if (claimError) {
    return new Response(JSON.stringify({ error: 'Failed to claim jobs', detail: claimError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const queue = jobs || [];
  if (queue.length === 0) {
    return new Response(JSON.stringify({ processed: 0, sent: 0, failed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const job of queue) {
    try {
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: job.to_email }] }],
          from: { email: fromEmail, name: fromName },
          subject: job.subject,
          content: [{ type: 'text/plain', value: job.body }],
        }),
      });

      if (!sendgridResponse.ok) {
        const errorText = await sendgridResponse.text();
        throw new Error(`SendGrid ${sendgridResponse.status}: ${errorText}`);
      }

      const providerMessageId = sendgridResponse.headers.get('x-message-id');

      const { error: updateSuccessError } = await supabase
        .from('task_email_queue')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          provider_message_id: providerMessageId,
          last_error: null,
        })
        .eq('id', job.id)
        .eq('status', 'PROCESSING');

      if (updateSuccessError) {
        throw new Error(`Failed to mark SENT: ${updateSuccessError.message}`);
      }

      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown send error';

      await supabase
        .from('task_email_queue')
        .update({
          status: 'FAILED',
          last_error: message.slice(0, 1000),
        })
        .eq('id', job.id)
        .eq('status', 'PROCESSING');

      failed += 1;
    }
  }

  return new Response(JSON.stringify({ processed: queue.length, sent, failed }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
