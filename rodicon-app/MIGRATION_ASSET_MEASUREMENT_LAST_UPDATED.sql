-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Registrar última actualización de Km/Horómetro por campo
-- Fecha: 2026-02-19
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS ultima_actualizacion_km TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ultima_actualizacion_horometro TIMESTAMPTZ;

COMMENT ON COLUMN assets.ultima_actualizacion_km IS 'Fecha/hora de la última actualización de kilometraje_actual';
COMMENT ON COLUMN assets.ultima_actualizacion_horometro IS 'Fecha/hora de la última actualización de horometro_actual';
