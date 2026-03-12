-- ==============================================
-- MIGRATION: Worker de despacho email para tareas
-- Fecha: Marzo 12, 2026
-- Descripción:
--   1) Habilita estado PROCESSING en task_email_queue
--   2) Agrega función para reclamar jobs de forma concurrente segura
-- ==============================================

BEGIN;

-- Permitir estado intermedio PROCESSING
ALTER TABLE task_email_queue
  DROP CONSTRAINT IF EXISTS task_email_queue_status_check;

ALTER TABLE task_email_queue
  ADD CONSTRAINT task_email_queue_status_check
  CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED'));

CREATE INDEX IF NOT EXISTS idx_task_email_queue_processing
  ON task_email_queue(status, attempts, created_at);

-- Reclama jobs pendientes/fallidos para procesamiento seguro (SKIP LOCKED)
CREATE OR REPLACE FUNCTION claim_task_email_jobs(p_limit INT DEFAULT 25)
RETURNS TABLE (
  id BIGINT,
  task_id BIGINT,
  reminder_id BIGINT,
  to_email VARCHAR,
  subject VARCHAR,
  body TEXT,
  attempts INT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH to_claim AS (
    SELECT q.id
    FROM task_email_queue q
    WHERE q.status IN ('PENDING', 'FAILED')
      AND q.attempts < 5
    ORDER BY q.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE task_email_queue q
    SET
      status = 'PROCESSING',
      attempts = q.attempts + 1,
      updated_at = NOW(),
      last_error = NULL
    FROM to_claim c
    WHERE q.id = c.id
    RETURNING q.id, q.task_id, q.reminder_id, q.to_email, q.subject, q.body, q.attempts, q.created_at
  )
  SELECT * FROM claimed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
