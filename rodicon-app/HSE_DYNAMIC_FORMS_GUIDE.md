# 🚀 GUÍA DE IMPLEMENTACIÓN: Sistema HSE Dinámico
**SafetyCulture/iAuditor para Rodicon App**

---

## 📋 ÍNDICE

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Esquema de Base de Datos](#esquema-de-base-de-datos)
4. [Estructura de Templates JSON](#estructura-de-templates-json)
5. [Componentes React](#componentes-react)
6. [Servicios y Lógica de Negocio](#servicios-y-lógica-de-negocio)
7. [Sistema de Scoring](#sistema-de-scoring)
8. [Lógica Condicional](#lógica-condicional)
9. [Offline Sync](#offline-sync)
10. [Migración de Datos Existentes](#migración-de-datos-existentes)
11. [Guía de Uso](#guía-de-uso)
12. [Próximos Pasos](#próximos-pasos)

---

## 🎯 INTRODUCCIÓN

Este sistema transforma el módulo HSE de un modelo rígido con formularios hardcodeados a un sistema de **formularios dinámicos versionados** similar a SafetyCulture/iAuditor.

### ✅ Características Principales

- ✅ **Templates Dinámicos**: Define formularios en JSON con estructura flexible
- ✅ **Versionamiento**: Inmutabilidad histórica de inspecciones completadas
- ✅ **Scoring Automático**: Sistema de puntuación configurable con umbrales
- ✅ **Lógica Condicional**: Preguntas que se muestran/ocultan según respuestas previas
- ✅ **Tipos de Campo Avanzados**: Text, Select, Checkbox, Photo, Signature, GPS, Rating, etc.
- ✅ **Acciones Correctivas Automáticas**: Generación de tareas según respuestas
- ✅ **Offline-First**: IndexedDB + Background Sync para trabajar sin conexión
- ✅ **Multi-sección/Multi-página**: Organización jerárquica de formularios complejos

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│  InspectionsDashboard → TemplateSelector → FormRenderer     │
│              ↓                    ↓                          │
│     InspectionCard       InspectionDetailModal              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE SERVICIOS                         │
│  hseService.js (CRUD Templates, Inspecciones, Actions)      │
│              ↓                    ↓                          │
│     Supabase Client        IndexedDB (Offline)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS                             │
│  ┌─────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │hse_templates│  │hse_inspections │  │hse_corrective_  │ │
│  │             │  │                │  │actions          │ │
│  └─────────────┘  └────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Trabajo

1. **Creación de Template**: Admin define formulario en JSON
2. **Selección de Template**: Usuario elige tipo de inspección
3. **Renderizado Dinámico**: FormRenderer construye UI desde JSON
4. **Captura de Respuestas**: Usuario completa formulario con validaciones
5. **Cálculo de Score**: Sistema calcula puntuación automáticamente
6. **Generación de Acciones**: Se crean acciones correctivas si es necesario
7. **Persistencia**: Datos guardados localmente (offline) o en Supabase
8. **Sincronización**: Background sync sube inspecciones pendientes

---

## 💾 ESQUEMA DE BASE DE DATOS

### Tabla: `hse_templates`

**Define los tipos de inspecciones disponibles**

```sql
CREATE TABLE hse_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,          -- "Inspección de Seguridad Vehicular"
  description TEXT,
  category VARCHAR(100),                -- SAFETY, QUALITY, MAINTENANCE
  icon VARCHAR(50),                     -- 🚗
  
  -- JSON Schema completo del formulario
  schema JSONB NOT NULL,
  
  -- Configuración de scoring
  scoring_enabled BOOLEAN DEFAULT false,
  max_score INTEGER DEFAULT 100,
  passing_threshold INTEGER DEFAULT 70,
  
  -- Versionamiento
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  parent_template_id UUID REFERENCES hse_templates(id),
  
  -- Metadata
  created_by BIGINT REFERENCES app_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);
```

### Tabla: `hse_inspections`

**Almacena las inspecciones/auditorías realizadas**

```sql
CREATE TABLE hse_inspections (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES hse_templates(id),
  template_version INTEGER NOT NULL,
  template_snapshot JSONB NOT NULL,    -- Copia inmutable del schema
  
  inspection_number VARCHAR(50) UNIQUE,  -- HSE-INS-0001
  title VARCHAR(255) NOT NULL,
  
  -- Respuestas del usuario (payload dinámico)
  answers JSONB NOT NULL DEFAULT '{}',
  
  -- Scoring calculado
  total_score DECIMAL(5,2) DEFAULT 0,
  max_possible_score INTEGER DEFAULT 0,
  score_percentage DECIMAL(5,2) DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'DRAFT',    -- DRAFT, COMPLETED, APPROVED
  priority VARCHAR(20) DEFAULT 'MEDIA',
  
  -- Flags automáticos
  has_critical_issues BOOLEAN DEFAULT false,
  has_photos BOOLEAN DEFAULT false,
  has_signature BOOLEAN DEFAULT false,
  auto_flags JSONB DEFAULT '[]',
  
  -- Contexto
  asset_id UUID,
  ficha VARCHAR(50),
  location VARCHAR(255),
  area VARCHAR(100),
  
  -- Asignaciones
  conducted_by BIGINT REFERENCES app_users(id),
  assigned_to BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  reviewed_by BIGINT REFERENCES app_users(id),
  
  -- Fechas
  scheduled_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Geolocalización
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geo_accuracy DECIMAL(10, 2),
  
  -- Offline sync
  is_synced BOOLEAN DEFAULT true,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `hse_corrective_actions`

**Acciones correctivas generadas desde inspecciones**

```sql
CREATE TABLE hse_corrective_actions (
  id UUID PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES hse_inspections(id),
  item_id VARCHAR(100) NOT NULL,      -- ID del item que generó la acción
  
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'MEDIA',
  status VARCHAR(50) DEFAULT 'OPEN',  -- OPEN, IN_PROGRESS, RESOLVED
  
  assigned_to BIGINT REFERENCES app_users(id),
  due_date TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📝 ESTRUCTURA DE TEMPLATES JSON

### Esquema Completo

```json
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
          "type": "text|select|multiselect|number|date|datetime|photo|signature|gps|checkbox|rating|slider|textarea",
          "label": "¿Pregunta del formulario?",
          "required": true,
          "placeholder": "Texto de ayuda...",
          "helpText": "Información adicional para el usuario",
          "defaultValue": "",
          
          "validation": {
            "minLength": 3,
            "maxLength": 100,
            "min": 0,
            "max": 100,
            "pattern": "^[A-Z0-9-]+$"
          },
          
          "options": [
            {"value": "EXCELENTE", "label": "Excelente", "score": 10},
            {"value": "BUENO", "label": "Bueno", "score": 7},
            {"value": "REGULAR", "label": "Regular", "score": 4},
            {"value": "MALO", "label": "Malo", "score": 0}
          ],
          
          "conditional": {
            "dependsOn": "item_id",
            "showWhen": "value === 'SI'",
            "triggerActions": {
              "showItem": "item_2",
              "createAction": true
            }
          },
          
          "scoring": {
            "enabled": true,
            "weight": 10,
            "trueScore": 10,
            "falseScore": 0,
            "passingScore": {"value": "SI", "points": 10},
            "failingScore": {"value": "NO", "points": 0}
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
    "allowOffline": true,
    "estimatedDuration": 15
  }
}
```

### Tipos de Campo Soportados

| Tipo | Descripción | Props Especiales |
|------|-------------|------------------|
| `text` | Input de texto simple | `placeholder`, `validation.minLength/maxLength` |
| `textarea` | Texto multilínea | `rows`, `placeholder` |
| `number` | Input numérico | `validation.min/max` |
| `date` | Selector de fecha | - |
| `datetime` | Fecha y hora | - |
| `select` | Dropdown de opciones | `options` con `value`, `label`, `score` |
| `multiselect` | Selección múltiple | `options` |
| `checkbox` | Casilla de verificación | `defaultValue`, `scoring.trueScore/falseScore` |
| `radio` | Botones de radio | `options` |
| `rating` | Estrellas (1-5) | - |
| `slider` | Barra deslizante | `validation.min/max` |
| `photo` | Captura/subida de foto | Integración con Supabase Storage |
| `signature` | Captura de firma digital | - |
| `gps` | Coordenadas GPS | Usa Geolocation API |

---

## ⚛️ COMPONENTES REACT

### 1. `FormRenderer.jsx`
**Motor de renderizado dinámico**

```jsx
<FormRenderer
  template={template}              // Template object con schema
  initialAnswers={{}}              // Respuestas previas (para edición)
  onSubmit={handleSubmit}          // Callback al completar
  mode="edit|view"                 // Modo edición o solo lectura
  showScore={true}                 // Mostrar barra de puntaje
/>
```

**Características:**
- Renderiza formulario desde JSON
- Maneja estado de respuestas y validaciones
- Calcula score en tiempo real
- Evalúa lógica condicional (show/hide)
- Valida campos requeridos antes de submit

### 2. `InspectionsDashboard.jsx`
**Panel principal de gestión**

**Características:**
- KPIs: Total, Completadas, Borradores, Aprobadas, Score Promedio
- Filtros: Estado, Prioridad, Template, Búsqueda
- Grid de InspectionCard
- Botón "Nueva Inspección" → abre TemplateSelector
- Botón "Sincronizar" → sube inspecciones offline

### 3. `TemplateSelector.jsx`
**Modal para elegir tipo de inspección**

```jsx
<TemplateSelector
  templates={templatesArray}
  onSelect={(templateId) => {...}}
  onClose={() => {...}}
/>
```

### 4. `InspectionCard.jsx`
**Tarjeta de inspección en el grid**

Muestra:
- Número de inspección (HSE-INS-0001)
- Título
- Status badge
- Score (si completada) con barra de progreso
- Prioridad
- Iconos: fotos, GPS, issues críticos
- Fecha

### 5. `InspectionDetailModal.jsx`
**Modal de detalle con 3 tabs**

- **Tab "Formulario"**: FormRenderer en modo `view`
- **Tab "Acciones Correctivas"**: Lista de acciones generadas
- **Tab "Información"**: Metadata, geolocalización, resultados

---

## 🧮 SISTEMA DE SCORING

### Configuración Global (Template)

```json
{
  "scoring": {
    "enabled": true,
    "maxPoints": 100,
    "passingThreshold": 70
  }
}
```

### Configuración por Item

#### Tipo: Checkbox

```json
{
  "id": "fire_extinguisher",
  "type": "checkbox",
  "label": "¿Extintor presente y vigente?",
  "scoring": {
    "enabled": true,
    "weight": 15,
    "trueScore": 15,
    "falseScore": 0
  }
}
```

#### Tipo: Select (con opciones)

```json
{
  "id": "body_condition",
  "type": "select",
  "label": "Estado de la carrocería",
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
}
```

### Cálculo Automático

El `useFormState` hook en FormRenderer:

1. Escucha cambios en `answers`
2. Por cada respuesta, extrae el `score` del item
3. Suma todos los scores: `totalScore`
4. Suma todos los weights: `maxScore`
5. Calcula porcentaje: `(totalScore / maxScore) * 100`
6. Determina `passed`: `percentage >= passingThreshold`

---

## 🔀 LÓGICA CONDICIONAL

### Mostrar/Ocultar Campos

```json
{
  "id": "body_damage",
  "type": "checkbox",
  "label": "¿Presenta daños visibles?",
  "conditional": {
    "triggerActions": {
      "showItem": "body_damage_photo",
      "createAction": true
    }
  }
}
```

```json
{
  "id": "body_damage_photo",
  "type": "photo",
  "label": "Foto del daño",
  "hidden": true,
  "conditional": {
    "dependsOn": "body_damage",
    "showWhen": "value === true"
  }
}
```

### Evaluación en Runtime

```javascript
// En FormRenderer.jsx - evaluateConditionals()
const shouldShow = eval(showWhen.replace('value', JSON.stringify(value)));
```

Soporta expresiones JavaScript:
- `value === 'X'`
- `value !== 'Y'`
- `value > 5`
- `value === true`
- `value.includes('text')`

---

## 📱 OFFLINE SYNC

### Arquitectura

```
User Sin Conexión
     ↓
FormRenderer guarda respuestas
     ↓
saveOfflineInspection() → IndexedDB
     ↓
Aparece badge "⚠️ Sin sincronizar"
     ↓
User recupera conexión
     ↓
Click "Sincronizar" o Auto Background Sync
     ↓
syncPendingInspections() → Supabase
     ↓
Marca is_synced = true
```

### Implementación

#### 1. Guardar Offline

```javascript
// hseService.js
export const saveOfflineInspection = async (inspectionData) => {
  const db = await openOfflineDB();
  const tx = db.transaction('inspections', 'readwrite');
  const store = tx.objectStore('inspections');
  
  const offlineRecord = {
    ...inspectionData,
    is_synced: false,
    sync_attempts: 0,
    last_modified: new Date().toISOString()
  };

  await store.put(offlineRecord);
  return offlineRecord;
};
```

#### 2. Sincronizar

```javascript
export const syncPendingInspections = async () => {
  const unsynced = await getUnsyncedInspections();
  const results = { success: [], failed: [] };

  for (const inspection of unsynced) {
    try {
      if (inspection.id && inspection.status !== 'DRAFT') {
        await completeInspection(inspection.id, {...});
      } else {
        await createInspection(inspection);
      }

      inspection.is_synced = true;
      // Actualizar en IndexedDB
      results.success.push(inspection.inspection_number);
    } catch (error) {
      inspection.sync_attempts += 1;
      results.failed.push({...});
    }
  }

  return results;
};
```

#### 3. Background Sync (Avanzado)

Usando Service Workers:

```javascript
// serviceWorker.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncPendingInspections());
  }
});
```

---

## 🔄 MIGRACIÓN DE DATOS EXISTENTES

### Script de Migración: `safety_reports` → `hse_inspections`

```sql
-- 1. Crear template para reportes legacy
INSERT INTO hse_templates (name, description, category, schema, version)
VALUES (
  'Reporte de Seguridad (Legacy)',
  'Template generado para migrar reportes existentes',
  'SAFETY',
  '{
    "version": "1.0.0",
    "sections": [
      {
        "id": "section_1",
        "title": "Información del Reporte",
        "items": [
          {"id": "tipo", "type": "text", "label": "Tipo"},
          {"id": "prioridad", "type": "text", "label": "Prioridad"},
          {"id": "descripcion", "type": "textarea", "label": "Descripción"},
          {"id": "notas", "type": "textarea", "label": "Notas"}
        ]
      }
    ],
    "scoring": {"enabled": false}
  }',
  1
)
RETURNING id INTO legacy_template_id;

-- 2. Migrar reportes existentes
INSERT INTO hse_inspections (
  template_id,
  template_version,
  template_snapshot,
  inspection_number,
  title,
  answers,
  status,
  priority,
  ficha,
  conducted_by,
  started_at,
  completed_at,
  is_synced
)
SELECT
  legacy_template_id,
  1,
  (SELECT schema FROM hse_templates WHERE id = legacy_template_id),
  numero_reporte,
  CONCAT('Reporte: ', tipo),
  jsonb_build_object(
    'tipo', jsonb_build_object('value', tipo, 'timestamp', fecha_reporte),
    'prioridad', jsonb_build_object('value', prioridad, 'timestamp', fecha_reporte),
    'descripcion', jsonb_build_object('value', descripcion, 'timestamp', fecha_reporte),
    'notas', jsonb_build_object('value', notas, 'timestamp', fecha_reporte)
  ),
  CASE WHEN estado = 'CORREGIDO' THEN 'COMPLETED' ELSE 'DRAFT' END,
  prioridad,
  ficha,
  (SELECT id FROM app_users WHERE nombre = asignado_a LIMIT 1),
  fecha_reporte,
  CASE WHEN estado = 'CORREGIDO' THEN fecha_reporte + INTERVAL '1 day' ELSE NULL END,
  true
FROM safety_reports;

-- 3. Verificar migración
SELECT 
  (SELECT COUNT(*) FROM safety_reports) as total_legacy,
  (SELECT COUNT(*) FROM hse_inspections WHERE template_id = legacy_template_id) as total_migrated;
```

---

## 📖 GUÍA DE USO

### Para Administradores

#### 1. Crear un Nuevo Template

```javascript
import { createTemplate } from './services/hseService';

const newTemplate = await createTemplate({
  name: "Inspección de Ergonomía",
  description: "Evaluación de puestos de trabajo",
  category: "SAFETY",
  icon: "🪑",
  schema: {
    version: "1.0.0",
    sections: [
      {
        id: "section_1",
        title: "Evaluación del Puesto",
        items: [
          {
            id: "chair_adjustable",
            type: "checkbox",
            label: "Silla regulable en altura",
            required: true,
            scoring: {
              enabled: true,
              weight: 10,
              trueScore: 10,
              falseScore: 0
            }
          }
        ]
      }
    ],
    scoring: {
      enabled: true,
      maxPoints: 100,
      passingThreshold: 80
    }
  },
  created_by: currentUserId
});
```

#### 2. Actualizar un Template (Crear Nueva Versión)

```javascript
import { updateTemplate } from './services/hseService';

await updateTemplate(templateId, {
  schema: updatedSchema,
  changes: {
    summary: "Agregada sección de iluminación",
    details: ["Nueva pregunta: Nivel de lux", "Cambio de peso en pregunta 3"]
  },
  changed_by: currentUserId,
  deactivateOld: true  // Desactivar versión anterior
});
```

### Para Usuarios (Inspectores)

#### 1. Crear Inspección desde Dashboard

```javascript
// InspectionsDashboard.jsx
const handleCreateInspection = async (templateId) => {
  const template = templates.find(t => t.id === templateId);
  setSelectedTemplate(template);
  setShowFormModal(true);
};
```

#### 2. Completar Formulario

```javascript
const handleSubmitInspection = async (formData) => {
  // Crear borrador
  const inspection = await createInspection({
    template_id: selectedTemplate.id,
    title: selectedTemplate.name,
    priority: 'MEDIA',
    conducted_by: currentUserId
  });

  // Completar con respuestas
  await completeInspection(inspection.id, {
    answers: formData.answers,
    score: formData.score,
    passed: formData.passed,
    latitude: position?.latitude,
    longitude: position?.longitude
  });
};
```

#### 3. Trabajar Offline

```javascript
// Si no hay conexión, guardar localmente
if (!navigator.onLine) {
  await saveOfflineInspection(inspectionData);
  alert('⚠️ Sin conexión. Inspección guardada localmente.');
}

// Luego, al recuperar conexión
await syncPendingInspections();
```

---

## 🚀 PRÓXIMOS PASOS

### Fase 1: MVP (Implementado) ✅
- [x] Schema de base de datos
- [x] FormRenderer dinámico
- [x] InspectionsDashboard
- [x] Sistema de scoring
- [x] Lógica condicional básica
- [x] Offline storage (IndexedDB)

### Fase 2: Mejoras de UX 🔄
- [ ] FormBuilder visual (drag & drop para crear templates)
- [ ] Firma digital (integración con react-signature-canvas)
- [ ] Captura de fotos mejorada (annotation, filters)
- [ ] Preview de templates antes de usar
- [ ] Duplicar templates existentes

### Fase 3: Inteligencia 🤖
- [ ] IA para detectar hallazgos críticos en fotos
- [ ] Recomendaciones automáticas de acciones correctivas
- [ ] Análisis de tendencias (reportes recurrentes)
- [ ] Predicción de score basado en respuestas parciales

### Fase 4: Integración 🔗
- [ ] Exportación a PDF con branding
- [ ] Exportación a Excel con gráficos
- [ ] Notificaciones push cuando se asignan acciones
- [ ] Integración con sistema de mantenimiento (crear OT desde acciones)
- [ ] API REST para integración con sistemas externos

### Fase 5: Enterprise 🏢
- [ ] Multi-tenancy (diferentes clientes)
- [ ] Roles y permisos granulares
- [ ] Workflows de aprobación (revisor → aprobador)
- [ ] Auditoría completa de cambios
- [ ] Dashboard ejecutivo con BI

---

## 📞 SOPORTE

Para dudas o problemas:

1. Revisar logs en consola del navegador
2. Verificar que la migración SQL se ejecutó correctamente
3. Comprobar permisos RLS en Supabase
4. Revisar IndexedDB en DevTools (Application → Storage)

---

## 📄 LICENCIA

Este sistema es propiedad de Rodicon App. Todos los derechos reservados.

---

**¡Sistema HSE Dinámico listo para producción!** 🎉
