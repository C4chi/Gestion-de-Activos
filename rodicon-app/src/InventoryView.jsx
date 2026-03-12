import React from 'react';
import { Search, ChevronRight, MapPin } from 'lucide-react';
import { StatusBadge } from './StatusBadge'; // No changes needed here, looks correct.
import { DashboardCard } from './DashboardCard'; // No changes needed here, looks correct.

export const InventoryView = ({
  userName,
  kpis,
  filter,
  setFilter,
  search,
  setSearch,
  filteredAssets,
  onAssetSelect,
  locations = [],
  locationFilter,
  setLocationFilter,
  isAdminGlobal = false,
  gpsOptions = [],
  gpsFilter,
  setGpsFilter,
  notificationCenter,
}) => {
  const totalAssets = Number(kpis?.total || 0);
  const noOpPercent = totalAssets > 0 ? Math.round((Number(kpis?.noOp || 0) / totalAssets) * 100) : 0;
  const tallerPercent = totalAssets > 0 ? Math.round((Number(kpis?.enTaller || 0) / totalAssets) * 100) : 0;
  const repuestoPercent = totalAssets > 0 ? Math.round((Number(kpis?.esperaRepuesto || 0) / totalAssets) * 100) : 0;

  const activeFilters = [
    search ? { label: `Búsqueda: "${search}"`, onClear: () => setSearch('') } : null,
    locationFilter ? { label: `Ubicación: ${locationFilter}`, onClear: () => setLocationFilter?.('') } : null,
    isAdminGlobal && gpsFilter ? { label: `GPS: ${gpsFilter}`, onClear: () => setGpsFilter?.('') } : null,
    filter && filter !== 'ALL' ? { label: `Estado: ${filter.replaceAll('_', ' ')}`, onClear: () => setFilter('ALL') } : null,
  ].filter(Boolean);

  const clearAllFilters = () => {
    setSearch('');
    setLocationFilter?.('');
    setFilter('ALL');
    setGpsFilter?.('');
  };

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
          {isAdminGlobal && (
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 border border-transparent focus-within:border-blue-300 transition">
              <select
                className="bg-transparent text-sm outline-none min-w-[180px]"
                value={gpsFilter || ''}
                onChange={(e) => setGpsFilter?.(e.target.value)}
              >
                <option value="">Todos los GPS</option>
                {gpsOptions.map((gps) => (
                  <option key={gps} value={gps}>{gps}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {notificationCenter && (
          <div className="shrink-0 flex items-center">
            {notificationCenter}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-2xl font-bold text-gray-800">
            Bienvenido, {userName}
          </h2>
          <p className="text-sm text-gray-500">
            {filteredAssets.length} de {totalAssets} activos visibles
            {filter !== 'ALL' ? ` · filtro ${filter.replaceAll('_', ' ')}` : ''}
          </p>
        </div>

        {/* Tarjetas Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <DashboardCard
            title="Total Activos"
            value={kpis.total}
            icon="🚙"
            color="blue"
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
            subtitle="Base operativa"
            footnote="Clic para ver todos"
          />
          <DashboardCard
            title="No Operativos"
            value={kpis.noOp}
            icon="⚠️"
            color="red"
            active={filter === 'NO_OP'}
            onClick={() => setFilter('NO_OP')}
            subtitle={`${noOpPercent}% del total`}
            footnote="Incluye taller y repuesto"
          />
          <DashboardCard
            title="En Taller"
            value={kpis.enTaller}
            icon="🔧"
            color="yellow"
            active={filter === 'EN_TALLER'}
            onClick={() => setFilter('EN_TALLER')}
            subtitle={`${tallerPercent}% del total`}
            footnote="Mantenimiento activo"
          />
          <DashboardCard
            title="Espera de Repuesto"
            value={kpis.esperaRepuesto}
            icon="⏳"
            color="red"
            active={filter === 'ESPERA_REPUESTO'}
            onClick={() => setFilter('ESPERA_REPUESTO')}
            subtitle={`${repuestoPercent}% del total`}
            footnote="Pendiente por suministro"
          />
        </div>

        {/* Filtros activos */}
        <div className="mb-4 lg:mb-6 flex flex-wrap items-center gap-2">
          {activeFilters.length > 0 ? (
            <>
              {activeFilters.map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  onClick={item.onClear}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  title="Quitar filtro"
                >
                  {item.label} ×
                </button>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
              >
                Limpiar todo
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-500">Sin filtros activos</p>
          )}
        </div>

        {/* Tabla Inventario - Desktop */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ficha</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-gray-700">No hay activos para mostrar</p>
                    <p className="text-xs text-gray-500 mt-1">Revisa búsqueda o filtros activos</p>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-3 text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((a, index) => (
                  <tr key={a.id} onClick={() => onAssetSelect(a)} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50 cursor-pointer transition`}>
                    <td className="px-6 py-4 font-bold text-blue-900">{a.ficha}</td>
                    <td className="px-6 py-4"><div className="font-bold text-gray-700">{a.marca} {a.modelo}</div><div className="text-xs text-gray-400 font-mono">{a.chasis || '-'}</div></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.ubicacion_actual}</td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={a.status} /></td>
                    <td className="px-6 py-4 text-right text-gray-400"><ChevronRight className="w-5 h-5" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Lista Móvil */}
        <div className="lg:hidden space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
              <p className="text-sm font-semibold text-gray-700">No hay activos para mostrar</p>
              <p className="text-xs text-gray-500 mt-1">Revisa búsqueda o filtros activos</p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-3 text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            filteredAssets.map(a => (
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
            ))
          )}
        </div>
      </div>
    </main>
  );
};