import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, DollarSign, Calendar, Package } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * Modal: Gestión de Múltiples Cotizaciones
 * Permite a Compras ingresar mínimo 3 cotizaciones por requisición
 */
export const MultipleQuotationsModal = ({ isOpen, onClose, purchaseOrder, onComplete }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      // Inicializar con 3 cotizaciones vacías
      initializeCotizaciones();
      loadExistingQuotations();
    }
  }, [isOpen, purchaseOrder]);

  const initializeCotizaciones = () => {
    const emptyCotizacion = createEmptyCotizacion();
    setCotizaciones([emptyCotizacion, { ...emptyCotizacion }, { ...emptyCotizacion }]);
  };

  const createEmptyCotizacion = () => ({
    id: crypto.randomUUID(),
    proveedor: '',
    contacto_proveedor: '',
    telefono_proveedor: '',
    numero_cotizacion: '',
    fecha_cotizacion: new Date().toISOString().split('T')[0],
    dias_entrega: '',
    condiciones_pago: '',
    notas: '',
    items: (purchaseOrder?.purchase_items || []).map(item => ({
      purchase_item_id: item.id,
      descripcion: item.descripcion,
      codigo: item.codigo,
      cantidad: item.cantidad,
      precio_unitario: 0,
      moneda: 'DOP',
      disponible: true,
      tiempo_entrega_dias: '',
    }))
  });

  const loadExistingQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_quotations')
        .select(`
          *,
          purchase_quotation_items (
            *,
            purchase_items (descripcion, codigo, cantidad)
          )
        `)
        .eq('purchase_order_id', purchaseOrder.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map(cot => ({
          id: cot.id,
          proveedor: cot.proveedor,
          contacto_proveedor: cot.contacto_proveedor,
          telefono_proveedor: cot.telefono_proveedor,
          numero_cotizacion: cot.numero_cotizacion,
          fecha_cotizacion: cot.fecha_cotizacion,
          dias_entrega: cot.dias_entrega,
          condiciones_pago: cot.condiciones_pago,
          notas: cot.notas,
          items: cot.purchase_quotation_items.map(qi => ({
            purchase_item_id: qi.purchase_item_id,
            descripcion: qi.purchase_items.descripcion,
            codigo: qi.purchase_items.codigo,
            cantidad: qi.purchase_items.cantidad,
            precio_unitario: qi.precio_unitario,
            moneda: qi.moneda,
            disponible: qi.disponible,
            tiempo_entrega_dias: qi.tiempo_entrega_dias,
          }))
        }));
        setCotizaciones(formatted);
      }
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    }
  };

  const handleAddCotizacion = () => {
    setCotizaciones([...cotizaciones, createEmptyCotizacion()]);
  };

  const handleRemoveCotizacion = (index) => {
    // La primera cotización es OBLIGATORIA, no se puede eliminar
    if (index === 0) {
      toast.error('La primera cotización es obligatoria y no se puede eliminar');
      return;
    }
    
    if (cotizaciones.length <= 1) {
      toast.error('Debes mantener al menos 1 cotización');
      return;
    }
    
    setCotizaciones(cotizaciones.filter((_, i) => i !== index));
  };

  const updateCotizacion = (index, field, value) => {
    const updated = [...cotizaciones];
    updated[index][field] = value;
    setCotizaciones(updated);
  };

  const updateItem = (cotIndex, itemIndex, field, value) => {
    const updated = [...cotizaciones];
    updated[cotIndex].items[itemIndex][field] = value;
    setCotizaciones(updated);
  };

  const calculateTotal = (items, moneda) => {
    return items.reduce((sum, item) => {
      if (item.moneda === moneda) {
        return sum + (parseFloat(item.precio_unitario) || 0) * item.cantidad;
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async () => {
    // Validación: al menos 1 cotización (la primera es obligatoria)
    if (cotizaciones.length < 1) {
      toast.error('Debes ingresar al menos 1 cotización');
      return;
    }

    // Validar que la primera cotización esté completa (obligatoria)
    const primera = cotizaciones[0];
    if (!primera.proveedor || !primera.numero_cotizacion) {
      toast.error('La primera cotización debe tener proveedor y número de cotización');
      return;
    }

    // Validar cotizaciones adicionales (solo si tienen datos parciales)
    const adicionales = cotizaciones.slice(1);
    const incompletas = adiciona válida
      for (const cot of cotizacionesValida_cotizacion) || (!cot.proveedor && cot.numero_cotizacion)
    );
    
    if (incompletas.length > 0) {
      toast.error('Las cotizaciones adicionales deben tener proveedor y número de cotización, o estar vacías para omitirlas');
      return;
    }

    // Filtrar cotizaciones válidas (primera + adicionales completas)
    const cotizacionesValidas = cotizaciones.filter((cot, idx) => {
      if (idx === 0) return true; // Primera siempre se incluye
      return cot.proveedor && cot.numero_cotizacion; // Adicionales solo si están completas
    });

    if (cotizacionesValidas.length < 3) {
      toast.error('Se recomienda mínimo 3 cotizaciones para mejor comparación');
      // Continuar de todos modos, solo advertencia
    }

    setSaving(true);

    try {
      // Guardar cada cotización
      for (const cot of cotizaciones) {
        const { data: quotationData, error: quotationError } = await supabase
          .from('purchase_quotations')
          .upsert({
            id: typeof cot.id === 'string' && cot.id.includes('-') ? undefined : cot.id,
            purchase_order_id: purchaseOrder.id,
            proveedor: cot.proveedor,
            contacto_proveedor: cot.contacto_proveedor,
            telefono_proveedor: cot.telefono_proveedor,
            numero_cotizacion: cot.numero_cotizacion,
            fecha_cotizacion: cot.fecha_cotizacion,
            dias_entrega: parseInt(cot.dias_entrega) || null,
            condiciones_pago: cot.condiciones_pago,
            notas: cot.notas,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (quotationError) throw quotationError;

        // Guardar items de la cotización
        for (const item of cot.items) {
          const { error: itemError } = await supabase
            .from('purchase_quotation_items')
            .upsert({
              quotation_id: quotationData.id,
              purchase_item_id: item.purchase_item_id,
              precio_unitario: parseFloat(item.precio_unitario) || 0,
              moneda: item.moneda,
              disponible: item.disponible,
              tiempo_entrega_dias: parseInt(item.tiempo_entrega_dias) || null,
            });

          if (itemError) throw itemError;
        }
      }

      // Actualizar estado de la orden a PENDIENTE_APROBACION
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          estado: 'PENDIENTE_APROBACION',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseOrder.id);

      if (updateError) throw updateError;

      toast.success(`${cotizacionesValidas.length} cotización(es) guardada(s). Enviado a Gerencia para aprobación.`);
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error guardando cotizaciones:', error);
      toast.error('Error al guardar cotizaciones: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="w-7 h-7" />
                Gestión de Cotizaciones
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                Orden: {purchaseOrder?.numero_requisicion} | Mínimo 1 cotización obligatoria, 3 recomendadas
              </p>
              {purchaseOrder?.requiere_urgencia && (
                <div className="mt-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block">
                  🚨 URGENTE - Activo detenido
                </div>
              )}
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Cotizaciones */}
          <div className="space-y-6">
            {cotizaciones.map((cot, cotIndex) => (
              <div key={cot.id} className="border-2 border-blue-200 rounded-xl overflow-hidden">
                {/* Header de Cotización */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                      📋 Cotización #{cotIndex + 1}
                      {cotIndex === 0 && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">OBLIGATORIA</span>
                      )}
                      {cotIndex >= 1 && cotIndex <= 2 && (
                        <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">RECOMENDADA</span>
                      )}
                      {cotIndex > 2 && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">ADICIONAL</span>
                      )}
                    </h3>
                    {cotIndex !== 0 && (
                      <button
                        onClick={() => handleRemoveCotizacion(cotIndex)}
                        className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition"
                        title="Eliminar cotización"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Datos del Proveedor */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Proveedor *
                      </label>
                      <input
                        type="text"
                        value={cot.proveedor}
                        onChange={(e) => updateCotizacion(cotIndex, 'proveedor', e.target.value)}
                        placeholder="Nombre del proveedor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nº Cotización *
                      </label>
                      <input
                        type="text"
                        value={cot.numero_cotizacion}
                        onChange={(e) => updateCotizacion(cotIndex, 'numero_cotizacion', e.target.value)}
                        placeholder="COT-2026-001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Días de Entrega
                      </label>
                      <input
                        type="number"
                        value={cot.dias_entrega}
                        onChange={(e) => updateCotizacion(cotIndex, 'dias_entrega', e.target.value)}
                        placeholder="5"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Contacto
                      </label>
                      <input
                        type="text"
                        value={cot.contacto_proveedor}
                        onChange={(e) => updateCotizacion(cotIndex, 'contacto_proveedor', e.target.value)}
                        placeholder="Nombre del contacto"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={cot.telefono_proveedor}
                        onChange={(e) => updateCotizacion(cotIndex, 'telefono_proveedor', e.target.value)}
                        placeholder="809-555-5555"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Items y Precios
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b-2">
                          <tr>
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Descripción</th>
                            <th className="text-center p-2">Cant.</th>
                            <th className="text-right p-2">Precio Unit.</th>
                            <th className="text-center p-2">Moneda</th>
                            <th className="text-center p-2">Disponible</th>
                            <th className="text-right p-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cot.items.map((item, itemIndex) => {
                            const subtotal = (parseFloat(item.precio_unitario) || 0) * item.cantidad;
                            return (
                              <tr key={itemIndex} className="border-b hover:bg-gray-50">
                                <td className="p-2">{itemIndex + 1}</td>
                                <td className="p-2">
                                  <div className="font-medium">{item.descripcion}</div>
                                  {item.codigo && (
                                    <div className="text-xs text-gray-500">Cód: {item.codigo}</div>
                                  )}
                                </td>
                                <td className="text-center p-2">{item.cantidad}</td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={item.precio_unitario}
                                    onChange={(e) => updateItem(cotIndex, itemIndex, 'precio_unitario', e.target.value)}
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="w-20 px-2 py-1 border rounded text-right focus:ring-1 focus:ring-blue-400"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={item.moneda}
                                    onChange={(e) => updateItem(cotIndex, itemIndex, 'moneda', e.target.value)}
                                    className="px-2 py-1 border rounded text-sm bg-white focus:ring-1 focus:ring-blue-400"
                                  >
                                    <option value="DOP">DOP</option>
                                    <option value="USD">USD</option>
                                  </select>
                                </td>
                                <td className="text-center p-2">
                                  <input
                                    type="checkbox"
                                    checked={item.disponible}
                                    onChange={(e) => updateItem(cotIndex, itemIndex, 'disponible', e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                </td>
                                <td className="text-right p-2 font-semibold">
                                  {item.moneda} ${subtotal.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-blue-50 font-bold">
                          {['DOP', 'USD'].map(moneda => {
                            const total = calculateTotal(cot.items, moneda);
                            if (total > 0) {
                              return (
                                <tr key={moneda}>
                                  <td colSpan="6" className="text-right p-2">TOTAL {moneda}:</td>
                                  <td className="text-right p-2 text-lg text-blue-700">
                                    {moneda} ${total.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            }
                            return null;
                          })}
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Condiciones de pago / Notas
                    </label>
                    <textarea
                      value={cot.notas}
                      onChange={(e) => updateCotizacion(cotIndex, 'notas', e.target.value)}
                      placeholder="Ej: 50% adelanto, 50% contra entrega. Incluye IVA. Garantía 6 meses..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Agregar Cotización */}
          <button
            onClick={handleAddCotizacion}
            className="w-full mt-4 1 ? (
              <span className="text-red-600 font-semibold">
                ⚠️ Falta cotización obligatoria
              </span>
            ) : cotizaciones.length < 3 ? (
              <span className="text-orange-600 font-semibold">
                ⚠️ Se recomienda agregar {3 - cotizaciones.length} cotización(es) más para mejor comparación
              </span>
            ) : (
              <span className="text-green-600 font-semibold">
                ✓ {cotizaciones.length} cotizaciones listas
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || cotizaciones.length < 1
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || cotizaciones.length < 3}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {saving ? 'Guardando...' : '✅ Enviar a Gerencia para Aprobación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultipleQuotationsModal;
