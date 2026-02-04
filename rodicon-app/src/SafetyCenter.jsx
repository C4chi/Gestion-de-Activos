import React, { useState, useMemo, useEffect } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { SafetyDashboard } from './components/Safety/SafetyDashboard';
import { SafetyFormModal } from './components/Safety/SafetyFormModal';
import { useSafetyWorkflow } from './hooks/useSafetyWorkflow';
import { useAppContext } from './AppContext';
import { SafetyReportDetail } from './components/Safety/SafetyReportDetail';
import { Search, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * SafetyCenter - Centro de comando HSE
 * Dashboard completo de seguridad con:
 * - Reportes por prioridad (Alta/Media/Baja)
 * - Estados (PENDIENTE/CORREGIDO)
 * - Modal para crear nuevos reportes
 * - Integración con useSafetyWorkflow
 */
export const SafetyCenter = ({ onClose, canHse = true }) => {
  const { fetchSafetyReports, createSafetyReport, updateSafetyReport, isLoading } = useSafetyWorkflow();
  const { assets, appUsers, fetchAppUsers, user } = useAppContext();
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('TODAS');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailReport, setDetailReport] = useState(null);

  // Cargar reportes al montar
  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await fetchSafetyReports();
        setReports(data || []);
      } catch (err) {
        console.error('Error loading safety reports:', err);
        setReports([]);
        toast.error('Error al cargar reportes HSE');
      }
    };
    loadReports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formModalOpen && (!appUsers || appUsers.length === 0)) {
      fetchAppUsers?.();
    }
  }, [formModalOpen, appUsers, fetchAppUsers]);

  useEffect(() => {
    if (!appUsers || appUsers.length === 0) {
      fetchAppUsers?.();
    }
  }, [appUsers, fetchAppUsers]);

  // Filtrar reportes
  const filteredReports = useMemo(() => {
    const term = search.toLowerCase();
    return reports.filter(report => {
      const matchesPriority = priorityFilter === 'TODAS' || report.prioridad === priorityFilter;
      const matchesStatus = statusFilter === 'TODAS' || report.estado === statusFilter;
      const matchesSearch = term === '' ||
        (report.id && String(report.id).toLowerCase().includes(term)) ||
        (report.ficha && report.ficha.toLowerCase().includes(term)) ||
        (report.tipo && report.tipo.toLowerCase().includes(term)) ||
        (report.descripcion && report.descripcion.toLowerCase().includes(term));
      return matchesPriority && matchesStatus && matchesSearch;
    });
  }, [reports, search, priorityFilter, statusFilter]);

  // KPIs
  const kpis = useMemo(() => ({
    total: reports.length,
    pendientes: reports.filter(r => r.estado === 'PENDIENTE').length,
    alta: reports.filter(r => r.prioridad === 'Alta' && r.estado === 'PENDIENTE').length,
    corregidos: reports.filter(r => r.estado === 'CORREGIDO').length,
  }), [reports]);

  const typeLabel = (tipo) => {
    const map = {
      ACCIDENTE: 'Accidente',
      INCIDENTE: 'Incidente',
      NEAR_MISS: 'Casi accidente',
      SUGGESTION: 'Sugerencia',
    };
    return map[tipo] || tipo || 'Sin tipo';
  };

  // Manejar cambio de estado a CORREGIDO
  const handleResolve = async (reportId) => {
    if (!canHse) {
      toast.error('No tienes permiso para esta acción');
      return;
    }
    try {
      const userPin = localStorage.getItem('userPin') || '0000';
      await updateSafetyReport(reportId, { estado: 'CORREGIDO' }, userPin);
      
      setReports(prev =>
        prev.map(report =>
          report.id === reportId ? { ...report, estado: 'CORREGIDO' } : report
        )
      );
      
      toast.success('Reporte marcado como corregido');
    } catch (err) {
      toast.error(err.message || 'Error al actualizar reporte');
    }
  };

  return (
    <FullScreenModal title="🛡️ Centro HSE (Seguridad)" color="orange" onClose={onClose}>
      {/* KPIs Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-semibold mb-1">TOTAL REPORTES</p>
              <p className="text-3xl font-black text-orange-900">{kpis.total}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-semibold mb-1">PRIORIDAD ALTA</p>
              <p className="text-3xl font-black text-red-900">{kpis.alta}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600 font-semibold mb-1">PENDIENTES</p>
              <p className="text-3xl font-black text-yellow-900">{kpis.pendientes}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-semibold mb-1">CORREGIDOS</p>
              <p className="text-3xl font-black text-green-900">{kpis.corregidos}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ficha, tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-white rounded-lg text-sm border border-gray-300 focus:border-orange-400 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 p-1 bg-white border border-gray-300 rounded-lg">
            {['TODAS', 'Alta', 'Media', 'Baja'].map(priority => (
              <button
                key={priority}
                onClick={() => setPriorityFilter(priority)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  priorityFilter === priority
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 hover:bg-orange-100'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 p-1 bg-white border border-gray-300 rounded-lg">
            {['TODAS', 'PENDIENTE', 'CORREGIDO'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  statusFilter === status
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 hover:bg-orange-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (!canHse) {
                toast.error('No tienes permiso para esta acción');
                return;
              }
              setFormModalOpen(true);
            }}
            disabled={!canHse}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${canHse ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <Plus className="w-4 h-4" />
            Nuevo Reporte
          </button>
        </div>
      </div>

      {/* Lista de Reportes */}
      {isLoading && (
        <div className="text-center py-20 text-gray-400">
          ⏳ Cargando reportes HSE...
        </div>
      )}

      <div className="space-y-3">
        {filteredReports.map(report => (
          <div 
            key={report.id} 
            onClick={() => setDetailReport(report)}
            className={`bg-white p-4 rounded-xl shadow-sm border-l-4 hover:shadow-md transition cursor-pointer ${
              report.prioridad === 'Alta' ? 'border-red-500' :
              report.prioridad === 'Media' ? 'border-yellow-500' :
              'border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-full ${
                  report.prioridad === 'Alta' ? 'bg-red-100 text-red-600' :
                  report.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex gap-2 items-center mb-2">
                    <span className="font-bold text-gray-800">{report.ficha || 'N/A'}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-semibold">
                      {typeLabel(report.tipo)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      report.prioridad === 'Alta' ? 'bg-red-100 text-red-700' :
                      report.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {report.prioridad}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {report.descripcion || 'Sin descripción'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Asignado: {report.asignado_a || 'Sin asignar'}</span>
                    <span>•</span>
                    <span>Reportado: {report.fecha_reporte ? new Date(report.fecha_reporte).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  report.estado === 'CORREGIDO' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {report.estado}
                </span>
                
                {report.estado === 'PENDIENTE' && (
                  <button
                    onClick={() => handleResolve(report.id)}
                    disabled={!canHse}
                    className={`text-xs px-3 py-1 rounded-lg transition font-bold ${canHse ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    Marcar Corregido
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay reportes HSE
            </h3>
            <p className="text-gray-500 mb-4">
              {priorityFilter !== 'TODAS' || statusFilter !== 'TODAS'
                ? 'No hay reportes que coincidan con los filtros'
                : 'Aún no se han creado reportes de seguridad.'
              }
            </p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              💡 Click en "Nuevo Reporte" para registrar un incidente o hallazgo de seguridad.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Nuevo Reporte */}
      {formModalOpen && (
        <SafetyFormModal
          onClose={() => {
            setFormModalOpen(false);
            setSelectedReport(null);
          }}
          assets={assets}
          appUsers={appUsers}
          currentUserId={user?.id || null}
          onSubmit={async (reportData) => {
            try {
              // Crear el reporte
              await createSafetyReport(reportData);
              // Recargar reportes después de crear
              const data = await fetchSafetyReports();
              setReports(data || []);
              setFormModalOpen(false);
              toast.success('Reporte creado exitosamente');
            } catch (err) {
              console.error('Error creating report:', err);
              toast.error('Error al crear el reporte');
            }
          }}
        />
      )}

      {detailReport && (
        <SafetyReportDetail
          report={detailReport}
          appUsers={appUsers}
          onClose={() => setDetailReport(null)}
        />
      )}
    </FullScreenModal>
  );
};