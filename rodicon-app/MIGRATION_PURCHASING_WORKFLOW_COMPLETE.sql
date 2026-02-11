-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Sistema Completo de Gestión de Compras con Workflow
-- Implementa: Cotizaciones múltiples, Aprobaciones, Recepciones parciales
-- Fecha: 2026-02-11
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLES Y PERMISOS DEL WORKFLOW
-- ─────────────────────────────────────────────────────────────────────────────
-- 
-- TALLER: Crea requisiciones, define estado operacional (DISPONIBLE/NO_DISPONIBLE)
-- COMPRAS: Cotiza con proveedores (mínimo 1 obligatoria, 3 recomendadas), ordena, recibe
-- GERENTE_TALLER: Aprueba cotizaciones (ÚNICO ROL AUTORIZADO), crea requisiciones
-- GERENTE: Acceso ver módulos pero NO aprueba cotizaciones
-- ADMIN/ADMIN_GLOBAL: Acceso completo
-- 
-- FLUJO COMPLETO:
-- 1. TALLER crea requisición → Marca estado operacional (DISPONIBLE_ESPERA o NO_DISPONIBLE_ESPERA)
-- 2. COMPRAS cotiza → Ingresa mínimo 1, recomendadas 3 cotizaciones → EN_COTIZACION
-- 3. Sistema cambia a PENDIENTE_APROBACION automáticamente
-- 4. GERENTE_TALLER compara y aprueba cotización → APROBADO
-- 5. COMPRAS ordena al proveedor → ORDENADO (crea compromiso financiero)
-- 6. COMPRAS recibe (parcial/total) → PARCIAL/RECIBIDO (registra costos solo de lo recibido)
-- 
-- ESTADO OPERACIONAL (nuevos campos):
-- - estado_operacional: 'DISPONIBLE_ESPERA' (puede operar) o 'NO_DISPONIBLE_ESPERA' (detenido/urgente)
-- - Si NO_DISPONIBLE → requiere_urgencia = TRUE automático (trigger)
-- - fecha_activo_detenido registra cuándo se detuvo
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR ESTADOS DE PURCHASE_ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Nuevos estados en el flujo:
-- PENDIENTE → EN_COTIZACION → PENDIENTE_APROBACION → APROBADO → ORDENADO → PARCIAL/RECIBIDO

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS estado_operacional VARCHAR(50) DEFAULT 'DISPONIBLE_ESPERA';
-- Valores: 'DISPONIBLE_ESPERA', 'NO_DISPONIBLE_ESPERA'

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS fecha_activo_detenido TIMESTAMP WITH TIME ZONE;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS cotizacion_aprobada_id UUID;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS aprobado_por BIGINT;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP WITH TIME ZONE;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS comentario_aprobacion TEXT;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS requiere_urgencia BOOLEAN DEFAULT FALSE;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS fecha_ordenado TIMESTAMP WITH TIME ZONE;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_purchase_orders_estado_operacional ON purchase_orders(estado_operacional);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_cotizacion_aprobada ON purchase_orders(cotizacion_aprobada_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_urgencia ON purchase_orders(requiere_urgencia);

-- Comentarios
COMMENT ON COLUMN purchase_orders.estado_operacional IS 'DISPONIBLE_ESPERA: puede operar | NO_DISPONIBLE_ESPERA: detenido';
COMMENT ON COLUMN purchase_orders.requiere_urgencia IS 'TRUE si activo está NO_DISPONIBLE (detenido)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA DE COTIZACIONES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- Datos del proveedor
  proveedor VARCHAR(200) NOT NULL,
  contacto_proveedor VARCHAR(200),
  telefono_proveedor VARCHAR(50),
  email_proveedor VARCHAR(200),
  
  -- Datos de la cotización
  numero_cotizacion VARCHAR(100),
  fecha_cotizacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_estimada_entrega DATE,
  dias_entrega INTEGER,
  
  -- Documentación
  archivo_cotizacion_url TEXT,
  notas TEXT,
  condiciones_pago TEXT,
  
  -- Estado
  es_aprobada BOOLEAN DEFAULT FALSE,
  motivo_rechazo TEXT,
  
  -- Control
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotations_purchase_order ON purchase_quotations(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_quotations_aprobada ON purchase_quotations(es_aprobada);
CREATE INDEX IF NOT EXISTS idx_quotations_proveedor ON purchase_quotations(proveedor);

COMMENT ON TABLE purchase_quotations IS 'Cotizaciones recibidas para cada orden de compra (mínimo 3)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLA DE ITEMS POR COTIZACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES purchase_quotations(id) ON DELETE CASCADE,
  purchase_item_id UUID NOT NULL REFERENCES purchase_items(id) ON DELETE CASCADE,
  
  -- Pricing por cotización
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  moneda VARCHAR(10) DEFAULT 'DOP' CHECK (moneda IN ('DOP', 'USD', 'EUR')),
  
  -- Disponibilidad
  disponible BOOLEAN DEFAULT TRUE,
  tiempo_entrega_dias INTEGER,
  stock_disponible INTEGER,
  
  -- Notas específicas del item
  notas TEXT,
  alternativa_propuesta TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON purchase_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_purchase_item ON purchase_quotation_items(purchase_item_id);

COMMENT ON TABLE purchase_quotation_items IS 'Precios de cada item según cada cotización recibida';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABLA DE COMPROMISOS FINANCIEROS (Dinero ordenado pero no gastado aún)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- Montos comprometidos por moneda
  monto_comprometido_dop DECIMAL(12,2) DEFAULT 0,
  monto_comprometido_usd DECIMAL(12,2) DEFAULT 0,
  
  -- Montos recibidos (actualizado en recepciones parciales)
  monto_recibido_dop DECIMAL(12,2) DEFAULT 0,
  monto_recibido_usd DECIMAL(12,2) DEFAULT 0,
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'ACTIVO', -- 'ACTIVO', 'PARCIAL', 'CERRADO', 'CANCELADO'
  
  -- Control
  fecha_compromiso TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_montos_positivos CHECK (
    monto_comprometido_dop >= 0 AND 
    monto_comprometido_usd >= 0 AND
    monto_recibido_dop >= 0 AND 
    monto_recibido_usd >= 0
  ),
  CONSTRAINT check_recibido_menor_comprometido CHECK (
    monto_recibido_dop <= monto_comprometido_dop AND
    monto_recibido_usd <= monto_comprometido_usd
  )
);

CREATE INDEX IF NOT EXISTS idx_commitments_purchase_order ON purchase_commitments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_commitments_estado ON purchase_commitments(estado);

COMMENT ON TABLE purchase_commitments IS 'Registro de dinero comprometido vs recibido para control presupuestario';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ACTUALIZAR PURCHASE_ITEMS - Mejorar control de recepciones parciales
-- ─────────────────────────────────────────────────────────────────────────────

-- Ya existe cantidad_recibida, agregar más campos
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS fecha_recepcion TIMESTAMP WITH TIME ZONE;

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS motivo_pendiente TEXT;

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS accion_pendiente VARCHAR(50);
-- Valores: 'ESPERAR_PROVEEDOR', 'RECOTIZAR', 'CANCELADO'

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS fecha_estimada_nueva DATE;

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS evidencia_recepcion_url TEXT;

CREATE INDEX IF NOT EXISTS idx_purchase_items_estado_linea ON purchase_items(estado_linea);
CREATE INDEX IF NOT EXISTS idx_purchase_items_accion_pendiente ON purchase_items(accion_pendiente);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. VISTA: Comparador de Cotizaciones
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW quotations_comparison AS
SELECT 
  po.id as purchase_order_id,
  po.numero_requisicion,
  po.estado,
  po.estado_operacional,
  po.requiere_urgencia,
  
  pi.id as item_id,
  pi.descripcion as item_descripcion,
  pi.codigo as item_codigo,
  pi.cantidad as item_cantidad,
  
  pq.id as quotation_id,
  pq.proveedor,
  pq.fecha_estimada_entrega,
  pq.dias_entrega,
  pq.es_aprobada,
  
  pqi.precio_unitario,
  pqi.moneda,
  pqi.disponible,
  pqi.tiempo_entrega_dias,
  (pqi.precio_unitario * pi.cantidad) as subtotal_item
  
FROM purchase_orders po
LEFT JOIN purchase_items pi ON po.id = pi.purchase_id
LEFT JOIN purchase_quotations pq ON po.id = pq.purchase_order_id
LEFT JOIN purchase_quotation_items pqi ON pq.id = pqi.quotation_id AND pi.id = pqi.purchase_item_id
ORDER BY po.numero_requisicion, pi.descripcion, pq.proveedor;

COMMENT ON VIEW quotations_comparison IS 'Vista para comparar todas las cotizaciones de una orden lado a lado';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VISTA: Dashboard de Activos Críticos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW critical_assets_dashboard AS
SELECT 
  a.ficha,
  a.tipo,
  a.marca,
  a.modelo,
  a.status,
  
  po.id as purchase_order_id,
  po.numero_requisicion,
  po.estado as estado_orden,
  po.estado_operacional,
  po.requiere_urgencia,
  po.fecha_solicitud,
  po.fecha_activo_detenido,
  
  -- Calcular días detenido
  CASE 
    WHEN po.estado_operacional = 'NO_DISPONIBLE_ESPERA' AND po.fecha_activo_detenido IS NOT NULL
    THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - po.fecha_activo_detenido))
    ELSE 0
  END as dias_detenido,
  
  -- Información de cotización aprobada
  pq.proveedor as proveedor_aprobado,
  pq.fecha_estimada_entrega,
  
  -- Estado del proceso
  CASE 
    WHEN po.estado = 'PENDIENTE' THEN 'Esperando cotizaciones'
    WHEN po.estado = 'EN_COTIZACION' THEN 'En proceso de cotización'
    WHEN po.estado = 'PENDIENTE_APROBACION' THEN '⚠️ Requiere aprobación gerencial'
    WHEN po.estado = 'ORDENADO' THEN 'Ordenado - En tránsito'
    WHEN po.estado = 'PARCIAL' THEN 'Recibido parcialmente'
    ELSE po.estado
  END as estado_descriptivo

FROM assets a
INNER JOIN purchase_orders po ON (a.ficha = po.ficha OR po.ficha = 'MULTI')
LEFT JOIN purchase_items pi ON po.id = pi.purchase_id AND pi.ficha_ref = a.ficha
LEFT JOIN purchase_quotations pq ON po.cotizacion_aprobada_id = pq.id

WHERE po.estado_operacional IN ('DISPONIBLE_ESPERA', 'NO_DISPONIBLE_ESPERA')
  AND po.estado NOT IN ('RECIBIDO', 'CANCELADO')
  
ORDER BY 
  po.requiere_urgencia DESC,
  dias_detenido DESC,
  po.fecha_solicitud ASC;

COMMENT ON VIEW critical_assets_dashboard IS 'Dashboard de activos esperando repuestos con priorización';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FUNCIÓN: Calcular mejor cotización
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_best_quotation(
  p_purchase_order_id UUID,
  p_criterio VARCHAR DEFAULT 'PRECIO' -- 'PRECIO', 'TIEMPO', 'BALANCEADO'
)
RETURNS TABLE (
  quotation_id UUID,
  proveedor VARCHAR,
  total_dop DECIMAL,
  total_usd DECIMAL,
  dias_entrega INTEGER,
  score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pq.id as quotation_id,
    pq.proveedor,
    COALESCE(SUM(CASE WHEN pqi.moneda = 'DOP' THEN pqi.precio_unitario * pi.cantidad ELSE 0 END), 0) as total_dop,
    COALESCE(SUM(CASE WHEN pqi.moneda = 'USD' THEN pqi.precio_unitario * pi.cantidad ELSE 0 END), 0) as total_usd,
    pq.dias_entrega,
    -- Score según criterio
    CASE 
      WHEN p_criterio = 'PRECIO' THEN 
        (1.0 / NULLIF(COALESCE(SUM(pqi.precio_unitario * pi.cantidad), 0), 0)) * 1000
      WHEN p_criterio = 'TIEMPO' THEN 
        (1.0 / NULLIF(pq.dias_entrega, 0)) * 1000
      WHEN p_criterio = 'BALANCEADO' THEN 
        ((1.0 / NULLIF(COALESCE(SUM(pqi.precio_unitario * pi.cantidad), 0), 0)) * 500) +
        ((1.0 / NULLIF(pq.dias_entrega, 0)) * 500)
      ELSE 1
    END as score
  FROM purchase_quotations pq
  LEFT JOIN purchase_quotation_items pqi ON pq.id = pqi.quotation_id
  LEFT JOIN purchase_items pi ON pqi.purchase_item_id = pi.id
  WHERE pq.purchase_order_id = p_purchase_order_id
  GROUP BY pq.id, pq.proveedor, pq.dias_entrega
  ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_best_quotation IS 'Calcula y rankea cotizaciones según criterio (precio, tiempo, balanceado)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TRIGGER: Auto-marcar urgencia según estado operacional
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_urgencia_automatica()
RETURNS TRIGGER AS $$
BEGIN
  -- Si activo está NO DISPONIBLE, marcar como urgente automáticamente
  IF NEW.estado_operacional = 'NO_DISPONIBLE_ESPERA' THEN
    NEW.requiere_urgencia := TRUE;
    NEW.prioridad := 'Urgente';
    
    -- Registrar fecha de detención si no existe
    IF NEW.fecha_activo_detenido IS NULL THEN
      NEW.fecha_activo_detenido := CURRENT_TIMESTAMP;
    END IF;
  ELSE
    NEW.requiere_urgencia := FALSE;
    NEW.fecha_activo_detenido := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_urgencia ON purchase_orders;
CREATE TRIGGER trigger_set_urgencia
  BEFORE INSERT OR UPDATE OF estado_operacional ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_urgencia_automatica();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. TRIGGER: Actualizar compromisos al ordenar
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_purchase_commitment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_dop DECIMAL(12,2) := 0;
  v_total_usd DECIMAL(12,2) := 0;
BEGIN
  -- Solo cuando cambia a ORDENADO
  IF NEW.estado = 'ORDENADO' AND OLD.estado <> 'ORDENADO' THEN
    
    -- Calcular totales de la cotización aprobada
    SELECT 
      COALESCE(SUM(CASE WHEN pqi.moneda = 'DOP' THEN pqi.precio_unitario * pi.cantidad ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN pqi.moneda = 'USD' THEN pqi.precio_unitario * pi.cantidad ELSE 0 END), 0)
    INTO v_total_dop, v_total_usd
    FROM purchase_quotation_items pqi
    INNER JOIN purchase_items pi ON pqi.purchase_item_id = pi.id
    WHERE pqi.quotation_id = NEW.cotizacion_aprobada_id;
    
    -- Crear registro de compromiso
    INSERT INTO purchase_commitments (
      purchase_order_id,
      monto_comprometido_dop,
      monto_comprometido_usd,
      estado
    ) VALUES (
      NEW.id,
      v_total_dop,
      v_total_usd,
      'ACTIVO'
    );
    
    -- Actualizar fecha_ordenado
    NEW.fecha_ordenado := CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_commitment ON purchase_orders;
CREATE TRIGGER trigger_create_commitment
  BEFORE UPDATE OF estado ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.estado = 'ORDENADO' AND OLD.estado <> 'ORDENADO')
  EXECUTE FUNCTION create_purchase_commitment();

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. FUNCIÓN: Registrar recepción parcial
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION register_partial_reception(
  p_purchase_order_id UUID,
  p_items_received JSONB -- Array de {item_id, cantidad_recibida}
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  monto_recibido_dop DECIMAL,
  monto_recibido_usd DECIMAL
) AS $$
DECLARE
  v_item JSONB;
  v_item_id UUID;
  v_cantidad_recibida INTEGER;
  v_precio_unitario DECIMAL(12,2);
  v_moneda VARCHAR(10);
  v_total_recibido_dop DECIMAL(12,2) := 0;
  v_total_recibido_usd DECIMAL(12,2) := 0;
  v_ficha VARCHAR(50);
BEGIN
  -- Iterar sobre items recibidos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_received)
  LOOP
    v_item_id := (v_item->>'item_id')::UUID;
    v_cantidad_recibida := (v_item->>'cantidad_recibida')::INTEGER;
    
    -- Obtener precio y moneda del item (de la cotización aprobada)
    SELECT pi.precio_unitario, pi.moneda, COALESCE(pi.ficha_ref, po.ficha)
    INTO v_precio_unitario, v_moneda, v_ficha
    FROM purchase_items pi
    INNER JOIN purchase_orders po ON pi.purchase_id = po.id
    WHERE pi.id = v_item_id;
    
    -- Actualizar cantidad recibida
    UPDATE purchase_items
    SET 
      cantidad_recibida = COALESCE(cantidad_recibida, 0) + v_cantidad_recibida,
      fecha_recepcion = CURRENT_TIMESTAMP,
      estado_linea = CASE 
        WHEN (COALESCE(cantidad_recibida, 0) + v_cantidad_recibida) >= cantidad THEN 'RECIBIDA'
        WHEN (COALESCE(cantidad_recibida, 0) + v_cantidad_recibida) > 0 THEN 'PARCIAL'
        ELSE estado_linea
      END
    WHERE id = v_item_id;
    
    -- Registrar costo solo de lo recibido
    IF v_cantidad_recibida > 0 AND v_precio_unitario > 0 THEN
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
        v_ficha,
        'COMPRA_REPUESTO',
        pi.descripcion,
        v_precio_unitario * v_cantidad_recibida,
        v_moneda,
        CURRENT_DATE,
        p_purchase_order_id,
        v_item_id,
        'Recepción parcial - ' || v_cantidad_recibida || ' unidades'
      FROM purchase_items pi
      WHERE pi.id = v_item_id;
      
      -- Acumular totales
      IF v_moneda = 'DOP' THEN
        v_total_recibido_dop := v_total_recibido_dop + (v_precio_unitario * v_cantidad_recibida);
      ELSIF v_moneda = 'USD' THEN
        v_total_recibido_usd := v_total_recibido_usd + (v_precio_unitario * v_cantidad_recibida);
      END IF;
    END IF;
  END LOOP;
  
  -- Actualizar compromisos
  UPDATE purchase_commitments
  SET 
    monto_recibido_dop = monto_recibido_dop + v_total_recibido_dop,
    monto_recibido_usd = monto_recibido_usd + v_total_recibido_usd,
    fecha_actualizacion = CURRENT_TIMESTAMP,
    estado = CASE 
      WHEN (monto_recibido_dop + v_total_recibido_dop) >= monto_comprometido_dop 
       AND (monto_recibido_usd + v_total_recibido_usd) >= monto_comprometido_usd 
      THEN 'CERRADO'
      ELSE 'PARCIAL'
    END
  WHERE purchase_order_id = p_purchase_order_id;
  
  RETURN QUERY SELECT 
    TRUE as success, 
    'Recepción registrada exitosamente' as message,
    v_total_recibido_dop,
    v_total_recibido_usd;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    FALSE as success, 
    SQLERRM as message,
    0::DECIMAL as monto_recibido_dop,
    0::DECIMAL as monto_recibido_usd;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION register_partial_reception IS 'Registra recepción parcial de items y actualiza costos solo de lo recibido';

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. CONSULTAS ÚTILES (Comentadas para referencia)
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- Ver activos críticos (detenidos)
SELECT * FROM critical_assets_dashboard 
WHERE estado_operacional = 'NO_DISPONIBLE_ESPERA'
ORDER BY dias_detenido DESC;

-- Comparar cotizaciones de una orden
SELECT * FROM quotations_comparison 
WHERE purchase_order_id = 'uuid-aqui'
ORDER BY item_descripcion, proveedor;

-- Obtener mejor cotización (por precio)
SELECT * FROM get_best_quotation('uuid-orden-aqui', 'PRECIO');

-- Obtener mejor cotización (por tiempo - para urgentes)
SELECT * FROM get_best_quotation('uuid-orden-aqui', 'TIEMPO');

-- Ver compromisos vs recibidos
SELECT 
  po.numero_requisicion,
  pc.monto_comprometido_dop,
  pc.monto_recibido_dop,
  pc.monto_comprometido_dop - pc.monto_recibido_dop as pendiente_dop,
  pc.estado
FROM purchase_commitments pc
JOIN purchase_orders po ON pc.purchase_order_id = po.id
WHERE pc.estado IN ('ACTIVO', 'PARCIAL');
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- FIN DE LA MIGRACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
