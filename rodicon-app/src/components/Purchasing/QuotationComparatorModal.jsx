import React, { useState, useEffect } from 'react';
import { CheckCircle, X, DollarSign, Clock, AlertTriangle, TrendingUp, Truck } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * Modal: Comparador de Cotizaciones (Gerencia)
 * Permite comparar lado a lado todas las cotizaciones y aprobar una
 * Solo GERENTE_TALLER puede aprobar
 */
export const QuotationComparatorModal = ({ isOpen, onClose, purchaseOrder, canApprove = false, onApprove }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadQuotations();
    }
  }, [isOpen, purchaseOrder]);

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_quotations')
        .select(`
          *,
          purchase_quotation_items (
            *,
            purchase_items (id, descripcion, codigo, cantidad)
          )
        `)
        .eq('purchase_order_id', purchaseOrder.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Procesar y calcular totales
      const processed = (data || []).map(cot => {
        const itemsWithSubtotals = cot.purchase_quotation_items.map(qi => ({
          ...qi,
          subtotal: qi.precio_unitario * qi.purchase_items.cantidad
        }));

        const totalDOP = itemsWithSubtotals
          .filter(item => item.moneda === 'DOP')
          .reduce((sum, item) => sum + item.subtotal, 0);

        const totalUSD = itemsWithSubtotals
          .filter(item => item.moneda === 'USD')
          .reduce((sum, item) => sum + item.subtotal, 0);

        return {
          ...cot,
          items: itemsWithSubtotals,
          totalDOP,
          totalUSD,
          dias_entrega: cot.dias_entrega || 0
        };
      });

      setCotizaciones(processed);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
      toast.error('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedQuotation) {
      toast.error('Debes seleccionar una cotización');
      return;
    }

    if (!canApprove) {
      toast.error('⚠️ Solo el Gerente de Taller puede aprobar cotizaciones');
      return;
    }

    setSaving(true);
    try {
      // Obtener usuario actual
      const { data: userData } = await supabase.auth.getUser();

      // 1. Marcar cotización como aprobada
      const { error: quotationError } = await supabase
        .from('purchase_quotations')
        .update({ es_aprobada: true })
        .eq('id', selectedQuotation);

      if (quotationError) throw quotationError;

      // 2. Actualizar orden con cotización aprobada
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({
          estado: 'APROBADO',
          cotizacion_aprobada_id: selectedQuotation,
          aprobado_por: userData?.user?.id,
          fecha_aprobacion: new Date().toISOString(),
          comentario_aprobacion: comentario,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseOrder.id);

      if (orderError) throw orderError;

      // 3. Actualizar purchase_items con precios de la cotización aprobada
      const cotizacionAprobada = cotizaciones.find(c => c.id === selectedQuotation);
      for (const item of cotizacionAprobada.items) {
        await supabase
          .from('purchase_items')
          .update({
            precio_unitario: item.precio_unitario,
            moneda: item.moneda,
            proveedor: cotizacionAprobada.proveedor,
            cotizacion: cotizacionAprobada.numero_cotizacion,
          })
          .eq('id', item.purchase_item_id);
      }

      toast.success('Cotización aprobada exitosamente');
      onApprove?.();
      onClose();
    } catch (error) {
      console.error('Error aprobando cotización:', error);
      toast.error('Error al aprobar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRecomendacion = () => {
    if (cotizaciones.length === 0) return null;

    const isUrgente = purchaseOrder?.requiere_urgencia;
    let mejor = cotizaciones[0];
    let razon = '';

    if (isUrgente) {
      // Para casos urgentes: priorizar tiempo
      mejor = cotizaciones.reduce((prev, curr) =>
        curr.dias_entrega < prev.dias_entrega ? curr : prev
      );
      razon = 'Entrega más rápida (activo detenido)';
    } else {
      // Para casos normales: priorizar precio
      mejor = cotizaciones.reduce((prev, curr) =>
        (curr.totalDOP + curr.totalUSD * 60) < (prev.totalDOP + prev.totalUSD * 60) ? curr : prev
      );
      razon = 'Mejor precio';
    }

    return { cotizacion: mejor, razon };
  };

  const recomendacion = getRecomendacion();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-[95vw] w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-7 h-7" />
                Comparador de Cotizaciones - Aprobación Gerencial
              </h2>
              <p className="text-sm text-purple-100 mt-1">
                Orden: {purchaseOrder?.numero_requisicion} | Activo: {purchaseOrder?.ficha || 'MULTI'}
              </p>
              {purchaseOrder?.requiere_urgencia && (
                <div className="mt-2 flex items-center gap-4">
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    🚨 URGENTE - Activo detenido
                  </div>
                  {purchaseOrder?.fecha_activo_detenido && (
                    <span className="text-sm">
                      ⏱️ Detenido hace:{' '}
                      {Math.floor(
                        (new Date() - new Date(purchaseOrder.fecha_activo_detenido)) / (1000 * 60 * 60 * 24)
                      )} días
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando cotizaciones...</p>
            </div>
          ) : cotizaciones.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600">No hay cotizaciones disponibles para esta orden</p>
            </div>
          ) : (
            <>
              {/* Recomendación IA */}
              {recomendacion && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white p-2 rounded-lg">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-900 text-lg mb-1">💡 Recomendación del Sistema</h3>
                      <p className="text-blue-800">
                        <strong>{recomendacion.cotizacion.proveedor}</strong> -{' '}
                        {recomendacion.razon}
                      </p>
                      <div className="mt-2 flex gap-4 text-sm">
                        <span className="font-semibold text-blue-700">
                          {recomendacion.cotizacion.dias_entrega} días de entrega
                        </span>
                        {recomendacion.cotizacion.totalDOP > 0 && (
                          <span className="font-semibold text-green-700">
                            DOP ${recomendacion.cotizacion.totalDOP.toFixed(2)}
                          </span>
                        )}
                        {recomendacion.cotizacion.totalUSD > 0 && (
                          <span className="font-semibold text-green-700">
                            USD ${recomendacion.cotizacion.totalUSD.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabla Comparativa */}
              <div className="overflow-x-auto">
                <h3 className="font-bold text-gray-800 mb-3 text-lg">📊 Comparación Detallada</h3>
                
                {/* Headers */}
                <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `200px repeat(${cotizaciones.length}, 1fr)` }}>
                  <div className="font-bold text-gray-700"></div>
                  {cotizaciones.map((cot, index) => (
                    <div
                      key={cot.id}
                      className={`
                        border-2 rounded-lg p-4 transition-all cursor-pointer
                        ${selectedQuotation === cot.id
                          ? 'border-purple-500 bg-purple-50 shadow-lg ring-2 ring-purple-200'
                          : 'border-gray-300 bg-gray-50 hover:border-purple-300'
                        }
                        ${recomendacion?.cotizacion.id === cot.id ? 'ring-2 ring-blue-300' : ''}
                      `}
                      onClick={() => setSelectedQuotation(cot.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900">
                          Cotización #{index + 1}
                        </h4>
                        {selectedQuotation === cot.id && (
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="font-semibold text-purple-700">{cot.proveedor}</p>
                        <p className="text-gray-600 text-xs">{cot.numero_cotizacion}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Información General */}
                <div className="border rounded-lg overflow-hidden mb-4">
                  {/* Días de Entrega */}
                  <div className="grid gap-3 border-b p-3 bg-gray-50" style={{ gridTemplateColumns: `200px repeat(${cotizaciones.length}, 1fr)` }}>
                    <div className="font-semibold text-gray-700 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Días de Entrega
                    </div>
                    {cotizaciones.map(cot => (
                      <div key={cot.id} className="text-center">
                        <span className={`
                          inline-block px-3 py-1 rounded-full font-bold
                          ${cot.dias_entrega <= 3 ? 'bg-green-100 text-green-700' :
                            cot.dias_entrega <= 7 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'}
                        `}>
                          {cot.dias_entrega} días
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div className="grid gap-3 border-b p-3" style={{ gridTemplateColumns: `200px repeat(${cotizaciones.length}, 1fr)` }}>
                    <div className="font-semibold text-gray-700 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total DOP
                    </div>
                    {cotizaciones.map(cot => (
                      <div key={cot.id} className="text-center font-bold text-green-700">
                        ${cot.totalDOP.toFixed(2)}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 p-3" style={{ gridTemplateColumns: `200px repeat(${cotizaciones.length}, 1fr)` }}>
                    <div className="font-semibold text-gray-700 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total USD
                    </div>
                    {cotizaciones.map(cot => (
                      <div key={cot.id} className="text-center font-bold text-blue-700">
                        ${cot.totalUSD.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items Detallados */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 font-bold text-gray-800">
                    Detalle por Ítem
                  </div>
                  {purchaseOrder?.purchase_items?.map((item, itemIndex) => (
                    <div key={item.id} className="border-b last:border-b-0">
                      <div className="grid gap-3 p-3 bg-gray-50" style={{ gridTemplateColumns: `200px repeat(${cotizaciones.length}, 1fr)` }}>
                        <div>
                          <div className="font-medium text-sm">{item.descripcion}</div>
                          {item.codigo && (
                            <div className="text-xs text-gray-500">Cód: {item.codigo}</div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">Cant: {item.cantidad}</div>
                        </div>
                        {cotizaciones.map(cot => {
                          const cotItem = cot.items.find(i => i.purchase_item_id === item.id);
                          return (
                            <div key={cot.id} className="text-center text-sm">
                              {cotItem ? (
                                <>
                                  <div className="font-semibold">
                                    {cotItem.moneda} ${cotItem.precio_unitario.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Subtotal: ${cotItem.subtotal.toFixed(2)}
                                  </div>
                                  {!cotItem.disponible && (
                                    <div className="text-xs text-red-600 mt-1">No disponible</div>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notas */}
                {cotizaciones.some(c => c.notas) && (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-3 font-bold text-gray-800">
                      Notas y Condiciones
                    </div>
                    <div className="grid gap-3 p-3" style={{ gridTemplateColumns: `200px repeat(${cotizaciones.length}, 1fr)` }}>
                      <div className="font-semibold text-gray-700">Observaciones</div>
                      {cotizaciones.map(cot => (
                        <div key={cot.id} className="text-xs text-gray-600">
                          {cot.notas || '-'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Comentario Gerencial */}
              <div className="mt-6">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  📝 Comentario de Aprobación (opcional)
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Ej: Aprobada cotización de XYZ por entrega más rápida y buen precio..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm">
            {selectedQuotation ? (
              <span className="text-green-600 font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Cotización seleccionada
              </span>
            ) : (
              <span className="text-yellow-600 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Selecciona una cotización para aprobar
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
              onClick={handleApprove}
              disabled={!selectedQuotation || saving || !canApprove}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
              title={!canApprove ? 'Solo el Gerente de Taller puede aprobar' : ''}
            >
              {saving ? (
                <>Aprobando...</>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Aprobar Cotización Seleccionada
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationComparatorModal;
