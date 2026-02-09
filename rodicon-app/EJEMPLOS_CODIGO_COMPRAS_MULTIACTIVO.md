# 💻 Ejemplos de Código: Compras Multi-Activo

## 📌 Contenido
1. Integración en Sidebar
2. Integración en PurchasingManagement
3. Queries SQL útiles
4. Testing
5. Snippets reutilizables

---

## 1️⃣ Integración en Sidebar

### Agregar Botón para Compras Multi-Activo

```jsx
// src/Sidebar.jsx

import { ShoppingCart, Plus } from 'lucide-react';

export const Sidebar = ({ onNewMultiAssetPurchase, protectedAction }) => {
  return (
    <div className="sidebar">
      {/* ... otros botones ... */}
      
      {/* Sección de Compras */}
      <div className="section">
        <h3 className="section-title">Compras</h3>
        
        {/* Botón tradicional */}
        <button
          onClick={() => protectedAction(() => {
            // Abre modal para crear requisición en activo específico
          }, ['ADMIN', 'COMPRAS'])}
          className="sidebar-btn"
        >
          <ShoppingCart size={18} />
          Requisición
        </button>
        
        {/* NUEVO: Botón multi-activo */}
        <button
          onClick={() => protectedAction(
            () => onNewMultiAssetPurchase(),
            ['ADMIN', 'COMPRAS']
          )}
          className="sidebar-btn"
        >
          <ShoppingCart size={18} />
          <Plus size={12} className="ml-1" />
          Compra Multi-Activo
        </button>
      </div>
    </div>
  );
};
```

---

## 2️⃣ Integración en PurchasingManagement

### Opción A: Botón en Barra de Herramientas

```jsx
// src/PurchasingManagement.jsx

import { ShoppingCart, Plus } from 'lucide-react';

export const PurchasingManagement = ({ onClose, protectedAction, setActiveModal }) => {
  const { purchases } = useAppContext();

  return (
    <FullScreenModal title="Gestión de Compras" onClose={onClose}>
      {/* Barra de herramientas */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => protectedAction(
            () => setActiveModal('REQ_MULTI'),
            ['ADMIN', 'COMPRAS']
          )}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <ShoppingCart className="inline mr-2" size={18} />
          + Solicitud Multi-Activo
        </button>
        
        <button
          onClick={() => { /* Otras opciones */ }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Filtrar por Estado
        </button>
      </div>

      {/* Listado de compras */}
      <div className="grid gap-4">
        {purchases.map(purchase => (
          <PurchaseCard
            key={purchase.id}
            purchase={purchase}
            // ... props ...
          />
        ))}
      </div>
    </FullScreenModal>
  );
};
```

### Opción B: Modal Flotante dentro de PurchasingManagement

```jsx
// Dentro de PurchasingManagement

const [showQuickCreate, setShowQuickCreate] = useState(false);

return (
  <>
    {/* Botón flotante */}
    <button
      onClick={() => setShowQuickCreate(true)}
      className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full w-16 h-16 shadow-lg"
    >
      <Plus size={32} className="mx-auto" />
    </button>

    {/* Modal rápido */}
    {showQuickCreate && (
      <RequisitionMultiAssetModal
        onClose={() => setShowQuickCreate(false)}
        onSubmit={async (formData) => {
          const success = await submitRequisitionMultiAsset(formData);
          if (success) setShowQuickCreate(false);
        }}
      />
    )}
  </>
);
```

---

## 3️⃣ Queries SQL Útiles

### Obtener todas las compras multi-activo

```sql
-- Requisiciones que tienen múltiples activos
SELECT 
  po.numero_requisicion,
  po.estado,
  po.solicitante,
  po.fecha_solicitud,
  COUNT(DISTINCT pi.ficha_ref) as activos_totales,
  COUNT(pi.id) as lineas_totales,
  SUM(pi.cantidad) as cantidad_total
FROM purchase_orders po
LEFT JOIN purchase_items pi ON po.id = pi.purchase_id
WHERE po.tipo_compra = 'ACTIVO_ESPECIFICO'
  AND COUNT(DISTINCT pi.ficha_ref) > 1
GROUP BY po.id, po.numero_requisicion
ORDER BY po.fecha_solicitud DESC;
```

### Obtener estado consolidado de compras

```sql
-- Estado detallado de cada compra
SELECT 
  po.numero_requisicion,
  po.estado,
  COUNT(pi.id) as total_lineas,
  SUM(CASE WHEN pi.estado_linea = 'RECIBIDA' THEN 1 ELSE 0 END) as lineas_recibidas,
  ROUND(
    SUM(CASE WHEN pi.estado_linea = 'RECIBIDA' THEN 1 ELSE 0 END)::numeric
    / COUNT(pi.id) * 100, 
    2
  ) as porcentaje_recibido
FROM purchase_orders po
LEFT JOIN purchase_items pi ON po.id = pi.purchase_id
GROUP BY po.id
ORDER BY po.fecha_solicitud DESC;
```

### Obtener compras pendientes por activo

```sql
-- ¿Qué compras están esperando para cada activo?
SELECT 
  a.ficha,
  a.marca,
  a.modelo,
  po.numero_requisicion,
  COUNT(pi.id) as lineas_pendientes,
  SUM(pi.cantidad - COALESCE(pi.cantidad_recibida, 0)) as items_faltantes
FROM assets a
JOIN purchase_items pi ON a.ficha = pi.ficha_ref
JOIN purchase_orders po ON pi.purchase_id = po.id
WHERE pi.estado_linea IN ('PENDIENTE', 'PARCIAL')
GROUP BY a.ficha, a.marca, a.modelo, po.numero_requisicion
ORDER BY a.ficha;
```

### Obtener historial de compras por activo

```sql
-- Toda la historia de compras para un activo específico
SELECT 
  po.numero_requisicion,
  po.estado,
  pi.descripcion,
  pi.cantidad,
  pi.cantidad_recibida,
  pi.estado_linea,
  pi.observaciones,
  po.fecha_solicitud,
  po.solicitante
FROM purchase_items pi
JOIN purchase_orders po ON pi.purchase_id = po.id
WHERE pi.ficha_ref = 'FICHA-001'
ORDER BY po.fecha_solicitud DESC;
```

---

## 4️⃣ Testing

### Test: Crear Compra Multi-Activo

```javascript
// En un archivo de test (Jest/Vitest)

describe('RequisitionMultiAssetModal', () => {
  test('debería crear una compra multi-activo', async () => {
    const mockOnSubmit = jest.fn();
    const mockAssets = [
      { id: '1', ficha: 'FICHA-001', marca: 'Toyota', modelo: 'Hilux' },
      { id: '2', ficha: 'FICHA-002', marca: 'Nissan', modelo: 'Urvan' },
    ];

    const { getByText, getByPlaceholderText } = render(
      <RequisitionMultiAssetModal
        onClose={jest.fn()}
        onSubmit={mockOnSubmit}
      />,
      {
        wrapper: ({ children }) => (
          <AppProvider value={{ assets: mockAssets }}>
            {children}
          </AppProvider>
        ),
      }
    );

    // Llenar formulario
    fireEvent.change(getByPlaceholderText('REQ-2026-0001'), {
      target: { value: '001' }
    });
    fireEvent.change(getByPlaceholderText('Nombre del solicitante'), {
      target: { value: 'Juan García' }
    });

    // Agregar línea 1
    fireEvent.change(getByPlaceholderText('OLI-001'), {
      target: { value: 'OIL-001' }
    });
    fireEvent.change(getByPlaceholderText('Descripción'), {
      target: { value: 'Aceite SAE 40' }
    });
    // ... más cambios ...
    fireEvent.click(getByText('Agregar Línea'));

    // Crear solicitud
    fireEvent.click(getByText('Crear Solicitud'));

    // Verificar que onSubmit fue llamado
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        req: '001',
        solicitadoPor: 'Juan García',
        items: expect.any(Array),
      })
    );
  });

  test('debería rechazar requisición sin activo cuando tipoCompra=ACTIVO_ESPECIFICO', async () => {
    // ...test code...
  });

  test('debería permitir requisición sin activo cuando tipoCompra=GENERAL', async () => {
    // ...test code...
  });
});
```

### Test: AppContext Function

```javascript
describe('submitRequisitionMultiAsset', () => {
  test('debería insertar compra y actualizar activos', async () => {
    const { submitRequisitionMultiAsset } = useAppContext();

    const formData = {
      req: '001',
      solicitadoPor: 'Test User',
      project: 'Test Project',
      priority: 'Media',
      tipoCompra: 'ACTIVO_ESPECIFICO',
      items: [
        { code: 'OIL', desc: 'Aceite', qty: 2, ficha: 'FICHA-001', obsItem: '' },
        { code: 'FIL', desc: 'Filtro', qty: 1, ficha: 'FICHA-002', obsItem: '' },
      ]
    };

    const result = await submitRequisitionMultiAsset(formData);

    expect(result).toBe(true);
    
    // Verificar BD
    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('ficha', 'MULTI')
      .order('created_at', { ascending: false })
      .limit(1);
    
    expect(orders).toHaveLength(1);
    expect(orders[0].tipo_compra).toBe('ACTIVO_ESPECIFICO');
  });
});
```

---

## 5️⃣ Snippets Reutilizables

### Hook: usePurchaseMultiAsset

```javascript
// src/hooks/usePurchaseMultiAsset.js

import { useState } from 'react';
import { useAppContext } from '../AppContext';
import toast from 'react-hot-toast';

export const usePurchaseMultiAsset = () => {
  const { submitRequisitionMultiAsset, assets } = useAppContext();
  const [loading, setLoading] = useState(false);

  const createRequisition = async (formData) => {
    setLoading(true);
    try {
      const success = await submitRequisitionMultiAsset(formData);
      if (success) {
        toast.success('Requisición creada correctamente');
      }
      return success;
    } catch (error) {
      toast.error('Error al crear requisición');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createRequisition,
    loading,
    assets,
  };
};

// Uso en componente
const { createRequisition, loading } = usePurchaseMultiAsset();
```

### Utilidad: Validar Formulario

```javascript
// src/utils/purchaseValidation.js

export const validateMultiAssetForm = (formData) => {
  const errors = [];

  if (!formData.req?.trim()) {
    errors.push('Número de requisición requerido');
  }

  if (!formData.solicitadoPor?.trim()) {
    errors.push('Solicitante requerido');
  }

  if (!formData.items || formData.items.length === 0) {
    errors.push('Debe haber al menos una línea');
  }

  formData.items?.forEach((item, idx) => {
    if (!item.desc?.trim()) {
      errors.push(`Línea ${idx + 1}: Descripción requerida`);
    }
    if (item.qty <= 0) {
      errors.push(`Línea ${idx + 1}: Cantidad debe ser > 0`);
    }
    if (formData.tipoCompra === 'ACTIVO_ESPECIFICO' && !item.ficha) {
      errors.push(`Línea ${idx + 1}: Activo requerido`);
    }
  });

  return errors;
};

// Uso
const errors = validateMultiAssetForm(formData);
if (errors.length > 0) {
  errors.forEach(err => toast.error(err));
  return;
}
```

### Componente: Card de Requisición Multi-Activo

```jsx
// src/components/MultiAssetPurchaseCard.jsx

export const MultiAssetPurchaseCard = ({ purchase, onViewDetails }) => {
  const activos = purchase.fichas_relacionadas || [];
  const porcentaje = purchase.cantidad_lineas > 0 
    ? (purchase.lineas_recibidas / purchase.cantidad_lineas * 100).toFixed(0)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{purchase.numero_requisicion}</h3>
          <p className="text-sm text-gray-600">{purchase.solicitante}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold 
          ${purchase.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
            purchase.estado === 'RECIBIDA' ? 'bg-green-100 text-green-800' :
            'bg-orange-100 text-orange-800'}`}>
          {purchase.estado}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3 text-center">
        <div>
          <p className="text-xs text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-blue-600">
            {purchase.cantidad_activos}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Líneas</p>
          <p className="text-2xl font-bold text-purple-600">
            {purchase.cantidad_lineas}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Progreso</p>
          <p className="text-2xl font-bold text-green-600">
            {porcentaje}%
          </p>
        </div>
      </div>

      {/* Activos relacionados */}
      <div className="mb-3">
        <p className="text-xs font-semibold mb-1">Activos:</p>
        <div className="flex flex-wrap gap-1">
          {activos.map(ficha => (
            <span key={ficha} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {ficha}
            </span>
          ))}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-gray-200 rounded-full h-2 mb-3">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <button
        onClick={() => onViewDetails(purchase.id)}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm"
      >
        Ver Detalles
      </button>
    </div>
  );
};
```

---

## 📚 Importes Necesarios

```javascript
// Para RequisitionMultiAssetModal
import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, ChevronDown } from 'lucide-react';
import { useAppContext } from './AppContext';

// Para integración en componentes
import { useAppContext } from './AppContext';
import { RequisitionMultiAssetModal } from './RequisitionMultiAssetModal';
```

---

## 🔗 Referencias Cruzadas

- [GUIA_COMPRAS_MULTIACTIVO.md](GUIA_COMPRAS_MULTIACTIVO.md) - Guía de usuario
- [TECNICA_COMPRAS_MULTIACTIVO.md](TECNICA_COMPRAS_MULTIACTIVO.md) - Detalles técnicos
- [AppContext.jsx](src/AppContext.jsx) - Contexto principal
- [RequisitionMultiAssetModal.jsx](src/RequisitionMultiAssetModal.jsx) - Componente

---

**Versión**: 1.0  
**Última actualización**: Febrero 2026
