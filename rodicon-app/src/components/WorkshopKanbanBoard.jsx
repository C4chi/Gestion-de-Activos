import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatUtils';
import { formatDate } from '../utils/dateUtils';
import { useAppContext } from '../AppContext';
import { WORK_ORDER_STATUS, PRIORITY, STATUS_COLORS } from '../utils/constants';
import {
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  assignWorkOrder,
  startWorkOrder,
  pauseWorkOrder,
  resumeWorkOrder,
  closeWorkOrder,
  cancelWorkOrder,
} from '../services/maintenanceService';
import { getUsersByRole } from '../services/userService';
import toast from 'react-hot-toast';

/**
 * Tablero Kanban para gestión de Work Orders
 * Drag & drop, filtros, asignación, seguimiento completo
 */
const WorkshopKanbanBoard = () => {
  const { user, assets, fetchAllData } = useAppContext();
  const [workOrders, setWorkOrders] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterMechanic, setFilterMechanic] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [newWO, setNewWO] = useState({
    asset_id: '',
    titulo: '',
    descripcion: '',
    tipo: 'CORRECTIVO',
    prioridad: 'MEDIA',
  });

  const columns = [
    { id: 'ABIERTA', title: '📋 Abiertas', color: 'bg-blue-50' },
    { id: 'ASIGNADA', title: '👤 Asignadas', color: 'bg-purple-50' },
    { id: 'EN_PROGRESO', title: '⚙️ En Progreso', color: 'bg-yellow-50' },
    { id: 'PAUSADA', title: '⏸️ Pausadas', color: 'bg-orange-50' },
    { id: 'COMPLETADA', title: '✅ Completadas', color: 'bg-green-50' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, mechanicsRes] = await Promise.all([
        getWorkOrders(),
        getUsersByRole('TALLER'),
      ]);

      setWorkOrders(ordersRes.data || []);
      setMechanics(mechanicsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWO = async (e) => {
    e.preventDefault();

    if (!newWO.asset_id || !newWO.titulo) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      const { error } = await createWorkOrder({
        ...newWO,
        estado: 'ABIERTA',
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('✅ Orden de trabajo creada');
      setShowNewModal(false);
      setNewWO({
        asset_id: '',
        titulo: '',
        descripcion: '',
        tipo: 'CORRECTIVO',
        prioridad: 'MEDIA',
      });
      await Promise.all([loadData(), fetchAllData()]);
    } catch (error) {
      console.error('Error creating work order:', error);
      toast.error('Error al crear orden');
    }
  };

  const handleAssign = async (woId, mechanicId) => {
    const mechanic = mechanics.find(m => m.id === parseInt(mechanicId));
    if (!mechanic) return;

    try {
      const { error } = await assignWorkOrder(woId, mechanic.id, mechanic.nombre);
      if (error) throw error;

      toast.success(`✅ Asignado a ${mechanic.nombre}`);
      loadData();
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('Error al asignar');
    }
  };

  const handleStart = async (woId) => {
    try {
      const { error } = await startWorkOrder(woId);
      if (error) throw error;

      toast.success('▶️ Trabajo iniciado - Asset en TALLER');
      await Promise.all([loadData(), fetchAllData()]);
    } catch (error) {
      console.error('Error starting:', error);
      toast.error('Error al iniciar');
    }
  };

  const handlePause = async (woId) => {
    try {
      const { error } = await pauseWorkOrder(woId);
      if (error) throw error;

      toast.success('⏸️ Trabajo pausado - Asset en ESPERA REPUESTO');
      await Promise.all([loadData(), fetchAllData()]);
    } catch (error) {
      console.error('Error pausing:', error);
      toast.error('Error al pausar');
    }
  };

  const handleResume = async (woId) => {
    try {
      const { error } = await resumeWorkOrder(woId);
      if (error) throw error;

      toast.success('▶️ Trabajo reanudado - Asset en TALLER');
      await Promise.all([loadData(), fetchAllData()]);
    } catch (error) {
      console.error('Error resuming:', error);
      toast.error('Error al reanudar');
    }
  };

  const handleComplete = async (woId, closeData) => {
    try {
      const { error } = await closeWorkOrder(woId, closeData);
      if (error) throw error;

      toast.success('✅ Trabajo completado');
      setShowDetailModal(false);
      await Promise.all([loadData(), fetchAllData()]);
    } catch (error) {
      console.error('Error completing:', error);
      toast.error('Error al completar');
    }
  };

  const handleCancel = async (woId, reason) => {
    if (!reason) {
      reason = prompt('Motivo de cancelación:');
      if (!reason) return;
    }

    try {
      const { error } = await cancelWorkOrder(woId, reason);
      if (error) throw error;

      toast.success('🚫 Trabajo cancelado');
      await Promise.all([loadData(), fetchAllData()]);
    } catch (error) {
      console.error('Error canceling:', error);
      toast.error('Error al cancelar');
    }
  };

  const filteredOrders = workOrders.filter(wo => {
    if (filterPriority !== 'ALL' && wo.prioridad !== filterPriority) return false;
    if (filterMechanic !== 'ALL' && wo.asignado_a_id !== parseInt(filterMechanic)) return false;
    if (filterType !== 'ALL' && wo.tipo !== filterType) return false;
    return true;
  });

  const getOrdersByStatus = (status) => {
    return filteredOrders.filter(wo => wo.estado === status);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENTE': return 'border-l-4 border-red-500';
      case 'ALTA': return 'border-l-4 border-orange-500';
      case 'MEDIA': return 'border-l-4 border-yellow-500';
      case 'BAJA': return 'border-l-4 border-green-500';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            🔧 Tablero de Trabajo
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredOrders.length} órdenes en total
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ➕ Nueva Orden
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="ALL">Todas las prioridades</option>
          <option value="URGENTE">🔴 Urgente</option>
          <option value="ALTA">🟠 Alta</option>
          <option value="MEDIA">🟡 Media</option>
          <option value="BAJA">🟢 Baja</option>
        </select>

        <select
          value={filterMechanic}
          onChange={(e) => setFilterMechanic(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="ALL">Todos los mecánicos</option>
          {mechanics.map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="ALL">Todos los tipos</option>
          <option value="PREVENTIVO">Preventivo</option>
          <option value="CORRECTIVO">Correctivo</option>
          <option value="PREDICTIVO">Predictivo</option>
          <option value="EMERGENCIA">Emergencia</option>
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-5 gap-4 overflow-hidden">
        {columns.map(column => {
          const orders = getOrdersByStatus(column.id);
          
          return (
            <div key={column.id} className={`${column.color} rounded-lg p-3 flex flex-col`}>
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <span className="bg-white px-2 py-1 rounded-full text-xs font-bold">
                  {orders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {orders.map(wo => {
                  const asset = assets.find(a => a.id === wo.asset_id) || {};
                  const daysOpen = Math.floor((new Date() - new Date(wo.fecha_creacion)) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysOpen > 2;

                  return (
                    <div
                      key={wo.id}
                      onClick={() => {
                        setSelectedWO(wo);
                        setShowDetailModal(true);
                      }}
                      className={`bg-white rounded-lg p-3 shadow hover:shadow-md transition-shadow cursor-pointer ${getPriorityColor(wo.prioridad)}`}
                    >
                      {/* Priority badge */}
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          wo.prioridad === 'URGENTE' ? 'bg-red-100 text-red-800' :
                          wo.prioridad === 'ALTA' ? 'bg-orange-100 text-orange-800' :
                          wo.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {wo.prioridad}
                        </span>
                        <span className="text-xs text-gray-500">#{wo.id}</span>
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-gray-800 mb-1 text-sm line-clamp-2">
                        {wo.titulo}
                      </h4>

                      {/* Asset */}
                      <p className="text-xs text-gray-600 mb-2">
                        🏭 {asset.ficha} - {asset.nombre}
                      </p>

                      {/* Type */}
                      <span className={`inline-block text-xs px-2 py-1 rounded ${
                        wo.tipo === 'PREVENTIVO' ? 'bg-blue-100 text-blue-800' :
                        wo.tipo === 'CORRECTIVO' ? 'bg-purple-100 text-purple-800' :
                        wo.tipo === 'EMERGENCIA' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {wo.tipo}
                      </span>

                      {/* Assigned mechanic */}
                      {wo.asignado_a && (
                        <p className="text-xs text-gray-600 mt-2">
                          👤 {wo.asignado_a}
                        </p>
                      )}

                      {/* Days open */}
                      {daysOpen > 0 && (
                        <p className={`text-xs mt-2 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {isOverdue ? '⚠️' : '📅'} Hace {daysOpen} día{daysOpen !== 1 ? 's' : ''}
                        </p>
                      )}

                      {/* Quick actions */}
                      <div className="mt-2 pt-2 border-t flex gap-1">
                        {wo.estado === 'ABIERTA' && (
                          <select
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              handleAssign(wo.id, e.target.value);
                              e.target.value = '';
                            }}
                            className="text-xs px-2 py-1 border rounded flex-1"
                          >
                            <option value="">Asignar...</option>
                            {mechanics.map(m => (
                              <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                          </select>
                        )}
                        
                        {wo.estado === 'ASIGNADA' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStart(wo.id);
                            }}
                            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex-1"
                          >
                            ▶️ Iniciar
                          </button>
                        )}

                        {wo.estado === 'EN_PROGRESO' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePause(wo.id);
                            }}
                            className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex-1"
                          >
                            ⏸️ Pausar
                          </button>
                        )}

                        {wo.estado === 'PAUSADA' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResume(wo.id);
                            }}
                            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex-1"
                          >
                            ▶️ Reanudar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nueva Orden */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">➕ Nueva Orden de Trabajo</h3>
              
              <form onSubmit={handleCreateWO} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset *</label>
                  <select
                    value={newWO.asset_id}
                    onChange={(e) => setNewWO({...newWO, asset_id: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.ficha} - {a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={newWO.titulo}
                    onChange={(e) => setNewWO({...newWO, titulo: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={newWO.descripcion}
                    onChange={(e) => setNewWO({...newWO, descripcion: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={newWO.tipo}
                      onChange={(e) => setNewWO({...newWO, tipo: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="CORRECTIVO">Correctivo</option>
                      <option value="PREVENTIVO">Preventivo</option>
                      <option value="PREDICTIVO">Predictivo</option>
                      <option value="EMERGENCIA">Emergencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad *</label>
                    <select
                      value={newWO.prioridad}
                      onChange={(e) => setNewWO({...newWO, prioridad: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="BAJA">🟢 Baja</option>
                      <option value="MEDIA">🟡 Media</option>
                      <option value="ALTA">🟠 Alta</option>
                      <option value="URGENTE">🔴 Urgente</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    ✅ Crear Orden
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle (simplificado - puedes expandirlo) */}
      {showDetailModal && selectedWO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                📋 Orden #{selectedWO.id} - {selectedWO.titulo}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Estado:</span> {selectedWO.estado}
                  </div>
                  <div>
                    <span className="font-medium">Prioridad:</span> {selectedWO.prioridad}
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span> {selectedWO.tipo}
                  </div>
                  <div>
                    <span className="font-medium">Creada:</span> {formatDate(selectedWO.fecha_creacion, true)}
                  </div>
                </div>

                {selectedWO.descripcion && (
                  <div>
                    <p className="font-medium mb-1">Descripción:</p>
                    <p className="text-gray-700">{selectedWO.descripcion}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium"
                  >
                    Cerrar
                  </button>
                  {selectedWO.estado !== 'COMPLETADA' && selectedWO.estado !== 'CANCELADA' && (
                    <>
                      <button
                        onClick={() => handleComplete(selectedWO.id, {
                          notas: 'Trabajo completado',
                          horasReales: 0,
                          costoReal: 0,
                          updateAssetStatus: true,
                        })}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        ✅ Completar
                      </button>
                      <button
                        onClick={() => handleCancel(selectedWO.id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        🚫 Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopKanbanBoard;
