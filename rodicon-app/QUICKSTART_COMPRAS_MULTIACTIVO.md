# ⚡ Quick Start: Compras Multi-Activo

## 🚀 Instalación Rápida (5 minutos)

### 1. Ejecutar Migración SQL
```sql
-- En Supabase SQL Editor
-- Copiar y pegar todo de: MIGRATION_MULTIASSET_PURCHASES.sql
```

### 2. Archivos Clave
```
✅ CREADOS:
   src/RequisitionMultiAssetModal.jsx
   MIGRATION_MULTIASSET_PURCHASES.sql
   GUIA_COMPRAS_MULTIACTIVO.md
   TECNICA_COMPRAS_MULTIACTIVO.md

✏️ MODIFICADOS:
   src/AppContext.jsx (función + export)
   src/App.jsx (import + modal)
```

### 3. Verificar Integración
```javascript
// En App.jsx - Debe existir:
import { RequisitionMultiAssetModal } from './RequisitionMultiAssetModal';

{activeModal === 'REQ_MULTI' && (
  <RequisitionMultiAssetModal
    onClose={() => setActiveModal(null)}
    onSubmit={(formData) => submitRequisitionMultiAsset(formData)}
  />
)}

// En AppContext - Debe existir:
const submitRequisitionMultiAsset = async (reqFormData) => { ... }

// En export value:
submitRequisitionMultiAsset,
```

---

## 💡 Características

| Feature | Tradicional | Multi-Activo |
|---------|-------------|-------------|
| 1 Activo | ✅ | ✅ |
| Múltiples Activos | ❌ | ✅ |
| Por Línea | ❌ | ✅ |
| Estado Línea | ❌ | ✅ |
| Cantidad Recibida | ❌ | ✅ |

---

## 🎯 Uso en Componentes

### Opción 1: Desde Sidebar/Menu
```javascript
// Agregar botón en Sidebar.jsx
<button onClick={() => {
  protectedAction(() => setActiveModal('REQ_MULTI'));
}}>
  📦 Solicitud Multi-Activo
</button>
```

### Opción 2: Desde PurchasingManagement
```javascript
// En PurchasingManagement.jsx
<button onClick={() => protectedAction(() => setActiveModal('REQ_MULTI'))}>
  Crear Compra Multi-Activo
</button>
```

---

## 📊 Estructura de Datos

### Crear Requisición
```javascript
const formData = {
  req: "001",                        // Identificador
  solicitadoPor: "Juan García",      // Usuario
  project: "Mantenimiento",          // Proyecto
  priority: "Media",                 // 🟢/🟡/🔴
  tipoCompra: "ACTIVO_ESPECIFICO",   // GENERAL o ACTIVO_ESPECIFICO
  items: [
    {
      code: "OLI-001",
      desc: "Aceite SAE 40",
      qty: 2,
      ficha: "FICHA-001",            // ← Activo por línea
      obsItem: "Marca Shell"
    }
  ]
};

// Enviar
await submitRequisitionMultiAsset(formData);
```

---

## ✅ Checklist de Implementación

- [ ] Migración SQL ejecutada sin errores
- [ ] Archivo `RequisitionMultiAssetModal.jsx` en lugar correcto
- [ ] `AppContext.jsx` actualizado con función y export
- [ ] `App.jsx` actualizado con import y modal
- [ ] Botón "Solicitud Multi-Activo" agregado al menú (opcional)
- [ ] Test: Crear requisición multi-activo
- [ ] Test: Verificar BD (purchase_orders, purchase_items)
- [ ] Test: Verificar que activos se marquen "ESPERA REPUESTO"

---

## 🐛 Errores Comunes

**Error**: "Cannot read property 'ficha_ref' of undefined"
- **Fix**: Asegúrate que la migración SQL se ejecutó completamente

**Error**: "submitRequisitionMultiAsset is not a function"
- **Fix**: Verifica que esté en el export `value` de AppContext

**Error**: "Modal no aparece"
- **Fix**: Verifica que el import y el bloque del modal existan en App.jsx

---

## 🔗 Documentación Completa

- 📖 [GUIA_COMPRAS_MULTIACTIVO.md](GUIA_COMPRAS_MULTIACTIVO.md)
- 🔧 [TECNICA_COMPRAS_MULTIACTIVO.md](TECNICA_COMPRAS_MULTIACTIVO.md)
- 💾 [MIGRATION_MULTIASSET_PURCHASES.sql](MIGRATION_MULTIASSET_PURCHASES.sql)

---

**¿Listo?** Ahora los usuarios pueden crear compras para múltiples activos en una sola orden 🎉
