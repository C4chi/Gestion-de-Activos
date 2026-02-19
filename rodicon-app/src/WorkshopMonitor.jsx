import React, { useState, useMemo, useEffect } from 'react';
import { FullScreenModal } from './FullScreenModal'; // No changes needed here, looks correct.
import { StatusBadge } from './StatusBadge'; // No changes needed here, looks correct.
import { Search, X } from 'lucide-react';
import { useDebounce } from './hooks/useDebounce';
import { supabase } from './supabaseClient';

export const WorkshopMonitor = ({ assets, onClose, onSelectAsset, onOpenModal }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [workshopDetailsByAsset, setWorkshopDetailsByAsset] = useState({});
  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);
  const [selectedAssetForUpdates, setSelectedAssetForUpdates] = useState(null);
  const [updatesData, setUpdatesData] = useState({
    loading: false,
    comments: [],
    purchases: [],
    maintenances: [],
  });
  const [expandedEvidenceByMto, setExpandedEvidenceByMto] = useState({});

  useEffect(() => {
    const loadWorkshopDetails = async () => {
      try {
        const assetIds = assets.map(a => a.id).filter(Boolean);

        if (assetIds.length === 0) {
          setWorkshopDetailsByAsset({});
          return;
        }

        const { data: workOrders, error: woError } = await supabase
          .from('work_orders')
          .select('id, asset_id, titulo, descripcion, asignado_a, created_by, fecha_creacion, estado')
          .in('asset_id', assetIds)
          .in('estado', ['ABIERTA', 'ASIGNADA', 'EN_PROGRESO', 'PAUSADA'])
          .order('fecha_creacion', { ascending: false });

        if (woError) throw woError;

        const latestWoByAsset = {};
        (workOrders || []).forEach((wo) => {
          if (!latestWoByAsset[wo.asset_id]) {
            latestWoByAsset[wo.asset_id] = wo;
          }
        });

        const workOrderIds = Object.values(latestWoByAsset).map(wo => wo.id);

        let requestByWorkOrder = {};
        if (workOrderIds.length > 0) {
          const { data: requests, error: reqError } = await supabase
            .from('maintenance_requests')
            .select('work_order_id, solicitante_nombre, titulo')
            .in('work_order_id', workOrderIds);

          if (reqError) throw reqError;

          requestByWorkOrder = (requests || []).reduce((acc, req) => {
            acc[req.work_order_id] = req;
            return acc;
          }, {});
        }

        const creatorIds = [...new Set(
          Object.values(latestWoByAsset)
            .map(wo => wo.created_by)
            .filter(Boolean)
        )];

        let creatorNameById = {};
        if (creatorIds.length > 0) {
          const { data: creators, error: usersError } = await supabase
            .from('app_users')
            .select('id, nombre')
            .in('id', creatorIds);

          if (!usersError) {
            creatorNameById = (creators || []).reduce((acc, u) => {
              acc[u.id] = u.nombre;
              return acc;
            }, {});
          }
        }

        const detailsByAsset = Object.entries(latestWoByAsset).reduce((acc, [assetId, wo]) => {
          const request = requestByWorkOrder[wo.id];
          acc[assetId] = {
            motivoEntrada: request?.titulo || wo.titulo || wo.descripcion || '-',
            reportadoPor: request?.solicitante_nombre || creatorNameById[wo.created_by] || '-',
            mecanico: wo.asignado_a || '-',
            hasOpenWorkOrder: true,
            workOrderEstado: wo.estado,
          };
          return acc;
        }, {});

        setWorkshopDetailsByAsset(detailsByAsset);
      } catch (error) {
        console.error('Error cargando detalle de taller:', error);
      }
    };

    loadWorkshopDetails();
  }, [assets]);

  // Función para obtener la última observación de manera legible
  const getLatestObservation = (observation) => {
    if (!observation) return '-';

    try {
      let parsedComments = observation;

      // Si es una cadena, intenta parsearla como JSON
      if (typeof observation === 'string') {
        parsedComments = JSON.parse(observation);
      }

      // Si es un array (ya sea directamente o después de parsear), extrae el último comentario
      if (Array.isArray(parsedComments) && parsedComments.length > 0) {
        // Devuelve el texto del último comentario en el historial
        const lastComment = parsedComments[parsedComments.length - 1];
        return lastComment.text || (typeof lastComment === 'string' ? lastComment : 'Comentario inválido.');
      }
    } catch (e) {
    }
    return typeof observation === 'string' ? observation : '-'; // Fallback para strings no JSON o formatos inesperados
  };

  const parseObservationHistory = (observation) => {
    if (!observation || typeof observation !== 'string') return [];
    return observation
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .reverse();
  };

  const parseEvidenceList = (evidencias) => {
    if (!evidencias) return [];
    try {
      const parsed = typeof evidencias === 'string' ? JSON.parse(evidencias) : evidencias;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item) => {
          if (typeof item === 'string') return { url: item, tipo: 'image', nombre: 'Evidencia' };
          if (item?.url) return { url: item.url, tipo: item.tipo || 'image', nombre: item.nombre || 'Evidencia' };
          return null;
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  const hasEvidence = (evidencias) => parseEvidenceList(evidencias).length > 0;

  const openUpdatesModal = async (asset) => {
    setSelectedAssetForUpdates(asset);
    setUpdatesModalOpen(true);
    setUpdatesData(prev => ({ ...prev, loading: true }));

    try {
      const { data: latestAsset, error: latestAssetError } = await supabase
        .from('assets')
        .select('id, ficha, status, taller_responsable, proyeccion_salida, observacion_mecanica')
        .eq('id', asset.id)
        .single();

      if (latestAssetError) throw latestAssetError;

      const assetForModal = latestAsset ? { ...asset, ...latestAsset } : asset;
      setSelectedAssetForUpdates(assetForModal);

      const comments = parseObservationHistory(assetForModal?.observacion_mecanica);

      const { data: purchases, error: purchasesError } = await supabase
        .from('purchase_orders')
        .select('id, numero_requisicion, estado, fecha_solicitud, fecha_actualizacion, comentario_recepcion, prioridad')
        .eq('ficha', assetForModal.ficha)
        .order('fecha_actualizacion', { ascending: false })
        .limit(10);

      if (purchasesError) throw purchasesError;

      const { data: maintenances, error: maintenanceError } = await supabase
        .from('maintenance_logs')
        .select('id, fecha, tipo, descripcion, mecanico, created_at, evidencias')
        .eq('ficha', assetForModal.ficha)
        .order('fecha', { ascending: false })
        .limit(10);

      if (maintenanceError) throw maintenanceError;

      setUpdatesData({
        loading: false,
        comments,
        purchases: purchases || [],
        maintenances: maintenances || [],
      });
      setExpandedEvidenceByMto({});
    } catch (error) {
      console.error('Error cargando actualizaciones del activo:', error);
      setUpdatesData({
        loading: false,
        comments: [],
        purchases: [],
        maintenances: [],
      });
      setExpandedEvidenceByMto({});
    }
  };

  const filteredWorkshopAssets = useMemo(() => {
    const workshopAssets = assets.filter(a => {
      const inWorkshopByStatus = ['NO DISPONIBLE', 'ESPERA REPUESTO', 'MTT PREVENTIVO', 'EN TALLER', 'EN REPARACION'].includes(a.status);
      const hasOpenWorkOrder = !!workshopDetailsByAsset[a.id]?.hasOpenWorkOrder;
      return inWorkshopByStatus || hasOpenWorkOrder;
    });

    return workshopAssets.filter(asset => {
      const inWorkshopByStatus = ['NO DISPONIBLE', 'ESPERA REPUESTO', 'MTT PREVENTIVO', 'EN TALLER', 'EN REPARACION'].includes(asset.status);
      const hasOpenWorkOrder = !!workshopDetailsByAsset[asset.id]?.hasOpenWorkOrder;
      const isOperativeWithOpenWO = hasOpenWorkOrder && !inWorkshopByStatus;

      const matchesStatus =
        statusFilter === 'TODOS' ||
        asset.status === statusFilter ||
        (statusFilter === 'OT_ABIERTA' && isOperativeWithOpenWO);

      const matchesSearch = debouncedSearch === '' || (asset.ficha || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [assets, debouncedSearch, statusFilter, workshopDetailsByAsset]);

  return (
    <FullScreenModal title="🛠️ Monitor de Taller" color="purple" onClose={onClose}>
      {/* Header con Filtros */}
      <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ficha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-white rounded-lg text-sm border border-gray-300 focus:border-purple-400 outline-none transition"
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-white border border-gray-300 rounded-lg">
          <button onClick={() => setStatusFilter('TODOS')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'TODOS' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>Todos</button>
          <button onClick={() => setStatusFilter('OT_ABIERTA')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'OT_ABIERTA' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>OT Abierta</button>
          <button onClick={() => setStatusFilter('NO DISPONIBLE')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'NO DISPONIBLE' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>No Disponible</button>
          <button onClick={() => setStatusFilter('ESPERA REPUESTO')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'ESPERA REPUESTO' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>Espera Repuesto</button>
          <button onClick={() => setStatusFilter('EN REPARACION')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'EN REPARACION' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>En Reparación</button>
        </div>
      </div>

      {/* Grid de Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkshopAssets.map(a => (
          <div
            key={a.id}
            onClick={() => openUpdatesModal(a)}
            className={`bg-white rounded-xl shadow p-5 border-t-4 ${a.status === 'ESPERA REPUESTO' ? 'border-orange-500' : 'border-purple-500'} relative cursor-pointer hover:shadow-lg transition`}
            title="Ver actualizaciones en taller"
          >
            {(() => {
              const details = workshopDetailsByAsset[a.id] || {};
              const mecanico = details.mecanico || a.taller_responsable || '-';
              const motivo = details.motivoEntrada || getLatestObservation(a.observacion_mecanica);
              const reportadoPor = details.reportadoPor || '-';

              return (
                <>
            <div className="absolute top-4 right-4"><StatusBadge status={a.status} /></div>
            <h3 className="font-bold text-lg text-gray-800">{a.ficha}</h3>
            <p className="text-xs text-gray-500 mb-3">{a.marca} {a.modelo}</p>
            {details.hasOpenWorkOrder && !['NO DISPONIBLE', 'ESPERA REPUESTO', 'MTT PREVENTIVO', 'EN TALLER', 'EN REPARACION'].includes(a.status) && (
              <p className="mb-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                🧾 OT ABIERTA (equipo operativo)
              </p>
            )}
            <div className="bg-gray-50 p-3 rounded text-xs space-y-1 mb-4 border border-gray-100">
              <p><strong>Mecánico:</strong> {mecanico}</p>
              <p><strong>Reportado por:</strong> {reportadoPor}</p>
              <p><strong>Entrada:</strong> {a.proyeccion_entrada 
                ? (() => {
                    const [year, month, day] = a.proyeccion_entrada.split('-');
                    return `${day}/${month}/${year}`;
                  })()
                : '-'
              }</p>
              <p><strong>Motivo:</strong> {motivo || '-'}</p>
              <p className="italic text-gray-500 mt-1">"{getLatestObservation(a.observacion_mecanica)}"</p>
            </div>
            <div className="flex gap-2">
              {a.status === 'ESPERA REPUESTO' ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onSelectAsset(a); onOpenModal('UPDATE_WORKSHOP'); }} className="flex-1 bg-blue-100 text-blue-700 py-2 rounded font-bold text-xs hover:bg-blue-200">Actualizar</button>
                  <button onClick={(e) => { e.stopPropagation(); onSelectAsset(a); onOpenModal('REQ'); }} className="flex-1 bg-orange-100 text-orange-700 py-2 rounded font-bold text-xs hover:bg-orange-200">Solicitar Adicional</button>
                </>
              ) : (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onSelectAsset(a); onOpenModal('UPDATE_WORKSHOP'); }} className="flex-1 bg-blue-100 text-blue-700 py-2 rounded font-bold text-xs hover:bg-blue-200">Actualizar</button>
                  <button onClick={(e) => { e.stopPropagation(); onSelectAsset(a); onOpenModal('REQ'); }} className="flex-1 bg-orange-100 text-orange-700 py-2 rounded font-bold text-xs hover:bg-orange-200">Solicitar Repuesto</button>
                  <button onClick={(e) => { e.stopPropagation(); onSelectAsset(a); onOpenModal('CLOSE_ORDER'); }} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-700">Cerrar Orden</button>
                </>
              )}
            </div>
                </>
              );
            })()}
          </div>
        ))}
        {filteredWorkshopAssets.length === 0 && <div className="col-span-3 text-center py-20 text-gray-400">No se encontraron vehículos con los filtros seleccionados.</div>}
      </div>

      {updatesModalOpen && selectedAssetForUpdates && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">📋 Flujo en Taller · {selectedAssetForUpdates.ficha}</h3>
                <p className="text-xs text-gray-500">Actualizaciones, repuestos y mantenimientos recientes</p>
              </div>
              <button
                onClick={() => setUpdatesModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-72px)] space-y-4">
              {updatesData.loading ? (
                <p className="text-sm text-gray-500">Cargando actualizaciones...</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <p className="text-xs text-purple-700 font-semibold">Estado</p>
                      <p className="font-bold text-purple-900">{selectedAssetForUpdates.status || '-'}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs text-blue-700 font-semibold">Mecánico</p>
                      <p className="font-bold text-blue-900">{selectedAssetForUpdates.taller_responsable || '-'}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                      <p className="text-xs text-green-700 font-semibold">Proyección Salida</p>
                      <p className="font-bold text-green-900">{selectedAssetForUpdates.proyeccion_salida || '-'}</p>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-3">
                    <p className="text-sm font-bold text-gray-800 mb-2">📝 Actualizaciones de Taller</p>
                    {updatesData.comments.length > 0 ? (
                      <div className="space-y-2">
                        {updatesData.comments.slice(0, 8).map((comment, idx) => (
                          <p key={idx} className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{comment}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Sin actualizaciones registradas.</p>
                    )}
                  </div>

                  <div className="bg-white border rounded-lg p-3">
                    <p className="text-sm font-bold text-gray-800 mb-2">🛒 Flujo de Repuestos</p>
                    {updatesData.purchases.length > 0 ? (
                      <div className="space-y-2">
                        {updatesData.purchases.map((po) => (
                          <div key={po.id} className="text-xs border border-gray-100 rounded p-2 bg-gray-50">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-800">{po.numero_requisicion || '—'}</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">{po.estado || '—'}</span>
                            </div>
                            <p className="text-gray-600 mt-1">Actualizado: {po.fecha_actualizacion ? new Date(po.fecha_actualizacion).toLocaleDateString('es-ES') : '—'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Sin requisiciones para este activo.</p>
                    )}
                  </div>

                  <div className="bg-white border rounded-lg p-3">
                    <p className="text-sm font-bold text-gray-800 mb-2">🔧 Mantenimientos Recientes</p>
                    {updatesData.maintenances.length > 0 ? (
                      <div className="space-y-2">
                        {updatesData.maintenances.map((mto) => (
                          <div key={mto.id} className="text-xs border border-gray-100 rounded p-2 bg-gray-50">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-800">{mto.tipo || 'Mantenimiento'}</span>
                              <span className="text-gray-500">{mto.fecha ? new Date(mto.fecha).toLocaleDateString('es-ES') : '—'}</span>
                            </div>
                            <p className="text-gray-600 mt-1">{mto.descripcion || 'Sin descripción'}</p>
                            <div className="flex items-center gap-2 mt-1 text-gray-500">
                              <span>Mecánico: {mto.mecanico || '-'}</span>
                              {hasEvidence(mto.evidencias) && <span title="Con evidencias">📸</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAsset?.(selectedAssetForUpdates);
                                  onOpenModal?.('MTO_DETAIL', mto);
                                }}
                                className="px-2 py-1 rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold"
                              >
                                Ver detalle
                              </button>
                              {hasEvidence(mto.evidencias) && (
                                <button
                                  onClick={() => {
                                    setExpandedEvidenceByMto((prev) => ({
                                      ...prev,
                                      [mto.id]: !prev[mto.id],
                                    }));
                                  }}
                                  className="px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                                >
                                  {expandedEvidenceByMto[mto.id] ? 'Ocultar fotos' : `Ver fotos (${parseEvidenceList(mto.evidencias).length})`}
                                </button>
                              )}
                            </div>

                            {expandedEvidenceByMto[mto.id] && hasEvidence(mto.evidencias) && (
                              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                {parseEvidenceList(mto.evidencias).map((ev, idx) => (
                                  <a
                                    key={`${mto.id}-ev-${idx}`}
                                    href={ev.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block border border-gray-200 rounded overflow-hidden bg-white hover:border-blue-300 transition"
                                  >
                                    {ev.tipo === 'video' ? (
                                      <div className="h-20 flex items-center justify-center text-[11px] text-gray-600 bg-gray-100">
                                        🎥 Video
                                      </div>
                                    ) : (
                                      <img src={ev.url} alt={ev.nombre || `Evidencia ${idx + 1}`} className="w-full h-20 object-cover" />
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Sin mantenimientos recientes.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </FullScreenModal>
  );
};