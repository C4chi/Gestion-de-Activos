# Guía de Implementación: Offline Sync + Carga de Fotos

## 🔌 Sincronización Offline (Inspecciones HSE)

La app ahora puede guardar inspecciones en **localStorage** cuando no hay conexión, y sincronizarlas automáticamente cuando la conexión se restaura.

### Cómo funciona:

1. **Sin conexión**: El sistema detecta que no hay internet y guarda la inspección en localStorage
2. **Cambio de estado**: Cuando se restaura la conexión, se detecta automáticamente
3. **Sincronización automática**: Los cambios pendientes se sincronizan al servidor

### Dónde se implementó:

- `src/utils/offlineSync.js` - Sistema de gestión de cola offline
- `src/hooks/useOfflineSync.js` - Hook para sincronización automática

### Cómo usar en componentes de inspección:

```javascript
import { saveInspectionOffline } from '../utils/offlineSync';

// En el componente de inspección, cuando no hay conexión:
if (!navigator.onLine) {
  const operation = saveInspectionOffline({
    template_id: templateId,
    asset_id: assetId,
    responses: formData,
    submitted_at: new Date().toISOString()
  });
  toast.success('Inspección guardada para sincronizar después');
}
```

### Queue de operaciones:

Puedes ver las operaciones pendientes en localStorage:
```javascript
const queue = getOfflineQueue();
console.log(queue); // Array de operaciones pendientes
```

---

## 📸 Carga de Fotos a Activos

Ahora los admins pueden agregar fotos a los activos directamente desde el panel de detalle.

### Características:

✅ Solo admins pueden subir fotos  
✅ Click en la imagen del activo para abrir modal de foto  
✅ Vista previa antes de subir  
✅ Almacenamiento en Supabase Storage  
✅ Actualización automática en la BD  
✅ Opción para eliminar foto

### Cómo funciona:

1. Admin abre el detalle de un activo (click en activo)
2. Hace click en la imagen para abrir modal de foto
3. Selecciona una imagen (máx 5MB)
4. Sistema sube a Supabase Storage
5. URL se guarda en tabla `assets` (columna `foto_url`)
6. La foto aparece inmediatamente en el panel

### Archivos creados/modificados:

- `src/components/AssetPhotoModal.jsx` - Modal para subir fotos (NUEVO)
- `src/AssetDetailSidebar.jsx` - Integración de modal de foto
- `src/App.jsx` - Pasar prop `isAdmin` al sidebar

### Configuración necesaria en Supabase:

1. **Crear bucket en Storage**:
   - Nombre: `asset-photos`
   - Public: SÍ

2. **Ejecutar políticas de acceso**:
   ```sql
   -- Ver archivo: STORAGE_SETUP_ASSET_PHOTOS.sql
   ```

3. **Verificar columna en BD**:
   - La columna `foto_url` ya existe en la tabla `assets`

### Uso:

**En AppContext.jsx**, si usas el hook de sincronización:

```javascript
const { offlineQueue, isConnected, syncing } = useOfflineSync(supabaseClient);
```

---

## 🎯 Próximas mejoras recomendadas:

1. **Indicador de estado offline** en header (mostrar cuándo no hay conexión)
2. **Mostrar cola de cambios pendientes** en un panel
3. **Comprimir imágenes** antes de subir (reducir tamaño)
4. **Galería de fotos** - Permitir múltiples fotos por activo
5. **Sincronización manual** - Botón para sincronizar manualmente
6. **Sincronización de otras operaciones** - Trabajo en taller, compras, etc.

---

## 🧪 Testing:

### Probar offline:
1. Abre DevTools (F12)
2. Ve a pestaña "Network"
3. Marca "Offline" 
4. Intenta hacer una inspección
5. Debería guardarse en localStorage
6. Desactiva "Offline"
7. Debería sincronizar automáticamente

### Probar upload de foto:
1. Entra como admin
2. Click en un activo
3. Click en la imagen de fondo
4. Selecciona una foto
5. Debería aparecer en el detalle del activo
