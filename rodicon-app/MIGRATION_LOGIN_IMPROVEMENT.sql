-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Mejora del Sistema de Login
-- ═══════════════════════════════════════════════════════════════════════════════
-- Agregar soporte para login con nombre_usuario + PIN
-- Fecha: 2026-01-30

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Agregar columna nombre_usuario (username único)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS nombre_usuario VARCHAR(50);

-- Crear índice único en nombre_usuario (permitiendo NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_nombre_usuario 
ON app_users(nombre_usuario) 
WHERE nombre_usuario IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Crear constraint para validar que nombre_usuario sea alfanumérico
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN 
  BEGIN
    ALTER TABLE app_users ADD CONSTRAINT check_nombre_usuario_format
    CHECK (nombre_usuario IS NULL OR nombre_usuario ~ '^[a-zA-Z0-9_.-]+$');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ejemplo de cómo rellenar nombre_usuario basado en nombre existente
-- (Ejecutar si ya tienes usuarios)
-- ─────────────────────────────────────────────────────────────────────────────

/*
UPDATE app_users 
SET nombre_usuario = LOWER(REPLACE(REPLACE(nombre, ' ', '.'), 'á', 'a'))
WHERE nombre_usuario IS NULL AND nombre IS NOT NULL;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Notas para el frontend
-- ─────────────────────────────────────────────────────────────────────────────

/*
Cambios en el frontend:
1. PinModal.jsx: Agregar campo para nombre_usuario
2. AppContext.jsx handlePinSubmit: Validar ambos campos (nombre_usuario + pin)
3. UserAdminPanel.jsx: Hacer nombre_usuario editable y requerido

Validaciones:
- nombre_usuario: 3-50 caracteres, alfanumérico + punto/guión/guión bajo
- PIN: 4 dígitos
- Ambos requeridos para login
*/
