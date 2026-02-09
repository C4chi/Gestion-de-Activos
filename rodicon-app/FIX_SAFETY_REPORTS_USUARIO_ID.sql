-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Eliminar columna usuario_id (UUID) de safety_reports - VERSIÓN COMPLETA
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Eliminar TODOS los triggers relacionados con safety_reports
DROP TRIGGER IF EXISTS hse_assignment_trigger ON safety_reports CASCADE;
DROP TRIGGER IF EXISTS hse_to_taller_trigger ON safety_reports CASCADE;
DROP TRIGGER IF EXISTS notify_on_hse_assignment ON safety_reports CASCADE;
DROP TRIGGER IF EXISTS notify_taller_on_hse_assignment ON safety_reports CASCADE;

-- 2. Eliminar constraints que dependan de usuario_id
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'safety_reports' 
        AND constraint_name LIKE '%usuario_id%'
    LOOP
        EXECUTE 'ALTER TABLE safety_reports DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
    END LOOP;
END $$;

-- 3. Eliminar la columna usuario_id forzadamente
ALTER TABLE safety_reports DROP COLUMN IF EXISTS usuario_id CASCADE;

-- 4. Recrear la tabla si es necesario (SOLO si lo anterior no funciona)
-- DESCOMENTAR SOLO SI EL DROP COLUMN FALLA
/*
CREATE TABLE safety_reports_new AS 
SELECT 
    id, numero_reporte, ficha, tipo, prioridad, plazo_horas, 
    descripcion, estado, asignado_a, foto_url, notas,
    fecha_reporte, fecha_actualizacion, reportado_por, updated_by,
    lugar, turno, updated_at
FROM safety_reports;

DROP TABLE safety_reports CASCADE;
ALTER TABLE safety_reports_new RENAME TO safety_reports;

-- Recrear primary key e indices
ALTER TABLE safety_reports ADD PRIMARY KEY (id);
CREATE INDEX idx_safety_reports_numero ON safety_reports(numero_reporte);
CREATE INDEX idx_safety_reports_ficha ON safety_reports(ficha);
CREATE INDEX idx_safety_reports_estado ON safety_reports(estado);
CREATE INDEX idx_safety_reports_prioridad ON safety_reports(prioridad);
CREATE INDEX idx_safety_reports_fecha ON safety_reports(fecha_reporte DESC);
*/

-- 5. Verificar columnas finales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'safety_reports'
ORDER BY ordinal_position;

-- 6. Reactivar triggers de notificaciones
CREATE TRIGGER hse_assignment_trigger
AFTER INSERT OR UPDATE ON safety_reports
FOR EACH ROW
EXECUTE FUNCTION notify_on_hse_assignment();

CREATE TRIGGER hse_to_taller_trigger
AFTER INSERT OR UPDATE ON safety_reports
FOR EACH ROW
EXECUTE FUNCTION notify_taller_on_hse_assignment();
