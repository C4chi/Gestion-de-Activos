# 🚀 GUÍA COMPLETA: Sistema de Workflow de Compras

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Flujo Completo del Sistema](#flujo-completo)
3. [Instalación y Configuración](#instalación)
4. [Componentes Implementados](#componentes)
5. [Guía de Uso por Rol](#guía-por-rol)
6. [Estados del Sistema](#estados)
7. [Base de Datos](#base-de-datos)
8. [Integración](#integración)
9. [Troubleshooting](#troubleshooting)

---

## 📌 Resumen Ejecutivo

### ¿Qué Resuelve Este Sistema?

Este sistema implementa un **workflow completo y ordenado** para la gestión de compras de repuestos, desde la solicitud hasta la recepción, con los siguientes beneficios clave:

✅ **Control Financiero**: Solo se registra el gasto de lo que FÍSICAMENTE llega  
✅ **Transparencia**: 3+ cotizaciones obligatorias para cada compra  
✅ **Trazabilidad**: Historial completo de cada decisión tomada  
✅ **Priorización**: Activos detenidos tienen urgencia automática  
✅ **Flexibilidad**: Manejo inteligente de entregas parciales  

###Estados Críticos del Activo

Cuando se solicita un repuesto, el sistema pregunta:

- **DISPONIBLE - ESPERA REPUESTO**: Puede seguir operando → Prioridad MEDIA
- **NO DISPONIBLE - ESPERA REPUESTO**: Está detenido → Prioridad URGENTE 🚨

---

## 🔄 Flujo Completo del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│  1. TALLER: SOLICITA REPUESTO                              │
│     🔧 Desde el activo o modal de taller                    │
│     ⚠️  Sistema pregunta: ¿Activo disponible o detenido?   │
│     📝 Estado: PENDIENTE                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. COMPRAS: RECIBE Y COTIZA                                │
│     📋 Recibe requisición                                   │
│     💼 Solicita mínimo 3 cotizaciones                       │
│     📊 Ingresa cada cotización al sistema                   │
│     📝 Estado: EN_COTIZACION                                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  3. COMPRAS: ENVÍA A GERENCIA                               │
│     ✅ Confirma que tiene mínimo 3 cotizaciones             │
│     📤 Envía para aprobación gerencial                      │
│     📝 Estado: PENDIENTE_APROBACION                         │
│     🚨 Si urgente: Notificación inmediata                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. GERENCIA: COMPARA Y APRUEBA                             │
│     🔍 Ve tabla comparativa lado a lado                     │
│     💡 Recibe recomendación del sistema (IA)                │
│     ✅ Selecciona cotización ganadora                       │
│     💬 Agrega comentario de aprobación                      │
│     📝 Estado: APROBADO                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. COMPRAS: ORDENA                                         │
│     📞 Contacta proveedor aprobado                          │
│     📦 Emite orden de compra                                │
│     💰 Sistema registra COMPROMISO (no gasto aún)           │
│     📝 Estado: ORDENADO                                     │
│     📅 Tracking de fecha estimada de llegada                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  6A. RECEPCIÓN TOTAL ✅                                     │
│      📦 TODO llegó completo                                 │
│      💰 Se registra 100% del monto en asset_costs           │
│      🔧 Activo: ¿Vuelve a DISPONIBLE?                       │
│      📝 Estado: RECIBIDO                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  6B. RECEPCIÓN PARCIAL ⚠️                                   │
│      📋 Marcar item por item qué llegó                      │
│      💰 Solo se registra costo de lo recibido               │
│      📝 Estado: PARCIAL                                     │
│                                                              │
│      Para items NO recibidos, decidir:                      │
│      ┌──────────────────────────────────────┐             │
│      │ ⏱️  ESPERAR al mismo proveedor       │             │
│      │    Estado: PENDIENTE_ESPERA           │             │
│      │    Nueva fecha estimada                │             │
│      ├──────────────────────────────────────┤             │
│      │ 🔄 RE-COTIZAR con otros proveedores   │             │
│      │    Se crea nueva requisición           │             │
│      │    Estado: EN_COTIZACION (nuevo ciclo) │             │
│      ├──────────────────────────────────────┤             │
│      │ ❌ CANCELAR el item                    │             │
│      │    Motivo registrado                   │             │
│      │    Estado: CANCELADO                   │             │
│      └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  7. ANÁLISIS DE RENTABILIDAD                                │
│     📊 Costos registrados por activo                        │
│     💎 Solo dinero de material RECIBIDO                     │
│     📈 Análisis de activos más costosos                     │
│     🎯 Toma de decisiones informada                         │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Instalación y Configuración

### Paso 1: Ejecutar Migración de Base de Datos

Ve a **Supabase Dashboard** → **SQL Editor**

```sql
-- Ejecutar el archivo completo:
-- MIGRATION_PURCHASING_WORKFLOW_COMPLETE.sql

-- Esto creará:
-- ✅ Nuevos campos en purchase_orders
-- ✅ Tabla purchase_quotations (cotizaciones)
-- ✅ Tabla purchase_quotation_items (items por cotización)
-- ✅ Tabla purchase_commitments (compromisos financieros)
-- ✅ Vistas de análisis (quotations_comparison, critical_assets_dashboard)
-- ✅ Triggers automáticos (urgencias, compromisos)
-- ✅ Funciones (register_partial_reception, get_best_quotation)
```

### Paso 2: Verificar Instalación

```sql
-- Verificar tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'purchase_%';

-- Verificar vistas
SELECT * FROM critical_assets_dashboard LIMIT 1;

-- Verificar función
SELECT * FROM get_best_quotation('any-uuid-here', 'PRECIO');
```

### Paso 3: Agregar Componentes a tu App

Los componentes ya están creados en:
- `src/components/Purchasing/OperationalStatusModal.jsx`
- `src/components/Purchasing/MultipleQuotationsModal.jsx`
- `src/components/Purchasing/QuotationComparatorModal.jsx`
- `src/components/Purchasing/PartialReceptionModal.jsx`

---

## 🧩 Componentes Implementados

### 1. OperationalStatusModal

**Cuándo usarlo**: Al crear una requisición de repuesto

```jsx
import { OperationalStatusModal } from './components/Purchasing/OperationalStatusModal';

const [modalOpen, setModalOpen] = useState(false);

const handleConfirm = (statusData) => {
  // statusData contiene:
  // - estado_operacional: 'DISPONIBLE_ESPERA' | 'NO_DISPONIBLE_ESPERA'
  // - requiere_urgencia: boolean
  // - prioridad: string
  // - notas_operacionales: string
  // - fecha_detencion: string | null
  
  // Guardar en purchase_orders
};

<OperationalStatusModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onConfirm={handleConfirm}
  assetInfo={selectedAsset}
/>
```

**Características**:
- Pregunta si activo puede seguir operando
- Ajusta prioridad automáticamente
- Registra timestamp de detención
- UI intuitiva con códigos de color

---

### 2. MultipleQuotationsModal

**Cuándo usarlo**: Cuando Compras tiene las cotizaciones

```jsx
import { MultipleQuotationsModal } from './components/Purchasing/MultipleQuotationsModal';

<MultipleQuotationsModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  purchaseOrder={selectedOrder}
  onComplete={() => {
    // Recargar órdenes
    fetchOrders();
  }}
/>
```

**Características**:
- Mínimo 3 cotizaciones requeridas
- Formulario por cada proveedor
- Precios por item con múltiples monedas
- Cálculo automático de totales
- Guarda y envía a Gerencia automáticamente

---

### 3. QuotationComparatorModal

**Cuándo usarlo**: Para aprobación gerencial

```jsx
import { QuotationComparatorModal } from './components/Purchasing/QuotationComparatorModal';

<QuotationComparatorModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  purchaseOrder={orderPendingApproval}
  onApprove={() => {
    // Recargar dashboard
    fetchDashboard();
  }}
/>
```

**Características**:
- Vista lado a lado de todas las cotizaciones
- Recomendación IA (precio vs rapidez)
- Comparación item por item
- Selección visual de cotización ganadora
- Comentario gerencial registrado

---

### 4. PartialReceptionModal

**Cuándo usarlo**: Al recibir los repuestos (total o parcial)

```jsx
import { PartialReceptionModal } from './components/Purchasing/PartialReceptionModal';

<PartialReceptionModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  purchaseOrder={orderToReceive}
  onComplete={() => {
    // Recargar órdenes y activos
    fetchOrders();
    fetchAssets();
  }}
/>
```

**Características**:
- Marcar cantidad recibida por item
- Cálculo automático de montos recibidos vs pendientes
- Gestión de items faltantes (esperar/recotizar/cancelar)
- Pregunta si activo vuelve a DISPONIBLE
- Registro de notas y evidencias

---

## 👥 Guía de Uso por Rol

### 🔧 ROL: TALLER

**Pantalla**: Detalle de Activo o Dashboard de Taller

**Pasos**:
1. Click en "Solicitar Repuesto"
2. Llenar formulario de requisición (items, cantidades, códigos)
3. **Sistema muestra OperationalStatusModal**
4. Seleccionar:
   - ✅ DISPONIBLE - ESPERA REPUESTO (puede seguir trabajando)
   - ❌ NO DISPONIBLE - ESPERA REPUESTO (detenido)
5. Agregar notas adicionales (opcional)
6. Click "Confirmar y Continuar"
7. Requisición creada con estado `PENDIENTE`

**Resultado**:
- Requisición visible para Compras
- Si NO DISPONIBLE: Urgencia automática 🚨
- Activo marcado como esperando repuesto

---

### 💼 ROL: COMPRAS

**Pantalla**: Dashboard de Compras

#### Fase 1: Cotizar (EN_COTIZACION)

1. Ver requisiciones `PENDIENTE`
2. Priorizar las urgentes (activos detenidos) 🔴
3. Click en "Cotizar" en la orden
4. **Se abre MultipleQuotationsModal**
5. Ingresar MÍNIMO 3 cotizaciones:
   - Proveedor, contacto, teléfono
   - Número de cotización
   - Días de entrega
   - Precio por item + moneda
   - Condiciones de pago
6. Agregar más cotizaciones si es necesario (4, 5, 6...)
7. Click "Enviar a Gerencia para Aprobación"

**Resultado**:
- Estado cambia a `PENDIENTE_APROBACION`
- Notificación a Gerencia
- Si urgente: Email/SMS inmediato

#### Fase 2: Ordenar (ORDENADO)

1. Una vez Gerencia aprueba
2. Ver orden con estado `APROBADO`
3. Contactar proveedor ganador
4. Click "Marcar como Ordenado"
5. Sistema registra compromiso financiero
6. Estado cambia a `ORDENADO`

**Resultado**:
- Tracking de fecha estimada activado
- Monto comprometido (no gastado) registrado
- Alerta próxima a fecha de llegada

#### Fase 3: Recibir (RECIBIDO/PARCIAL)

1. Cuando llegan los repuestos
2. Click "Recibir Orden"
3. **Se abre PartialReceptionModal**
4. Marcar cantidad recibida por cada item
5. Sistema detecta automáticamente:
   - TODO llegó → Recepción TOTAL
   - Falta algo → Recepción PARCIAL
6. Si hay items faltantes:
   - ⏱️ Esperar al proveedor (nueva fecha)
   - 🔄 Re-cotizar con otros (crea nueva requisición)
   - ❌ Cancelar item (con motivo)
7. Si activo estaba NO DISPONIBLE:
   - Indicar si puede volver a DISPONIBLE
8. Agregar notas de recepción
9. Click "Confirmar Recepción"

**Resultado**:
- Solo se registra costo de lo RECIBIDO
- Items pendientes con acción definida
- Activo actualizado según corresponda
- Nueva requisición creada si se eligió re-cotizar

---

### 👔 ROL: GERENCIA

**Pantalla**: Dashboard Gerencial de Compras

**Pasos**:
1. Ver órdenes `PENDIENTE_APROBACION`
2. Priorizar urgentes (**activos detenidos** 🚨)
3. Click en "Revisar Cotizaciones"
4. **Se abre QuotationComparatorModal**
5. Ver tabla comparativa:
   - Todos los proveedores lado a lado
   - Días de entrega
   - Precios por item
   - Totales por moneda
6. Ver "Recomendación del Sistema" (IA):
   - Para urgentes: Proveedor más rápido
   - Para normales: Mejor precio
7. Seleccionar cotización ganadora (click en card)
8. Agregar comentario de aprobación (opcional)
9. Click "Aprobar Cotización Seleccionada"

**Resultado**:
- Cotización aprobada guardada
- Estado cambia a `APROBADO`
- Notificación a Compras para ordenar
- Precios de cotización ganadora aplicados a la orden

---

## 📊 Estados del Sistema

### Estados de Purchase Orders

| Estado | Descripción | Quién lo cambia | Siguiente estado |
|--------|-------------|----------------|------------------|
| PENDIENTE | Requisición creada | Taller | EN_COTIZACION |
| EN_COTIZACION | Compras está cotizando | Compras | PENDIENTE_APROBACION |
| PENDIENTE_APROBACION | Esperando aprobación | Sistema | APROBADO |
| APROBADO | Cotización aprobada | Gerencia | ORDENADO |
| ORDENADO | Orden emitida | Compras | PARCIAL o RECIBIDO |
| PARCIAL | Recepción parcial | Compras | RECIBIDO o RE-COTIZACION |
| RECIBIDO | Todo recibido | Compras | [FIN] |
| CANCELADO | Orden cancelada | Gerencia/Compras | [FIN] |

### Estados Operacionales

| Estado | Significado | Prioridad | Urgencia |
|--------|-------------|-----------|----------|
| DISPONIBLE_ESPERA | Puede operar mientras llega repuesto | Media/Normal | NO |
| NO_DISPONIBLE_ESPERA | **DETENIDO** - No puede operar | Alta/Urgente | SÍ 🚨 |

### Estados de Items (estado_linea)

| Estado | Significado |
|--------|-------------|
| PENDIENTE | No recibido aún |
| PARCIAL | Recibido parcialmente |
| RECIBIDA | Recibido completamente |
| CANCELADA | Item cancelado |

### Acciones Pendientes (accion_pendiente)

| Acción | Significado |
|--------|-------------|
| ESPERAR_PROVEEDOR | Esperar al mismo proveedor (nueva fecha) |
| RECOTIZAR | Crear nueva requisición con otros proveedores |
| CANCELADO | Item cancelado (con motivo) |

---

## 🗄️ Base de Datos

### Nuevas Tablas

#### purchase_quotations
```sql
- id UUID
- purchase_order_id UUID → purchase_orders
- proveedor VARCHAR
- contacto_proveedor, telefono_proveedor
- numero_cotizacion VARCHAR
- fecha_cotizacion DATE
- dias_entrega INTEGER
- condiciones_pago TEXT
- notas TEXT
- es_aprobada BOOLEAN
- created_at TIMESTAMP
```

#### purchase_quotation_items
```sql
- id UUID
- quotation_id UUID → purchase_quotations
- purchase_item_id UUID → purchase_items
- precio_unitario DECIMAL
- moneda VARCHAR (DOP, USD, EUR)
- disponible BOOLEAN
- tiempo_entrega_dias INTEGER
```

#### purchase_commitments
```sql
- id UUID
- purchase_order_id UUID
- monto_comprometido_dop DECIMAL
- monto_comprometido_usd DECIMAL
- monto_recibido_dop DECIMAL (actualizado en recepciones)
- monto_recibido_usd DECIMAL
- estado VARCHAR (ACTIVO, PARCIAL, CERRADO)
- fecha_compromiso TIMESTAMP
```

### Vistas SQL

#### quotations_comparison
Comparación lado a lado de cotizaciones para una orden

```sql
SELECT * FROM quotations_comparison 
WHERE purchase_order_id = 'uuid-here';
```

#### critical_assets_dashboard
Dashboard de activos críticos con priorización

```sql
SELECT * FROM critical_assets_dashboard 
WHERE estado_operacional = 'NO_DISPONIBLE_ESPERA'
ORDER BY dias_detenido DESC;
```

### Funciones

#### register_partial_reception()
Registra recepción parcial y actualiza costos

```sql
SELECT * FROM register_partial_reception(
  'order-uuid',
  '[{"item_id": "uuid1", "cantidad_recibida": 2}]'::jsonb
);
```

#### get_best_quotation()
Calcula mejor cotización según criterio

```sql
-- Por precio
SELECT * FROM get_best_quotation('order-uuid', 'PRECIO');

-- Por rapidez (para urgentes)
SELECT * FROM get_best_quotation('order-uuid', 'TIEMPO');

-- Balanceado
SELECT * FROM get_best_quotation('order-uuid', 'BALANCEADO');
```

---

## 🔗 Integración

### En PurchasingManagement.jsx

```jsx
import { OperationalStatusModal } from './components/Purchasing/OperationalStatusModal';
import { MultipleQuotationsModal } from './components/Purchasing/MultipleQuotationsModal';
import { QuotationComparatorModal } from './components/Purchasing/QuotationComparatorModal';
import { PartialReceptionModal } from './components/Purchasing/PartialReceptionModal';

const [showOperationalModal, setShowOperationalModal] = useState(false);
const [showCotizacionesModal, setShowCotizacionesModal] = useState(false);
const [showComparadorModal, setShowComparadorModal] = useState(false);
const [showRecepcionModal, setShowRecepcionModal] = useState(false);
const [selectedOrder, setSelectedOrder] = useState(null);

// Al crear requisición (después del formulario básico)
const handleCrearRequisicion = () => {
  setShowOperationalModal(true);
};

// Acciones según estado
const renderActions = (order) => {
  switch (order.estado) {
    case 'PENDIENTE':
      return (
        <button onClick={() => {
          setSelectedOrder(order);
          setShowCotizacionesModal(true);
        }}>
          💼 Cotizar
        </button>
      );
    
    case 'PENDIENTE_APROBACION':
      // Solo para gerencia
      return (
        <button onClick={() => {
          setSelectedOrder(order);
          setShowComparadorModal(true);
        }}>
          👔 Revisar y Aprobar
        </button>
      );
    
    case 'APROBADO':
      return (
        <button onClick={() => handleMarcarOrdenado(order.id)}>
          📦 Marcar como Ordenado
        </button>
      );
    
    case 'ORDENADO':
      return (
        <button onClick={() => {
          setSelectedOrder(order);
          setShowRecepcionModal(true);
        }}>
          ✅ Recibir Orden
        </button>
      );
    
    default:
      return null;
  }
};
```

### En AssetPanel.jsx (Ver Activo)

```jsx
import { OperationalStatusModal } from './components/Purchasing/OperationalStatusModal';

const handleSolicitarRepuesto = () => {
  // Primero mostrar formulario de items
  // Luego mostrar OperationalStatusModal
  setShowOperationalModal(true);
};
```

---

## 🆘 Troubleshooting

### Problema: Migración falla

**Solución**:
1. Verificar que las tablas base existen (purchase_orders, purchase_items)
2. Ejecutar en partes:
   - Primero: CREATE TABLE
   - Luego: CREATE VIEW
   - Finalmente: CREATE TRIGGER

### Problema: Modal no se abre

**Solución**:
1. Verificar importación correcta de componentes
2. Verificar estado `isOpen` está manejado correctamente
3. Revisar consola de errores (F12)

### Problema: Cotizaciones no se guardan

**Solución**:
1. Verificar permisos de RLS en Supabase
2. Confirmar que usuario tiene ID válido
3. Check que purchase_order_id es correcto

### Problema: Costos no se registran

**Solución**:
1. Verificar que migración de asset_costs fue exitosa
2. Confirmar que items tienen `precio_unitario > 0`
3. Verificar que items tienen `ficha_ref` o la orden tiene `ficha`

### Problema: Función register_partial_reception falla

**Solución**:
```sql
-- Verificar que existe
SELECT proname FROM pg_proc WHERE proname = 'register_partial_reception';

-- Re-crear si es necesario
DROP FUNCTION IF EXISTS register_partial_reception;
-- Luego ejecutar CREATE FUNCTION del migration file
```

---

## 🎯 Próximos Pasos

### Mejoras Sugeridas

1. **Notificaciones Push**
   - Email a Gerencia cuando hay aprobaciones pendientes
   - SMS para casos urgentes (activo detenido)
   - WhatsApp Business API para actualizaciones

2. **Dashboard Ejecutivo**
   - Tiempo promedio de aprobación
   - Proveedores más usados
   - Activos más costosos
   - Pérdidas por inactividad

3. **Alertas Inteligentes**
   - Orden próxima a vencer fecha estimada
   - Activo detenido > X días
   - Proveedor con entregas tardías repetidas

4. **Mobile App**
   - Recepción de repuestos con foto desde móvil
   - Escaneo de códigos de barra
   - Firma digital en recepción

5. **Integración Contabilidad**
   - Export de compromisos para presupuesto
   - Conciliación con cuentas por pagar
   - Reportes de gastos por centro de costo

---

## 📚 Referencias

- **Archivo de Migración**: `MIGRATION_PURCHASING_WORKFLOW_COMPLETE.sql`
- **Componentes**: `src/components/Purchasing/*.jsx`
- **Guía de Costos**: `GUIA_COSTOS_ACTIVOS.md`
- **Repositorio**: GitHub - Gestion-de-Activos

---

## ✅ Checklist de Implementación

- [ ] Ejecutar migración SQL en Supabase
- [ ] Verificar tablas y vistas creadas
- [ ] Importar componentes en app principal
- [ ] Integrar OperationalStatusModal en formulario de requisición
- [ ] Integrar MultipleQuotationsModal en dashboard de Compras
- [ ] Integrar QuotationComparatorModal en dashboard Gerencial
- [ ] Integrar PartialReceptionModal en flujo de recepción
- [ ] Configurar permisos por rol (RLS)
- [ ] Probar flujo completo end-to-end
- [ ] Capacitar a usuarios
- [ ] Monitorear primeras semanas

---

**🎉 ¡Sistema Listo para Producción!**

El workflow completo está implementado y documentado. Solo falta ejecutar la migración en Supabase e integrar los componentes en la interfaz existente.

¿Necesitas ayuda con algún paso específico?
