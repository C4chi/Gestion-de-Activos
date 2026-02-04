import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { formatDate } from '../../utils/dateUtils';

/**
 * PurchaseOrderHistory
 * Timeline visual del historial de cambios de estado de una orden
 */
export const PurchaseOrderHistory = ({ purchaseOrderId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('purchase_order_history')
          .select('*')
          .eq('purchase_order_id', purchaseOrderId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (purchaseOrderId) {
      fetchHistory();
    }
  }, [purchaseOrderId]);

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-500';
      case 'ORDENADO': return 'bg-blue-500';
      case 'PARCIAL': return 'bg-orange-500';
      case 'RECIBIDO': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return '📋';
      case 'ORDENADO': return '🛒';
      case 'PARCIAL': return '📦';
      case 'RECIBIDO': return '✅';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">No hay historial de cambios aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-700 mb-3">📊 Historial de la Orden</h4>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* History items */}
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-0 w-8 h-8 rounded-full ${getStatusColor(entry.estado_nuevo)} 
                flex items-center justify-center text-white font-bold shadow-md z-10`}>
                <span>{getStatusIcon(entry.estado_nuevo)}</span>
              </div>

              {/* Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                      {entry.estado_anterior ? (
                        <>
                          {entry.estado_anterior} → <span className="text-blue-600">{entry.estado_nuevo}</span>
                        </>
                      ) : (
                        <span className="text-blue-600">Orden Creada</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(entry.created_at, true)}
                      {entry.usuario && <span className="ml-2">• Por: {entry.usuario}</span>}
                    </div>
                    {entry.comentario && (
                      <div className="mt-2 text-sm text-gray-600 italic bg-gray-50 p-2 rounded">
                        "{entry.comentario}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
