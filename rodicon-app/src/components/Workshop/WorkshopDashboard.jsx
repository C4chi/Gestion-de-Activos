import React, { useState, useMemo, useEffect } from 'react';
import { FullScreenModal } from '../../FullScreenModal';
import { WorkOrderCard } from './WorkOrderCard';
import { UpdateWorkStatusModal } from './UpdateWorkStatusModal';
import { useWorkshopWorkflow } from '../../hooks/useWorkshopWorkflow';
import { Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * WorkshopDashboard
 * Gestión de órdenes de mantenimiento/taller
 * Estados: PENDIENTE → RECIBIDO → EN REPARACION → COMPLETADO
 */
export const WorkshopDashboard = ({ onClose }) => {
  const { fetchWorkOrders, updateWorkStatus, isLoading, error } = useWorkshopWorkflow();
  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Cargar órdenes al montar
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const orders = await fetchWorkOrders();
        setWorkOrders(orders);
      } catch (err) {
        toast.error('Error al cargar órdenes de mantenimiento');
      }
    };
    loadOrders();
  }, []);

  // Filtrar órdenes
  const filteredOrders = useMemo(() => {
    return workOrders.filter(order => {
      const matchesStatus =
        statusFilter === 'TODAS' || order.estado === statusFilter;
      const matchesSearch =
        search === '' ||
        (order.assets?.nombre?.toLowerCase().includes(search.toLowerCase())) ||
        (order.assets?.codigo?.toLowerCase().includes(search.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [workOrders, search, statusFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: workOrders.length,
      pendiente: workOrders.filter((o) => o.estado === 'PENDIENTE').length,
      recibido: workOrders.filter((o) => o.estado === 'RECIBIDO').length,
      enReparacion: workOrders.filter((o) => o.estado === 'EN_REPARACION').length,
      completado: workOrders.filter((o) => o.estado === 'COMPLETADO').length,
    };
  }, [workOrders]);

  // Manejar actualización de estado
  const handleUpdateStatus = (order) => {
    setSelectedOrder(order);
    setUpdateModalOpen(true);
  };

  // Ejecutar actualización
  const performStatusUpdate = async (updateData) => {
    try {
      const nextStatusMap = {
        PENDIENTE: 'RECIBIDO',
        RECIBIDO: 'EN_REPARACION',
        EN_REPARACION: 'COMPLETADO',
      };

      const newStatus = nextStatusMap[selectedOrder.estado];

      await updateWorkStatus(selectedOrder.id, newStatus, {
        ...updateData,
        usuario: 'SISTEMA', // En producción, obtener del usuario logueado
      });

      // Actualizar lista local
      setWorkOrders((prev) =>
        prev.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, estado: newStatus, ...updateData }
            : order
        )
      );

      toast.success('Orden de mantenimiento actualizada');
      setUpdateModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error al actualizar orden');
    }
  };

  return (
    <FullScreenModal title="🔧 Gestión de Taller" color="blue" onClose={onClose}>
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 font-semibold mt-1">TOTAL</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{stats.pendiente}</p>
          <p className="text-xs text-yellow-600 font-semibold mt-1">PENDIENTE</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{stats.recibido}</p>
          <p className="text-xs text-blue-600 font-semibold mt-1">RECIBIDO</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
          <p className="text-2xl font-bold text-purple-600">{stats.enReparacion}</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">EN REPARACIÓN</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
          <p className="text-2xl font-bold text-green-600">{stats.completado}</p>
          <p className="text-xs text-green-600 font-semibold mt-1">COMPLETADO</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por Activo o Código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-white rounded-lg text-sm border border-gray-300 focus:border-blue-400 outline-none transition"
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-white border border-gray-300 rounded-lg">
          {['TODAS', 'PENDIENTE', 'RECIBIDO', 'EN_REPARACION', 'COMPLETADO'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-blue-100'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="text-center py-20 text-gray-400">
          ⏳ Cargando órdenes de mantenimiento...
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
        {filteredOrders.map((order) => (
          <WorkOrderCard
            key={order.id}
            workOrder={order}
            onViewDetails={() => {/* Implementar sidebar de detalles */}}
            onUpdateStatus={handleUpdateStatus}
            isLoading={isLoading}
          />
        ))}

        {filteredOrders.length === 0 && !isLoading && (
          <div className="col-span-2 text-center py-20 text-gray-400">
            📭 No hay órdenes de mantenimiento que coincidan con los filtros.
          </div>
        )}
      </div>

      {/* Modal para actualizar estado */}
      <UpdateWorkStatusModal
        isOpen={updateModalOpen}
        onClose={() => {
          setUpdateModalOpen(false);
          setSelectedOrder(null);
        }}
        onConfirm={performStatusUpdate}
        currentStatus={selectedOrder?.estado}
      />
    </FullScreenModal>
  );
};
