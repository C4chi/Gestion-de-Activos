# 🚀 Deployment Guide: Sistema de Compras Multi-Activo

## 📋 Resumen

Este documento proporciona instrucciones paso a paso para implementar el sistema de compras multi-activo en producción.

**Tiempo estimado**: 15-30 minutos  
**Riesgo**: Bajo (cambios aditivos, compatible con sistema existente)  
**Rollback**: Disponible en migración SQL

---

## 🎯 Requisitos Previos

- [ ] Acceso a Supabase (SQL Editor)
- [ ] Acceso a repositorio Git
- [ ] Node.js + npm instalados
- [ ] Servidor de desarrollo funcional
- [ ] Backup de BD (recomendado)

---

## 📊 Fase 1: Base de Datos (5 minutos)

### Paso 1.1: Ejecutar Migración SQL

1. Abre Supabase SQL Editor
2. Copia TODO el contenido de:
   ```
   MIGRATION_MULTIASSET_PURCHASES.sql
   ```
3. Pega en SQL Editor
4. Ejecuta (presiona Ctrl+Enter)

**Verificación**:
```sql
-- Después de ejecutar, verifica que no hay errores
-- Deberías ver "✅" en console

-- Verifica columnas nuevas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'purchase_items' 
AND column_name IN ('ficha_ref', 'estado_linea');

-- Verifica vistas
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('purchase_multi_asset_summary', 
                     'purchase_items_with_asset_details');
```

✅ **Status**: Listo si no hay errores

---

## 💻 Fase 2: Código Frontend (10 minutos)

### Paso 2.1: Descargar Archivos

```bash
# En tu proyecto local
git pull origin main

# Verifica que existen:
# ✅ src/RequisitionMultiAssetModal.jsx (NUEVO)
# ✅ src/AppContext.jsx (MODIFICADO)
# ✅ src/App.jsx (MODIFICADO)
```

### Paso 2.2: Instalar Dependencias (si es necesario)

```bash
npm install

# Debería estar todo instalado ya
# lucide-react, react-hot-toast, etc.
```

### Paso 2.3: Verificar Imports

En `src/App.jsx`, verifica que exista:
```jsx
import { RequisitionMultiAssetModal } from './RequisitionMultiAssetModal';
```

En `src/AppContext.jsx`, verifica que exista:
```jsx
const submitRequisitionMultiAsset = async (reqFormData) => { ... }

// En exports:
submitRequisitionMultiAsset,
```

✅ **Status**: Listo si todos los imports existen

---

## 🧪 Fase 3: Testing Local (10 minutos)

### Paso 3.1: Iniciar Servidor

```bash
npm run dev

# Debería compilar sin errores
# Si hay errores, revisa el archivo mencionado
```

### Paso 3.2: Test Manual

#### Test 1: Modal Abre
1. Login con PIN de ADMIN/COMPRAS
2. En App.jsx, busca manualmente si puedes abrir el modal
3. O en Sidebar, busca botón de "Solicitud Multi-Activo"

**Verificación esperada**:
- Modal aparece
- No hay errores de consola
- Formulario visible

#### Test 2: Agregar Línea
1. En el modal, llena información general
2. Agrega una línea con activo
3. Verifica que aparece en la lista

**Verificación esperada**:
- Línea se agrega
- Activo seleccionado aparece
- Botón "Crear Solicitud" disponible

#### Test 3: Crear Requisición
1. Llena todo correctamente
2. Click "Crear Solicitud"

**Verificación esperada**:
```
✅ Toast: "Requisición multi-activo creada con X línea(s)"
✅ Modal se cierra
✅ Datos recargados
```

#### Test 4: Verificar BD
```sql
-- En Supabase SQL Editor
SELECT * FROM purchase_orders 
WHERE ficha = 'MULTI' 
ORDER BY fecha_solicitud DESC 
LIMIT 1;

-- Deberías ver:
-- ✅ tipo_compra = 'ACTIVO_ESPECIFICO' (o 'GENERAL')
-- ✅ numero_requisicion = 'REQ-...'

SELECT * FROM purchase_items 
WHERE purchase_id = (SELECT id FROM purchase_orders WHERE ficha = 'MULTI' LIMIT 1)
ORDER BY created_at DESC;

-- Deberías ver:
-- ✅ ficha_ref = 'FICHA-001' (o similar)
-- ✅ estado_linea = 'PENDIENTE'
-- ✅ cantidad_recibida = 0
```

✅ **Status**: Todo funciona si pasas estos tests

---

## 🎯 Fase 4: Integración UI (Opcional)

### Paso 4.1: Agregar Botón en Sidebar

En `src/Sidebar.jsx`:

```jsx
{/* Nuevo botón para compras multi-activo */}
<button
  onClick={() => protectedAction(
    () => setActiveModal('REQ_MULTI'),
    ['ADMIN', 'COMPRAS']
  )}
  className="sidebar-btn"
>
  🛒 Solicitud Multi
</button>
```

### Paso 4.2: Agregar Botón en PurchasingManagement

En `src/PurchasingManagement.jsx`:

```jsx
<button
  onClick={() => setShowMultiModal(true)}
  className="bg-green-600 text-white px-4 py-2 rounded-lg"
>
  ➕ Solicitud Multi-Activo
</button>

{showMultiModal && (
  <RequisitionMultiAssetModal
    onClose={() => setShowMultiModal(false)}
    onSubmit={handleMultiAssetSubmit}
  />
)}
```

Ver [INTEGRACION_PURCHASING_MULTIACTIVO.md](INTEGRACION_PURCHASING_MULTIACTIVO.md) para más opciones.

---

## 📈 Fase 5: Documentación y Comunicación (5 minutos)

### Paso 5.1: Copiar Documentos

Todos los siguientes archivos están listos:
```
✅ GUIA_COMPRAS_MULTIACTIVO.md
✅ TECNICA_COMPRAS_MULTIACTIVO.md
✅ QUICKSTART_COMPRAS_MULTIACTIVO.md
✅ ARQUITECTURA_COMPRAS_MULTIACTIVO.md
✅ EJEMPLOS_CODIGO_COMPRAS_MULTIACTIVO.md
✅ INTEGRACION_PURCHASING_MULTIACTIVO.md
✅ RESUMEN_COMPRAS_MULTIACTIVO.md
✅ INDICE_COMPRAS_MULTIACTIVO.md
```

### Paso 5.2: Comunicar a Usuarios

Email template:
```
Asunto: Nuevo sistema de Compras Multi-Activo

Estimados,

Se ha implementado una nueva funcionalidad en el módulo de Compras:

✨ Solicitud de Compra para Múltiples Activos

Ahora pueden:
• Crear una sola requisición para varios activos
• Asignar cada línea a un activo diferente
• Rastrear estado individual por línea

¿Cómo usar?
1. Compras → Solicitud Multi-Activo
2. Seleccionar tipo de compra (General o Vinculada a Activos)
3. Agregar líneas y asignar activos
4. Crear solicitud

Para más información:
→ [Link a GUIA_COMPRAS_MULTIACTIVO.md]
→ [Link a QUICKSTART_COMPRAS_MULTIACTIVO.md]

¿Dudas? Contacta al equipo de TI.

Saludos,
Sistema RODICON
```

---

## ✅ Checklist de Deployment

### Pre-Deployment
- [ ] Backup de BD realizado
- [ ] Rama Git actualizada
- [ ] Todos los archivos descargados
- [ ] Dependencias instaladas

### Deployment
- [ ] Migración SQL ejecutada en Supabase
- [ ] Código compilado sin errores
- [ ] Tests manuales completados
- [ ] BD verificada

### Post-Deployment
- [ ] Usuarios notificados
- [ ] Documentación compartida
- [ ] Monitoreo activado
- [ ] Feedback recopilado

---

## 🔄 Rollback (En Caso de Problemas)

### Opción 1: Revertir Solo BD

En Supabase SQL Editor, ejecuta lo siguiente (al final de MIGRATION_MULTIASSET_PURCHASES.sql):

```sql
-- Rollback SQL (descomentar y ejecutar si es necesario)
ALTER TABLE purchase_items DROP COLUMN IF EXISTS ficha_ref;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS estado_linea;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS cantidad_recibida;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS observaciones;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS tipo_compra;
DROP VIEW IF EXISTS purchase_multi_asset_summary CASCADE;
DROP VIEW IF EXISTS purchase_items_with_asset_details CASCADE;
DROP FUNCTION IF EXISTS get_purchase_order_status(UUID) CASCADE;
```

### Opción 2: Revertir Código

```bash
# Revertir últimos cambios
git revert HEAD

# O específicamente
git checkout HEAD src/RequisitionMultiAssetModal.jsx
git checkout HEAD src/AppContext.jsx
git checkout HEAD src/App.jsx
```

---

## 📊 Monitoreo Post-Deployment

### Verificar Uso
```sql
-- ¿Cuántas requisiciones multi-activo se crearon?
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN tipo_compra = 'ACTIVO_ESPECIFICO' THEN 1 END) as multi_activo,
  COUNT(CASE WHEN tipo_compra = 'GENERAL' THEN 1 END) as general
FROM purchase_orders
WHERE fecha_solicitud > NOW() - INTERVAL '24 hours';
```

### Alertas
```sql
-- ¿Hay errores en validación?
-- (Revisar logs de aplicación)

-- ¿Están todos los activos marcados ESPERA REPUESTO?
SELECT a.ficha, a.status, po.numero_requisicion
FROM assets a
JOIN purchase_items pi ON a.ficha = pi.ficha_ref
JOIN purchase_orders po ON pi.purchase_id = po.id
WHERE a.status != 'ESPERA REPUESTO'
AND po.fecha_solicitud > NOW() - INTERVAL '24 hours';
```

---

## 🐛 Troubleshooting de Deployment

| Problema | Solución |
|----------|----------|
| "table purchase_items has no column ficha_ref" | Ejecutar migración SQL |
| "submitRequisitionMultiAsset is not defined" | Verificar export en AppContext |
| "Cannot find module RequisitionMultiAssetModal" | Verificar path del import en App.jsx |
| "Modal no aparece" | Verificar que activeModal === 'REQ_MULTI' existe |
| Errores en compilación | Revisar console, limpiar node_modules y npm install |

---

## 📞 Escalación

Si hay problemas graves:

1. **Código**: Revisar errores de consola
2. **BD**: Verificar migración SQL ejecutada
3. **Lógica**: Revisar [TECNICA_COMPRAS_MULTIACTIVO.md](TECNICA_COMPRAS_MULTIACTIVO.md)
4. **Rollback**: Seguir pasos de rollback arriba

---

## 📋 Información de Release

```
Versión:        1.0
Fecha:          Febrero 2026
Componentes:    1 nuevo, 2 modificados
BD cambios:     2 tablas, 2 vistas, 1 función
Breaking changes: Ninguno
Rollback:       Disponible
Compatibilidad: 100% backward compatible
```

---

## 🎉 ¡Listo!

El sistema de compras multi-activo está en producción.

### Próximos pasos:
1. Monitorear uso durante 1-2 semanas
2. Recopilar feedback de usuarios
3. Hacer ajustes si es necesario
4. Considerar mejoras futuras

**Documentación completada**: Todos los guías están disponibles  
**Deployment completado**: Sistema listo para usar  
**Soporte**: Consultar [INDICE_COMPRAS_MULTIACTIVO.md](INDICE_COMPRAS_MULTIACTIVO.md)

---

**Documento de deployment**: Febrero 2026  
**Estado**: ✅ Completo y listo
