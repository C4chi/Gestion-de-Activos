# Rol GERENTE_TALLER - Documentación

## 🎯 Descripción General
**GERENTE_TALLER** es un rol especializado para la gestión y aprobación del flujo de compras de mantenimiento.

## 🔐 Permisos y Accesos

### ✅ Permisos Otorgados

#### 1. **Aprobación de Cotizaciones** (ÚNICO AUTORIZADO)
- Es el **ÚNICO rol** que puede aprobar cotizaciones en el flujo de compras
- Compara múltiples cotizaciones lado a lado
- Recibe recomendaciones automáticas del sistema basadas en:
  - **Activos urgentes** (detenidos): Prioriza tiempo de entrega
  - **Activos operativos**: Prioriza mejor precio
- Puede agregar comentarios de aprobación
- Recibe notificaciones cuando hay cotizaciones pendientes de aprobación

#### 2. **Creación de Requisiciones**
- Puede crear requisiciones de compra para activos específicos
- Puede crear requisiciones multi-activo
- Define estado operacional del activo:
  - **DISPONIBLE_ESPERA**: Activo puede operar mientras espera repuesto
  - **NO_DISPONIBLE_ESPERA**: Activo detenido (marcado automático como URGENTE)

#### 3. **Acceso a Módulos**
Puede acceder a:
- ✅ **Taller/Workshop**: Ver y gestionar registros de mantenimiento
- ✅ **Compras/Purchasing**: Ver órdenes, crear requisiciones, aprobar cotizaciones
- ✅ **Reportes**: Generar reportes del sistema
- ✅ **EPP Almacén**: Gestión de equipos de protección personal

No puede acceder a:
- ❌ **Administración de Usuarios**: Exclusivo de ADMIN
- ❌ **Panel Administrador**: Exclusivo de ADMIN/ADMIN_GLOBAL

## 📊 Flujo de Trabajo

### Flujo Completo de Compras
```
1. TALLER → Crea requisición + Estado operacional
   ↓
2. COMPRAS → Cotiza con proveedores (1-3 cotizaciones)
   ↓
3. SISTEMA → Cambia automático a PENDIENTE_APROBACION
   ↓
4. GERENTE_TALLER → Compara y aprueba mejor cotización ⭐
   ↓
5. COMPRAS → Ordena al proveedor (crea compromiso financiero)
   ↓
6. COMPRAS → Recibe material (parcial/total, registra costos)
```

### Estados del Flujo
- **PENDIENTE**: Requisición creada, esperando cotizaciones
- **EN_COTIZACION**: Compras ingresando cotizaciones
- **PENDIENTE_APROBACION**: Esperando aprobación de GERENTE_TALLER 🔔
- **APROBADO**: Cotización aprobada por GERENTE_TALLER ✅
- **ORDENADO**: Compras ordenó al proveedor
- **PARCIAL**: Recibido parcialmente
- **RECIBIDO**: Completado

## 🔔 Notificaciones

GERENTE_TALLER recibe notificaciones cuando:
- ✉️ Nueva orden pasa a **PENDIENTE_APROBACION**
- 🚨 Orden **URGENTE** requiere aprobación (activo detenido)
- ⏰ Orden lleva más de X días sin aprobación (próximamente)

## 👥 Diferencia con GERENTE

| Aspecto | GERENTE | GERENTE_TALLER |
|---------|---------|----------------|
| **Aprobar cotizaciones** | ❌ NO | ✅ SÍ (ÚNICO) |
| **Crear requisiciones** | ❌ NO | ✅ SÍ |
| **Ver módulos** | ✅ Todos | ✅ Todos excepto Admin |
| **Admin Usuarios** | ❌ NO | ❌ NO |
| **Reportes** | ✅ SÍ | ✅ SÍ |

## 🗂️ Archivos Modificados

### Frontend (React)
- `src/App.jsx`: Permisos de navegación y acceso
- `src/PurchasingManagement.jsx`: Verificación de permisos de aprobación
- `src/components/Purchasing/QuotationComparatorModal.jsx`: Modal de aprobación

### Backend (SQL)
- `MIGRATION_PURCHASING_WORKFLOW_COMPLETE.sql`: Documentación del flujo
- `MIGRATION_NOTIFICATIONS.sql`: Notificaciones a GERENTE_TALLER

## 🚀 Implementación

### 1. Ejecutar Migraciones SQL
```sql
-- En Supabase SQL Editor:

-- 1. Ejecutar MIGRATION_PURCHASING_WORKFLOW_COMPLETE.sql
-- 2. Ejecutar MIGRATION_NOTIFICATIONS.sql (actualizado)
```

### 2. Asignar Rol a Usuario
```sql
-- En Supabase SQL Editor:
UPDATE app_users 
SET rol = 'GERENTE_TALLER' 
WHERE nombre = 'NOMBRE_USUARIO';

-- Verificar:
SELECT nombre, rol FROM app_users WHERE rol = 'GERENTE_TALLER';
```

### 3. Verificación
1. Login con usuario GERENTE_TALLER
2. Ir a módulo **Compras**
3. Verificar que aparece botón "Aprobar" en órdenes PENDIENTE_APROBACION
4. Abrir modal de comparación de cotizaciones
5. Verificar que puede aprobar

## 📝 Notas Importantes

⚠️ **Solo GERENTE_TALLER puede aprobar**  
El rol GERENTE original ya NO puede aprobar cotizaciones. Solo puede ver.

⚠️ **Trigger de urgencia automático**  
Cuando una requisición marca el activo como NO_DISPONIBLE_ESPERA, el sistema automáticamente:
- Marca `requiere_urgencia = TRUE`
- Registra `fecha_activo_detenido`
- Prioriza en dashboard de activos críticos

⚠️ **Costos se registran en recepción**  
Los costos NO se registran al aprobar ni al ordenar, solo cuando se recibe el material físicamente (parcial o total).

## 🔗 Documentación Relacionada

- [GUIA_COMPRAS_MULTIACTIVO.md](GUIA_COMPRAS_MULTIACTIVO.md)
- [MIGRATION_PURCHASING_WORKFLOW_COMPLETE.sql](MIGRATION_PURCHASING_WORKFLOW_COMPLETE.sql)
- [RESTRICCIONES_ADMIN.md](RESTRICCIONES_ADMIN.md)

---

**Fecha de Implementación**: 11 de Febrero, 2026  
**Autor**: Sistema Rodicon Asset Management
