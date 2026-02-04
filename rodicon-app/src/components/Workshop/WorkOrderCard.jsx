import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../../StatusBadge';

/**
 * WorkOrderCard
 * Tarjeta que muestra información de una orden de mantenimiento
 * Estados: PENDIENTE → RECIBIDO → EN REPARACION → COMPLETADO
 */
export const WorkOrderCard = ({
  workOrder,
  onViewDetails,
  onUpdateStatus,
  isLoading = false,
}) => {
  const {
    id,
    estado,
    tipo_mantenimiento,
    prioridad,
    descripcion,
    fecha_creacion,
    usuario_asignado,
    assets,
  } = workOrder;

  const statusConfig = {
    PENDIENTE: { bg: 'bg-yellow-50', color: 'bg-yellow-500' },
    RECIBIDO: { bg: 'bg-blue-50', color: 'bg-blue-500' },
    EN_REPARACION: { bg: 'bg-purple-50', color: 'bg-purple-500' },
    COMPLETADO: { bg: 'bg-green-50', color: 'bg-green-500' },
  };

  const config = statusConfig[estado] || statusConfig.PENDIENTE;

  const nextActions = {
    PENDIENTE: { action: 'RECIBIDO', label: '📥 Recibir en Taller' },
    RECIBIDO: { action: 'EN_REPARACION', label: '🔧 Iniciar Reparación' },
    EN_REPARACION: { action: 'COMPLETADO', label: '✓ Completar' },
    COMPLETADO: { action: null, label: 'Finalizado' },
  };

  const nextAction = nextActions[estado];
  const formattedDate = fecha_creacion ? new Date(fecha_creacion).toLocaleDateString() : 'N/A';

  const priorityBadge = {
    Alta: '🔴',
    Normal: '🟡',
    Baja: '🟢',
  };

  const typeIcon = {
    PREVENTIVO: '📋',
    CORRECTIVO: '⚠️',
  };

  return (
    <div className={`${config.bg} border border-gray-200 rounded-lg p-4 mb-3 transition hover:shadow-md`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeIcon[tipo_mantenimiento] || '🔧'}</span>
            <h3 className="font-bold text-gray-800">{assets?.nombre || 'Sin Activo'}</h3>
            <span className="text-lg">{priorityBadge[prioridad] || '🟡'}</span>
          </div>
          <p className="text-xs text-gray-500">ID: {id}</p>
        </div>
        <StatusBadge status={estado} />
      </div>

      {/* Descripción */}
      {descripcion && (
        <div className="bg-white/60 rounded p-2 mb-3 text-sm border border-gray-100">
          <p className="text-gray-700 text-xs">{descripcion}</p>
        </div>
      )}

      {/* Info: Código y Ubicación del Activo */}
      {assets && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div>
            <span className="text-gray-500 font-semibold">Código:</span>
            <p className="text-gray-800">{assets.codigo || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500 font-semibold">Ubicación:</span>
            <p className="text-gray-800">{assets.ubicacion || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs border-t pt-2">
        <div>
          <span className="text-gray-500">Tipo:</span>
          <p className="text-gray-800 font-semibold">{tipo_mantenimiento}</p>
        </div>
        <div>
          <span className="text-gray-500">Fecha:</span>
          <p className="text-gray-800">{formattedDate}</p>
        </div>
        <div>
          <span className="text-gray-500">Asignado:</span>
          <p className="text-gray-800">{usuario_asignado || 'Sin asignar'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails?.(workOrder)}
          disabled={isLoading}
          className="flex-1 bg-blue-500 text-white py-2 rounded font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 transition"
        >
          👁️ Detalles
        </button>

        {nextAction.action && (
          <button
            onClick={() => onUpdateStatus?.(workOrder, nextAction.action)}
            disabled={isLoading}
            className="flex-1 bg-green-600 text-white py-2 rounded font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition"
          >
            {nextAction.label}
          </button>
        )}
      </div>
    </div>
  );
};
