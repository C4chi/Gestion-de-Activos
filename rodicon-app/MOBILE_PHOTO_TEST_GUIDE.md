# Guía de Testing - Subida Múltiple de Fotos en Móvil

## 📸 Funcionalidad Implementada

### Características
- ✅ **Subida múltiple de fotos** en campos configurados con `allowMultiple`
- ✅ **Vista en galería** con grid responsivo (2-3 columnas)
- ✅ **Eliminación individual** de cada foto
- ✅ **Contador visual** que muestra cuántas fotos se han agregado
- ✅ **Indicador de progreso** durante la subida
- ✅ **Soporte para cámara y galería** en dispositivos móviles

## 🧪 Casos de Prueba

### 1. Configuración en TemplateBuilderV2
**Pasos:**
1. Ir a HSE → Plantillas → Nueva Plantilla
2. Agregar un campo de tipo "📷 Foto/Multimedia"
3. Seleccionar el campo
4. En el panel derecho, marcar ✓ "Permitir múltiples archivos"
5. Guardar plantilla

**Resultado esperado:**
- Aparece badge azul "📸 Permite múltiples fotos" bajo el título del campo

---

### 2. Subida de Una Sola Foto (Modo Simple)
**Pasos:**
1. Crear inspección con plantilla que tenga campo photo sin `allowMultiple`
2. Tocar el área de subida de foto
3. Seleccionar 1 foto de la galería o tomar con cámara
4. Verificar preview

**Resultado esperado:**
- Se muestra 1 foto en preview
- Botón X en esquina superior derecha para eliminar

---

### 3. Subida Múltiple desde Galería (Android/iOS)
**Pasos:**
1. Crear inspección con plantilla que tenga campo photo con `allowMultiple`
2. Tocar el área de subida (debe decir "Tomar / Subir Fotos")
3. Seleccionar "Galería" o "Archivos"
4. **Android:** Mantener presionado y seleccionar múltiples fotos
5. **iOS:** Tocar "Seleccionar" y elegir múltiples fotos
6. Confirmar selección

**Resultado esperado:**
- Todas las fotos seleccionadas se suben en paralelo
- Aparece mensaje "Subiendo..." durante el proceso
- Al terminar, muestra galería con todas las fotos
- Contador actualizado: "3 fotos agregadas"

---

### 4. Subida Múltiple con Cámara
**Pasos:**
1. En campo con `allowMultiple`, tocar área de subida
2. Seleccionar "Cámara"
3. Tomar foto y confirmar
4. **Repetir:** Tocar nuevamente el área de subida
5. Tomar segunda foto y confirmar
6. Repetir hasta tener 3-5 fotos

**Resultado esperado:**
- Cada foto se agrega a la galería existente
- No se reemplazan las fotos anteriores
- Grid se reorganiza automáticamente

---

### 5. Eliminación Individual de Fotos
**Pasos:**
1. Tener campo con 3 fotos subidas
2. Tocar botón X en la esquina de la segunda foto
3. Verificar que solo esa foto se elimine

**Resultado esperado:**
- Solo la foto seleccionada se elimina
- Las demás permanecen intactas
- Grid se ajusta automáticamente
- Contador actualizado: "2 fotos agregadas"

---

### 6. Límites y Validación
**Pasos:**
1. Intentar subir 10+ fotos en un campo
2. Verificar comportamiento del sistema
3. Revisar mensajes de error (si aplican)

**Resultado esperado:**
- Sistema maneja múltiples subidas en paralelo
- No hay límite explícito (limitado solo por Supabase Storage)
- Fotos grandes pueden tardar más en subir

---

### 7. Modo Offline/Fallback
**Pasos:**
1. Desactivar conexión a internet
2. Intentar subir fotos
3. Verificar fallback a base64

**Resultado esperado:**
- Si falla subida a Supabase Storage
- Convierte a base64 y guarda localmente
- Muestra toast: "Guardado local (sin subir). Revisa permisos del bucket uploads."
- Fotos en base64 se pueden ver en preview

---

### 8. Lógica Condicional con Fotos
**Pasos:**
1. Crear campo de selección: "¿Se encontraron hallazgos?"
2. Agregar lógica: Si respuesta "no es en blanco" → "Se requieren archivos"
3. Agregar campo photo con `allowMultiple`
4. En inspección, responder la pregunta

**Resultado esperado:**
- Campo de fotos aparece solo si se responde la primera pregunta
- Si tiene acción "require_files", campo se marca como obligatorio

---

## 🔍 Puntos de Verificación

### Visual
- [ ] Badge "Permite múltiples fotos" aparece en builder
- [ ] Grid de fotos es responsivo (2 cols móvil, 3 cols tablet)
- [ ] Botón X visible en cada foto
- [ ] Contador actualizado dinámicamente
- [ ] Área de subida tiene borde activo en hover/active

### Funcional
- [ ] Subida paralela funciona correctamente
- [ ] No hay duplicación de fotos
- [ ] Eliminación no afecta otras fotos
- [ ] Fallback a base64 funciona sin conexión
- [ ] Respuestas guardadas como array de URLs

### Performance
- [ ] 5 fotos se suben en <10 segundos (WiFi)
- [ ] No hay lag en la UI durante subida
- [ ] Preview de imágenes carga rápido
- [ ] No hay memory leaks en subidas múltiples

---

## 📱 Dispositivos Recomendados para Testing

### Android
- Chrome Mobile (v100+)
- Samsung Internet
- Firefox Mobile

### iOS
- Safari Mobile (iOS 14+)
- Chrome iOS

---

## 🐛 Problemas Conocidos

### Android
- Algunos fabricantes (Xiaomi, Huawei) pueden limitar selección múltiple en galería

### iOS
- Safari puede mostrar límite de 10 fotos en selección múltiple
- Formato HEIC puede necesitar conversión

---

## 🔧 Debugging

### Logs Útiles
```javascript
// En FormRenderer.jsx, PhotoUpload component
console.log('Files selected:', files.length);
console.log('Upload promises:', uploadPromises);
console.log('Current photos:', photos);
```

### Verificar en Consola
```javascript
// Ver respuestas del formulario
console.log(answers);

// Ver campos visibles
console.log(visibleItems);
```

---

## 📊 Métricas de Éxito

- ✅ 95% de usuarios pueden subir múltiples fotos sin errores
- ✅ Tiempo promedio de subida: <3 segundos por foto
- ✅ Tasa de error <5%
- ✅ 100% de fotos se guardan correctamente en Supabase

---

**Fecha de última actualización:** 9 de febrero de 2026  
**Versión:** 1.0.0
