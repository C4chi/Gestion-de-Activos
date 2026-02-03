-- ==============================================
-- MIGRATION: Mejoras al Sistema de Compras
-- Fecha: Enero 8, 2026
-- Descripción: Tracking de fechas, proveedores, historial
-- ==============================================

-- 1. Agregar columnas de tracking de fechas a purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS fecha_ordenado TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS fecha_estimada_llegada DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS fecha_recibido TIMESTAMP WITH TIME ZONE;

-- Agregar dias_espera como columna normal (no generada) porque necesita CURRENT_TIMESTAMP
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS dias_espera INTEGER;

-- Agregar tipo de moneda (DOP o USD)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'DOP' CHECK (moneda IN ('DOP', 'USD'));

-- 2. Agregar proveedor a purchase_items
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255);

-- 3. Crear tabla de historial de cambios de estado
CREATE TABLE IF NOT EXISTS purchase_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  comentario TEXT,
  usuario VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_history_order ON purchase_order_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_history_fecha ON purchase_order_history(created_at DESC);

-- 4. Crear vista para estadísticas de compras
CREATE OR REPLACE VIEW purchase_statistics AS
SELECT 
  COUNT(*) FILTER (WHERE estado = 'PENDIENTE') as pendientes,
  COUNT(*) FILTER (WHERE estado = 'ORDENADO') as ordenadas,
  COUNT(*) FILTER (WHERE estado = 'RECIBIDO') as recibidas,
  COUNT(*) FILTER (WHERE estado = 'PENDIENTE' AND fecha_solicitud < CURRENT_DATE - INTERVAL '7 days') as atrasadas,
  AVG(dias_espera) FILTER (WHERE dias_espera IS NOT NULL) as promedio_dias_espera,
  COUNT(*) as total_ordenes,
  SUM(
    (SELECT SUM(precio_unitario * cantidad) 
     FROM purchase_items 
     WHERE purchase_items.purchase_id = purchase_orders.id)
  ) as monto_total
FROM purchase_orders
WHERE fecha_solicitud >= CURRENT_DATE - INTERVAL '30 days';

-- 5. Función para registrar cambios de estado automáticamente
CREATE OR REPLACE FUNCTION log_purchase_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar en historial si cambió el estado
  IF (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado) THEN
    INSERT INTO purchase_order_history (
      purchase_order_id, 
      estado_anterior, 
      estado_nuevo, 
      comentario,
      usuario
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      NEW.comentario_recepcion,
      COALESCE(NEW.solicitante, 'SISTEMA')
    );
    
    -- Actualizar fechas según transición
    IF NEW.estado = 'ORDENADO' AND OLD.estado = 'PENDIENTE' THEN
      NEW.fecha_ordenado := CURRENT_TIMESTAMP;
    END IF;
    
    IF NEW.estado = 'RECIBIDO' AND OLD.estado = 'ORDENADO' THEN
      NEW.fecha_recibido := CURRENT_TIMESTAMP;
    END IF;
    
    -- Calcular dias_espera
    IF NEW.fecha_recibido IS NOT NULL AND NEW.fecha_ordenado IS NOT NULL THEN
      NEW.dias_espera := EXTRACT(DAY FROM (NEW.fecha_recibido - NEW.fecha_ordenado))::INTEGER;
    ELSIF NEW.fecha_ordenado IS NOT NULL THEN
      NEW.dias_espera := EXTRACT(DAY FROM (CURRENT_TIMESTAMP - NEW.fecha_ordenado))::INTEGER;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para log automático
DROP TRIGGER IF EXISTS purchase_status_change_log ON purchase_orders;
CREATE TRIGGER purchase_status_change_log
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_purchase_status_change();

-- 6. Vista para órdenes con alertas
DROP VIEW IF EXISTS purchase_orders_with_alerts CASCADE;
CREATE VIEW purchase_orders_with_alerts AS
SELECT 
  po.*,
  CASE 
    WHEN po.estado = 'PENDIENTE' AND po.fecha_solicitud < CURRENT_DATE - INTERVAL '7 days' 
      THEN 'ALERTA_PENDIENTE_LARGA'
    WHEN po.estado = 'ORDENADO' AND po.fecha_ordenado < CURRENT_TIMESTAMP - INTERVAL '15 days'
      THEN 'ALERTA_ORDENADO_LARGA'
    WHEN po.estado = 'ORDENADO' AND po.fecha_estimada_llegada IS NOT NULL AND po.fecha_estimada_llegada < CURRENT_DATE
      THEN 'ALERTA_VENCIDA'
    ELSE NULL
  END as tipo_alerta,
  (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = po.id) as total_items,
  (SELECT SUM(precio_unitario * cantidad) FROM purchase_items WHERE purchase_id = po.id) as monto_total
FROM purchase_orders po;

-- 7. Índices para mejorar performance en búsquedas
CREATE INDEX IF NOT EXISTS idx_purchase_orders_dates ON purchase_orders(fecha_solicitud DESC, fecha_ordenado DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_solicitante ON purchase_orders(solicitante);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_proyecto ON purchase_orders(proyecto);

-- 8. Comentarios para documentación
COMMENT ON COLUMN purchase_orders.fecha_ordenado IS 'Fecha en que se colocó la orden con el proveedor';
COMMENT ON COLUMN purchase_orders.fecha_estimada_llegada IS 'Fecha estimada de llegada de los repuestos';
COMMENT ON COLUMN purchase_orders.fecha_recibido IS 'Fecha en que se recibieron los repuestos completamente';
COMMENT ON COLUMN purchase_orders.dias_espera IS 'Días transcurridos desde orden hasta recepción (o hasta ahora si no recibido)';
COMMENT ON COLUMN purchase_orders.moneda IS 'Tipo de moneda: DOP (Pesos Dominicanos) o USD (Dólares Estadounidenses)';
COMMENT ON TABLE purchase_order_history IS 'Historial de cambios de estado de órdenes de compra';
COMMENT ON VIEW purchase_statistics IS 'Estadísticas agregadas de compras del último mes';
COMMENT ON VIEW purchase_orders_with_alerts IS 'Órdenes de compra con indicadores de alerta automáticos';
