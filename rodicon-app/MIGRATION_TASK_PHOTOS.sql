-- ==============================================
-- MIGRATION: Fotos para tareas
-- Fecha: Marzo 12, 2026
-- ==============================================

BEGIN;

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

ALTER TABLE task_photos DISABLE ROW LEVEL SECURITY;

COMMIT;
