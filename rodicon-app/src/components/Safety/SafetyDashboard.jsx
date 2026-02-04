import React, { useState, useMemo, useEffect } from 'react';
import { FullScreenModal } from '../../FullScreenModal';
import { SafetyFormModal } from './SafetyFormModal';
import { useSafetyWorkflow } from '../../hooks/useSafetyWorkflow';
import { Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * SafetyDashboard
 * Panel de gestión de seguridad
 * Crear, ver y gestionar reportes de incidentes
 */
export const SafetyDashboard = ({ onClose }) => {
  const { createSafetyReport, fetchSafetyReports, isLoading, error } =
    useSafetyWorkflow();
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [typeFilter, setTypeFilter] = useState('TODAS');
  const [formModalOpen, setFormModalOpen] = useState(false);

  // Cargar reportes al montar
  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await fetchSafetyReports();
        setReports(data);
      } catch (err) {
        toast.error('Error al cargar reportes de seguridad');
      }
    };
    loadReports();
  }, []);

  // Filtrar reportes
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesStatus =
        statusFilter === 'TODAS' || report.estado === statusFilter;
      const matchesType =
        typeFilter === 'TODAS' || report.tipo_incidente === typeFilter;
      const matchesSearch =
        search === '' ||
        report.area.toLowerCase().includes(search.toLowerCase()) ||
        report.usuario_reporta.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [reports, search, statusFilter, typeFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: reports.length,
      abiertos: reports.filter((r) => r.estado === 'ABIERTO').length,
      enInvestigacion: reports.filter((r) => r.estado === 'EN_INVESTIGACION')
        .length,
      cerrados: reports.filter((r) => r.estado === 'CERRADO').length,
      accidentes: reports.filter((r) => r.tipo_incidente === 'ACCIDENTE').length,
    };
  }, [reports]);

  // Manejar creación de reporte
  const handleCreateReport = async (formData) => {
    try {
      const newReport = await createSafetyReport(formData);
      setReports((prev) => [newReport, ...prev]);
      setFormModalOpen(false);
      toast.success('Reporte de seguridad creado');
    } catch (err) {
      toast.error(err.message || 'Error al crear reporte');
    }
  };

  const typeIcons = {
    ACCIDENTE: '🚨',
    INCIDENTE: '⚠️',
    NEAR_MISS: '⚡',
    SUGGESTION: '💡',
  };

  const statusColors = {
    ABIERTO: 'border-red-500 bg-red-50',
    EN_INVESTIGACION: 'border-yellow-500 bg-yellow-50',
    CERRADO: 'border-green-500 bg-green-50',
  };

  return (
    <FullScreenModal title="🛡️ Centro de Seguridad" color="red" onClose={onClose}>
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 font-semibold mt-1">TOTAL</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
          <p className="text-2xl font-bold text-red-600">{stats.accidentes}</p>
          <p className="text-xs text-red-600 font-semibold mt-1">ACCIDENTES</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
          <p className="text-2xl font-bold text-red-600">{stats.abiertos}</p>
          <p className="text-xs text-red-600 font-semibold mt-1">ABIERTOS</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{stats.enInvestigacion}</p>
          <p className="text-xs text-yellow-600 font-semibold mt-1">EN INVEST.</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
          <p className="text-2xl font-bold text-green-600">{stats.cerrados}</p>
          <p className="text-xs text-green-600 font-semibold mt-1">CERRADOS</p>
        </div>
      </div>

      {/* Header con Filtros y Botón Nuevo Reporte */}
      <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200 flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por área o reportante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-white rounded-lg text-sm border border-gray-300 focus:border-red-400 outline-none transition"
            />
          </div>
          <button
            onClick={() => setFormModalOpen(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Reporte
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex items-center gap-2 p-1 bg-white border border-gray-300 rounded-lg flex-1">
            <span className="text-xs font-bold text-gray-600 px-2">Estado:</span>
            {['TODAS', 'ABIERTO', 'EN_INVESTIGACION', 'CERRADO'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  statusFilter === status
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 hover:bg-red-100'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 p-1 bg-white border border-gray-300 rounded-lg flex-1">
            <span className="text-xs font-bold text-gray-600 px-2">Tipo:</span>
            {['TODAS', 'ACCIDENTE', 'INCIDENTE', 'NEAR_MISS', 'SUGGESTION'].map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    typeFilter === type
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:bg-red-100'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="text-center py-20 text-gray-400">
          ⏳ Cargando reportes de seguridad...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
          ❌ {error}
        </div>
      )}

      {/* Lista de Reportes */}
      <div className="space-y-3">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className={`border-l-4 rounded-lg p-4 transition hover:shadow-md ${
              statusColors[report.estado] || statusColors.ABIERTO
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">
                  {typeIcons[report.tipo_incidente] || '⚠️'}
                </span>
                <div>
                  <p className="font-bold text-gray-800">{report.tipo_incidente}</p>
                  <p className="text-xs text-gray-500">{report.area}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                report.estado === 'ABIERTO'
                  ? 'bg-red-200 text-red-700'
                  : report.estado === 'EN_INVESTIGACION'
                    ? 'bg-yellow-200 text-yellow-700'
                    : 'bg-green-200 text-green-700'
              }`}>
                {report.estado}
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-2">{report.descripcion}</p>

            <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-2">
              <div>
                <span className="font-semibold">Reportante:</span> {report.usuario_reporta}
              </div>
              <div>
                {new Date(report.fecha_reporte).toLocaleDateString('es-AR')}
              </div>
            </div>

            {report.investigacion && (
              <div className="mt-2 p-2 bg-white/50 rounded text-xs border border-gray-200">
                <p className="font-semibold text-gray-700">Investigación:</p>
                <p className="text-gray-600 mt-1">{report.investigacion}</p>
              </div>
            )}
          </div>
        ))}

        {filteredReports.length === 0 && !isLoading && (
          <div className="col-span-2 text-center py-20 text-gray-400">
            📭 No hay reportes de seguridad que coincidan con los filtros.
          </div>
        )}
      </div>

      {/* Modal para crear reporte */}
      <SafetyFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onConfirm={handleCreateReport}
      />
    </FullScreenModal>
  );
};
