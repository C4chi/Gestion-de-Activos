import React from 'react';
import { AlertCircle, Clock, TrendingUp } from 'lucide-react';

/**
 * PurchaseStatistics
 * Resumen ejecutivo de estadísticas de compras
 */
export const PurchaseStatistics = ({ statistics }) => {
  if (!statistics) return null;

  const {
    pendientes = 0,
    ordenadas = 0,
    recibidas = 0,
    atrasadas = 0,
    promedio_dias_espera = 0,
    total_ordenes = 0,
    monto_total = 0,
  } = statistics;

  const stats = [
    {
      label: 'Pendientes',
      value: pendientes,
      icon: '📋',
      color: 'bg-yellow-100 text-yellow-800',
      trend: atrasadas > 0 ? `${atrasadas} atrasadas` : null,
      trendColor: 'text-red-600',
    },
    {
      label: 'Ordenadas',
      value: ordenadas,
      icon: '🛒',
      color: 'bg-blue-100 text-blue-800',
    },
    {
      label: 'Recibidas',
      value: recibidas,
      icon: '✅',
      color: 'bg-green-100 text-green-800',
    },
    {
      label: 'Tiempo Promedio',
      value: promedio_dias_espera ? `${Math.round(promedio_dias_espera)} días` : 'N/A',
      icon: '⏱️',
      color: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6 border border-green-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">📊 Resumen Ejecutivo</h3>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{total_ordenes}</span> órdenes totales
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {stats.map((stat, idx) => (
          <div key={idx} className={`${stat.color} rounded-lg p-4`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xs font-medium opacity-80 mb-1">{stat.label}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.trend && (
              <div className={`text-xs mt-1 ${stat.trendColor} flex items-center gap-1`}>
                <AlertCircle size={12} />
                {stat.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {monto_total > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-green-600" size={20} />
              <span className="font-semibold text-gray-700">Monto Total (30 días)</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${monto_total.toLocaleString('es-CL')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
