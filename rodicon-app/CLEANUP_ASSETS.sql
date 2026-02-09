-- Limpiar TODO respetando las relaciones
-- Solo eliminar las tablas que existen

-- Luego eliminar órdenes de trabajo
DELETE FROM work_orders;

-- Finalmente eliminar los activos
DELETE FROM assets;

-- Verificar que las tablas están vacías
SELECT COUNT(*) as total_assets FROM assets;
SELECT COUNT(*) as total_work_orders FROM work_orders;