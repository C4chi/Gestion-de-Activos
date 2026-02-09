/**
 * InspectionsDashboard.jsx
 * Panel principal para gestión de inspecciones HSE dinámicas
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Plus, Search, Filter, Download, 
  CheckCircle, Clock, AlertTriangle, Award, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../../AppContext';
import FormRenderer from './FormRenderer';
import TemplateSelector from './TemplateSelector';
import InspectionCard from './InspectionCard';
import InspectionDetailModal from './InspectionDetailModal';
import TemplateManager from './TemplateManager';
import {
  getInspections,
  getActiveTemplates,
  createInspection,
  completeInspection,
  syncPendingInspections
} from '../../services/hseService';

export default function InspectionsDashboard() {
  const { user } = useAppContext();
  const [inspections, setInspections] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [templateFilter, setTemplateFilter] = useState('ALL');

  // Modales
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // KPIs
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    draft: 0,
    passed: 0,
    avgScore: 0
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, templateFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inspectionsData, templatesData] = await Promise.all([
        getInspections({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          template_id: templateFilter !== 'ALL' ? templateFilter : undefined
        }),
        getActiveTemplates()
      ]);

      setInspections(inspectionsData || []);
      setTemplates(templatesData || []);

      // Calcular estadísticas
      calculateStats(inspectionsData || []);
    } catch (error) {
      console.error('Error loading HSE data:', error);
      setError(error.message || 'Error al cargar inspecciones');
      toast.error('Error al cargar inspecciones');
      // Set empty data to prevent undefined errors
      setInspections([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const completed = data.filter(i => i.status === 'COMPLETED').length;
    const draft = data.filter(i => i.status === 'DRAFT').length;
    const passed = data.filter(i => i.passed).length;
    const avgScore = data.length > 0
      ? (data.reduce((sum, i) => sum + (i.score_percentage || 0), 0) / data.length).toFixed(1)
      : 0;

    setStats({ total, completed, draft, passed, avgScore });
  };

  // Sincronizar inspecciones offline
  const handleSync = async () => {
    setSyncing(true);
    try {
      const results = await syncPendingInspections();
      if (results.success.length > 0) {
            toast.success(`${results.success.length} inspecciones sincronizadas correctamente`);
      }
      if (results.failed.length > 0) {
            toast.error(`${results.failed.length} inspecciones fallaron al sincronizar`);
      }
      loadData();
    } catch (error) {
      console.error('Error syncing:', error);
          toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // Crear nueva inspección
  const handleCreateInspection = async (templateId) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('hseTemplateId', templateId);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
      setShowTemplateSelector(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo abrir la inspección');
    }
  };

  // Guardar inspección completada
  const handleSubmitInspection = async (formData) => {
    if (!formData) {
      // Cancelar
      setShowFormModal(false);
      setSelectedTemplate(null);
      return;
    }

    try {
      // Crear inspección primero
      const inspection = await createInspection({
        template_id: selectedTemplate.id,
        title: selectedTemplate.name,
        priority: 'MEDIA',
        conducted_by: 1 // TODO: Obtener del contexto
      });

      // Completar con las respuestas
      await completeInspection(inspection.id, {
        ...formData,
        latitude: null, // TODO: Obtener geolocalización
        longitude: null
      });

          toast.success('✓ Inspección completada exitosamente');
      setShowFormModal(false);
      setSelectedTemplate(null);
      loadData();
    } catch (error) {
      console.error('Error submitting inspection:', error);
          toast.error('Error al guardar la inspección');
    }
  };

  // Ver detalle de inspección
  const handleViewInspection = (inspection) => {
    setSelectedInspection(inspection);
    setShowDetailModal(true);
  };

  // Filtrar inspecciones
  const filteredInspections = inspections.filter(i => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        i.inspection_number?.toLowerCase().includes(searchLower) ||
        i.title?.toLowerCase().includes(searchLower) ||
        i.ficha?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">Error al cargar inspecciones</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 text-sm text-red-700 underline hover:text-red-800"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 lg:p-3 bg-blue-100 rounded-lg">
                <ClipboardCheck className="text-blue-600" size={24} />
              </div>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Inspecciones HSE</h1>
                <p className="text-xs lg:text-sm text-gray-600 mt-1">Gestión y seguimiento</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
              <button
                onClick={() => setShowTemplateBuilder(true)}
                className="px-3 lg:px-4 py-2 lg:py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 font-medium text-xs lg:text-sm"
              >
                ⚙️ Templates
              </button>
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium text-sm lg:text-base"
              >
                <Plus size={20} />
                Iniciar inspección
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <StatCard
            icon={<ClipboardCheck size={24} />}
            label="Total"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle size={24} />}
            label="Completadas"
            value={stats.completed}
            color="green"
          />
          <StatCard
            icon={<Clock size={24} />}
            label="Borradores"
            value={stats.draft}
            color="yellow"
          />
          <StatCard
            icon={<Award size={24} />}
            label="Aprobadas"
            value={stats.passed}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp size={24} />}
            label="Score Promedio"
            value={`${stats.avgScore}%`}
            color="indigo"
          />
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4 mb-4 lg:mb-6 border">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por #, título, ficha..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Filtro de estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Todos los estados</option>
              <option value="DRAFT">Borradores</option>
              <option value="COMPLETED">Completadas</option>
              <option value="APPROVED">Aprobadas</option>
            </select>

            {/* Filtro de prioridad */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Todas las prioridades</option>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>

            {/* Filtro de template */}
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Todos los tipos</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 justify-end mb-6">
          <button
            onClick={() => {
              setEditingTemplateId(null);
              setShowTemplateBuilder(true);
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium"
          >
            <ClipboardCheck className="w-4 h-4" />
            Gestionar Plantillas
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {syncing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Download size={16} />
                Sincronizar
              </>
            )}
          </button>
        </div>

        {/* Tabla de inspecciones */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border">
            <ClipboardCheck size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay inspecciones
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza creando una nueva inspección
            </p>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Crear Primera Inspección
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-12">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Inspección</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ficha</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Puntuación</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Realizada</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInspections.map(inspection => (
                  <tr key={inspection.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {inspection.title || 'Sin título'}
                        </p>
                        <p className="text-sm text-gray-500">#{inspection.inspection_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inspection.ficha || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadgeTable status={inspection.status} priority={inspection.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-700">
                            {inspection.score_percentage ? Math.round(inspection.score_percentage) : '—'}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inspection.completed_at
                        ? new Date(inspection.completed_at).toLocaleDateString('es-ES')
                        : new Date(inspection.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {inspection.status === 'DRAFT' ? (
                          <button
                            onClick={() => handleCreateInspection(inspection.template_id || selectedTemplate?.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Continuar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewInspection(inspection)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Ver informe
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: Selector de Templates */}
      {showTemplateSelector && (
        <TemplateSelector
          templates={templates}
          onSelect={handleCreateInspection}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* Modal: Formulario de Inspección */}
      {showFormModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedTemplate.icon} {selectedTemplate.name}
                </h2>
                <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
              </div>
            </div>

            <div className="p-6">
              <FormRenderer
                template={selectedTemplate}
                onSubmit={handleSubmitInspection}
                mode="edit"
                showScore={selectedTemplate.scoring_enabled}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Inspección */}
      {showDetailModal && selectedInspection && (
        <InspectionDetailModal
          inspectionId={selectedInspection.id}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInspection(null);
          }}
          onUpdate={loadData}
        />
      )}

      {/* Modal: Template Builder */}
      {showTemplateBuilder && (
        <div className="fixed inset-0 z-50">
          <TemplateManager
            onClose={() => {
              setShowTemplateBuilder(false);
              setEditingTemplateId(null);
              loadData();
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Componente para tarjetas de estadísticas
 */
function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Badge de estado y prioridad para tabla
 */
function StatusBadgeTable({ status, priority }) {
  const statusColors = {
    'DRAFT': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Borrador' },
    'COMPLETED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completada' },
    'APPROVED': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Aprobada' },
    'REJECTED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rechazada' }
  };

  const priorityColors = {
    'BAJA': 'text-green-600',
    'MEDIA': 'text-yellow-600',
    'ALTA': 'text-orange-600',
    'CRITICA': 'text-red-600'
  };

  const statusConfig = statusColors[status] || statusColors['DRAFT'];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
        {statusConfig.label}
      </span>
      {priority && (
        <span className={`text-xs font-semibold ${priorityColors[priority] || 'text-gray-600'}`}>
          {priority}
        </span>
      )}
    </div>
  );
}
