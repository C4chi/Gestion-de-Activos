import React, { useState, useMemo, useEffect } from 'react';
import { FullScreenModal } from './FullScreenModal'; // No changes needed here, looks correct.
import { StatusBadge } from './StatusBadge'; // No changes needed here, looks correct.
import { Search } from 'lucide-react';
import { useDebounce } from './hooks/useDebounce';
import { supabase } from './supabaseClient';

export const WorkshopMonitor = ({ assets, onClose, onSelectAsset, onOpenModal }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [workshopDetailsByAsset, setWorkshopDetailsByAsset] = useState({});

  useEffect(() => {
    const loadWorkshopDetails = async () => {
      try {
        const workshopAssets = assets.filter(a => ['NO DISPONIBLE', 'ESPERA REPUESTO', 'MTT PREVENTIVO', 'EN TALLER', 'EN REPARACION'].includes(a.status));
        const assetIds = workshopAssets.map(a => a.id).filter(Boolean);

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

  const filteredWorkshopAssets = useMemo(() => {
    const workshopAssets = assets.filter(a => ['NO DISPONIBLE', 'ESPERA REPUESTO', 'MTT PREVENTIVO', 'EN TALLER', 'EN REPARACION'].includes(a.status));

    return workshopAssets.filter(asset => {
      const matchesStatus = statusFilter === 'TODOS' || asset.status === statusFilter;
      const matchesSearch = debouncedSearch === '' || (asset.ficha || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [assets, debouncedSearch, statusFilter]);

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
          <button onClick={() => setStatusFilter('NO DISPONIBLE')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'NO DISPONIBLE' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>No Disponible</button>
          <button onClick={() => setStatusFilter('ESPERA REPUESTO')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'ESPERA REPUESTO' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>Espera Repuesto</button>
          <button onClick={() => setStatusFilter('EN REPARACION')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${statusFilter === 'EN REPARACION' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-100'}`}>En Reparación</button>
        </div>
      </div>

      {/* Grid de Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkshopAssets.map(a => (
          <div key={a.id} className={`bg-white rounded-xl shadow p-5 border-t-4 ${a.status === 'ESPERA REPUESTO' ? 'border-orange-500' : 'border-purple-500'} relative`}>
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
                  <button onClick={() => { onSelectAsset(a); onOpenModal('UPDATE_WORKSHOP'); }} className="flex-1 bg-blue-100 text-blue-700 py-2 rounded font-bold text-xs hover:bg-blue-200">Actualizar</button>
                  <button onClick={() => { onSelectAsset(a); onOpenModal('REQ'); }} className="flex-1 bg-orange-100 text-orange-700 py-2 rounded font-bold text-xs hover:bg-orange-200">Solicitar Adicional</button>
                </>
              ) : (
                <>
                  <button onClick={() => { onSelectAsset(a); onOpenModal('UPDATE_WORKSHOP'); }} className="flex-1 bg-blue-100 text-blue-700 py-2 rounded font-bold text-xs hover:bg-blue-200">Actualizar</button>
                  <button onClick={() => { onSelectAsset(a); onOpenModal('REQ'); }} className="flex-1 bg-orange-100 text-orange-700 py-2 rounded font-bold text-xs hover:bg-orange-200">Solicitar Repuesto</button>
                  <button onClick={() => { onSelectAsset(a); onOpenModal('CLOSE_ORDER'); }} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-700">Cerrar Orden</button>
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
    </FullScreenModal>
  );
};