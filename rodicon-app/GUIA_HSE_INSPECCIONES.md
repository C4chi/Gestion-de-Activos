# 📋 GUÍA DEL MÓDULO HSE - Inspecciones Dinámicas

## 🎯 ¿Qué es el Módulo HSE?

Sistema completo para realizar inspecciones de seguridad personalizadas tipo **iAuditor/SafetyCulture** con:
- ✅ Templates dinámicos personalizables
- ✅ Formularios multi-sección
- ✅ Sistema de puntuación automático
- ✅ Captura de fotos y firmas
- ✅ Reportes PDF profesionales
- ✅ Sincronización offline

---

## 👥 Roles y Permisos

| Acción | ADMIN | HSE | TALLER | COMPRAS |
|--------|-------|-----|--------|---------|
| **Ver inspecciones** | ✅ | ✅ | ❌ | ❌ |
| **Iniciar inspección** | ✅ | ✅ | ❌ | ❌ |
| **Crear templates** | ✅ | ✅ | ❌ | ❌ |
| **Editar templates** | ✅ | ✅ | ❌ | ❌ |
| **Eliminar templates** | ✅ | ✅ | ❌ | ❌ |
| **Generar reportes** | ✅ | ✅ | ❌ | ❌ |

---

## 🛠️ Tipos de Campos Disponibles

### 1. **Checkbox (☑️)**
```
Tipo: Checkbox
Uso: Preguntas SI/NO, confirmaciones
Ejemplo:
  ☑️ ¿Se usan EPP?
  ☑️ ¿Equipos certificados?
Scoring: Puede asignar puntos si se marca
```

### 2. **Single Select (Opción única)**
```
Tipo: Single Select (Botones)
Uso: Seleccionar una opción de múltiples
Ejemplo:
  🟢 Conforme
  🟡 Necesita mejora
  🔴 No conforme
Scoring: Cada opción puede tener puntos
Follow-up: Puede requerir foto/nota si se selecciona
```

### 3. **Select (Dropdown)**
```
Tipo: Select
Uso: Menú desplegable con opciones
Scoring: Cada opción puede tener diferentes puntos
```

### 4. **Text (Texto)**
```
Tipo: Text
Uso: Respuestas cortas
Validación: Min/max caracteres, patrones
```

### 5. **Textarea (Texto largo)**
```
Tipo: Textarea
Uso: Comentarios, observaciones
Validación: Límites de caracteres
```

### 6. **Number (Número)**
```
Tipo: Number
Uso: Valores numéricos
Validación: Min/max, decimales
```

### 7. **Asset (Activo)**
```
Tipo: Asset
Uso: Seleccionar un activo/equipo
Carga automáticamente activos disponibles
```

### 8. **Location (Ubicación)**
```
Tipo: Location
Uso: Seleccionar ubicación
Carga ubicaciones desde activos
```

### 9. **Signature (Firma)**
```
Tipo: Signature
Uso: Capturar firma del inspector/responsable
Dibuja o escribe el nombre
```

### 10. **Photo (Foto)**
```
Tipo: Photo
Uso: Capturar fotografías
Cámara del dispositivo
```

---

## 🎨 Creando un Template

### **Paso 1: Ir a Template Builder**
1. Sidebar → "Inspecciones HSE"
2. Botón "Crear Template" (solo ADMIN/HSE)
3. O editar un template existente

### **Paso 2: Información Básica**
```
Nombre: "Inspección de Seguridad - Taller"
Descripción: "Verificación de medidas de seguridad en el taller"
Categoría: SAFETY (o custom)
Prioridad: MEDIA
```

### **Paso 3: Configurar Secciones**
Cada template tiene múltiples secciones (páginas):
```
Sección 1: Datos iniciales
  - Activo (obligatorio)
  - Ubicación (obligatorio)
  - Inspector (nombre)

Sección 2: Inspección de seguridad
  - EPP utilizado
  - Equipos certificados
  - Condiciones del taller

Sección 3: Observaciones
  - Comentarios generales
  - Fotos de evidencia
  - Firma
```

### **Paso 4: Configurar Scoring**
```
Puntuación habilitada: ✅
Escala: 0-100
Mínimo requerido: 70%

Cada opción puede asignar puntos:
  🟢 Conforme = 10 pts
  🟡 Necesita mejora = 5 pts
  🔴 No conforme = 0 pts
```

### **Paso 5: Campos Condicionales (Opcional)**
Mostrar/ocultar campos según respuestas anteriores:
```
Si selecciona "No conforme" → Mostrar campo de foto
Si selecciona "Necesita mejora" → Mostrar campo de nota
```

---

## ✔️ Realizando una Inspección

### **Paso 1: Iniciar**
1. Sidebar → "Inspecciones HSE"
2. Botón "+ Iniciar inspección"
3. Seleccionar template

### **Paso 2: Completar Formulario**
- Llenar cada sección (página por página)
- Campos obligatorios marcados con *
- Los errores se muestran en rojo
- Botón "Siguiente" para pasar a sección siguiente

### **Paso 3: Capturar Evidencia**
- Fotos: Cámara del dispositivo
- Firma: Dibujar o escribir en pantalla
- Se guardan automáticamente

### **Paso 4: Revisar Puntuación**
- En tiempo real se muestra el score
- Barra de progreso verde/roja
- Si está por debajo del mínimo, aparece aviso

### **Paso 5: Completar**
- Botón "Completar Inspección" en última sección
- Se calcula automáticamente:
  - Puntuación final
  - ¿Pasó la inspección? (Sí/No)
  - Acciones correctivas sugeridas

---

## 📊 Estados de Inspección

| Estado | Significado | Acción |
|--------|------------|--------|
| **DRAFT** | Borrador (incompleta) | Puede continuar editando |
| **COMPLETED** | Completada | Genera PDF, puede revisar |
| **APPROVED** | Aprobada | Inspector la revisó y pasó |
| **REJECTED** | Rechazada | Requiere acciones correctivas |

---

## 📄 Generando Reportes

### **PDF Profesional**
Incluye:
- ✅ Datos de la inspección
- ✅ Template utilizado
- ✅ Respuestas completas
- ✅ Fotos/evidencias
- ✅ Puntuación y resultado
- ✅ Firma del inspector
- ✅ Acciones correctivas

```
Botón: "Descargar PDF"
Formato: Listo para imprimir
Nombre: "Inspeccion_[Activo]_[Fecha].pdf"
```

---

## 🔧 Campos con Follow-up

Cuando configuras opciones en **Single Select**, puedes requerir:

```
Si selecciona "No conforme" → Requiere:
  📸 Foto (evidencia del problema)
  📝 Nota (descripción del problema)
  ⚡ Campo adicional (acciones a tomar)
```

Estos campos aparecen automáticamente según la selección.

---

## 💾 Sincronización Offline

Si no hay conexión:
- ✅ Puedes seguir completando inspecciones
- ✅ Se guardan localmente en el dispositivo
- ✅ Al volver a conectar, se sincronizan automáticamente
- ✅ Botón "Sincronizar" en dashboard

---

## 🎯 Casos de Uso

### **1. Inspección de Seguridad en Taller**
- Template con secciones de EPE, equipos, condiciones
- Scoring automático
- Fotos de incumplimientos
- Acciones correctivas

### **2. Auditoría de Mantenimiento**
- Verificar completitud de tareas
- Checklist de mantenimiento
- Firma del responsable

### **3. Inspección Pre-Viaje**
- Condiciones del vehículo
- Seguridad del driver
- Documentación requerida

### **4. Cumplimiento de Procedimientos**
- Verificación de protocolos
- Fotografía de cumplimiento
- Firma de conformidad

---

## 📞 Tips Útiles

1. **Templates reutilizables:**
   - Crea templates genéricos que puedas duplicar
   - Edita un template antes de usar para personalizarlo

2. **Scoring inteligente:**
   - Define umbrales realistas (70% es estándar)
   - No todas las preguntas necesitan puntos

3. **Campos condicionales:**
   - Usa para no confundir al inspector con campos innecesarios
   - Ejemplo: Solo mostrar campo de foto si detecta problema

4. **Mobile-first:**
   - Templates diseñados para usarse en móvil/tablet
   - Fotos se toman desde la cámara del dispositivo
   - Interfaz táctil optimizada

5. **Reportes:**
   - Genera PDF inmediatamente después de completar
   - Envía por correo o guarda en dispositivo

---

## 🚀 Workflow Completo

```
ADMIN/HSE crea template
        ↓
Inspector recibe tarea
        ↓
Realiza inspección en campo (con móvil)
        ↓
Completa todas las secciones
        ↓
Captura fotos y firma
        ↓
Sistema calcula score automáticamente
        ↓
Se genera PDF
        ↓
Inspección completada ✅
        ↓
Acciones correctivas (si aplica)
```

---

## 📝 Próximas Mejoras

- [ ] Sincronización offline mejorada
- [ ] Asignación de tareas a inspectores
- [ ] Workflow de aprobaciones
- [ ] Integración con alertas/notificaciones
- [ ] Dashboard de cumplimiento

---

**Última actualización:** Enero 23, 2026
