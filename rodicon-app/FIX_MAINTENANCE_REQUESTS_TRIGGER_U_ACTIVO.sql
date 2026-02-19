-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Trigger de maintenance_requests falla por columna inexistente u.activo
-- Error observado: 42703 - column u.activo does not exist
-- Fecha: 2026-02-19
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notificar_nueva_solicitud()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si existe la tabla notifications (evita bloquear creación de solicitudes)
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
    WHERE u.rol IN ('ADMIN', 'TALLER', 'SUPERVISOR');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_nueva_solicitud ON maintenance_requests;
CREATE TRIGGER trigger_notificar_nueva_solicitud
  AFTER INSERT ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notificar_nueva_solicitud();
