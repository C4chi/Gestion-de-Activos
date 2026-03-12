-- ==============================================
-- MIGRATION: Multi-responsables para tareas
-- Fecha: Marzo 12, 2026
-- ==============================================

BEGIN;

CREATE TABLE IF NOT EXISTS task_assignees (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Backfill: crear relación para tareas existentes que solo tienen assigned_to
INSERT INTO task_assignees (task_id, user_id)
SELECT t.id, t.assigned_to
FROM tasks t
WHERE t.assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

ALTER TABLE task_assignees DISABLE ROW LEVEL SECURITY;

COMMIT;
