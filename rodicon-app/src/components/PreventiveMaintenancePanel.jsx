import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
import {
  getMaintenancePlans,
  getUpcomingMaintenance,
  getOverdueMaintenance,
  createMaintenancePlan,
  executeMaintenancePlan,
  deleteMaintenancePlan,
} from '../services/maintenancePlanService';
import { useAppContext } from '../AppContext';
import toast from 'react-hot-toast';

/**
 * Panel de Gestión de Mantenimiento Preventivo
 * Programación, calendario y ejecución de planes
 */
const PreventiveMaintenancePanel = () => {
  const { user, assets, fetchAllData } = useAppContext();
  const [plans, setPlans] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, UPCOMING, OVERDUE
  const [newPlan, setNewPlan] = useState({
    asset_id: '',
    nombre: '',
    descripcion: '',
    frecuencia_dias: 30,
    proxima_ejecucion: '',
    estimado_horas: 0,
    tareas: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPlans, upcomingPlans, overduePlans] = await Promise.all([
        getMaintenancePlans(),
        getUpcomingMaintenance(7),
        getOverdueMaintenance(),
      ]);

      setPlans(allPlans.data || []);
      setUpcoming(upcomingPlans.data || []);
      setOverdue(overduePlans.data || []);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      toast.error('Error cargando datos de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();

    if (!newPlan.asset_id || !newPlan.nombre || !newPlan.frecuencia_dias) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    try {
      const { error } = await createMaintenancePlan({
        ...newPlan,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('✅ Plan de mantenimiento creado');
      setShowNewPlanModal(false);
      setNewPlan({
        asset_id: '',
        nombre: '',
        descripcion: '',
        frecuencia_dias: 30,
        proxima_ejecucion: '',
        estimado_horas: 0,
        tareas: [],
      });
      loadData();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Error al crear plan');
    }
  };

  const handleExecutePlan = async (planId) => {
    if (!confirm('¿Crear orden de trabajo para este mantenimiento?')) return;

    try {
      const { error } = await executeMaintenancePlan(planId, user.id, user.nombre);
      if (error) throw error;

      toast.success('✅ Orden de trabajo creada');
      await Promise.all([loadData(), fetchAllData()]);
    } catch (error) {
      console.error('Error executing plan:', error);
      toast.error('Error al ejecutar plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('¿Eliminar este plan de mantenimiento?')) return;

    try {
      const { error } = await deleteMaintenancePlan(planId);
      if (error) throw error;

      toast.success('🗑️ Plan eliminado');
      loadData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Error al eliminar plan');
    }
  };

  const filteredPlans = filter === 'UPCOMING' ? upcoming :
                       filter === 'OVERDUE' ? overdue :
                       plans;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            🔧 Mantenimiento Preventivo
          </h2>
          <p className="text-gray-600 mt-1">
            Programación y seguimiento de mantenimientos
          </p>
        </div>
        <button
          onClick={() => setShowNewPlanModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ➕ Nuevo Plan
        </button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Planes</p>
          <p className="text-2xl font-bold text-gray-800">{plans.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <p className="text-sm text-green-700">Próximos (7 días)</p>
          <p className="text-2xl font-bold text-green-600">{upcoming.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <p className="text-sm text-red-700">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <p className="text-sm text-blue-700">Activos</p>
          <p className="text-2xl font-bold text-blue-600">
            {plans.filter(p => p.activo).length}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'ALL' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos ({plans.length})
        </button>
        <button
          onClick={() => setFilter('UPCOMING')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'UPCOMING' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Próximos ({upcoming.length})
        </button>
        <button
          onClick={() => setFilter('OVERDUE')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'OVERDUE' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Vencidos ({overdue.length})
        </button>
      </div>

      {/* Lista de planes */}
      <div className="space-y-3">
        {filteredPlans.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">No hay planes de mantenimiento</p>
          </div>
        ) : (
          filteredPlans.map(plan => {
            const asset = plan.assets || {};
            const daysUntil = plan.proxima_ejecucion 
              ? Math.ceil((new Date(plan.proxima_ejecucion) - new Date()) / (1000 * 60 * 60 * 24))
              : 0;
            const isOverdue = daysUntil < 0;
            const isUpcoming = daysUntil >= 0 && daysUntil <= 7;

            return (
              <div 
                key={plan.id}
                className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                  isOverdue ? 'border-red-500' :
                  isUpcoming ? 'border-yellow-500' :
                  'border-green-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800">{plan.nombre}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        isOverdue ? 'bg-red-100 text-red-800' :
                        isUpcoming ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {isOverdue ? '⚠️ Vencido' : 
                         isUpcoming ? '⏰ Próximo' : 
                         '✓ Al día'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Asset: {asset.ficha} - {asset.nombre}
                    </p>
                    
                    {plan.descripcion && (
                      <p className="text-sm text-gray-700 mb-2">{plan.descripcion}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 Próximo: {formatDate(plan.proxima_ejecucion)}</span>
                      <span>🔄 Cada {plan.frecuencia_dias} días</span>
                      {plan.estimado_horas > 0 && (
                        <span>⏱️ {plan.estimado_horas}h estimadas</span>
                      )}
                      <span className={daysUntil >= 0 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                        {daysUntil >= 0 ? `En ${daysUntil} días` : `Atrasado ${Math.abs(daysUntil)} días`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecutePlan(plan.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      ▶️ Ejecutar
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal nuevo plan */}
      {showNewPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">➕ Nuevo Plan de Mantenimiento</h3>
              
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset *
                  </label>
                  <select
                    value={newPlan.asset_id}
                    onChange={(e) => setNewPlan({...newPlan, asset_id: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar asset...</option>
                    {assets.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.ficha} - {asset.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Plan *
                  </label>
                  <input
                    type="text"
                    value={newPlan.nombre}
                    onChange={(e) => setNewPlan({...newPlan, nombre: e.target.value})}
                    placeholder="Ej: Cambio de aceite y filtros"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newPlan.descripcion}
                    onChange={(e) => setNewPlan({...newPlan, descripcion: e.target.value})}
                    placeholder="Descripción detallada del mantenimiento..."
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frecuencia (días) *
                    </label>
                    <input
                      type="number"
                      value={newPlan.frecuencia_dias}
                      onChange={(e) => setNewPlan({...newPlan, frecuencia_dias: parseInt(e.target.value)})}
                      min="1"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horas Estimadas
                    </label>
                    <input
                      type="number"
                      value={newPlan.estimado_horas}
                      onChange={(e) => setNewPlan({...newPlan, estimado_horas: parseFloat(e.target.value)})}
                      min="0"
                      step="0.5"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Próxima Ejecución
                  </label>
                  <input
                    type="date"
                    value={newPlan.proxima_ejecucion}
                    onChange={(e) => setNewPlan({...newPlan, proxima_ejecucion: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si no se especifica, se calculará automáticamente
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewPlanModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    ✅ Crear Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreventiveMaintenancePanel;
