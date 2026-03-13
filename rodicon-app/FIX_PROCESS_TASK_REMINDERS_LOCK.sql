-- ==============================================
-- FIX: process_task_reminders FOR UPDATE con LEFT JOIN
-- Fecha: Marzo 12, 2026
-- Error corregido:
--   FOR UPDATE cannot be applied to the nullable side of an outer join
-- ==============================================

CREATE TABLE IF NOT EXISTS task_assignees (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

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

INSERT INTO task_assignees (task_id, user_id)
SELECT t.id, t.assigned_to
FROM tasks t
WHERE t.assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

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
  v_photos_html TEXT;
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
    v_photos_html := '';

    SELECT COALESCE(string_agg(
      '<a href="' || p.url || '" target="_blank" style="display:inline-block;margin-right:8px;margin-bottom:8px;">' ||
      '<img src="' || p.url || '" alt="Foto tarea" style="width:140px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />' ||
      '</a>'
    , ''), '')
    INTO v_photos_html
    FROM (
      SELECT replace(replace(tp.url, '<', '&lt;'), '>', '&gt;') AS url
      FROM task_photos tp
      WHERE tp.task_id = rec.task_id
      ORDER BY tp.created_at DESC
      LIMIT 4
    ) p;

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
              CASE WHEN v_photos_html <> '' THEN
                '<div style="margin-top: 12px;">' ||
                  '<p style="margin: 0 0 8px 0;"><strong>Fotos de la tarea:</strong></p>' ||
                  '<div>' || v_photos_html || '</div>' ||
                '</div>'
              ELSE '' END ||
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
