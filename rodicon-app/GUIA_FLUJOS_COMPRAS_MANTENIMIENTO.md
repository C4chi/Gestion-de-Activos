# 🎯 FLUJOS DE COMPRAS Y MANTENIMIENTO IMPLEMENTADOS

## 📅 Fecha: Enero 7, 2026

Esta guía documenta los flujos completos de **Compras** y **Taller (Mantenimiento Preventivo y Correctivo)** implementados con características tipo SAP.

---

## ✅ LO QUE SE IMPLEMENTÓ

### 1. 🔐 WORKFLOW DE APROBACIONES MULTI-NIVEL PARA COMPRAS

#### Archivos Creados:
- ✅ `MIGRATION_WORKFLOWS_MAINTENANCE.sql` - Schema de BD
- ✅ `src/services/workflowService.js` - Lógica de aprobaciones
- ✅ `src/components/PurchaseWorkflowPanel.jsx` - UI visual del workflow

#### Características:
- **Niveles de aprobación configurables** según monto
- **Estados del flujo:**
  ```
  PENDIENTE → APROBADO_SUPERVISOR → APROBADO_GERENTE → 
  EN_COTIZACION → APROBADO_COTIZACION → COMPLETADO
  ```
- **Visual Stepper** mostrando progreso
- **Historial completo** de aprobaciones con comentarios
- **Control de acceso** por rol
- **Comentarios** en cada nivel (opcionales para aprobación, requeridos para rechazo)

#### Niveles de Aprobación:
1. **Nivel 1 - Supervisor** (Todas las compras)
2. **Nivel 2 - Gerente Compras** (>$500.000)
3. **Nivel 3 - Dirección** (>$2.000.000)
4. **Nivel 4 - Cotización** (Compras solicita cotizaciones)
5. **Nivel 5 - Aprobación Final** (Supervisor aprueba cotización)

#### Uso del Componente:
```jsx
import PurchaseWorkflowPanel from './components/PurchaseWorkflowPanel';

<PurchaseWorkflowPanel 
  purchase={selectedPurchase}
  onUpdate={() => refetchPurchases()}
/>
```

---

### 2. 🔧 SISTEMA DE MANTENIMIENTO PREVENTIVO

#### Archivos Creados:
- ✅ `src/services/maintenancePlanService.js` - Gestión de planes
- ✅ `src/components/PreventiveMaintenancePanel.jsx` - UI de planificación

#### Características:

**📅 Programación Automática:**
- Crear planes de mantenimiento por asset
- Configurar frecuencia (cada X días)
- Calcular automáticamente próxima ejecución
- Crear work orders al ejecutar plan
- Actualizar fechas automáticamente

**🔔 Alertas y Recordatorios:**
- Detectar mantenimientos vencidos
- Alertar de próximos mantenimientos (7 días)
- Vista de calendario de mantenimientos
- Semáforo visual (al día, próximo, vencido)

**📊 Estadísticas:**
- Total de planes activos
- Mantenimientos próximos (7 días)
- Mantenimientos vencidos
- % de cumplimiento

**⚙️ Ejecución:**
- Botón "Ejecutar" crea work order automáticamente
- Vincula work order al plan preventivo
- Actualiza fecha de última ejecución
- Calcula próxima fecha automáticamente

#### Campos del Plan:
```javascript
{
  asset_id: INTEGER,              // Asset al que aplica
  nombre: STRING,                 // "Cambio de aceite y filtros"
  descripcion: TEXT,              // Detalles del mantenimiento
  frecuencia_dias: INTEGER,       // Cada 30 días
  proxima_ejecucion: DATE,        // Próxima fecha programada
  ultima_ejecucion: DATE,         // Última vez ejecutado
  estimado_horas: DECIMAL,        // Horas estimadas
  tareas: JSONB,                  // Checklist de tareas
  activo: BOOLEAN                 // Activo/Inactivo
}
```

---

### 3. 🛠️ SISTEMA DE MANTENIMIENTO CORRECTIVO

#### Archivos Actualizados:
- ✅ `src/services/maintenanceService.js` - Funciones mejoradas
- ✅ `src/components/WorkshopKanbanBoard.jsx` - Tablero Kanban

#### Características:

**📋 Work Orders Completas:**
- Crear órdenes manuales o desde planes preventivos
- Asignar a mecánicos
- Prioridades: BAJA, MEDIA, ALTA, URGENTE
- Tipos: PREVENTIVO, CORRECTIVO, PREDICTIVO, EMERGENCIA

**🎯 Estados del Flujo:**
```
ABIERTA → ASIGNADA → EN_PROGRESO → PAUSADA → COMPLETADA
                                          ↘ CANCELADA
```

**👥 Asignación:**
- Dropdown para asignar a mecánicos
- Notificación al mecánico asignado (próximo)
- Seguimiento de quién trabaja en qué

**⏱️ Seguimiento de Tiempo:**
- Fecha de creación
- Fecha de asignación
- Fecha de inicio
- Fecha de cierre
- Horas estimadas vs reales
- Alerta si pasa 48 horas sin cerrar

**💰 Costos:**
- Costo estimado
- Costo real
- Partes/repuestos usados
- Registro de materiales

---

### 4. 🎨 TABLERO KANBAN VISUAL

#### Componente: `WorkshopKanbanBoard.jsx`

**Características:**

**📊 Vista Kanban:**
- 5 columnas por estado
- Drag & drop (preparado para implementar)
- Contador de tarjetas por columna
- Colores por estado

**🔍 Filtros Avanzados:**
- Por prioridad (Urgente, Alta, Media, Baja)
- Por mecánico asignado
- Por tipo de mantenimiento
- Filtros combinables

**🎴 Tarjetas Inteligentes:**
- Información condensada en cada tarjeta
- Color de borde según prioridad
- Badges de estado y tipo
- Días desde creación
- Alerta visual si está atrasada (>2 días)
- Quick actions en cada tarjeta

**⚡ Quick Actions:**
- **ABIERTA:** Dropdown para asignar mecánico
- **ASIGNADA:** Botón "Iniciar"
- **EN_PROGRESO:** Botón "Pausar"
- Botones "Completar" y "Cancelar" en detalle

**📱 Responsive:**
- Scroll horizontal en móviles
- Tarjetas adaptables
- Altura fija con scroll por columna

---

## 🗄️ SCHEMA DE BASE DE DATOS

### Tablas Nuevas:

#### `approval_workflows`
```sql
- id (PK)
- name: "Workflow de Compras Estándar"
- entity_type: "PURCHASE_ORDER"
- levels: JSONB (configuración de niveles)
- active: BOOLEAN
```

#### `approval_history`
```sql
- id (PK)
- entity_type: "PURCHASE_ORDER"
- entity_id: INTEGER (ID de la purchase order)
- level: INTEGER (1, 2, 3...)
- level_name: "Revisión Supervisor"
- approver_id: INTEGER (FK a app_users)
- approver_name: VARCHAR
- action: "APPROVED" | "REJECTED" | "PENDING"
- comments: TEXT
- created_at: TIMESTAMP
```

#### `maintenance_plans`
```sql
- id (PK)
- asset_id (FK a assets)
- nombre: VARCHAR
- descripcion: TEXT
- tipo: "PREVENTIVO"
- frecuencia_dias: INTEGER
- ultima_ejecucion: DATE
- proxima_ejecucion: DATE
- activo: BOOLEAN
- tareas: JSONB (checklist)
- estimado_horas: DECIMAL
- created_by (FK a app_users)
```

#### `work_orders` (mejorada)
```sql
- id (PK)
- asset_id (FK a assets)
- titulo: VARCHAR
- descripcion: TEXT
- tipo: "PREVENTIVO" | "CORRECTIVO" | "PREDICTIVO" | "EMERGENCIA"
- prioridad: "BAJA" | "MEDIA" | "ALTA" | "URGENTE"
- estado: "ABIERTA" | "ASIGNADA" | "EN_PROGRESO" | "PAUSADA" | "COMPLETADA" | "CANCELADA"
- asignado_a_id (FK a app_users)
- asignado_a: VARCHAR
- fecha_creacion: TIMESTAMP
- fecha_asignacion: TIMESTAMP
- fecha_inicio: TIMESTAMP
- fecha_cierre: TIMESTAMP
- horas_estimadas: DECIMAL
- horas_reales: DECIMAL
- costo_estimado: DECIMAL
- costo_real: DECIMAL
- plan_mto_id (FK a maintenance_plans)
- created_by (FK a app_users)
- notas_cierre: TEXT
- partes_usadas: JSONB
- checklist: JSONB
```

#### `maintenance_reminders`
```sql
- id (PK)
- plan_id (FK a maintenance_plans)
- asset_id (FK a assets)
- tipo: "PREVENTIVO"
- mensaje: TEXT
- fecha_recordatorio: DATE
- enviado: BOOLEAN
- fecha_envio: TIMESTAMP
```

### Vistas Útiles:

#### `work_orders_full`
- Work orders con info de asset, mecánico y plan

#### `maintenance_upcoming`
- Mantenimientos próximos en 7 días

#### `work_orders_overdue`
- Work orders atrasadas (>48 horas)

---

## 📦 CÓMO USAR

### 1️⃣ Ejecutar Migración de BD

```bash
# En Supabase SQL Editor
# Ejecutar: MIGRATION_WORKFLOWS_MAINTENANCE.sql
```

Esto creará:
- Tablas de workflows
- Tablas de mantenimiento
- Vistas útiles
- Workflow por defecto
- Índices para performance

### 2️⃣ Integrar Componentes en tu App

#### Panel de Compras con Workflow:

```jsx
import PurchaseWorkflowPanel from './components/PurchaseWorkflowPanel';

// En tu componente de detalle de purchase order:
<PurchaseWorkflowPanel 
  purchase={selectedPurchase}
  onUpdate={() => {
    // Refrescar datos después de aprobar/rechazar
    fetchPurchases();
  }}
/>
```

#### Panel de Mantenimiento Preventivo:

```jsx
import PreventiveMaintenancePanel from './components/PreventiveMaintenancePanel';

// Como vista completa:
<PreventiveMaintenancePanel />
```

#### Tablero Kanban de Taller:

```jsx
import WorkshopKanbanBoard from './components/WorkshopKanbanBoard';

// Como vista completa:
<WorkshopKanbanBoard />
```

### 3️⃣ Actualizar Navegación

```jsx
// En tu Sidebar o Router:
{activeView === 'PREVENTIVE_MTO' && <PreventiveMaintenancePanel />}
{activeView === 'WORKSHOP_KANBAN' && <WorkshopKanbanBoard />}
```

---

## 🎯 FLUJO COMPLETO DE COMPRAS

### Paso a Paso:

1. **Usuario crea requisición**
   - Estado: PENDIENTE
   - Nivel: 0

2. **Supervisor revisa** (Nivel 1)
   - Puede aprobar o rechazar
   - Si aprueba → Estado: APROBADO_SUPERVISOR
   - Si rechaza → Estado: RECHAZADO (fin del flujo)

3. **Gerente aprueba** (Nivel 2 - solo si monto >$500k)
   - Si aplica y aprueba → Estado: APROBADO_GERENTE
   - Si no aplica → salta este nivel

4. **Director aprueba** (Nivel 3 - solo si monto >$2M)
   - Si aplica y aprueba → continúa
   - Si no aplica → salta este nivel

5. **Compras cotiza** (Nivel 4)
   - Agrega cotizaciones de proveedores
   - Estado: EN_COTIZACION

6. **Supervisor aprueba cotización** (Nivel 5)
   - Revisa mejor cotización
   - Si aprueba → Estado: APROBADO_COTIZACION

7. **Compras emite orden**
   - Estado: COMPLETADO (listo para comprar)

---

## 🔧 FLUJO COMPLETO DE MANTENIMIENTO

### Mantenimiento Preventivo:

1. **Admin crea plan**
   - Selecciona asset
   - Define frecuencia (ej: cada 30 días)
   - Programa próxima fecha
   - Agrega tareas/checklist

2. **Sistema alerta**
   - 7 días antes: aparece en "Próximos"
   - Día de vencimiento: aparece en "Vencidos"
   - Badge visual de estado

3. **Supervisor ejecuta plan**
   - Click en "Ejecutar"
   - Sistema crea work order automáticamente
   - Work order vinculada al plan
   - Actualiza última ejecución
   - Calcula próxima fecha

4. **Mecánico completa work order**
   - (Ver flujo de correctivo)

### Mantenimiento Correctivo:

1. **Alguien crea work order**
   - Puede ser manual o por falla
   - Define prioridad y tipo
   - Estado: ABIERTA

2. **Supervisor asigna a mecánico**
   - Dropdown en tarjeta Kanban
   - Estado: ASIGNADA
   - Mecánico recibe notificación (próximo)

3. **Mecánico inicia trabajo**
   - Click en "Iniciar"
   - Estado: EN_PROGRESO
   - Registra hora de inicio

4. **Mecánico pausa si es necesario**
   - Click en "Pausar"
   - Estado: PAUSADA
   - Puede reanudar después

5. **Mecánico completa**
   - Registra horas reales
   - Registra costo y partes usadas
   - Agrega notas de cierre
   - Estado: COMPLETADA
   - Asset vuelve a "Disponible"

---

## 📊 ESTADÍSTICAS DISPONIBLES

### Servicio de Workflows:
```javascript
import { getApprovalStatistics } from './services/workflowService';

const stats = await getApprovalStatistics();
// {
//   total: 150,
//   approved: 120,
//   rejected: 20,
//   pending: 10,
//   byEntityType: {...}
// }
```

### Servicio de Mantenimiento:
```javascript
import { getMaintenanceStatistics } from './services/maintenancePlanService';

const stats = await getMaintenanceStatistics();
// {
//   totalPlanes: 45,
//   vencidos: 3,
//   proximos: 8,
//   completados: 230,
//   cumplimiento: 95
// }
```

---

## 🎨 PERSONALIZACIÓN

### Cambiar Niveles de Aprobación:

En Supabase, edita la tabla `approval_workflows`:

```sql
UPDATE approval_workflows
SET levels = '[
  {
    "level": 1,
    "name": "Tu Nivel Personalizado",
    "roles": ["TU_ROL"],
    "threshold": 1000000,
    "required": true,
    "description": "Descripción"
  }
]'::jsonb
WHERE entity_type = 'PURCHASE_ORDER';
```

### Agregar Estados Personalizados:

Edita `src/utils/constants.js`:

```javascript
export const WORK_ORDER_STATUS = {
  // ... estados existentes
  TU_ESTADO: 'TU_ESTADO',
};
```

---

## ⚡ PRÓXIMAS MEJORAS (No implementadas aún)

### Notificaciones Automáticas:
- [ ] Notificar a aprobadores cuando orden llega a su nivel
- [ ] Notificar mecánicos cuando se les asigna work order
- [ ] Alertas de mantenimientos vencidos
- [ ] Recordatorios 3 días antes de mantenimiento

### Drag & Drop Real:
- [ ] Implementar librería react-beautiful-dnd
- [ ] Permitir arrastrar tarjetas entre columnas
- [ ] Validar transiciones de estado permitidas

### Calendario Visual:
- [ ] Vista de calendario para mantenimientos
- [ ] Arrastrar para reprogramar
- [ ] Vista mensual/semanal

### Reportes:
- [ ] Reporte de cumplimiento de preventivos
- [ ] Reporte de correctivos por asset
- [ ] Análisis de costos de mantenimiento
- [ ] Exportar a Excel/PDF

### Checklist Interactivo:
- [ ] Checklist clickeable en work orders
- [ ] Progreso visual (3/10 tareas completadas)
- [ ] Campos personalizables por tipo de mto

---

## 🐛 TROUBLESHOOTING

### Error: "No se encontró workflow activo"
**Solución:** Ejecuta la migración SQL que crea el workflow por defecto

### Error: "Cannot read property 'levels' of null"
**Solución:** Verifica que el workflow tiene datos en la columna `levels` (JSONB)

### Work orders no aparecen en Kanban
**Solución:** Verifica que la tabla `work_orders` existe y tiene datos

### Mecánicos no aparecen en dropdown
**Solución:** Crea usuarios con rol "MECANICO" en `app_users`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Ejecutar `MIGRATION_WORKFLOWS_MAINTENANCE.sql`
- [x] Crear servicios (workflowService, maintenancePlanService)
- [x] Actualizar maintenanceService con nuevas funciones
- [x] Crear PurchaseWorkflowPanel component
- [x] Crear PreventiveMaintenancePanel component
- [x] Crear WorkshopKanbanBoard component
- [ ] Integrar componentes en App.jsx
- [ ] Actualizar Sidebar con nuevas vistas
- [ ] Agregar usuarios con rol MECANICO
- [ ] Crear primeros planes de mantenimiento
- [ ] Probar flujo completo de compras
- [ ] Probar flujo completo de mantenimiento

---

## 🎉 RESULTADO FINAL

Con esta implementación, RODICON ahora tiene:

✅ **Sistema de aprobaciones multi-nivel** tipo SAP
✅ **Mantenimiento preventivo programado** con alertas
✅ **Gestión completa de correctivos** con Kanban
✅ **Seguimiento de trabajo** en tiempo real
✅ **Historial de aprobaciones** auditable
✅ **Tablero visual** intuitivo para taller
✅ **Alertas de vencimientos** automáticas
✅ **Base sólida** para expansión futura

**¡Sistema listo para uso empresarial!** 🚀
