# Restricciones de Administrador - Sistema RODICON

## 🔒 Restricciones Implementadas

Solo los usuarios con rol **ADMIN** pueden:

### 1. **Crear Nuevos Activos**
- El botón "Nuevo Activo" **solo aparece para administradores**
- Si un usuario no-admin intenta acceder al modal, ve un mensaje de acceso restringido
- Esto previene la creación no autorizada de activos

### 2. **Marcar Activos como VENDIDO**
- Solo en el panel de administrador
- Al marcar como VENDIDO:
  - El activo cambia su estado a `VENDIDO`
  - Se establece `visible = false` (oculto del inventario)
  - **Se elimina automáticamente de la población visible**
  - Requiere confirmación del usuario

### 3. **Panel de Administrador (Botón en Sidebar)**
- Solo aparece para usuarios ADMIN
- Acceso a edición completa de todos los campos
- Acceso a función "Marcar Vendido"

## 📊 Comportamiento de Activos VENDIDO

### En la Lista Principal
```
❌ NO APARECEN en el inventario
❌ NO se cuentan en KPIs (total, no-operativos, etc.)
❌ No se pueden seleccionar
✅ Están guardados en la BD con status = 'VENDIDO'
```

### En el Panel Admin
```
✅ APARECEN en la búsqueda (para histórico)
✅ Se pueden ver los detalles
❌ El botón "Marcar Vendido" NO aparece (ya está vendido)
✅ Se pueden editar otros campos si es necesario
```

## 🔑 Verificación de Rol

El sistema verifica el rol en **tres puntos**:

### 1. **Sidebar (onNewAsset)**
```javascript
{isAdmin && (
  <button onClick={onNewAsset}>Nuevo Activo</button>
)}
```

### 2. **Modal NewAssetModal**
```javascript
if (!isAdmin) {
  // Mostrar mensaje: "Acceso Restringido"
  // Solo administradores pueden crear
}
```

### 3. **Panel Admin**
```javascript
{isAdmin && editData.status !== 'VENDIDO' && (
  <button onClick={handleMarkAsSold}>Marcar Vendido</button>
)}
```

## 📋 Flujos por Rol

### Usuario Normal (rol ≠ 'ADMIN')
```
┌─────────────────────────────────┐
│ RODICON - Inventario            │
├─────────────────────────────────┤
│ Sidebar:                        │
│ - Taller                        │
│ - HSE                           │
│ - Compras                       │
│ - Métricas                      │
│ - SIN "Nuevo Activo"            │
│ - SIN "Administrador"           │
└─────────────────────────────────┘

Permisos:
- Ver activos
- Generar reportes
- Registrar mantenimientos
- Crear requisiciones
```

### Usuario Administrador (rol = 'ADMIN')
```
┌─────────────────────────────────┐
│ RODICON - Inventario            │
├─────────────────────────────────┤
│ Sidebar:                        │
│ - Taller                        │
│ - HSE                           │
│ - Compras                       │
│ - Métricas                      │
│ - ✅ "Nuevo Activo"             │
│ - ✅ "Administrador"            │
└─────────────────────────────────┘

Permisos:
- Crear activos
- Editar detalles completos
- Marcar como VENDIDO
- Gestionar todo el inventario
```

## 🛡️ Seguridad

### Validaciones en Cliente
- Botones ocultos para usuarios no-admin
- Modal con restricción de acceso
- Confirmación antes de marcar VENDIDO

### Validaciones en Base de Datos
Se recomienda agregar RLS (Row Level Security) en Supabase:

```sql
-- Política: Solo ADMIN puede crear activos
ALTER POLICY "Crear Activos" ON assets
FOR INSERT USING (
  auth.uid() IN (SELECT id FROM app_users WHERE rol = 'ADMIN')
);

-- Política: Solo ADMIN puede actualizar status a VENDIDO
ALTER POLICY "Marcar Vendido" ON assets
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM app_users WHERE rol = 'ADMIN')
)
WITH CHECK (
  (status != 'VENDIDO') OR 
  (auth.uid() IN (SELECT id FROM app_users WHERE rol = 'ADMIN'))
);
```

## 📱 Ejemplo de Uso

### Crear un Activo (Admin)
1. Login con PIN de admin
2. Click "Nuevo Activo"
3. Llena: Ficha, Tipo, Marca, Modelo, Año
4. Click "Crear Activo"
5. ✅ Activo aparece en inventario

### Vender un Activo (Admin)
1. Click "Administrador"
2. Busca el activo
3. Click "Editar Detalles"
4. Click "Marcar Vendido"
5. Confirma la acción
6. ✅ Activo se oculta del inventario

### Intentar Crear Activo (No-Admin)
1. Login con PIN de usuario normal
2. "Nuevo Activo" ← **NO APARECE**
3. Click "Administrador" ← **NO APARECE**
4. Ver solo los módulos permitidos: Taller, HSE, Compras, Métricas

## 📊 Estado de Activos Soportados

| Estado | Visible | En KPIs | Editable | Vendible |
|--------|---------|---------|----------|----------|
| DISPONIBLE | ✅ | ✅ | ✅ | ✅ |
| EN_MANTENIMIENTO | ✅ | ✅ | ✅ | ✅ |
| DAÑADO | ✅ | ✅ | ✅ | ✅ |
| **VENDIDO** | ❌ | ❌ | ✅ | ❌ |

## 🔄 Recuperar Activo Vendido

Si necesitas "deshacer" una venta:

1. Admin → Administrador
2. Busca el activo (aparece en búsqueda)
3. Click "Editar Detalles"
4. Campo "Estado" → Cambiar a DISPONIBLE
5. Campo "visible" → Marcar visible
6. Click "Guardar Cambios"
7. ✅ Activo reaparece en el inventario

---

**Última actualización:** 10 de Diciembre de 2025
**Versión:** 1.1 - Restricciones de Administrador
