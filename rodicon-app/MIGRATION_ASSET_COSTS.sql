-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Sistema de Costos por Activo
-- Objetivo: Permitir el seguimiento de rentabilidad y costos totales por activo
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CREAR TABLA asset_costs - Registro de costos asociados a cada activo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asset_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha VARCHAR(50) NOT NULL REFERENCES assets(ficha) ON DELETE CASCADE,
  tipo_costo VARCHAR(50) NOT NULL, -- 'COMPRA_REPUESTO', 'MANTENIMIENTO', 'REPARACION', 'OTRO'
  descripcion TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'DOP' CHECK (moneda IN ('DOP', 'USD')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Relaciones opcionales con otras tablas
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  purchase_item_id UUID REFERENCES purchase_items(id) ON DELETE SET NULL,
  maintenance_log_id UUID REFERENCES maintenance_logs(id) ON DELETE SET NULL,
  
  -- Metadata
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  
  CONSTRAINT asset_costs_monto_positivo CHECK (monto >= 0)
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_asset_costs_ficha ON asset_costs(ficha);
CREATE INDEX IF NOT EXISTS idx_asset_costs_tipo ON asset_costs(tipo_costo);
CREATE INDEX IF NOT EXISTS idx_asset_costs_fecha ON asset_costs(fecha);
CREATE INDEX IF NOT EXISTS idx_asset_costs_purchase_order ON asset_costs(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_asset_costs_moneda ON asset_costs(moneda);

-- Comentarios
COMMENT ON TABLE asset_costs IS 'Registro de todos los costos asociados a cada activo para análisis de rentabilidad';
COMMENT ON COLUMN asset_costs.tipo_costo IS 'COMPRA_REPUESTO, MANTENIMIENTO, REPARACION, OTRO';
COMMENT ON COLUMN asset_costs.moneda IS 'DOP (Pesos Dominicanos) o USD (Dólares)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREAR VISTA DE COSTOS CONSOLIDADOS POR ACTIVO
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW asset_costs_summary AS
SELECT 
  a.ficha,
  a.nombre,
  a.marca,
  a.modelo,
  a.status,
  
  -- Totales por moneda
  COALESCE(SUM(CASE WHEN ac.moneda = 'DOP' THEN ac.monto ELSE 0 END), 0) as total_dop,
  COALESCE(SUM(CASE WHEN ac.moneda = 'USD' THEN ac.monto ELSE 0 END), 0) as total_usd,
  
  -- Totales por tipo de costo
  COALESCE(SUM(CASE WHEN ac.tipo_costo = 'COMPRA_REPUESTO' THEN ac.monto ELSE 0 END), 0) as total_repuestos,
  COALESCE(SUM(CASE WHEN ac.tipo_costo = 'MANTENIMIENTO' THEN ac.monto ELSE 0 END), 0) as total_mantenimiento,
  COALESCE(SUM(CASE WHEN ac.tipo_costo = 'REPARACION' THEN ac.monto ELSE 0 END), 0) as total_reparacion,
  
  -- Contadores
  COUNT(ac.id) as cantidad_registros_costos,
  MIN(ac.fecha) as fecha_primer_costo,
  MAX(ac.fecha) as fecha_ultimo_costo
  
FROM assets a
LEFT JOIN asset_costs ac ON a.ficha = ac.ficha
WHERE a.visible = TRUE
GROUP BY a.ficha, a.nombre, a.marca, a.modelo, a.status
ORDER BY total_dop DESC;

COMMENT ON VIEW asset_costs_summary IS 'Vista consolidada de costos por activo con totales por moneda y tipo';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CREAR VISTA DETALLADA DE COSTOS POR ACTIVO
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW asset_costs_detail AS
SELECT 
  ac.id,
  ac.ficha,
  a.nombre as activo_nombre,
  a.marca,
  a.modelo,
  ac.tipo_costo,
  ac.descripcion,
  ac.monto,
  ac.moneda,
  ac.fecha,
  ac.notas,
  po.numero_requisicion,
  ac.created_at
FROM asset_costs ac
LEFT JOIN assets a ON ac.ficha = a.ficha
LEFT JOIN purchase_orders po ON ac.purchase_order_id = po.id
ORDER BY ac.fecha DESC, ac.created_at DESC;

COMMENT ON VIEW asset_costs_detail IS 'Vista detallada de todos los costos con información de activos y órdenes de compra';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FUNCIÓN PARA REGISTRAR COSTOS DE COMPRAS AL RECIBIR
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION register_purchase_costs_on_receive()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo ejecutar cuando el estado cambia a RECIBIDO
  IF NEW.estado = 'RECIBIDO' AND OLD.estado <> 'RECIBIDO' THEN
    
    -- Insertar costos para cada ítem de compra con ficha asociada
    INSERT INTO asset_costs (
      ficha,
      tipo_costo,
      descripcion,
      monto,
      moneda,
      fecha,
      purchase_order_id,
      purchase_item_id,
      notas
    )
    SELECT 
      COALESCE(pi.ficha_ref, NEW.ficha) as ficha,
      'COMPRA_REPUESTO' as tipo_costo,
      pi.descripcion as descripcion,
      (pi.precio_unitario * pi.cantidad) as monto,
      COALESCE(pi.moneda, 'DOP') as moneda,
      CURRENT_DATE as fecha,
      NEW.id as purchase_order_id,
      pi.id as purchase_item_id,
      'Orden: ' || NEW.numero_requisicion || 
        CASE WHEN pi.proveedor IS NOT NULL THEN ' - Proveedor: ' || pi.proveedor ELSE '' END ||
        CASE WHEN pi.cotizacion IS NOT NULL THEN ' - Cot: ' || pi.cotizacion ELSE '' END
      as notas
    FROM purchase_items pi
    WHERE pi.purchase_id = NEW.id
      AND pi.precio_unitario > 0 -- Solo registrar items con precio
      AND (pi.ficha_ref IS NOT NULL OR NEW.ficha IS NOT NULL); -- Solo si hay ficha asociada
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_register_purchase_costs ON purchase_orders;
CREATE TRIGGER trigger_register_purchase_costs
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.estado = 'RECIBIDO' AND OLD.estado <> 'RECIBIDO')
  EXECUTE FUNCTION register_purchase_costs_on_receive();

COMMENT ON FUNCTION register_purchase_costs_on_receive() IS 'Registra automáticamente los costos en asset_costs cuando una orden se marca como RECIBIDO';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FUNCIÓN AUXILIAR: Obtener costo total de un activo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_asset_total_cost(p_ficha VARCHAR, p_moneda VARCHAR DEFAULT 'DOP')
RETURNS DECIMAL(12,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(monto), 0)
    FROM asset_costs
    WHERE ficha = p_ficha
      AND moneda = p_moneda
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_asset_total_cost(VARCHAR, VARCHAR) IS 'Obtiene el costo total acumulado de un activo en una moneda específica';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EJEMPLOS DE USO
-- ─────────────────────────────────────────────────────────────────────────────

-- Ver costos consolidados de todos los activos
-- SELECT * FROM asset_costs_summary ORDER BY total_dop DESC;

-- Ver detalle de costos de un activo específico
-- SELECT * FROM asset_costs_detail WHERE ficha = 'A-018' ORDER BY fecha DESC;

-- Obtener costo total de un activo
-- SELECT get_asset_total_cost('A-018', 'DOP') as total_dop;
-- SELECT get_asset_total_cost('A-018', 'USD') as total_usd;

-- Ver activos más costosos
-- SELECT ficha, nombre, marca, modelo, 
--        total_dop, total_usd, cantidad_registros_costos
-- FROM asset_costs_summary 
-- WHERE total_dop > 0 OR total_usd > 0
-- ORDER BY total_dop DESC
-- LIMIT 10;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ROLLBACK (si es necesario)
-- ─────────────────────────────────────────────────────────────────────────────

/*
DROP TRIGGER IF EXISTS trigger_register_purchase_costs ON purchase_orders;
DROP FUNCTION IF EXISTS register_purchase_costs_on_receive();
DROP FUNCTION IF EXISTS get_asset_total_cost(VARCHAR, VARCHAR);
DROP VIEW IF EXISTS asset_costs_detail;
DROP VIEW IF EXISTS asset_costs_summary;
DROP TABLE IF EXISTS asset_costs CASCADE;
*/
