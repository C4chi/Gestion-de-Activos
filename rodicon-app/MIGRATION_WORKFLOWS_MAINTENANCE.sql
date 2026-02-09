-- ============================================
-- SISTEMA DE WORKFLOW DE APROBACIONES
-- Para Purchase Orders con múltiples niveles
-- ============================================

-- Tabla de configuración de workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  description TEXT,
  levels JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de historial de aprobaciones
CREATE TABLE IF NOT EXISTS approval_history (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  level_name VARCHAR(100),
  approver_id INTEGER REFERENCES app_users(id),
  approver_name VARCHAR(100),
  action VARCHAR(20) NOT NULL,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_approval_history_entity ON approval_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver ON approval_history(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_date ON approval_history(created_at);

-- Workflow por defecto para Purchase Orders
INSERT INTO approval_workflows (name, entity_type, description, levels, active)
VALUES (
  'Workflow de Compras Estándar',
  'PURCHASE_ORDER',
  'Flujo de aprobación multi-nivel para órdenes de compra según monto',
  '[
    {
      "level": 1,
      "name": "Revisión Supervisor",
      "roles": ["SUPERVISOR", "ADMIN"],
      "threshold": 0,
      "required": true,
      "description": "Supervisor revisa la requisición inicial"
    },
    {
      "level": 2,
      "name": "Aprobación Gerente Compras",
      "roles": ["ADMIN"],
      "threshold": 500000,
      "required": true,
      "description": "Gerente aprueba compras mayores a $500.000"
    },
    {
      "level": 3,
      "name": "Aprobación Dirección",
      "roles": ["ADMIN"],
      "threshold": 2000000,
      "required": true,
      "description": "Director aprueba compras mayores a $2.000.000"
    },
    {
      "level": 4,
      "name": "Cotización",
      "roles": ["COMPRAS", "ADMIN"],
      "threshold": 0,
      "required": true,
      "description": "Compras solicita cotizaciones a proveedores"
    },
    {
      "level": 5,
      "name": "Aprobación Final Cotización",
      "roles": ["SUPERVISOR", "ADMIN"],
      "threshold": 0,
      "required": true,
      "description": "Supervisor aprueba la cotización final"
    }
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- SISTEMA DE MANTENIMIENTO
-- ============================================

-- Tabla de planes de mantenimiento preventivo
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id SERIAL PRIMARY KEY,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'PREVENTIVO',
  frecuencia_dias INTEGER NOT NULL,
  ultima_ejecucion DATE,
  proxima_ejecucion DATE NOT NULL,
  activo BOOLEAN DEFAULT true,
  tareas JSONB,
  estimado_horas DECIMAL(10,2),
  notas TEXT,
  created_by INTEGER REFERENCES app_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de work orders mejorada (si no existe)
CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL,
  prioridad VARCHAR(20) DEFAULT 'MEDIA',
  estado VARCHAR(50) DEFAULT 'ABIERTA',
  asignado_a_id INTEGER REFERENCES app_users(id),
  asignado_a VARCHAR(100),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_asignacion TIMESTAMP,
  fecha_inicio TIMESTAMP,
  fecha_cierre TIMESTAMP,
  horas_estimadas DECIMAL(10,2),
  horas_reales DECIMAL(10,2),
  costo_estimado DECIMAL(15,2),
  costo_real DECIMAL(15,2),
  plan_mto_id INTEGER REFERENCES maintenance_plans(id),
  created_by INTEGER REFERENCES app_users(id),
  notas_cierre TEXT,
  partes_usadas JSONB,
  checklist JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de recordatorios de mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id),
  tipo VARCHAR(50) DEFAULT 'PREVENTIVO',
  mensaje TEXT NOT NULL,
  fecha_recordatorio DATE NOT NULL,
  enviado BOOLEAN DEFAULT false,
  fecha_envio TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_asset ON maintenance_plans(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_proxima ON maintenance_plans(proxima_ejecucion);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_estado ON work_orders(estado);
CREATE INDEX IF NOT EXISTS idx_work_orders_asignado ON work_orders(asignado_a_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_prioridad ON work_orders(prioridad);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_fecha ON maintenance_reminders(fecha_recordatorio);

-- ============================================
-- NUEVOS ESTADOS PARA PURCHASE ORDERS
-- ============================================

-- Agregar nuevos estados si la columna existe
DO $$ 
BEGIN
  -- Verificar si la tabla purchase_orders existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    -- Agregar columna de nivel actual si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'nivel_aprobacion_actual') THEN
      ALTER TABLE purchase_orders ADD COLUMN nivel_aprobacion_actual INTEGER DEFAULT 0;
    END IF;
    
    -- Agregar columna de workflow_id si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'workflow_id') THEN
      ALTER TABLE purchase_orders ADD COLUMN workflow_id INTEGER REFERENCES approval_workflows(id);
    END IF;
    
    -- Agregar columna de requiere_aprobacion si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'requiere_aprobacion') THEN
      ALTER TABLE purchase_orders ADD COLUMN requiere_aprobacion BOOLEAN DEFAULT true;
    END IF;
  END IF;
END $$;

-- Comentarios para documentación
COMMENT ON TABLE approval_workflows IS 'Configuración de workflows de aprobación multi-nivel';
COMMENT ON TABLE approval_history IS 'Historial completo de todas las aprobaciones realizadas';
COMMENT ON TABLE maintenance_plans IS 'Planes de mantenimiento preventivo programados por asset';
COMMENT ON TABLE work_orders IS 'Órdenes de trabajo para mantenimiento preventivo y correctivo';
COMMENT ON TABLE maintenance_reminders IS 'Recordatorios automáticos de mantenimientos próximos';

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de work orders con información completa
CREATE OR REPLACE VIEW work_orders_full AS
SELECT 
  wo.*,
  a.ficha as asset_ficha,
  u.nombre as mecanico_nombre,
  mp.nombre as plan_nombre
FROM work_orders wo
LEFT JOIN assets a ON wo.asset_id = a.id
LEFT JOIN app_users u ON wo.asignado_a_id = u.id
LEFT JOIN maintenance_plans mp ON wo.plan_mto_id = mp.id;

-- Vista de mantenimientos próximos (7 días)
CREATE OR REPLACE VIEW maintenance_upcoming AS
SELECT 
  mp.*,
  a.ficha as asset_ficha,
  (mp.proxima_ejecucion - CURRENT_DATE) as dias_restantes
FROM maintenance_plans mp
LEFT JOIN assets a ON mp.asset_id = a.id
WHERE mp.activo = true 
  AND mp.proxima_ejecucion <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY mp.proxima_ejecucion;

-- Vista de work orders atrasadas
CREATE OR REPLACE VIEW work_orders_overdue AS
SELECT 
  wo.*,
  a.ficha as asset_ficha,
  EXTRACT(DAY FROM NOW() - wo.fecha_creacion) as dias_abierta
FROM work_orders wo
LEFT JOIN assets a ON wo.asset_id = a.id
WHERE wo.estado NOT IN ('COMPLETADA', 'CANCELADA')
  AND wo.fecha_creacion < NOW() - INTERVAL '48 hours';

COMMENT ON VIEW work_orders_full IS 'Vista completa de work orders con toda la información relacionada';
COMMENT ON VIEW maintenance_upcoming IS 'Mantenimientos preventivos próximos en los siguientes 7 días';
COMMENT ON VIEW work_orders_overdue IS 'Work orders atrasadas (más de 48 horas abiertas)';
