# TEST COMPLETO DE FLUJOS

## Correcciones Realizadas

### 1. **Campos de Tabla Incorrectos**
- ✅ `maintenance_logs.ficha_ref` → `maintenance_logs.ficha`
- ✅ `maintenance_logs.usuario` → Eliminado (usa `created_by` que es BIGINT)
- ✅ `maintenance_logs.km` → `maintenance_logs.km_recorrido`
- ✅ `maintenance_logs.proyeccion` → `maintenance_logs.proyeccion_proxima_mto`
- ✅ `maintenance_logs.fecha` es DATE, no TIMESTAMP
- ✅ `safety_reports.ficha_ref` → `safety_reports.ficha`
- ✅ `purchase_orders.ficha_ref` → `purchase_orders.ficha`
- ✅ `assets.numero_de_requisicion` → `assets.numero_requisicion`

### 2. **Problemas de Ordenamiento API**
- ✅ `purchase_orders.order('created_at')` → `order('fecha_solicitud')`
- ✅ `safety_reports.order('created_at')` → `order('fecha_reporte')`

### 3. **Funciones Faltantes en Contexto**
- ✅ `submitInitialCorrectiveLog` - agregada con validaciones
- ✅ `updateWorkshopInfo` - agregada
- ✅ `submitCloseOrder` - agregada

---

## Test Cases

### **TEST 1: REPORTAR FALLA (Corrective Log)**

**Pasos:**
1. Abre un activo en el inventario
2. Haz clic en "Reportar Falla"
3. Completa el formulario:
   - Mecánico: "Juan Pérez"
   - Fecha entrada: Hoy
   - Observación: "Motor no enciende"
4. Haz clic en "Confirmar"

**Resultado Esperado:**
- ✅ El modal se cierra
- ✅ Toast exitoso: "Falla registrada correctamente"
- ✅ El activo cambia a status "NO DISPONIBLE"
- ✅ Se crea un log en `maintenance_logs` con:
  - `ficha`: AAAA01 (del activo)
  - `tipo`: CORRECTIVO
  - `fecha`: Hoy (DATE format)
  - `mecanico`: Juan Pérez
  - `descripcion`: FALLA INICIAL: Motor no enciende
  - `costo`: 0
  - `created_by`: ID del usuario logueado

**Verificación en BD:**
```sql
SELECT * FROM maintenance_logs WHERE ficha = 'AAAA01' ORDER BY created_at DESC LIMIT 1;
-- Debe mostrar el registro creado
```

---

### **TEST 2: ACTUALIZAR INFO TALLER (Workshop)**

**Pasos:**
1. En el sidebar del activo, haz clic en "Registrar Preventivo"
2. Completa:
   - Mecánico: "Carlos López"
   - Descripción: "Cambio de aceite realizado"
  - Km actual: 5000
  - Próximo mto (km/horas): 10000
3. Haz clic en "Registrar Mantenimiento"

**Resultado Esperado:**
- ✅ Toast: "Log de mantenimiento registrado"
- ✅ Se crea un log en `maintenance_logs` con:
  - `tipo`: PREVENTIVO
  - `km_recorrido`: 5000
  - `proyeccion_proxima_mto`: 10000 (hasta migrar columna numérica)

---

### **TEST 3: CIERRE DE ORDEN (Close Order)**

**Pasos (solo si activo está en taller):**
1. Activo debe estar con status "NO DISPONIBLE"
2. Haz clic en "Actualizar Estado Taller"
3. Llena los campos y haz clic en "Guardar"
4. Luego haz clic en "Cerrar Orden"
5. Completa:
   - Mecánico: "Carlos López"
   - Descripción: "Motor reparado y probado"
   - Costo: 500
   - Km: 5100
   - Próximo Mto: 10100
6. Haz clic en "Finalizar"

**Resultado Esperado:**
- ✅ Toast: "Orden de cierre registrada"
- ✅ Activo cambia a "DISPONIBLE"
- ✅ Se crea log final en `maintenance_logs`
- ✅ Se limpian campos: `numero_requisicion`, `taller_responsable`, `observacion_mecanica`, `proyeccion_salida`

---

### **TEST 4: REPORTAR INCIDENTE HSE (Safety)**

**Pasos:**
1. Abre un activo
2. Haz clic en "Reportar Incidente"
3. Completa:
   - Tipo: "ACCIDENTE"
   - Prioridad: "Alta"
   - Descripción: "Vehículo volcado en obra"
   - Asignado a: "Gerente de Seguridad"
4. Haz clic en "Reportar"

**Resultado Esperado:**
- ✅ Toast: "Reporte HSE creado"
- ✅ Se crea un registro en `safety_reports` con:
  - `ficha`: AAAA01
  - `tipo`: ACCIDENTE
  - `prioridad`: Alta
  - `descripcion`: Vehículo volcado en obra
  - `estado`: PENDIENTE
  - `reportado_por`: ID del usuario

**Verificación en BD:**
```sql
SELECT * FROM safety_reports WHERE ficha = 'AAAA01' ORDER BY fecha_reporte DESC LIMIT 1;
```

---

### **TEST 5: SOLICITAR REPUESTO (Requisition)**

**Pasos:**
1. Abre un activo disponible
2. Haz clic en "Solicitar Repuesto"
3. Completa:
   - Solicitante: Auto-llena con usuario
   - Proyecto: "Mantenimiento"
   - Prioridad: "Urgente"
   - Agregar items:
     - Cantidad: 2, Descripción: "Filtro de aire"
4. Haz clic en "Crear Requisición"

**Resultado Esperado:**
- ✅ Toast: "Requisición creada"
- ✅ Se crea en `purchase_orders` con:
  - `ficha`: AAAA01
  - `numero_requisicion`: Auto-generado
  - `estado`: PENDIENTE
  - `prioridad`: Urgente
- ✅ Activo cambia a status "ESPERA REPUESTO"

---

## Campos Correctos de Cada Tabla

### `assets`
```
id, ficha, tipo, marca, modelo, año, chasis, matricula, ubicacion_actual, status
observacion_mecanica, fecha_vencimiento_seguro, segurador, numero_poliza, paso_rapido
taller_responsable, numero_requisicion, proyeccion_entrada, proyeccion_salida
foto_url, visible, created_at, updated_at, updated_by
```

### `maintenance_logs`
```
id, ficha (NOT ficha_ref), tipo, fecha (DATE), descripcion, costo, mecanico
km_recorrido, proyeccion_proxima_mto (DATE), created_by, created_at
```

### `safety_reports`
```
id, ficha (NOT ficha_ref), tipo, prioridad, descripcion, estado
asignado_a, foto_url, notas, fecha_reporte, fecha_actualizacion
reportado_por, updated_by
```

### `purchase_orders`
```
id, ficha (NOT ficha_ref), numero_requisicion, estado, solicitante, proyecto
prioridad, comentario_recepcion, fecha_solicitud, fecha_actualizacion
created_by, updated_by
```

---

## Checklist de Validación

- [ ] Reportar Falla crea log con `ficha`, no `ficha_ref`
- [ ] Mantenimiento preventivo usa `km_recorrido`, no `km`
- [ ] Mantenimiento preventivo usa `proyeccion_proxima_mto` (temporal) o columna numérica cuando esté migrada
- [ ] Cierre de orden marca activo como `DISPONIBLE`
- [ ] Reporte HSE crea registro con `ficha`, no `ficha_ref`
- [ ] Requisición crea `purchase_order` con `ficha`, no `ficha_ref`
- [ ] Todas las fechas son DATE format (YYYY-MM-DD)
- [ ] No hay errores en console (F12)
- [ ] Los datos persisten al recargar la página

