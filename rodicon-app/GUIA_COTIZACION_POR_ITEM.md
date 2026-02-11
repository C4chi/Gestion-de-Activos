# 🎯 Sistema de Cotización POR ÍTEM - Guía Completa

## 📋 Descripción General

Nuevo sistema flexible donde **cada item se cotiza independientemente** con múltiples proveedores. Elimina el problema de tener que llenar cotizaciones vacías cuando un proveedor NO ofrece todos los items.

---

## 🔄 Flujo Completo

### 1️⃣ TALLER crea requisición
- Define estado operacional: DISPONIBLE_ESPERA o NO_DISPONIBLE_ESPERA
- Lista items necesarios
- Estado: **PENDIENTE**

### 2️⃣ COMPRAS cotiza ítem por ítem
```
Abre orden PENDIENTE
  ↓
Ve lista de items
  ↓
Por cada item hace clic "Gestionar Cotizaciones"
  ↓
Modal se abre mostrando ESE item específico
  ↓
Agrega 1+ proveedores con:
  - Nombre proveedor
  - # Cotización
  - Precio unitario
  - Moneda (DOP/USD)
  - Días entrega
  - Contacto/Teléfono
  - Disponible (checkbox)
  - Notas
  ↓
Guarda y repite con siguiente item
  ↓
Cuando TODOS los items tienen mínimo 1 cotización:
  → Botón "Enviar a Gerencia" se habilita
  → Estado cambia a: PENDIENTE_APROBACION
```

### 3️⃣ GERENTE_TALLER aprueba
- Ve comparación ítem por ítem
- Selecciona mejor proveedor para cada item
- Puede aprobar diferentes proveedores para diferentes items
- Estado: **APROBADO**

### 4️⃣ COMPRAS ordena
- Sistema agrupa items por proveedor
- Genera órdenes de compra separadas (si hay múltiples proveedores)
- Crea compromisos financieros
- Estado: **ORDENADO**

### 5️⃣ COMPRAS recibe
- Recepción parcial/total por item
- Registra costos solo de lo recibido
- Estado: **PARCIAL** o **RECIBIDO**

---

## 🎨 Interfaz del Usuario

### Vista Principal (Lista de Items)

```
╔══════════════════════════════════════════════════════════════════╗
║  📦 Cotizar Items Individualmente                                ║
║  Orden: REQ-2026-001 | 9 items | 15 cotizaciones                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ [1] Eje Motriz                         ✓ 3 cotizaciones   │ ║
║  │     Cantidad: 1                                            │ ║
║  │     Cotizaciones:                                          │ ║
║  │       ✓ AutoPartes XYZ | COT-001 | DOP $5,000            │ ║
║  │       ✓ Repuestos ABC  | RPA-01   | DOP $4,800           │ ║
║  │       ✓ Global Parts   | GP-2026   | USD $120            │ ║
║  │                          [Gestionar Cotizaciones] ────────┤ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ [2] Piñón Giratorio                    ⚠️ 1 cotización    │ ║
║  │     Cantidad: 1                                            │ ║
║  │     Cotizaciones:                                          │ ║
║  │       ✓ Repuestos ABC | RPA-02 | DOP $150                │ ║
║  │                          [Gestionar Cotizaciones] ────────┤ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ [3] Anillos                            🚨 Sin cotizar      │ ║
║  │     Cantidad: 2                                            │ ║
║  │                          [Gestionar Cotizaciones] ────────┤ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  ⚠️ 1 item(s) sin cotizar     [Cancelar]  [✅ Enviar Gerencia] ║
╚══════════════════════════════════════════════════════════════════╝
```

### Modal Individual por Item

```
╔══════════════════════════════════════════════════════╗
║  💲 Cotizaciones: Eje Motriz                        ║
║  Cantidad: 1 | Código: EM-001                       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  ┌─ Cotización #1 ──────────────────────── [🗑️] ───┐║
║  │ OBLIGATORIA                                     │║
║  │                                                 │║
║  │ Proveedor: [AutoPartes XYZ____________]        │║
║  │ # Cotización: [COT-2026-001___________]        │║
║  │ Contacto: [Juan Pérez_________________]        │║
║  │ Teléfono: [809-555-5555_______________]        │║
║  │ Precio Unitario: [5000.00_] Moneda: [DOP ▼]   │║
║  │ Días Entrega: [5__]  ☑️ Disponible en stock    │║
║  │ Notas: [Incluye IVA, garantía 6 meses_______] │║
║  │                                                 │║
║  │ Subtotal (1 unidad): DOP $5,000.00            │║
║  └─────────────────────────────────────────────────┘║
║                                                      ║
║  ┌─ Cotización #2 ──────────────────────── [🗑️] ───┐║
║  │ Proveedor: [Repuestos ABC_____________]        │║
║  │ Precio: [4800.00_] Moneda: [DOP ▼]            │║
║  │ ...                                            │║
║  └─────────────────────────────────────────────────┘║
║                                                      ║
║  [+ Agregar Otra Cotización (2 actuales)]          ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║  2 cotización(es)      [Cancelar]  [💾 Guardar]     ║
╚══════════════════════════════════════════════════════╝
```

---

## ✅ Ventajas del Sistema

### 1. **Flexibilidad Total**
- ✅ Proveedor A solo ofrece Eje Motriz → Solo cotiza eso
- ✅ Proveedor B solo ofrece Piñón → Solo cotiza eso
- ✅ Proveedor C ofrece TODO → Cotiza todo
- ❌ **Antes**: Tenías que llenar 3 cotizaciones vacías

### 2. **Comparación Directa**
```
Item: Eje Motriz
  Proveedor A: $5,000 DOP (5 días)
  Proveedor B: $4,800 DOP (7 días)  ← MEJOR PRECIO
  Proveedor C: $120 USD (3 días)    ← MÁS RÁPIDO
  
→ Gerencia elige: Proveedor B (mejor precio)
```

### 3. **Órdenes Automáticas por Proveedor**
Gerencia aprueba:
- Items 1, 3, 5 → Proveedor A
- Items 2, 4 → Proveedor B
- Items 6-9 → Proveedor C

Sistema genera 3 órdenes separadas automáticamente ✨

### 4. **Menos Clicks, Más Eficiente**
**Antes**: 
- Llenar 3 formularios completos
- Repetir items en cada uno
- Campos vacíos si proveedor no ofrece

**Ahora**:
- Click en item
- Agregar solo proveedores que lo ofrecen
- Guardar y siguiente

---

## 📊 Base de Datos

### Estructura Existente (Ya funciona)

```sql
purchase_quotations
├── id
├── purchase_order_id
├── proveedor
├── numero_cotizacion
├── dias_entrega
└── ...

purchase_quotation_items
├── id
├── quotation_id           ← FK a purchase_quotations
├── purchase_item_id       ← FK a purchase_items
├── precio_unitario
├── moneda
└── disponible
```

**La magia**: `quotation_id` + `purchase_item_id` permite que:
- UNA quotation tenga SOLO ALGUNOS items
- UN item tenga MÚLTIPLES quotations

---

## 🔒 Permisos y Roles

| Rol | Crear Req | Cotizar Items | Aprobar | Ordenar | Recibir |
|-----|-----------|---------------|---------|---------|---------|
| **TALLER** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **COMPRAS** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **GERENTE_TALLER** | ✅ | ❌ | ✅ (único) | ❌ | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Cómo Usar

### Para COMPRAS:

1. Abre orden en estado **PENDIENTE**
2. Sistema muestra lista de items
3. Por cada item:
   - Click "Gestionar Cotizaciones"
   - Agregar proveedores que ofrecen ESE item
   - Guardar
4. Cuando TODOS tengan mínimo 1 cotización:
   - Click "Enviar a Gerencia"
   - ¡Listo!

### Para GERENTE_TALLER:

1. Abre orden en **PENDIENTE_APROBACION**
2. Ve comparación ítem por ítem
3. Selecciona mejor opción para cada uno
4. Click "Aprobar"
5. Sistema genera órdenes por proveedor

---

## 📝 Validaciones

### Al Cotizar:
- ✅ Todos los items deben tener mínimo 1 cotización
- ✅ Cada cotización debe tener: Proveedor + # Cotización + Precio > 0
- ⚠️ Menos de 3 cotizaciones por item muestra advertencia (pero permite)

### Al Aprobar:
- ✅ Debe seleccionar UNA cotización por cada item
- ✅ Solo GERENTE_TALLER puede aprobar

### Al Ordenar:
- ✅ Sistema agrupa automáticamente por proveedor
- ✅ Crea compromisos financieros correctos

---

## 🔧 Archivos Creados

### Frontend:
1. **ItemQuotationsManager.jsx** (370 líneas)
   - Lista de items con botón "Gestionar"
   - Estado visual (sin cotizar, parcial, completo)
   - Validación antes de enviar

2. **ItemQuotationModal.jsx** (350 líneas)
   - Modal para UN item específico
   - Agregar/editar/eliminar cotizaciones
   - Cálculo de subtotales automático

3. **PurchasingManagement.jsx** (actualizado)
   - Usa nuevo sistema en lugar de MultipleQuotationsModal

### Base de Datos:
4. **CREATE_GERENTE_TALLER_USER.sql**
   - Script para crear usuario de pruebas
   - Asignar rol GERENTE_TALLER

---

## 🎯 Próximos Pasos

### 1. Crear Usuario GERENTE_TALLER
```sql
-- En Supabase SQL Editor:
INSERT INTO app_users (nombre, pin, rol, email, alertas)
VALUES ('Gerente Taller', '1234', 'GERENTE_TALLER', 'gerente.taller@empresa.com', true);
```

### 2. Ejecutar Migración Principal
```sql
-- Ejecutar: MIGRATION_PURCHASING_WORKFLOW_COMPLETE.sql
```

### 3. Probar Flujo Completo
1. Login como TALLER → Crear requisición
2. Login como COMPRAS → Cotizar items
3. Login como GERENTE_TALLER → Aprobar
4. Login como COMPRAS → Ordenar y recibir

---

## 💡 Ejemplo Real

**Requisición**: Reparación Motor Excavadora

Items:
- Eje Motriz (1 unidad)
- Piñón Giratorio (1 unidad)
- Anillos (2 unidades)
- Sello Espejo (1 unidad)
- Tuerca (1 unidad)
- Seguro (1 unidad)
- Buje (2 unidades)
- Arandelas (2 unidades)

**COMPRAS cotiza**:

*Proveedor AutoPartes XYZ* ofrece:
- Eje Motriz: $5,000 DOP
- Tuerca: $50 DOP
- Seguro: $80 DOP

*Proveedor Repuestos ABC* ofrece:
- Piñón: $150 DOP
- Anillos: $280 DOP
- Sello: $120 DOP
- Buje: $90 DOP

*Proveedor Global Parts* ofrece:
- Eje Motriz: $120 USD (más rápido)
- Arandelas: $15 DOP

**GERENTE_TALLER decide**:
- Eje Motriz → Global Parts ($120 USD) por rapidez
- Piñón, Anillos, Sello, Buje → Repuestos ABC (únicos)
- Tuerca, Seguro → AutoPartes XYZ (únicos)

**Sistema genera**:
- Orden #1 → Global Parts: $120 USD
- Orden #2 → Repuestos ABC: $1,820 DOP
- Orden #3 → AutoPartes XYZ: $130 DOP

✅ **¡3 órdenes diferentes, proceso automático!**

---

**Fecha**: 11 de Febrero, 2026  
**Versión**: 2.0 - Sistema de Cotización por Ítem
