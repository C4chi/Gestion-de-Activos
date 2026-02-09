# 🛒 Guía: Sistema de Compras Multi-Activo

## Descripción General

El sistema de compras ha sido mejorado para permitir **solicitudes de compra para múltiples activos en una sola orden**. Cada línea de compra puede estar vinculada a un activo diferente, facilitando la gestión de pedidos consolidados.

## 🎯 Características Principales

### 1. **Dos tipos de requisiciones**

#### ✅ Requisición Multi-Activo (NUEVA)
- Crear una sola orden para varios activos
- Cada línea se asigna a un activo específico
- Ideal para pedidos consolidados de mantenimiento

#### 📦 Requisición Tradicional (Existente)
- Una requisición vinculada a un solo activo
- Mantiene compatibilidad con el sistema anterior

### 2. **Selección de Activo por Línea**
```
Requisición Multi-Activo (REQ-2026-0001)
├── Línea 1: Aceite SAE 40 → FICHA-001 (Camión)
├── Línea 2: Filtro de Aire → FICHA-002 (Vehículo)
├── Línea 3: Batería 12V → FICHA-003 (Grúa)
└── Línea 4: Repuesto Motor → FICHA-001 (Camión) ← Mismo activo
```

### 3. **Estados por Línea**
Cada línea de compra tiene su propio estado:
- **PENDIENTE**: Orden creada, esperando
- **PARCIAL**: Recibida parte de la cantidad
- **RECIBIDA**: Recibida cantidad completa
- **CANCELADA**: Línea cancelada

---

## 📋 Estructura de Base de Datos

### Tabla: `purchase_orders`
```sql
-- Nuevas columnas:
- tipo_compra: VARCHAR(50)  -- 'GENERAL' o 'ACTIVO_ESPECIFICO'
- ficha: 'MULTI'             -- Para órdenes multi-activo
```

### Tabla: `purchase_items` (Actualizada)
```sql
-- Nuevas columnas:
- ficha_ref: VARCHAR(50)     -- Activo vinculado a esta línea
- estado_linea: VARCHAR(50)  -- Estado individual de la línea
- cantidad_recibida: INTEGER -- Cantidad recibida
- observaciones: TEXT        -- Notas por línea
```

### Vistas Disponibles
```sql
-- Resumen de compras multi-activo
SELECT * FROM purchase_multi_asset_summary;

-- Detalles con información de activos
SELECT * FROM purchase_items_with_asset_details;
```

---

## 🚀 Cómo Usar

### Crear Requisición Multi-Activo

#### Paso 1: Abrir Modal
En **Compras** → Botón "Solicitud Multi-Activo" (nuevo)

#### Paso 2: Llenar Información General
```
Nro. Requisición:    REQ-2026-0001
Solicitado Por:      Juan García
Proyecto:            Mantenimiento General
Prioridad:           Media (🟡)
Tipo de Compra:      🎯 Vinculada a Activos
```

#### Paso 3: Agregar Líneas de Compra
Para cada ítem necesario:

```
Código:              OLI-001
Descripción:         Aceite SAE 40 Premium (5L)
Cantidad:            2 unidades
Activo Relacionado:  FICHA-001 (Camión Toyota 2018)
Observaciones:       Marca Shell preferida
```

**Botón:** Agregar Línea ➕

#### Paso 4: Revisar Resumen
```
✅ Líneas Agregadas (4)
   1️⃣ (2x) Aceite SAE 40 → FICHA-001
   2️⃣ (4x) Filtro de Aire → FICHA-002
   3️⃣ (1x) Batería 12V → FICHA-003
   4️⃣ (1x) Repuesto Motor → FICHA-001

📌 Activos Involucrados:
   • FICHA-001 - Camión Toyota 2018
   • FICHA-002 - Vehículo Nissan 2020
   • FICHA-003 - Grúa CAT 2015
```

#### Paso 5: Crear Solicitud
**Botón:** ✅ Crear Solicitud

---

## 📊 Ejemplos de Uso

### Caso 1: Mantenimiento de Flota
**Escenario**: Revisión trimestral de 3 vehículos

```
Requisición: REQ-2026-001-TRIM
Tipo: Multi-Activo

Líneas:
├─ (3x) Aceite SAE 40 → FICHA-001 (Camión)
├─ (3x) Aceite SAE 40 → FICHA-002 (Vehículo)
├─ (3x) Aceite SAE 40 → FICHA-003 (Grúa)
├─ (1x) Filtro Aire → FICHA-001
├─ (1x) Filtro Aire → FICHA-002
└─ (1x) Filtro Aire → FICHA-003
```

**Beneficio**: Una sola orden, 3 activos, 6 líneas

### Caso 2: Compra General (Sin Activo)
**Escenario**: Compra de repuestos genéricos

```
Requisición: REQ-2026-002-STOCK
Tipo: General (Sin activos específicos)

Líneas:
├─ (10x) Tuerca M10 × 50
├─ (5x) Arandela Acero
└─ (2x) Lubricante WD-40
```

**Beneficio**: Sin vinculación obligatoria a activos

### Caso 3: Reparación Correctiva
**Escenario**: Reparación de varias fallas simultáneas

```
Requisición: REQ-2026-003-CORRECTIVO
Tipo: Multi-Activo (Prioridad: Alta)

Líneas:
├─ (2x) Cilindro Hidráulico → FICHA-001 (Sistema fallido)
├─ (1x) Bomba Hidráulica → FICHA-001 (Sistema fallido)
├─ (3x) Correa de Transmisión → FICHA-002 (Desgaste)
└─ (1x) Batería 12V → FICHA-003 (No carga)
```

**Beneficio**: Reparación coordinada, una sola orden

---

## 🔄 Cambios en Estructura de Código

### 1. AppContext.jsx
```javascript
// Nueva función
const submitRequisitionMultiAsset = async (reqFormData) => {
  // Maneja requisiciones con múltiples activos
  // Actualiza estado de todos los activos involucrados
}

// En el export value:
submitRequisitionMultiAsset
```

### 2. RequisitionMultiAssetModal.jsx (Nuevo)
```javascript
// Componente mejorado con:
// - Selector de tipo de compra (GENERAL / ACTIVO_ESPECIFICO)
// - Selección dinámica de activos por línea
// - Resumen de activos involucrados
// - Validaciones por tipo de compra
```

### 3. App.jsx
```javascript
// Nuevo modal
{activeModal === 'REQ_MULTI' && (
  <RequisitionMultiAssetModal
    onClose={() => setActiveModal(null)}
    onSubmit={(formData) => submitRequisitionMultiAsset(formData)}
  />
)}
```

---

## ✔️ Permisos Requeridos

| Rol | Puede Crear? | Puede Editar? |
|-----|--------------|---------------|
| ADMIN | ✅ Sí | ✅ Sí |
| COMPRAS | ✅ Sí | ✅ Sí |
| TALLER | ❌ No | ❌ No |
| MECANICO | ❌ No | ❌ No |
| USER | ❌ No | ❌ No |

---

## 🗄️ Validaciones

### Cuando creo una requisición multi-activo:

#### ✅ Validaciones de Envío
- [ ] Requisición tiene número único
- [ ] Está indicado quién solicita
- [ ] Hay al menos una línea
- [ ] Si tipo es "ACTIVO_ESPECIFICO", cada línea tiene activo

#### ⚠️ Validaciones por Línea
- [ ] Descripción no vacía
- [ ] Cantidad > 0
- [ ] Si es obligatorio, activo seleccionado

#### 🔄 Cambios Automáticos
- Estado del activo → "ESPERA REPUESTO"
- Número de requisición → Vinculado al activo
- Fecha de solicitud → Guardada automáticamente

---

## 📈 Monitoreo y Reportes

### Vista: `purchase_multi_asset_summary`
```sql
SELECT 
  numero_requisicion,
  cantidad_activos,      -- Cuántos activos diferentes
  cantidad_lineas,       -- Total de líneas
  cantidad_total_items,  -- Total de unidades
  estado_consolidado,    -- RECIBIDA_COMPLETA, PARCIAL, PENDIENTE
  fichas_relacionadas    -- Array de activos
FROM purchase_multi_asset_summary;
```

**Resultado de ejemplo:**
```
REQ-2026-001 | 3 activos | 6 líneas | 12 items | PENDIENTE | {FICHA-001, FICHA-002, FICHA-003}
```

### Vista: `purchase_items_with_asset_details`
```sql
SELECT 
  numero_requisicion,
  codigo,
  descripcion,
  cantidad,
  ficha_ref,
  activo_descripcion,    -- Marca + Modelo
  estado_linea
FROM purchase_items_with_asset_details;
```

---

## 🐛 Troubleshooting

### Problema: "No puedo seleccionar activo"
**Solución**: 
1. Verifica que hay activos en el sistema
2. Solo aparecen activos con `visible = 1`

### Problema: "Requisición creada pero no vinculada a activos"
**Solución**:
1. Usa tipo "ACTIVO_ESPECIFICO" en lugar de "GENERAL"
2. Asigna activo en cada línea

### Problema: "No veo el botón de Compras Multi"
**Solución**:
1. Verifica tu rol (debe ser ADMIN o COMPRAS)
2. Está en el módulo de **Compras**

---

## 📞 Contacto y Soporte

Para dudas o mejoras:
1. Revisa [GUIA_FLUJOS_COMPRAS_MANTENIMIENTO.md](GUIA_FLUJOS_COMPRAS_MANTENIMIENTO.md)
2. Consulta [WORKFLOW_IMPLEMENTATION_GUIDE.md](WORKFLOW_IMPLEMENTATION_GUIDE.md)
3. Verifica la migración SQL: [MIGRATION_MULTIASSET_PURCHASES.sql](MIGRATION_MULTIASSET_PURCHASES.sql)

---

**Versión**: 1.0  
**Fecha**: Febrero 2026  
**Estado**: ✅ Implementado
