-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar seguimiento de kilometraje/horómetro a activos
-- Para tracking de mantenimiento preventivo
-- Fecha: 2026-02-12
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Agregar campos de kilometraje/horómetro a tabla assets
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS kilometraje_actual INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS horometro_actual DECIMAL(10,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS tipo_medicion VARCHAR(20) DEFAULT 'KILOMETRAJE' CHECK (tipo_medicion IN ('KILOMETRAJE', 'HOROMETRO', 'AMBOS'));

-- Comentarios
COMMENT ON COLUMN assets.kilometraje_actual IS 'Kilometraje actual del activo (para vehículos)';
COMMENT ON COLUMN assets.horometro_actual IS 'Horómetro actual en horas (para equipos)';
COMMENT ON COLUMN assets.tipo_medicion IS 'KILOMETRAJE para vehículos, HOROMETRO para equipos, AMBOS para híbridos';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Crear vista de estado de mantenimiento por activo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW asset_maintenance_status AS
SELECT 
  a.id AS asset_id,
  a.ficha,
  a.kilometraje_actual,
  a.horometro_actual,
  a.tipo_medicion,
  
  -- Último mantenimiento
  (SELECT fecha 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_fecha,
   
  (SELECT km_recorrido 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_km,
   
  (SELECT tipo 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_tipo,
  
  -- Próximo mantenimiento proyectado
  (SELECT proyeccion_proxima_mto 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND proyeccion_proxima_mto IS NOT NULL
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS proximo_mto_fecha,
   
  (SELECT proyeccion_proxima_km 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND proyeccion_proxima_km IS NOT NULL
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS proximo_mto_km,
  
  -- Cálculos de estado
  CASE 
    WHEN a.kilometraje_actual >= (
      SELECT proyeccion_proxima_km 
      FROM maintenance_logs 
      WHERE ficha = a.ficha 
      AND proyeccion_proxima_km IS NOT NULL
      ORDER BY fecha DESC 
      LIMIT 1
    ) THEN 'VENCIDO'
    WHEN a.kilometraje_actual >= (
      SELECT proyeccion_proxima_km 
      FROM maintenance_logs 
      WHERE ficha = a.ficha 
      AND proyeccion_proxima_km IS NOT NULL
      ORDER BY fecha DESC 
      LIMIT 1
    ) * 0.9 THEN 'PROXIMO'
    ELSE 'OK'
  END AS estado_mantenimiento,
  
  -- Días desde último mantenimiento
  CASE 
    WHEN (SELECT fecha FROM maintenance_logs WHERE ficha = a.ficha ORDER BY fecha DESC LIMIT 1) IS NOT NULL
    THEN CURRENT_DATE - (SELECT fecha FROM maintenance_logs WHERE ficha = a.ficha ORDER BY fecha DESC LIMIT 1)
    ELSE NULL
  END AS dias_desde_ultimo_mto,
  
  -- Días hasta próximo mantenimiento
  CASE 
    WHEN (SELECT proyeccion_proxima_mto FROM maintenance_logs WHERE ficha = a.ficha AND proyeccion_proxima_mto IS NOT NULL ORDER BY fecha DESC LIMIT 1) IS NOT NULL
    THEN (SELECT proyeccion_proxima_mto FROM maintenance_logs WHERE ficha = a.ficha AND proyeccion_proxima_mto IS NOT NULL ORDER BY fecha DESC LIMIT 1) - CURRENT_DATE
    ELSE NULL
  END AS dias_hasta_proximo_mto
  
FROM assets a
WHERE a.visible = TRUE;

COMMENT ON VIEW asset_maintenance_status IS 'Vista consolidada del estado de mantenimiento por activo';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Función para actualizar km/horómetro con log automático
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION actualizar_medicion_activo(
  p_ficha VARCHAR(50),
  p_kilometraje INTEGER DEFAULT NULL,
  p_horometro DECIMAL(10,1) DEFAULT NULL,
  p_updated_by BIGINT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  mensaje TEXT,
  kilometraje_anterior INTEGER,
  kilometraje_nuevo INTEGER,
  horometro_anterior DECIMAL(10,1),
  horometro_nuevo DECIMAL(10,1)
) AS $$
DECLARE
  v_asset_id UUID;
  v_km_anterior INTEGER;
  v_horo_anterior DECIMAL(10,1);
BEGIN
  -- Obtener datos actuales
  SELECT id, kilometraje_actual, horometro_actual
  INTO v_asset_id, v_km_anterior, v_horo_anterior
  FROM assets
  WHERE ficha = p_ficha;
  
  IF v_asset_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Activo no encontrado'::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::DECIMAL, NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Actualizar valores
  IF p_kilometraje IS NOT NULL THEN
    UPDATE assets 
    SET kilometraje_actual = p_kilometraje,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_updated_by
    WHERE ficha = p_ficha;
  END IF;
  
  IF p_horometro IS NOT NULL THEN
    UPDATE assets 
    SET horometro_actual = p_horometro,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_updated_by
    WHERE ficha = p_ficha;
  END IF;
  
  RETURN QUERY SELECT 
    TRUE,
    'Actualizado correctamente'::TEXT,
    v_km_anterior,
    COALESCE(p_kilometraje, v_km_anterior),
    v_horo_anterior,
    COALESCE(p_horometro, v_horo_anterior);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_medicion_activo IS 'Actualiza km/horómetro del activo con validaciones';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Actualizar km_actual en componentes cuando se actualiza el activo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_component_kilometraje()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se actualiza el kilometraje del activo, sincronizar a componentes activos
  IF NEW.kilometraje_actual IS DISTINCT FROM OLD.kilometraje_actual THEN
    UPDATE asset_components
    SET kilometraje_actual = NEW.kilometraje_actual,
        porcentaje_desgaste = calcular_desgaste_componente(
          kilometraje_instalacion, 
          NEW.kilometraje_actual, 
          kilometraje_maximo
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE asset_id = NEW.id
    AND estado IN ('ACTIVO', 'DESGASTADO', 'CRITICO')
    AND tipo = 'LLANTA'; -- Solo llantas dependen de km
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_component_km ON assets;
CREATE TRIGGER trigger_sync_component_km
  AFTER UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION sync_component_kilometraje();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRACIÓN COMPLETADA
-- 
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Crear componente MaintenanceTrackerPanel en React
-- 3. Integrar en AssetDetailSidebar
-- ═══════════════════════════════════════════════════════════════════════════════
