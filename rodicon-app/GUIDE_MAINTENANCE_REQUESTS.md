# 🚨 Módulo de Solicitudes de Mantenimiento desde Áreas

**Fecha:** 13 de febrero de 2026  
**Implementado:** Sistema completo de solicitudes → validación → OT automática

---

## 🎯 Flujo del Proceso (Punto B del Diagrama)

```
OPERADOR → Detecta problema → Reporta solicitud → SUPERVISOR valida → 
→ Aprueba → OT automática | Rechaza → Notifica operador
```

---

## 📦 Archivos Creados

### 1. **MIGRATION_MAINTENANCE_REQUESTS.sql**
Base de datos completa:
- ✅ Tabla `maintenance_requests` con estados, prioridades, categorías
- ✅ Función `aprobar_solicitud_mantenimiento()` - Crea OT automáticamente
- ✅ Función `rechazar_solicitud_mantenimiento()` - Rechaza con justificación
- ✅ Vista `maintenance_requests_pending` - Solicitudes pendientes ordenadas
- ✅ Vista `maintenance_requests_full` - Historial completo con tracking
- ✅ Trigger de notificación automática a ADMIN/TALLER/SUPERVISOR

### 2. **MaintenanceRequestForm.jsx**
Componente React mobile-friendly para operadores:
- 📱 Diseño optimizado para móviles y tablets
- 📷 Captura de fotos múltiples del problema
- 📍 Geolocalización GPS opcional
- 🎨 Interfaz intuitiva con iconos y colores
- ⚡ Upload de imágenes a Supabase Storage
- 🏷️ Categorías: Mecánico, Eléctrico, Hidráulico, Neumático, Carrocería, Otro
- 🚨 Prioridades: Baja, Media, Alta, Crítica

### 3. **MaintenanceRequestValidator.jsx**
Panel de validación para supervisores:
- 📊 Dashboard con contador de solicitudes pendientes
- 🔴 Alerta especial para prioridad CRÍTICA
- 🔍 Filtros por prioridad y categoría
- 👁️ Vista detallada de cada solicitud con fotos
- ✅ Botón "Aprobar y Crear OT" - Genera work order automática
- ❌ Botón "Rechazar" - Requiere comentario explicativo
- 🔄 Actualización en tiempo real con Supabase Realtime
- 💬 Campo de comentarios de validación

### 4. **ANALYSIS_MAINTENANCE_WORKFLOW.md**
Documento de análisis completo:
- ✅ Lo que ya existe vs. lo que falta
- 📊 Comparación con diagrama del usuario
- 🎯 Plan de implementación por fases
- 📈 Beneficios esperados

---

## 🗄️ Estructura de Base de Datos

### Tabla: `maintenance_requests`

```sql
id                      SERIAL PRIMARY KEY
asset_id                UUID → assets(id)
solicitante_id         BIGINT → app_users(id)
solicitante_nombre     VARCHAR(100)
solicitante_area       VARCHAR(100)  -- PRODUCCION, OPERACIONES, etc.
titulo                 VARCHAR(200) NOT NULL
descripcion            TEXT
categoria              VARCHAR(50)   -- MECANICO, ELECTRICO, HIDRAULICO, etc.
prioridad              VARCHAR(20)   -- BAJA, MEDIA, ALTA, CRITICA
estado                 VARCHAR(50)   -- PENDIENTE, APROBADA, RECHAZADA
validado_por           BIGINT → app_users(id)
validador_nombre       VARCHAR(100)
fecha_validacion       TIMESTAMP
comentarios_validacion TEXT
work_order_id          INTEGER → work_orders(id)
fecha_conversion       TIMESTAMP
evidencias             JSONB        -- [{url, tipo, nombre}]
ubicacion_gps          JSONB        -- {lat, lon, precision}
fecha_solicitud        TIMESTAMP DEFAULT NOW()
```

### Estados de la Solicitud

| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Esperando validación de Mantenimiento/Supervisor |
| `APROBADA` | Validada y convertida en Work Order |
| `RECHAZADA` | No procede - con comentario explicativo |

### Categorías de Problemas

| Categoría | Icono | Descripción |
|-----------|-------|-------------|
| `MECANICO` | 🔧 | Problemas mecánicos (motor, transmisión, etc.) |
| `ELECTRICO` | ⚡ | Problemas eléctricos (luces, batería, etc.) |
| `HIDRAULICO` | 💧 | Sistema hidráulico (mangueras, cilindros) |
| `NEUMATICO` | 🛞 | Llantas y neumáticos |
| `CARROCERIA` | 🚗 | Daños en carrocería o estructura |
| `OTRO` | 📦 | Otros problemas |

### Prioridades

| Prioridad | Color | Tiempo de respuesta esperado |
|-----------|-------|------------------------------|
| `CRITICA` | 🔴 Rojo | Inmediato (1-2 horas) |
| `ALTA` | 🟠 Naranja | Mismo día |
| `MEDIA` | 🟡 Amarillo | 2-3 días |
| `BAJA` | 🔵 Azul | 1 semana |

---

## 🚀 Cómo Usar el Sistema

### Para Operadores:

1. **Acceder al formulario:**
   ```
   Menú → Mantenimiento → Reportar Problema
   ```

2. **Llenar el formulario:**
   - Seleccionar equipo/activo
   - Describir el problema
   - Elegir categoría (Mecánico, Eléctrico, etc.)
   - Indicar urgencia (Baja, Media, Alta, Crítica)
   - Adjuntar fotos (opcional)
   - Capturar ubicación GPS (opcional)

3. **Enviar:**
   - Click en "Enviar Solicitud"
   - Se notifica automáticamente a Mantenimiento

### Para Supervisores/Mantenimiento:

1. **Ver solicitudes pendientes:**
   ```
   Menú → Mantenimiento → Validar Solicitudes
   ```

2. **Revisar detalles:**
   - Click en "Ver" en cualquier solicitud
   - Revisar descripción, fotos, prioridad, operador

3. **Tomar decisión:**
   
   **Opción A: APROBAR**
   - Click en "Aprobar y Crear OT"
   - Se crea automáticamente Work Order en estado ABIERTA
   - Aparece en WorkshopKanbanBoard
   - Notifica al operador
   
   **Opción B: RECHAZAR**
   - Escribir comentario explicativo (obligatorio)
   - Click en "Rechazar"
   - Notifica al operador con la razón

---

## 🔄 Integración con Sistemas Existentes

### 1. Work Orders (Tablero Kanban)
- Solicitudes aprobadas → Se crean como `work_orders` tipo CORRECTIVO
- Aparecen en columna "ABIERTA" del `WorkshopKanbanBoard`
- Pueden ser asignadas a mecánicos
- Incluyen referencia al solicitante en la descripción

### 2. Notificaciones
- Nueva solicitud → Notifica a ADMIN, TALLER, SUPERVISOR
- Solicitud aprobada → Notifica al operador
- Solicitud rechazada → Notifica al operador con razón

### 3. Historial de Activos
- Las OT generadas desde solicitudes aparecen en `AssetHistoryPanel`
- Se puede rastrear desde la solicitud original hasta el cierre de OT

---

## 📊 Vistas SQL Útiles

### Solicitudes Pendientes con Alerta

```sql
SELECT * FROM maintenance_requests_pending
WHERE prioridad = 'CRITICA' AND dias_pendiente > 0;
```

### Reporte de Validación por Usuario

```sql
SELECT 
  validador_nombre,
  COUNT(*) FILTER (WHERE estado = 'APROBADA') AS aprobadas,
  COUNT(*) FILTER (WHERE estado = 'RECHAZADA') AS rechazadas,
  AVG(EXTRACT(HOUR FROM fecha_validacion - fecha_solicitud)) AS horas_promedio
FROM maintenance_requests
WHERE estado IN ('APROBADA', 'RECHAZADA')
GROUP BY validador_nombre;
```

### Solicitudes por Área con Tasa de Aprobación

```sql
SELECT 
  solicitante_area,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE estado = 'APROBADA') AS aprobadas,
  ROUND(COUNT(*) FILTER (WHERE estado = 'APROBADA')::DECIMAL / COUNT(*) * 100, 1) AS tasa_aprobacion
FROM maintenance_requests
WHERE estado IN ('APROBADA', 'RECHAZADA')
GROUP BY solicitante_area
ORDER BY total DESC;
```

---

## 🎨 Personalización

### Agregar Nuevas Áreas

En `MaintenanceRequestForm.jsx`, editar array `areas`:

```javascript
const areas = [
  'PRODUCCION',
  'OPERACIONES',
  'LOGISTICA',
  'CARGA_DESCARGA',
  'TU_NUEVA_AREA', // ← Agregar aquí
];
```

### Agregar Nuevas Categorías

En `MaintenanceRequestForm.jsx`, editar array `categorias`:

```javascript
const categorias = [
  // ... existentes
  { value: 'NUEVA_CATEGORIA', label: '🔥 Nueva', icon: '🔥' },
];
```

En SQL, las categorías son texto libre (VARCHAR), no requieren migración.

---

## 🔐 Permisos y Roles

| Rol | Puede crear solicitudes | Puede validar | Puede ver historial |
|-----|------------------------|---------------|---------------------|
| **OPERADOR** | ✅ | ❌ | ✅ (solo propias) |
| **SUPERVISOR** | ✅ | ✅ | ✅ (todas) |
| **TALLER** | ✅ | ✅ | ✅ (todas) |
| **ADMIN** | ✅ | ✅ | ✅ (todas) |

---

## 📱 Características Mobile-Friendly

1. **Diseño Responsivo:**
   - Grid adaptable en formulario
   - Botones grandes y táctiles
   - Texto legible en pantallas pequeñas

2. **Captura de Fotos:**
   - Soporte para cámara nativa del dispositivo
   - Upload múltiple de imágenes
   - Preview de fotos antes de enviar

3. **Geolocalización:**
   - Captura posición GPS del dispositivo
   - Útil para activos móviles (camiones, maquinaria en campo)
   - Almacena precisión del GPS

4. **Optimizaciones:**
   - Loading states durante uploads
   - Validación en tiempo real
   - Mensajes de error claros

---

## 🐛 Troubleshooting

### Problema: No se ven solicitudes pendientes
**Solución:** Verificar que ejecutaste `MIGRATION_MAINTENANCE_REQUESTS.sql` en Supabase

### Problema: Error al aprobar solicitud
**Solución:** Verificar que existe tabla `work_orders` (ejecutar `MIGRATION_WORKFLOWS_MAINTENANCE.sql`)

### Problema: No llegan notificaciones
**Solución:** Verificar que existe tabla `user_notifications` y el trigger está activo

### Problema: Fotos no se suben
**Solución:** 
1. Verificar bucket `evidencias` existe en Supabase Storage
2. Verificar políticas de Storage permiten INSERT/SELECT
3. Crear bucket: `Supabase → Storage → New Bucket → "evidencias" → Public`

---

## 🔜 Próximas Mejoras

1. **Dashboard Analytics:**
   - Gráficos de solicitudes por área
   - Tiempos promedio de validación
   - Tasa de aprobación/rechazo

2. **Notificaciones Push:**
   - Notificar operador cuando se aprueba/rechaza
   - Notificar supervisor cuando hay solicitud CRÍTICA

3. **Comentarios y Chat:**
   - Permitir conversación entre operador y supervisor
   - Solicitar más información antes de aprobar

4. **SLA Tracking:**
   - Alertas automáticas si solicitud lleva >48h pendiente
   - Dashboard de cumplimiento de SLA

---

## 📄 Archivos Relacionados

```
src/components/
  ├── MaintenanceRequestForm.jsx          ← Formulario para operadores
  ├── MaintenanceRequestValidator.jsx     ← Panel de validación
  ├── WorkshopKanbanBoard.jsx            ← Tablero de OT (integrado)
  └── AssetHistoryPanel.jsx              ← Historial (muestra solicitudes)

migrations/
  ├── MIGRATION_MAINTENANCE_REQUESTS.sql  ← Base de datos
  └── MIGRATION_WORKFLOWS_MAINTENANCE.sql ← Prerequisito (work_orders)

docs/
  └── ANALYSIS_MAINTENANCE_WORKFLOW.md    ← Análisis completo
```

---

## ✅ Checklist de Implementación

### En Supabase:
- [ ] Ejecutar `MIGRATION_MAINTENANCE_REQUESTS.sql`
- [ ] Verificar tablas creadas: `maintenance_requests`, vistas, funciones
- [ ] Crear bucket Storage: `evidencias` (público)
- [ ] Verificar políticas de RLS si está activado

### En Código:
- [ ] ✅ Componentes creados y compilados
- [ ] Agregar rutas en App.jsx o Layout
- [ ] Agregar menú "Solicitudes" en navegación
- [ ] (Opcional) Badge contador en menú

### Testing:
- [ ] Crear solicitud como OPERADOR
- [ ] Ver solicitud en panel de validación
- [ ] Aprobar solicitud → Verificar OT creada
- [ ] Rechazar solicitud → Verificar notificación
- [ ] Upload de fotos → Verificar Storage
- [ ] GPS → Verificar coordenadas guardadas

---

**🎉 Sistema implementado y listo para usar!**

Para cualquier duda, revisar `ANALYSIS_MAINTENANCE_WORKFLOW.md` o contactar al equipo de desarrollo.
