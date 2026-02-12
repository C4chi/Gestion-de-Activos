# 🔧 Panel de Seguimiento de Mantenimiento

## 📋 Resumen

Sistema integrado en el sidebar de activos que muestra el estado de mantenimiento, permite actualizar kilometraje/horómetro actual y proyecta el próximo mantenimiento con alertas visuales.

## 🎯 Características Principales

### ✅ Medición Actual Editable
- **Kilometraje** para vehículos (camiones, autobuses)
- **Horómetro** para equipos (maquinaria pesada)
- **Ambos** para equipos híbridos
- Edición inline sin salir del sidebar
- Actualización en tiempo real

### ✅ Último Mantenimiento
- Fecha del último mantenimiento realizado
- Km/Horas cuando se realizó
- Tipo: PREVENTIVO o CORRECTIVO
- Días transcurridos desde el último mantenimiento

### ✅ Próximo Mantenimiento
- Fecha proyectada del próximo mantenimiento
- Km/Horas proyectadas para el próximo mantenimiento
- Contador de días hasta el próximo mantenimiento
- Alertas visuales según el estado:
  - 🟢 **AL DÍA**: Mantenimiento al día, sin urgencias
  - 🟡 **PRÓXIMO**: A menos del 10% del próximo mantenimiento (90% del km proyectado)
  - 🔴 **VENCIDO**: Mantenimiento vencido, requiere atención inmediata

### ✅ Sincronización Automática
- Al actualizar km del activo, se actualizan automáticamente los componentes (llantas)
- Cálculo automático de desgaste de componentes
- Vista consolidada de estado de mantenimiento

---

## 🚀 Paso 1: Ejecutar Migración en Supabase

### Instrucciones

1. **Ir a Supabase Dashboard**
   - Abre tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Ve a **SQL Editor** (ícono 🗃️ en el menú lateral)

2. **Abrir archivo de migración**
   - Desde tu proyecto local, abre: `MIGRATION_ASSET_KM_HOURS.sql`
   - Copia **TODO el contenido**

3. **Ejecutar SQL**
   - Pega el contenido en el SQL Editor de Supabase
   - Click en **Run** (botón verde en esquina inferior derecha)
   - Espera confirmación: ✅ Success. No rows returned

4. **Verificar cambios**
   ```sql
   -- Ejecuta esto para verificar:
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'assets' 
   AND column_name IN ('kilometraje_actual', 'horometro_actual', 'tipo_medicion');
   ```
   Deberías ver:
   - `kilometraje_actual` (integer)
   - `horometro_actual` (numeric)
   - `tipo_medicion` (character varying)

5. **Verificar vista creada**
   ```sql
   SELECT * FROM asset_maintenance_status LIMIT 5;
   ```

---

## 📊 Estructura de Datos

### Nuevos Campos en Tabla `assets`

| Campo | Tipo | Por Defecto | Descripción |
|-------|------|-------------|-------------|
| `kilometraje_actual` | INTEGER | 0 | Kilometraje actual del vehículo |
| `horometro_actual` | DECIMAL(10,1) | 0.0 | Horómetro actual en horas del equipo |
| `tipo_medicion` | VARCHAR(20) | 'KILOMETRAJE' | Tipo de medición: KILOMETRAJE, HOROMETRO, AMBOS |

### Vista: `asset_maintenance_status`

Vista consolidada que calcula automáticamente el estado de mantenimiento de cada activo.

| Campo | Descripción |
|-------|-------------|
| `asset_id` | ID del activo |
| `ficha` | Ficha del activo |
| `kilometraje_actual` | Km actual del activo |
| `horometro_actual` | Horas actuales del activo |
| `tipo_medicion` | Tipo de medición utilizada |
| `ultimo_mto_fecha` | Fecha del último mantenimiento |
| `ultimo_mto_km` | Km cuando se realizó el último mantenimiento |
| `ultimo_mto_tipo` | PREVENTIVO o CORRECTIVO |
| `proximo_mto_fecha` | Fecha proyectada del próximo mantenimiento |
| `proximo_mto_km` | Km proyectados para el próximo mantenimiento |
| `estado_mantenimiento` | **OK**, **PROXIMO**, o **VENCIDO** |
| `dias_desde_ultimo_mto` | Días transcurridos desde el último mantenimiento |
| `dias_hasta_proximo_mto` | Días hasta el próximo mantenimiento (negativos si vencido) |

### Función: `actualizar_medicion_activo()`

Función SQL para actualizar km/horómetro con validaciones.

```sql
SELECT * FROM actualizar_medicion_activo(
  'C-045',      -- ficha del activo
  52000,        -- kilometraje nuevo (NULL si no aplica)
  NULL,         -- horómetro nuevo (NULL si no aplica)
  123           -- ID del usuario que hace la actualización
);
```

**Retorna:**
- `success` (boolean): Si la actualización fue exitosa
- `mensaje` (text): Mensaje de confirmación o error
- `kilometraje_anterior` (integer): Valor previo de km
- `kilometraje_nuevo` (integer): Valor nuevo de km
- `horometro_anterior` (decimal): Valor previo de horas
- `horometro_nuevo` (decimal): Valor nuevo de horas

---

## 🎨 Interfaz de Usuario

### Ubicación
El panel aparece en el **sidebar derecho del activo**, en la pestaña **DATOS**, justo después del panel de componentes críticos y antes de los botones de acción.

### Vista Panel de Seguimiento

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Seguimiento de Mantenimiento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────┐
│ ⚡ Kilometraje Actual        [✏]│
│                                 │
│    45,000 Km                    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔧 ÚLTIMO MANTENIMIENTO         │
│                                 │
│ 📅 15 Ene 2026    Hace 28 días  │
│ ⚡ 42,000 Km                     │
│ [PREVENTIVO]                    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📅 PRÓXIMO MANTENIMIENTO   [OK] │
│                                 │
│ 📅 15 Mar 2026    En 31 días    │
│ ⚡ 50,000 Km   Faltan 5,000 Km  │
└─────────────────────────────────┘
```

### Modo Edición de Kilometraje

Click en el ícono de editar (✏):

```
┌─────────────────────────────────┐
│ ⚡ Kilometraje Actual            │
│                                 │
│ [   45000   ] [ ✓ ] [ ✕ ]      │
└─────────────────────────────────┘
```

### Estados del Mantenimiento

#### 🟢 AL DÍA
```
┌─────────────────────────────────┐
│ 📅 PRÓXIMO MANTENIMIENTO        │
│              [✓ AL DÍA]         │
│                                 │
│ 📅 15 Mar 2026    En 45 días    │
│ ⚡ 50,000 Km   Faltan 8,000 Km  │
└─────────────────────────────────┘
```

#### 🟡 PRÓXIMO
```
┌─────────────────────────────────┐
│ 📅 PRÓXIMO MANTENIMIENTO        │
│              [⏱ PRÓXIMO]        │
│                                 │
│ 📅 20 Feb 2026    En 8 días     │
│ ⚡ 46,000 Km   Faltan 1,000 Km  │
└─────────────────────────────────┘
```

#### 🔴 VENCIDO
```
┌─────────────────────────────────┐
│ 📅 PRÓXIMO MANTENIMIENTO        │
│              [⚠ VENCIDO]        │
│                                 │
│ 📅 05 Feb 2026  Atrasado 7 días │
│ ⚡ 44,000 Km       EXCEDIDO      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⚠ Mantenimiento Vencido         │
│                                 │
│ Este activo requiere            │
│ mantenimiento inmediato         │
└─────────────────────────────────┘
```

---

## 🔧 Casos de Uso

### Caso 1: Actualizar kilometraje de un camión

```
Camión Kenworth T800 - Ficha: C-045
Kilometraje actual: 45,000 km

El conductor reporta que hoy llegó a 48,500 km

Usuario:
1. Abre el sidebar del camión
2. Ve el panel "🔧 Seguimiento de Mantenimiento"
3. Click en el ícono de editar [✏] junto a "Kilometraje Actual"
4. Ingresa: 48500
5. Click en el botón verde [✓]

Resultado:
✅ Kilometraje actualizado a 48,500 km
✅ Vista actualizada inmediatamente
✅ Componentes (llantas) sincronizados automáticamente
✅ Porcentaje de desgaste de llantas recalculado
✅ Si el km excede el proyectado, cambia a estado VENCIDO
```

### Caso 2: Consultar estado de mantenimiento

```
Usuario quiere saber si el camión C-045 necesita mantenimiento

Usuario:
1. Abre el sidebar del camión C-045
2. Ve el panel "🔧 Seguimiento de Mantenimiento"

Ve información:
📊 Kilometraje Actual: 48,500 km

🔧 ÚLTIMO MANTENIMIENTO
   📅 15 Ene 2026 (hace 28 días)
   ⚡ 42,000 km
   [PREVENTIVO]

📅 PRÓXIMO MANTENIMIENTO [⏱ PRÓXIMO]
   📅 20 Feb 2026 (en 8 días)
   ⚡ 50,000 km (faltan 1,500 km)

Conclusión:
⚠️ El mantenimiento está próximo (menos de 10% restante)
✅ Pero aún no está vencido
💡 Programar mantenimiento en los próximos 7 días
```

### Caso 3: Activo con mantenimiento vencido

```
Camión Mack - Ficha: C-023
Kilometraje actual: 52,000 km
Próximo mantenimiento proyectado: 48,000 km

Usuario abre el sidebar:

📊 Kilometraje Actual: 52,000 km

🔧 ÚLTIMO MANTENIMIENTO
   📅 10 Dic 2025 (hace 64 días)
   ⚡ 38,000 km
   [PREVENTIVO]

📅 PRÓXIMO MANTENIMIENTO [⚠ VENCIDO]
   📅 10 Feb 2026 (Atrasado 2 días)
   ⚡ 48,000 km (EXCEDIDO)

⚠️ Mantenimiento Vencido
   Este activo requiere mantenimiento inmediato

Acción requerida:
🚨 Crear orden de mantenimiento urgente
🚨 Notificar al gerente de taller
🚨 Registrar el nuevo mantenimiento cuando se complete
```

### Caso 4: Equipo con horómetro

```
Retroexcavadora - Ficha: E-012
Tipo de medición: HOROMETRO

Usuario actualiza horas:
1. Click en [✏] junto a "Horómetro Actual"
2. Ingresa: 1285.5
3. Click en [✓]

Vista muestra:
📊 Horómetro Actual: 1,285.5 Horas

🔧 ÚLTIMO MANTENIMIENTO
   📅 05 Ene 2026 (hace 38 días)
   ⚡ 1,100.0 Horas
   [PREVENTIVO]

📅 PRÓXIMO MANTENIMIENTO [✓ AL DÍA]
   📅 15 Mar 2026 (en 31 días)
   ⚡ 1,350.0 Horas (faltan 64.5 Horas)

Estado: OK ✅
```

---

## ⚙️ Lógica de Cálculo de Estados

### Estado: OK (🟢)
```javascript
km_actual < proximo_mto_km * 0.9
// Ejemplo: 45,000 < 50,000 * 0.9 (45,000)
// Todavía más del 10% de margen
```

### Estado: PRÓXIMO (🟡)
```javascript
km_actual >= proximo_mto_km * 0.9 && km_actual < proximo_mto_km
// Ejemplo: 48,000 >= 50,000 * 0.9 (45,000) && 48,000 < 50,000
// Entre 90% y 100% del km proyectado
```

### Estado: VENCIDO (🔴)
```javascript
km_actual >= proximo_mto_km
// Ejemplo: 52,000 >= 50,000
// Ya excedió el km proyectado
```

### Días hasta próximo mantenimiento
```javascript
dias = proximo_mto_fecha - fecha_hoy
// Si es negativo: "Atrasado X días"
// Si es positivo: "En X días"
```

---

## 🔄 Sincronización Automática

### Trigger: `sync_component_kilometraje`

Cuando se actualiza el kilometraje de un activo, automáticamente:

1. **Actualiza componentes activos** (solo llantas que dependen de km)
2. **Recalcula porcentaje de desgaste**:
   ```javascript
   desgaste = ((km_actual - km_instalacion) / km_maximo) * 100
   ```
3. **Actualiza estado del componente**:
   - `< 60%`: ACTIVO (🟢)
   - `60-85%`: DESGASTADO (🟡)
   - `> 85%`: CRITICO (🔴)

### Ejemplo de sincronización

```sql
-- Antes de actualizar
Activo C-045: km_actual = 45,000
Llanta LL-001: 
  - km_instalacion = 35,000
  - km_actual = 45,000
  - km_maximo = 80,000
  - desgaste = (45000-35000)/80000 = 12.5%
  - estado = ACTIVO

-- Usuario actualiza km del activo a 52,000
UPDATE assets SET kilometraje_actual = 52000 WHERE ficha = 'C-045';

-- Trigger se dispara automáticamente
Activo C-045: km_actual = 52,000
Llanta LL-001:
  - km_instalacion = 35,000
  - km_actual = 52,000 (actualizado automáticamente)
  - km_maximo = 80,000
  - desgaste = (52000-35000)/80000 = 21.3%
  - estado = ACTIVO (sigue siendo < 60%)
```

---

## 📈 Integración con Mantenimiento Preventivo

### Al cerrar una orden de trabajo

Cuando un mecánico cierra una orden de trabajo de mantenimiento:

1. Se registra en `maintenance_logs`:
   ```javascript
   {
     ficha: 'C-045',
     tipo: 'PREVENTIVO',
     fecha: '2026-02-12',
     km_recorrido: 48500,
     proyeccion_proxima_km: 58500,
     proyeccion_proxima_mto: '2026-04-15'
   }
   ```

2. La vista `asset_maintenance_status` se actualiza automáticamente:
   - `ultimo_mto_fecha` = 2026-02-12
   - `ultimo_mto_km` = 48,500
   - `proximo_mto_fecha` = 2026-04-15
   - `proximo_mto_km` = 58,500

3. El panel en el sidebar muestra los datos actualizados inmediatamente

4. El estado se calcula en tiempo real según el km actual

---

## 🎯 Mejoras Futuras (Roadmap)

### Fase 2 🔄 (Sugerido)
- [ ] Notificaciones automáticas cuando el estado cambia a PRÓXIMO
- [ ] Dashboard de activos próximos a mantenimiento
- [ ] Exportar calendario de mantenimientos proyectados
- [ ] Sincronización con planes de mantenimiento preventivo
- [ ] Historial de actualizaciones de km/horas

### Fase 3 💡 (Futuro)
- [ ] Predicción inteligente de próximo mantenimiento basada en uso
- [ ] Alertas tempranas por WhatsApp/Email
- [ ] Integración con telemática para actualización automática de km
- [ ] App móvil para actualizar km desde el campo
- [ ] Análisis de costos de mantenimiento por km recorrido

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si no he registrado mantenimientos?

El panel mostrará:
- Ultimo Mantenimiento: "Sin mantenimientos registrados"
- Próximo Mantenimiento: "No hay próximo mantenimiento programado"
- No habrá alertas de estado

**Solución:** Registra el primer mantenimiento desde el botón "Registrar Preventivo" en el sidebar.

### ¿Puedo cambiar el tipo de medición de un activo?

Sí, directamente en Supabase:

```sql
UPDATE assets 
SET tipo_medicion = 'HOROMETRO' 
WHERE ficha = 'E-012';
```

**Valores válidos:**
- `KILOMETRAJE` (vehículos)
- `HOROMETRO` (equipos)
- `AMBOS` (híbridos)

### ¿El kilometraje se actualiza automáticamente?

No. El sistema requiere actualización manual por el usuario. En el futuro se puede integrar con sistemas de telemetría para actualización automática.

### ¿Qué pasa si actualizo el km pero no coincide con el último mantenimiento?

No hay problema. El sistema muestra el último mantenimiento registrado en `maintenance_logs` independientemente del km actual. Esto permite tener un km actual mayor al proyectado (estado VENCIDO).

### ¿Los componentes se actualizan al cambiar el km?

Sí, **solo las llantas** se sincronizan automáticamente porque su desgaste depende del kilometraje. Las baterías no se actualizan porque no dependen de km sino de tiempo.

### ¿Puedo desactivar las alertas visuales?

Actualmente las alertas son parte del diseño del componente. Para personalizarlas, edita el código en `MaintenanceTrackerPanel.jsx` línea ~95 (función `getEstadoBadge`).

---

## 📞 Soporte

**Archivos clave:**
- **Migración SQL**: `MIGRATION_ASSET_KM_HOURS.sql`
- **Componente React**: `src/components/MaintenanceTrackerPanel.jsx`
- **Integración**: `src/AssetDetailSidebar.jsx` (línea ~313)

**Commit**: `feat: agregar panel de seguimiento de mantenimiento con km/horas` (58c90e3)

**Vista en Supabase**: `asset_maintenance_status`

**Dependencias:**
- Tabla `assets` (campos: kilometraje_actual, horometro_actual, tipo_medicion)
- Tabla `maintenance_logs` (campos: km_recorrido, proyeccion_proxima_km, proyeccion_proxima_mto)
- Tabla `asset_components` (opcional, para sincronización de llantas)

---

## ✅ Checklist de Implementación

- [ ] Ejecuté `MIGRATION_ASSET_KM_HOURS.sql` en Supabase
- [ ] Verifiqué que los campos se agregaron a la tabla `assets`
- [ ] Verifiqué que la vista `asset_maintenance_status` se creó
- [ ] Hice `git pull` para obtener últimos cambios
- [ ] Instalé dependencias con `npm install` (si aplica)
- [ ] Hice build local con `npm run build`
- [ ] Abrí un activo en el sistema
- [ ] Veo la sección "🔧 Seguimiento de Mantenimiento" en el sidebar
- [ ] Al hacer click en editar, puedo actualizar el km
- [ ] Los datos se guardan correctamente en Supabase
- [ ] Veo el último mantenimiento registrado
- [ ] Veo el próximo mantenimiento proyectado con alertas visuales

Una vez completado este checklist, el sistema estará **100% funcional** 🎉

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0.0 (Initial Release)