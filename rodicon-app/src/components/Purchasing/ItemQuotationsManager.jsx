import React, { useState, useEffect } from 'react';
import { Package, DollarSign, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { ItemQuotationModal } from './ItemQuotationModal';

/**
 * ItemQuotationsManager
 * Muestra lista de items de una orden para cotizar individualmente
 * Flujo: COMPRAS cotiza item por item con múltiples proveedores
 */
export const ItemQuotationsManager = ({ isOpen, onClose, purchaseOrder, onComplete }) => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadItems();
    }
  }, [isOpen, purchaseOrder]);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Cargar items con sus cotizaciones
      const { data: itemsData, error } = await supabase
        .from('purchase_items')
        .select(`
          *,
          purchase_quotation_items (
            id,
            precio_unitario,
            moneda,
            disponible,
            purchase_quotations (
              id,
              proveedor,
              numero_cotizacion,
              dias_entrega,
              fecha_cotizacion
            )
          )
        `)
        .eq('purchase_id', purchaseOrder.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Procesar items con conteo de cotizaciones
      const processed = itemsData.map(item => ({
        ...item,
        cotizaciones: item.purchase_quotation_items || [],
        cotizaciones_count: item.purchase_quotation_items?.length || 0
      }));

      setItems(processed);
    } catch (error) {
      console.error('Error cargando items:', error);
      toast.error('Error al cargar items');
    } finally {
      setLoading(false);
    }
  };

  const handleManageQuotations = (item) => {
    setSelectedItem(item);
    setQuotationModalOpen(true);
  };

  const handleQuotationComplete = async () => {
    setQuotationModalOpen(false);
    setSelectedItem(null);
    await loadItems(); // Recargar para ver las nuevas cotizaciones
  };

  const handleFinish = async () => {
    // Verificar que todos los items tengan al menos 1 cotización
    const sinCotizacion = items.filter(item => item.cotizaciones_count === 0);
    
    if (sinCotizacion.length > 0) {
      toast.error(`${sinCotizacion.length} item(s) sin cotizaciones. Agrega al menos 1 cotización por item.`);
      return;
    }

    // Cambiar estado de la orden a PENDIENTE_APROBACION
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          estado: 'PENDIENTE_APROBACION',
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseOrder.id);

      if (error) throw error;

      toast.success('✅ Cotizaciones enviadas a Gerencia para aprobación');
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error finalizando cotizaciones:', error);
      toast.error('Error al finalizar: ' + error.message);
    }
  };

  if (!isOpen) return null;

  const allItemsQuoted = items.every(item => item.cotizaciones_count > 0);
  const totalQuotations = items.reduce((sum, item) => sum + item.cotizaciones_count, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="w-7 h-7" />
                Cotizar Items Individualmente
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                Orden: {purchaseOrder?.numero_requisicion} | {items.length} items | {totalQuotations} cotizaciones
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
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Cargando items...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay items en esta orden
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`border-2 rounded-lg p-4 transition ${
                    item.cotizaciones_count === 0
                      ? 'border-red-300 bg-red-50'
                      : item.cotizaciones_count < 3
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-green-300 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Info del Item */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{item.descripcion}</h3>
                          {item.codigo && (
                            <p className="text-sm text-gray-600">Código: {item.codigo}</p>
                          )}
                          <p className="text-sm text-gray-600">Cantidad: {item.cantidad}</p>
                        </div>
                      </div>

                      {/* Cotizaciones actuales */}
                      {item.cotizaciones_count > 0 && (
                        <div className="mt-3 ml-11">
                          <div className="text-sm font-semibold text-gray-700 mb-2">
                            Cotizaciones registradas ({item.cotizaciones_count}):
                          </div>
                          <div className="space-y-1">
                            {item.cotizaciones.slice(0, 3).map((cot, cotIdx) => (
                              <div key={cotIdx} className="text-sm text-gray-600 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{cot.purchase_quotations.proveedor}</span>
                                <span className="text-gray-400">|</span>
                                <span>{cot.purchase_quotations.numero_cotizacion}</span>
                                <span className="text-gray-400">|</span>
                                <span className="font-semibold">{cot.moneda} ${cot.precio_unitario}</span>
                              </div>
                            ))}
                            {item.cotizaciones_count > 3 && (
                              <div className="text-sm text-blue-600 font-medium">
                                + {item.cotizaciones_count - 3} más...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Estado y Botón */}
                    <div className="flex flex-col items-end gap-2">
                      {/* Badge de estado */}
                      {item.cotizaciones_count === 0 ? (
                        <div className="flex items-center gap-2 text-red-700 bg-red-100 px-3 py-1 rounded-full text-sm font-bold">
                          <AlertTriangle className="w-4 h-4" />
                          Sin cotizar
                        </div>
                      ) : item.cotizaciones_count < 3 ? (
                        <div className="flex items-center gap-2 text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full text-sm font-bold">
                          ⚠️ {item.cotizaciones_count} cotización(es)
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm font-bold">
                          <CheckCircle className="w-4 h-4" />
                          {item.cotizaciones_count} cotizaciones
                        </div>
                      )}

                      {/* Botón gestionar */}
                      <button
                        onClick={() => handleManageQuotations(item)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm shadow-md flex items-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        Gestionar Cotizaciones
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex-shrink-0 flex justify-between items-center">
          <div className="text-sm">
            {allItemsQuoted ? (
              <span className="text-green-600 font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Todos los items tienen cotizaciones ({totalQuotations} total)
              </span>
            ) : (
              <span className="text-red-600 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {items.filter(i => i.cotizaciones_count === 0).length} item(s) sin cotizar
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
              onClick={handleFinish}
              disabled={!allItemsQuoted}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title={!allItemsQuoted ? 'Todos los items deben tener al menos 1 cotización' : ''}
            >
              ✅ Enviar a Gerencia para Aprobación
            </button>
          </div>
        </div>
      </div>

      {/* Modal de cotización individual */}
      {selectedItem && (
        <ItemQuotationModal
          isOpen={quotationModalOpen}
          onClose={() => {
            setQuotationModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          purchaseOrder={purchaseOrder}
          onComplete={handleQuotationComplete}
        />
      )}
    </div>
  );
};

export default ItemQuotationsManager;
