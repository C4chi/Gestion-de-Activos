# 📦 Guía: Sistema de EPP Almacén

## ✅ Cambios Realizados

### 1. **Corrección del SQL**
- Arreglado error de sintaxis en `MIGRATION_EPP_ALMACEN.sql`
- Ahora incluye correctamente el `INSERT INTO epp` con 10 ítems de ejemplo

### 2. **Nueva Tab: Crear EPP**
Se agregó una nueva pestaña **"⚙️ Crear EPP"** en el panel de almacén para que puedas:
- ✅ Crear nuevos EPP sin necesidad de SQL
- ✅ Definir: Nombre, Código único, Categoría, Descripción, Cantidad mínima, Precio
- ✅ Ver lista de EPP disponibles en tiempo real

### 3. **Dropdown Automático**
Los formularios de **Entrada/Salida/Transferencia** ya usan:
- ✅ Dropdown con lista de EPP disponibles
- ✅ Muestra nombre y código
- ✅ Más fácil de seleccionar

---

## 🚀 Cómo Usar

### **Paso 1: Ejecutar la Migración SQL**

1. Ve a tu panel de Supabase
2. Abre **SQL Editor**
3. Copia el contenido de `MIGRATION_EPP_ALMACEN.sql`
4. Ejecuta (Cmd + Enter)
5. Verifica que no haya errores

**Espera**: Se crearán automáticamente:
- ✅ 3 almacenes (Principal, Taller, HSE)
- ✅ 10 EPP de ejemplo (Cascos, Guantes, Botas, etc.)

---

### **Paso 2: Crear Nuevos EPP**

1. Abre la app → Haz login
2. Click en **"📦 EPP Almacén"** en la barra lateral
3. Ve a la pestaña **"⚙️ Crear EPP"**
4. Completa el formulario:
   - **Nombre**: "Casco Amarillo 2024"
   - **Código**: "CASCO-2024" (único, no puede repetirse)
   - **Categoría**: Selecciona de la lista
   - **Descripción**: Detalles opcionales
   - **Cantidad Mínima**: 5
   - **Precio Unitario**: 45.00 (opcional)
5. Click en **"✓ Crear EPP"**
6. ✅ Aparecerá en la lista de "EPP Disponibles"

**Notas**:
- El código DEBE ser único (no puede haber dos iguales)
- Si hay error de código duplicado, cambia el código
- Los campos con * son obligatorios

---

### **Paso 3: Registrar Entrada de EPP**

1. Pestaña **"📦 Inventario"**
2. Sección **"📥 Registrar Entrada"**
3. Completa:
   - **Seleccionar EPP**: Click en dropdown → elige el EPP
   - **Cantidad**: Número de unidades que entran
   - **Observaciones**: (opcional) "Compra a Proveedor XYZ"
4. Click en **"📥 Registrar Entrada"**
5. ✅ Se registrará automáticamente

---

### **Paso 4: Registrar Salida de EPP**

1. Pestaña **"📦 Inventario"**
2. Sección **"📤 Registrar Salida"** (naranja)
3. Igual que entrada, pero para entregas
4. ✅ Se deducirá del inventario

---

### **Paso 5: Transferencias Entre Almacenes**

1. Pestaña **"🔄 Transferencias"**
2. Completa:
   - **Seleccionar EPP**: El EPP a transferir
   - **Almacén Origen**: De dónde sale
   - **Almacén Destino**: A dónde va
   - **Cantidad**: Cuántos se transfieren
3. Click en **"🔄 Realizar Transferencia"**
4. ✅ Se crea entrada en destino y salida en origen

---

### **Paso 6: Requisiciones de Compra**

1. Pestaña **"🛒 Requisiciones"**
2. Completa:
   - **Seleccionar EPP**: Qué falta
   - **Cantidad Solicitada**: Cuántos necesitas
3. Click en **"🛒 Crear Requisición"**
4. ✅ Aparecerá en lista con estado **PENDIENTE**

---

### **Paso 7: Asignaciones a Activos/Empleados**

1. Pestaña **"👥 Asignaciones"**
2. Opción A - **Asignar a Activo**:
   - EPP → Selecciona de dropdown
   - Activo → Selecciona de lista (máquinas, herramientas)
   - Cantidad y observaciones
   - Click **"👥 Asignar a Activo"**
3. Opción B - **Asignar a Empleado**:
   - EPP → Selecciona de dropdown
   - Empleado → Selecciona de lista
   - Cantidad y observaciones
   - Click **"👥 Asignar a Empleado"**
4. ✅ Aparecerá en lista de asignaciones activas
5. Cuando se devuelve: Click **"✓ Devolver"**

---

### **Paso 8: Ver EPP en Detalle de Activo**

1. Abre cualquier **Activo/Máquina**
2. En el panel derecho, verás nueva pestaña **"EPP"**
3. Muestra todos los EPP asignados a ese activo:
   - Nombre, código
   - Cantidad
   - Fecha de asignación
   - Estado

---

### **Paso 9: Historial**

1. Pestaña **"📋 Historial"**
2. Tabla con últimos 30 movimientos:
   - Fecha
   - EPP
   - Tipo (ENTRADA/SALIDA/TRANSFERENCIA)
   - Cantidad
   - Observaciones

---

## 📊 Estadísticas (Dashboard)

En la parte superior ves 4 números:
- **Total EPP**: Cuántos tipos de EPP existen
- **Stock Bajo**: Cuántos están por debajo de cantidad mínima
- **Asignaciones Activas**: Cuántos EPP están asignados
- **Requisiciones Pendientes**: Cuántas compras están por aprobar

---

## 🎯 Categorías de EPP

Puedes usar cualquiera de estas al crear EPP:
- 🪖 Cascos
- 🧤 Guantes
- 👓 Lentes
- 🪢 Arneses
- 😷 Respiradores
- 👢 Botas
- ⚙️ Cinturones
- 🚒 Extintores
- 🔺 Conos
- 📦 Kits
- 📋 Otro

---

## ⚠️ Problemas Comunes

**Problema**: "El código de EPP ya existe"
- **Solución**: Cambia el código por uno único (ej: CASCO-2024 en lugar de CASCO-001)

**Problema**: No aparecen EPP en dropdown
- **Solución**: 
  1. Verifica que ejecutaste la migración SQL
  2. Recarga la página (F5)
  3. Asegúrate de que los EPP estén marcados como `activo = true`

**Problema**: No puedo asignar EPP a un activo
- **Solución**:
  1. El EPP debe existir (en dropdown)
  2. El activo debe existir y estar activo
  3. Rellena todos los campos

**Problema**: Stock no cuadra
- **Solución**: Revisa el historial para ver todas las salidas/entradas
- Las transferencias crean 2 movimientos (salida en origen + entrada en destino)

---

## 🔐 Permisos

Pueden acceder a EPP Almacén:
- ✅ ADMIN
- ✅ ADMIN_GLOBAL
- ✅ HSE
- ✅ GERENTE

Otros roles: No verán el botón "📦 EPP Almacén"

---

## 📱 Interfaz

- **Dropdown de Almacén**: Arriba a la derecha para cambiar de almacén
- **Pestañas Horizontales**: Desliza para ver todas las opciones
- **Color Coding**:
  - 🟢 Verde = Entrada
  - 🟠 Naranja = Salida
  - 🟣 Púrpura = Transferencias
  - 🟡 Amarillo = Requisiciones
  - 🔵 Azul = Crear/Historial

---

## ✅ Checklist de Setup

- [ ] Ejecuté el SQL en Supabase
- [ ] Veo 3 almacenes en el dropdown
- [ ] Veo 10 EPP de ejemplo en la lista
- [ ] Puedo crear un nuevo EPP
- [ ] Puedo registrar una entrada
- [ ] Puedo registrar una salida
- [ ] Puedo hacer una transferencia
- [ ] Veo historial actualizado
- [ ] Puedo asignar EPP a activos
- [ ] Veo EPP en panel de activo

---

**¡Listo! Tu sistema de EPP Almacén está completo** 🎉

Si hay problemas, revisa los logs de Supabase o comparte el error.
