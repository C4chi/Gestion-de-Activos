# Guía del Sistema de Presets para Selección Simple

## 📋 Resumen

El sistema de presets permite crear y reutilizar conjuntos de opciones predefinidas para campos de **Selección única** en las plantillas HSE, ahorrando tiempo y estandarizando respuestas.

---

## 🎯 Presets Predefinidos

### 1. **Calidad**
- 🟢 Buena
- 🟡 Razonable
- 🔴 Deficiente

### 2. **Seguridad**
- 🟢 Seguro
- 🔴 En riesgo
- ⚪ N/A

### 3. **Aprobación**
- 🟢 Aprueba
- 🔴 Falla
- ⚪ N/A

### 4. **Sí/No**
- 🟢 Sí
- 🔴 No

### 5. **Cumplimiento**
- 🟢 Cumple
- 🔴 No cumple
- ⚪ N/A

---

## 🚀 Cómo Usar Presets

### Aplicar un Preset Existente

1. **Crear o editar plantilla**
   - Ve a HSE → Plantillas → Nueva Plantilla

2. **Agregar campo de Selección única**
   - Click en "Agregar pregunta"
   - Selecciona el nuevo campo
   - En el panel derecho, cambia tipo a "🔘 Selección única"

3. **Seleccionar preset**
   - En la sección "Usar preset:", verás botones con los presets disponibles
   - Click en cualquier preset (ej: "Calidad")
   - Las opciones se aplicarán automáticamente

4. **Personalizar (opcional)**
   - Edita las opciones generadas
   - Cambia colores
   - Agrega o elimina opciones

---

## 💾 Crear Preset Personalizado

### Paso a Paso

1. **Configura las opciones manualmente**
   ```
   Ejemplo para "Estado del Equipo":
   - 🟢 Operativo
   - 🟡 Mantenimiento Preventivo
   - 🔴 Fuera de Servicio
   - ⚪ En Reparación
   ```

2. **Guardar como preset**
   - Click en "💾 Guardar preset" (arriba del selector de presets)
   - Modal aparecerá

3. **Nombrar el preset**
   - Ingresa nombre descriptivo: "Estado del Equipo"
   - Presiona Enter o click en "Guardar preset"

4. **Confirmación**
   - Toast de éxito: "Preset 'Estado del Equipo' guardado"
   - Aparecerá en el selector junto a los presets predefinidos

---

## 🗑️ Eliminar Preset Personalizado

1. **Hover sobre el preset**
   - Pasa el mouse sobre cualquier preset personalizado
   - Aparecerá una X roja en la esquina superior derecha

2. **Click en X**
   - Confirma eliminación
   - El preset se elimina del sistema

**Nota:** Los presets predefinidos (Calidad, Seguridad, etc.) **no se pueden eliminar**.

---

## 🔄 Reutilizar en Múltiples Campos

### Escenario de Uso

Tienes una plantilla de "Inspección de Equipos" con 10 preguntas, todas usan las mismas opciones:

**Método tradicional:**
- Configurar manualmente 10 veces las mismas 3 opciones = 30 clicks

**Con Presets:**
1. Configura 1 vez las opciones
2. Guarda como preset "Estado Equipo"
3. Aplica el preset en los otros 9 campos = 9 clicks

**Ahorro de tiempo:** ~70% menos clicks

---

## 💡 Casos de Uso Reales

### 1. Inspección de Seguridad Industrial
**Preset:** Seguridad
```
Pregunta 1: ¿El área tiene señalización adecuada?
  → Preset "Seguridad"

Pregunta 2: ¿Los extintores están accesibles?
  → Preset "Seguridad"

Pregunta 3: ¿Las salidas de emergencia están despejadas?
  → Preset "Seguridad"
```

### 2. Control de Calidad de Productos
**Preset:** Calidad + Custom "Rechazos"
```
Calidad Visual:
  → Preset "Calidad" (Buena/Razonable/Deficiente)

Estado de Empaque:
  → Preset "Calidad"

Motivo de Rechazo (si aplica):
  → Preset Custom "Rechazos":
    - Defecto de Fabricación
    - Daño en Transporte
    - Vencido
    - Empaque Dañado
```

### 3. Auditoría de Cumplimiento Normativo
**Preset:** Cumplimiento
```
¿Cumple con NOM-001?
  → Preset "Cumplimiento"

¿Cumple con ISO 9001?
  → Preset "Cumplimiento"

¿Documentación vigente?
  → Preset "Cumplimiento"
```

---

## 🔧 Funcionalidades Técnicas

### Almacenamiento
- **Presets predefinidos:** Hardcoded en el código
- **Presets personalizados:** `localStorage` del navegador
  - Key: `hse_select_presets`
  - Formato: JSON array

### Estructura de Datos
```javascript
{
  id: 'custom_1738828800000',
  name: 'Estado del Equipo',
  options: [
    { value: 'Operativo', label: 'Operativo', color: 'green' },
    { value: 'Mantenimiento', label: 'Mantenimiento', color: 'yellow' },
    { value: 'Fuera de servicio', label: 'Fuera de servicio', color: 'red' }
  ]
}
```

### Colores Disponibles
- `gray` ⚪ - Neutro/N/A
- `green` 🟢 - Positivo/Aprobado
- `yellow` 🟡 - Precaución/Razonable
- `red` 🔴 - Negativo/Rechazo
- `blue` 🔵 - Informativo

---

## ⚠️ Limitaciones y Consideraciones

### Persistencia
- Los presets personalizados se guardan **por navegador**
- Si cambias de navegador o dispositivo, no verás tus presets personalizados
- Limpiar datos del navegador elimina los presets

### Sincronización
- **No hay sincronización** entre usuarios
- Cada usuario crea y gestiona sus propios presets
- Recomendación: Crear presets estándar en cada dispositivo usado

### Compatibilidad
- Solo aplica a campos de tipo:
  - `single_select` (Selección única)
  - `select`
- No aplica a checkbox, text, textarea, etc.

---

## 🎓 Tips y Mejores Prácticas

### 1. Nomenclatura Clara
✅ **Bueno:** "Estado del Equipo", "Nivel de Riesgo"  
❌ **Malo:** "Preset 1", "Opciones varias"

### 2. Estandarización de Colores
```
🟢 Verde  → Bueno, Aprobado, Cumple, Seguro
🟡 Amarillo → Precaución, Razonable, Revisar
🔴 Rojo   → Malo, Rechazado, No cumple, Riesgo
⚪ Gris   → N/A, No aplica, Sin datos
```

### 3. Agrupación Lógica
Crea presets para categorías específicas:
- **HSE:** Seguridad, Cumplimiento, Riesgo
- **Calidad:** Calidad, Aprobación, Conformidad
- **Equipos:** Estado, Disponibilidad, Operación

### 4. Revisión Periódica
- Revisa y limpia presets obsoletos cada trimestre
- Actualiza opciones según nuevas normativas

---

## 🔄 Workflow Recomendado

### Para Administradores

1. **Identificar patrones**
   - Analiza inspecciones existentes
   - Identifica opciones repetitivas

2. **Crear biblioteca de presets**
   - Crea 5-10 presets estándar
   - Documenta en manual interno

3. **Capacitar usuarios**
   - Enseña cómo aplicar presets
   - Demuestra creación de presets personalizados

4. **Monitorear uso**
   - Verifica que los presets se usan correctamente
   - Ajusta según feedback de usuarios

### Para Inspectores

1. **Usa presets existentes primero**
   - Revisa si ya existe un preset adecuado

2. **Personaliza solo si es necesario**
   - No reinventes la rueda

3. **Guarda solo presets reutilizables**
   - No guardes opciones de un solo uso

---

## 📊 Comparación: Antes vs Después

| **Tarea** | **Sin Presets** | **Con Presets** | **Ahorro** |
|-----------|----------------|----------------|-----------|
| Crear 5 opciones estándar | 25 clicks + 2 min | 1 click + 5 seg | 95% tiempo |
| Plantilla con 10 campos similares | 250 clicks + 20 min | 10 clicks + 2 min | 90% tiempo |
| Estandarizar 5 plantillas | 100 min | 15 min | 85% tiempo |

---

## 🐛 Resolución de Problemas

### Preset no aparece después de guardar
**Causa:** Error en localStorage o nombre vacío  
**Solución:**
1. Verifica que ingresaste un nombre
2. Intenta refrescar la página
3. Verifica espacio disponible en localStorage

### No puedo eliminar un preset
**Causa:** Es un preset predefinido  
**Solución:** Los presets predefinidos (Calidad, Seguridad, etc.) no se pueden eliminar

### Presets desaparecieron
**Causa:** Limpieza de caché del navegador  
**Solución:**
1. Vuelve a crear los presets
2. Considera exportar/importar (feature futura)

### Color no cambia visualmente
**Causa:** FormRenderer.jsx no renderiza colores  
**Solución:** Los colores se aplican en la configuración pero pueden no ser visibles en el formulario en vivo

---

## 🚀 Features Futuras (Roadmap)

### Versión 2.0
- [ ] Exportar/Importar presets como JSON
- [ ] Compartir presets entre usuarios (sync con Supabase)
- [ ] Presets organizacionales (admin define presets para todos)
- [ ] Historial de uso de presets (analytics)

### Versión 3.0
- [ ] Presets con lógica condicional integrada
- [ ] Traducción automática de presets (multi-idioma)
- [ ] Presets con valores numéricos para scoring automático
- [ ] Templates de presets por industria (construcción, minería, etc.)

---

**Fecha de creación:** 9 de febrero de 2026  
**Versión:** 1.0.0  
**Última actualización:** 9 de febrero de 2026
