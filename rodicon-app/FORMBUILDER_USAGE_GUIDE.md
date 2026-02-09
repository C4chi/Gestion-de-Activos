# 📋 Guía de Uso: FormBuilder HSE

## ✅ FormBuilder Completado e Integrado

El **FormBuilder Visual** está ahora completamente implementado y te permite crear plantillas de inspección dinámicas con lógica condicional, igual que SafetyCulture.

---

## 🚀 Cómo Acceder

### Opción 1: Desde Inspecciones HSE
1. Inicia sesión en la app
2. Click en **"Inspecciones HSE"** en el sidebar (ícono ClipboardCheck)
3. Click en el botón morado **"Gestionar Plantillas"**

### Opción 2: Desde App.jsx (si lo integras en sidebar)
- El overlay `TEMPLATE_BUILDER` ya está listo en App.jsx

---

## 🎨 Características del FormBuilder

### 1️⃣ **Información General de la Plantilla**
- **Nombre:** Ej: "Inspección de Seguridad Vehicular"
- **Descripción:** Detalle de qué se inspecciona
- **Categoría:** General, Vehicular, Instalaciones, EPT, Incidentes, Auditorías
- **Scoring:** Activar puntuación con puntaje máximo y mínimo

### 2️⃣ **Tipos de Campo Disponibles** (Sidebar Izquierdo)
Arrastra cualquier campo a una sección:

| Campo | Ícono | Uso |
|-------|-------|-----|
| **Texto Corto** | Type | Respuestas de 1 línea |
| **Texto Largo** | Type | Comentarios, observaciones |
| **Número** | Hash | Mediciones, cantidades |
| **Fecha** | Calendar | Fechas de eventos |
| **Fecha y Hora** | Calendar | Timestamps completos |
| **Lista Desplegable** | List | Seleccionar 1 opción |
| **Casilla** | CheckSquare | Sí/No, Cumple/No cumple |
| **Fotografía** | Image | Evidencia visual |
| **Firma** | FileSignature | Validación del inspector |
| **Calificación** | Star | Rating de 1-5 estrellas |

### 3️⃣ **Crear Secciones**
```
1. Click en "Agregar Sección"
2. Ingresa nombre: "1. Datos del Vehículo"
3. Agrega descripción opcional
4. Arrastra campos desde el sidebar
```

**Organización de Secciones:**
- ⬆️ Subir / ⬇️ Bajar secciones
- 🗑️ Eliminar sección completa

### 4️⃣ **Configurar Campos** (Click en cualquier campo)
Se abre el panel derecho de configuración:

#### Configuración Básica:
- **Etiqueta:** "¿El vehículo tiene extintor?"
- **Obligatorio:** Marcar si es requerido
- **Texto de Ayuda:** Placeholder para guiar

#### Opciones (Select/Checkbox):
```javascript
// Ejemplo de opciones con scoring
Opciones:
  - "Sí, vigente" → Puntos: 10
  - "Sí, vencido" → Puntos: 5
  - "No tiene" → Puntos: 0
```

#### Puntuación (Scoring):
- **Habilitar Puntuación:** ✅
- **Peso:** 1.0 (importancia del campo)
- **Tipo:**
  - `Pasa/Falla`: Binario (100% o 0%)
  - `Ponderado`: Basado en opciones
  - `Numérico`: Valor directo

### 5️⃣ **Lógica Condicional** ⚡ (La Magia)
Configura campos que se muestran solo si se cumple una condición:

#### Ejemplo Real:
```
Campo: "¿El extintor está vigente?"
Tipo: Select
Opciones: Sí | No

Campo Condicional: "Fecha de vencimiento del extintor"
Mostrar solo si: "¿El extintor está vigente?" == "Sí"

Campo Condicional 2: "Acción correctiva requerida"
Mostrar solo si: "¿El extintor está vigente?" == "No"
```

#### Configuración de Lógica:
1. En el campo que quieres condicionar, marca ⚡ **"Lógica Condicional"**
2. Selecciona **Campo de Referencia** (el que debe cumplirse)
3. Elige **Operador:**
   - `Es igual a`
   - `No es igual a`
   - `Contiene`
   - `Mayor que`
   - `Menor que`
4. Define **Valor** de comparación

### 6️⃣ **Vista Previa en Tiempo Real** 👁️
- Click en **"Vista Previa"** (botón ojo)
- Se abre panel derecho mostrando cómo se verá el formulario
- Prueba la lógica condicional en tiempo real

### 7️⃣ **Guardar Plantilla** 💾
- Click en **"Guardar Plantilla"** (botón azul)
- Si es nueva: Crea versión 1
- Si es edición: Crea nueva versión (versionamiento inmutable)

---

## 🔄 Editar Plantillas Existentes

Para editar una plantilla creada:

**PENDIENTE DE IMPLEMENTAR:**
1. Agregar botón "Editar" en cada template card del InspectionsDashboard
2. Llamar a `setEditingTemplateId(template.id)` y `setShowTemplateBuilder(true)`
3. El TemplateBuilder cargará la plantilla y permitirá modificarla

**Rápido:** Agregar esto al componente que lista templates:
```jsx
<button
  onClick={() => {
    setEditingTemplateId(template.id);
    setShowTemplateBuilder(true);
  }}
  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  Editar
</button>
```

---

## 📝 Ejemplo Completo: Inspección Vehicular

### Sección 1: Información General
- **Ficha del Vehículo** (Text) - Obligatorio
- **Fecha de Inspección** (Date) - Obligatorio
- **Inspector** (Text) - Obligatorio

### Sección 2: Documentación
- **¿Tiene SOAT vigente?** (Select: Sí/No) - Puntos: 20
  - **Si NO:** Mostrar campo condicional:
    - **Fecha de vencimiento del SOAT** (Date)
    - **Foto del SOAT vencido** (Photo)

### Sección 3: Equipamiento de Seguridad
- **¿Tiene extintor?** (Checkbox) - Puntos: 15
- **¿Extintor vigente?** (Select: Vigente/Vencido/No tiene)
  - **Si Vigente:** Mostrar:
    - **Fecha de recarga** (Date)
  - **Si Vencido o No tiene:** Mostrar:
    - **Acción correctiva** (Textarea)
    - **Responsable** (Text)
    - **Plazo** (Date)

### Sección 4: Estado Mecánico
- **Calificación general del vehículo** (Rating 1-5) - Puntos: 30
- **Observaciones** (Textarea)
- **Foto del vehículo** (Photo)

### Sección 5: Validación
- **Firma del Inspector** (Signature) - Obligatorio

**Scoring Total:** 100 puntos
**Puntaje Mínimo:** 70 (para pasar)

---

## 🧪 Probar el Sistema

### Paso 1: Ejecutar Migración
```sql
-- En Supabase SQL Editor, ejecutar:
-- c:\Users\masro\rodicon-app\MIGRATION_HSE_DYNAMIC_FORMS.sql
```

### Paso 2: Crear Primera Plantilla
1. `npm run dev`
2. Login → Inspecciones HSE → Gestionar Plantillas
3. Crear plantilla sencilla de prueba:
   - Nombre: "Test Básico"
   - 1 sección con 3 campos (text, select, checkbox)
   - Guardar

### Paso 3: Usar la Plantilla
1. Volver a Inspecciones HSE
2. Click "Nueva Inspección"
3. Seleccionar "Test Básico"
4. Completar formulario
5. Ver scoring automático

### Paso 4: Probar Lógica Condicional
1. Crear nueva plantilla "Test Lógica"
2. Campo 1: "¿Aprobado?" (Select: Sí/No)
3. Campo 2: "Motivo de rechazo" (Textarea)
   - Lógica: Mostrar si "¿Aprobado?" == "No"
4. Guardar y probar en inspección

---

## 🎯 Próximos Pasos

### ✅ Completado
- [x] FormBuilder visual con drag-drop
- [x] Configuración de campos
- [x] Lógica condicional
- [x] Vista previa
- [x] Integración en app

### 🔜 Mejoras Futuras
- [ ] Botón "Editar" en lista de templates
- [ ] Duplicar plantilla existente
- [ ] Importar/Exportar templates (JSON)
- [ ] Librería de templates predefinidos
- [ ] Editor de scoring más avanzado
- [ ] Drag & drop para reordenar campos

---

## 🐛 Troubleshooting

### Error: "Cannot read property 'sections' of undefined"
**Solución:** Ejecuta la migración SQL en Supabase primero.

### No aparece "Gestionar Plantillas"
**Solución:** Verifica que tu usuario tenga rol `ADMIN` o `HSE`.

### Los campos condicionales no se ocultan
**Solución:** Verifica que FormRenderer.jsx tenga la lógica de `evaluateCondition()`.

### No se guardan las plantillas
**Solución:** 
1. Verifica que existe la tabla `hse_templates` en Supabase
2. Revisa la consola del navegador para errores
3. Verifica que `hseService.js` esté usando las funciones actualizadas

---

## 📚 Archivos Relacionados

- **FormBuilder:** `src/components/HSE/TemplateBuilder.jsx` (950 líneas)
- **Renderer:** `src/components/HSE/FormRenderer.jsx` (850 líneas)
- **Servicio:** `src/services/hseService.js` (actualizado)
- **Dashboard:** `src/components/HSE/InspectionsDashboard.jsx`
- **Migración:** `MIGRATION_HSE_DYNAMIC_FORMS.sql`

---

## 🎓 Tips de Uso

1. **Nomenclatura Clara:** Usa nombres descriptivos para secciones y campos
2. **Secciones Lógicas:** Agrupa campos relacionados
3. **Scoring Proporcional:** Distribuye puntos según importancia
4. **Lógica Simple:** No sobre-compliques las condiciones
5. **Testing:** Prueba cada template antes de usarlo en producción
6. **Versionamiento:** Cada edición crea nueva versión, no pierdas historial

---

## 💡 Ejemplos de Lógica Condicional

### Ejemplo 1: Campo Dependiente Simple
```
Campo A: "¿Requiere acción correctiva?" (Checkbox)
Campo B: "Descripción de la acción" (Textarea)
Lógica: Mostrar B si A == true
```

### Ejemplo 2: Múltiples Opciones
```
Campo A: "Estado del equipo" (Select: Bueno/Regular/Malo)
Campo B: "Fecha de próxima revisión" (Date)
Campo C: "Reparación inmediata requerida" (Textarea)

Lógica B: Mostrar si A == "Bueno"
Lógica C: Mostrar si A == "Malo"
```

### Ejemplo 3: Cadena de Condiciones
```
Campo A: "¿Tiene equipo de protección?" (Select: Sí/No)
Campo B: "Tipo de EPT" (Select)
  Lógica: Mostrar si A == "Sí"
Campo C: "¿EPT en buen estado?" (Checkbox)
  Lógica: Mostrar si B != ""
Campo D: "Acción correctiva" (Textarea)
  Lógica: Mostrar si C == false
```

---

**🎉 Ya tienes un sistema completo de inspecciones dinámicas nivel SafetyCulture!**
