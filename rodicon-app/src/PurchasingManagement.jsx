import React, { useState, useMemo, useEffect } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { StatusBadge } from './StatusBadge';
import { PurchaseCard } from './components/Purchasing/PurchaseCard';
import { CommentModal } from './components/Purchasing/CommentModal';
import { QuotationModal } from './components/Purchasing/QuotationModal';
import { PurchaseOrderHistory } from './components/Purchasing/PurchaseOrderHistory';
import { PurchaseStatistics } from './components/Purchasing/PurchaseStatistics';
import { ItemQuotationsManager } from './components/Purchasing/ItemQuotationsManager';
import { QuotationComparatorModal } from './components/Purchasing/QuotationComparatorModal';
import { PartialReceptionModal } from './components/Purchasing/PartialReceptionModal';
import { usePurchasingWorkflow } from './hooks/usePurchasingWorkflow';
import { supabase } from './supabaseClient';
import { Search, FileDown, Filter, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * PurchasingManagement
 * Gestión de órdenes de compra con:
 * - Estado: PENDIENTE → ORDENADO → PARCIAL/RECIBIDO
 * - Comentarios para recepciones parciales
 * - Integración con hook usePurchasingWorkflow
 * - PDF generation
 */
export const PurchasingManagement = ({ onClose, onDownloadPdf, canManage = true, canApprove = false }) => {
  const { fetchPurchaseOrders, updatePurchaseStatus, isLoading, error } = usePurchasingWorkflow();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [editingItems, setEditingItems] = useState({});
  
  // Nuevos modales del workflow
  const [itemQuotationsModalOpen, setItemQuotationsModalOpen] = useState(false);
  const [comparatorModalOpen, setComparatorModalOpen] = useState(false);
  const [receptionModalOpen, setReceptionModalOpen] = useState(false);

  // Cargar órdenes al montar componente
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const orders = await fetchPurchaseOrders();
        setPurchaseOrders(orders || []); // Asegurar que sea array
        
        // Cargar estadísticas - TEMPORALMENTE DESHABILITADO
        // Necesitas ejecutar MIGRATION_PURCHASE_IMPROVEMENTS.sql para crear purchase_statistics
        // const { data: stats } = await supabase
        //   .from('purchase_statistics')
        //   .select('*')
        //   .single();
        // setStatistics(stats);
      } catch (err) {
        console.error('Error loading purchase orders:', err);
        setPurchaseOrders([]); // Array vacío si hay error
        toast.error('Error al cargar órdenes de compra');
      }
    };
    loadOrders();
  }, [fetchPurchaseOrders]);

  // Filtrar órdenes
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      const matchesStatus = statusFilter === 'TODAS' || order.estado === statusFilter;
      
      const matchesSearch = search === '' ||
        (order.id && order.id.toLowerCase().includes(search.toLowerCase())) ||
        (order.numero_requisicion && order.numero_requisicion.toLowerCase().includes(search.toLowerCase())) ||
        (order.solicitante && order.solicitante.toLowerCase().includes(search.toLowerCase())) ||
        (order.proyecto && order.proyecto.toLowerCase().includes(search.toLowerCase())) ||
        (order.ficha && order.ficha.toLowerCase().includes(search.toLowerCase()));
      
      const matchesDateFrom = !dateFrom || 
        (order.fecha_solicitud && new Date(order.fecha_solicitud) >= new Date(dateFrom));
      
      const matchesDateTo = !dateTo || 
        (order.fecha_solicitud && new Date(order.fecha_solicitud) <= new Date(dateTo));
      
      return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [purchaseOrders, search, statusFilter, dateFrom, dateTo]);

  // Manejar cambio de estado - WORKFLOW COMPLETO
  const handleUpdateStatus = (order, newStatus) => {
    if (!canManage) {
      toast.error('No tienes permiso para esta acción');
      return;
    }
    setSelectedOrder(order);
    setSelectedAction(newStatus);

    // Nuevo workflow:
    // PENDIENTE → EN_COTIZACION (al abrir ItemQuotationsManager)
    // EN_COTIZACION → PENDIENTE_APROBACION (automático al enviar cotizaciones)
    // PENDIENTE_APROBACION → APROBADO (con QuotationComparatorModal)
    // APROBADO → ORDENADO (directo)
    // ORDENADO → PARCIAL/RECIBIDO (con PartialReceptionModal)

    if (newStatus === 'COTIZAR' || order.estado === 'PENDIENTE') {
      // Abrir modal de cotizaciones por ítem
      setItemQuotationsModalOpen(true);
    } else if (newStatus === 'APROBAR' || order.estado === 'PENDIENTE_APROBACION') {
      // Verificar permiso de aprobación (solo GERENTE_TALLER)
      if (!canApprove) {
        toast.error('Solo el Gerente de Taller puede aprobar cotizaciones');
        return;
      }
      // Abrir comparador para gerencia
      setComparatorModalOpen(true);
    } else if (newStatus === 'ORDENAR' || (order.estado === 'APROBADO' && newStatus === 'ORDENADO')) {
      // Marcar como ORDENADO directamente
      performStatusUpdate(order.id, 'ORDENADO', '');
    } else if (newStatus === 'RECIBIR' || newStatus === 'PARCIAL' || (order.estado === 'ORDENADO' && (newStatus === 'RECIBIDO' || newStatus === 'PARCIAL'))) {
      // Abrir modal de recepción (maneja total y parcial)
      setReceptionModalOpen(true);
    } else if (newStatus === 'PARCIAL') {
      // Recepción PARCIAL: abrir modal antiguo para comentario (mantener compatibilidad)
      setCommentModalOpen(true);
    } else if (newStatus === 'ORDENADO') {
      // ORDENADO: abrir modal antiguo para ingresar cotizaciones (mantener compatibilidad)
      setQuotationModalOpen(true);
    } else {
      // Otros estados: actualizar directamente
      performStatusUpdate(order.id, newStatus, '');
    }
  };

  // Ejecutar actualización de estado
  const performStatusUpdate = async (orderId, newStatus, comment = '') => {
    if (!canManage) {
      toast.error('No tienes permiso para esta acción');
      return;
    }
    try {
      console.log(`[performStatusUpdate] Actualizar orden ${orderId} a ${newStatus}`);
      
      // Obtener PIN del usuario (desde AppContext o localStorage)
      const userPin = localStorage.getItem('userPin') || '0000';

      console.log(`[performStatusUpdate] Llamando updatePurchaseStatus...`);
      await updatePurchaseStatus(orderId, newStatus, comment, userPin);
      console.log(`[performStatusUpdate] updatePurchaseStatus completado`);
      
      // Recargar TODAS las órdenes desde BD para sincronización completa
      console.log(`[performStatusUpdate] Recargando órdenes desde BD...`);
      const updatedOrders = await fetchPurchaseOrders();
      console.log(`[performStatusUpdate] Órdenes recargadas:`, updatedOrders);
      
      setPurchaseOrders(updatedOrders || []);

      toast.success(`Orden ${newStatus === 'RECIBIDO' ? 'completada' : newStatus === 'ORDENADO' ? 'ordenada' : 'actualizada'}`);
      setCommentModalOpen(false);
      setQuotationModalOpen(false);
    } catch (err) {
      console.error('Error en performStatusUpdate:', err);
      toast.error(err.message || 'Error al actualizar orden');
    }
  };

  // Manejar confirmación del modal de comentario
  const handleCommentConfirm = async (comment) => {
    if (selectedOrder && selectedAction) {
      await performStatusUpdate(selectedOrder.id, selectedAction, comment);
    }
  };

  // Manejar confirmación de cotizaciones
  const handleQuotationConfirm = async (data) => {
    if (!canManage) {
      toast.error('No tienes permiso para esta acción');
      return;
    }
    try {
      const { items: itemsWithPrices, fechaEstimada } = data;
      
      // 1. Actualizar los precios, proveedores, cotizaciones y MONEDA de cada ítem
      for (const item of itemsWithPrices) {
        await supabase
          .from('purchase_items')
          .update({
            precio_unitario: item.precio_unitario,
            proveedor: item.proveedor,
            cotizacion: item.cotizacion,
            moneda: item.moneda || 'DOP', // NUEVO: guardar moneda por línea
          })
          .eq('id', item.id);
      }

      // 2. Actualizar la fecha estimada
      if (selectedOrder) {
        await supabase
          .from('purchase_orders')
          .update({
            fecha_estimada_llegada: fechaEstimada,
          })
          .eq('id', selectedOrder.id);
        
        // 3. Usar performStatusUpdate para actualizar estado a ORDENADO
        // Esto asegura que se sincronice correctamente con la BD y recarga los datos
        // NO hacer más recargas aquí - performStatusUpdate ya lo hace
        await performStatusUpdate(selectedOrder.id, 'ORDENADO', '');
      }

      toast.success('Cotizaciones guardadas y orden marcada como ORDENADO');
    } catch (error) {
      console.error('Error saving quotations:', error);
      toast.error('Error al guardar cotizaciones');
    }
  };

  const handleViewDetails = (order) => {
    setDetailOrder(order);
  };

  return (
    <FullScreenModal title="🛒 Gestión de Compras" color="green" onClose={onClose}>
      {/* Estadísticas */}
      <PurchaseStatistics statistics={statistics} />

      {/* Header con Filtros */}
      <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Req#, Ficha, Solicitante, Proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-white rounded-lg text-sm border border-gray-300 focus:border-green-400 outline-none transition"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm outline-none w-32"
                placeholder="Desde"
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm outline-none w-32"
                placeholder="Hasta"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-white border border-gray-300 rounded-lg flex-wrap">
          {['TODAS', 'PENDIENTE', 'EN_COTIZACION', 'PENDIENTE_APROBACION', 'APROBADO', 'ORDENADO', 'PARCIAL', 'RECIBIDO'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                statusFilter === status
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-green-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="text-center py-20 text-gray-400">
          ⏳ Cargando órdenes de compra...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
          ❌ {error}
        </div>
      )}

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrders.map(order => (
          <PurchaseCard
            key={order.id}
            purchaseOrder={order}
            onViewDetails={() => handleViewDetails(order)}
            onUpdateStatus={handleUpdateStatus}
            onDelete={() => {/* Implementar eliminación */}}
            isLoading={isLoading}
            canManage={canManage}
          />
        ))}

        {filteredOrders.length === 0 && !isLoading && (
          <div className="col-span-2 text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay órdenes de compra
            </h3>
            <p className="text-gray-500 mb-4">
              {statusFilter !== 'TODAS' 
                ? `No hay órdenes con estado "${statusFilter}"`
                : 'Aún no se han creado órdenes de compra.'
              }
            </p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              💡 Para crear una orden de compra, selecciona un activo desde el 
              inventario principal y usa el botón "Crear Requisición".
            </p>
          </div>
        )}
      </div>

      {/* Modal de Comentarios para Recepción Parcial */}
      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false);
          setSelectedOrder(null);
          setSelectedAction(null);
        }}
        onConfirm={handleCommentConfirm}
        title="Recepción Parcial"
        placeholder="Ej: Llegó filtro de aire, frenos llegarán el 15/12..."
      />

      {/* Modal de Cotizaciones para marcar como ORDENADO */}
      <QuotationModal
        isOpen={quotationModalOpen}
        onClose={() => {
          setQuotationModalOpen(false);
          setSelectedOrder(null);
          setSelectedAction(null);
        }}
        onConfirm={handleQuotationConfirm}
        purchaseOrder={selectedOrder}
      />

      {detailOrder && (
        <FullScreenModal
          title={`Detalles Orden ${detailOrder.numero_requisicion || detailOrder.id}`}
          color="green"
          onClose={() => setDetailOrder(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Estado:</span> <StatusBadge status={detailOrder.estado} /></div>
              <div><span className="text-gray-500">Solicitante:</span> <span className="font-semibold">{detailOrder.solicitante || 'N/A'}</span></div>
              <div><span className="text-gray-500">Proyecto:</span> <span className="font-semibold">{detailOrder.proyecto || 'N/A'}</span></div>
              <div><span className="text-gray-500">Ficha:</span> <span className="font-semibold">{detailOrder.ficha || 'N/A'}</span></div>
              <div><span className="text-gray-500">Prioridad:</span> <span className="font-semibold">{detailOrder.prioridad || 'N/A'}</span></div>
              <div><span className="text-gray-500">Fecha Solicitud:</span> <span className="font-semibold">{detailOrder.fecha_solicitud ? new Date(detailOrder.fecha_solicitud).toLocaleString() : 'N/D'}</span></div>
              {detailOrder.fecha_ordenado && (
                <div><span className="text-gray-500">Fecha Ordenado:</span> <span className="font-semibold">{new Date(detailOrder.fecha_ordenado).toLocaleString()}</span></div>
              )}
              {detailOrder.fecha_estimada_llegada && (
                <div><span className="text-gray-500">Fecha Estimada:</span> <span className="font-semibold">{new Date(detailOrder.fecha_estimada_llegada).toLocaleDateString()}</span></div>
              )}
            </div>

            {/* Historial visual */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <PurchaseOrderHistory purchaseOrderId={detailOrder.id} />
            </div>

            <div className="border rounded-lg p-3 bg-white">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-gray-700">Ítems y Cotizaciones</div>
                <button
                  onClick={() => onDownloadPdf?.(detailOrder.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                >
                  📄 Descargar PDF
                </button>
              </div>
              {detailOrder.purchase_items && detailOrder.purchase_items.length > 0 ? (
                <div className="space-y-2">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Código</th>
                        <th className="text-left p-2">Descripción</th>
                        <th className="text-center p-2">Cant.</th>
                        <th className="text-left p-2">Proveedor</th>
                        <th className="text-right p-2">Precio Unit.</th>
                        <th className="text-center p-2">Moneda</th>
                        <th className="text-right p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.purchase_items.map((item, idx) => {
                        const precio = parseFloat(item.precio_unitario || 0);
                        const subtotal = precio * (item.cantidad || 0);
                        const moneda = item.moneda || 'DOP';
                        return (
                          <tr key={item.id || idx} className="border-b">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{item.codigo || 'S/C'}</span>
                            </td>
                            <td className="p-2">
                              <div className="font-medium">{item.descripcion || 'Sin descripción'}</div>
                              {item.cotizacion && <div className="text-xs text-blue-600 mt-1">📋 {item.cotizacion}</div>}
                            </td>
                            <td className="text-center p-2">{item.cantidad}</td>
                            <td className="p-2 text-xs">{item.proveedor || '-'}</td>
                            <td className="text-right p-2">${precio.toFixed(2)}</td>
                            <td className="text-center p-2">
                              <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">{moneda}</span>
                            </td>
                            <td className="text-right p-2 font-semibold">{moneda} ${subtotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      {(() => {
                        // Calcular totales por moneda
                        const totales = detailOrder.purchase_items.reduce((acc, item) => {
                          const precio = parseFloat(item.precio_unitario || 0);
                          const subtotal = precio * (item.cantidad || 0);
                          const moneda = item.moneda || 'DOP';
                          acc[moneda] = (acc[moneda] || 0) + subtotal;
                          return acc;
                        }, {});
                        
                        return Object.entries(totales).map(([moneda, total]) => (
                          <tr key={moneda}>
                            <td colSpan="7" className="text-right p-2">TOTAL {moneda}:</td>
                            <td className="text-right p-2 text-lg">
                              {moneda} ${total.toFixed(2)}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Sin ítems cargados</div>
              )}
            </div>

            {detailOrder.comentario_recepcion && (
              <div className="border rounded-lg p-3 bg-white">
                <div className="font-semibold text-gray-700 mb-1">Comentario de Recepción</div>
                <p className="text-sm text-gray-600">{detailOrder.comentario_recepcion}</p>
              </div>
            )}
          </div>
        </FullScreenModal>
      )}

      {/* ========== NUEVOS MODALES DEL WORKFLOW ========== */}

      {/* Modal de Cotizaciones por Ítem (Compras) */}
      <ItemQuotationsManager
        isOpen={itemQuotationsModalOpen}
        onClose={() => {
          setItemQuotationsModalOpen(false);
          setSelectedOrder(null);
        }}
        purchaseOrder={selectedOrder}
        onComplete={async () => {
          setItemQuotationsModalOpen(false);
          setSelectedOrder(null);
          // Recargar órdenes
          const updatedOrders = await fetchPurchaseOrders();
          setPurchaseOrders(updatedOrders || []);
          toast.success('Cotizaciones enviadas a Gerencia para aprobación');
        }}
      />

      {/* Modal Comparador de Cotizaciones (Gerencia) */}
      <QuotationComparatorModal
        isOpen={comparatorModalOpen}
        onClose={() => {
          setComparatorModalOpen(false);
          setSelectedOrder(null);
        }}
        purchaseOrder={selectedOrder}
        canApprove={canApprove}
        onApprove={async () => {
          setComparatorModalOpen(false);
          setSelectedOrder(null);
          // Recargar órdenes
          const updatedOrders = await fetchPurchaseOrders();
          setPurchaseOrders(updatedOrders || []);
          toast.success('Cotización aprobada - Lista para ordenar');
        }}
      />

      {/* Modal de Recepción Parcial/Total */}
      <PartialReceptionModal
        isOpen={receptionModalOpen}
        onClose={() => {
          setReceptionModalOpen(false);
          setSelectedOrder(null);
        }}
        purchaseOrder={selectedOrder}
        onComplete={async () => {
          setReceptionModalOpen(false);
          setSelectedOrder(null);
          // Recargar órdenes
          const updatedOrders = await fetchPurchaseOrders();
          setPurchaseOrders(updatedOrders || []);
          toast.success('Recepción registrada exitosamente');
        }}
      />
    </FullScreenModal>
  );
};