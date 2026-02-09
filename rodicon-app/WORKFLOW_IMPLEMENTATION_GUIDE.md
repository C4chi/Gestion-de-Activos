# 🔧 GUÍA DE IMPLEMENTACIÓN: Workflows Críticos

**Versión:** 1.0 | **Fecha:** 2025-12-10

---

## 📦 WORKFLOW 1: SOLICITAR REPUESTO (PARTS REQUEST)

### Arquitectura del Flujo

```
User Interface Layer (React)
    ↓
PartsRequestModal Component
    ├─ Captura: número requisición, proyecto, solicitante, ítems
    ├─ Valida: mínimo 1 ítem, req number no vacío
    ↓
useWorkshopWorkflow Hook
    ├─ Recopila datos del formulario
    ├─ Convierte items array a formato DB
    ↓
supabaseService.requestSpareParts()
    ├─ INSERT purchase_orders tabla
    ├─ INSERT multiple purchase_items
    ├─ UPDATE assets SET status = 'ESPERA REPUESTO'
    ├─ INSERT audit_log
    ├─ NOTIFY (webhook/email)
    ↓
AppContext.handleRequestParts()
    ├─ Refrescar lista de compras
    ├─ Refrescar dashboard taller
    ├─ Toast success
    ↓
Close Modal
```

### Implementación en React

**Archivo: `src/hooks/useWorkshopWorkflow.js` (Nueva)**
```javascript
import { useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';

export const useWorkshopWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. REQUEST SPARE PARTS
  const requestSpareParts = useCallback(async (formData, ficha, pin) => {
    setLoading(true);
    setError(null);

    try {
      // Validaciones previas
      if (!formData.numeroRequisicion?.trim()) {
        throw new Error('Número de requisición es requerido');
      }
      if (!formData.items || formData.items.length === 0) {
        throw new Error('Debe agregar al menos 1 ítem');
      }

      // Validar PIN (delegado a backend o AppContext)
      // await validatePin(pin);

      // 1. Crear purchase order
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          ficha,
          numero_requisicion: formData.numeroRequisicion,
          estado: 'PENDIENTE',
          solicitante: formData.solicitante,
          proyecto: formData.proyecto,
          prioridad: formData.prioridad || 'Normal',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('id')
        .single();

      if (poError) throw poError;

      // 2. Insertar items
      const itemsToInsert = formData.items.map(item => ({
        purchase_id: poData.id,
        codigo: item.code || '',
        descripcion: item.desc,
        cantidad: parseInt(item.qty),
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Actualizar asset status
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: 'ESPERA REPUESTO',
          numero_requisicion: formData.numeroRequisicion,
          updated_at: new Date(),
        })
        .eq('ficha', ficha);

      if (assetError) throw assetError;

      // 4. Crear audit log
      await supabase.from('audit_log').insert({
        accion: 'SOLICITAR_REPUESTO',
        tabla: 'purchase_orders',
        registro_id: poData.id,
        detalles: {
          ficha,
          numeroRequisicion: formData.numeroRequisicion,
          itemsCount: formData.items.length,
        },
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
      });

      return { success: true, purchaseId: poData.id };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. RECEIVE SPARE PARTS (PARCIAL o TOTAL)
  const receiveSpareParts = useCallback(async (ficha, mode = 'TOTAL', pin) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener purchase order actual
      const { data: poData, error: poFetchError } = await supabase
        .from('purchase_orders')
        .select('id, numero_requisicion')
        .eq('ficha', ficha)
        .eq('estado', 'ORDENADO')
        .order('fecha_solicitud', { ascending: false })
        .limit(1)
        .single();

      if (poFetchError) throw new Error('No hay orden de compra pendiente');

      // 2. Actualizar estado de purchase order
      const newPoStatus = mode === 'PARCIAL' ? 'PARCIAL' : 'RECIBIDO';
      const { error: poUpdateError } = await supabase
        .from('purchase_orders')
        .update({ 
          estado: newPoStatus,
          fecha_actualizacion: new Date(),
        })
        .eq('id', poData.id);

      if (poUpdateError) throw poUpdateError;

      // 3. Actualizar asset status según modo
      let assetNewStatus = 'ESPERA REPUESTO'; // PARCIAL: mantener
      if (mode === 'TOTAL') {
        assetNewStatus = 'NO DISPONIBLE'; // Listo para reparación
      }

      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: assetNewStatus,
          updated_at: new Date(),
        })
        .eq('ficha', ficha);

      if (assetError) throw assetError;

      // 4. Si es TOTAL, crear entrada en maintenance_logs
      if (mode === 'TOTAL') {
        await supabase.from('maintenance_logs').insert({
          ficha,
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'REPUESTO RECIBIDO',
          descripcion: `Repuesto recibido - Requisición ${poData.numero_requisicion}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      // 5. Audit log
      await supabase.from('audit_log').insert({
        accion: `RECIBIR_REPUESTO_${mode}`,
        tabla: 'purchase_orders',
        registro_id: poData.id,
        detalles: { ficha, modo: mode },
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
      });

      return { success: true, newStatus: assetNewStatus };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. CLOSE WORKSHOP ORDER (Finalizar reparación)
  const closeWorkshopOrder = useCallback(async (closeData, pin) => {
    setLoading(true);
    setError(null);

    try {
      const { ficha, mecanico, descripcion, costo, km, proyeccion } = closeData;

      // 1. Crear entrada en maintenance_logs
      const { error: mtoError } = await supabase
        .from('maintenance_logs')
        .insert({
          ficha,
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'CORRECTIVO',
          descripcion,
          costo: parseFloat(costo) || 0,
          mecanico,
          km_recorrido: parseInt(km) || null,
          proyeccion_proxima_mto: proyeccion || null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (mtoError) throw mtoError;

      // 2. Actualizar asset status → DISPONIBLE
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: 'DISPONIBLE',
          numero_requisicion: null, // Limpiar
          taller_responsable: null,
          proyeccion_entrada: null,
          proyeccion_salida: null,
          updated_at: new Date(),
        })
        .eq('ficha', ficha);

      if (assetError) throw assetError;

      // 3. Audit log
      await supabase.from('audit_log').insert({
        accion: 'CERRAR_ORDEN_TALLER',
        tabla: 'maintenance_logs',
        registro_id: ficha,
        detalles: { mecanico, costo, km },
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
      });

      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requestSpareParts,
    receiveSpareParts,
    closeWorkshopOrder,
    loading,
    error,
  };
};
```

### Componente React

**Archivo: `src/components/Workshop/PartsRequestModal.jsx` (Nueva)**
```javascript
import React, { useState } from 'react';
import { useWorkshopWorkflow } from '../../hooks/useWorkshopWorkflow';
import { toast } from 'react-hot-toast';

export const PartsRequestModal = ({ isOpen, onClose, ficha, onSuccess }) => {
  const { requestSpareParts, loading } = useWorkshopWorkflow();
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    numeroRequisicion: '',
    solicitante: '',
    proyecto: '',
    prioridad: 'Normal',
  });
  const [newItem, setNewItem] = useState({
    code: '',
    desc: '',
    qty: '',
  });

  const handleAddItem = () => {
    if (!newItem.desc || !newItem.qty) {
      toast.error('Descripción y cantidad son requeridas');
      return;
    }
    setItems([...items, { ...newItem }]);
    setNewItem({ code: '', desc: '', qty: '' });
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.numeroRequisicion) {
      toast.error('Número de requisición es requerido');
      return;
    }
    if (items.length === 0) {
      toast.error('Agregue al menos un ítem');
      return;
    }

    try {
      await requestSpareParts({ ...formData, items }, ficha);
      toast.success('Repuesto solicitado exitosamente');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Solicitar Repuesto</h2>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nro. Requisición"
            value={formData.numeroRequisicion}
            onChange={(e) => setFormData({ ...formData, numeroRequisicion: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          
          <input
            type="text"
            placeholder="Solicitante"
            value={formData.solicitante}
            onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />

          <div className="border-t pt-4 mt-4">
            <h3 className="font-bold mb-2">Ítems</h3>
            
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Código (opcional)"
                value={newItem.code}
                onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Descripción"
                value={newItem.desc}
                onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Cantidad"
                value={newItem.qty}
                onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddItem}
                className="w-full bg-blue-500 text-white py-2 rounded font-bold hover:bg-blue-600"
              >
                Agregar Ítem
              </button>
            </div>

            {items.length > 0 && (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Código</th>
                    <th className="text-left p-2">Descripción</th>
                    <th className="text-center p-2">Cantidad</th>
                    <th className="text-center p-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 font-mono text-xs">{item.code || '-'}</td>
                      <td className="p-2">{item.desc}</td>
                      <td className="p-2 text-center">{item.qty}</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded font-bold hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '⏳ Enviando...' : '✅ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 💳 WORKFLOW 2: CAMBIAR ESTADO DE COMPRA (PURCHASE STATUS UPDATE)

### Estados y Transiciones Válidas

```javascript
const VALID_TRANSITIONS = {
  'PENDIENTE': ['ORDENADO'],
  'ORDENADO': ['PARCIAL', 'RECIBIDO'],
  'PARCIAL': ['RECIBIDO'],
  'RECIBIDO': [] // Terminal state
};
```

### Casos Especiales

**Caso 1: PENDIENTE → ORDENADO**
- El comprador confirma que ha realizado la orden
- No requiere comentario
- Asset sigue en "ESPERA REPUESTO"

**Caso 2: ORDENADO → PARCIAL**
- Solo parte del repuesto ha llegado
- Requiere comentario: "Qué llegó, qué falta, cuándo llega el resto"
- Asset mantiene status "ESPERA REPUESTO"

**Caso 3: ORDENADO → RECIBIDO (o PARCIAL → RECIBIDO)**
- Repuesto completo ha llegado
- Opcional: Comentario con detalles de recepción
- Asset pasa a "NO DISPONIBLE" (listo para reparación)

### Implementación

**Archivo: `src/hooks/usePurchasingWorkflow.js` (Nueva)**
```javascript
import { useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';

export const usePurchasingWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updatePurchaseStatus = useCallback(
    async (purchaseOrderId, newStatus, comment = '', pin) => {
      setLoading(true);
      setError(null);

      try {
        // 1. Obtener datos de la orden actual
        const { data: poData, error: fetchError } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('id', purchaseOrderId)
          .single();

        if (fetchError) throw fetchError;

        // 2. Validar transición
        const validTransitions = {
          'PENDIENTE': ['ORDENADO'],
          'ORDENADO': ['PARCIAL', 'RECIBIDO'],
          'PARCIAL': ['RECIBIDO'],
          'RECIBIDO': [],
        };

        if (!validTransitions[poData.estado]?.includes(newStatus)) {
          throw new Error(
            `Transición inválida: ${poData.estado} → ${newStatus}`
          );
        }

        // 3. Actualizar purchase order
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({
            estado: newStatus,
            comentario_recepcion: newStatus === 'PARCIAL' ? comment : null,
            fecha_actualizacion: new Date(),
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq('id', purchaseOrderId);

        if (updateError) throw updateError;

        // 4. Actualizar asset si necesario
        if (newStatus === 'RECIBIDO') {
          const { error: assetError } = await supabase
            .from('assets')
            .update({
              status: 'NO DISPONIBLE',
              updated_at: new Date(),
            })
            .eq('ficha', poData.ficha);

          if (assetError) throw assetError;
        }

        // 5. Crear entrada de auditoría
        await supabase.from('audit_log').insert({
          accion: 'UPDATE_PURCHASE_STATUS',
          tabla: 'purchase_orders',
          registro_id: purchaseOrderId,
          detalles: {
            from: poData.estado,
            to: newStatus,
            comment: newStatus === 'PARCIAL' ? comment : null,
          },
          usuario_id: (await supabase.auth.getUser()).data.user?.id,
        });

        return { success: true, newStatus };
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { updatePurchaseStatus, loading, error };
};
```

### Componente: Comment Modal

**Archivo: `src/components/Purchasing/CommentModal.jsx` (Nueva)**
```javascript
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

export const CommentModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Agregar Comentario',
}) => {
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!comment.trim()) {
      toast.error('Por favor escriba un comentario');
      return;
    }
    onConfirm?.(comment);
    setComment('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ingrese detalles de la recepción parcial..."
          className="w-full border rounded px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded font-bold hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Setup (Hoy)
- [ ] Ejecutar SQL migrations en Supabase
- [ ] Verificar tablas creadas
- [ ] Verificar RLS policies activas

### Fase 2: Workshop (Próximos 3 días)
- [ ] Crear hook `useWorkshopWorkflow`
- [ ] Crear componente `PartsRequestModal`
- [ ] Crear componente `ReceivePartsModal`
- [ ] Integrar en `WorkshopMonitor.jsx`
- [ ] Testear flujo completo

### Fase 3: Purchasing (Próximos 3 días)
- [ ] Crear hook `usePurchasingWorkflow`
- [ ] Crear componente `CommentModal`
- [ ] Refactorizar `PurchasingManagement.jsx`
- [ ] Crear componente `PurchaseCard`
- [ ] Testear transiciones de estado

### Fase 4: Integración (1-2 días)
- [ ] Conectar PIN validation en AppContext
- [ ] Agregar notificaciones con react-hot-toast
- [ ] Testing de edge cases
- [ ] Performance optimization

---

## 🧪 TESTING MANUAL

### Test 1: Solicitar Repuesto
```
1. Ir a Taller → Seleccionar vehículo en taller
2. Click "Solicitar Repuesto"
3. Llenar formulario:
   - Nro. Requisición: REQ-20251210-0001
   - Solicitante: Mechico 1
   - Proyecto: Reparación motor
   - Agregar 2 ítems:
     * Filtro de aire, cantidad 2
     * Pastillas de freno, cantidad 1
4. Confirmar
5. Verificar en DB:
   - purchase_orders: registro creado con estado PENDIENTE
   - purchase_items: 2 registros creados
   - assets: status actualizado a ESPERA REPUESTO
   - audit_log: entrada registrada
```

### Test 2: Recibir Parcial
```
1. Ir a Compras → Encontrar orden en estado ORDENADO
2. Click "Recepción Parcial"
3. Modal de comentario aparece
4. Escribir: "Llegó filtro de aire (2 unidades). Frenos llegan el 15/12"
5. Confirmar + ingresar PIN
6. Verificar:
   - purchase_orders: estado = PARCIAL, comentario guardado
   - assets: status sigue en ESPERA REPUESTO
   - No se crea entrada en maintenance_logs
```

### Test 3: Completar a Total
```
1. Ir a Compras → Encontrar orden en estado PARCIAL
2. Click "Completar Recepción"
3. No pide comentario (estado PARCIAL → RECIBIDO directo)
4. Confirmar + PIN
5. Verificar:
   - purchase_orders: estado = RECIBIDO
   - assets: status = NO DISPONIBLE
   - maintenance_logs: entrada creada con tipo "REPUESTO RECIBIDO"
```

---

**Versión:** 1.0 | **Estado:** Listo para implementación  
