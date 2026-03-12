-- ==============================================
-- FIX: Storage policies para fotos de tareas
-- Bucket: uploads
-- Ruta: public/tasks/*
-- ==============================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

DROP POLICY IF EXISTS "task_uploads_select_public" ON storage.objects;
DROP POLICY IF EXISTS "task_uploads_insert_public" ON storage.objects;
DROP POLICY IF EXISTS "task_uploads_update_public" ON storage.objects;
DROP POLICY IF EXISTS "task_uploads_delete_public" ON storage.objects;

CREATE POLICY "task_uploads_select_public"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'uploads'
  AND name LIKE 'public/tasks/%'
);

CREATE POLICY "task_uploads_insert_public"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'public/tasks/%'
);

CREATE POLICY "task_uploads_update_public"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'uploads'
  AND name LIKE 'public/tasks/%'
)
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'public/tasks/%'
);

CREATE POLICY "task_uploads_delete_public"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'uploads'
  AND name LIKE 'public/tasks/%'
);

COMMIT;
