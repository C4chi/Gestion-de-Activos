-- =====================================================
-- MIGRATION: Agregar evidencias a órdenes de taller
-- Fecha: 2026-02-04
-- Descripción: Permite guardar fotos/videos al cerrar órdenes
--              + Anclar inspecciones HSE a activos
-- =====================================================

-- Agregar columna para evidencias en maintenance_logs
ALTER TABLE maintenance_logs 
ADD COLUMN IF NOT EXISTS evidencias JSONB;

COMMENT ON COLUMN maintenance_logs.evidencias IS 'Array JSON de evidencias fotográficas/videos: [{url, tipo, nombre}]';

-- Índice para búsquedas de logs con evidencias
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_evidencias 
ON maintenance_logs USING GIN (evidencias)
WHERE evidencias IS NOT NULL;

-- =====================================================
-- Anclar inspecciones HSE a activos
-- =====================================================

-- Asegurar que asset_id tenga la relación formal
ALTER TABLE hse_inspections
DROP CONSTRAINT IF EXISTS hse_inspections_asset_id_fkey;

ALTER TABLE hse_inspections
ADD CONSTRAINT hse_inspections_asset_id_fkey 
FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- Índice para consultas por activo
CREATE INDEX IF NOT EXISTS idx_hse_inspections_asset_id 
ON hse_inspections(asset_id) 
WHERE asset_id IS NOT NULL;

COMMENT ON COLUMN hse_inspections.asset_id IS 'ID del activo al que pertenece esta inspección';
COMMENT ON COLUMN hse_inspections.ficha IS 'Ficha del activo (para compatibilidad con sistema actual)';
