# 💰 Guía del Sistema de Costos por Activo

## 📋 Resumen de Correcciones Implementadas

### ✅ Problemas Solucionados

#### 1. **Montos No Se Guardaban**
- **Problema**: Los precios unitarios aparecían en $0.00 aunque se ingresaran
- **Solución**: 
  - Actualizado `fetchPurchaseOrders()` y `fetchPurchaseOrdersByStatus()` para incluir todos los campos de precios
  - Ahora se cargan: `precio_unitario`, `proveedor`, `cotizacion`, `moneda`, `ficha_ref`

#### 2. **Códigos No Aparecían en PDF**
- **Problema**: El PDF no mostraba códigos de productos ni precios
- **Solución**: 
  - Rediseñado el PDF para incluir 8 columnas: #, CÓDIGO, DESCRIPCIÓN, PROVEEDOR, CANT., P. UNIT., MONEDA, SUBTOTAL
  - Agregados totales por moneda (DOP y USD separados)
  - Incluida sección de cotizaciones al final

#### 3. **Montos No Vinculados a Activos**
- **Problema**: No existía un sistema para rastrear costos por activo para rentabilidad
- **Solución**:
  - Creada tabla `asset_costs` para registro completo de costos
  - Implementado trigger automático que registra costos al marcar orden como RECIBIDO
  - Creadas vistas SQL para análisis de costos consolidados

---

## 🗄️ Nueva Estructura de Base de Datos

### Tabla: `asset_costs`

```sql
CREATE TABLE asset_costs (
  id UUID PRIMARY KEY,
  ficha VARCHAR(50) REFERENCES assets(ficha),
  tipo_costo VARCHAR(50), -- 'COMPRA_REPUESTO', 'MANTENIMIENTO', 'REPARACION'
  descripcion TEXT,
  monto DECIMAL(12,2),
  moneda VARCHAR(10), -- 'DOP' o 'USD'
  fecha DATE,
  
  -- Relaciones
  purchase_order_id UUID,
  purchase_item_id UUID,
  maintenance_log_id UUID,
  
  notas TEXT,
  created_at TIMESTAMP
);
```

### Vistas Disponibles

#### `asset_costs_summary`
Resumen consolidado de costos por activo:
```sql
SELECT * FROM asset_costs_summary WHERE ficha = 'A-018';
```
Retorna:
- `total_dop`: Total en pesos dominicanos
- `total_usd`: Total en dólares
- `total_repuestos`: Total gastado en repuestos
- `total_mantenimiento`: Total en mantenimiento
- `cantidad_registros_costos`: Número de registros
- `fecha_primer_costo`, `fecha_ultimo_costo`

#### `asset_costs_detail`
Detalle completo de cada costo:
```sql
SELECT * FROM asset_costs_detail WHERE ficha = 'A-018' ORDER BY fecha DESC;
```

---

## 🔄 Flujo Automático de Registro de Costos

### Cuando se marca una orden como RECIBIDO:

1. **Trigger se activa automáticamente**
   ```sql
   trigger_register_purchase_costs
   ```

2. **Para cada ítem de la orden:**
   - Si tiene `precio_unitario > 0`
   - Si tiene `ficha_ref` asociada (o la orden tiene ficha principal)
   - Se crea registro en `asset_costs`:
     ```
     tipo_costo: 'COMPRA_REPUESTO'
     monto: precio_unitario × cantidad
     moneda: moneda del ítem (DOP o USD)
     descripcion: descripción del ítem
     notas: Incluye número de orden, proveedor, cotización
     ```

3. **Resultado:**
   - Cada activo tiene un historial completo de costos
   - Análisis de rentabilidad disponible inmediatamente

---

## 📊 Uso del Componente AssetCostsPanel

### Importar y Usar

```jsx
import { AssetCostsPanel } from './components/Assets/AssetCostsPanel';

// En tu componente de detalles de activo:
<AssetCostsPanel ficha={asset.ficha} />
```

### Características del Panel

1. **Tarjetas de Resumen:**
   - Total DOP
   - Total USD  
   - Total Repuestos

2. **Desglose por Tipo:**
   - Repuestos
   - Mantenimiento
   - Reparación

3. **Historial Completo:**
   - Listado cronológico de todos los costos
   - Iconos por tipo de costo
   - Referencias a órdenes de compra
   - Notas con proveedor y cotización

---

## 🔍 Consultas Útiles para Análisis

### 1. Activos más costosos
```sql
SELECT 
  ficha, 
  nombre, 
  marca, 
  modelo,
  total_dop,
  total_usd,
  cantidad_registros_costos
FROM asset_costs_summary 
WHERE total_dop > 0 OR total_usd > 0
ORDER BY total_dop DESC
LIMIT 10;
```

### 2. Costos por tipo en un período
```sql
SELECT 
  tipo_costo,
  COUNT(*) as cantidad,
  SUM(monto) as total,
  moneda
FROM asset_costs
WHERE fecha BETWEEN '2026-01-01' AND '2026-12-31'
GROUP BY tipo_costo, moneda
ORDER BY total DESC;
```

### 3. Activos con costos recientes
```sql
SELECT 
  ficha,
  activo_nombre,
  SUM(monto) as total_ultimos_30_dias,
  moneda
FROM asset_costs_detail
WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ficha, activo_nombre, moneda
ORDER BY total_ultimos_30_dias DESC;
```

### 4. Función auxiliar: Costo total de un activo
```sql
-- Para obtener el total en DOP:
SELECT get_asset_total_cost('A-018', 'DOP');

-- Para obtener el total en USD:
SELECT get_asset_total_cost('A-018', 'USD');
```

---

## 📝 Ejemplo Completo de Flujo

### 1. Crear Orden de Compra
```
Ficha: A-018
Solicitante: Jose Feliz
Items:
  - Pin (205469) × 1 = $500 DOP
  - Filtro × 2 = $100 USD c/u
```

### 2. Marcar como ORDENADO
- Se abre modal de cotizaciones
- Usuario ingresa precios, proveedores, monedas
- Se guarda: `precio_unitario`, `proveedor`, `cotizacion`, `moneda` en cada `purchase_item`

### 3. Marcar como RECIBIDO
- **Automáticamente** el trigger crea registros en `asset_costs`:
  ```
  Registro 1:
    ficha: A-018
    tipo_costo: COMPRA_REPUESTO
    descripcion: Pin
    monto: 500.00
    moneda: DOP
    notas: Orden: REQ-8729 - Proveedor: XYZ - Cot: COT-001
    
  Registro 2:
    ficha: A-018
    tipo_costo: COMPRA_REPUESTO
    descripcion: Filtro
    monto: 200.00 (100 × 2)
    moneda: USD
    notas: Orden: REQ-8729 - Proveedor: ABC
  ```

### 4. Ver Análisis de Costos
```jsx
<AssetCostsPanel ficha="A-018" />
```
Muestra:
- Total DOP: $500.00
- Total USD: $200.00
- Total Repuestos: $500.00
- 2 registros de costos
- Historial detallado con fechas y órdenes

---

## 🎯 Ventajas del Sistema

### Para Gestión
1. **Visibilidad total**: Cada peso gastado está registrado
2. **Análisis de rentabilidad**: Saber qué activos son más costosos
3. **Trazabilidad**: Cada costo vinculado a su orden de compra
4. **Multimoneda**: Soporte para DOP y USD

### Para Operaciones
1. **Automático**: No requiere entrada manual adicional
2. **Confiable**: Trigger de BD garantiza consistencia
3. **Completo**: Incluye proveedores, cotizaciones, fechas
4. **Escalable**: Listo para agregar otros tipos de costos (mano de obra, etc.)

---

## 🔧 Ejecutar la Migración

### En Supabase Dashboard:

1. Ir a **SQL Editor**
2. Copiar contenido de `MIGRATION_ASSET_COSTS.sql`
3. Ejecutar el script completo
4. Verificar que se crearon:
   - Tabla: `asset_costs`
   - Vistas: `asset_costs_summary`, `asset_costs_detail`
   - Trigger: `trigger_register_purchase_costs`
   - Función: `get_asset_total_cost`

### Verificar Instalación:

```sql
-- Verificar tabla
SELECT COUNT(*) FROM asset_costs;

-- Verificar vistas
SELECT * FROM asset_costs_summary LIMIT 5;

-- Verificar función
SELECT get_asset_total_cost('A-001', 'DOP');
```

---

## 📤 Próximos Pasos Sugeridos

### Integración Adicional

1. **En AssetPanel**: Agregar tab "Costos" con `<AssetCostsPanel />`
2. **En Dashboard**: Mostrar "Top 10 Activos más Costosos"
3. **En Reportes**: Incluir análisis de costos por período
4. **Alertas**: Notificar cuando un activo supere cierto umbral de costo

### Extensiones Futuras

- Registrar costos de mano de obra
- Vincular costos de mantenimiento preventivo
- Calcular ROI por activo
- Comparar costo real vs. presupuestado

---

## ⚠️ Notas Importantes

1. **El trigger solo registra costos cuando estado = 'RECIBIDO'**
   - No se registran en PENDIENTE u ORDENADO
   - Solo al confirmar recepción física

2. **Solo registra ítems con precio > 0**
   - Items sin precio no generan costo
   - Útil para items "por confirmar"

3. **Requiere ficha asociada**
   - O `ficha_ref` en el item
   - O `ficha` en la orden principal
   - Items sin ficha no generan registro de costo

4. **Las fechas se registran con la fecha actual**
   - No la fecha de la orden original
   - Representa cuándo se recibió físicamente

---

## 📞 Soporte

Para dudas o problemas con el sistema de costos:
1. Revisar logs de BD: `audit_log` tabla
2. Verificar que migración se ejecutó correctamente
3. Consultar esta guía para queries de diagnóstico
