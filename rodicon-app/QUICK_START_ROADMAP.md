# ✅ QUICK-START ROADMAP: Próximos 30 Días

**Versión:** 1.0  
**Fecha:** 2025-12-10  
**Objetivo:** Migrar completamente de Google Apps Script a React + Supabase

---

## 📅 TIMELINE & TAREAS

### 🔴 SEMANA 1: Setup Base + Compras

#### Día 1-2: Setup Supabase
- [ ] **SQL:** Ejecutar `supabase-migrations.sql` en Supabase SQL Editor
- [ ] **Verificación:** 
  ```sql
  -- Verificar tablas creadas
  SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
  
  -- Verificar RLS habilitado
  SELECT * FROM information_schema.role_table_grants 
  WHERE table_schema='public' AND privilege_type='SELECT';
  ```
- [ ] **Datos iniciales:** Verificar que user Admin existe y está configurado
- [ ] **Testing:** Conexión desde AppContext (ya existe)

#### Día 2-3: Módulo Compras (Crítico)
**Por qué primero:** Es el workflow más complejo con 4 estados y reglas de transición

- [ ] **Crear hook:** `src/hooks/usePurchasingWorkflow.js`
  - [ ] Implementar `updatePurchaseStatus(id, newStatus, comment, pin)`
  - [ ] Validar transiciones de estado
  - [ ] Manejar actualizaciones en cascada (assets, audit_log)

- [ ] **Crear componente:** `src/components/Purchasing/CommentModal.jsx`
  - [ ] Modal para comentarios en recepción parcial
  - [ ] Validación de campos

- [ ] **Refactorizar:** `src/PurchasingManagement.jsx`
  - [ ] Integrar hook usePurchasingWorkflow
  - [ ] Actualizar renderPurchasingList con nuevos estilos
  - [ ] Conectar acciones (changePurchaseStatus)
  - [ ] PIN validation desde AppContext

- [ ] **Testing local:**
  ```
  Test 1: PENDIENTE → ORDENADO
  Test 2: ORDENADO → PARCIAL + comentario
  Test 3: PARCIAL → RECIBIDO
  Test 4: ORDENADO → RECIBIDO (directo)
  ```

- [ ] **Commit:** `git commit -m "feat: migrar módulo compras completo"`

---

### 🟠 SEMANA 2: Taller + Mantenimiento

#### Día 4-6: Módulo Taller
**Dependencias:** ComprasWorkflow (para entender flujos de requisiciones)

- [ ] **Crear hook:** `src/hooks/useWorkshopWorkflow.js`
  - [ ] `requestSpareParts(formData, ficha, pin)`
  - [ ] `receiveSpareParts(ficha, mode, pin)`
  - [ ] `closeWorkshopOrder(data, pin)`
  - [ ] Auto-generar números requisición

- [ ] **Crear componentes:**
  - [ ] `src/components/Workshop/WorkshopCard.jsx` - Display vehículo
  - [ ] `src/components/Workshop/PartsRequestModal.jsx` - Solicitar repuesto
  - [ ] `src/components/Workshop/ReceivePartsModal.jsx` - Recibir repuesto
  - [ ] Actualizar `src/CloseOrderModal.jsx` - Cerrar orden (ya existe)

- [ ] **Refactorizar:** `src/WorkshopMonitor.jsx`
  - [ ] Integrar hook useWorkshopWorkflow
  - [ ] Usar nuevos componentes
  - [ ] Actualizar lógica de estados

- [ ] **Testing local:**
  ```
  Test 1: Solicitar repuesto (crear items, generar requisición)
  Test 2: Recibir TOTAL (asset → NO_DISPONIBLE)
  Test 3: Recibir PARCIAL (asset sigue en ESPERA REPUESTO)
  Test 4: Cerrar orden (asset → DISPONIBLE, crear MTO log)
  ```

#### Día 6-7: Validación Cruzada
- [ ] Verificar integración Compras ↔ Taller
- [ ] Testear flujo completo: Request → Receive → Close
- [ ] Optimizar performance queries

---

### 🟡 SEMANA 3: Seguridad + Reportes

#### Día 8-10: Módulo Seguridad
- [ ] **Refactorizar:** `src/SafetyCenter.jsx`
  - [ ] Crear componentes: SafetyForm, SafetyCard, SafetyDetailModal
  - [ ] Hook: `useSafetyModule.js`
  - [ ] Actualizar logSafetyReport
  - [ ] Integrar comments/follow-ups

- [ ] **Crear:** `src/FollowUpModal.jsx`
  - [ ] Modal para agregar comentarios
  - [ ] Formato: [Usuario|Fecha]: Comentario

#### Día 10-12: Inventario + Admin
- [ ] **Refactorizar:** `src/InventoryView.jsx`
  - [ ] Componentes: AssetCard, AssetTable
  - [ ] Hook: `useInventory.js`
  - [ ] Optimizar filtros y búsqueda

- [ ] **Crear:** `src/AdminPanel.jsx` (nueva)
  - [ ] Tab 1: Gestión de activos (visibilidad)
  - [ ] Tab 2: Gestión de usuarios (CRUD)
  - [ ] Roles y permisos

#### Día 12-13: Reportes PDF
- [ ] **Crear:** `src/services/pdfService.js`
  - [ ] `generateRequisitionPdf(purchaseOrder)`
  - [ ] `generateMaintenancePdf(ficha, logs)`
  - [ ] `generateSafetyPdf(report)`
  - [ ] Usar jsPDF + jspdf-autotable

---

### 🟢 SEMANA 4: Polish + Testing

#### Día 14-18: Testing Integral
- [ ] Test E2E de cada módulo
- [ ] Test de integraciones cruzadas
- [ ] Performance profiling
- [ ] Mobile responsiveness check

#### Día 19-21: Optimización
- [ ] Code cleanup
- [ ] TypeScript (opcional pero recomendado)
- [ ] Documentación de componentes
- [ ] Error handling robusto

#### Día 22-30: Deployment + Training
- [ ] Preparar build de producción
- [ ] Testing en staging
- [ ] Training de usuarios
- [ ] Backup de datos legacy
- [ ] Migración de datos históricos (si aplica)
- [ ] Go-live

---

## 📦 ARCHIVOS A CREAR/MODIFICAR

### Nuevos Hooks (`src/hooks/`)
```
✓ useFormValidation.js (ya existe)
→ useInventory.js
→ useWorkshopWorkflow.js
→ usePurchasingWorkflow.js
→ useSafetyModule.js
```

### Nuevos Componentes (`src/components/`)
```
✓ GenericFormModal.jsx (ya existe)
✓ SkeletonLoader.jsx (ya existe)

Inventory/
→ AssetCard.jsx
→ AssetTable.jsx

Workshop/
→ WorkshopCard.jsx
→ PartsRequestModal.jsx
→ ReceivePartsModal.jsx

Purchasing/
→ PurchaseCard.jsx
→ CommentModal.jsx

Safety/
→ SafetyReportForm.jsx
→ SafetyCard.jsx
→ SafetyDetailModal.jsx
→ FollowUpModal.jsx

Admin/
→ AdminPanel.jsx
```

### Componentes a Refactorizar
```
✓ AssetDetailSidebar.jsx
✓ WorkshopMonitor.jsx
✓ PurchasingManagement.jsx
✓ SafetyCenter.jsx
✓ InventoryView.jsx
✓ App.jsx (ya refactorizado)
```

### Servicios (`src/services/`)
```
✓ supabaseService.js (expandir con 10+ nuevos métodos)
→ pdfService.js (nueva)
```

### Utilidades (`src/utils/`)
```
→ dateUtils.js
→ validationUtils.js
→ statusHelpers.js
→ roleHelpers.js
```

---

## 🔐 ESTRATEGIA DE PIN & SEGURIDAD

### Flujo PIN en Nuevo Sistema
```
User hace acción sensitiva (crear requisición, recibir, cerrar)
  ↓
AppContext.handlePinSubmit(pin, onSuccess, onError)
  ↓
Backend valida PIN contra app_users.pin
  ↓
Si válido:
  - Obtener rol del usuario
  - Validar permisos para la acción
  - Ejecutar operación
  - Crear audit_log
  - Llamar onSuccess()
  ↓
Si inválido:
  - Mostrar error
  - Llamar onError()
```

### Roles y Permisos
```javascript
const PERMISSIONS = {
  'ADMIN': [
    'view_all_assets',
    'edit_all_assets',
    'delete_assets',
    'manage_users',
    'view_audit_log',
    'create_purchases',
    'receive_purchases',
    'create_workshop_orders',
  ],
  'COMPRAS': [
    'view_purchases',
    'update_purchase_status',
    'create_purchases',
  ],
  'TALLER': [
    'view_assets_in_workshop',
    'create_maintenance_logs',
    'create_workshop_orders',
    'request_spare_parts',
  ],
  'MECANICO': [
    'view_assigned_assets',
    'create_maintenance_logs',
    'create_safety_reports',
  ],
};
```

---

## 🚨 PUNTOS CRÍTICOS & RIESGOS

### 1. ⚠️ Transiciones de Estado (Compras)
**Riesgo:** Transiciones inválidas pueden corromper datos  
**Solución:** Validar en DB con CHECK constraints
```sql
ALTER TABLE purchase_orders ADD CONSTRAINT valid_estado_transition
CHECK (
  (estado = 'PENDIENTE') OR
  (estado = 'ORDENADO') OR
  (estado = 'PARCIAL') OR
  (estado = 'RECIBIDO')
);
```

### 2. ⚠️ Actualización en Cascada (Assets)
**Riesgo:** Un cambio en purchase_orders debe reflejarse en assets  
**Solución:** Usar triggers o llamar explícitamente desde front
```javascript
// Siempre que cambies purchase_orders, actualiza assets también
await updatePurchaseStatus(); // Esto internamente actualiza assets
```

### 3. ⚠️ Números Requisición Únicos
**Riesgo:** Duplicados podrían causar problemas  
**Solución:** UNIQUE constraint en DB + función generadora
```sql
ALTER TABLE purchase_orders ADD CONSTRAINT unique_numero_requisicion 
UNIQUE (numero_requisicion);
```

### 4. ⚠️ Archivos Grandes (Fotos)
**Riesgo:** BASE64 puede saturar conexión  
**Solución:** Usar Supabase Storage directamente
```javascript
// En lugar de:
const base64 = fileReader.readAsDataURL(file); // MAL para fotos grandes

// Usar:
const { data, error } = await supabase
  .storage
  .from('assets-photos')
  .upload(`${ficha}/${file.name}`, file);
```

### 5. ⚠️ Datos Históricos
**Riesgo:** Si migras datos de Google Sheets, pueden perder contexto  
**Solución:** Guardar copia de Sheets antes de migrar
```
1. Descargar Google Sheets como CSV
2. Guardar en carpeta `/data-backup/`
3. Crear script de importación (opcional, depende del volumen)
4. Verificar integridad de datos
```

---

## 📊 MÉTRICAS DE ÉXITO

| Criterio | Valor Actual | Meta |
|----------|-------------|------|
| Líneas código por componente | 300+ | <150 |
| Props drilling | Alto | 0% (Context API) |
| API calls no optimizadas | Muchas | 0 (memoization) |
| TypeScript coverage | 0% | 70%+ |
| Test coverage | 0% | 60%+ |
| Bundle size gzip | ? | <600KB |
| Lighthouse score | ? | 85+ |
| Page load time | ? | <3s |

---

## 🔗 REFERENCIAS RÁPIDAS

### Documentos Creados
1. `PLAN_MIGRACION_COMPLETO.md` - Arquitectura completa
2. `supabase-migrations.sql` - DDL + RLS + Triggers
3. `WORKFLOW_IMPLEMENTATION_GUIDE.md` - Guía detallada de implementación

### Stack Tech
- Frontend: React 19.2.0 + Vite 7.2.5
- Styling: Tailwind CSS 3.4.1
- State: Context API + Custom Hooks
- DB: Supabase PostgreSQL
- PDF: jsPDF 3.0.4 + jspdf-autotable
- Charts: Chart.js 4.5.1
- UI: react-hot-toast 2.6.0
- Icons: lucide-react 0.556.0

### Comandos Útiles
```bash
# Verificar estado de git
git status

# Actualizar AppContext con nuevos métodos
# (archivo: src/AppContext.jsx)

# Ejecutar tests
npm test

# Build producción
npm run build

# Deploy a Vercel
vercel deploy --prod
```

---

## 📞 SOPORTE & DEBUGGING

### Si algo falla...

**Error: "Transición inválida PENDIENTE → RECIBIDO"**
```
Verificar: purchase_orders estado actual
Solución: Pasar por ORDENADO primero
```

**Error: "Asset no actualizado después de crear requisición"**
```
Verificar: useWorkshopWorkflow.requestSpareParts() está haciendo UPDATE assets
Solución: Agregar console.log para ver flujo
```

**Error: "PIN inválido pero user existe"**
```
Verificar: app_users.pin está bien guardado en DB
Solución: Checkear hash/encoding del PIN
```

**Performance lenta (muchos re-renders)**
```
Solución: Usar useMemo + useCallback en hooks
Solución: Revisar que no hay listeners sin cleanup
```

---

## ✅ CHECKLIST FINAL ANTES DE DEPLOY

- [ ] Todos los tests pasan
- [ ] SQL migrations ejecutadas sin errores
- [ ] RLS policies están activas
- [ ] Environment variables configuradas (.env.local)
- [ ] Supabase API keys configuradas
- [ ] Storage bucket creado para fotos
- [ ] Datos legacy migrados (si aplica)
- [ ] Training de usuarios completado
- [ ] Backup de Google Sheets realizado
- [ ] Rollback plan documentado

---

## 🎯 OBJETIVO FINAL

Transformar sistema legacy basado en Google Apps Script:
- ❌ 200 funciones GAS esparcidas
- ❌ HTML + Vanilla JS + Global state
- ❌ Google Drive para fotos
- ❌ Google Sheets como DB

**En:**
- ✅ Arquitectura modular React
- ✅ State management centralizado (Context + Hooks)
- ✅ Supabase PostgreSQL como DB
- ✅ Supabase Storage para archivos
- ✅ Row Level Security para datos
- ✅ 70%+ code reusability
- ✅ Mobile-responsive responsive
- ✅ 0 props drilling
- ✅ TypeScript type-safe (opcional)

---

**Versión:** 1.0 | **Actualizado:** 2025-12-10 | **Estado:** ✅ LISTO PARA IMPLEMENTAR

