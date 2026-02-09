# 🐛 Fix: Problema de Estados en Órdenes de Compra

## Problema Reportado
"Estoy marcando como Ordenado una orden y se queda en Pendiente"

## Causa Raíz
Había **dos problemas** en el código:

### 1. En `usePurchasingWorkflow.js` (Líneas 54-59)
```javascript
❌ INCORRECTO:
if (newStatus === 'PARCIAL') {
  finalStatus = 'PENDIENTE';      // ← AQUÍ ESTABA EL ERROR
  updateData.estado = 'PENDIENTE'; // Cambiaba PARCIAL a PENDIENTE
}
```

**Problema**: Cuando marcaba como PARCIAL, la lógica lo convertía a PENDIENTE, lo cual era incorrecto.

### 2. En `PurchasingManagement.jsx` (Líneas 101-116)
```javascript
❌ INCORRECTO:
setPurchaseOrders(prev =>
  prev.map(order =>
    order.id === orderId
      ? { ...order, estado: newStatus, ... }  // Solo actualiza estado local
      : order
  )
);
```

**Problema**: Solo actualizaba el estado local sin recargar desde la BD, causando inconsistencias.

---

## Soluciones Aplicadas

### ✅ Fix 1: `usePurchasingWorkflow.js`
```javascript
✅ CORRECTO:
if (newStatus === 'PARCIAL') {
  // Recepción PARCIAL: Se queda en PARCIAL (no vuelve a PENDIENTE)
  updateData.estado = 'PARCIAL';  // Mantiene el estado correcto
  updateData.comentario_recepcion = comment || 'Recepción parcial';
}
```

### ✅ Fix 2: `PurchasingManagement.jsx`
```javascript
✅ CORRECTO:
// Recargar TODAS las órdenes desde BD para sincronización completa
const updatedOrders = await fetchPurchaseOrders();
setPurchaseOrders(updatedOrders || []);
```

Ahora **siempre recarga desde la BD** en lugar de confiar en actualizaciones locales.

### ✅ Fix 3: `handleQuotationConfirm`
Mejorado para:
1. Usar la función centralizada `performStatusUpdate()`
2. Recargar datos desde BD después de actualizar
3. Sincronizar cotizaciones + estado + fecha estimada correctamente

---

## Estados Permitidos

```
PENDIENTE ──→ ORDENADO
    ↑           ↓
    └─ PARCIAL ──→ RECIBIDO
         ↑
         └─ Puede volver a ORDENADO
```

### Transiciones Válidas
| Desde | Hacia | Permitido |
|-------|-------|-----------|
| PENDIENTE | ORDENADO | ✅ |
| ORDENADO | PARCIAL | ✅ |
| ORDENADO | RECIBIDO | ✅ |
| PARCIAL | ORDENADO | ✅ |
| PARCIAL | RECIBIDO | ✅ |
| RECIBIDO | Cualquiera | ❌ |

---

## Prueba del Fix

### Test 1: Marcar como Ordenado
```
1. Crear una orden en estado PENDIENTE
2. Click "Marcar Ordenado"
3. Llenar cotizaciones
4. Click "Guardar"
5. ✅ Debe cambiar a ORDENADO (no quedarse en PENDIENTE)
```

### Test 2: Marcar como Parcial
```
1. Orden en estado ORDENADO
2. Click "Parcial"
3. Ingresar comentario
4. Click "Confirmar"
5. ✅ Debe cambiar a PARCIAL (no volver a PENDIENTE)
```

### Test 3: Marcar como Recibido
```
1. Orden en estado ORDENADO
2. Click "Recibida"
3. ✅ Debe cambiar a RECIBIDO
4. Asset debe cambiar a "EN REPARACION"
```

---

## Archivos Modificados

```
src/hooks/usePurchasingWorkflow.js
  └─ Líneas 54-59: Fix en lógica de PARCIAL

src/PurchasingManagement.jsx
  └─ Línea 107-116: Recargar desde BD después de actualizar
  └─ Línea 125-152: Mejorar handleQuotationConfirm
```

---

## Verificación

Después del fix, verifica que:

- ✅ Marcar como ORDENADO cambia a ORDENADO (no PENDIENTE)
- ✅ Marcar como PARCIAL cambia a PARCIAL (no PENDIENTE)
- ✅ Marcar como RECIBIDO cambia a RECIBIDO
- ✅ El asset se actualiza correctamente según el estado
- ✅ Los comentarios se guardan correctamente
- ✅ Las cotizaciones se guardan correctamente

---

## Desplegar

```bash
git pull origin main
npm install  # Si es necesario
npm run dev

# Luego prueba los 3 tests arriba
```

---

**Status**: ✅ Reparado  
**Fecha**: Febrero 3, 2026  
**Impacto**: Crítico (usuarios no podían cambiar estado de órdenes)
