# 📊 Análisis: Ajustes del Área de Mantenimiento, Taller y Activos

**Fecha:** 13 de febrero de 2026

---

## 🎯 Diagrama vs. Sistema Actual

### ✅ **LO QUE YA EXISTE**

#### 1. **Base de Datos**
- ✓ `work_orders` - Órdenes de trabajo (ABIERTA, ASIGNADA, EN_PROGRESO, PAUSADA, COMPLETADA)
- ✓ `maintenance_logs` - Registro histórico de mantenimientos con tipo_medicion (KM/HORAS)
- ✓ `maintenance_plans` - Planes de mantenimiento preventivo programados
- ✓ `assets` - Activos con kilometraje_actual, horometro_actual, tipo_medicion
- ✓ `asset_components` - Componentes críticos (baterías, llantas)
- ✓ `asset_components_history` - Historial de cambios de componentes

#### 2. **Componentes React**
- ✓ **WorkshopKanbanBoard.jsx** - Tablero Kanban drag & drop para gestión de OT
- ✓ **PreventiveMaintenancePanel.jsx** - Registro de mantenimiento preventivo
- ✓ **MaintenanceTrackerPanel.jsx** - Seguimiento de KM/Horas con selector de tipo de medición
- ✓ **AssetComponentsPanel.jsx** - Gestión de baterías y llantas por activo
- ✓ **AssetHistoryPanel.jsx** - Timeline unificado de mantenimientos y componentes

---

## 🚧 **LO QUE FALTA (según diagrama)**

### **ÁREA 1: MANTENIMIENTO PLANIFICADO**

#### ❌ **1. Checklist de Inspección y Lubricación**
**Ubicación en diagrama:** Arriba izquierda, inicio del flujo
**Descripción:** 
- Registro de activos en flota
- Análisis de criticidad
- Definición de estrategia (MP, MPJ, MC)
- Creación de plantillas de checklist
- Checklist de inspección con validación

**Estado:** NO EXISTE
**Propuesta:** Crear módulo `InspectionChecklistModule` con:
- Plantillas personalizables por tipo de activo
- Checklist digital con checkboxes
- Marcación de ítems críticos
- Generación automática de OT si se detectan problemas

---

#### ❌ **2. Programación de Mantenimientos**
**Ubicación en diagrama:** Después del checklist
**Descripción:**
- Calendario visual de mantenimientos programados
- Asignación anticipada de recursos
- Vista mensual/semanal
- Notificaciones automáticas

**Estado:** PARCIAL (tabla `maintenance_plans` existe pero no hay UI)
**Propuesta:** Crear `MaintenanceScheduler.jsx`:
- Calendario visual (tipo Google Calendar)
- Arrastrar y soltar para reprogramar
- Vista por activo, por mecánico, por fecha
- Alertas 7 días antes del vencimiento

---

#### ⚠️ **3. Diferenciación OT Preventiva vs. OT Correctiva**
**Ubicación en diagrama:** Bifurcación "¿Es urgente?"
**Descripción:**
- Las OT preventivas siguen flujo de programación
- Las OT correctivas (urgentes) van directo a ejecución
- Diferentes colores/badges según tipo

**Estado:** PARCIAL (campo `tipo` existe pero UI no lo usa efectivamente)
**Propuesta:** Mejorar `WorkshopKanbanBoard.jsx`:
- Badge visual distintivo: 🔵 PREVENTIVO | 🔴 CORRECTIVO
- Filtro por tipo de mantenimiento
- Prioridad automática: Correctivo = ALTA

---

#### ❌ **4. Solicitudes desde Áreas**
**Ubicación en diagrama:** Abajo - "Áreas" → "Detección Problemática"
**Descripción:**
- Áreas operativas detectan problemas en equipos
- Generan Solicitud de Trabajo (no OT aún)
- Requiere validación de Mantenimiento antes de convertirse en OT
- Flujo B en el diagrama

**Estado:** NO EXISTE
**Propuesta:** Crear módulo `MaintenanceRequestsModule`:

**Nueva tabla:**
```sql
CREATE TABLE maintenance_requests (
  id SERIAL PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  solicitante_id BIGINT REFERENCES app_users(id),
  solicitante_area VARCHAR(100),
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  prioridad VARCHAR(20) DEFAULT 'MEDIA',
  estado VARCHAR(50) DEFAULT 'PENDIENTE_VALIDACION',
  -- PENDIENTE_VALIDACION → APROBADA → RECHAZADA
  fecha_solicitud TIMESTAMP DEFAULT NOW(),
  validado_por BIGINT REFERENCES app_users(id),
  fecha_validacion TIMESTAMP,
  comentarios_validacion TEXT,
  work_order_id INTEGER REFERENCES work_orders(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Componente React:** `MaintenanceRequestForm.jsx`
- Formulario simple para operadores
- Selección de activo
- Descripción del problema
- Adjuntar foto (opcional)
- Envío a Mantenimiento para validación

---

### **ÁREA 2: COMPRAS (Integración con Mantenimiento)**

#### ⚠️ **5. Integración OT → Proceso de Compras (Punto A)**
**Ubicación en diagrama:** Conexión amarilla A entre Mantenimiento → Compras
**Descripción:**
- Desde una OT pausada (ESPERA REPUESTO) → Iniciar proceso de compras
- Generar requisición automática con datos de OT
- Tracking de la orden de compra asociada
- Alerta cuando repuesto llega (continuar OT)

**Estado:** PARCIAL (existe módulo de compras pero no integración directa)
**Propuesta:** 
- En `WorkshopKanbanBoard.jsx`, agregar botón "Solicitar Repuesto" en OT PAUSADA
- Modal que genera purchase_order con referencia a work_order_id
- Cuando purchase_order cambia a "ENTREGADO" → Notificar mecánico
- Botón "Reanudar Trabajo" cuando repuesto disponible

---

#### ⚠️ **6. Validación de Solicitudes (Punto B)**
**Ubicación en diagrama:** Conexión amarilla B entre Áreas → Mantenimiento
**Descripción:**
- Solicitudes de áreas requieren validación antes de convertirse en OT
- Mantenimiento revisa, aprueba/rechaza
- Si aprueba → Se crea OT automáticamente

**Estado:** NO EXISTE
**Propuesta:** Panel `MaintenanceRequestValidator.jsx`:
- Lista de solicitudes PENDIENTE_VALIDACION
- Ver detalles de solicitud
- Botones: APROBAR | RECHAZAR
- Si aprueba → Crea work_order automáticamente
- Si rechaza → Agrega comentario y notifica solicitante

---

### **ÁREA 3: TALLER (Ejecución)**

#### ✅ **7. Generación de Solicitud de Trabajo**
**Estado:** EXISTE
**Componente:** `WorkshopKanbanBoard.jsx` con botón "Nueva Orden"

#### ✅ **8. Generación OT**
**Estado:** EXISTE
**Funcionalidad:** Creación de work_orders con tipo, prioridad, asignación

#### ⚠️ **9. OT Correctiva (con checklist)**
**Ubicación en diagrama:** "OT Correctiva" después de detectar problema
**Estado:** PARCIAL (no tiene checklist integrado)
**Propuesta:** Agregar campo `checklist` en work_orders:
```json
{
  "items": [
    {"id": 1, "texto": "Revisar nivel de aceite", "completado": true},
    {"id": 2, "texto": "Verificar frenos", "completado": false}
  ]
}
```

#### ✅ **10. Ejecución OT / MP y OT MC**
**Estado:** EXISTE
**Funcionalidad:** Estados EN_PROGRESO, seguimiento de horas

#### ⚠️ **11. Archivo en Histórico**
**Estado:** PARCIAL
**Actual:** Solo maintenance_logs
**Propuesta:** Incluir work_orders cerradas en `AssetHistoryPanel.jsx`

#### ✅ **12. Análisis de Eventos de Falla**
**Estado:** EXISTE
**Componente:** `AssetHistoryPanel.jsx` con filtros

#### ✅ **13. Análisis de Frecuencia de Falla**
**Estado:** EXISTE (vistas en SQL)

#### ✅ **14. Cierre de OT**
**Estado:** EXISTE
**Funcionalidad:** Estado COMPLETADA con notas_cierre

---

## 📋 **RESUMEN DE TAREAS PENDIENTES**

### 🔴 **ALTA PRIORIDAD**
1. **Solicitudes desde Áreas** (punto B del diagrama)
   - Tabla `maintenance_requests`
   - Form para operadores
   - Panel de validación para Mantenimiento

2. **Integración OT → Compras** (punto A del diagrama)
   - Botón "Solicitar Repuesto" en OT pausada
   - Crear purchase_order con referencia a work_order_id
   - Notificación cuando repuesto llega

3. **Checklist de Inspección**
   - Plantillas de checklist por tipo de activo
   - Módulo de inspección digital
   - Generación automática de OT si se detectan problemas

### 🟡 **MEDIA PRIORIDAD**
4. **Programador de Mantenimientos**
   - Calendario visual mensual/semanal
   - Drag & drop para reprogramar
   - Integración con `maintenance_plans`

5. **Mejoras en Kanban**
   - Badge visual PREVENTIVO vs CORRECTIVO
   - Filtro por tipo
   - Checklist integrado en OT

### 🟢 **BAJA PRIORIDAD**
6. **Generación de Acciones Correctivas**
   - Análisis de fallas recurrentes
   - Plan de acción automático
   - Mejora continua

---

## 🎨 **PROPUESTA DE REORGANIZACIÓN UI**

### **Menú Principal → Mantenimiento**
```
📊 Dashboard Mantenimiento
   ├─ 📋 Órdenes de Trabajo (Kanban) ← YA EXISTE
   ├─ 🔍 Solicitudes Pendientes ← CREAR
   ├─ 📅 Programación Preventivo ← CREAR
   ├─ ✅ Checklist de Inspección ← CREAR
   ├─ 📈 Reportes y Análisis ← MEJORAR
   └─ ⚙️ Configuración Planes ← CREAR
```

### **Sidebar de Activo**
```
📁 Tabs Actuales:
   ├─ Datos ← Ya tiene MaintenanceTrackerPanel
   ├─ EPP
   ├─ Mantenimiento
   ├─ HSE
   └─ Historial ← Ya tiene AssetHistoryPanel

Agregar en tab "Mantenimiento":
   ├─ 🔧 Seguimiento (km/horas) ← YA EXISTE
   ├─ ⚙️ Componentes Críticos ← YA EXISTE
   ├─ 📋 Órdenes de Trabajo Activas ← AGREGAR
   ├─ ✅ Checklist de Inspección ← AGREGAR
   └─ 📅 Próximos Mantenimientos ← AGREGAR
```

---

## 🚀 **PLAN DE IMPLEMENTACIÓN**

### **Fase 1: Solicitudes desde Áreas (2-3 días)**
1. Crear tabla `maintenance_requests`
2. Componente `MaintenanceRequestForm.jsx` (para operadores)
3. Componente `MaintenanceRequestValidator.jsx` (para supervisores)
4. Integración con notificaciones

### **Fase 2: Integración Compras (1-2 días)**
1. Agregar campo `work_order_id` en `purchase_orders`
2. Botón "Solicitar Repuesto" en Kanban
3. Modal de creación de purchase_order desde OT
4. Notificación automática cuando repuesto disponible

### **Fase 3: Checklist de Inspección (3-4 días)**
1. Tabla `inspection_templates` (plantillas)
2. Tabla `inspection_records` (registros)
3. Componente `InspectionChecklistModule.jsx`
4. Generación automática de OT desde inspección fallida

### **Fase 4: Programador de Mantenimientos (3-5 días)**
1. Componente `MaintenanceScheduler.jsx`
2. Integración con `maintenance_plans`
3. Calendario visual con react-big-calendar
4. Drag & drop para reprogramar

### **Fase 5: Mejoras en Kanban (1 día)**
1. Badge PREVENTIVO/CORRECTIVO
2. Filtro por tipo
3. Checklist inline en cards

---

## ❓ **PREGUNTAS PARA DECIDIR**

1. **¿Quiénes pueden crear solicitudes desde áreas?**
   - ¿Solo OPERADOR?
   - ¿También SUPERVISOR?
   - ¿Necesitan login o es anónimo?

2. **¿Qué áreas existen en tu empresa?**
   - Producción, Operaciones, Carga, etc.
   - Para crear dropdown en formulario

3. **¿El checklist de inspección lo hacen mecánicos o conductores?**
   - Si conductores → Hacer app mobile-friendly
   - Si mecánicos → Puede ser más complejo

4. **¿Prioridad de implementación?**
   - ¿Empezamos con Solicitudes desde Áreas?
   - ¿O prefieres Integración con Compras primero?

---

## 📊 **BENEFICIOS ESPERADOS**

✅ **Flujo completo desde detección → solicitud → validación → OT → ejecución → cierre**  
✅ **Trazabilidad total de todas las solicitudes y su estado**  
✅ **Integración real entre Mantenimiento y Compras**  
✅ **Checklist digital elimina papeles y permite auditoría**  
✅ **Programación visual reduce mantenimientos atrasados**  
✅ **Datos históricos para análisis predictivo**

---

**¿Por dónde quieres que empecemos?** 🎯
