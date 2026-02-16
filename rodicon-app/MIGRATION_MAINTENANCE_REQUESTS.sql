-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Sistema de Solicitudes de Mantenimiento desde Áreas
-- Operadores detectan problemas → Solicitan mantenimiento → Validación → OT
-- Fecha: 2026-02-13
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA: Solicitudes de Mantenimiento
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id SERIAL PRIMARY KEY,
  
  -- Activo y solicitante
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  solicitante_id BIGINT NOT NULL REFERENCES app_users(id),
  solicitante_nombre VARCHAR(100),
  solicitante_area VARCHAR(100) DEFAULT 'PRODUCCION',
  
  -- Descripción del problema
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(50), -- 'MECANICO', 'ELECTRICO', 'HIDRAULICO', 'NEUMATICO', 'OTRO'
  prioridad VARCHAR(20) DEFAULT 'MEDIA', -- 'BAJA', 'MEDIA', 'ALTA', 'CRITICA'
  
  -- Estado del flujo
  estado VARCHAR(50) DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'APROBADA', 'RECHAZADA'
  
  -- Validación
  validado_por BIGINT REFERENCES app_users(id),
  validador_nombre VARCHAR(100),
  fecha_validacion TIMESTAMP,
  comentarios_validacion TEXT,
  
  -- Conversión a OT
  work_order_id INTEGER REFERENCES work_orders(id),
  fecha_conversion TIMESTAMP,
  
  -- Evidencias (fotos del problema)
  evidencias JSONB, -- [{url: "...", tipo: "image/jpeg", nombre: "foto1.jpg"}]
  
  -- Geolocalización (si se reporta desde móvil)
  ubicacion_gps JSONB, -- {lat: -33.xx, lon: -70.xx, precision: 10}
  
  -- Control
  fecha_solicitud TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_maint_req_asset ON maintenance_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_maint_req_solicitante ON maintenance_requests(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_maint_req_estado ON maintenance_requests(estado);
CREATE INDEX IF NOT EXISTS idx_maint_req_fecha ON maintenance_requests(fecha_solicitud DESC);
CREATE INDEX IF NOT EXISTS idx_maint_req_wo ON maintenance_requests(work_order_id);

-- Comentarios
COMMENT ON TABLE maintenance_requests IS 'Solicitudes de mantenimiento desde áreas operativas (flujo B del diagrama)';
COMMENT ON COLUMN maintenance_requests.estado IS 'PENDIENTE: Esperando validación | APROBADA: Convertida en OT | RECHAZADA: No procede';
COMMENT ON COLUMN maintenance_requests.categoria IS 'Tipo de problema: MECANICO, ELECTRICO, HIDRAULICO, NEUMATICO, OTRO';
COMMENT ON COLUMN maintenance_requests.evidencias IS 'Array de fotos/videos: [{url, tipo, nombre}]';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FUNCIÓN: Aprobar solicitud y crear OT automáticamente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION aprobar_solicitud_mantenimiento(
  p_request_id INTEGER,
  p_validador_id BIGINT,
  p_validador_nombre VARCHAR(100),
  p_comentarios TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_request RECORD;
  v_wo_id INTEGER;
BEGIN
  -- Obtener datos de la solicitud
  SELECT * INTO v_request FROM maintenance_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud % no encontrada', p_request_id;
  END IF;
  
  IF v_request.estado != 'PENDIENTE' THEN
    RAISE EXCEPTION 'Solicitud % ya fue procesada (estado: %)', p_request_id, v_request.estado;
  END IF;
  
  -- Crear Work Order automáticamente
  INSERT INTO work_orders (
    asset_id,
    titulo,
    descripcion,
    tipo,
    prioridad,
    estado,
    created_by,
    fecha_creacion
  ) VALUES (
    v_request.asset_id,
    v_request.titulo,
    v_request.descripcion || COALESCE(E'\n\n🔗 Solicitado por: ' || v_request.solicitante_nombre || ' (' || v_request.solicitante_area || ')', ''),
    'CORRECTIVO',
    v_request.prioridad,
    'ABIERTA',
    p_validador_id,
    NOW()
  ) RETURNING id INTO v_wo_id;

  -- Marcar activo como en proceso de taller para visibilidad en monitor
  UPDATE assets
  SET status = 'NO DISPONIBLE'
  WHERE id = v_request.asset_id;
  
  -- Actualizar solicitud con estado APROBADA y vincular OT
  UPDATE maintenance_requests
  SET 
    estado = 'APROBADA',
    validado_por = p_validador_id,
    validador_nombre = p_validador_nombre,
    fecha_validacion = NOW(),
    comentarios_validacion = p_comentarios,
    work_order_id = v_wo_id,
    fecha_conversion = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN v_wo_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aprobar_solicitud_mantenimiento IS 'Aprueba solicitud y crea work order automáticamente';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FUNCIÓN: Rechazar solicitud
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rechazar_solicitud_mantenimiento(
  p_request_id INTEGER,
  p_validador_id BIGINT,
  p_validador_nombre VARCHAR(100),
  p_comentarios TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE maintenance_requests
  SET 
    estado = 'RECHAZADA',
    validado_por = p_validador_id,
    validador_nombre = p_validador_nombre,
    fecha_validacion = NOW(),
    comentarios_validacion = p_comentarios,
    updated_at = NOW()
  WHERE id = p_request_id AND estado = 'PENDIENTE';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud % no encontrada o ya procesada', p_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rechazar_solicitud_mantenimiento IS 'Rechaza solicitud con justificación';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VISTA: Solicitudes pendientes de validación
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW maintenance_requests_pending AS
SELECT 
  mr.id,
  mr.titulo,
  mr.descripcion,
  mr.categoria,
  mr.prioridad,
  mr.fecha_solicitud,
  mr.solicitante_nombre,
  mr.solicitante_area,
  mr.evidencias,
  a.ficha,
  COALESCE(a.marca || ' ' || a.modelo, a.ficha) AS asset_nombre,
  a.tipo AS asset_tipo,
  EXTRACT(DAY FROM NOW() - mr.fecha_solicitud) AS dias_pendiente
FROM maintenance_requests mr
LEFT JOIN assets a ON a.id = mr.asset_id
WHERE mr.estado = 'PENDIENTE'
ORDER BY 
  CASE mr.prioridad
    WHEN 'CRITICA' THEN 1
    WHEN 'ALTA' THEN 2
    WHEN 'MEDIA' THEN 3
    WHEN 'BAJA' THEN 4
  END,
  mr.fecha_solicitud ASC;

COMMENT ON VIEW maintenance_requests_pending IS 'Solicitudes pendientes de validación, ordenadas por prioridad y antigüedad';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. VISTA: Historial completo de solicitudes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW maintenance_requests_full AS
SELECT 
  mr.id,
  mr.titulo,
  mr.descripcion,
  mr.categoria,
  mr.prioridad,
  mr.estado,
  mr.fecha_solicitud,
  mr.fecha_validacion,
  mr.fecha_conversion,
  mr.solicitante_nombre,
  mr.solicitante_area,
  mr.validador_nombre,
  mr.comentarios_validacion,
  mr.work_order_id,
  a.ficha,
  COALESCE(a.marca || ' ' || a.modelo, a.ficha) AS asset_nombre,
  a.tipo AS asset_tipo,
  wo.estado AS work_order_estado,
  wo.asignado_a AS work_order_asignado,
  EXTRACT(DAY FROM mr.fecha_validacion - mr.fecha_solicitud) AS dias_hasta_validacion,
  CASE 
    WHEN mr.estado = 'PENDIENTE' AND EXTRACT(DAY FROM NOW() - mr.fecha_solicitud) > 2 THEN 'ATRASADA'
    WHEN mr.estado = 'PENDIENTE' THEN 'EN_TIEMPO'
    ELSE mr.estado
  END AS estado_validacion
FROM maintenance_requests mr
LEFT JOIN assets a ON a.id = mr.asset_id
LEFT JOIN work_orders wo ON wo.id = mr.work_order_id
ORDER BY mr.fecha_solicitud DESC;

COMMENT ON VIEW maintenance_requests_full IS 'Historial completo de solicitudes con información de activos y OT asociadas';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER: Notificación automática cuando se crea solicitud
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notificar_nueva_solicitud()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar notificación para usuarios de MANTENIMIENTO y ADMIN
  -- Solo si existe la tabla notifications (evita bloquear la creación de solicitudes)
  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO notifications (
      usuario_id,
      tipo,
      titulo,
      contenido,
      entidad_id,
      entidad_tipo,
      metadata,
      created_at,
      updated_at
    )
    SELECT 
      u.id,
      'TALLER',
      '🔧 Nueva Solicitud de Mantenimiento',
      NEW.solicitante_nombre || ' reportó: ' || NEW.titulo || ' (Prioridad: ' || NEW.prioridad || ')',
      NEW.id::TEXT,
      'MAINTENANCE_REQUEST',
      jsonb_build_object(
        'prioridad', NEW.prioridad,
        'categoria', NEW.categoria,
        'solicitante_area', NEW.solicitante_area,
        'asset_id', NEW.asset_id
      ),
      NOW(),
      NOW()
    FROM app_users u
    WHERE u.rol IN ('ADMIN', 'TALLER', 'SUPERVISOR') AND u.activo = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_nueva_solicitud ON maintenance_requests;
CREATE TRIGGER trigger_notificar_nueva_solicitud
  AFTER INSERT ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notificar_nueva_solicitud();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRACIÓN COMPLETADA
-- 
-- CREADO:
-- 1. Tabla maintenance_requests con todos los campos necesarios
-- 2. Función aprobar_solicitud_mantenimiento() → Crea OT automáticamente
-- 3. Función rechazar_solicitud_mantenimiento() → Rechaza con justificación
-- 4. Vista maintenance_requests_pending → Solicitudes pendientes
-- 5. Vista maintenance_requests_full → Historial completo
-- 6. Trigger de notificación automática a mantenimiento
-- 
-- PRÓXIMOS PASOS:
-- 1. Crear MaintenanceRequestForm.jsx (formulario para operadores)
-- 2. Crear MaintenanceRequestValidator.jsx (panel de validación)
-- 3. Agregar menú "Solicitudes" en navegación
-- 4. Badge de contador de solicitudes pendientes
-- ═══════════════════════════════════════════════════════════════════════════════
