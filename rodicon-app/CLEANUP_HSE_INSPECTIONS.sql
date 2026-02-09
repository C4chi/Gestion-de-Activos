-- Eliminar las inspecciones de HSE de prueba
DELETE FROM hse_inspections;

-- Verificar que están vacías
SELECT COUNT(*) as total_hse_inspections FROM hse_inspections;