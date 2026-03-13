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

const isLikelyHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value || '');

const escapeHtml = (value: string) =>
  (value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const wrapPlainAsHtml = (value: string) => {
  const escaped = escapeHtml(value || '').replaceAll('\n', '<br/>');
  return `<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">${escaped}</div>`;
};

const stripHtml = (value: string) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const removeLegacyGoogleCalendarCta = (value: string) => {
  if (!value) return value;

  return value
    .replace(
      /<div[^>]*>\s*<a[^>]*calendar\.google\.com\/calendar\/render[^>]*>[\s\S]*?<\/a>\s*<\/div>/gi,
      ''
    )
    .replace(/Añadir a Google Calendar/gi, '');
};

const toIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const escapeIcsText = (value: string) =>
  (value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');

const toBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value || '');
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

const buildIcsAttachment = (params: {
  uid: string;
  title: string;
  description?: string | null;
  dueDate: Date;
}) => {
  const startDate = new Date(params.dueDate.getTime() - 30 * 60 * 1000);
  const endDate = new Date(params.dueDate.getTime() + 30 * 60 * 1000);
  const dtStamp = toIcsDate(new Date());

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rodicon//Task Reminders//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(params.uid)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${toIcsDate(startDate)}`,
    `DTEND:${toIcsDate(endDate)}`,
    `SUMMARY:${escapeIcsText(params.title || 'Recordatorio de tarea')}`,
    `DESCRIPTION:${escapeIcsText(params.description || 'Seguimiento de tarea')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return {
    content: toBase64Utf8(ics),
    filename: 'recordatorio-tarea.ics',
    type: 'text/calendar',
    disposition: 'attachment',
  };
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
      const normalizedBody = removeLegacyGoogleCalendarCta(job.body || '');
      const htmlBody = isLikelyHtml(normalizedBody) ? normalizedBody : wrapPlainAsHtml(normalizedBody);
      const textBody = isLikelyHtml(normalizedBody) ? stripHtml(normalizedBody) : normalizedBody;

      let attachments: Array<{
        content: string;
        filename: string;
        type: string;
        disposition: string;
      }> = [];

      const { data: taskInfo } = await supabase
        .from('tasks')
        .select('title,description,due_date')
        .eq('id', job.task_id)
        .maybeSingle();

      const dueDate = taskInfo?.due_date ? new Date(taskInfo.due_date) : null;
      if (dueDate && !Number.isNaN(dueDate.getTime())) {
        attachments = [
          buildIcsAttachment({
            uid: `${job.id}@rodicon.app`,
            title: taskInfo?.title || job.subject || 'Recordatorio de tarea',
            description: taskInfo?.description || textBody || 'Seguimiento de tarea',
            dueDate,
          }),
        ];
      }

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
          content: [
            { type: 'text/plain', value: textBody || 'Recordatorio de tarea' },
            { type: 'text/html', value: htmlBody || wrapPlainAsHtml('Recordatorio de tarea') },
          ],
          attachments,
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
