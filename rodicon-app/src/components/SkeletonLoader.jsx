/**
 * SkeletonLoader.jsx
 * Componentes reutilizables para mostrar loading states profesionales
 */

export const AssetTableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3"><div className="h-4 bg-gray-300 rounded w-16" /></th>
            <th className="px-6 py-3"><div className="h-4 bg-gray-300 rounded w-32" /></th>
            <th className="px-6 py-3"><div className="h-4 bg-gray-300 rounded w-24" /></th>
            <th className="px-6 py-3"><div className="h-4 bg-gray-300 rounded w-20" /></th>
            <th className="px-6 py-3"><div className="h-4 bg-gray-300 rounded w-12" /></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-5" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const CardGridSkeleton = ({ columns = 2, rows = 4 }) => {
  return (
    <div className={`grid grid-cols-${columns} gap-4`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-xl shadow-sm border animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-32 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded flex-1" />
            <div className="h-8 bg-gray-200 rounded flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DetailSidebarSkeleton = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-48 mb-4" />
      <div className="space-y-3 mb-6">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
      <div className="border-t pt-4">
        <div className="h-6 bg-gray-300 rounded w-32 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
};

export const DashboardCardSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="h-4 bg-gray-300 rounded w-32" />
            <div className="text-2xl">📊</div>
          </div>
          <div className="h-8 bg-gray-300 rounded w-16 mt-2" />
        </div>
      ))}
    </div>
  );
};
