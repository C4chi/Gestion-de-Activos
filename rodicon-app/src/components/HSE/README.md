# 📋 HSE Dynamic Forms System

Sistema de formularios dinámicos para inspecciones y auditorías HSE, inspirado en SafetyCulture/iAuditor.

---

## 📁 Estructura de Archivos

```
src/components/HSE/
├── FormRenderer.jsx              # Motor de renderizado dinámico (850 líneas)
├── InspectionsDashboard.jsx      # Panel principal (350 líneas)
├── TemplateSelector.jsx          # Selector de templates (200 líneas)
├── InspectionCard.jsx            # Tarjeta de inspección (150 líneas)
├── InspectionDetailModal.jsx     # Modal de detalle (500 líneas)
└── README.md                     # Este archivo

src/services/
└── hseService.js                 # Servicio de negocio (550 líneas)
```

---

## 🚀 Quick Start

### 1. Importar Dashboard

```jsx
import InspectionsDashboard from './components/HSE/InspectionsDashboard';

// En tu router
<Route path="/hse-inspections" element={<InspectionsDashboard />} />
```

### 2. Usar FormRenderer Standalone

```jsx
import FormRenderer from './components/HSE/FormRenderer';
import { getTemplateById } from './services/hseService';

function MyComponent() {
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    const tmpl = await getTemplateById('template-id');
    setTemplate(tmpl);
  };

  const handleSubmit = async (formData) => {
    console.log('Form submitted:', formData);
    // formData = { answers: {...}, score: {...}, passed: true/false }
  };

  return (
    <FormRenderer
      template={template}
      onSubmit={handleSubmit}
      mode="edit"
      showScore={true}
    />
  );
}
```

---

## 🧩 Componentes

### FormRenderer

**Props:**
- `template` (object): Template con schema JSON
- `initialAnswers` (object): Respuestas previas para edición
- `onSubmit` (function): Callback al completar
- `mode` (string): `'edit'` | `'view'`
- `showScore` (boolean): Mostrar barra de puntaje

**Ejemplo de uso:**
```jsx
<FormRenderer
  template={{
    id: 'abc-123',
    name: 'Inspección Vehicular',
    schema: {
      sections: [...],
      scoring: { enabled: true, maxPoints: 100 }
    }
  }}
  initialAnswers={{
    ficha: { value: 'V-001', timestamp: '...' }
  }}
  onSubmit={handleSubmit}
  mode="edit"
  showScore={true}
/>
```

---

### InspectionsDashboard

**Props:** Ninguna (standalone)

**Características:**
- KPIs automáticos
- Filtros por estado, prioridad, template
- Búsqueda
- Botón "Nueva Inspección"
- Botón "Sincronizar" (offline sync)

**Uso:**
```jsx
import InspectionsDashboard from './components/HSE/InspectionsDashboard';

<InspectionsDashboard />
```

---

### TemplateSelector

**Props:**
- `templates` (array): Lista de templates
- `onSelect` (function): Callback al seleccionar
- `onClose` (function): Callback al cerrar

**Ejemplo:**
```jsx
<TemplateSelector
  templates={templatesArray}
  onSelect={(templateId) => {
    console.log('Selected:', templateId);
  }}
  onClose={() => setShowModal(false)}
/>
```

---

### InspectionCard

**Props:**
- `inspection` (object): Objeto de inspección
- `onClick` (function): Callback al hacer click

**Ejemplo:**
```jsx
<InspectionCard
  inspection={{
    id: '...',
    inspection_number: 'HSE-INS-0001',
    title: 'Inspección Vehicular',
    status: 'COMPLETED',
    score_percentage: 85.5,
    passed: true,
    ...
  }}
  onClick={() => handleViewDetails(inspection)}
/>
```

---

### InspectionDetailModal

**Props:**
- `inspectionId` (string): UUID de la inspección
- `onClose` (function): Callback al cerrar
- `onUpdate` (function): Callback para refrescar datos

**Ejemplo:**
```jsx
<InspectionDetailModal
  inspectionId="abc-123-def-456"
  onClose={() => setShowModal(false)}
  onUpdate={loadInspections}
/>
```

---

## 🛠️ Servicio (hseService.js)

### Templates

```javascript
import { 
  getActiveTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate 
} from './services/hseService';

// Obtener templates activos
const templates = await getActiveTemplates();

// Obtener uno específico
const template = await getTemplateById('uuid');

// Crear nuevo
const newTemplate = await createTemplate({
  name: 'Nueva Inspección',
  description: '...',
  category: 'SAFETY',
  schema: {...}
});

// Crear nueva versión
const v2 = await updateTemplate(templateId, {
  schema: updatedSchema,
  changes: { summary: 'Agregada sección X' }
});
```

### Inspecciones

```javascript
import { 
  createInspection,
  saveInspectionProgress,
  completeInspection,
  getInspections 
} from './services/hseService';

// Crear borrador
const inspection = await createInspection({
  template_id: 'uuid',
  title: 'Inspección #1',
  conducted_by: userId
});

// Guardar progreso (auto-save)
await saveInspectionProgress(inspectionId, answers);

// Completar
await completeInspection(inspectionId, {
  answers: {...},
  score: { total: 85, max: 100, percentage: 85 },
  passed: true,
  latitude: -33.4569,
  longitude: -70.6483
});

// Listar con filtros
const inspections = await getInspections({
  status: 'COMPLETED',
  priority: 'ALTA',
  date_from: '2026-01-01'
});
```

### Offline Sync

```javascript
import { 
  saveOfflineInspection,
  syncPendingInspections 
} from './services/hseService';

// Guardar offline
if (!navigator.onLine) {
  await saveOfflineInspection(inspectionData);
}

// Sincronizar cuando hay conexión
const results = await syncPendingInspections();
console.log(`${results.success.length} synced`);
console.log(`${results.failed.length} failed`);
```

---

## 📝 Estructura de Template JSON

```json
{
  "version": "1.0.0",
  "sections": [
    {
      "id": "section_1",
      "title": "Información General",
      "description": "Descripción de la sección",
      "items": [
        {
          "id": "item_1",
          "type": "text",
          "label": "¿Pregunta?",
          "required": true,
          "placeholder": "Texto de ayuda",
          "validation": {
            "minLength": 3,
            "maxLength": 100
          },
          "scoring": {
            "enabled": true,
            "weight": 10
          },
          "conditional": {
            "dependsOn": "otro_item_id",
            "showWhen": "value === 'SI'"
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
    "requiresGeolocation": true,
    "requiresSignature": true,
    "allowOffline": true
  }
}
```

### Tipos de Campo Soportados

| Tipo | Uso | Props |
|------|-----|-------|
| `text` | Input de texto | `placeholder`, `validation` |
| `textarea` | Texto multilínea | `rows`, `placeholder` |
| `number` | Input numérico | `validation.min/max` |
| `date` | Selector de fecha | - |
| `datetime` | Fecha y hora | - |
| `select` | Dropdown | `options` array |
| `checkbox` | Casilla | `defaultValue`, `scoring` |
| `photo` | Captura de foto | Integra con Storage |
| `signature` | Firma digital | - |
| `rating` | Estrellas 1-5 | - |

---

## 🧮 Sistema de Scoring

### Configuración Global

```json
{
  "scoring": {
    "enabled": true,
    "maxPoints": 100,
    "passingThreshold": 70
  }
}
```

### Por Item (Checkbox)

```json
{
  "id": "extintor_ok",
  "type": "checkbox",
  "label": "Extintor presente",
  "scoring": {
    "enabled": true,
    "weight": 15,
    "trueScore": 15,
    "falseScore": 0
  }
}
```

### Por Item (Select)

```json
{
  "id": "estado_carroceria",
  "type": "select",
  "options": [
    {"value": "EXCELENTE", "label": "Excelente", "score": 10},
    {"value": "BUENO", "label": "Bueno", "score": 7},
    {"value": "MALO", "label": "Malo", "score": 0}
  ],
  "scoring": {
    "enabled": true,
    "weight": 10
  }
}
```

**El score se calcula automáticamente en tiempo real.**

---

## 🔀 Lógica Condicional

### Mostrar campo si otro es X

```json
{
  "id": "item_dependiente",
  "type": "photo",
  "label": "Foto del daño",
  "hidden": true,
  "conditional": {
    "dependsOn": "tiene_dano",
    "showWhen": "value === true"
  }
}
```

### Crear acción correctiva automática

```json
{
  "id": "extintor_ok",
  "type": "checkbox",
  "label": "Extintor presente",
  "conditional": {
    "triggerActions": {
      "showItem": "foto_extintor",
      "createAction": true
    }
  }
}
```

**Si marca checkbox, se crea acción correctiva automáticamente.**

---

## 📱 Offline Sync

### Arquitectura

```
Usuario sin conexión
     ↓
FormRenderer guarda respuestas
     ↓
hseService.saveOfflineInspection() → IndexedDB
     ↓
Badge "⚠️ Sin sincronizar"
     ↓
Usuario recupera conexión
     ↓
Click "Sincronizar"
     ↓
hseService.syncPendingInspections() → Supabase
     ↓
is_synced = true
```

### Implementación

```javascript
// Detectar si está offline
if (!navigator.onLine) {
  await saveOfflineInspection(data);
  alert('Guardado localmente. Se sincronizará cuando haya conexión.');
}

// Sincronizar manualmente
const results = await syncPendingInspections();
```

### IndexedDB Schema

```javascript
{
  storeName: 'inspections',
  keyPath: 'id',
  indexes: [
    { name: 'is_synced', keyPath: 'is_synced' },
    { name: 'last_modified', keyPath: 'last_modified' }
  ]
}
```

---

## 🧪 Testing

### Test de Template

```javascript
import { getTemplateById } from './services/hseService';

const template = await getTemplateById('abc-123');
console.log(template.schema.sections.length); // 4
console.log(template.scoring_enabled); // true
```

### Test de FormRenderer

```jsx
import { render, fireEvent } from '@testing-library/react';
import FormRenderer from './FormRenderer';

test('calcula score correctamente', () => {
  const { getByText } = render(
    <FormRenderer template={mockTemplate} onSubmit={jest.fn()} />
  );
  
  // Simular respuestas
  fireEvent.change(input, { target: { value: 'test' } });
  
  // Verificar score
  expect(getByText(/85%/)).toBeInTheDocument();
});
```

---

## 📚 Documentación Completa

Para más información:
- **Guía completa:** [HSE_DYNAMIC_FORMS_GUIDE.md](../../HSE_DYNAMIC_FORMS_GUIDE.md)
- **Comparación:** [HSE_BEFORE_AFTER_COMPARISON.md](../../HSE_BEFORE_AFTER_COMPARISON.md)
- **Resumen ejecutivo:** [HSE_EXECUTIVE_SUMMARY.md](../../HSE_EXECUTIVE_SUMMARY.md)

---

## 🐛 Troubleshooting

### Error: "Template schema is invalid"

**Causa:** Template sin schema o schema mal formado

**Solución:**
```javascript
// Verificar que template tenga schema
console.log(template.schema); // No debe ser null/undefined

// Verificar estructura básica
console.log(template.schema.sections); // Array de secciones
```

---

### Error: "Failed to save offline"

**Causa:** IndexedDB no disponible o quota excedida

**Solución:**
```javascript
// Verificar soporte
if (!window.indexedDB) {
  alert('Navegador no soporta offline. Usa Chrome/Firefox.');
}

// Limpiar datos antiguos
const db = await openOfflineDB();
const tx = db.transaction('inspections', 'readwrite');
await tx.objectStore('inspections').clear();
```

---

### Error: "Score not calculating"

**Causa:** Items sin configuración de scoring

**Solución:**
```json
// Asegúrate que los items tengan:
{
  "scoring": {
    "enabled": true,
    "weight": 10,
    "trueScore": 10,  // Para checkboxes
    "falseScore": 0
  }
}

// O para selects:
{
  "options": [
    {"value": "SI", "label": "Sí", "score": 10}
  ],
  "scoring": {
    "enabled": true,
    "weight": 10
  }
}
```

---

## 🔧 Configuración

### Variables de Entorno

```env
# Supabase (ya configurado en supabaseClient.js)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Storage bucket para fotos
VITE_STORAGE_BUCKET=uploads
```

### RLS Policies Requeridas

```sql
-- Permitir lectura de templates activos
CREATE POLICY "Templates públicos" ON hse_templates
FOR SELECT USING (is_active = true);

-- Permitir creación de inspecciones
CREATE POLICY "Crear inspecciones" ON hse_inspections
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir actualización de propias inspecciones
CREATE POLICY "Actualizar propias inspecciones" ON hse_inspections
FOR UPDATE USING (conducted_by = auth.uid());
```

---

## 📦 Dependencias

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "lucide-react": "^0.400.0",
    "react-signature-canvas": "^1.0.6"
  }
}
```

**Instalar:**
```bash
npm install lucide-react react-signature-canvas
```

---

## 🚀 Performance

### Optimizaciones Implementadas

1. **Lazy Loading:** TemplateSelector carga templates solo cuando se abre
2. **Memoization:** useFormState usa useCallback para evitar re-renders
3. **Debouncing:** Auto-save tiene debounce de 2 segundos
4. **Pagination:** Dashboard carga 50 inspecciones por página
5. **IndexedDB:** Acceso local para offline, más rápido que red

### Métricas Esperadas

- Carga de Dashboard: < 1 segundo
- Renderizado de formulario: < 500ms
- Cálculo de score: < 50ms
- Guardado offline: < 100ms
- Sincronización: ~1 segundo por inspección

---

## 🎨 Personalización

### Cambiar colores de score

```jsx
// En FormRenderer.jsx, línea ~150
const scoreColor = score.percentage >= threshold ? 'green' : 'red';

// Cambiar a:
const scoreColor = score.percentage >= 90 ? 'blue' : 
                   score.percentage >= 70 ? 'green' : 
                   score.percentage >= 50 ? 'yellow' : 'red';
```

### Agregar nuevo tipo de campo

```jsx
// En FormRenderer.jsx, función renderInput()
case 'myCustomType':
  return (
    <MyCustomInput
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
```

---

**Sistema HSE Dinámico - v1.0.0** 🚀
