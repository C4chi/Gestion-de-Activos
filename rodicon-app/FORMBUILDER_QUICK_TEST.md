# ✅ FormBuilder - Checklist de Prueba Rápida

## 🚀 Inicio Rápido (5 minutos)

### Paso 1: Ejecutar Migración (Una sola vez)
```sql
-- En Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
-- Copia y pega el contenido de: MIGRATION_HSE_DYNAMIC_FORMS.sql
-- Click "RUN"
-- ✅ Debe completar sin errores
```

### Paso 2: Iniciar App
```bash
npm run dev
# Abre: http://localhost:5174 (o el puerto que te indique)
```

### Paso 3: Acceder al FormBuilder
1. **Login** con usuario ADMIN o HSE
2. Click en **"Inspecciones HSE"** (sidebar, ícono ClipboardCheck)
3. Click en **"Gestionar Plantillas"** (botón morado)

---

## 🧪 Test 1: Crear Plantilla Básica (2 minutos)

### Configuración General
- [ ] Nombre: `Test Básico`
- [ ] Descripción: `Plantilla de prueba`
- [ ] Categoría: `General`
- [ ] Scoring: Dejar deshabilitado

### Sección 1
- [ ] Click "Agregar Sección"
- [ ] Título: `Información`
- [ ] Arrastra **"Texto Corto"** desde sidebar
- [ ] Click en el campo → Configurar:
  - Label: `Nombre del Inspector`
  - Obligatorio: ✅ Marcar
- [ ] Arrastra **"Fecha"**
- [ ] Click en campo → Label: `Fecha de Inspección`

### Guardar
- [ ] Click **"Guardar Plantilla"**
- [ ] Verifica mensaje de éxito
- [ ] Cierra el builder
- [ ] Verifica que aparece en la lista de templates

---

## 🧪 Test 2: Lógica Condicional (3 minutos)

### Nueva Plantilla
- [ ] Click "Gestionar Plantillas"
- [ ] Nombre: `Test Lógica`

### Sección: Inspección
- [ ] Agregar sección
- [ ] Título: `Inspección`

### Campo Padre (Condición)
- [ ] Arrastra **"Lista Desplegable"** (select)
- [ ] Click en el campo → Configurar:
  - Label: `¿Estado del equipo?`
  - Click "Agregar Opción":
    - Opción 1: `Bueno`
    - Opción 2: `Malo`

### Campo Condicional
- [ ] Arrastra **"Texto Largo"** (textarea)
- [ ] Click en el campo → Configurar:
  - Label: `Descripción del problema`
  - Scroll down → ⚡ **Lógica Condicional:** ✅ Marcar
  - **Campo:** Seleccionar `¿Estado del equipo?`
  - **Operador:** `Es igual a`
  - **Valor:** Seleccionar `Malo`

### Probar Vista Previa
- [ ] Click **"Vista Previa"** (ícono ojo)
- [ ] En la preview:
  - Selecciona "Bueno" → Campo "Descripción" NO debe verse
  - Selecciona "Malo" → Campo "Descripción" DEBE aparecer
- [ ] **✅ Si funciona:** La lógica está OK

### Guardar
- [ ] Click "Guardar Plantilla"

---

## 🧪 Test 3: Scoring (2 minutos)

### Nueva Plantilla con Scoring
- [ ] Nombre: `Test Scoring`
- [ ] **Habilitar Scoring:** ✅ Marcar
- [ ] Puntaje máximo: `100`
- [ ] Puntaje mínimo: `70`

### Sección con Campos Puntuados
- [ ] Agregar sección: `Criterios`
- [ ] Arrastra **"Casilla de Verificación"** (checkbox)
- [ ] Configurar:
  - Label: `¿Cumple requisito 1?`
  - Scroll → **Habilitar Puntuación:** ✅
  - Peso: `1`
  - Tipo: `Pasa/Falla`

- [ ] Arrastra otro **"Casilla de Verificación"**
- [ ] Configurar:
  - Label: `¿Cumple requisito 2?`
  - **Habilitar Puntuación:** ✅
  - Peso: `1`
  - Tipo: `Pasa/Falla`

### Guardar
- [ ] Click "Guardar Plantilla"

---

## 🧪 Test 4: Usar Template en Inspección (3 minutos)

### Crear Inspección
- [ ] Volver a **"Inspecciones HSE"**
- [ ] Click **"Nueva Inspección"** (botón azul +)
- [ ] Seleccionar template: `Test Lógica`
- [ ] Click "Seleccionar"

### Completar Formulario
- [ ] Verifica que se renderiza el form correctamente
- [ ] Selecciona "Malo" en `¿Estado del equipo?`
- [ ] **✅ Verifica:** Campo "Descripción del problema" aparece
- [ ] Escribe algo en "Descripción"
- [ ] Cambia a "Bueno"
- [ ] **✅ Verifica:** Campo "Descripción" desaparece
- [ ] Click **"Enviar Inspección"**

### Verificar Guardado
- [ ] Verifica que aparece en la lista
- [ ] Click en la inspección
- [ ] Verifica que se guardaron los datos
- [ ] **✅ Si funciona:** Todo OK!

---

## 🧪 Test 5: Editar Plantilla (Pendiente Implementar)

### Actualmente
- ❌ No hay botón "Editar" en la lista de templates
- ✅ Pero el componente TemplateBuilder YA soporta edición

### Para Implementar (5 min)
Agregar en InspectionsDashboard donde se listan templates:
```jsx
<button
  onClick={() => {
    setEditingTemplateId(template.id);
    setShowTemplateBuilder(true);
  }}
  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  ✏️ Editar
</button>
```

---

## ✅ Checklist de Validación Final

### Funcionalidad Básica
- [ ] FormBuilder abre sin errores
- [ ] Se pueden crear secciones
- [ ] Drag & drop de campos funciona
- [ ] Configuración de campos funciona
- [ ] Se puede guardar plantilla
- [ ] Plantilla aparece en lista

### Lógica Condicional
- [ ] Se puede agregar lógica a un campo
- [ ] Vista previa muestra/oculta campos correctamente
- [ ] En inspección real, la lógica funciona
- [ ] Múltiples condiciones funcionan

### Scoring
- [ ] Se puede habilitar scoring en template
- [ ] Se puede configurar peso en campos
- [ ] Score se calcula automáticamente
- [ ] Badge "Aprobado/No Aprobado" funciona

### Tipos de Campo
- [ ] Text funciona
- [ ] Textarea funciona
- [ ] Number funciona
- [ ] Date funciona
- [ ] Select funciona (con opciones)
- [ ] Checkbox funciona
- [ ] Photo funciona (upload)
- [ ] Signature funciona (canvas)
- [ ] Rating funciona (estrellas)

### Integración
- [ ] Templates creados aparecen en TemplateSelector
- [ ] FormRenderer renderiza templates correctamente
- [ ] Se pueden crear inspecciones
- [ ] Inspecciones se guardan en BD
- [ ] Offline sync funciona (si se desconecta internet)

---

## 🐛 Si Algo Falla

### Error: "sections is undefined"
```
Causa: No ejecutaste la migración SQL
Solución: Ejecuta MIGRATION_HSE_DYNAMIC_FORMS.sql en Supabase
```

### Error: "Cannot read property 'enabled'"
```
Causa: scoring_config no está inicializado
Solución: Ya está arreglado en el código, verifica que estás usando la última versión
```

### Drag & Drop no funciona
```
Causa: Navegador viejo o JavaScript deshabilitado
Solución: Usa Chrome/Edge/Firefox actualizado
```

### No aparece botón "Gestionar Plantillas"
```
Causa: Usuario sin permisos
Solución: En tabla `usuarios`, asigna rol 'ADMIN' o 'HSE'
```

### Lógica condicional no funciona
```
Causa: FormRenderer no tiene evaluateCondition()
Solución: Ya está implementado, verifica console.log para debuggear
```

---

## 📊 Resultados Esperados

### Al Completar Todos los Tests:
✅ 3 templates creados (`Test Básico`, `Test Lógica`, `Test Scoring`)  
✅ 1 inspección completada usando template con lógica  
✅ Lógica condicional funcionando en tiempo real  
✅ Scoring calculándose automáticamente  
✅ Vista previa mostrando form correctamente  

### Tiempo Total: ~15 minutos
- Test 1: 2 min
- Test 2: 3 min
- Test 3: 2 min
- Test 4: 3 min
- Test 5: Pendiente (5 min adicionales cuando se implemente)

---

## 🎯 Próximo Paso

Si todos los tests pasan: **🎉 ¡El FormBuilder está 100% funcional!**

Puedes comenzar a:
1. Crear templates reales de producción
2. Entrenar a usuarios HSE
3. Migrar inspecciones del sistema viejo

Si algún test falla:
1. Revisa la consola del navegador (F12)
2. Verifica que ejecutaste la migración SQL
3. Revisa `FORMBUILDER_USAGE_GUIDE.md` para más detalles
4. Consulta `FORMBUILDER_IMPLEMENTATION_SUMMARY.md` para troubleshooting

---

**🚀 ¡Comienza a probar!**
