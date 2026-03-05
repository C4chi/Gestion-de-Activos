-- BACKFILL_HSE_CONDUCTED_BY.sql
-- Corrige inspecciones HSE con conducted_by NULL (aparecen como "No especificado")
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- =========================================================
-- 1) DIAGNÓSTICO
-- =========================================================
-- Inspecciones sin usuario
SELECT id, inspection_number, title, conducted_by, created_at, completed_at
FROM hse_inspections
WHERE conducted_by IS NULL
ORDER BY created_at DESC;

-- Usuarios disponibles
SELECT id, nombre, nombre_usuario, rol
FROM app_users
ORDER BY nombre;

-- =========================================================
-- 2) BACKFILL PUNTUAL (RECOMENDADO)
-- =========================================================
-- Opción A: asignar por número de inspección a un usuario por nombre
-- (ajusta 'HSE-INS-0008' y 'Carlos Ojeda' según tu caso)
UPDATE hse_inspections
SET conducted_by = (
  SELECT id
  FROM app_users
  WHERE nombre = 'Carlos Ojeda'
  LIMIT 1
)
WHERE inspection_number = 'HSE-INS-0008'
  AND conducted_by IS NULL;

-- Opción B: asignar por número de inspección a un ID exacto
-- (descomenta y ajusta)
-- UPDATE hse_inspections
-- SET conducted_by = 12
-- WHERE inspection_number = 'HSE-INS-0008'
--   AND conducted_by IS NULL;

-- =========================================================
-- 3) BACKFILL MASIVO (OPCIONAL, USAR CON CUIDADO)
-- =========================================================
-- Si quieres forzar TODAS las inspecciones sin autor a un usuario fijo,
-- descomenta y ajusta el nombre o id:

-- UPDATE hse_inspections
-- SET conducted_by = (
--   SELECT id
--   FROM app_users
--   WHERE nombre = 'Carlos Ojeda'
--   LIMIT 1
-- )
-- WHERE conducted_by IS NULL;

-- =========================================================
-- 4) VERIFICACIÓN
-- =========================================================
SELECT id, inspection_number, title, conducted_by, created_at, completed_at
FROM hse_inspections
WHERE inspection_number = 'HSE-INS-0008';

SELECT COUNT(*) AS inspecciones_sin_autor
FROM hse_inspections
WHERE conducted_by IS NULL;

COMMIT;
