-- ==============================================
-- MIGRATION: Sistema de Notificaciones
-- Fecha: Diciembre 12, 2025
-- Descripción: Tabla para notificaciones en tiempo real
-- ==============================================

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('HSE', 'COMPRAS', 'TALLER', 'GENERAL')),
  titulo VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  entidad_id TEXT, -- ID del reporte/compra/trabajo que la originó (TEXT para soportar UUID y BIGINT)
  entidad_tipo VARCHAR(50), -- 'reporte_hse', 'compra', 'trabajo_taller'
  leida BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_lectura TIMESTAMP,
  metadata JSONB DEFAULT '{}', -- Datos adicionales (prioridad, asignado_a, etc)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_usuario ON notifications(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notifications_leida ON notifications(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notifications_tipo ON notifications(usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_notifications_fecha ON notifications(usuario_id, fecha_creacion DESC);

-- RLS: Deshabilitado porque usamos app_users (no auth.users)
-- En producción, implementar auth.users y habilitar RLS
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Función para marcar como leída
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID, user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET leida = TRUE, fecha_lectura = NOW()
  WHERE id = notification_id AND usuario_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para crear notificación HSE
CREATE OR REPLACE FUNCTION create_hse_notification(
  p_usuario_id UUID,
  p_titulo VARCHAR,
  p_contenido TEXT,
  p_reporte_id UUID,
  p_prioridad VARCHAR DEFAULT 'Media',
  p_asignado_a VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
  VALUES (
    p_usuario_id,
    'HSE',
    p_titulo,
    p_contenido,
    p_reporte_id,
    'reporte_hse',
    jsonb_build_object('prioridad', p_prioridad, 'asignado_a', p_asignado_a)
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS PARA NOTIFICACIONES AUTOMÁTICAS
-- ========================================

-- 1. TRIGGER: Cuando se crea o asigna un reporte HSE
CREATE OR REPLACE FUNCTION notify_on_hse_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar al asignado cuando se le asigna un reporte
  IF NEW.asignado_a IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.asignado_a != OLD.asignado_a)) THEN
    INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
    SELECT 
      id,
      'HSE',
      'Nuevo reporte HSE asignado',
      'Se te ha asignado el reporte HSE #' || COALESCE(NEW.numero_reporte, 'SIN-ID') || ' con prioridad ' || NEW.prioridad,
      NEW.id::text,
      'reporte_hse',
      jsonb_build_object('prioridad', NEW.prioridad, 'numero_reporte', NEW.numero_reporte, 'ficha', NEW.ficha)
    FROM app_users
    WHERE nombre = NEW.asignado_a
    LIMIT 1;
  END IF;

  -- Notificar a todos los usuarios con rol HSE cuando se crea un reporte nuevo sin asignar
  IF TG_OP = 'INSERT' AND (NEW.asignado_a IS NULL OR NEW.asignado_a = '') THEN
    INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
    SELECT 
      id,
      'HSE',
      'Nuevo reporte HSE sin asignar',
      'Se ha creado un reporte HSE #' || COALESCE(NEW.numero_reporte, 'SIN-ID') || ' que requiere atención',
      NEW.id::text,
      'reporte_hse',
      jsonb_build_object('prioridad', NEW.prioridad, 'tipo', NEW.tipo)
    FROM app_users
    WHERE rol = 'HSE' OR rol = 'ADMIN';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS hse_assignment_trigger ON safety_reports;
CREATE TRIGGER hse_assignment_trigger
AFTER INSERT OR UPDATE ON safety_reports
FOR EACH ROW
EXECUTE FUNCTION notify_on_hse_assignment();

-- 2. TRIGGER: Cuando se crea una requisición de compra
CREATE OR REPLACE FUNCTION notify_on_purchase_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar a todos los usuarios con rol COMPRAS
  INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
  SELECT 
    id,
    'COMPRAS',
    'Nueva requisición de compra',
    'Nueva compra #' || NEW.numero_requisicion || ' - Ficha: ' || COALESCE(NEW.ficha, 'N/A'),
    NEW.id::text,
    'compra',
    jsonb_build_object('ficha', NEW.ficha, 'estado', NEW.estado, 'numero_requisicion', NEW.numero_requisicion)
  FROM app_users
  WHERE rol = 'COMPRAS' OR rol = 'ADMIN';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS purchase_creation_trigger ON purchase_orders;
CREATE TRIGGER purchase_creation_trigger
AFTER INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION notify_on_purchase_creation();

-- 3. TRIGGER: Cuando cambia el estado de una compra
CREATE OR REPLACE FUNCTION notify_on_purchase_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar si el estado realmente cambió
  IF NEW.estado != OLD.estado THEN
    -- Notificar al usuario que creó la requisición
    INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
    SELECT 
      id,
      'COMPRAS',
      'Cambio de estado en compra',
      'La compra #' || NEW.numero_requisicion || ' cambió a estado: ' || NEW.estado,
      NEW.id::text,
      'compra',
      jsonb_build_object('estado_anterior', OLD.estado, 'estado_nuevo', NEW.estado)
    FROM app_users
    WHERE nombre = NEW.solicitante
    LIMIT 1;
    
    -- Si cambió a PENDIENTE_APROBACION, notificar a GERENTE_TALLER
    IF NEW.estado = 'PENDIENTE_APROBACION' THEN
      INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
      SELECT 
        id,
        'COMPRAS',
        '⚠️ Cotización pendiente de aprobación',
        'Compra #' || NEW.numero_requisicion || ' requiere aprobación' || 
          CASE WHEN NEW.requiere_urgencia THEN ' - 🚨 URGENTE (Activo detenido)' ELSE '' END,
        NEW.id::text,
        'compra',
        jsonb_build_object(
          'estado', NEW.estado, 
          'urgente', NEW.requiere_urgencia,
          'estado_operacional', NEW.estado_operacional
        )
      FROM app_users
      WHERE rol = 'GERENTE_TALLER' OR rol = 'ADMIN';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS purchase_status_change_trigger ON purchase_orders;
CREATE TRIGGER purchase_status_change_trigger
AFTER UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION notify_on_purchase_status_change();

-- 4. TRIGGER: Cuando se crea un trabajo en taller (activo entra a taller)
CREATE OR REPLACE FUNCTION notify_on_workshop_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar cuando un activo cambia a estado de taller
  IF NEW.status IN ('EN TALLER', 'ESPERA REPUESTO', 'MTT PREVENTIVO') 
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('EN TALLER', 'ESPERA REPUESTO', 'MTT PREVENTIVO')) THEN
    
    INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
    SELECT 
      id,
      'TALLER',
      'Nuevo activo ingresado a taller',
      'Activo ' || NEW.ficha || ' (' || COALESCE(NEW.marca, '') || ' ' || COALESCE(NEW.modelo, '') || ') ingresó a taller con estado: ' || NEW.status,
      NEW.id::text,
      'activo_taller',
      jsonb_build_object('ficha', NEW.ficha, 'status', NEW.status, 'marca', NEW.marca, 'modelo', NEW.modelo)
    FROM app_users
    WHERE rol = 'TALLER' OR rol = 'ADMIN';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS workshop_entry_trigger ON assets;
CREATE TRIGGER workshop_entry_trigger
AFTER INSERT OR UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION notify_on_workshop_entry();

-- 5. TRIGGER: Cuando se asigna un reporte HSE al área de TALLER
CREATE OR REPLACE FUNCTION notify_taller_on_hse_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el reporte menciona "taller" o se asigna a alguien del taller
  IF (NEW.asignado_a ILIKE '%taller%' OR NEW.descripcion ILIKE '%taller%' OR NEW.lugar ILIKE '%taller%')
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.asignado_a IS NULL OR OLD.asignado_a != NEW.asignado_a))) THEN
    
    INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
    SELECT 
      id,
      'TALLER',
      'Reporte HSE asignado a Taller',
      'Reporte HSE #' || COALESCE(NEW.numero_reporte, 'SIN-ID') || ' requiere atención de taller',
      NEW.id::text,
      'reporte_hse_taller',
      jsonb_build_object('prioridad', NEW.prioridad, 'numero_reporte', NEW.numero_reporte, 'lugar', NEW.lugar)
    FROM app_users
    WHERE rol = 'TALLER' OR rol = 'ADMIN';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS hse_to_taller_trigger ON safety_reports;
CREATE TRIGGER hse_to_taller_trigger
AFTER INSERT OR UPDATE ON safety_reports
FOR EACH ROW
EXECUTE FUNCTION notify_taller_on_hse_assignment();

-- 6. TRIGGER: Cuando se completa un mantenimiento
CREATE OR REPLACE FUNCTION notify_on_maintenance_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_ficha VARCHAR;
BEGIN
  -- Solo si es un log de finalización/completado
  IF NEW.tipo IN ('PREVENTIVO_FIN', 'CORRECTIVO_FIN') THEN
    -- Obtener ficha del activo
    SELECT ficha INTO v_asset_ficha FROM assets WHERE id = NEW.asset_id LIMIT 1;
    
    -- Notificar al solicitante o usuario relacionado
    INSERT INTO notifications (usuario_id, tipo, titulo, contenido, entidad_id, entidad_tipo, metadata)
    SELECT 
      id,
      'TALLER',
      'Mantenimiento completado',
      'El mantenimiento del activo ' || COALESCE(v_asset_ficha, 'SIN-FICHA') || ' ha sido completado',
      NEW.id::text,
      'mantenimiento',
      jsonb_build_object('tipo', NEW.tipo, 'ficha', v_asset_ficha)
    FROM app_users
    WHERE rol IN ('ADMIN', 'TALLER', 'COMPRAS')
    LIMIT 5; -- Limitar para no saturar
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS maintenance_complete_trigger ON maintenance_logs;
CREATE TRIGGER maintenance_complete_trigger
AFTER INSERT ON maintenance_logs
FOR EACH ROW
EXECUTE FUNCTION notify_on_maintenance_complete();

-- Actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_update_timestamp ON notifications;
CREATE TRIGGER notification_update_timestamp
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notification_timestamp();

COMMIT;
