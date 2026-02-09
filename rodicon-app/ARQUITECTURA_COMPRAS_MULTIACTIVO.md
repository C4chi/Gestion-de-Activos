# 📊 Visión General: Sistema de Compras Multi-Activo

## 🎨 Flujo Visual

### Creación de Requisición

```
┌─────────────────────────────────────────────────────────────┐
│               RequisitionMultiAssetModal                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 INFORMACIÓN GENERAL                                    │
│  ├─ Nro. Requisición: REQ-2026-001                        │
│  ├─ Solicitado Por: Juan García                           │
│  ├─ Proyecto: Mantenimiento General                       │
│  ├─ Prioridad: Media 🟡                                   │
│  └─ Tipo: 🎯 Vinculada a Activos                         │
│                                                             │
│  📦 AGREGAR LÍNEA (Nueva)                                 │
│  ├─ Código: OLI-001                                       │
│  ├─ Descripción: Aceite SAE 40 ★                         │
│  ├─ Cantidad: 2 ★                                         │
│  ├─ Activo: FICHA-001 (Camión) ★                         │
│  ├─ Observaciones: Marca Shell                            │
│  └─ [+ Agregar Línea]                                    │
│                                                             │
│  ✅ LÍNEAS AGREGADAS (3)                                  │
│  ├─ 1️⃣ (2x) Aceite SAE 40 → FICHA-001                   │
│  ├─ 2️⃣ (4x) Filtro Aire → FICHA-002                     │
│  └─ 3️⃣ (1x) Batería 12V → FICHA-003                     │
│                                                             │
│  📌 ACTIVOS INVOLUCRADOS (3)                              │
│  ├─ FICHA-001 | Camión Toyota 2018                       │
│  ├─ FICHA-002 | Vehículo Nissan 2020                     │
│  └─ FICHA-003 | Grúa CAT 2015                            │
│                                                             │
│  [✅ Crear Solicitud]  [✕ Cancelar]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos en Aplicación

```
                   Usuario (ADMIN/COMPRAS)
                           │
                           ▼
                   [Abre Modal Multi]
                           │
                           ▼
            ┌──────────────────────────────────┐
            │  RequisitionMultiAssetModal      │
            │  - Recopila datos                │
            │  - Valida en cliente             │
            │  - Renderiza líneas dinámicas    │
            └──────────────────────────────────┘
                           │
                           ▼ [Crear Solicitud]
            ┌──────────────────────────────────┐
            │  submitRequisitionMultiAsset()   │
            │  (AppContext)                    │
            │  - Valida datos completos        │
            │  - Crea compra en BD             │
            │  - Inserta líneas en BD          │
            │  - Actualiza activos             │
            │  - Recarga datos                 │
            └──────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────┐
            │   Supabase Database              │
            │                                  │
            │  purchase_orders (1 fila)       │
            │  ├─ id: UUID                    │
            │  ├─ ficha: 'MULTI'              │
            │  ├─ numero_requisicion: uid     │
            │  ├─ tipo_compra: 'ACTIVO_...'   │
            │  └─ estado: 'PENDIENTE'         │
            │                                  │
            │  purchase_items (N filas)       │
            │  ├─ id: UUID                    │
            │  ├─ purchase_id: (fk)           │
            │  ├─ descripcion: texto          │
            │  ├─ ficha_ref: 'FICHA-001'      │
            │  ├─ estado_linea: 'PENDIENTE'   │
            │  └─ cantidad: 2                 │
            │                                  │
            │  assets (3 filas)               │
            │  ├─ ficha: 'FICHA-001'          │
            │  ├─ status: 'ESPERA REPUESTO'   │
            │  └─ numero_requisicion: uid     │
            │                                  │
            └──────────────────────────────────┘
                           │
                           ▼
                   [Toast: ✅ Success]
                           │
                           ▼
                   [Datos Recargados]
```

---

## 📊 Esquema de Base de Datos

### Tabla: purchase_orders
```
┌─────────────────────────────────────────┐
│         purchase_orders                 │
├─────────────────────────────────────────┤
│ id (UUID)          [PK]                 │
│ numero_requisicion (VARCHAR) [UNIQUE]   │
│ ficha              (VARCHAR)            │
│  └─ 'MULTI' para requisiciones multi    │
│ tipo_compra        (VARCHAR) [NEW]      │
│  └─ 'GENERAL' o 'ACTIVO_ESPECIFICO'    │
│ estado             (VARCHAR)            │
│ solicitante        (VARCHAR)            │
│ proyecto           (VARCHAR)            │
│ prioridad          (VARCHAR)            │
│ fecha_solicitud    (TIMESTAMP)          │
│ created_by         (BIGINT) [FK]        │
└─────────────────────────────────────────┘
          ▲
          │ 1:N
          │
┌─────────────────────────────────────────┐
│       purchase_items                    │
├─────────────────────────────────────────┤
│ id (UUID)          [PK]                 │
│ purchase_id        (UUID) [FK]          │
│ codigo             (VARCHAR)            │
│ descripcion        (TEXT)               │
│ cantidad           (INTEGER)            │
│ cantidad_recibida  (INTEGER) [NEW]      │
│ ficha_ref          (VARCHAR) [NEW] [FK] │
│ estado_linea       (VARCHAR) [NEW]      │
│ observaciones      (TEXT) [NEW]         │
│ precio_unitario    (DECIMAL)            │
│ created_at         (TIMESTAMP)          │
└─────────────────────────────────────────┘
          ▲
          │ 1:N (para requisiciones multi)
          │
┌─────────────────────────────────────────┐
│         assets                          │
├─────────────────────────────────────────┤
│ id (UUID)          [PK]                 │
│ ficha              (VARCHAR) [UNIQUE]   │
│ marca              (VARCHAR)            │
│ modelo             (VARCHAR)            │
│ tipo               (VARCHAR)            │
│ status             (VARCHAR)            │
│ numero_requisicion (VARCHAR) [FK]       │
│ ...más campos...                        │
└─────────────────────────────────────────┘
```

---

## 🎯 Estados de Compra

### Estados de Orden (purchase_orders.estado)
```
PENDIENTE ──→ ORDENADO ──→ PARCIAL ──→ RECIBIDA
   │            │            │            ▲
   │            │            │            │
   └────────────┴────────────┴────────────┘
                 (Puede avanzar en cualquier dirección)
```

### Estados de Línea (purchase_items.estado_linea) [NEW]
```
PENDIENTE ──→ PARCIAL ──→ RECIBIDA
   │            │            ▲
   │            │            │
   └────────────┴────────────┘
   
CANCELADA (estado final alternativo)
```

### Consolidación de Estado
```
purchase_items estados              Orden consolidada
─────────────────────────────────────────────────────
Todas RECIBIDA                   → RECIBIDA_COMPLETA
Alguna PARCIAL u otra RECIBIDA   → RECIBIDA_PARCIAL
Todas PENDIENTE                  → PENDIENTE
```

---

## 🔑 Comparación: Antes vs Después

### ANTES (Requisición Tradicional)
```
Requisición: REQ-2026-001
├─ Activo: FICHA-001 (1:1) ← Vinculada a UN solo activo
├─ Línea 1: Aceite SAE 40 (2x)
├─ Línea 2: Filtro Aire (4x)
├─ Línea 3: Batería 12V (1x)
└─ Línea 4: Repuesto Motor (1x)

Problema: Si necesitaba repuestos para FICHA-002 y FICHA-003,
          debía crear 2 requisiciones más (3 en total)
```

### AHORA (Requisición Multi-Activo)
```
Requisición: REQ-2026-001
├─ Tipo: Multi-Activo
├─ Línea 1: Aceite SAE 40 (2x) → FICHA-001
├─ Línea 2: Filtro Aire (4x) → FICHA-002
├─ Línea 3: Batería 12V (1x) → FICHA-003
└─ Línea 4: Repuesto Motor (1x) → FICHA-001

Ventaja: 1 requisición, 3 activos, fácil de gestionar
```

---

## 📈 Vistas Disponibles

### Vista: purchase_multi_asset_summary
```sql
SELECT 
  numero_requisicion,    -- REQ-2026-001
  cantidad_activos,      -- 3 (FICHA-001, FICHA-002, FICHA-003)
  cantidad_lineas,       -- 4 (Líneas totales)
  cantidad_total_items,  -- 8 (Unidades totales: 2+4+1+1)
  estado_consolidado,    -- 'RECIBIDA_PARCIAL', 'PENDIENTE', etc.
  fichas_relacionadas    -- {FICHA-001, FICHA-002, FICHA-003}
FROM purchase_multi_asset_summary;
```

**Uso**: Dashboards, reportes ejecutivos

### Vista: purchase_items_with_asset_details
```sql
SELECT 
  numero_requisicion,
  descripcion,           -- Aceite SAE 40
  cantidad,              -- 2
  ficha_ref,             -- FICHA-001
  activo_descripcion,    -- Camión Toyota 2018
  estado_linea,          -- RECIBIDA
  cantidad_recibida      -- 2
FROM purchase_items_with_asset_details;
```

**Uso**: Listados detallados, seguimiento por línea

---

## ✅ Matriz de Permisos

| Operación | ADMIN | COMPRAS | TALLER | MECANICO | USER |
|-----------|-------|---------|--------|----------|------|
| Ver compras | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear requisición | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear compra multi | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar estado | ✅ | ✅ | ❌ | ❌ | ❌ |
| Recibir compra | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 🔗 Relaciones de Archivos

```
App.jsx (render modal)
    ↓
RequisitionMultiAssetModal (UI)
    ↓
AppContext.submitRequisitionMultiAsset()
    ↓
supabase.from('purchase_orders').insert()
supabase.from('purchase_items').insert()
supabase.from('assets').update()
```

---

## 📝 Changelog

### Versión 1.0 (Feb 2026)
- ✅ Requisiciones multi-activo
- ✅ Selector de activo por línea
- ✅ Estados individuales por línea
- ✅ Cantidad recibida por línea
- ✅ Vistas SQL consolidadas
- ✅ Compatibilidad con sistema anterior

---

## 🚀 Próximas Mejoras Potenciales

1. **Recepción por Línea**: Mejorar UI para recibir línea a línea
2. **Historial**: Auditoría de cambios en líneas
3. **Reportes**: Dashboard de compras multi-activo
4. **Notificaciones**: Alertas cuando se vinculan activos
5. **Integraciones**: Sincronización con SAP/ERP

---

**Documento versión**: 1.0  
**Fecha**: Febrero 2026  
**Estado**: ✅ En Producción
