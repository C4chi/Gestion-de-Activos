import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, AlertTriangle, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import toast from 'react-hot-toast';

/**
 * MaintenanceRequestValidator
 * Panel para validar solicitudes de mantenimiento desde áreas
 * SUPERVISOR/ADMIN aprueba → Genera OT automática
 */
export const MaintenanceRequestValidator = () => {
  const { user, fetchAllData } = useAppContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    loadRequests();
    
    // Suscripción en tiempo real
    const subscription = supabase
      .channel('maintenance_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'maintenance_requests'
      }, () => {
        loadRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests_pending')
        .select('*')
        .order('prioridad', { ascending: true })
        .order('fecha_solicitud', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Error cargando solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!confirm('¿Aprobar esta solicitud? Se creará una orden de trabajo automáticamente.')) {
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('aprobar_solicitud_mantenimiento', {
        p_request_id: requestId,
        p_validador_id: user.id,
        p_validador_nombre: user.nombre,
        p_comentarios: validationComment || null,
      });

      if (error) throw error;

      toast.success(`✅ Solicitud aprobada. OT #${data} creada.`);
      setValidationComment('');
      setShowDetailModal(false);
      await Promise.all([loadRequests(), fetchAllData()]);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Error al aprobar: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!validationComment) {
      toast.error('Ingresa una razón para rechazar la solicitud');
      return;
    }

    if (!confirm('¿Rechazar esta solicitud?')) {
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('rechazar_solicitud_mantenimiento', {
        p_request_id: requestId,
        p_validador_id: user.id,
        p_validador_nombre: user.nombre,
        p_comentarios: validationComment,
      });

      if (error) throw error;

      toast.success('❌ Solicitud rechazada');
      setValidationComment('');
      setShowDetailModal(false);
      await loadRequests();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Error al rechazar: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityBadge = (prioridad) => {
    const badges = {
      CRITICA: { color: 'bg-red-100 text-red-700 border-red-300', icon: '🔴', label: 'CRÍTICA' },
      ALTA: { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: '🟠', label: 'ALTA' },
      MEDIA: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '🟡', label: 'MEDIA' },
      BAJA: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '🔵', label: 'BAJA' },
    };
    const badge = badges[prioridad] || badges.MEDIA;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${badge.color} inline-flex items-center gap-1`}>
        <span>{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const getCategoryIcon = (categoria) => {
    const icons = {
      MECANICO: '🔧',
      ELECTRICO: '⚡',
      HIDRAULICO: '💧',
      NEUMATICO: '🛞',
      CARROCERIA: '🚗',
      OTRO: '📦',
    };
    return icons[categoria] || '❓';
  };

  const filteredRequests = requests.filter(req => {
    if (filterPriority !== 'ALL' && req.prioridad !== filterPriority) return false;
    if (filterCategory !== 'ALL' && req.categoria !== filterCategory) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          Solicitudes de Mantenimiento - Validación
        </h1>
        <p className="mt-2 text-orange-100">
          Revisa y aprueba/rechaza solicitudes de áreas operativas
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <span className="text-3xl font-black">{requests.length}</span>
            <span className="text-sm ml-2">pendientes</span>
          </div>
          {requests.filter(r => r.prioridad === 'CRITICA').length > 0 && (
            <div className="bg-red-500/80 backdrop-blur-sm rounded-lg px-4 py-2 animate-pulse">
              <span className="text-2xl font-bold">{requests.filter(r => r.prioridad === 'CRITICA').length}</span>
              <span className="text-sm ml-2">CRÍTICAS</span>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Prioridad</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Todas las prioridades</option>
              <option value="CRITICA">🔴 Crítica</option>
              <option value="ALTA">🟠 Alta</option>
              <option value="MEDIA">🟡 Media</option>
              <option value="BAJA">🔵 Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Categoría</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Todas las categorías</option>
              <option value="MECANICO">🔧 Mecánico</option>
              <option value="ELECTRICO">⚡ Eléctrico</option>
              <option value="HIDRAULICO">💧 Hidráulico</option>
              <option value="NEUMATICO">🛞 Neumático</option>
              <option value="CARROCERIA">🚗 Carrocería</option>
              <option value="OTRO">📦 Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de solicitudes */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-md">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            ¡No hay solicitudes pendientes!
          </h3>
          <p className="text-gray-600">
            Todas las solicitudes han sido procesadas
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map(req => (
            <div
              key={req.id}
              className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition border-l-4 border-orange-400"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getCategoryIcon(req.categoria)}</span>
                    <h3 className="text-lg font-bold text-gray-800">{req.titulo}</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {getPriorityBadge(req.prioridad)}
                    <span className="text-sm text-gray-600">
                      📦 <strong>{req.ficha}</strong> - {req.asset_nombre}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>👤</span>
                      <span>{req.solicitante_nombre}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>🏢</span>
                      <span>{req.solicitante_area || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>Hace {req.dias_pendiente || 0} días</span>
                    </div>
                  </div>

                  {req.descripcion && (
                    <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-3 border-l-2 border-gray-300">
                      {req.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setShowDetailModal(true);
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xl font-bold text-white">Detalle de Solicitud #{selectedRequest.id}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                {getPriorityBadge(selectedRequest.prioridad)}
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                  {getCategoryIcon(selectedRequest.categoria)} {selectedRequest.categoria}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-xl text-gray-800">{selectedRequest.titulo}</h3>
              </div>

             {selectedRequest.descripcion && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Descripción</label>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-4 border">{selectedRequest.descripcion}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Activo</label>
                  <p className="text-gray-800 font-semibold">{selectedRequest.ficha} - {selectedRequest.asset_nombre}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.asset_tipo}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Solicitante</label>
                  <p className="text-gray-800 font-semibold">{selectedRequest.solicitante_nombre}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.solicitante_area}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Fecha de solicitud</label>
                <p className="text-gray-800">{new Date(selectedRequest.fecha_solicitud).toLocaleString('es-ES')}</p>
                <p className="text-sm text-yellow-600 font-semibold">⏳ Hace {selectedRequest.dias_pendiente || 0} días</p>
              </div>

              {selectedRequest.evidencias && selectedRequest.evidencias.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Fotos adjuntas</label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRequest.evidencias.map((ev, idx) => (
                      <a key={idx} href={ev.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={ev.url}
                          alt={ev.nombre}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-300 hover:border-orange-500 transition cursor-pointer"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Comentario de validación
                </label>
                <textarea
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  placeholder="Opcional: Agrega observaciones sobre esta solicitud..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  {processing ? 'Procesando...' : 'Rechazar'}
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {processing ? 'Procesando...' : 'Aprobar y Crear OT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
