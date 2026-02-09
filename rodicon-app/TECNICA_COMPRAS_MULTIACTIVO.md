# 🔧 Guía Técnica: Implementación de Compras Multi-Activo

## 📋 Resumen de Cambios

Se ha implementado un sistema mejorado de requisiciones que permite:
1. Crear órdenes de compra para múltiples activos en una sola requisición
2. Vincular cada línea de compra a un activo específico
3. Rastrear estado individual por línea de compra

---

## 1️⃣ Paso: Ejecutar Migración SQL

### Ubicación
`MIGRATION_MULTIASSET_PURCHASES.sql`

### Pasos
1. Abre Supabase SQL Editor
2. Copia todo el contenido de la migración
3. Ejecuta en tu proyecto Supabase

### Cambios en BD
```sql
-- purchase_orders: Agrega columna tipo_compra
ALTER TABLE purchase_orders ADD COLUMN tipo_compra VARCHAR(50) DEFAULT 'GENERAL';

-- purchase_items: Agrega 4 columnas
ALTER TABLE purchase_items ADD COLUMN ficha_ref VARCHAR(50);
ALTER TABLE purchase_items ADD COLUMN estado_linea VARCHAR(50) DEFAULT 'PENDIENTE';
ALTER TABLE purchase_items ADD COLUMN cantidad_recibida INTEGER DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN observaciones TEXT;

-- Crea 2 vistas:
CREATE VIEW purchase_multi_asset_summary ...
CREATE VIEW purchase_items_with_asset_details ...

-- Crea 1 función:
CREATE FUNCTION get_purchase_order_status(UUID) RETURNS TEXT ...
```

---

## 2️⃣ Paso: Archivos Creados/Modificados

### ✅ Archivos NUEVOS

#### `src/RequisitionMultiAssetModal.jsx`
```
Componente principal para crear compras multi-activo
- Selector de tipo (GENERAL / ACTIVO_ESPECIFICO)
- Agregar/editar/eliminar líneas dinámicamente
- Selector de activo por línea
- Resumen visual de activos involucrados
```

**Ubicación**: `c:\Users\masro\rodicon-app\src\RequisitionMultiAssetModal.jsx`

### 📝 Archivos MODIFICADOS

#### `src/AppContext.jsx`
**Cambios**:
- Función `submitRequisition`: Agregado `tipo_compra: 'ACTIVO_ESPECIFICO'`
- Nueva función: `submitRequisitionMultiAsset()`
- Export: Agregado `submitRequisitionMultiAsset` al context value

**Líneas de cambio**:
- ~318: `submitRequisition` ahora incluye `tipo_compra`
- ~372: Nueva función `submitRequisitionMultiAsset`
- ~809: Agregado a exports

#### `src/App.jsx`
**Cambios**:
- Import: `RequisitionMultiAssetModal`
- Modal: Nuevo bloque para `activeModal === 'REQ_MULTI'`

**Líneas de cambio**:
- ~41: Nueva importación
- ~463-470: Nuevo modal

---

## 3️⃣ Cómo Acceder a la Función

### Desde App.jsx
```javascript
// Para abrir el modal
setActiveModal('REQ_MULTI');

// Desde protectedAction
protectedAction(() => submitRequisitionMultiAsset(formData), ['ADMIN', 'COMPRAS'])
```

### Desde AppContext
```javascript
const { submitRequisitionMultiAsset } = useAppContext();

// Uso
const success = await submitRequisitionMultiAsset({
  req: 'REQ-2026-001',
  solicitadoPor: 'Juan García',
  project: 'Mantenimiento',
  priority: 'Media',
  tipoCompra: 'ACTIVO_ESPECIFICO',
  items: [
    { code: 'OLI-001', desc: 'Aceite', qty: 2, ficha: 'FICHA-001', obsItem: '' },
    { code: 'FIL-001', desc: 'Filtro', qty: 4, ficha: 'FICHA-002', obsItem: '' }
  ]
});
```

---

## 4️⃣ Flujo de Datos

### Creación de Requisición Multi-Activo

```
1. Usuario abre RequisitionMultiAssetModal
   ↓
2. Llena información general + tipo de compra
   ↓
3. Agrega líneas (cada una con su activo)
   ↓
4. Valida que:
      - Hay número de requisición
      - Hay solicitante
      - Hay al menos 1 línea
      - Si tipoCompra='ACTIVO_ESPECIFICO', todas tienen activo
   ↓
5. Llama submitRequisitionMultiAsset(formData)
   ↓
6. En AppContext:
      a) Crea orden en purchase_orders (ficha='MULTI')
      b) Inserta todas las líneas en purchase_items (con ficha_ref)
      c) Actualiza estado de los activos → 'ESPERA REPUESTO'
   ↓
7. Toast success + recarga datos
```

### Estructura de Datos Enviada

```javascript
{
  req: "001",                        // Número corto de requisición
  solicitadoPor: "Juan García",      // Usuario que solicita
  project: "Mantenimiento General",  // Proyecto
  priority: "Media",                 // Prioridad
  tipoCompra: "ACTIVO_ESPECIFICO",   // GENERAL o ACTIVO_ESPECIFICO
  items: [
    {
      code: "OLI-001",              // Código del producto
      desc: "Aceite SAE 40",        // Descripción
      qty: 2,                        // Cantidad
      ficha: "FICHA-001",           // ← NUEVO: Activo específico
      obsItem: "Marca Shell"         // ← NUEVO: Observaciones
    },
    // ... más items
  ]
}
```

---

## 5️⃣ Esquema de Base de Datos

### purchase_orders (Modificada)
```sql
id UUID PRIMARY KEY
ficha VARCHAR(50)                    -- 'MULTI' para multi-activo
numero_requisicion VARCHAR(50)       -- Unique
tipo_compra VARCHAR(50)              -- NUEVO: 'GENERAL' o 'ACTIVO_ESPECIFICO'
estado VARCHAR(50)                   -- 'PENDIENTE', 'ORDENADO', 'RECIBIDO'
solicitante VARCHAR(100)
proyecto VARCHAR(100)
prioridad VARCHAR(20)
fecha_solicitud TIMESTAMP
created_by BIGINT
```

### purchase_items (Modificada)
```sql
id UUID PRIMARY KEY
purchase_id UUID                     -- FK a purchase_orders
codigo VARCHAR(100)
descripcion TEXT
cantidad INTEGER
precio_unitario DECIMAL(10,2)
ficha_ref VARCHAR(50)                -- NUEVO: FK a assets.ficha
estado_linea VARCHAR(50)             -- NUEVO: 'PENDIENTE', 'PARCIAL', 'RECIBIDA'
cantidad_recibida INTEGER            -- NUEVO: Para recepciones parciales
observaciones TEXT                   -- NUEVO: Notas por línea
created_at TIMESTAMP
```

---

## 6️⃣ Vistas SQL Disponibles

### `purchase_multi_asset_summary`
Resumen consolidado de requisiciones:
```sql
SELECT 
  id,
  numero_requisicion,
  estado,
  solicitante,
  cantidad_activos,        -- Conteo de fichas únicas
  cantidad_lineas,         -- Total de líneas
  cantidad_total_items,    -- Total de unidades
  fichas_relacionadas      -- Array de fichas
FROM purchase_multi_asset_summary;
```

**Uso**: Reportes ejecutivos, filtrados por estado

### `purchase_items_with_asset_details`
Detalles de líneas con info de activos:
```sql
SELECT 
  pi.id,
  pi.descripcion,
  pi.cantidad,
  pi.ficha_ref,
  a.marca,
  a.modelo,
  po.numero_requisicion,
  po.estado,
  pi.estado_linea
FROM purchase_items_with_asset_details;
```

**Uso**: Listados detallados, seguimiento por activo

---

## 7️⃣ Validaciones

### En Cliente (RequisitionMultiAssetModal)

#### Validación de Formulario
```javascript
if (!reqForm.req) toast.error('Ingresa número de requisición');
if (!reqForm.solicitadoPor) toast.error('Ingresa quién solicita');
if (reqItems.length === 0) toast.error('Debe haber al menos una línea');
```

#### Validación de Línea
```javascript
if (!currentItem.desc || currentItem.qty <= 0) {
  toast.error('Completa descripción y cantidad');
  return;
}

if (reqForm.tipoCompra === 'ACTIVO_ESPECIFICO' && !currentItem.ficha) {
  toast.error('Selecciona un activo para esta línea');
  return;
}
```

#### Validación Final (Multi-Activo)
```javascript
const conFichaVacia = reqItems.some(item => !item.ficha);
if (conFichaVacia) {
  toast.error('Todas las líneas deben tener un activo asignado');
  return;
}
```

### En Servidor (AppContext)

```javascript
const submitRequisitionMultiAsset = async (reqFormData) => {
  // 1. Validar rol
  if (!requireRole(['ADMIN', 'COMPRAS'], ...)) return false;
  
  // 2. Validar datos
  if (!items || items.length === 0) {
    toast.error('Debe incluir al menos una línea');
    return false;
  }
  
  // 3. Crear orden y líneas en BD
  // 4. Actualizar estado de activos
  // 5. Retornar success/error
};
```

---

## 8️⃣ Recepción de Compras (Impacto)

### Cambios en `handleReception`
```javascript
// Anteriormente:
// - Marcaba todo como recibido

// Ahora:
// - Puede recibir por línea
// - Actualiza cantidad_recibida
// - Actualiza estado_linea individual
// - Si todas las líneas están recibidas → estado = 'RECIBIDA'
```

**Nota**: La lógica de recepción puede mejorarse para soportar recepciones por línea en futuras iteraciones.

---

## 9️⃣ Troubleshooting

### Error: "table "purchase_items" has no column named "ficha_ref""
**Causa**: Migración SQL no ejecutada
**Solución**: 
1. Ejecuta `MIGRATION_MULTIASSET_PURCHASES.sql`
2. Verifica que no haya errores en SQL

### Error: "submitRequisitionMultiAsset is not defined"
**Causa**: No se incluyó en AppContext export
**Solución**:
1. Verifica que está en el objeto `value` de AppContext
2. Reinicia el servidor

### Error: "Selecciona un activo para esta línea"
**Causa**: Tipo de compra es ACTIVO_ESPECIFICO pero falta activo
**Solución**:
1. Cambia a GENERAL si no necesitas vincular activos
2. O selecciona activo en el dropdown

### Modal no aparece
**Causa**: Modal no está renderizado en App.jsx
**Solución**:
1. Verifica import de RequisitionMultiAssetModal
2. Verifica bloque `{activeModal === 'REQ_MULTI' && ...}`

---

## 🔟 Testing

### Test Manual 1: Crear compra multi-activo
```
1. Login como ADMIN
2. Compras → "Solicitud Multi-Activo"
3. Llenar:
   - REQ-001
   - Solicitado Por: Test User
   - Proyecto: Testing
   - Tipo: ACTIVO_ESPECIFICO
4. Agregar línea:
   - Código: TEST-001
   - Descripción: Aceite Test
   - Cantidad: 2
   - Activo: FICHA-001
5. Crear Solicitud
6. Verificar en BD:
   - purchase_orders: ficha='MULTI', tipo_compra='ACTIVO_ESPECIFICO'
   - purchase_items: ficha_ref='FICHA-001'
   - assets: status='ESPERA REPUESTO'
```

### Test Manual 2: Compra general sin activos
```
1. Seguir pasos 1-3 del test anterior
2. Tipo: GENERAL
3. Agregar línea SIN seleccionar activo
4. Crear Solicitud (debe funcionar)
5. Verificar: ficha_ref = NULL (permitido)
```

### Test Manual 3: Validaciones
```
1. Intentar crear sin número → Error
2. Intentar crear sin solicitante → Error
3. Intentar crear sin líneas → Error
4. Tipo ACTIVO_ESPECIFICO + Sin activo en línea → Error
5. Todo correcto → Success
```

---

## 🔗 Referencias

- [GUIA_COMPRAS_MULTIACTIVO.md](GUIA_COMPRAS_MULTIACTIVO.md) - Guía de Usuario
- [MIGRATION_MULTIASSET_PURCHASES.sql](MIGRATION_MULTIASSET_PURCHASES.sql) - Script SQL
- [GUIA_FLUJOS_COMPRAS_MANTENIMIENTO.md](GUIA_FLUJOS_COMPRAS_MANTENIMIENTO.md) - Procesos
- [WORKFLOW_IMPLEMENTATION_GUIDE.md](WORKFLOW_IMPLEMENTATION_GUIDE.md) - Implementación

---

## 📞 Notas Finales

- ✅ Mantiene compatibilidad con requisiciones antiguas
- ✅ Ambos tipos (tradicional y multi) funcionan en paralelo
- ✅ Permisos: Solo ADMIN y COMPRAS pueden crear
- ✅ Validaciones en cliente y servidor
- ⚠️ Recepción de compras puede mejorarse para soportar por línea

**Versión**: 1.0  
**Fecha**: Febrero 2026  
**Desarrollador**: Sistema RODICON
