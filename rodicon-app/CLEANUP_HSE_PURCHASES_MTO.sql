-- ============================================================
-- Limpieza de datos de módulos HSE, Compras y Mantenimiento
-- ============================================================
-- Este script borra:
-- 1. Reportes de seguridad (HSE)
-- 2. Solicitudes de compra
-- 3. Logs de mantenimiento preventivo
-- ============================================================

-- PASO 1: Eliminar reportes de seguridad/HSE
DELETE FROM safety_reports;
SELECT '✅ Safety Reports eliminados' as status;

-- PASO 2: Eliminar solicitudes de compra
DELETE FROM purchase_orders;
SELECT '✅ Purchase Orders eliminados' as status;

-- PASO 3: Eliminar logs de mantenimiento (todos)
-- Nota: Si necesitas conservar correctivos, modifica el WHERE
DELETE FROM maintenance_logs;
SELECT '✅ Maintenance Logs eliminados' as status;

-- PASO 4: Verificar que las tablas están limpias
SELECT 
  (SELECT COUNT(*) FROM safety_reports) as safety_reports_count,
  (SELECT COUNT(*) FROM purchase_orders) as purchase_orders_count,
  (SELECT COUNT(*) FROM maintenance_logs) as maintenance_logs_count;

-- Resultado esperado: 0, 0, 0
