-- ============================================
-- MIGRACIÓN: Sistema de Formularios Dinámicos HSE
-- Inspirado en SafetyCulture/iAuditor
-- Fecha: Enero 8, 2026
-- ============================================

-- ============================================
-- 1. TABLA DE PLANTILLAS (Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS hse_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'GENERAL', -- SAFETY, QUALITY, MAINTENANCE, etc.
  icon VARCHAR(50) DEFAULT '📋',
  
  -- JSON Schema completo del formulario
  schema JSONB NOT NULL,
  /* 
  Estructura del schema:
  {
    "version": "1.0.0",
    "sections": [
      {
        "id": "section_1",
        "title": "Información General",
        "description": "Datos básicos de la inspección",
        "items": [
          {
            "id": "item_1",
            "type": "text|select|multiselect|number|date|datetime|photo|signature|gps|checkbox|rating|slider",
            "label": "¿Cuál es el área inspeccionada?",
            "required": true,
            "placeholder": "Ej: Taller mecánico",
            "validation": { "minLength": 3, "maxLength": 100 },
            "defaultValue": "",
            "helpText": "Ingresa el nombre del área",
            "conditional": {
              "dependsOn": "item_id",
              "showWhen": "value === 'X'"
            },
            "scoring": {
              "enabled": true,
              "weight": 10,
              "passingScore": { "value": "SI", "points": 10 },
              "failingScore": { "value": "NO", "points": 0 }
            }
          }
        ]
      }
    ],
    "scoring": {
      "enabled": true,
      "maxPoints": 100,
      "passingThreshold": 70
    },
    "metadata": {
      "requiresGeolocation": false,
      "requiresSignature": true,
      "allowOffline": true
    }
  }
  */
  
  -- Configuración de scoring
  scoring_enabled BOOLEAN DEFAULT false,
  max_score INTEGER DEFAULT 100,
  passing_threshold INTEGER DEFAULT 70,
  
  -- Estado y versionamiento
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  parent_template_id UUID REFERENCES hse_templates(id), -- Para rastrear evolución
  
  -- Metadatos
  created_by BIGINT REFERENCES app_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  
  -- Tags para búsqueda
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hse_templates_category ON hse_templates(category);
CREATE INDEX IF NOT EXISTS idx_hse_templates_active ON hse_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_hse_templates_tags ON hse_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_hse_templates_version ON hse_templates(parent_template_id, version);

-- ============================================
-- 2. TABLA DE INSPECCIONES/AUDITORÍAS
-- ============================================
CREATE TABLE IF NOT EXISTS hse_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES hse_templates(id),
  template_version INTEGER NOT NULL, -- Snapshot del version usado
  template_snapshot JSONB NOT NULL, -- Copia inmutable del schema usado
  
  -- Identificación
  inspection_number VARCHAR(50) UNIQUE NOT NULL, -- HSE-INS-001
  title VARCHAR(255) NOT NULL,
  
  -- Respuestas del usuario (payload dinámico)
  answers JSONB NOT NULL DEFAULT '{}',
  /*
  Estructura de answers:
  {
    "section_1": {
      "item_1": {
        "value": "Taller mecánico",
        "timestamp": "2026-01-08T10:30:00Z"
      },
      "item_2": {
        "value": "SI",
        "score": 10,
        "timestamp": "2026-01-08T10:31:00Z"
      }
    },
    "signatures": {
      "inspector": "data:image/png;base64,..."
    },
    "photos": [
      { "itemId": "item_5", "url": "https://..." }
    ],
    "geolocation": {
      "latitude": -33.4569,
      "longitude": -70.6483,
      "accuracy": 10
    }
  }
  */
  
  -- Scoring calculado
  total_score DECIMAL(5,2) DEFAULT 0,
  max_possible_score INTEGER DEFAULT 0,
  score_percentage DECIMAL(5,2) DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  
  -- Estado del workflow
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, COMPLETED, APPROVED, REJECTED
  priority VARCHAR(20) DEFAULT 'MEDIA', -- BAJA, MEDIA, ALTA, CRITICA
  
  -- Flags automáticos (detectados por IA o reglas)
  has_critical_issues BOOLEAN DEFAULT false,
  has_photos BOOLEAN DEFAULT false,
  has_signature BOOLEAN DEFAULT false,
  auto_flags JSONB DEFAULT '[]', -- Array de issues detectados
  
  -- Información contextual
  asset_id UUID, -- Puede o no estar ligado a un activo
  ficha VARCHAR(50), -- Para compatibility con sistema actual
  location VARCHAR(255),
  area VARCHAR(100),
  
  -- Asignaciones
  conducted_by BIGINT REFERENCES app_users(id),
  assigned_to BIGINT[] DEFAULT ARRAY[]::BIGINT[], -- Array de user IDs
  reviewed_by BIGINT REFERENCES app_users(id),
  approved_by BIGINT REFERENCES app_users(id),
  
  -- Fechas
  scheduled_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  approved_at TIMESTAMP,
  
  -- Geolocation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geo_accuracy DECIMAL(10, 2),
  
  -- Offline sync
  is_synced BOOLEAN DEFAULT true,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hse_inspections_template ON hse_inspections(template_id);
CREATE INDEX IF NOT EXISTS idx_hse_inspections_status ON hse_inspections(status);
CREATE INDEX IF NOT EXISTS idx_hse_inspections_priority ON hse_inspections(priority);
CREATE INDEX IF NOT EXISTS idx_hse_inspections_ficha ON hse_inspections(ficha);
CREATE INDEX IF NOT EXISTS idx_hse_inspections_dates ON hse_inspections(scheduled_date, completed_at);
CREATE INDEX IF NOT EXISTS idx_hse_inspections_conductor ON hse_inspections(conducted_by);
CREATE INDEX IF NOT EXISTS idx_hse_inspections_critical ON hse_inspections(has_critical_issues);
CREATE INDEX IF NOT EXISTS idx_hse_inspections_sync ON hse_inspections(is_synced) WHERE is_synced = false;

-- ============================================
-- 3. TABLA DE ACCIONES CORRECTIVAS
-- ============================================
CREATE TABLE IF NOT EXISTS hse_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES hse_inspections(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL, -- ID del item que generó la acción
  
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'MEDIA',
  status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
  
  assigned_to BIGINT REFERENCES app_users(id),
  due_date TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hse_actions_inspection ON hse_corrective_actions(inspection_id);
CREATE INDEX IF NOT EXISTS idx_hse_actions_status ON hse_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_hse_actions_assigned ON hse_corrective_actions(assigned_to);

-- ============================================
-- 4. TABLA DE HISTORIAL DE VERSIONES
-- ============================================
CREATE TABLE IF NOT EXISTS hse_template_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES hse_templates(id),
  version INTEGER NOT NULL,
  changes JSONB NOT NULL, -- Descripción de cambios realizados
  changed_by BIGINT REFERENCES app_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(template_id, version)
);

-- ============================================
-- 5. VISTAS ÚTILES
-- ============================================

-- Vista de inspecciones con detalles de template
CREATE OR REPLACE VIEW hse_inspections_full AS
SELECT 
  i.id,
  i.inspection_number,
  i.title,
  i.status,
  i.priority,
  i.total_score,
  i.score_percentage,
  i.passed,
  i.has_critical_issues,
  i.completed_at,
  t.name as template_name,
  t.category as template_category,
  u.nombre as conducted_by_name,
  i.ficha,
  i.created_at
FROM hse_inspections i
LEFT JOIN hse_templates t ON i.template_id = t.id
LEFT JOIN app_users u ON i.conducted_by = u.id;

-- Vista de estadísticas por template
CREATE OR REPLACE VIEW hse_template_stats AS
SELECT 
  t.id,
  t.name,
  t.category,
  COUNT(i.id) as total_inspections,
  COUNT(i.id) FILTER (WHERE i.status = 'COMPLETED') as completed_inspections,
  AVG(i.score_percentage) as avg_score,
  COUNT(i.id) FILTER (WHERE i.has_critical_issues) as critical_issues_count,
  MAX(i.completed_at) as last_inspection_date
FROM hse_templates t
LEFT JOIN hse_inspections i ON t.id = i.template_id
GROUP BY t.id, t.name, t.category;

-- ============================================
-- 6. FUNCIONES AUXILIARES
-- ============================================

-- Función para calcular scoring automáticamente
CREATE OR REPLACE FUNCTION calculate_inspection_score(inspection_id_param UUID)
RETURNS TABLE(total_score DECIMAL, max_score INTEGER, percentage DECIMAL, passed BOOLEAN) AS $$
DECLARE
  template_schema JSONB;
  answers_data JSONB;
  calculated_score DECIMAL := 0;
  max_possible INTEGER := 0;
  score_pct DECIMAL := 0;
  is_passed BOOLEAN := false;
  passing_threshold INTEGER;
BEGIN
  -- Obtener el schema y las respuestas
  SELECT template_snapshot, answers, passing_threshold
  INTO template_schema, answers_data, passing_threshold
  FROM hse_inspections i
  JOIN hse_templates t ON i.template_id = t.id
  WHERE i.id = inspection_id_param;
  
  -- Calcular puntaje (simplificado - en producción usar lógica más compleja)
  -- Esta es una implementación básica que suma los scores de las respuestas
  
  -- Retornar resultados
  RETURN QUERY SELECT calculated_score, max_possible, score_pct, is_passed;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_hse_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hse_templates_updated
  BEFORE UPDATE ON hse_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_hse_timestamp();

CREATE TRIGGER hse_inspections_updated
  BEFORE UPDATE ON hse_inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_hse_timestamp();

-- ============================================
-- 7. INSERTAR TEMPLATE DE EJEMPLO
-- ============================================
INSERT INTO hse_templates (name, description, category, icon, schema, scoring_enabled, max_score, passing_threshold, is_active, version, created_by)
VALUES (
  'Inspección de Seguridad Vehicular',
  'Checklist estándar para inspección pre-operacional de vehículos',
  'SAFETY',
  '🚗',
  '{
    "version": "1.0.0",
    "sections": [
      {
        "id": "section_1",
        "title": "Información del Vehículo",
        "description": "Datos básicos del vehículo a inspeccionar",
        "items": [
          {
            "id": "vehicle_ficha",
            "type": "text",
            "label": "Número de Ficha",
            "required": true,
            "placeholder": "Ej: V-001"
          },
          {
            "id": "vehicle_km",
            "type": "number",
            "label": "Kilometraje Actual",
            "required": true
          },
          {
            "id": "inspection_date",
            "type": "datetime",
            "label": "Fecha y Hora de Inspección",
            "required": true
          }
        ]
      },
      {
        "id": "section_2",
        "title": "Inspección Visual Externa",
        "description": "Verificación del estado externo del vehículo",
        "items": [
          {
            "id": "body_condition",
            "type": "select",
            "label": "Estado de la carrocería",
            "required": true,
            "options": [
              {"value": "EXCELENTE", "label": "Excelente", "score": 10},
              {"value": "BUENO", "label": "Bueno", "score": 7},
              {"value": "REGULAR", "label": "Regular", "score": 4},
              {"value": "MALO", "label": "Malo", "score": 0}
            ],
            "scoring": {
              "enabled": true,
              "weight": 10
            }
          },
          {
            "id": "body_damage",
            "type": "checkbox",
            "label": "¿Presenta daños visibles?",
            "defaultValue": false,
            "conditional": {
              "triggerActions": {
                "showItem": "body_damage_photo",
                "createAction": true
              }
            }
          },
          {
            "id": "body_damage_photo",
            "type": "photo",
            "label": "Foto del daño",
            "required": false,
            "hidden": true,
            "conditional": {
              "dependsOn": "body_damage",
              "showWhen": "value === true"
            }
          },
          {
            "id": "lights_working",
            "type": "select",
            "label": "Estado de luces (delanteras y traseras)",
            "required": true,
            "options": [
              {"value": "TODAS_OK", "label": "Todas funcionando", "score": 10},
              {"value": "ALGUNA_FALLA", "label": "Alguna falla", "score": 5},
              {"value": "MULTIPLES_FALLAS", "label": "Múltiples fallas", "score": 0}
            ],
            "scoring": {
              "enabled": true,
              "weight": 10
            }
          }
        ]
      },
      {
        "id": "section_3",
        "title": "Elementos de Seguridad",
        "description": "Verificación de elementos obligatorios",
        "items": [
          {
            "id": "fire_extinguisher",
            "type": "checkbox",
            "label": "Extintor presente y vigente",
            "required": true,
            "scoring": {
              "enabled": true,
              "weight": 15,
              "trueScore": 15,
              "falseScore": 0
            }
          },
          {
            "id": "first_aid_kit",
            "type": "checkbox",
            "label": "Botiquín de primeros auxilios",
            "required": true,
            "scoring": {
              "enabled": true,
              "weight": 10,
              "trueScore": 10,
              "falseScore": 0
            }
          },
          {
            "id": "warning_triangles",
            "type": "checkbox",
            "label": "Triángulos de seguridad (2)",
            "required": true,
            "scoring": {
              "enabled": true,
              "weight": 10,
              "trueScore": 10,
              "falseScore": 0
            }
          }
        ]
      },
      {
        "id": "section_4",
        "title": "Firma y Observaciones",
        "items": [
          {
            "id": "inspector_signature",
            "type": "signature",
            "label": "Firma del Inspector",
            "required": true
          },
          {
            "id": "observations",
            "type": "textarea",
            "label": "Observaciones adicionales",
            "placeholder": "Ingresa cualquier observación relevante...",
            "rows": 4
          }
        ]
      }
    ],
    "scoring": {
      "enabled": true,
      "maxPoints": 100,
      "passingThreshold": 70
    },
    "metadata": {
      "requiresGeolocation": true,
      "requiresSignature": true,
      "allowOffline": true,
      "estimatedDuration": 15
    }
  }',
  true,
  100,
  70,
  true,
  1,
  1
);

-- ============================================
-- 8. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE hse_templates IS 'Plantillas de formularios dinámicos para inspecciones HSE';
COMMENT ON TABLE hse_inspections IS 'Inspecciones/auditorías realizadas usando las plantillas';
COMMENT ON TABLE hse_corrective_actions IS 'Acciones correctivas generadas a partir de inspecciones';
COMMENT ON COLUMN hse_templates.schema IS 'JSON Schema completo del formulario con secciones, items y lógica';
COMMENT ON COLUMN hse_inspections.answers IS 'Respuestas del usuario en formato JSON dinámico';
COMMENT ON COLUMN hse_inspections.template_snapshot IS 'Copia inmutable del schema usado (versionamiento)';
