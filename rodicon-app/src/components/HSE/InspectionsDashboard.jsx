/**
 * InspectionsDashboard.jsx
 * Panel principal para gestión de inspecciones HSE dinámicas
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Plus, Search, Filter, Download, Copy,
  CheckCircle, Clock, AlertTriangle, Award, TrendingUp, Wifi, WifiOff, Trash2
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
  deleteInspection,
  syncPendingInspections
} from '../../services/hseService';

export default function InspectionsDashboard() {
  const { user } = useAppContext();
  const [inspections, setInspections] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inspectionsData, templatesData] = await Promise.all([
        getInspections({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          template_id: templateFilter !== 'ALL' ? templateFilter : undefined,
          limit: 50 // Cargar solo 50 inicialmente
        }),
        getActiveTemplates()
      ]);

      setInspections(inspectionsData || []);
      setTemplates(templatesData || []);
      setHasMore((inspectionsData || []).length >= 50);

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

  // Cargar más inspecciones
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const moreData = await getInspections({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        template_id: templateFilter !== 'ALL' ? templateFilter : undefined,
        limit: 50,
        offset: inspections.length
      });

      if (moreData && moreData.length > 0) {
        setInspections(prev => [...prev, ...moreData]);
        setHasMore(moreData.length >= 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more:', error);
      toast.error('Error al cargar más inspecciones');
    } finally {
      setLoadingMore(false);
    }
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
      if (user?.id) {
        url.searchParams.set('hseUserId', String(user.id));
      }
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
      setShowTemplateSelector(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo abrir la inspección');
    }
  };

  const isDraftOwner = (inspection) => {
    if (!inspection || inspection.status !== 'DRAFT' || !inspection.conducted_by || !user?.id) return false;
    return String(inspection.conducted_by) === String(user.id);
  };

  const isInspectionOwner = (inspection) => {
    if (!inspection || !inspection.conducted_by || !user?.id) return false;
    return String(inspection.conducted_by) === String(user.id);
  };

  const handleContinueDraft = (inspection) => {
    if (!inspection || inspection.status !== 'DRAFT') return;

    if (!isDraftOwner(inspection)) {
      toast.error('Solo el usuario que inició el borrador puede continuarlo');
      return;
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('hseTemplateId', inspection.template_id);
      url.searchParams.set('hseInspectionId', inspection.id);
      if (user?.id) {
        url.searchParams.set('hseUserId', String(user.id));
      }
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening draft:', error);
      toast.error('No se pudo abrir el borrador');
    }
  };

  const handleEditCompletedInspection = (inspection) => {
    if (!inspection || inspection.status !== 'COMPLETED') return;

    if (!isInspectionOwner(inspection)) {
      toast.error('Solo el usuario que realizó la inspección puede editarla');
      return;
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('hseTemplateId', inspection.template_id);
      url.searchParams.set('hseInspectionId', inspection.id);
      if (user?.id) {
        url.searchParams.set('hseUserId', String(user.id));
      }
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening inspection for edit:', error);
      toast.error('No se pudo abrir la inspección para edición');
    }
  };

  const handleDeleteInspection = async (inspection) => {
    if (!inspection?.id) return;

    const confirmDelete = window.confirm(`¿Eliminar la inspección #${inspection.inspection_number || ''}? Esta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    try {
      await deleteInspection(inspection.id);
      toast.success('Inspección eliminada correctamente');
      if (selectedInspection?.id === inspection.id) {
        setShowDetailModal(false);
        setSelectedInspection(null);
      }
      loadData();
    } catch (error) {
      console.error('Error deleting inspection:', error);
      toast.error(error?.message || 'Error al eliminar la inspección');
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
        conducted_by: user?.id || null
      });

      // Completar con las respuestas
      await completeInspection(inspection.id, {
        ...formData,
        latitude: null, // TODO: Obtener geolocalización
        longitude: null,
        conducted_by: user?.id || null
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

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || templateFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setTemplateFilter('ALL');
  };

  const getInspectorName = (inspection) => {
    if (!inspection) return 'No especificado';

    const directName = inspection.conducted_by_name;
    if (directName && directName !== 'No especificado') return directName;

    if (inspection.conducted_by && user?.id && String(inspection.conducted_by) === String(user.id)) {
      return user?.nombre || user?.nombre_usuario || 'No especificado';
    }

    return inspection.conducted_by ? `Usuario ${inspection.conducted_by}` : 'No especificado';
  };

  const getSyncStatus = (inspection) => {
    if (inspection?.is_synced === false) {
      return { label: 'Pendiente sync', dot: 'bg-amber-500', text: 'text-amber-700' };
    }
    return { label: 'Sincronizada', dot: 'bg-green-500', text: 'text-green-700' };
  };

  const copyInspectionNumber = async (inspectionNumber) => {
    try {
      await navigator.clipboard.writeText(inspectionNumber || '');
      toast.success('Número de inspección copiado');
    } catch (error) {
      console.error('Error copying inspection number:', error);
      toast.error('No se pudo copiar el número');
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
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
      <header className="bg-white/95 backdrop-blur-sm border-b rounded-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-6">
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
              <div className={`hidden sm:flex items-center justify-center px-3 rounded-lg text-xs font-semibold border ${isOnline ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {isOnline ? <Wifi size={14} className="mr-1" /> : <WifiOff size={14} className="mr-1" />}
                {isOnline ? 'En línea' : 'Sin conexión'}
              </div>
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

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
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

        <div className="sticky top-[82px] sm:top-[90px] z-10 bg-gray-50 pb-3 sm:pb-4 space-y-3">
          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4 border">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4">
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
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <button
              onClick={() => {
                setEditingTemplateId(null);
                setShowTemplateBuilder(true);
              }}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-medium"
            >
              <ClipboardCheck className="w-4 h-4" />
              Gestionar Plantillas
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
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

          {(hasMore || filteredInspections.length > 0) && (
            <div className="bg-white border rounded-lg px-3 py-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">Mostrando {filteredInspections.length} inspección(es)</span>
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
                >
                  {loadingMore ? 'Cargando...' : 'Cargar más'}
                </button>
              )}
            </div>
          )}
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
              {hasActiveFilters ? 'No hay resultados con estos filtros' : 'No hay inspecciones'}
            </h3>
            <p className="text-gray-600 mb-6">
              {hasActiveFilters ? 'Prueba limpiando filtros o ajustando la búsqueda' : 'Comienza creando una nueva inspección'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Crear Primera Inspección
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px]">
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fecha</th>
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
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-500">#{inspection.inspection_number}</p>
                          <span className={`inline-flex items-center gap-1 text-xs ${getSyncStatus(inspection).text}`}>
                            <span className={`w-2 h-2 rounded-full ${getSyncStatus(inspection).dot}`} />
                            {getSyncStatus(inspection).label}
                          </span>
                        </div>
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
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {getInspectorName(inspection)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inspection.completed_at
                        ? new Date(inspection.completed_at).toLocaleDateString('es-ES')
                        : new Date(inspection.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyInspectionNumber(inspection.inspection_number)}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                          title="Copiar número"
                        >
                          <Copy size={14} />
                        </button>
                        {inspection.status === 'DRAFT' ? (
                          <button
                            onClick={() => handleContinueDraft(inspection)}
                            disabled={!isDraftOwner(inspection)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            title={!isDraftOwner(inspection) ? 'Solo el creador puede continuar este borrador' : 'Continuar borrador'}
                          >
                            Continuar
                          </button>
                        ) : inspection.status === 'COMPLETED' ? (
                          <>
                            <button
                              onClick={() => handleEditCompletedInspection(inspection)}
                              disabled={!isInspectionOwner(inspection)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                              title={!isInspectionOwner(inspection) ? 'Solo quien realizó la inspección puede editarla' : 'Editar inspección'}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleViewInspection(inspection)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Ver informe
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleViewInspection(inspection)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Ver informe
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteInspection(inspection)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          title="Eliminar inspección"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="md:hidden divide-y">
              {filteredInspections.map(inspection => (
                <div key={inspection.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 leading-snug">
                        {inspection.title || 'Sin título'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">#{inspection.inspection_number}</p>
                        <span className={`inline-flex items-center gap-1 text-xs ${getSyncStatus(inspection).text}`}>
                          <span className={`w-2 h-2 rounded-full ${getSyncStatus(inspection).dot}`} />
                          {getSyncStatus(inspection).label}
                        </span>
                      </div>
                    </div>
                    <StatusBadgeTable status={inspection.status} priority={inspection.priority} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-gray-600">Ficha: <span className="font-medium text-gray-800">{inspection.ficha || '—'}</span></p>
                    <p className="text-gray-600">Score: <span className="font-medium text-gray-800">{inspection.score_percentage ? Math.round(inspection.score_percentage) : '—'}%</span></p>
                    <p className="text-gray-600">Realizada: <span className="font-medium text-gray-800">{getInspectorName(inspection)}</span></p>
                    <p className="text-gray-600">Fecha: <span className="font-medium text-gray-800">{inspection.completed_at ? new Date(inspection.completed_at).toLocaleDateString('es-ES') : new Date(inspection.created_at).toLocaleDateString('es-ES')}</span></p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => copyInspectionNumber(inspection.inspection_number)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                      title="Copiar número"
                    >
                      <Copy size={14} />
                    </button>
                    {inspection.status === 'DRAFT' ? (
                      <button
                        onClick={() => handleContinueDraft(inspection)}
                        disabled={!isDraftOwner(inspection)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Continuar
                      </button>
                    ) : inspection.status === 'COMPLETED' ? (
                      <>
                        <button
                          onClick={() => handleEditCompletedInspection(inspection)}
                          disabled={!isInspectionOwner(inspection)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleViewInspection(inspection)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          Ver informe
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleViewInspection(inspection)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Ver informe
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInspection(inspection)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      title="Eliminar inspección"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Cargar Más */}
            {hasMore && !loading && filteredInspections.length > 0 && (
              <div className="flex items-center justify-between py-4 px-4 sm:px-6 border-t bg-gray-50">
                <span className="text-sm text-gray-600">Mostrando {filteredInspections.length} inspección(es)</span>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Cargando...
                    </>
                  ) : (
                    <>Cargar más inspecciones</>
                  )}
                </button>
              </div>
            )}
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
