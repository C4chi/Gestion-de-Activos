-- =====================================================
-- MIGRATION: Agregar evidencias a órdenes de taller
-- Fecha: 2026-02-04
-- Descripción: Permite guardar fotos/videos al cerrar órdenes
-- =====================================================

-- Agregar columna para evidencias en maintenance_logs
ALTER TABLE maintenance_logs 
ADD COLUMN IF NOT EXISTS evidencias JSONB;

COMMENT ON COLUMN maintenance_logs.evidencias IS 'Array JSON de evidencias fotográficas/videos: [{url, tipo, nombre}]';

-- Índice para búsquedas de logs con evidencias
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_evidencias 
ON maintenance_logs USING GIN (evidencias)
WHERE evidencias IS NOT NULL;
