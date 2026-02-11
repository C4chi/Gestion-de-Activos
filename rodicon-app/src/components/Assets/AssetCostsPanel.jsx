import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { DollarSign, TrendingUp, Calendar, Package, Wrench, AlertCircle } from 'lucide-react';

/**
 * Panel de Costos por Activo
 * Muestra el desglose de costos y análisis de rentabilidad de un activo
 */
export const AssetCostsPanel = ({ ficha }) => {
  const [costos, setCostos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ficha) {
      loadAssetCosts();
    }
  }, [ficha]);

  const loadAssetCosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar detalle de costos
      const { data: costosData, error: costosError } = await supabase
        .from('asset_costs_detail')
        .select('*')
        .eq('ficha', ficha)
        .order('fecha', { ascending: false });

      if (costosError) throw costosError;

      // Cargar resumen
      const { data: resumenData, error: resumenError } = await supabase
        .from('asset_costs_summary')
        .select('*')
        .eq('ficha', ficha)
        .single();

      if (resumenError && resumenError.code !== 'PGRST116') {
        throw resumenError;
      }

      setCostos(costosData || []);
      setResumen(resumenData);
    } catch (err) {
      console.error('Error cargando costos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTipoCostoIcon = (tipo) => {
    switch (tipo) {
      case 'COMPRA_REPUESTO':
        return <Package className="w-4 h-4" />;
      case 'MANTENIMIENTO':
        return <Wrench className="w-4 h-4" />;
      case 'REPARACION':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTipoCostoColor = (tipo) => {
    switch (tipo) {
      case 'COMPRA_REPUESTO':
        return 'bg-blue-100 text-blue-700';
      case 'MANTENIMIENTO':
        return 'bg-green-100 text-green-700';
      case 'REPARACION':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen de Costos */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Total DOP</span>
              <DollarSign className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-2xl font-bold">
              ${parseFloat(resumen.total_dop || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-75 mt-1">
              {resumen.cantidad_registros_costos || 0} registros
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Total USD</span>
              <DollarSign className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-2xl font-bold">
              ${parseFloat(resumen.total_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-75 mt-1">
              Moneda extranjera
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Repuestos</span>
              <Package className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-2xl font-bold">
              ${parseFloat(resumen.total_repuestos || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-75 mt-1">
              Órdenes de compra
            </div>
          </div>
        </div>
      )}

      {/* Desglose por Tipo de Costo */}
      {resumen && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Desglose por Tipo
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">Repuestos</div>
              <div className="font-bold text-blue-700">
                ${parseFloat(resumen.total_repuestos || 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-green-50 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">Mantenimiento</div>
              <div className="font-bold text-green-700">
                ${parseFloat(resumen.total_mantenimiento || 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-red-50 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">Reparación</div>
              <div className="font-bold text-red-700">
                ${parseFloat(resumen.total_reparacion || 0).toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Costos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Historial de Costos ({costos.length})
          </h3>
        </div>
        
        {costos.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay costos registrados para este activo</p>
            <p className="text-xs mt-1">Los costos se registran automáticamente al recibir órdenes de compra</p>
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {costos.map((costo) => (
              <div key={costo.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getTipoCostoColor(costo.tipo_costo)}`}>
                        {getTipoCostoIcon(costo.tipo_costo)}
                        {costo.tipo_costo.replace('_', ' ')}
                      </span>
                      {costo.numero_requisicion && (
                        <span className="text-xs text-blue-600 font-mono">
                          {costo.numero_requisicion}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {costo.descripcion}
                    </div>
                    {costo.notas && (
                      <div className="text-xs text-gray-500 mb-1">
                        {costo.notas}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      {new Date(costo.fecha).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-gray-900">
                      {costo.moneda} ${parseFloat(costo.monto).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetCostsPanel;
