-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Sistema de Componentes por Activo (Baterías, Llantas, etc.)
-- Tracking completo con historial automático
-- Fecha: 2026-02-12
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA PRINCIPAL: Componentes por Activo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asset_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Tipo y clasificación
  tipo VARCHAR(50) NOT NULL, -- 'BATERIA', 'LLANTA', 'FILTRO_ACEITE', 'FILTRO_AIRE', etc.
  
  -- Identificación única del componente
  numero_identificacion VARCHAR(100), -- 'BAT-001', 'BAT-002', 'LL-001', etc.
  
  -- Especificaciones técnicas
  tipo_especifico TEXT, -- 'Batería 12V 100Ah', 'Llanta 11R22.5 Michelin XZE'
  marca VARCHAR(100), -- 'Bosch', 'Michelin', 'Motorcraft'
  modelo VARCHAR(100), -- 'S4 E08', 'XZE', 'FL-820-S'
  serial VARCHAR(100), -- Número de serie del fabricante
  
  -- Ubicación/Posición (para llantas)
  posicion VARCHAR(100), -- 'DELANTERA_IZQUIERDA', 'TRASERA_DERECHA_EXTERIOR', etc.
  
  -- Métricas de uso
  valor_nuevo DECIMAL(10,2), -- Precio cuando se instaló
  kilometraje_instalacion INTEGER, -- km del activo al instalar
  kilometraje_actual INTEGER, -- km actuales del componente
  kilometraje_maximo INTEGER, -- km máximo esperado
  fecha_instalacion DATE,
  fecha_proximo_cambio DATE,
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'ACTIVO', -- 'ACTIVO', 'DESGASTADO', 'CRITICO', 'REEMPLAZADO'
  porcentaje_desgaste INTEGER DEFAULT 0, -- 0-100%
  
  -- Observaciones y notas
  observaciones TEXT,
  ultima_inspeccion DATE,
  
  -- Control
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT REFERENCES app_users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_components_asset ON asset_components(asset_id);
CREATE INDEX IF NOT EXISTS idx_components_tipo ON asset_components(tipo);
CREATE INDEX IF NOT EXISTS idx_components_estado ON asset_components(estado);
CREATE INDEX IF NOT EXISTS idx_components_activo_tipo ON asset_components(asset_id, tipo);

-- Comentarios
COMMENT ON TABLE asset_components IS 'Componentes críticos por activo (baterías, llantas, filtros, etc.)';
COMMENT ON COLUMN asset_components.tipo IS 'Tipo de componente: BATERIA, LLANTA, FILTRO_ACEITE, etc.';
COMMENT ON COLUMN asset_components.numero_identificacion IS 'Número único: BAT-001, LL-DEL-IZQ, etc.';
COMMENT ON COLUMN asset_components.tipo_especifico IS 'Descripción completa: "Batería 12V 100Ah Bosch"';
COMMENT ON COLUMN asset_components.posicion IS 'Para llantas: DELANTERA_IZQUIERDA, TRASERA_DERECHA_INTERIOR, etc.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA DE HISTORIAL: Cambios de Componentes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asset_components_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES asset_components(id) ON DELETE SET NULL,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Acción realizada
  accion VARCHAR(50) NOT NULL, -- 'INSTALADO', 'REEMPLAZADO', 'REPARADO', 'ROTADO', 'REMOVIDO'
  fecha_accion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Detalles del componente
  tipo VARCHAR(50),
  numero_identificacion VARCHAR(100),
  tipo_especifico_anterior TEXT,
  tipo_especifico_nuevo TEXT,
  posicion_anterior VARCHAR(100),
  posicion_nueva VARCHAR(100),
  
  -- Métricas al momento del cambio
  kilometraje_activo INTEGER, -- km del activo al hacer el cambio
  kilometraje_componente INTEGER, -- km que duró el componente
  porcentaje_desgaste INTEGER,
  
  -- Razón y costos
  motivo TEXT, -- 'Desgaste normal', 'Daño por accidente', 'Mantenimiento preventivo'
  costo DECIMAL(10,2),
  proveedor VARCHAR(200),
  
  -- Datos completos (snapshot)
  datos_anteriores JSONB, -- Snapshot completo del componente antes del cambio
  datos_nuevos JSONB, -- Datos del nuevo componente
  
  -- Control
  realizado_por BIGINT REFERENCES app_users(id),
  orden_trabajo VARCHAR(100), -- Referencia a orden de mantenimiento
  observaciones TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_history_asset ON asset_components_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_history_component ON asset_components_history(component_id);
CREATE INDEX IF NOT EXISTS idx_history_tipo ON asset_components_history(tipo);
CREATE INDEX IF NOT EXISTS idx_history_fecha ON asset_components_history(fecha_accion DESC);

COMMENT ON TABLE asset_components_history IS 'Historial completo de cambios de componentes por activo';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRIGGER: Auto-registrar cambios en historial
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_component_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el componente cambia a estado REEMPLAZADO, crear registro en historial
  IF NEW.estado = 'REEMPLAZADO' AND OLD.estado != 'REEMPLAZADO' THEN
    INSERT INTO asset_components_history (
      component_id,
      asset_id,
      accion,
      tipo,
      numero_identificacion,
      tipo_especifico_anterior,
      kilometraje_activo,
      kilometraje_componente,
      porcentaje_desgaste,
      motivo,
      datos_anteriores,
      realizado_por
    ) VALUES (
      OLD.id,
      OLD.asset_id,
      'REEMPLAZADO',
      OLD.tipo,
      OLD.numero_identificacion,
      OLD.tipo_especifico,
      NEW.kilometraje_actual,
      COALESCE(NEW.kilometraje_actual - OLD.kilometraje_instalacion, 0),
      OLD.porcentaje_desgaste,
      NEW.observaciones,
      row_to_json(OLD),
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_component_change ON asset_components;
CREATE TRIGGER trigger_log_component_change
  AFTER UPDATE ON asset_components
  FOR EACH ROW
  EXECUTE FUNCTION log_component_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VISTA: Resumen de componentes por activo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW asset_components_summary AS
SELECT 
  asset_id,
  tipo,
  COUNT(*) AS cantidad_total,
  COUNT(*) FILTER (WHERE estado = 'ACTIVO') AS cantidad_activos,
  COUNT(*) FILTER (WHERE estado = 'CRITICO') AS cantidad_criticos,
  AVG(porcentaje_desgaste) AS desgaste_promedio,
  MAX(fecha_proximo_cambio) AS proximo_cambio
FROM asset_components
WHERE estado IN ('ACTIVO', 'DESGASTADO', 'CRITICO')
GROUP BY asset_id, tipo;

COMMENT ON VIEW asset_components_summary IS 'Resumen estadístico de componentes por activo';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FUNCIÓN: Calcular desgaste automático
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calcular_desgaste_componente(
  p_kilometraje_instalacion INTEGER,
  p_kilometraje_actual INTEGER,
  p_kilometraje_maximo INTEGER
) RETURNS INTEGER AS $$
BEGIN
  IF p_kilometraje_maximo IS NULL OR p_kilometraje_maximo = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN LEAST(100, 
    GREATEST(0, 
      ROUND(((p_kilometraje_actual - p_kilometraje_instalacion)::DECIMAL / p_kilometraje_maximo) * 100)
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calcular_desgaste_componente IS 'Calcula % de desgaste basado en km recorridos vs km máximos';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRACIÓN COMPLETADA
-- 
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Crear componentes React para gestionar componentes
-- 3. Integrar en AssetDetailSidebar
-- ═══════════════════════════════════════════════════════════════════════════════
