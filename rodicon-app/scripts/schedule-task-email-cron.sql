-- Opción SQL para cron cada 5 minutos usando pg_cron + pg_net
-- IMPORTANTE: Reemplaza <PROJECT_REF> y <ANON_OR_SERVICE_KEY>

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Elimina schedule previo (si existe)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'task-email-dispatch-every-5m';

-- Programa ejecución cada 5 minutos
SELECT cron.schedule(
  'task-email-dispatch-every-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/task-email-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_OR_SERVICE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verificación
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'task-email-dispatch-every-5m';
