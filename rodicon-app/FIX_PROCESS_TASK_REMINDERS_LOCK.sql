-- ==============================================
-- FIX: process_task_reminders FOR UPDATE con LEFT JOIN
-- Fecha: Marzo 12, 2026
-- Error corregido:
--   FOR UPDATE cannot be applied to the nullable side of an outer join
-- ==============================================

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
