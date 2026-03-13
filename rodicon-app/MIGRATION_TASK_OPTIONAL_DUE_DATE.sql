-- ==============================================
-- MIGRATION: Permitir tareas sin fecha límite
-- Fecha: Marzo 13, 2026
-- Descripción:
--   Permite seguimiento periódico sin due_date obligatorio
-- ==============================================

BEGIN;

ALTER TABLE tasks
ALTER COLUMN due_date DROP NOT NULL;

COMMIT;
