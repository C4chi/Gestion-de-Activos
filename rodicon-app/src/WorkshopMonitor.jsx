import React, { useState, useMemo } from 'react';
import { FullScreenModal } from './FullScreenModal'; // No changes needed here, looks correct.
import { StatusBadge } from './StatusBadge'; // No changes needed here, looks correct.
import { Search } from 'lucide-react';
import { useDebounce } from './hooks/useDebounce';

export const WorkshopMonitor = ({ assets, onClose, onSelectAsset, onOpenModal }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('TODOS');

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
            <div className="absolute top-4 right-4"><StatusBadge status={a.status} /></div>
            <h3 className="font-bold text-lg text-gray-800">{a.ficha}</h3>
            <p className="text-xs text-gray-500 mb-3">{a.marca} {a.modelo}</p>
            <div className="bg-gray-50 p-3 rounded text-xs space-y-1 mb-4 border border-gray-100">
              <p><strong>Mecánico:</strong> {a.taller_responsable || '-'}</p>
              <p><strong>Entrada:</strong> {a.proyeccion_entrada 
                ? (() => {
                    const [year, month, day] = a.proyeccion_entrada.split('-');
                    return `${day}/${month}/${year}`;
                  })()
                : '-'
              }</p>
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
          </div>
        ))}
        {filteredWorkshopAssets.length === 0 && <div className="col-span-3 text-center py-20 text-gray-400">No se encontraron vehículos con los filtros seleccionados.</div>}
      </div>
    </FullScreenModal>
  );
};