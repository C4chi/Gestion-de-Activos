-- ═══════════════════════════════════════════════════════════════════════════════
-- CREAR USUARIO GERENTE_TALLER PARA PRUEBAS
-- Fecha: 2026-02-11
-- ═══════════════════════════════════════════════════════════════════════════════

-- Opción 1: Si ya tienes un usuario y solo quieres cambiarle el rol
-- Ejecuta esto en Supabase SQL Editor:

-- Ver usuarios actuales y sus roles
SELECT id, nombre, email, rol FROM app_users ORDER BY nombre;

-- Cambiar rol de un usuario existente a GERENTE_TALLER
-- (Reemplaza 'NOMBRE_USUARIO' con el nombre real del usuario)
UPDATE app_users 
SET rol = 'GERENTE_TALLER' 
WHERE nombre = 'NOMBRE_USUARIO';
-- O por ID:
-- UPDATE app_users SET rol = 'GERENTE_TALLER' WHERE id = 123;

-- ─────────────────────────────────────────────────────────────────────────────

-- Opción 2: Crear un nuevo usuario GERENTE_TALLER desde cero
-- (Solo si usas autenticación por PIN, no Supabase Auth)

INSERT INTO app_users (nombre, pin, rol, email, alertas)
VALUES (
  'Gerente Taller',        -- Nombre del usuario
  '1234',                  -- PIN de acceso
  'GERENTE_TALLER',        -- Rol
  'gerente.taller@empresa.com',  -- Email (opcional)
  true                     -- Recibir notificaciones
);

-- ─────────────────────────────────────────────────────────────────────────────

-- Verificar que se creó correctamente
SELECT id, nombre, rol, email, created_at 
FROM app_users 
WHERE rol = 'GERENTE_TALLER';

-- ─────────────────────────────────────────────────────────────────────────────

-- Ver permisos del sistema para este rol
-- GERENTE_TALLER puede:
-- ✅ Aprobar cotizaciones (ÚNICO ROL)
-- ✅ Crear requisiciones
-- ✅ Acceder a: Workshop, Purchasing, Reports, EPP Almacén
-- ❌ NO puede: Admin Usuarios, Panel Administrador

-- ─────────────────────────────────────────────────────────────════════════════
-- FIN
-- ═══════════════════════════════════════════════════════════════════════════════
