-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Registrar última ubicación y última modificación de ubicación
-- Fecha: 2026-02-19
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS ultima_ubicacion TEXT,
ADD COLUMN IF NOT EXISTS ultima_actualizacion_ubicacion TIMESTAMPTZ;

COMMENT ON COLUMN assets.ultima_ubicacion IS 'Ubicación anterior del activo cuando cambia ubicacion_actual';
COMMENT ON COLUMN assets.ultima_actualizacion_ubicacion IS 'Fecha/hora de la última modificación de ubicacion_actual';

CREATE OR REPLACE FUNCTION track_asset_location_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ubicacion_actual IS DISTINCT FROM OLD.ubicacion_actual THEN
    NEW.ultima_ubicacion := OLD.ubicacion_actual;
    NEW.ultima_actualizacion_ubicacion := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_asset_location_change ON assets;

CREATE TRIGGER trigger_track_asset_location_change
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION track_asset_location_change();
