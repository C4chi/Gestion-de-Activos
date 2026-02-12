# 🔋 Sistema de Seguimiento de Componentes de Activos

## 📋 Resumen

Sistema integrado en el sidebar de activos para gestionar componentes críticos como baterías y llantas, con numeración única, historial automático y cálculo de desgaste.

## 🎯 Características Principales

### ✅ Baterías
- **Numeración única**: BAT-001, BAT-002, BAT-003
- **Tipo + especificación**: "12V 100Ah", "24V 200Ah Bosch"
- **Datos completos**: Marca, modelo, serial, fecha instalación, valor
- **Estado visual**: 🟢 ACTIVO | 🟡 DESGASTADO | 🔴 CRÍTICO

### ✅ Llantas  
- **Numeración única**: LL-001, LL-002, LL-003
- **Posición específica**: Delantera Izquierda, Trasera Derecha Exterior, etc.
- **Flexibilidad**: Soporta 5, 6, 7, 8+ llantas por activo
- **Seguimiento de desgaste**: Basado en kilometraje (km recorridos / km máximo)
- **Rotación**: Se registra automáticamente en historial

### ✅ Historial Automático
- **Trigger automático**: Captura cambios al marcar componente como REEMPLAZADO
- **Acciones registradas**: INSTALADO, REEMPLAZADO, REPARADO, ROTADO, REMOVIDO
- **Snapshot completo**: Datos antes/después en formato JSONB
- **Costos y OT**: Referencia a órdenes de trabajo opcionales

---

## 🚀 Paso 1: Ejecutar Migración en Supabase

### Instrucciones

1. **Ir a Supabase Dashboard**
   - Abre tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Ve a **SQL Editor** (ícono 🗃️ en el menú lateral)

2. **Abrir archivo de migración**
   - Desde tu proyecto local, abre: `MIGRATION_ASSET_COMPONENTS.sql`
   - Copia **TODO el contenido** (200+ líneas)

3. **Ejecutar SQL**
   - Pega el contenido en el SQL Editor de Supabase
   - Click en **Run** (botón verde en esquina inferior derecha)
   - Espera confirmación: ✅ Success. No rows returned

4. **Verificar tablas creadas**
   ```sql
   -- Ejecuta esto para verificar:
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'asset_components%';
   ```
   Deberías ver:
   - `asset_components`
   - `asset_components_history`

---

## 📊 Estructura de Datos

### Tabla: `asset_components`

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | UUID | Identificador único | auto |
| `asset_id` | UUID | FK a activo | - |
| `tipo` | TEXT | BATERIA, LLANTA, FILTRO_ACEITE, etc. | BATERIA |
| `numero_identificacion` | TEXT | **Numeración única** | BAT-001 |
| `tipo_especifico` | TEXT | Descripción completa | 12V 100Ah Bosch |
| `marca` | TEXT | Fabricante | Bosch |
| `modelo` | TEXT | Modelo específico | S4008 |
| `serial` | TEXT | Número de serie | 12345ABC |
| `posicion` | TEXT | Solo llantas (opcional) | DELANTERA_IZQUIERDA |
| `kilometraje_instalacion` | INTEGER | km cuando se instaló | 45000 |
| `kilometraje_actual` | INTEGER | km actual del activo | 48500 |
| `kilometraje_maximo` | INTEGER | km máximo esperado | 80000 |
| `fecha_instalacion` | DATE | Cuándo se instaló | 2024-01-15 |
| `valor_nuevo` | DECIMAL | Costo de compra | 250.00 |
| `estado` | TEXT | ACTIVO, DESGASTADO, CRITICO, REEMPLAZADO | ACTIVO |
| `porcentaje_desgaste` | INTEGER | Calculado 0-100% | 25 |
| `observaciones` | TEXT | Notas adicionales | - |

### Tabla: `asset_components_history`

Registra **automáticamente** cada cambio cuando un componente es reemplazado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID del historial |
| `asset_component_id` | UUID | FK al componente original |
| `asset_id` | UUID | FK al activo |
| `accion` | TEXT | INSTALADO, REEMPLAZADO, REPARADO, ROTADO |
| `fecha_accion` | TIMESTAMP | Cuándo ocurrió |
| `datos_anteriores` | JSONB | Snapshot completo previo |
| `datos_nuevos` | JSONB | Snapshot completo nuevo |
| `motivo` | TEXT | Razón del cambio |
| `costo` | DECIMAL | Costo del servicio |
| `work_order_id` | UUID | Referencia a OT (opcional) |
| `realizado_por` | UUID | Usuario que hizo el cambio |

---

## 🎨 Interfaz de Usuario

### Ubicación
El panel de componentes aparece en el **sidebar derecho del activo**, en la pestaña **DATOS**, justo después de la información de seguros y antes de los botones de acción.

### Vista Baterías
```
🔋 Baterías (2)                     [+]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 BAT-001
   12V 100Ah Bosch
   Bosch S4008
   Inst: 15/01/2024

🟡 BAT-002  
   12V 85Ah Varta
   Varta E11
   Inst: 20/03/2023
```

### Vista Llantas
```
🛞 Llantas (6)                      [+]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 LL-001  DELANTERA IZQUIERDA
   11R22.5
   Michelin XZA3
   km: 35,000 / 80,000 (44%)

🟡 LL-002  TRASERA DER. EXTERIOR
   11R22.5
   Bridgestone R187
   km: 68,000 / 80,000 (85%)
```

### Agregar Batería
Click en **[+]** junto a "Baterías":
```
┌─────────────────────────────────┐
│ Número (Ej: BAT-001)            │
│ [________________]              │
│                                 │
│ Tipo (Ej: 12V 100Ah)            │
│ [________________]              │
│                                 │
│ Marca        Modelo             │
│ [______]     [______]           │
│                                 │
│ [ ✓ Agregar ]  [ ✕ ]           │
└─────────────────────────────────┘
```

### Agregar Llanta
Click en **[+]** junto a "Llantas":
```
┌─────────────────────────────────┐
│ Número (Ej: LL-001)             │
│ [________________]              │
│                                 │
│ Posición                        │
│ [▼ Delantera Izquierda    ]    │
│                                 │
│ Especificación (Ej: 11R22.5)    │
│ [________________]              │
│                                 │
│ Marca         km máximo         │
│ [______]      [80000]           │
│                                 │
│ [ ✓ Agregar ]  [ ✕ ]           │
└─────────────────────────────────┘
```

### Posiciones de Llantas Disponibles
- DELANTERA_IZQUIERDA
- DELANTERA_DERECHA
- TRASERA_IZQUIERDA_INTERIOR
- TRASERA_IZQUIERDA_EXTERIOR
- TRASERA_DERECHA_INTERIOR
- TRASERA_DERECHA_EXTERIOR
- REPUESTO
- OTRO

---

## 🔧 Casos de Uso

### Caso 1: Registrar baterías de un camión
```
Camión Kenworth T800 - Ficha: C-045

Usuario va al sidebar → Tab DATOS → Sección "Componentes Críticos"

1. Click [+] en Baterías
2. Número: BAT-001
3. Tipo: 12V 100Ah
4. Marca: Bosch
5. Click "Agregar"

Repetir para BAT-002 (segunda batería del camión)

Resultado:
✅ 2 baterías registradas
✅ Visible en sidebar sin salir
✅ Estado ACTIVO (verde)
```

### Caso 2: Registrar llantas de un camión (6 llantas)
```
Camión Kenworth T800 - Ficha: C-045

1. Click [+] en Llantas
2. Completar formulario 6 veces:

   LL-001 → DELANTERA_IZQUIERDA → 11R22.5 → Michelin
   LL-002 → DELANTERA_DERECHA → 11R22.5 → Michelin
   LL-003 → TRASERA_IZQUIERDA_INTERIOR → 11R22.5 → Bridgestone
   LL-004 → TRASERA_IZQUIERDA_EXTERIOR → 11R22.5 → Bridgestone
   LL-005 → TRASERA_DERECHA_INTERIOR → 11R22.5 → Bridgestone
   LL-006 → TRASERA_DERECHA_EXTERIOR → 11R22.5 → Bridgestone

Resultado:
✅ 6 llantas registradas con posiciones específicas
✅ Seguimiento individual por km
✅ Visual: 🟢🟢🟢🟡🔴🟢 según desgaste
```

### Caso 3: Reemplazar batería desgastada
```
Cuando una batería falla:

1. Abrir SQL Editor en Supabase (esta funcionalidad se agregará en UI luego)
2. Ejecutar:
   UPDATE asset_components 
   SET estado = 'REEMPLAZADO',
       observaciones = 'Batería sin carga, reemplazada'
   WHERE numero_identificacion = 'BAT-001' 
   AND asset_id = 'uuid-del-activo';

3. Agregar nueva batería:
   - Número: BAT-003 (siguiente disponible)
   - Mismo tipo/marca o diferente

Resultado:
✅ Historial guardado automáticamente (trigger)
✅ BAT-001 aparece en historial como REEMPLAZADO
✅ BAT-003 visible como ACTIVO
✅ Registro completo before/after en JSONB
```

---

## 📈 Funcionalidades Avanzadas

### 1. Trigger de Historial Automático
```sql
-- Se ejecuta automáticamente cuando estado cambia a REEMPLAZADO
CREATE TRIGGER trigger_log_component_change
AFTER UPDATE OF estado ON asset_components
FOR EACH ROW
WHEN (NEW.estado = 'REEMPLAZADO' AND OLD.estado != 'REEMPLAZADO')
EXECUTE FUNCTION log_component_history();
```

**¿Qué hace?**
- Detecta cambio a REEMPLAZADO
- Crea registro en `asset_components_history`
- Guarda snapshot completo antes/después
- Timestamp automático
- No requiere código manual

### 2. Vista de Resumen
```sql
-- Vista precompilada para estadísticas
SELECT * FROM asset_components_summary 
WHERE asset_id = 'uuid-del-activo';
```

**Retorna:**
```
asset_id | tipo    | total | activos | desgastados | criticos
---------|---------|-------|---------|-------------|----------
uuid-123 | BATERIA | 2     | 1       | 1           | 0
uuid-123 | LLANTA  | 8     | 6       | 1           | 1
```

### 3. Función de Cálculo de Desgaste
```sql
-- Llamada manual (opcional, se puede automatizar)
SELECT calcular_desgaste_componente('uuid-del-componente', 52000);
```

**¿Qué hace?**
- Recibe component_id y km_actual del activo
- Calcula: (km_actual - km_instalacion) / km_maximo * 100
- Actualiza `porcentaje_desgaste` y `kilometraje_actual`
- Cambia `estado` automáticamente:
  - < 60%: ACTIVO (verde)
  - 60-85%: DESGASTADO (amarillo)
  - > 85%: CRITICO (rojo)

---

## 🎯 Próximos Pasos (Futuras Mejoras)

### Fase 1 ✅ (Completado)
- [x] Migración SQL con tablas completas
- [x] Componente React AssetComponentsPanel
- [x] Integración en AssetDetailSidebar
- [x] Formularios de agregar batería/llanta
- [x] Vista compacta con estado visual

### Fase 2 🔄 (Sugerido)
- [ ] Botón "Reemplazar" en UI (sin ir a SQL)
- [ ] Modal de historial con timeline visual
- [ ] Exportar reporte PDF de componentes
- [ ] Sincronización automática de kilometraje desde asset
- [ ] Notificaciones cuando componente llega a CRITICO

### Fase 3 💡 (Futuro)
- [ ] Dashboard de componentes por flota
- [ ] Predicción de reemplazo basada en tendencias
- [ ] Integración con órdenes de compra
- [ ] App móvil para escanear seriales con cámara
- [ ] Alertas tempranas por WhatsApp/Email

---

## ❓ Preguntas Frecuentes

### ¿Puedo agregar otros tipos de componentes además de baterías y llantas?
✅ **Sí**. El campo `tipo` acepta cualquier valor. Ejemplos sugeridos:
- `FILTRO_ACEITE`
- `FILTRO_AIRE`
- `FILTRO_COMBUSTIBLE`
- `CORREA`
- `MANGUERA`
- `RADIADOR`

Solo necesitas ajustar el componente React para mostrar estos tipos.

### ¿Cómo funciona la numeración única?
El sistema no auto-genera números. El usuario escribe manualmente (ej: BAT-001). Se recomienda un patrón consistente:
- Baterías: BAT-001, BAT-002, BAT-003
- Llantas: LL-001, LL-002, LL-003
- Filtros: FIL-001, FIL-002, FIL-003

En el futuro se puede automatizar con UUIDs o secuencias.

### ¿Qué pasa si una llanta se rota de posición?
Se debe crear un registro en el historial con `accion = 'ROTADO'` y actualizar el campo `posicion` del componente. El trigger solo se dispara automáticamente para REEMPLAZADO, así que ROTADO debe hacerse manualmente (o se puede crear otro trigger).

### ¿Cómo veo el historial de un componente?
Actualmente en SQL:
```sql
SELECT * FROM asset_components_history
WHERE asset_component_id = 'uuid-del-componente'
ORDER BY fecha_accion DESC;
```

En el futuro se agregará botón "📜 Ver historial" en el UI.

### ¿Los datos anteriores se pierden al reemplazar?
**No**. El trigger guarda un snapshot completo en `datos_anteriores` (JSONB) antes del cambio. Puedes recuperar cualquier dato: marca, modelo, serial, km instalación, etc.

### ¿Funciona sin conexión (offline)?
⚠️ **Estabilidad en desarrollo**. El sistema requiere conexión a Supabase para guardar datos. Para modo offline se necesitaría implementar:
- IndexedDB para almacenamiento local
- Cola de sincronización
- Resolución de conflictos

Está en roadmap para futuras fases.

---

## 📞 Soporte

**Archivo de migración**: `MIGRATION_ASSET_COMPONENTS.sql`  
**Componente React**: `src/components/AssetComponentsPanel.jsx`  
**Integración**: `src/AssetDetailSidebar.jsx` (línea ~308)

**Commit**: `feat: agregar sistema de seguimiento de componentes (baterías/llantas)` (6352281)

Si encuentras errores o tienes sugerencias, documenta:
1. Navegador y versión
2. Pasos para reproducir
3. Captura de pantalla de error (si aplica)
4. Logs de consola (F12 → Console)

---

## ✅ Checklist de Implementación

- [ ] Ejecuté `MIGRATION_ASSET_COMPONENTS.sql` en Supabase
- [ ] Verifiqué que las tablas se crearon correctamente
- [ ] Hice `git pull` para obtener últimos cambios
- [ ] Instalé dependencias con `npm install` (si aplica)
- [ ] Hice build local con `npm run build`
- [ ] Abrí un activo en el sistema
- [ ] Veo la sección "⚙️ Componentes Críticos" en el sidebar
- [ ] Agregué al menos 1 batería de prueba
- [ ] Agregué al menos 1 llanta de prueba
- [ ] Verifiqué que los datos se guardan en Supabase

Una vez completado este checklist, el sistema estará **100% funcional** 🎉

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0 (Initial Release)