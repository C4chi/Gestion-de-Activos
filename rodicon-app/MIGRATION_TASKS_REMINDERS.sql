-- ==============================================
-- MIGRATION: Módulo de Tareas + Recordatorios
-- Fecha: Marzo 12, 2026
-- Descripción:
--   1) Gestión de tareas administrativas
--   2) Recordatorios in-app vía tabla notifications
--   3) Cola de emails para despacho por worker externo
-- ==============================================

BEGIN;

-- 1) Tabla principal de tareas
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  due_date TIMESTAMP NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA')),
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- 2) Recordatorios de tareas
CREATE TABLE IF NOT EXISTS task_reminders (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  remind_at TIMESTAMP NOT NULL,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  sent_at TIMESTAMP,
  in_app_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_queued BOOLEAN NOT NULL DEFAULT FALSE,
  processed_by VARCHAR(100),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT task_reminders_channels_check CHECK (
    channels <@ ARRAY['in_app', 'email']::TEXT[]
    AND array_length(channels, 1) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_pending ON task_reminders(remind_at, sent_at);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);

-- 3) Cola de emails (despacho externo)
CREATE TABLE IF NOT EXISTS task_email_queue (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_id BIGINT REFERENCES task_reminders(id) ON DELETE SET NULL,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  attempts INT NOT NULL DEFAULT 0,
  sent_at TIMESTAMP,
  provider_message_id VARCHAR(255),
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_email_queue_status ON task_email_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_task_email_queue_task ON task_email_queue(task_id);

-- Trigger genérico updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS task_reminders_set_updated_at ON task_reminders;
CREATE TRIGGER task_reminders_set_updated_at
BEFORE UPDATE ON task_reminders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS task_email_queue_set_updated_at ON task_email_queue;
CREATE TRIGGER task_email_queue_set_updated_at
BEFORE UPDATE ON task_email_queue
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Función principal para procesar recordatorios vencidos.
-- Debe ejecutarse por scheduler (pg_cron/Edge Function/worker externo) cada 5-10 minutos.
CREATE OR REPLACE FUNCTION process_task_reminders(p_limit INT DEFAULT 100)
RETURNS TABLE (
  reminders_processed INT,
  in_app_notifications INT,
  emails_queued INT
) AS $$
DECLARE
  rec RECORD;
  v_processed INT := 0;
  v_inapp INT := 0;
  v_emails INT := 0;
  v_has_notifications_table BOOLEAN;
  v_title TEXT;
  v_description TEXT;
  v_priority TEXT;
  v_due_date TEXT;
  v_assignee_name TEXT;
BEGIN
  SELECT to_regclass('public.notifications') IS NOT NULL INTO v_has_notifications_table;

  FOR rec IN
    SELECT
      r.id AS reminder_id,
      r.channels,
      r.task_id,
      t.title,
      t.description,
      t.priority,
      t.due_date,
      t.assigned_to,
      u.email AS assignee_email,
      u.nombre AS assignee_name
    FROM task_reminders r
    INNER JOIN tasks t ON t.id = r.task_id
    LEFT JOIN app_users u ON u.id = t.assigned_to
    WHERE r.sent_at IS NULL
      AND r.remind_at <= NOW()
      AND t.status IN ('PENDIENTE', 'EN_PROGRESO')
    ORDER BY r.remind_at ASC
    LIMIT p_limit
    FOR UPDATE OF r SKIP LOCKED
  LOOP
    v_title := replace(replace(COALESCE(rec.title, 'Tarea sin título'), '<', '&lt;'), '>', '&gt;');
    v_description := replace(replace(COALESCE(rec.description, 'Sin descripción adicional.'), '<', '&lt;'), '>', '&gt;');
    v_priority := replace(replace(COALESCE(rec.priority, 'MEDIA'), '<', '&lt;'), '>', '&gt;');
    v_due_date := to_char(rec.due_date, 'YYYY-MM-DD HH24:MI');
    v_assignee_name := replace(replace(COALESCE(rec.assignee_name, 'Usuario'), '<', '&lt;'), '>', '&gt;');

    -- Canal IN-APP
    IF v_has_notifications_table AND ('in_app' = ANY (rec.channels)) AND rec.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
      VALUES (
        rec.assigned_to,
        'GENERAL',
        '⏰ Recordatorio de tarea',
        'La tarea "' || rec.title || '" está próxima o vencida. Fecha límite: ' || v_due_date,
        rec.task_id::TEXT,
        'task',
        jsonb_build_object(
          'task_id', rec.task_id,
          'due_date', rec.due_date,
          'source', 'task_reminder'
        )
      );
      v_inapp := v_inapp + 1;
    END IF;

    -- Canal EMAIL (se encola para un worker externo)
    IF ('email' = ANY (rec.channels)) AND rec.assignee_email IS NOT NULL THEN
      INSERT INTO task_email_queue (task_id, reminder_id, to_email, subject, body)
      VALUES (
        rec.task_id,
        rec.reminder_id,
        rec.assignee_email,
        'Recordatorio de tarea: ' || rec.title,
        '<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">' ||
          '<h2 style="margin: 0 0 12px 0; color: #111827;">⏰ Recordatorio de tarea</h2>' ||
          '<p style="margin: 0 0 12px 0;">Hola <strong>' || v_assignee_name || '</strong>, tienes una tarea pendiente.</p>' ||
          '<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">' ||
            '<p style="margin: 0 0 8px 0;"><strong>Nombre:</strong> ' || v_title || '</p>' ||
            '<p style="margin: 0 0 8px 0;"><strong>Descripción:</strong> ' || v_description || '</p>' ||
            '<p style="margin: 0 0 8px 0;"><strong>Prioridad:</strong> ' || v_priority || '</p>' ||
            '<p style="margin: 0;"><strong>Fecha de vencimiento:</strong> ' || v_due_date || '</p>' ||
          '</div>' ||
          '<p style="margin: 12px 0 0 0; color: #6b7280; font-size: 12px;">Mensaje automático de Rodicon.</p>' ||
        '</div>'
      );
      v_emails := v_emails + 1;
    END IF;

    UPDATE task_reminders
    SET
      sent_at = NOW(),
      in_app_sent = ('in_app' = ANY (rec.channels)),
      email_queued = ('email' = ANY (rec.channels)) AND rec.assignee_email IS NOT NULL,
      attempts = attempts + 1,
      processed_by = 'process_task_reminders'
    WHERE id = rec.reminder_id;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_inapp, v_emails;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS deshabilitado para mantener consistencia con app_users + PIN de este proyecto.
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_email_queue DISABLE ROW LEVEL SECURITY;

COMMIT;
