# 🚀 GUÍA DE INTEGRACIÓN DE MÓDULOS - RODICON

**Status:** Base de datos ✅ | Componentes React ✅ | Hooks Integrados ✅

---

## 📋 CHECKLIST DE INTEGRACIÓN

### ✅ FASE 1: DATABASE (COMPLETADO)
- [x] Ejecutar `supabase-migrations.sql` en Supabase
- [x] Verificar 7 tablas creadas en Supabase Dashboard
- [x] Verificar índices y triggers activos

### ⏳ FASE 2: HOOKS & CONTEXTO (EN PROGRESO)
- [x] Crear 3 hooks: `usePurchasingWorkflow`, `useWorkshopWorkflow`, `useSafetyWorkflow`
- [x] Crear hook: `useFormValidation` 
- [x] Integrar hooks en `AppContext.jsx`
- [ ] Verificar que no hay errores de compilación
- [ ] Testear cada función desde el contexto

### 📦 FASE 3: COMPONENTES (LISTA)
**Módulo Compras (Purchasing):**
- [x] `PurchaseCard.jsx` - Card individual de orden
- [x] `CommentModal.jsx` - Modal para comentarios
- [x] `PurchasingManagement.jsx` - Vista principal (refactorizada)

**Módulo Taller (Workshop):**
- [x] `WorkshopDashboard.jsx` - Dashboard de estados
- [x] `WorkOrderCard.jsx` - Card de orden de trabajo
- [x] `CreateWorkOrderModal.jsx` - Modal crear orden
- [x] `UpdateWorkStatusModal.jsx` - Modal cambiar estado

**Módulo Seguridad (Safety):**
- [x] `SafetyDashboard.jsx` - Dashboard HSE
- [x] `SafetyFormModal.jsx` - Modal reporte HSE

### 🧪 FASE 4: TESTING (SIGUIENTE)
- [ ] Probar módulo Compras end-to-end
- [ ] Probar módulo Taller end-to-end
- [ ] Probar módulo Seguridad end-to-end
- [ ] Verificar integración con App.jsx

---

## 🔧 ESTRUCTURA DE ARCHIVOS

```
src/
├── App.jsx ✅ (Principal - ya integrado)
├── AppContext.jsx ✅ (Contexto global - hooks integrados)
├── hooks/
│   ├── usePurchasingWorkflow.js ✅
│   ├── useWorkshopWorkflow.js ✅
│   ├── useSafetyWorkflow.js ✅
│   └── useFormValidation.js ✅
├── components/
│   ├── Purchasing/
│   │   ├── PurchaseCard.jsx ✅
│   │   ├── CommentModal.jsx ✅
│   │   └── (PurchasingManagement.jsx - refactorizado)
│   ├── Workshop/
│   │   ├── WorkshopDashboard.jsx ✅
│   │   ├── WorkOrderCard.jsx ✅
│   │   ├── CreateWorkOrderModal.jsx ✅
│   │   └── UpdateWorkStatusModal.jsx ✅
│   ├── Safety/
│   │   ├── SafetyDashboard.jsx ✅
│   │   └── SafetyFormModal.jsx ✅
│   └── ... (componentes existentes)
└── services/
    └── supabaseService.js (conexión)
```

---

## 📊 FLUJO DE DATOS

```
App.jsx (Main)
    ↓
AppContext.jsx (Estado Global)
    ├─→ usePurchasingWorkflow() → purchasingWorkflow.*
    ├─→ useWorkshopWorkflow() → workshopWorkflow.*
    ├─→ useSafetyWorkflow() → safetyWorkflow.*
    └─→ useFormValidation() → formValidation.*
    ↓
Supabase (PostgreSQL)
    ├─ assets
    ├─ purchase_orders
    ├─ purchase_items
    ├─ maintenance_logs
    ├─ safety_reports
    ├─ audit_log
    └─ app_users (extended)
```

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### 1. Verificar Compilación
```bash
npm run dev
# Debería compilar sin errores
```

### 2. Probar Contexto en Navegador
```javascript
// En la consola del navegador después de login:
console.log(useAppContext()) // Debería mostrar todos los métodos
```

### 3. Testear Módulo Compras
1. Login con PIN
2. Click en "COMPRAS" en Sidebar
3. Debería mostrarse `PurchasingManagement` con:
   - Lista de órdenes de compra
   - Buttons para cambiar estado
   - Modal de comentarios

### 4. Testear Módulo Taller
1. Click en "TALLER" en Sidebar
2. Debería mostrarse `WorkshopDashboard` con:
   - Dashboard de estados
   - Cards de órdenes de trabajo
   - Modales de actualización

### 5. Testear Módulo Seguridad
1. Click en "SEGURIDAD" en Sidebar
2. Debería mostrarse `SafetyCenter` con:
   - Dashboard HSE
   - Reportes pendientes
   - Modal de nuevo reporte

---

## 🔗 MÉTODOS DISPONIBLES EN CONTEXTO

### Purchasing Workflow
```javascript
const ctx = useAppContext();

// Crear orden de compra
await ctx.createPurchaseOrder(assetId, items, userId)

// Actualizar estado
await ctx.updatePurchaseStatus(orderId, newStatus, comment, pin)

// Obtener órdenes por asset
const orders = ctx.getPurchasesByAsset(assetId)

// Recepcionar parcial/completo
await ctx.receivePurchaseOrder(orderId, receptionData, pin)
```

### Workshop Workflow
```javascript
const ctx = useAppContext();

// Crear orden de trabajo
await ctx.createWorkOrder(assetId, description, userId)

// Actualizar estado
await ctx.updateWorkOrderStatus(orderId, newStatus, userId)

// Obtener órdenes por asset
const orders = ctx.getWorkOrdersByAsset(assetId)

// Registrar mantenimiento
await ctx.logMaintenance(assetId, maintenanceData, userId)
```

### Safety Workflow
```javascript
const ctx = useAppContext();

// Crear reporte HSE
await ctx.createSafetyReport(assetId, reportData, userId)

// Actualizar reporte
await ctx.updateSafetyReport(reportId, updates, userId)

// Obtener reportes por asset
const reports = ctx.getSafetyReportsByAsset(assetId)

// Cambiar estado a "CORREGIDO"
await ctx.resolveSafetyReport(reportId, userId)
```

### Form Validation
```javascript
const ctx = useAppContext();

// Validar email
const emailValid = ctx.validateEmail(email) // true/false

// Validar número
const numValid = ctx.validateNumber(value) // true/false

// Validar requeridos
const fieldsValid = ctx.validateRequired(object, fields) // true/false

// Sanitizar entrada
const clean = ctx.sanitizeInput(input)
```

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module 'hooks/usePurchasingWorkflow'"
- Verificar que los archivos existen en `src/hooks/`
- Revisar la ruta de imports en `AppContext.jsx`

### Error: "Context hooks not available"
- Verificar que `AppProvider` envuelve toda la app en `main.jsx`
- Confirmar que se usa `useAppContext()` dentro de componentes

### Métodos no encontrados en contexto
- Revisar que se hizo spread operator `...purchasingWorkflow` en valor del contexto
- Verificar que los hooks retornan objeto con métodos

### Database errors
- Confirmar que migraciones se ejecutaron sin errores
- Verificar en Supabase Dashboard que tablas existen
- Revisar que `supabaseClient.js` tiene URL y KEY correctos

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `README_MIGRACION.md` - Guía de migraciones SQL
- `TESTING_DEBUGGING_GUIA.md` - Testing de componentes
- `WORKFLOW_IMPLEMENTATION_GUIDE.md` - Detalles de workflows

---

## ✨ ESTADO ACTUAL

| Componente | Status | Tests |
|-----------|--------|-------|
| **Database Schema** | ✅ Online | ✅ Pass |
| **React Components** | ✅ Built | ⏳ Pending |
| **Hooks Integration** | ✅ Integrated | ⏳ Pending |
| **AppContext** | ✅ Updated | ⏳ Pending |
| **E2E Testing** | ❌ Pending | ❌ Pending |

---

**Fecha:** 10 de Diciembre, 2025  
**Versión:** 1.0  
**Próxima fase:** Testing end-to-end
