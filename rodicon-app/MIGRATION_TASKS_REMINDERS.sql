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

-- 1.2) Fotos adjuntas de tareas
CREATE TABLE IF NOT EXISTS task_photos (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  file_name VARCHAR(255),
  uploaded_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_photos_task ON task_photos(task_id);

-- 1.1) Relación N:M de responsables por tarea
CREATE TABLE IF NOT EXISTS task_assignees (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- 2) Recordatorios de tareas
CREATE TABLE IF NOT EXISTS task_reminders (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  remind_at TIMESTAMP NOT NULL,
  repeat_every_hours INT,
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
  ),
  CONSTRAINT task_reminders_repeat_hours_check CHECK (
    repeat_every_hours IS NULL OR repeat_every_hours > 0
  )
);

ALTER TABLE task_reminders
ADD COLUMN IF NOT EXISTS repeat_every_hours INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_reminders_repeat_hours_check'
      AND conrelid = 'task_reminders'::regclass
  ) THEN
    ALTER TABLE task_reminders
    ADD CONSTRAINT task_reminders_repeat_hours_check CHECK (
      repeat_every_hours IS NULL OR repeat_every_hours > 0
    );
  END IF;
END $$;

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
  assignee_rec RECORD;
  v_processed INT := 0;
  v_inapp INT := 0;
  v_emails INT := 0;
  v_has_notifications_table BOOLEAN;
  v_title TEXT;
  v_description TEXT;
  v_priority TEXT;
  v_due_date TEXT;
  v_email_for_reminder BOOLEAN;
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
      r.repeat_every_hours
    FROM task_reminders r
    INNER JOIN tasks t ON t.id = r.task_id
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
    v_due_date := COALESCE(to_char(rec.due_date, 'YYYY-MM-DD HH24:MI'), 'Sin fecha límite');
    v_email_for_reminder := FALSE;

    FOR assignee_rec IN
      SELECT u.id AS user_id, u.email, u.nombre
      FROM app_users u
      INNER JOIN task_assignees ta ON ta.user_id = u.id
      WHERE ta.task_id = rec.task_id
      UNION ALL
      SELECT u.id AS user_id, u.email, u.nombre
      FROM app_users u
      WHERE rec.assigned_to IS NOT NULL
        AND u.id = rec.assigned_to
        AND NOT EXISTS (
          SELECT 1
          FROM task_assignees ta
          WHERE ta.task_id = rec.task_id
        )
    LOOP
      IF v_has_notifications_table AND ('in_app' = ANY (rec.channels)) THEN
        INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
        VALUES (
          assignee_rec.user_id,
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

      IF ('email' = ANY (rec.channels)) AND assignee_rec.email IS NOT NULL THEN
        BEGIN
          INSERT INTO task_email_queue (task_id, reminder_id, to_email, subject, body)
          VALUES (
            rec.task_id,
            rec.reminder_id,
            assignee_rec.email,
            'Recordatorio de tarea: ' || rec.title,
            '<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">' ||
              '<h2 style="margin: 0 0 12px 0; color: #111827;">⏰ Recordatorio de tarea</h2>' ||
              '<p style="margin: 0 0 12px 0;">Hola <strong>' || replace(replace(COALESCE(assignee_rec.nombre, 'Usuario'), '<', '&lt;'), '>', '&gt;') || '</strong>, tienes una tarea pendiente.</p>' ||
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
          v_email_for_reminder := TRUE;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END LOOP;

    UPDATE task_reminders
    SET
      sent_at = CASE
        WHEN COALESCE(rec.repeat_every_hours, 0) > 0 THEN NULL
        ELSE NOW()
      END,
      remind_at = CASE
        WHEN COALESCE(rec.repeat_every_hours, 0) > 0
          THEN NOW() + make_interval(hours => rec.repeat_every_hours)
        ELSE remind_at
      END,
      in_app_sent = ('in_app' = ANY (rec.channels)),
      email_queued = ('email' = ANY (rec.channels)) AND v_email_for_reminder,
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
ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_email_queue DISABLE ROW LEVEL SECURITY;

COMMIT;
