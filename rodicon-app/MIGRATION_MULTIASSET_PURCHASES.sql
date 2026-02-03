-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Sistema de Compras Multi-Activos
-- ═══════════════════════════════════════════════════════════════════════════════
-- Permite crear requisiciones para múltiples activos, vinculando cada línea a un activo

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR TABLA purchase_orders - Remover referencia única a un activo
-- ─────────────────────────────────────────────────────────────────────────────

-- Agregar columna tipo_compra (GENERAL o ACTIVO_ESPECIFICO)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS tipo_compra VARCHAR(50) DEFAULT 'GENERAL';

-- Agregar columna fecha_estimada_llegada (necesaria para handleQuotationConfirm)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS fecha_estimada_llegada DATE;

-- Hacer ficha nullable (ya no es 1-to-1)
ALTER TABLE purchase_orders 
ALTER COLUMN ficha DROP NOT NULL;

-- Crear índice para búsqueda rápida por tipo
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tipo_compra ON purchase_orders(tipo_compra);

-- Agregar comentario a la columna
COMMENT ON COLUMN purchase_orders.tipo_compra IS 'GENERAL o ACTIVO_ESPECIFICO';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ACTUALIZAR TABLA purchase_items - Agregar relación a activos
-- ─────────────────────────────────────────────────────────────────────────────

-- Agregar columna ficha_ref para vincular cada línea a un activo específico
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS ficha_ref VARCHAR(50);

-- Agregar foreign key si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_ficha_ref_fkey'
  ) THEN
    ALTER TABLE purchase_items 
    ADD CONSTRAINT purchase_items_ficha_ref_fkey 
    FOREIGN KEY (ficha_ref) REFERENCES assets(ficha) ON DELETE SET NULL;
  END IF;
END $$;

-- Agregar columna para rastrear estado por línea (en caso de recepciones parciales)
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS estado_linea VARCHAR(50) DEFAULT 'PENDIENTE';

-- Agregar columna de cantidad recibida
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS cantidad_recibida INTEGER DEFAULT 0;

-- Agregar observaciones por línea
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Agregar columnas de cotización (necesarias para handleQuotationConfirm)
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(12, 2);

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS proveedor TEXT;

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS cotizacion TEXT;

-- Crear índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_purchase_items_ficha_ref ON purchase_items(ficha_ref);
CREATE INDEX IF NOT EXISTS idx_purchase_items_estado_linea ON purchase_items(estado_linea);

-- Agregar comentarios
COMMENT ON COLUMN purchase_items.estado_linea IS 'PENDIENTE, PARCIAL, RECIBIDA, CANCELADA';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CREAR VISTA PARA COMPRAS MULTI-ACTIVO
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW purchase_multi_asset_summary AS
SELECT 
  po.id,
  po.numero_requisicion,
  po.estado,
  po.solicitante,
  po.proyecto,
  po.prioridad,
  po.fecha_solicitud,
  COUNT(DISTINCT pi.ficha_ref) as cantidad_activos,
  COUNT(pi.id) as cantidad_lineas,
  SUM(pi.cantidad) as cantidad_total_items,
  SUM(pi.cantidad_recibida) as cantidad_recibida_total,
  ARRAY_AGG(DISTINCT pi.ficha_ref ORDER BY pi.ficha_ref) as fichas_relacionadas,
  CASE 
    WHEN SUM(pi.cantidad) = SUM(pi.cantidad_recibida) THEN 'RECIBIDA_COMPLETA'
    WHEN SUM(pi.cantidad_recibida) > 0 THEN 'RECIBIDA_PARCIAL'
    ELSE po.estado
  END as estado_consolidado
FROM purchase_orders po
LEFT JOIN purchase_items pi ON po.id = pi.purchase_id
GROUP BY po.id, po.numero_requisicion, po.estado, po.solicitante, po.proyecto, po.prioridad, po.fecha_solicitud;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CREAR FUNCIÓN PARA CALCULAR ESTADO GENERAL DE UNA COMPRA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_purchase_order_status(purchase_id UUID)
RETURNS TEXT AS $$
DECLARE
  total_items INTEGER;
  received_items INTEGER;
  partial_items INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN estado_linea = 'RECIBIDA' THEN 1 END),
    COUNT(CASE WHEN estado_linea = 'PARCIAL' THEN 1 END)
  INTO total_items, received_items, partial_items
  FROM purchase_items
  WHERE purchase_id = get_purchase_order_status.purchase_id;

  IF total_items = 0 THEN
    RETURN 'VACIO';
  ELSIF received_items = total_items THEN
    RETURN 'RECIBIDA_COMPLETA';
  ELSIF received_items > 0 OR partial_items > 0 THEN
    RETURN 'RECIBIDA_PARCIAL';
  ELSE
    RETURN 'PENDIENTE';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CREAR VISTA PARA VALIDAR INTEGRIDAD DE DATOS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW purchase_items_with_asset_details AS
SELECT 
  pi.id,
  pi.purchase_id,
  pi.codigo,
  pi.descripcion,
  pi.cantidad,
  pi.cantidad_recibida,
  pi.estado_linea,
  pi.ficha_ref,
  COALESCE(a.ficha, 'SIN ACTIVO') as activo_ficha,
  COALESCE(a.marca || ' ' || a.modelo, 'N/A') as activo_descripcion,
  po.numero_requisicion,
  po.estado as orden_estado,
  po.fecha_solicitud
FROM purchase_items pi
LEFT JOIN purchase_orders po ON pi.purchase_id = po.id
LEFT JOIN assets a ON pi.ficha_ref = a.ficha;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DATOS DE EJEMPLO (Comentado - descomentar para testing)
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- Ejemplo: Crear requisición multi-activo
INSERT INTO purchase_orders (
  ficha, 
  numero_requisicion, 
  estado, 
  solicitante, 
  proyecto, 
  prioridad,
  tipo_compra
) VALUES (
  'MULTI-001',
  'REQ-2026-0001',
  'PENDIENTE',
  'Juan García',
  'Mantenimiento General',
  'Alta',
  'GENERAL'
);

-- Agregar líneas para diferentes activos
INSERT INTO purchase_items (
  purchase_id, 
  codigo, 
  descripcion, 
  cantidad, 
  ficha_ref,
  estado_linea
) 
SELECT 
  po.id,
  'OLI-001',
  'Aceite SAE 40 (5L)',
  2,
  'FICHA-001',
  'PENDIENTE'
FROM purchase_orders po
WHERE po.numero_requisicion = 'REQ-2026-0001'

UNION ALL

SELECT 
  po.id,
  'FIL-002',
  'Filtro de Aire',
  4,
  'FICHA-002',
  'PENDIENTE'
FROM purchase_orders po
WHERE po.numero_requisicion = 'REQ-2026-0001'

UNION ALL

SELECT 
  po.id,
  'BAT-003',
  'Batería 12V 100Ah',
  1,
  'FICHA-003',
  'PENDIENTE'
FROM purchase_orders po
WHERE po.numero_requisicion = 'REQ-2026-0001';
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. AGREGAR COMENTARIOS A LA TABLA
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN purchase_items.ficha_ref IS 'Referencia al activo específico para esta línea de compra';
COMMENT ON COLUMN purchase_items.estado_linea IS 'Estado individual de la línea: PENDIENTE, PARCIAL, RECIBIDA, CANCELADA';
COMMENT ON COLUMN purchase_items.cantidad_recibida IS 'Cantidad recibida de esta línea (permite recepciones parciales)';
COMMENT ON VIEW purchase_multi_asset_summary IS 'Vista consolidada de requisiciones multi-activo con resumen de estados';

-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback (ejecutar en caso de error)
-- ─────────────────────────────────────────────────────────────────────────────
/*
ALTER TABLE purchase_items DROP COLUMN IF EXISTS ficha_ref;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS estado_linea;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS cantidad_recibida;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS observaciones;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS tipo_compra;
DROP VIEW IF EXISTS purchase_multi_asset_summary CASCADE;
DROP VIEW IF EXISTS purchase_items_with_asset_details CASCADE;
DROP FUNCTION IF EXISTS get_purchase_order_status(UUID) CASCADE;
*/
