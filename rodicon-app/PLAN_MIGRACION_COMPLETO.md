# 📋 PLAN DE MIGRACIÓN COMPLETO: Google Apps Script → React + Supabase

**Fecha:** Diciembre 2025  
**Versión:** 1.0  
**Estado:** Listo para implementación  

---

## 📊 Resumen Ejecutivo

### Análisis de Código Legacy
- **Código.gs:** 213 líneas - Backend business logic con 30+ funciones
- **Index.html:** 600+ líneas - UI frontend con Tailwind CSS
- **Script.html:** 1200+ líneas - Cliente-side event handlers y workflows

### Funcionalidades Actuales
| Módulo | Funciones | Componentes |
|--------|-----------|------------|
| Inventario | Search, Filter, CRUD Assets | Cards, Table, Sidebar |
| Taller | Parts Request, Status Update, Close Order | Workshop Dashboard, Modal Forms |
| Compras | Purchase Status Workflow | Purchasing Dashboard, Comment Modal |
| Seguridad HSE | Create Report, Track Status, Follow-up | Safety Dashboard, Detail Modal |
| Mantenimiento | Maintenance Logging | MTO History Panel |
| Administración | User Management, Asset Visibility | Admin Panel |
| Reportes | PDF Export (Requisiciones, MTO, Safety) | PDF Download Buttons |

---

## 🗄️ SCHEMA SUPABASE (DDL)

### Tabla: `assets`
```sql
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
  taller_responsable VARCHAR(100),
  numero_requisicion VARCHAR(50),
  proyeccion_entrada DATE,
  proyeccion_salida DATE,
  foto_url TEXT,
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id)
);
```

### Tabla: `purchase_orders`
```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha VARCHAR(50) NOT NULL REFERENCES assets(ficha),
  numero_requisicion VARCHAR(50) UNIQUE NOT NULL,
  estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, ORDENADO, PARCIAL, RECIBIDO
  solicitante VARCHAR(100),
  proyecto VARCHAR(100),
  prioridad VARCHAR(20) DEFAULT 'Normal', -- Alta, Media, Normal
  comentario_recepcion TEXT,
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_by UUID REFERENCES app_users(id)
);
```

### Tabla: `purchase_items`
```sql
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  codigo VARCHAR(100),
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `maintenance_logs`
```sql
CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha VARCHAR(50) NOT NULL REFERENCES assets(ficha),
  fecha DATE NOT NULL,
  tipo VARCHAR(50),
  descripcion TEXT,
  costo DECIMAL(12,2),
  mecanico VARCHAR(100),
  km_recorrido INTEGER,
  proyeccion_proxima_mto DATE,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `safety_reports`
```sql
CREATE TABLE safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha VARCHAR(50) NOT NULL REFERENCES assets(ficha),
  tipo VARCHAR(100),
  prioridad VARCHAR(20), -- Alta, Media, Baja
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, CORREGIDO
  asignado_a TEXT, -- Usuarios asignados (JSON o comma-separated)
  foto_url TEXT,
  notas TEXT, -- Comments/follow-ups concatenated
  fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reportado_por UUID REFERENCES app_users(id),
  updated_by UUID REFERENCES app_users(id)
);
```

### Tabla: `audit_log`
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion VARCHAR(100),
  tabla VARCHAR(50),
  registro_id VARCHAR(100),
  detalles TEXT,
  usuario_id UUID REFERENCES app_users(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `app_users` (Actualizada)
```sql
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS (
  rol VARCHAR(50) DEFAULT 'USER', -- ADMIN, COMPRAS, TALLER, MECANICO, USER
  email VARCHAR(255),
  alertas BOOLEAN DEFAULT TRUE,
  campos_permitidos TEXT -- JSON array of editable fields
);
```

---

## 🧩 MAPEO MODULAR: Legacy → React Components

### 1️⃣ MÓDULO INVENTARIO
**Legacy:** `loadInventory()`, `renderData()`, `filterData()`, `openSidebar()`  
**React Components:**
- `InventoryView.jsx` (ya existe, mejorar)
  - Hook: `useInventory()` - Fetch, filter, search
  - Subcomponent: `AssetCard.jsx` - Renderizar tarjetas
  - Subcomponent: `AssetTable.jsx` - Renderizar tabla
  - Subcomponent: `AssetDetailSidebar.jsx` (ya existe, refactor)
  
**Hooks Nuevos:**
```javascript
const useInventory = () => {
  // fetchAssets(), filterAssets(), searchAssets(), getVisibleAssets()
  // applyLocationFilter(), applyCardFilter()
}
```

---

### 2️⃣ MÓDULO ADMINISTRACIÓN
**Legacy:** `openAdminAuth()`, `renderAdminAssets()`, `renderAdminList()`  
**React Components:**
- `AdminPanel.jsx` (nueva)
  - Tab: Asset Visibility Management
  - Tab: User Management (CRUD)
  
**Hooks Nuevos:**
```javascript
const useAdminPanel = () => {
  // toggleAssetVisibility(), getUsersList(), saveUser(), deleteUser()
}
```

---

### 3️⃣ MÓDULO TALLER (Workshop)
**Legacy:** `openWorkshopDashboard()`, `renderWorkshopCards()`, `submitPartsRequest()`, `submitReceiveParts()`, `submitCloseOrder()`  
**React Components:**
- `WorkshopMonitor.jsx` (ya existe, refactor)
  - Subcomponent: `WorkshopCard.jsx` - Vehicle status display
  - Subcomponent: `PartsRequestModal.jsx`
  - Subcomponent: `ReceivePartsModal.jsx`
  - Subcomponent: `CloseOrderModal.jsx` (ya existe)

**Workflows Críticos:**
```
WORKFLOW 1: Solicitar Repuesto
- Mostrar taller dashboard con vehículos en status NO_DISPONIBLE o ESPERA REPUESTO
- Click "Solicitar Repuesto" → Abre modal
- Agregar ítems (código, descripción, cantidad)
- Genera número de requisición automático
- Envía a backend: requestSpareParts(ficha, formData, pin)

WORKFLOW 2: Recibir Repuesto (PARCIAL o TOTAL)
- Vehicle status = "ESPERA REPUESTO"
- Click "Confirmar Llegada" → Pide PIN
- Backend: receiveSpareParts(ficha, pin, modo="TOTAL"|"PARCIAL", comment)
- Si PARCIAL: Asset sigue en "ESPERA REPUESTO"
- Si TOTAL: Asset pasa a "NO DISPONIBLE" (listo para reparación)

WORKFLOW 3: Cerrar Orden
- Después de finalizar reparación
- Mostrar modal con: mecánico, descripción, costo, km, proyección proxima
- Backend: finalizeWorkshopOrder(data, pin)
- Asset status → "DISPONIBLE"
```

---

### 4️⃣ MÓDULO COMPRAS (Purchasing)
**Legacy:** `openPurchasingDashboard()`, `renderPurchasingList()`, `changePurchaseStatus()`  
**React Components:**
- `PurchasingManagement.jsx` (ya existe, refactor completo)
  - Subcomponent: `PurchaseCard.jsx` - Order display with actions
  - Subcomponent: `CommentModal.jsx` (nueva, para recepción parcial)
  
**Estado Workflow (CRÍTICO):**
```
Estado: PENDIENTE
└─ Acción: "Marcar Ordenado"
   └─ Estado: ORDENADO
      ├─ Acción: "Recepción Parcial"
      │  └─ Estado: PARCIAL
      │     └─ Acción: "Completar Recepción"
      │        └─ Estado: RECIBIDO
      └─ Acción: "Recepción Total"
         └─ Estado: RECIBIDO

NOTA: Cuando es PARCIAL, el sistema pide un comentario
(quién recibió, qué falto, fecha próxima llegada, etc.)
```

**Lógica de Colores y Badges:**
```javascript
const statusConfig = {
  'PENDIENTE': { color: 'red', icon: '🔴', animate: true },
  'ORDENADO': { color: 'blue', icon: '🔵', animate: false },
  'PARCIAL': { color: 'orange', icon: '📦', animate: false },
  'RECIBIDO': { color: 'green', icon: '✅', animate: false }
}
```

---

### 5️⃣ MÓDULO SEGURIDAD/HSE
**Legacy:** `saveSafety()`, `loadSafetyHistory()`, `openSafetyDetail()`, `resolveSafety()`  
**React Components:**
- `SafetyCenter.jsx` (ya existe, refactor)
  - Subcomponent: `SafetyReportForm.jsx` - Create new report
  - Subcomponent: `SafetyCard.jsx` - Report preview
  - Subcomponent: `SafetyDetailModal.jsx` - Full report view + comments
  - Subcomponent: `FollowUpModal.jsx` - Add follow-up comment

**Campos Safety Report:**
```javascript
{
  ficha,              // Asset reference
  tipo,               // Type of issue
  prioridad,          // Alta/Media/Baja
  descripcion,        // Issue description
  estado,             // PENDIENTE/CORREGIDO
  asignado,           // Users assigned (array)
  foto,               // Photo URL
  notas,              // Follow-up comments (newline-separated)
  fecha_reporte,      // Creation date
  reportado_por       // User who created
}
```

**Comments Format:**
```
[Usuario|Fecha]: Comentario 1
[Usuario|Fecha]: Comentario 2
```

---

### 6️⃣ MÓDULO MANTENIMIENTO
**Legacy:** `saveMto()`, `loadMtoHistory()`  
**React Components:**
- `MtoDetailModal.jsx` (ya existe, refactor)
  - Hook: `useMaintenanceLog()`

---

### 7️⃣ REPORTES/PDF
**Legacy:** `generateRequisitionPdf_()`, `generateMaintenancePdf()`, `generateSafetyPdf()`  
**React Implementation:**
- Usar `jsPDF` + `jspdf-autotable` (ya instalados)
- Crear servicios en `supabaseService.js`:
  ```javascript
  async function generateRequisitionPdf(purchaseOrder)
  async function generateMaintenancePdf(ficha, maintenanceLogs)
  async function generateSafetyPdf(safetyReport)
  ```

---

## 🔄 FLUJOS DE DATOS (Data Flow)

### Flujo 1: Crear Asset + Foto
```
React Component
  → User llenar formulario + selecciona foto
  → FileReader convierte foto a base64
  → Llamar useAppData.submitNewAsset()
    → supabaseService.createAsset()
      → Supabase: INSERT en tabla assets
      → Supabase Storage: uploadToStorage(base64)
  → Actualizar inventario local
  → Toast success + Close sidebar
```

### Flujo 2: Cambiar Status de Compra (PARCIAL)
```
User hace click "Recepción Parcial"
  → Mostrar CommentModal
  → User ingresa comentario (qué faltó, etc)
  → Click "Confirmar"
    → Pedir PIN Modal
      → User ingresa PIN
      → Validar contra DB
      → Llamar updatePurchaseStatus()
        → Supabase: UPDATE purchase_orders SET estado='PARCIAL', comentario_recepcion=...
        → Supabase: INSERT audit_log
        → Toast success
        → Refrescar lista de compras
```

### Flujo 3: Recibir Repuesto (TOTAL)
```
User hace click "Confirmar Llegada" en Workshop
  → Pedir PIN
    → backend: receiveSpareParts(ficha, pin)
      → Actualizar purchase_order estado → RECIBIDO
      → Actualizar asset status → NO_DISPONIBLE
      → Crear entrada en maintenance_logs (recepción de repuesto)
      → Notificar al taller responsable
      → Toast success
```

---

## 📦 PLAN DE IMPLEMENTACIÓN (Secuencia)

### Fase 1: Setup Base (1-2 días)
- [x] AppContext + supabaseService ✅
- [x] useFormValidation hook ✅
- [x] SkeletonLoader components ✅
- [ ] **TODO:** Crear tablas Supabase (DDL script)
- [ ] **TODO:** Crear Edge Functions para lógica compleja

### Fase 2: Módulo Inventario (2-3 días)
- [x] InventoryView.jsx ✅ (mejorar con filtros)
- [ ] **TODO:** Refactor AssetDetailSidebar.jsx
- [ ] **TODO:** Crear AssetCard.jsx component
- [ ] **TODO:** Crear AssetTable.jsx component
- [ ] **TODO:** Hook useInventory()

### Fase 3: Módulo Taller (3-4 días)
- [x] WorkshopMonitor.jsx ✅ (base)
- [ ] **TODO:** Refactor completo con nuevas modales
- [ ] **TODO:** PartsRequestModal.jsx con item list
- [ ] **TODO:** ReceivePartsModal.jsx
- [ ] **TODO:** Hook useWorkshopWorkflow()
- [ ] **TODO:** Generar números requisición automáticos

### Fase 4: Módulo Compras (3-4 días)
- [x] PurchasingManagement.jsx ✅ (base)
- [ ] **TODO:** Refactor con nueva UI
- [ ] **TODO:** PurchaseCard.jsx con acciones
- [ ] **TODO:** CommentModal.jsx (nueva)
- [ ] **TODO:** Hook usePurchasingWorkflow()
- [ ] **TODO:** Lógica de transiciones de estado

### Fase 5: Módulo Seguridad (2-3 días)
- [x] SafetyCenter.jsx ✅ (base)
- [ ] **TODO:** SafetyReportForm.jsx
- [ ] **TODO:** SafetyCard.jsx
- [ ] **TODO:** SafetyDetailModal.jsx con comments
- [ ] **TODO:** Hook useSafetyModule()

### Fase 6: Reportes + Admin (2-3 días)
- [ ] **TODO:** PDF generation service
- [ ] **TODO:** AdminPanel.jsx
- [ ] **TODO:** Audit logging

### Fase 7: Testing + Deploy (2-3 días)
- [ ] Test en desarrollo
- [ ] Performance optimization
- [ ] Deploy a producción

---

## 🔐 MATRIZ DE SEGURIDAD & ROLES

### Roles Disponibles:
```javascript
const ROLES = {
  ADMIN: ['ver_todo', 'editar_todo', 'eliminar_todo', 'gestionar_usuarios'],
  COMPRAS: ['ver_compras', 'editar_compras', 'aprobar_recepciones'],
  TALLER: ['ver_taller', 'crear_requisiciones', 'reportar_recepcion'],
  MECANICO: ['ver_activos_asignados', 'crear_mto', 'reportar_seguridad'],
  USER: ['ver_inventario', 'crear_reportes_hse']
}
```

### Campos Editables por Rol:
```javascript
const EDITABLE_FIELDS = {
  ADMIN: ['*'], // Todo
  COMPRAS: ['Numero_de_Requisicion', 'Observacion_Mecanica'],
  TALLER: ['Taller_Responsable', 'Status', 'Proyeccion_Entrada', 'Proyeccion_Salida'],
  MECANICO: ['Observacion_Mecanica'],
  USER: [] // Solo lectura
}
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS (Propuesta)

```
src/
├── App.jsx
├── AppContext.jsx
├── main.jsx
├── supabaseClient.js
├── components/
│   ├── GenericFormModal.jsx
│   ├── SkeletonLoader.jsx
│   ├── StatusBadge.jsx
│   ├── Inventory/
│   │   ├── InventoryView.jsx
│   │   ├── AssetCard.jsx (nueva)
│   │   ├── AssetTable.jsx (nueva)
│   │   └── AssetDetailSidebar.jsx (refactor)
│   ├── Workshop/
│   │   ├── WorkshopMonitor.jsx (refactor)
│   │   ├── WorkshopCard.jsx (nueva)
│   │   ├── PartsRequestModal.jsx (nueva)
│   │   └── ReceivePartsModal.jsx (nueva)
│   ├── Purchasing/
│   │   ├── PurchasingManagement.jsx (refactor)
│   │   ├── PurchaseCard.jsx (nueva)
│   │   └── CommentModal.jsx (nueva)
│   ├── Safety/
│   │   ├── SafetyCenter.jsx (refactor)
│   │   ├── SafetyReportForm.jsx (nueva)
│   │   ├── SafetyCard.jsx (nueva)
│   │   ├── SafetyDetailModal.jsx (nueva)
│   │   └── FollowUpModal.jsx (nueva)
│   ├── Admin/
│   │   └── AdminPanel.jsx (nueva)
│   ├── Sidebar.jsx
│   └── PinModal.jsx
├── hooks/
│   ├── useFormValidation.js
│   ├── useInventory.js (nueva)
│   ├── useWorkshopWorkflow.js (nueva)
│   ├── usePurchasingWorkflow.js (nueva)
│   └── useSafetyModule.js (nueva)
├── services/
│   ├── supabaseService.js (expand)
│   └── pdfService.js (nueva)
├── utils/
│   ├── dateUtils.js (nueva)
│   ├── validationUtils.js (nueva)
│   └── statusHelpers.js (nueva)
└── styles/
    ├── App.css
    ├── index.css
    └── tailwind.config.js
```

---

## 🚀 PRÓXIMOS PASOS

### Inmediato (Hoy):
1. [ ] Crear SQL migrations para Supabase
2. [ ] Ejecutar DDL en Supabase console
3. [ ] Crear Edge Functions para:
   - `receiveSpareParts` - Lógica de transición PARCIAL/TOTAL
   - `finalizeWorkshopOrder` - Cierre de orden + actualización asset
   - `updatePurchaseStatus` - Cambio de estado con validación

### Este Sprint (Próximos 3 días):
4. [ ] Refactorizar InventoryView + crear sub-componentes
5. [ ] Implementar WorkshopMonitor versión 2
6. [ ] Refactorizar PurchasingManagement + CommentModal

### Próximo Sprint:
7. [ ] Módulo completo SafetyCenter
8. [ ] PDF generation service
9. [ ] AdminPanel

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Actual | Meta |
|---------|--------|------|
| Lineas de código (Cliente) | 1200+ | <100 per component |
| Code duplication | 40% | <10% |
| Props drilling | Masivo | 0% (uso de Context) |
| API calls (optimizadas) | No | Sí (useCallback, memoization) |
| Cobertura de tipos | TypeScript aún no | +70% |
| Performance (bundle) | TBD | <500KB gzip |

---

## ✅ CHECKLIST FINAL

- [x] Código legacy analizado
- [x] Schema Supabase diseñado
- [x] Flujos de datos mapeados
- [x] Componentes planificados
- [x] Matriz de seguridad definida
- [ ] DDL Supabase creado
- [ ] Edge Functions implementadas
- [ ] Componentes refactorizados
- [ ] Testing completo
- [ ] Deploy a producción

---

**Versión:** 1.0 | **Fecha:** 2025-12-10 | **Responsable:** Senior Dev  
