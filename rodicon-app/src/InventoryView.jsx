import React from 'react';
import { Search, ChevronRight, MapPin } from 'lucide-react';
import { StatusBadge } from './StatusBadge'; // No changes needed here, looks correct.
import { DashboardCard } from './DashboardCard'; // No changes needed here, looks correct.

export const InventoryView = ({ kpis, filter, setFilter, search, setSearch, filteredAssets, onAssetSelect, locations = [], locationFilter, setLocationFilter }) => {
  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
      <header className="bg-white border-b min-h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0 gap-4 flex-wrap py-2">
        <div className="flex items-center">
          <img src="/logo.png" alt="Logo" className="h-10 lg:h-14 object-contain" />
        </div>
        <div className="flex flex-1 max-w-2xl gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ficha, tipo, marca, modelo, chasis..."
              className="pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:bg-white border border-transparent focus:border-blue-300 outline-none w-full transition"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 border border-transparent focus-within:border-blue-300 transition">
            <MapPin className="w-4 h-4 text-blue-500" />
            <select
              className="bg-transparent text-sm outline-none min-w-[180px]"
              value={locationFilter || ''}
              onChange={(e) => setLocationFilter?.(e.target.value)}
            >
              <option value="">Todas las ubicaciones</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        {/* Tarjetas Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <DashboardCard title="Total Activos" value={kpis.total} icon="🚙" color="blue" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
          <DashboardCard title="No Operativos" value={kpis.noOp} icon="⚠️" color="red" active={filter === 'NO_OP'} onClick={() => setFilter('NO_OP')} />
          <DashboardCard title="Seguro (≤ 30 Días)" value={kpis.warn} icon="📅" color="yellow" active={filter === 'WARN'} onClick={() => setFilter('WARN')} />
          <DashboardCard title="Seguros Vencidos" value={kpis.exp} icon="🚨" color="red" active={filter === 'EXP'} onClick={() => setFilter('EXP')} />
        </div>

        {/* Tabla Inventario - Desktop */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ficha</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map(a => (
                <tr key={a.id} onClick={() => onAssetSelect(a)} className="hover:bg-blue-50 cursor-pointer transition">
                  <td className="px-6 py-4 font-bold text-blue-900">{a.ficha}</td>
                  <td className="px-6 py-4"><div className="font-bold text-gray-700">{a.marca} {a.modelo}</div><div className="text-xs text-gray-400 font-mono">{a.chasis || '-'}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{a.ubicacion_actual}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={a.status} /></td>
                  <td className="px-6 py-4 text-right text-gray-400"><ChevronRight className="w-5 h-5" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lista Móvil */}
        <div className="lg:hidden space-y-3">
          {filteredAssets.map(a => (
            <div 
              key={a.id} 
              onClick={() => onAssetSelect(a)} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 active:bg-blue-50"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-blue-900 text-lg">#{a.ficha}</div>
                <StatusBadge status={a.status} />
              </div>
              <div className="font-bold text-gray-700 mb-1">{a.marca} {a.modelo}</div>
              <div className="text-xs text-gray-400 font-mono mb-2">{a.chasis || '-'}</div>
              <div className="text-sm text-gray-600 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {a.ubicacion_actual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};