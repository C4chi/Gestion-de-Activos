-- FIX_SUPABASE_STORAGE_RLS_HSE_UPLOADS.sql
-- Objetivo: permitir upload/lectura de fotos HSE en storage bucket `uploads`
-- Ruta utilizada por la app: public/hse-inspections/*
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- 1) Asegurar existencia del bucket y que sea público
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- 2) Limpiar policies previas (idempotente)
DROP POLICY IF EXISTS "hse_uploads_select_public" ON storage.objects;
DROP POLICY IF EXISTS "hse_uploads_insert_public" ON storage.objects;
DROP POLICY IF EXISTS "hse_uploads_update_public" ON storage.objects;
DROP POLICY IF EXISTS "hse_uploads_delete_public" ON storage.objects;

-- 3) Lectura: permitir ver objetos de la carpeta HSE
CREATE POLICY "hse_uploads_select_public"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'uploads'
  AND name LIKE 'public/hse-inspections/%'
);

-- 4) Escritura: permitir subir objetos solo en carpeta HSE
CREATE POLICY "hse_uploads_insert_public"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'public/hse-inspections/%'
);

-- 5) (Opcional pero útil) Permitir actualizar/reemplazar y borrar en esa carpeta
CREATE POLICY "hse_uploads_update_public"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'uploads'
  AND name LIKE 'public/hse-inspections/%'
)
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'public/hse-inspections/%'
);

CREATE POLICY "hse_uploads_delete_public"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'uploads'
  AND name LIKE 'public/hse-inspections/%'
);

COMMIT;
