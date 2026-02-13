# ✅ CHECKLIST: Lo que Te Falta Para Completar el Sistema

**Fecha:** 13 de febrero de 2026  
**Estado:** Código completado ✅ | Base de datos pendiente ⏸️

---

## 🟢 **YA COMPLETADO (Código)**

✅ Componentes React creados y compilados:
- `MaintenanceRequestForm.jsx` - Formulario mobile-friendly
- `MaintenanceRequestValidator.jsx` - Panel de validación  
- Integrados en `App.jsx` con lazy loading
- Botones agregados en `Sidebar.jsx`

✅ Migración SQL creada:
- `MIGRATION_MAINTENANCE_REQUESTS.sql` - Corregida y lista

✅ Build exitoso:
- Nuevos chunks: MaintenanceRequestForm (9.10 kB), MaintenanceRequestValidator (12.20 kB)
- Todo pusheado a GitHub main branch

---

## 🔴 **PENDIENTE (Debes hacer TÚ)**

### **PASO 1: Ejecutar Migraciones SQL en Supabase**

⚠️ **IMPORTANTE:** Ejecutar en este orden exacto

#### **1.1 - Primera migración (si no ejecutaste antes):**
```sql
-- Archivo: MIGRATION_ASSET_KM_HOURS.sql
-- Agrega: kilometraje_actual, horometro_actual, tipo_medicion a tabla assets
-- Crea: vista asset_maintenance_status
```

**Cómo ejecutar:**
1. Abre Supabase → SQL Editor
2. Abre archivo `MIGRATION_ASSET_KM_HOURS.sql` en VS Code
3. Copia **TODO** el contenido
4. Pega en Supabase SQL Editor
5. Click "Run" (▶️)
6. Verifica mensaje: "Success. No rows returned"

---

#### **1.2 - Segunda migración (si no ejecutaste antes):**
```sql
-- Archivo: MIGRATION_MAINTENANCE_TIPO_MEDICION.sql
-- Agrega: tipo_medicion a maintenance_logs
-- Actualiza: vista asset_maintenance_status con soporte KM/HORAS
```

**Cómo ejecutar:**
1. Supabase → SQL Editor
2. Copia contenido de `MIGRATION_MAINTENANCE_TIPO_MEDICION.sql`
3. Pega y ejecuta
4. Verifica éxito

---

#### **1.3 - Tercera migración (NUEVA - ejecutar ahora):**
```sql
-- Archivo: MIGRATION_MAINTENANCE_REQUESTS.sql
-- Crea: tabla maintenance_requests
-- Crea: funciones aprobar/rechazar solicitudes
-- Crea: vistas pending/full
-- Crea: trigger de notificaciones
```

**Cómo ejecutar:**
1. Supabase → SQL Editor
2. Copia contenido de `MIGRATION_MAINTENANCE_REQUESTS.sql`
3. Pega y ejecuta
4. Verifica éxito

**Verificar que se creó correctamente:**
```sql
-- Ejecuta estas queries para verificar:
SELECT * FROM maintenance_requests LIMIT 1;
SELECT * FROM maintenance_requests_pending;
\df aprobar_solicitud_mantenimiento
```

---

### **PASO 2: Crear Bucket de Storage en Supabase**

⚠️ **REQUERIDO** para que funcionen las fotos

**Pasos:**
1. Abre Supabase Dashboard
2. Ve a: **Storage** (menú izquierdo)
3. Click: **"New Bucket"**
4. Configuración:
   - **Name:** `evidencias`
   - **Public bucket:** ✅ **ACTIVADO** (importante)
   - **Allowed MIME types:** image/*, video/*
   - **File size limit:** 5 MB (o lo que prefieras)
5. Click: **"Create bucket"**

**Verificar que funciona:**
- Debería aparecer bucket `evidencias` en la lista
- Prueba subir una imagen manualmente para verificar

**Configurar políticas de acceso (si no son automáticas):**
```sql
-- Permitir INSERT para usuarios autenticados
CREATE POLICY "Allow upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidencias');

-- Permitir SELECT público (para ver las fotos)
CREATE POLICY "Public access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'evidencias');
```

---

### **PASO 3: Refrescar la Aplicación**

Después de ejecutar las migraciones:

1. **En tu navegador:**
   - Refresca la página (F5 o Ctrl+R)
   - Verifica que aparecen los nuevos botones en el menú:
     - 🟠 **Reportar Problema**
     - ✅ **Validar Solicitudes**

2. **Verifica permisos:**
   - "Reportar Problema" debe estar disponible para TODOS los usuarios
   - "Validar Solicitudes" solo para: ADMIN, TALLER, SUPERVISOR

---

## 🧪 **PASO 4: Probar el Sistema**

### **Test 1: Crear Solicitud (como OPERADOR)**

1. Click en: **🟠 Reportar Problema**
2. Llenar formulario:
   - Seleccionar equipo
   - Título: "Prueba - Ruido motor"
   - Categoría: Mecánico
   - Prioridad: Media
   - (Opcional) Subir foto
   - (Opcional) Capturar GPS
3. Click: **Enviar Solicitud**
4. Verificar toast: "✅ Solicitud enviada a Mantenimiento"

### **Test 2: Validar Solicitud (como SUPERVISOR/ADMIN)**

1. Click en: **✅ Validar Solicitudes**
2. Debería aparecer la solicitud creada en Test 1
3. Click: **Ver** en la solicitud
4. Revisar detalles
5. Escribir comentario (opcional)
6. Click: **Aprobar y Crear OT**
7. Verificar:
   - Toast: "✅ Solicitud aprobada. OT #XX creada"
   - La solicitud desaparece de pendientes
   - En menú **Taller** → Debe aparecer la OT en columna "ABIERTA"

### **Test 3: Verificar OT Generada**

1. Ir a: **Taller** (menú lateral)
2. Verificar que existe OT con:
   - Título igual a la solicitud
   - Tipo: CORRECTIVO
   - Descripción incluye: "🔗 Solicitado por: [nombre]"
   - Estado: ABIERTA

### **Test 4: Rechazar Solicitud**

1. Crear nueva solicitud
2. Ir a: **Validar Solicitudes**
3. Click: **Ver**
4. Escribir comentario: "No es necesario, solo ajustar presión"
5. Click: **Rechazar**
6. Verificar que desaparece de pendientes

---

## 🐛 **TROUBLESHOOTING**

### **Error: "relation maintenance_requests does not exist"**
**Solución:** No ejecutaste `MIGRATION_MAINTENANCE_REQUESTS.sql`  
**Fix:** Ejecuta la migración en Supabase SQL Editor

---

### **Error: "column a.nombre does not exist" (al ejecutar migración)**
**Solución:** Ya está corregido en la última versión  
**Fix:** Usa la migración actualizada del repo (commit fcf53cb o posterior)

---

### **Error: "bucket evidencias not found" (al subir fotos)**
**Solución:** No creaste el bucket de Storage  
**Fix:** Sigue PASO 2 arriba

---

### **No aparecen botones "Reportar Problema" ni "Validar"**
**Solución:** No refrescaste la app después del deploy  
**Fix:** Refresca navegador (Ctrl+R / F5) o limpia caché (Ctrl+Shift+R)

---

### **Botón "Validar Solicitudes" está deshabilitado**
**Solución:** Tu usuario no tiene rol adecuado  
**Fix:** Necesitas rol: ADMIN, TALLER, o SUPERVISOR  
Verificar en tabla `app_users` columna `rol`

---

### **No llegan notificaciones al crear solicitud**
**Solución:** Verifica que existe tabla `user_notifications`  
**Fix:** Ejecutar migración de notificaciones (si existe `MIGRATION_NOTIFICATIONS.sql`)

---

## 📊 **VERIFICAR QUE TODO FUNCIONA**

Ejecuta estas queries en Supabase para verificar:

```sql
-- 1. Verificar tabla existe
SELECT COUNT(*) FROM maintenance_requests;

-- 2. Verificar función existe
SELECT proname FROM pg_proc WHERE proname = 'aprobar_solicitud_mantenimiento';

-- 3. Verificar vista existe
SELECT * FROM maintenance_requests_pending LIMIT 1;

-- 4. Verificar bucket Storage
SELECT * FROM storage.buckets WHERE name = 'evidencias';

-- 5. Listar solicitudes de prueba
SELECT id, titulo, estado, fecha_solicitud FROM maintenance_requests;
```

---

## 🎯 **RESUMEN FINAL**

| Item | Estado | Acción Requerida |
|------|--------|------------------|
| ✅ Código React | Completado | Nada |
| ✅ Migración SQL | Creada | **Ejecutar en Supabase** |
| ⏸️ Bucket Storage | Pendiente | **Crear en Supabase** |
| ⏸️ Testing | Pendiente | **Probar flujo completo** |

---

## 📞 **Si Algo No Funciona**

1. Verifica que todas las migraciones se ejecutaron sin errores
2. Verifica que el bucket `evidencias` existe y es público
3. Refresca la aplicación
4. Revisa console del navegador (F12) para ver errores JS
5. Revisa logs de Supabase para ver errores SQL

---

## 🚀 **Próximos Módulos Disponibles**

Después de completar este módulo de Solicitudes, puedes continuar con:

1. **Integración OT → Compras** (Punto A del diagrama)
   - Solicitar repuestos desde OT pausada
   - Notificar cuando repuesto llega

2. **Checklist de Inspección Digital**
   - Plantillas personalizables
   - Genera OT automática si falla

3. **Calendario de Programación Preventiva**
   - Vista mensual/semanal
   - Drag & drop para reprogramar

**¿Cuál prefieres implementar ahora?** 🎯

---

**Última actualización:** 13 de febrero de 2026  
**Commits relacionados:** a386e2e, 6a9e7f5  
**Build:** ✅ Exitoso
