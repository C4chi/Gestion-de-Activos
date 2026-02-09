# 🛠️ GUÍA DE TESTING Y DEBUGGING - FASE 1

## ⚡ Comandos Rápidos

### Iniciar Development Server
```bash
npm run dev
```
Abre: http://localhost:5173

### Ejecutar Build
```bash
npm run build
```

### Limpiar node_modules (si hay problemas)
```bash
rm -r node_modules package-lock.json
npm install
npm run dev
```

---

## 🧪 TESTING MANUAL

### Test 1: Verificar Migraciones (CRÍTICO)

En Supabase SQL Editor, ejecuta:
```sql
-- Ver todas las tablas
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- Contar registros por tabla
SELECT 'assets' as table_name, COUNT(*) as count FROM assets
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'maintenance_logs', COUNT(*) FROM maintenance_logs
UNION ALL
SELECT 'safety_reports', COUNT(*) FROM safety_reports
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log;
```

**Esperado:** Deberías ver 7 tablas sin errores.

---

### Test 2: Flujo de Compras Completo

**En el navegador:**

1. Abre DevTools (F12)
2. Ve a Consola
3. Abre módulo de Compras
4. Ejecuta en consola:
```javascript
// Verificar que el hook está disponible
window.purchasingWorkflow // (si lo expones globalmente para debugging)
```

**Flujo esperado:**
```
PENDIENTE → ORDENADO → PARCIAL → RECIBIDO
```

**Verificación en Supabase:**
```sql
SELECT * FROM purchase_orders ORDER BY fecha_actualizacion DESC LIMIT 1;
SELECT * FROM audit_log WHERE tabla_afectada = 'purchase_orders' ORDER BY fecha_operacion DESC LIMIT 5;
```

---

### Test 3: Flujo de Taller Completo

**Pasos:**
1. Crear orden de mantenimiento (PENDIENTE)
2. Recibir en taller (RECIBIDO)
3. Iniciar reparación (EN_REPARACION)
4. Completar (COMPLETADO)

**Verificación en Supabase:**
```sql
SELECT 
  ml.id, 
  ml.estado, 
  ml.fecha_creacion, 
  ml.observaciones,
  a.nombre as activo
FROM maintenance_logs ml
LEFT JOIN assets a ON ml.asset_id = a.id
ORDER BY ml.fecha_creacion DESC
LIMIT 5;
```

---

### Test 4: Flujo de Seguridad

**Pasos:**
1. Crear reporte ACCIDENTE
2. Cambiar a EN_INVESTIGACION
3. Agregar investigación
4. Cerrar

**Verificación:**
```sql
SELECT * FROM safety_reports ORDER BY fecha_creacion DESC LIMIT 5;
SELECT COUNT(*) as total,
       SUM(CASE WHEN estado = 'ABIERTO' THEN 1 ELSE 0 END) as abiertos,
       SUM(CASE WHEN tipo_incidente = 'ACCIDENTE' THEN 1 ELSE 0 END) as accidentes
FROM safety_reports;
```

---

## 🐛 DEBUGGING COMÚN

### Problema: "Cannot read property 'map' of undefined"

**Causa:** El hook devuelve undefined en lugar de array

**Solución:**
```javascript
// En el hook, asegúrate que retorna array vacío si hay error:
return data || [];  // ← Esto es importante

// En el componente:
const [reports, setReports] = useState([]);  // ← Inicializar con array
```

### Problema: "RLS policy violation"

**Causa:** Row Level Security está rechazando queries

**Solución temporal (DEVELOPMENT ONLY):**
```sql
-- Deshabilitar RLS
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
```

**Solución permanente:** Revisar políticas RLS en Supabase > Authentication > Policies

### Problema: "Transición no válida: PENDIENTE → COMPLETADO"

**Causa:** El código está validando transiciones correctamente (es lo esperado)

**Solución:** Sigue el flujo correcto:
```
PENDIENTE → RECIBIDO → EN_REPARACION → COMPLETADO
NO: PENDIENTE → COMPLETADO directamente
```

### Problema: Toast notifications no aparecen

**Causa:** react-hot-toast requiere Toaster en root

**Verificación en App.jsx:**
```javascript
import { Toaster } from 'react-hot-toast';

export function App() {
  return (
    <>
      <Toaster position="top-right" />
      {/* resto de la app */}
    </>
  );
}
```

### Problema: Estados no se actualizan

**Debugging:**
```javascript
// Agregar esto en el hook para ver qué ocurre:
console.log('Before update:', currentData);
console.log('After update:', updatedData);

// O en el componente:
useEffect(() => {
  console.log('Reports changed:', reports);
}, [reports]);
```

---

## 📊 INSPECCIONAR BASE DE DATOS

### Ver toda la auditoría
```sql
SELECT 
  fecha_operacion,
  usuario,
  tabla_afectada,
  operacion,
  registro_id,
  valores_nuevos
FROM audit_log
ORDER BY fecha_operacion DESC
LIMIT 20;
```

### Ver transiciones de un orden de compra
```sql
SELECT 
  fecha_operacion,
  usuario,
  valores_nuevos
FROM audit_log
WHERE tabla_afectada = 'purchase_orders'
  AND registro_id = 'ID_DE_TU_ORDEN'
ORDER BY fecha_operacion;
```

### Verificar integridad de datos
```sql
-- Órdenes sin items asociados
SELECT po.id, po.proveedor
FROM purchase_orders po
LEFT JOIN purchase_items pi ON po.id = pi.purchase_order_id
WHERE pi.id IS NULL;

-- Assets con estado inconsistente
SELECT * FROM assets WHERE estado NOT IN ('DISPONIBLE', 'NO DISPONIBLE', 'EN MANTENIMIENTO');
```

---

## 🔍 DEVTOOLS TIPS

### Buscar errores de Supabase
1. F12 > Network
2. Filtrar por: `supabase`
3. Ver Response de peticiones fallidas

### Ver localStorage
1. F12 > Application > Local Storage
2. Busca: `userPin`, `sb-*` (token de Supabase)

### Ver Network requests en tiempo real
1. F12 > Network
2. Ejecuta una acción
3. Busca peticiones a `supabase.co`
4. Haz click > Response tab

---

## 📋 CHECKLIST ANTES DE DECIR "LISTO"

- [ ] ¿Correr migraciones SQL sin errores?
- [ ] ¿Dashboard Compras abre sin errores?
- [ ] ¿Dashboard Taller abre sin errores?
- [ ] ¿Dashboard Seguridad abre sin errores?
- [ ] ¿Se crean registros en purchase_orders?
- [ ] ¿Se crean registros en maintenance_logs?
- [ ] ¿Se crean registros en safety_reports?
- [ ] ¿Se registran cambios en audit_log?
- [ ] ¿Las transiciones de estado funcionan?
- [ ] ¿Los comentarios se guardan?
- [ ] ¿Las observaciones se guardan?
- [ ] ¿DevTools Console está limpia (sin errores)?
- [ ] ¿Supabase SQL Editor muestra datos correctamente?

---

## 🚀 TESTING AVANZADO

### Performance
```javascript
// Medir tiempo de carga en componente
useEffect(() => {
  console.time('loadOrders');
  loadOrders().then(() => {
    console.timeEnd('loadOrders');
  });
}, []);
```

### Memory Leaks
```javascript
// Verificar cleanup en useEffect
useEffect(() => {
  const controller = new AbortController();
  
  fetch(..., { signal: controller.signal });
  
  return () => controller.abort();
}, []);
```

### RLS Debugging
```sql
-- Crear usuario test en Supabase Auth
-- Copiar su JWT token
-- En DevTools > Application, ir a tab "Cookies" o simular requests con ese token
```

---

## 📱 Testing en Diferentes Pantallas

```bash
# En DevTools, usa Device Toolbar (Ctrl+Shift+M)
# Simula:
- iPhone SE (375px) - ✅ Responsive
- iPad (768px) - ✅ Tablet
- Desktop (1920px) - ✅ Full screen
```

Verifica que:
- ✅ Grid se adapta (1 col en mobile, 2 en tablet, 2+ en desktop)
- ✅ Modales son legibles
- ✅ Botones son tocables (min 44px)
- ✅ Inputs tienen espacios adecuados

---

## 🔐 Testing de Seguridad

### Verificar RLS está activo
```sql
-- En Supabase Authentication > Policies
-- Debe haber al menos una policy por tabla
SELECT * FROM pg_policies;
```

### Verificar que no hay inyección SQL
Todos los hooks usan `supabase.from().select()` que ESCAPA automáticamente. ✅ Seguro

### Verificar timestamps
```sql
SELECT 
  id,
  fecha_creacion,
  fecha_actualizacion,
  EXTRACT(EPOCH FROM (fecha_actualizacion - fecha_creacion)) as segundos_de_diferencia
FROM purchase_orders
LIMIT 5;
```

---

## 📝 LOGGING PARA DEBUGGING

### Agregar logs estratégicos

**En hook:**
```javascript
console.log('[usePurchasingWorkflow] fetchPurchaseOrders iniciado');
const data = await fetchPurchaseOrders();
console.log('[usePurchasingWorkflow] Órdenes cargadas:', data.length);
```

**En componente:**
```javascript
useEffect(() => {
  console.log('[PurchasingManagement] montado');
  return () => console.log('[PurchasingManagement] desmontado');
}, []);
```

**En modal:**
```javascript
const handleSubmit = () => {
  console.log('[CommentModal] Enviando:', { comment });
};
```

---

## ✅ VALIDACIÓN FINAL

Antes de hacer git push:

```bash
# 1. Verificar sin errores
npm run build

# 2. Si hay errores, limpiar cache
rm -rf .next node_modules/.vite
npm run dev

# 3. Testing manual en navegador
# - Abre cada módulo
# - Intenta cada acción
# - Verifica en Supabase

# 4. Si todo OK, commit
git add .
git commit -m "Feat: Implementar módulos Compras, Taller y Seguridad (Fase 1)"
git push origin main
```

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0
**Estado:** ✅ Guía Completa
