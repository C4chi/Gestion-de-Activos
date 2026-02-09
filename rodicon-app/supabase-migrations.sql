-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPABASE MIGRATIONS: Rodicon Asset Management System
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run these SQL commands in Supabase SQL Editor (one-by-one or all at once)
-- Fecha: 2025-12-10

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. CLEANUP - Drop existing views and tables (in reverse order of dependencies)
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS pending_safety_reports CASCADE;
DROP VIEW IF EXISTS assets_workshop_with_purchases CASCADE;
DROP VIEW IF EXISTS purchase_summary CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS safety_reports CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP FUNCTION IF EXISTS generate_requisicion_number() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTEND EXISTING USERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'USER';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS alertas BOOLEAN DEFAULT TRUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS campos_permitidos JSONB DEFAULT '[]'::JSONB;

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email) 
WHERE email IS NOT NULL;

-- Create index on rol for fast filtering
CREATE INDEX IF NOT EXISTS idx_app_users_rol ON app_users(rol);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ASSETS TABLE (Core)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(50),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  año INTEGER,
  chasis VARCHAR(100),
  matricula VARCHAR(50),
  ubicacion_actual VARCHAR(100),
  status VARCHAR(50) DEFAULT 'DISPONIBLE',
  observacion_mecanica TEXT,
  fecha_vencimiento_seguro DATE,
  segurador VARCHAR(100),
  numero_poliza VARCHAR(100),
  paso_rapido VARCHAR(100),
  taller_responsable VARCHAR(100),
  numero_requisicion VARCHAR(50),
  proyeccion_entrada DATE,
  proyeccion_salida DATE,
  foto_url TEXT,
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_ficha ON assets(ficha);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_ubicacion ON assets(ubicacion_actual);
CREATE INDEX IF NOT EXISTS idx_assets_visible ON assets(visible);
CREATE INDEX IF NOT EXISTS idx_assets_marca ON assets(marca);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PURCHASE ORDERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha VARCHAR(50) NOT NULL,
  numero_requisicion VARCHAR(50) UNIQUE NOT NULL,
  estado VARCHAR(50) DEFAULT 'PENDIENTE',
  -- Estado progression: PENDIENTE -> ORDENADO -> (PARCIAL or RECIBIDO) -> RECIBIDO
  solicitante VARCHAR(100),
  proyecto VARCHAR(100),
  prioridad VARCHAR(20) DEFAULT 'Normal',
  comentario_recepcion TEXT,
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  updated_by BIGINT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_estado ON purchase_orders(estado);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_ficha ON purchase_orders(ficha);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_numero_req ON purchase_orders(numero_requisicion);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PURCHASE ITEMS TABLE (Detalles de cada requisición)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  codigo VARCHAR(100),
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) DEFAULT 0,
  cotizacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MAINTENANCE LOGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL,
  tipo VARCHAR(50),
  descripcion TEXT,
  costo DECIMAL(12,2),
  mecanico VARCHAR(100),
  km_recorrido INTEGER,
  proyeccion_proxima_mto DATE,
  proyeccion_proxima_km INTEGER,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_ficha ON maintenance_logs(ficha);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_fecha ON maintenance_logs(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_tipo ON maintenance_logs(tipo);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SAFETY REPORTS TABLE (Reportes HSE)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_reporte VARCHAR(20) UNIQUE,
  -- Formato: HSE-001, HSE-002, etc.
  ficha VARCHAR(50) NOT NULL,
  tipo VARCHAR(100),
  prioridad VARCHAR(20) DEFAULT 'Baja',
  -- Prioridad: Alta, Media, Baja
  plazo_horas INTEGER DEFAULT 24,
  -- Plazo de resolución: 24, 48, 72 horas
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'PENDIENTE',
  -- Estado: PENDIENTE, CORREGIDO
  asignado_a TEXT,
  -- Usuarios asignados (comma-separated or JSON array)
  foto_url TEXT,
  notas TEXT,
  -- Follow-up comments format:
  -- [Usuario|Fecha]: Comentario 1\n[Usuario|Fecha]: Comentario 2
  fecha_reporte TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reportado_por BIGINT,
  updated_by BIGINT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_safety_reports_numero ON safety_reports(numero_reporte);
CREATE INDEX IF NOT EXISTS idx_safety_reports_ficha ON safety_reports(ficha);
CREATE INDEX IF NOT EXISTS idx_safety_reports_estado ON safety_reports(estado);
CREATE INDEX IF NOT EXISTS idx_safety_reports_prioridad ON safety_reports(prioridad);
CREATE INDEX IF NOT EXISTS idx_safety_reports_fecha ON safety_reports(fecha_reporte DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. AUDIT LOG TABLE (Trazabilidad de cambios)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion VARCHAR(100),
  tabla VARCHAR(50),
  registro_id VARCHAR(100),
  detalles JSONB,
  usuario_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (para queries frecuentes de auditoría)
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabla ON audit_log(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_log_fecha ON audit_log(fecha DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS) POLICIES - TEMPORALMENTE DESHABILITADAS
-- ─────────────────────────────────────────────────────────────────────────────

-- Las RLS policies están comentadas por ahora. Habilitar después de verificar estructura.
-- Para habilitar en futuro, descomentar las líneas siguientes:

-- Enable RLS on all tables
-- ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ASSETS: Todos pueden ver visible=true, solo ADMIN puede ver hidden
-- CREATE POLICY "assets_select_policy" ON assets
--   FOR SELECT USING (
--     visible = TRUE OR
--     (auth.uid() IN (SELECT id FROM app_users WHERE rol = 'ADMIN'))
--   );

-- CREATE POLICY "assets_insert_policy" ON assets
--   FOR INSERT WITH CHECK (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol IN ('ADMIN', 'TALLER'))
--   );

-- CREATE POLICY "assets_update_policy" ON assets
--   FOR UPDATE USING (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol = 'ADMIN')
--   );

-- CREATE POLICY "assets_delete_policy" ON assets
--   FOR DELETE USING (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol = 'ADMIN')
--   );

-- PURCHASE ORDERS: COMPRAS role puede gestionar
-- CREATE POLICY "purchase_orders_select_policy" ON purchase_orders
--   FOR SELECT USING (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol IN ('ADMIN', 'COMPRAS', 'TALLER'))
--   );

-- CREATE POLICY "purchase_orders_insert_policy" ON purchase_orders
--   FOR INSERT WITH CHECK (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol IN ('ADMIN', 'COMPRAS', 'TALLER'))
--   );

-- CREATE POLICY "purchase_orders_update_policy" ON purchase_orders
--   FOR UPDATE USING (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol IN ('ADMIN', 'COMPRAS'))
--   );

-- MAINTENANCE LOGS: TALLER puede crear
-- CREATE POLICY "maintenance_logs_select_policy" ON maintenance_logs
--   FOR SELECT USING (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol IN ('ADMIN', 'TALLER', 'MECANICO'))
--   );

-- CREATE POLICY "maintenance_logs_insert_policy" ON maintenance_logs
--   FOR INSERT WITH CHECK (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol IN ('ADMIN', 'TALLER', 'MECANICO'))
--   );

-- SAFETY REPORTS: Todos pueden crear
-- CREATE POLICY "safety_reports_select_policy" ON safety_reports
--   FOR SELECT USING (TRUE);

-- CREATE POLICY "safety_reports_insert_policy" ON safety_reports
--   FOR INSERT WITH CHECK (TRUE);

-- CREATE POLICY "safety_reports_update_policy" ON safety_reports
--   FOR UPDATE USING (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol IN ('ADMIN', 'MECANICO'))
--     OR reportado_por = auth.uid()
--   );

-- AUDIT LOG: Solo lectura para ADMIN
-- CREATE POLICY "audit_log_select_policy" ON audit_log
--   FOR SELECT USING (
--     auth.uid() IN (SELECT id FROM app_users WHERE rol = 'ADMIN')
--   );

-- CREATE POLICY "audit_log_insert_policy" ON audit_log
--   FOR INSERT WITH CHECK (TRUE);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. HELPER FUNCTIONS (PostgreSQL)
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a assets
CREATE TRIGGER update_assets_timestamp BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Aplicar trigger a purchase_orders
CREATE TRIGGER update_purchase_orders_timestamp BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Aplicar trigger a safety_reports
CREATE TRIGGER update_safety_reports_timestamp BEFORE UPDATE ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Función para generar números de requisición únicos
CREATE OR REPLACE FUNCTION generate_requisicion_number()
RETURNS VARCHAR AS $$
DECLARE
  v_number VARCHAR;
BEGIN
  v_number := 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(
    (SELECT COALESCE(MAX(CAST(SUBSTRING(numero_requisicion FROM 14) AS INTEGER)), 0) + 1
     FROM purchase_orders 
     WHERE numero_requisicion LIKE 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'),
    4, '0'
  );
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de reporte HSE secuencial
CREATE OR REPLACE FUNCTION generate_hse_number()
RETURNS VARCHAR AS $$
DECLARE
  v_number VARCHAR;
  v_count INTEGER;
BEGIN
  -- Obtener el conteo actual de reportes HSE
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_count FROM safety_reports;
  
  -- Generar número con formato HSE-001, HSE-002, etc.
  v_number := 'HSE-' || LPAD(v_count::TEXT, 3, '0');
  
  -- Verificar si ya existe (por si acaso hay eliminaciones)
  WHILE EXISTS (SELECT 1 FROM safety_reports WHERE numero_reporte = v_number) LOOP
    v_count := v_count + 1;
    v_number := 'HSE-' || LPAD(v_count::TEXT, 3, '0');
  END LOOP;
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SEED DATA (Opcional: datos iniciales para testing)
-- ─────────────────────────────────────────────────────────────────────────────

-- Actualizar usuario Admin existente (descomentar si app_users tiene la columna 'nombre')
-- UPDATE app_users 
-- SET rol = 'ADMIN', email = 'admin@rodicon.com', alertas = TRUE
-- WHERE nombre = 'Admin';

-- Insertar usuarios demo (opcional - descomentar si app_users tiene columna 'nombre' y 'pin')
-- INSERT INTO app_users (nombre, pin, rol, email, alertas)
-- VALUES 
--   ('Comprador1', '1234', 'COMPRAS', 'compras@rodicon.com', TRUE),
--   ('Mecanico1', '5678', 'MECANICO', 'mecanico@rodicon.com', TRUE),
--   ('TallerJefe', '9012', 'TALLER', 'taller@rodicon.com', TRUE)
-- ON CONFLICT (nombre) DO NOTHING;

-- Insertar ubicaciones de ejemplo como constantes (si usas tabla separada)
-- CREATE TABLE IF NOT EXISTS ubicaciones (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   nombre VARCHAR(100) UNIQUE NOT NULL,
--   descripcion TEXT
-- );

-- INSERT INTO ubicaciones (nombre, descripcion) VALUES
--   ('Quito Centro', 'Oficina principal'),
--   ('Quito Sur', 'Oficina sucursal'),
--   ('Guayaquil', 'Oficina Guayaquil')
-- ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. VISTAS ÚTILES (Para queries complejas)
-- ─────────────────────────────────────────────────────────────────────────────

-- Vista: Assets con compras
CREATE OR REPLACE VIEW assets_workshop_with_purchases AS
SELECT 
  a.id,
  a.ficha,
  a.marca,
  a.modelo,
  a.status,
  a.taller_responsable,
  po.numero_requisicion,
  po.estado AS purchase_estado
FROM assets a
LEFT JOIN purchase_orders po ON a.ficha = po.ficha;

-- Vista: Resumen de compras por estado
CREATE OR REPLACE VIEW purchase_summary AS
SELECT 
  estado,
  COUNT(*) AS total,
  MAX(fecha_actualizacion) AS ultima_actualizacion
FROM purchase_orders
GROUP BY estado;

-- Vista: Reportes HSE
CREATE OR REPLACE VIEW pending_safety_reports AS
SELECT 
  sr.id,
  sr.ficha,
  sr.tipo,
  sr.prioridad,
  sr.descripcion,
  sr.asignado_a,
  sr.fecha_reporte,
  a.marca,
  a.modelo
FROM safety_reports sr
LEFT JOIN assets a ON sr.ficha = a.ficha;


-- ═══════════════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES DE EJECUCIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 1. Abre Supabase Dashboard → SQL Editor
-- 2. Copia TODO este archivo
-- 3. Pega en el editor
-- 4. Click "Run" o presiona Ctrl+Enter
-- 5. Verifica que no haya errores
--
-- Si hay errores de conflicto (tabla ya existe), ignore o use:
--   - DROP TABLE IF EXISTS nombre_tabla CASCADE;
--   - Antes de crearla nuevamente
--
-- Para verificar que todo quedó bien:
--   SELECT tablename FROM pg_tables WHERE schemaname='public';
--
-- ═══════════════════════════════════════════════════════════════════════════════
