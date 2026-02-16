-- ==============================================
-- MIGRATION: Operatividad en Solicitudes de Mantenimiento
-- Fecha: 2026-02-16
-- Descripción: Permite indicar si el equipo sigue operativo al reportar
-- ==============================================

-- 1) Campo nuevo en solicitudes
ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS equipo_operativo BOOLEAN DEFAULT FALSE;

-- 2) Actualizar función de aprobación para no bloquear activos operativos
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
  SELECT * INTO v_request FROM maintenance_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud % no encontrada', p_request_id;
  END IF;

  IF v_request.estado != 'PENDIENTE' THEN
    RAISE EXCEPTION 'Solicitud % ya fue procesada (estado: %)', p_request_id, v_request.estado;
  END IF;

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

  IF COALESCE(v_request.equipo_operativo, FALSE) = FALSE THEN
    UPDATE assets
    SET status = 'NO DISPONIBLE'
    WHERE id = v_request.asset_id;
  END IF;

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

-- 3) Incluir campo en vistas usadas por el frontend
CREATE OR REPLACE VIEW maintenance_requests_pending AS
SELECT
  mr.id,
  mr.titulo,
  mr.descripcion,
  mr.categoria,
  mr.prioridad,
  mr.equipo_operativo,
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

CREATE OR REPLACE VIEW maintenance_requests_full AS
SELECT
  mr.id,
  mr.titulo,
  mr.descripcion,
  mr.categoria,
  mr.prioridad,
  mr.equipo_operativo,
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

NOTIFY pgrst, 'reload schema';
