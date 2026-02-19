import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, XCircle, Clock, AlertTriangle, Upload, Camera, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * Modal: Recepción Parcial/Total de Orden
 * Permite marcar qué items llegaron y qué hacer con los faltantes
 */
export const PartialReceptionModal = ({ isOpen, onClose, purchaseOrder, onComplete }) => {
  const [tipoRecepcion, setTipoRecepcion] = useState('TOTAL'); // 'TOTAL' o 'PARCIAL'
  const[items, setItems] = useState([]);
  const [itemsPendientes, setItemsPendientes] = useState({});
  const [notasRecepcion, setNotasRecepcion] = useState('');
  const [actualizarActivo, setActualizarActivo] = useState(null); // null, 'DISPONIBLE', 'NO_DISPONIBLE'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      initializeItems();
      determineAssetUpdate();
    }
  }, [isOpen, purchaseOrder]);

  const initializeItems = () => {
    const initialItems = (purchaseOrder.purchase_items || []).map(item => ({
      ...item,
      cantidad_ordenada: item.cantidad,
      cantidad_recibida_actual: 0,
      cantidad_previa: item.cantidad_recibida || 0,
      cantidad_pendiente: item.cantidad - (item.cantidad_recibida || 0),
    }));
    setItems(initialItems);

    // Para cada item pendiente, inicializar acción
    const pendientes = {};
    initialItems.forEach(item => {
      if (item.cantidad_pendiente > 0) {
        pendientes[item.id] = {
          accion: 'ESPERAR_PROVEEDOR',
          motivo: '',
          fecha_estimada_nueva: '',
        };
      }
    });
    setItemsPendientes(pendientes);
  };

  const determineAssetUpdate = () => {
    // Si la orden tiene estado_operacional NO_DISPONIBLE, preguntar si puede volver a operar
    if (purchaseOrder.estado_operacional === 'NO_DISPONIBLE_ESPERA') {
      setActualizarActivo(null); // Forzar pregunta
    } else {
      setActualizarActivo(null);
    }
  };

  const getAffectedFichas = () => {
    const fichas = items
      .filter(item => item.ficha_ref)
      .map(item => item.ficha_ref);

    if (purchaseOrder.ficha && purchaseOrder.ficha !== 'MULTI') {
      fichas.push(purchaseOrder.ficha);
    }

    return [...new Set(fichas)];
  };

  const handleCantidadRecibidaChange = (itemId, cantidad) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        const nuevaCantidadRecibida = parseInt(cantidad) || 0;
        const pendiente = item.cantidad_ordenada - item.cantidad_previa - nuevaCantidadRecibida;
        return {
          ...item,
          cantidad_recibida_actual: nuevaCantidadRecibida,
          cantidad_pendiente: Math.max(0, pendiente),
        };
      }
      return item;
    });
    setItems(updated);

    // Auto-detectar tipo de recepción
    const todoRecibido = updated.every(item =>
      item.cantidad_previa + item.cantidad_recibida_actual >= item.cantidad_ordenada
    );
    setTipoRecepcion(todoRecibido ? 'TOTAL' : 'PARCIAL');
  };

  const updateItemPendiente = (itemId, field, value) => {
    setItemsPendientes({
      ...itemsPendientes,
      [itemId]: {
        ...itemsPendientes[itemId],
        [field]: value,
      },
    });
  };

  const calculateTotals = () => {
    const totalesDOP = { recibido: 0, pendiente: 0 };
    const totalesUSD = { recibido: 0, pendiente: 0 };

    items.forEach(item => {
      const precio = parseFloat(item.precio_unitario) || 0;
      const moneda = item.moneda || 'DOP';

      const montoRecibido = precio * item.cantidad_recibida_actual;
      const montoPendiente = precio * item.cantidad_pendiente;

      if (moneda === 'DOP') {
        totalesDOP.recibido += montoRecibido;
        totalesDOP.pendiente += montoPendiente;
      } else {
        totalesUSD.recibido += montoRecibido;
        totalesUSD.pendiente += montoPendiente;
      }
    });

    return { totalesDOP, totalesUSD };
  };

  const handleSubmit = async () => {
    // Validaciones
    const itemsRecibidos = items.filter(item => item.cantidad_recibida_actual > 0);
    if (itemsRecibidos.length === 0) {
      toast.error('Debes marcar al menos un item como recibido');
      return;
    }

    if (purchaseOrder.estado_operacional === 'NO_DISPONIBLE_ESPERA' && actualizarActivo === null) {
      toast.error('Debes indicar si el activo puede volver a operar');
      return;
    }

    setSaving(true);

    try {
      // 1. Llamar función de BD para registrar recepción parcial
      const itemsPayload = items
        .filter(item => item.cantidad_recibida_actual > 0)
        .map(item => ({
          item_id: item.id,
          cantidad_recibida: item.cantidad_recibida_actual,
        }));

      const { data, error } = await supabase.rpc('register_partial_reception', {
        p_purchase_order_id: purchaseOrder.id,
        p_items_received: itemsPayload,
      });

      if (error) throw error;

      // 2. Actualizar items pendientes con sus acciones
      for (const item of items) {
        if (item.cantidad_pendiente > 0 && itemsPendientes[item.id]) {
          await supabase
            .from('purchase_items')
            .update({
              accion_pendiente: itemsPendientes[item.id].accion,
              motivo_pendiente: itemsPendientes[item.id].motivo,
              fecha_estimada_nueva: itemsPendientes[item.id].fecha_estimada_nueva || null,
            })
            .eq('id', item.id);
        }
      }

      // 3. Actualizar estado de la orden
      const nuevoEstado = tipoRecepcion === 'TOTAL' ? 'RECIBIDO' : 'PARCIAL';
      await supabase
        .from('purchase_orders')
        .update({
          estado: nuevoEstado,
          comentario_recepcion: notasRecepcion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseOrder.id);

      // 4. Actualizar estado del activo según tipo de recepción
      const fichasAfectadas = getAffectedFichas();

      if (tipoRecepcion === 'TOTAL') {
        for (const ficha of fichasAfectadas) {
          await supabase
            .from('assets')
            .update({
              status: 'EN REPARACION',
              updated_at: new Date().toISOString(),
            })
            .eq('ficha', ficha);
        }
      } else if (
        tipoRecepcion === 'PARCIAL' &&
        purchaseOrder.estado_operacional === 'NO_DISPONIBLE_ESPERA' &&
        actualizarActivo === 'DISPONIBLE'
      ) {
        for (const ficha of fichasAfectadas) {
          await supabase
            .from('assets')
            .update({
              status: 'DISPONIBLE',
              updated_at: new Date().toISOString(),
            })
            .eq('ficha', ficha);
        }
      }

      // 5. Si hay items para re-cotizar, crear nuevas requisiciones
      const itemsRecotizar = items.filter(item =>
        item.cantidad_pendiente > 0 &&
        itemsPendientes[item.id]?.accion === 'RECOTIZAR'
      );

      if (itemsRecotizar.length > 0) {
        // Crear nueva orden para items pendientes
        const { data: newOrder, error: newOrderError } = await supabase
          .from('purchase_orders')
          .insert({
            ficha: purchaseOrder.ficha,
            numero_requisicion: `${purchaseOrder.numero_requisicion}-R`,
            estado: 'EN_COTIZACION',
            estado_operacional: purchaseOrder.estado_operacional,
            requiere_urgencia: purchaseOrder.requiere_urgencia,
            solicitante: purchaseOrder.solicitante,
            proyecto: purchaseOrder.proyecto,
            prioridad: purchaseOrder.prioridad,
            comentario_recepcion: `Re-cotización de items faltantes de ${purchaseOrder.numero_requisicion}`,
          })
          .select()
          .single();

        if (newOrderError) throw newOrderError;

        // Copiar items pendientes a la nueva orden
        for (const item of itemsRecotizar) {
          await supabase
            .from('purchase_items')
            .insert({
              purchase_id: newOrder.id,
              codigo: item.codigo,
              descripcion: item.descripcion,
              cantidad: item.cantidad_pendiente,
              ficha_ref: item.ficha_ref,
            });
        }
      }

      toast.success(
        tipoRecepcion === 'TOTAL'
          ? 'Recepción completada exitosamente'
          : `Recepción parcial registrada. ${itemsRecotizar.length > 0 ? 'Nueva requisición creada para items faltantes.' : ''}`
      );

      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error en recepción:', error);
      toast.error('Error al registrar recepción: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totales = calculateTotals();
  const itemsConPendientes = items.filter(item => item.cantidad_pendiente > 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-5 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-7 h-7" />
                Recepción de Orden
              </h2>
              <p className="text-sm text-green-100 mt-1">
                {purchaseOrder?.numero_requisicion} | Proveedor: {purchaseOrder?.purchase_items?.[0]?.proveedor || 'N/A'}
              </p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
          {/* Tipo de Recepción */}
          <div className="mb-6 flex gap-4 items-center">
            <span className="font-semibold text-gray-700">Tipo de Recepción:</span>
            <div className="flex gap-3">
              <div className={`
                px-4 py-2 rounded-lg font-semibold cursor-pointer transition
                ${tipoRecepcion === 'TOTAL'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                <CheckCircle className="inline w-5 h-5 mr-2" />
                Recepción Total
              </div>
              <div className={`
                px-4 py-2 rounded-lg font-semibold cursor-pointer transition
                ${tipoRecepcion === 'PARCIAL'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                <Clock className="inline w-5 h-5 mr-2" />
                Recepción Parcial
              </div>
            </div>
          </div>

          {/* Tabla de Items */}
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-gray-100 px-4 py-3 font-bold text-gray-800">
              📦 Items de la Orden
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
               <thead className="bg-gray-50 border-b-2">
                  <tr>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Item</th>
                    <th className="text-center p-3">Ordenado</th>
                    <th className="text-center p-3">Previo</th>
                    <th className="text-center p-3">Recibido Ahora</th>
                    <th className="text-center p-3">Pendiente</th>
                    <th className="text-right p-3">Precio Unit.</th>
                    <th className="text-right p-3">Monto Recibido</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const montoRecibido = (parseFloat(item.precio_unitario) || 0) * item.cantidad_recibida_actual;
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-medium">{item.descripcion}</div>
                          {item.codigo && (
                            <div className="text-xs text-gray-500">Cód: {item.codigo}</div>
                          )}
                        </td>
                        <td className="text-center p-3 font-semibold">{item.cantidad_ordenada}</td>
                        <td className="text-center p-3 text-gray-600">{item.cantidad_previa}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={item.cantidad_recibida_actual}
                            onChange={(e) => handleCantidadRecibidaChange(item.id, e.target.value)}
                            min="0"
                            max={item.cantidad_ordenada - item.cantidad_previa}
                            className="w-20 px-2 py-1 border-2 border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-green-400"
                          />
                        </td>
                        <td className="text-center p-3">
                          <span className={`
                            px-2 py-1 rounded font-bold text-sm
                            ${item.cantidad_pendiente > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
                          `}>
                            {item.cantidad_pendiente}
                          </span>
                        </td>
                        <td className="text-right p-3">
                          {item.moneda} ${(parseFloat(item.precio_unitario) || 0).toFixed(2)}
                        </td>
                        <td className="text-right p-3 font-bold text-green-600">
                          {item.moneda} ${montoRecibido.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-green-50 font-bold">
                  {totales.totalesDOP.recibido > 0 && (
                    <tr>
                      <td col Span="7" className="text-right p-3">TOTAL RECIBIDO DOP:</td>
                      <td className="text-right p-3 text-lg text-green-700">
                        DOP ${totales.totalesDOP.recibido.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {totales.totalesUSD.recibido > 0 && (
                    <tr>
                      <td colSpan="7" className="text-right p-3">TOTAL RECIBIDO USD:</td>
                      <td className="text-right p-3 text-lg text-green-700">
                        USD ${totales.totalesUSD.recibido.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {totales.totalesDOP.pendiente > 0 && (
                    <tr>
                      <td colSpan="7" className="text-right p-3">MONTO PENDIENTE DOP:</td>
                      <td className="text-right p-3 text-yellow-700">
                        DOP ${totales.totalesDOP.pendiente.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {totales.totalesUSD.pendiente > 0 && (
                    <tr>
                      <td colSpan="7" className="text-right p-3">MONTO PENDIENTE USD:</td>
                      <td className="text-right p-3 text-yellow-700">
                        USD ${totales.totalesUSD.pendiente.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Items No Recibidos - Acciones */}
          {itemsConPendientes.length > 0 && (
            <div className="border-2 border-yellow-300 rounded-xl overflow-hidden mb-6 bg-yellow-50">
              <div className="bg-yellow-100 px-4 py-3 font-bold text-yellow-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Items No Recibidos - ¿Qué hacer?
              </div>
              <div className="p-4 space-y-4">
                {itemsConPendientes.map(item => (
                  <div key={item.id} className="bg-white border border-yellow-200 rounded-lg p-4">
                    <div className="font-semibold mb-3">
                      {item.descripcion} - Pendiente: {item.cantidad_pendiente} unidades
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Opción 1: Esperar */}
                      <label className={`
                        border-2 rounded-lg p-3 cursor-pointer transition
                        ${itemsPendientes[item.id]?.accion === 'ESPERAR_PROVEEDOR'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-300'
                        }
                      `}>
                        <input
                          type="radio"
                          name={`accion-${item.id}`}
                          checked={itemsPendientes[item.id]?.accion === 'ESPERAR_PROVEEDOR'}
                          onChange={() => updateItemPendiente(item.id, 'accion', 'ESPERAR_PROVEEDOR')}
                          className="mr-2"
                        />
                        <Clock className="inline w-4 h-4 mr-1" />
                        <strong>Esperar al proveedor</strong>
                        {itemsPendientes[item.id]?.accion === 'ESPERAR_PROVEEDOR' && (
                          <input
                            type="date"
                            value={itemsPendientes[item.id]?.fecha_estimada_nueva || ''}
                            onChange={(e) => updateItemPendiente(item.id, 'fecha_estimada_nueva', e.target.value)}
                            className="mt-2 w-full px-2 py-1 border rounded text-sm"
                            placeholder="Nueva fecha estimada"
                          />
                        )}
                      </label>

                      {/* Opción 2: Re-cotizar */}
                      <label className={`
                        border-2 rounded-lg p-3 cursor-pointer transition
                        ${itemsPendientes[item.id]?.accion === 'RECOTIZAR'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-300'
                        }
                      `}>
                        <input
                          type="radio"
                          name={`accion-${item.id}`}
                          checked={itemsPendientes[item.id]?.accion === 'RECOTIZAR'}
                          onChange={() => updateItemPendiente(item.id, 'accion', 'RECOTIZAR')}
                          className="mr-2"
                        />
                        <Package className="inline w-4 h-4 mr-1" />
                        <strong>Re-cotizar con otros</strong>
                        <div className="text-xs text-gray-600 mt-1">
                          Se creará nueva requisición
                        </div>
                      </label>

                      {/* Opción 3: Cancelar */}
                      <label className={`
                        border-2 rounded-lg p-3 cursor-pointer transition
                        ${itemsPendientes[item.id]?.accion === 'CANCELADO'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-red-300'
                        }
                      `}>
                        <input
                          type="radio"
                          name={`accion-${item.id}`}
                          checked={itemsPendientes[item.id]?.accion === 'CANCELADO'}
                          onChange={() => updateItemPendiente(item.id, 'accion', 'CANCELADO')}
                          className="mr-2"
                        />
                        <XCircle className="inline w-4 h-4 mr-1" />
                        <strong>Cancelar item</strong>
                        {itemsPendientes[item.id]?.accion === 'CANCELADO' && (
                          <input
                            type="text"
                            value={itemsPendientes[item.id]?.motivo || ''}
                            onChange={(e) => updateItemPendiente(item.id, 'motivo', e.target.value)}
                            className="mt-2 w-full px-2 py-1 border rounded text-sm"
                            placeholder="Motivo de cancelación"
                          />
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actualización del Estado del Activo */}
          {purchaseOrder?.estado_operacional === 'NO_DISPONIBLE_ESPERA' && (
            <div className="border-2 border-orange-300 rounded-xl overflow-hidden mb-6 bg-orange-50">
              <div className="bg-orange-100 px-4 py-3 font-bold text-orange-900">
                🔧 Actualización del Activo
              </div>
              <div className="p-4">
                <p className="mb-3 text-gray-700">
                  El activo está actualmente <strong className="text-red-700">NO DISPONIBLE</strong>.
                  ¿Con los repuestos recibidos, puede volver a operar?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`
                    border-2 rounded-lg p-4 cursor-pointer transition
                    ${actualizarActivo === 'DISPONIBLE'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                    }
                  `}>
                    <input
                      type="radio"
                      name="actualizarActivo"
                      checked={actualizarActivo === 'DISPONIBLE'}
                      onChange={() => setActualizarActivo('DISPONIBLE')}
                      className="mr-2"
                    />
                    <CheckCircle className="inline w-5 h-5 mr-2 text-green-600" />
                    <strong>SÍ - Volver a DISPONIBLE</strong>
                    <div className="text-xs text-gray-600 mt-1">
                      El activo puede operar con los repuestos recibidos
                    </div>
                  </label>

                  <label className={`
                    border-2 rounded-lg p-4 cursor-pointer transition
                    ${actualizarActivo === 'NO_DISPONIBLE'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-red-300'
                    }
                  `}>
                    <input
                      type="radio"
                      name="actualizarActivo"
                      checked={actualizarActivo === 'NO_DISPONIBLE'}
                      onChange={() => setActualizarActivo('NO_DISPONIBLE')}
                      className="mr-2"
                    />
                    <XCircle className="inline w-5 h-5 mr-2 text-red-600" />
                    <strong>NO - Mantener NO DISPONIBLE</strong>
                    <div className="text-xs text-gray-600 mt-1">
                      Aún faltan repuestos críticos
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notas de Recepción */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">
              📝 Notas de Recepción (opcional)
            </label>
            <textarea
              value={notasRecepcion}
              onChange={(e) => setNotasRecepcion(e.target.value)}
              placeholder="Ej: Items llegaron en buen estado. Empaques intactos. Factura incluida..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 text-sm"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition font-bold disabled:opacity-50 shadow-lg flex items-center gap-2"
          >
            {saving ? (
              <>Registrando...</>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirmar Recepción
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartialReceptionModal;
