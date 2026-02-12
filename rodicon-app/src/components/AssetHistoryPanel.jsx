import React, { useState, useEffect } from 'react';
import { Wrench, Battery, CircleDot, Calendar, DollarSign, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * AssetHistoryPanel
 * Vista consolidada del historial completo del activo:
 * - Mantenimientos (preventivos y correctivos)
 * - Cambios de componentes (baterías, llantas, etc.)
 * Todo ordenado cronológicamente
 */
export const AssetHistoryPanel = ({ asset }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filter, setFilter] = useState('TODOS'); // TODOS, MANTENIMIENTO, COMPONENTES

  useEffect(() => {
    if (asset?.ficha) {
      loadHistory();
    }
  }, [asset?.ficha]);

  const loadHistory = async () => {
    try {
      // 1. Cargar mantenimientos
      const { data: mtoData, error: mtoError } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('ficha', asset.ficha)
        .order('fecha', { ascending:false });

      if (mtoError) throw mtoError;

      // 2. Cargar historial de componentes
      const { data: compData, error: compError } = await supabase
        .from('asset_components_history')
        .select('*')
        .eq('asset_id', asset.id)
        .order('fecha_accion', { ascending: false });

      if (compError) throw compError;

      // 3. Unificar y ordenar cronológicamente
      const unifiedHistory = [
        ...(mtoData || []).map(item => ({
          ...item,
          type: 'MANTENIMIENTO',
          date: item.fecha,
          sortDate: new Date(item.fecha)
        })),
        ...(compData || []).map(item => ({
          ...item,
          type: 'COMPONENTE',
          date: item.fecha_accion,
          sortDate: new Date(item.fecha_accion)
        }))
      ].sort((a, b) => b.sortDate - a.sortDate);

      setHistory(unifiedHistory);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getComponentIcon = (tipo) => {
    switch (tipo) {
      case 'BATERIA':
        return <Battery className="w-4 h-4 text-blue-600" />;
      case 'LLANTA':
        return <CircleDot className="w-4 h-4 text-gray-700" />;
      default:
        return <Wrench className="w-4 h-4 text-purple-600" />;
    }
  };

  const getAccionColor = (accion) => {
    switch (accion) {
      case 'INSTALADO':
        return 'bg-green-100 text-green-700';
      case 'REEMPLAZADO':
        return 'bg-orange-100 text-orange-700';
      case 'REPARADO':
        return 'bg-blue-100 text-blue-700';
      case 'ROTADO':
        return 'bg-purple-100 text-purple-700';
      case 'REMOVIDO':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'TODOS') return true;
    if (filter === 'MANTENIMIENTO') return item.type === 'MANTENIMIENTO';
    if (filter === 'COMPONENTES') return item.type === 'COMPONENTE';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (filteredHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No hay registros de historial</p>
        <p className="text-xs text-gray-400 mt-1">
          Los mantenimientos y cambios de componentes aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 border-b pb-3">
        <button
          onClick={() => setFilter('TODOS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filter === 'TODOS' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos ({history.length})
        </button>
        <button
          onClick={() => setFilter('MANTENIMIENTO')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filter === 'MANTENIMIENTO' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Wrench className="w-3 h-3 inline mr-1" />
          Mantenimientos ({history.filter(h => h.type === 'MANTENIMIENTO').length})
        </button>
        <button
          onClick={() => setFilter('COMPONENTES')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filter === 'COMPONENTES' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Battery className="w-3 h-3 inline mr-1" />
          Componentes ({history.filter(h => h.type === 'COMPONENTE').length})
        </button>
      </div>

      {/* Timeline de eventos */}
      <div className="space-y-3">
        {filteredHistory.map((item) => {
          const isExpanded = expandedItems.has(item.id);

          if (item.type === 'MANTENIMIENTO') {
            return (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.tipo === 'PREVENTIVO' 
                        ? 'bg-purple-100' 
                        : 'bg-red-100'
                    }`}>
                      <Wrench className={`w-4 h-4 ${
                        item.tipo === 'PREVENTIVO' 
                          ? 'text-purple-600' 
                          : 'text-red-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.tipo === 'PREVENTIVO' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.tipo}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.fecha)}
                        </div>
                      </div>
                      
                      <p className="text-sm font-semibold text-gray-800 mt-1">
                        {item.descripcion || 'Mantenimiento realizado'}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        {item.mecanico && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {item.mecanico}
                          </div>
                        )}
                        {item.costo > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${item.costo.toLocaleString()}
                          </div>
                        )}
                        {item.km_recorrido && (
                          <div>
                            {item.km_recorrido.toLocaleString()} {item.tipo_medicion === 'HOROMETRO' ? 'h' : 'km'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-2">
                    <div className="space-y-2 text-sm">
                      {item.proyeccion_proxima_km && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Próximo mantenimiento:</span>
                          <span className="font-semibold text-gray-800">
                            {item.proyeccion_proxima_km.toLocaleString()} {item.tipo_medicion === 'HOROMETRO' ? 'h' : 'km'}
                          </span>
                        </div>
                      )}
                      {item.proyeccion_proxima_mto && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Fecha proyectada:</span>
                          <span className="font-semibold text-gray-800">
                            {formatDate(item.proyeccion_proxima_mto)}
                          </span>
                        </div>
                      )}
                      {item.tipo_medicion && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Tipo de medición:</span>
                          <span className="text-xs font-semibold text-gray-800">
                            {item.tipo_medicion === 'HOROMETRO' ? '⚙️ Horómetro' : '🚗 Kilometraje'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">Registrado:</span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString('es-ES')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Componente
          return (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition">
              <button
                onClick={() => toggleExpand(item.id)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    item.tipo === 'BATERIA' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {getComponentIcon(item.tipo)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${getAccionColor(item.accion)}`}>
                          {item.accion}
                        </span>
                        <span className="text-xs text-gray-600">
                          {item.tipo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.fecha_accion)}
                      </div>
                    </div>
                    
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                      {item.numero_identificacion || 'Componente'}
                      {item.tipo_especifico_anterior && (
                        <span className="text-gray-600 font-normal ml-1">
                          - {item.tipo_especifico_anterior}
                        </span>
                      )}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      {item.motivo && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {item.motivo}
                        </div>
                      )}
                      {item.costo > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${item.costo.toLocaleString()}
                        </div>
                      )}
                      {item.kilometraje_activo && (
                        <div>
                          {item.kilometraje_activo.toLocaleString()} km
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-2">
                  <div className="space-y-2 text-sm">
                    {item.posicion_anterior && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Posición anterior:</span>
                        <span className="font-semibold text-gray-800">
                          {item.posicion_anterior.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {item.posicion_nueva && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Posición nueva:</span>
                        <span className="font-semibold text-gray-800">
                          {item.posicion_nueva.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {item.kilometraje_componente && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Duración:</span>
                        <span className="font-semibold text-gray-800">
                          {item.kilometraje_componente.toLocaleString()} km
                        </span>
                      </div>
                    )}
                    {item.porcentaje_desgaste !== null && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Desgaste al cambio:</span>
                        <span className={`font-semibold ${
                          item.porcentaje_desgaste > 85 ? 'text-red-600' :
                          item.porcentaje_desgaste > 60 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {item.porcentaje_desgaste}%
                        </span>
                      </div>
                    )}
                    {item.proveedor && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Proveedor:</span>
                        <span className="font-semibold text-gray-800">
                          {item.proveedor}
                        </span>
                      </div>
                    )}
                    {item.orden_trabajo && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Orden de trabajo:</span>
                        <span className="font-mono text-xs text-gray-800">
                          {item.orden_trabajo}
                        </span>
                      </div>
                    )}
                    {item.observaciones && (
                      <div className="py-2">
                        <span className="text-gray-600 block mb-1">Observaciones:</span>
                        <p className="text-gray-800 bg-gray-50 p-2 rounded text-xs">
                          {item.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumen al final */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 mt-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-purple-900">{history.length}</p>
            <p className="text-xs text-purple-600 font-semibold">Total Eventos</p>
          </div>
          <div>
            <p className="text-2xl font-black text-purple-900">
              {history.filter(h => h.type === 'MANTENIMIENTO').length}
            </p>
            <p className="text-xs text-purple-600 font-semibold">Mantenimientos</p>
          </div>
          <div>
            <p className="text-2xl font-black text-purple-900">
              {history.filter(h => h.type === 'COMPONENTE').length}
            </p>
            <p className="text-xs text-purple-600 font-semibold">Componentes</p>
          </div>
        </div>
      </div>
    </div>
  );
};
