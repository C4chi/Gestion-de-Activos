import React, { useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';

export default function MetricsPanel() {
  const { allAssets = [], purchases = [], safetyReports = [], mtoLogs = [] } = useAppContext();

  // Métricas de Activos
  const assetMetrics = useMemo(() => {
    const byStatus = {};
    allAssets.forEach(asset => {
      const status = asset.status || 'SIN STATUS';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    const byType = {};
    allAssets.forEach(asset => {
      const type = asset.tipo || 'SIN TIPO';
      byType[type] = (byType[type] || 0) + 1;
    });

    return { byStatus, byType, total: allAssets.length };
  }, [allAssets]);

  // Métricas de Compras
  const purchaseMetrics = useMemo(() => {
    const completed = purchases.filter(p => p.estado_recepcion === 'RECIBIDO').length;
    const pending = purchases.filter(p => p.estado_recepcion !== 'RECIBIDO').length;
    const total = purchases.length;
    
    return { completed, pending, total };
  }, [purchases]);

  // Métricas de HSE
  const hseMetrics = useMemo(() => {
    const byPriority = {
      'ALTA': safetyReports.filter(r => r.prioridad === 'ALTA').length,
      'MEDIA': safetyReports.filter(r => r.prioridad === 'MEDIA').length,
      'BAJA': safetyReports.filter(r => r.prioridad === 'BAJA').length,
    };
    
    return { byPriority, total: safetyReports.length };
  }, [safetyReports]);

  // Métricas de Mantenimiento
  const mtoMetrics = useMemo(() => {
    const preventive = mtoLogs.filter(m => m.tipo === 'PREVENTIVO').length;
    const corrective = mtoLogs.filter(m => m.tipo === 'CORRECTIVO').length;
    
    return { preventive, corrective, total: mtoLogs.length };
  }, [mtoLogs]);

  return (
    <div className="p-8 space-y-8 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="text-blue-600" size={32} />
          Dashboard de Métricas
        </h2>
        <p className="text-gray-600 mt-2">KPIs y estadísticas de la operación</p>
      </div>

      {/* Grid de KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<TrendingUp className="text-blue-600" size={24} />}
          title="Total Activos"
          value={assetMetrics.total}
          color="blue"
        />
        <MetricCard
          icon={<CheckCircle className="text-green-600" size={24} />}
          title="Compras Completadas"
          value={purchaseMetrics.completed}
          subtitle={`de ${purchaseMetrics.total}`}
          color="green"
        />
        <MetricCard
          icon={<AlertCircle className="text-red-600" size={24} />}
          title="Reportes HSE"
          value={hseMetrics.total}
          color="red"
        />
        <MetricCard
          icon={<Wrench className="text-yellow-600" size={24} />}
          title="Mantenimientos"
          value={mtoMetrics.total}
          color="yellow"
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activos por Estado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activos por Estado</h3>
          <div className="space-y-3">
            {Object.entries(assetMetrics.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <BarItem key={status} label={status} value={count} max={assetMetrics.total} />
              ))}
          </div>
        </div>

        {/* Activos por Tipo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activos por Tipo</h3>
          <div className="space-y-3">
            {Object.entries(assetMetrics.byType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([type, count]) => (
                <BarItem key={type} label={type} value={count} max={assetMetrics.total} color="green" />
              ))}
          </div>
        </div>

        {/* Reportes HSE por Prioridad */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reportes HSE por Prioridad</h3>
          <div className="space-y-3">
            <BarItem label="Alta" value={hseMetrics.byPriority.ALTA} max={hseMetrics.total} color="red" />
            <BarItem label="Media" value={hseMetrics.byPriority.MEDIA} max={hseMetrics.total} color="yellow" />
            <BarItem label="Baja" value={hseMetrics.byPriority.BAJA} max={hseMetrics.total} color="green" />
          </div>
        </div>

        {/* Mantenimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mantenimientos Realizados</h3>
          <div className="space-y-3">
            <BarItem label="Preventivos" value={mtoMetrics.preventive} max={mtoMetrics.total} color="blue" />
            <BarItem label="Correctivos" value={mtoMetrics.corrective} max={mtoMetrics.total} color="orange" />
          </div>
        </div>
      </div>

      {/* Estado de Compras */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Órdenes de Compra</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatBox label="Total" value={purchaseMetrics.total} color="gray" />
          <StatBox label="Completadas" value={purchaseMetrics.completed} color="green" />
          <StatBox label="Pendientes" value={purchaseMetrics.pending} color="yellow" />
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta de métrica
function MetricCard({ icon, title, value, subtitle, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className={`${colors[color]} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// Componente de barra
function BarItem({ label, value, max, color = 'blue' }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-600">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${colors[color]} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Componente de caja de estadística
function StatBox({ label, value, color }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-900',
    green: 'bg-green-100 text-green-900',
    yellow: 'bg-yellow-100 text-yellow-900',
  };

  return (
    <div className={`${colors[color]} rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm mt-1">{label}</div>
    </div>
  );
}