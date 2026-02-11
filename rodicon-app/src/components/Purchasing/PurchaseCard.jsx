import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../../StatusBadge';

/**
 * PurchaseCard
 * Tarjeta que muestra información de una orden de compra
 * Incluye estado, items, fechas y botones de acción
 */
export const PurchaseCard = ({
  purchaseOrder,
  onViewDetails,
  onUpdateStatus,
  onDelete,
  isLoading = false,
  canManage = true,
}) => {
  const { 
    id, 
    ficha, 
    estado, 
    fecha_solicitud, 
    fecha_ordenado,
    fecha_estimada_llegada,
    purchase_items = [] 
  } = purchaseOrder;

  const statusConfig = {
    PENDIENTE: { bg: 'bg-yellow-50', badge: 'PENDIENTE', color: 'bg-yellow-500' },
    EN_COTIZACION: { bg: 'bg-purple-50', badge: 'EN COTIZACIÓN', color: 'bg-purple-500' },
    PENDIENTE_APROBACION: { bg: 'bg-amber-50', badge: 'PENDIENTE APROBACIÓN', color: 'bg-amber-500' },
    APROBADO: { bg: 'bg-teal-50', badge: 'APROBADO', color: 'bg-teal-500' },
    ORDENADO: { bg: 'bg-blue-50', badge: 'ORDENADO', color: 'bg-blue-500' },
    PARCIAL: { bg: 'bg-orange-50', badge: 'PARCIAL', color: 'bg-orange-500' },
    RECIBIDO: { bg: 'bg-green-50', badge: 'RECIBIDO ✓', color: 'bg-green-500' },
  };

  const config = statusConfig[estado] || statusConfig.PENDIENTE;

  // Calcular días de espera
  const calcularDiasEspera = () => {
    if (estado === 'RECIBIDO') return null;
    
    const fechaBase = fecha_ordenado || fecha_solicitud;
    if (!fechaBase) return null;
    
    const diasTranscurridos = Math.floor(
      (new Date() - new Date(fechaBase)) / (1000 * 60 * 60 * 24)
    );
    return diasTranscurridos;
  };

  const diasEspera = calcularDiasEspera();

  // Generar alertas
  const getAlerta = () => {
    if (estado === 'PENDIENTE' && diasEspera > 7) {
      return { tipo: 'error', mensaje: `⚠️ Pendiente ${diasEspera} días` };
    }
    if (estado === 'ORDENADO') {
      if (fecha_estimada_llegada && new Date(fecha_estimada_llegada) < new Date()) {
        const diasVencido = Math.floor(
          (new Date() - new Date(fecha_estimada_llegada)) / (1000 * 60 * 60 * 24)
        );
        return { tipo: 'error', mensaje: `🔴 Vencida hace ${diasVencido} días` };
      }
      if (diasEspera > 15) {
        return { tipo: 'warning', mensaje: `⚠️ En orden ${diasEspera} días` };
      }
    }
    return null;
  };

  const alerta = getAlerta();

  const nextActions = {
    PENDIENTE: { action: 'COTIZAR', label: '💼 Cotizar (3+)', color: 'bg-purple-600 hover:bg-purple-700' },
    EN_COTIZACION: { action: null, label: 'En proceso...', color: 'bg-gray-400' },
    PENDIENTE_APROBACION: { action: 'APROBAR', label: '👔 Revisar y Aprobar', color: 'bg-amber-600 hover:bg-amber-700' },
    APROBADO: { action: 'ORDENAR', label: '📦 Ordenar', color: 'bg-teal-600 hover:bg-teal-700' },
    ORDENADO: { 
      action: 'RECIBIR',
      label: '✅ Recibir',
      color: 'bg-green-600 hover:bg-green-700'
    },
    PARCIAL: { action: 'RECIBIR', label: '✅ Recibir Pendientes', color: 'bg-orange-600 hover:bg-orange-700' },
    RECIBIDO: { action: null, label: 'Completado', color: 'bg-green-500' },
  };

  const nextAction = nextActions[estado];

  return (
    <div className={`${config.bg} border border-gray-200 rounded-lg p-4 mb-3 transition hover:shadow-md`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Ficha: {ficha || 'Sin ficha'}</h3>
          <p className="text-xs text-gray-500 mt-1">ID: {id}</p>
        </div>
        <StatusBadge status={estado} />
      </div>

      {/* Alerta */}
      {alerta && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm font-semibold ${
          alerta.tipo === 'error' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {alerta.mensaje}
        </div>
      )}

      {/* Días de espera */}
      {diasEspera !== null && estado !== 'RECIBIDO' && (
        <div className="mb-3 text-xs text-gray-600 flex items-center gap-1">
          ⏱️ <span className="font-medium">{diasEspera} días</span> 
          {fecha_ordenado ? ' desde orden' : ' desde solicitud'}
          {fecha_estimada_llegada && (
            <span className="ml-2 text-blue-600">
              • Estimada: {new Date(fecha_estimada_llegada).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Items Preview */}
      {purchase_items.length > 0 && (
        <div className="bg-white/60 rounded p-2 mb-3 text-sm">
          <div className="font-semibold text-gray-700 mb-1">Artículos:</div>
          <ul className="text-gray-600 text-xs space-y-1">
            {purchase_items.slice(0, 2).map((item, idx) => (
              <li key={idx}>
                • {item.descripcion || item.asset_id} (${item.precio_unitario?.toFixed(2) || '0.00'})
              </li>
            ))}
            {purchase_items.length > 2 && (
              <li className="text-gray-400 italic">+{purchase_items.length - 2} más...</li>
            )}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="mb-3 text-sm">
        <span className="text-gray-500">Fecha solicitud:</span>
        <p className="text-gray-700">{fecha_solicitud ? new Date(fecha_solicitud).toLocaleString() : 'N/A'}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails?.(purchaseOrder)}
          disabled={isLoading}
          className="flex-1 bg-blue-500 text-white py-2 rounded font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 transition"
        >
          👁️ Ver Detalles
        </button>

        {/* Mostrar botón según estado */}
        {nextAction?.action && (
          <button
            onClick={() => onUpdateStatus?.(purchaseOrder, nextAction.action)}
            disabled={isLoading || !canManage}
            className={`flex-1 text-white py-2 rounded font-semibold text-sm disabled:opacity-50 transition ${nextAction.color || 'bg-green-600 hover:bg-green-700'}`}
          >
            {nextAction.label}
          </button>
        )}

        {/* Botón de eliminar solo para completados */}
        {estado === 'RECIBIDO' && (
          <button
            onClick={() => onDelete?.(purchaseOrder)}
            disabled={isLoading}
            className="bg-red-500 text-white px-3 py-2 rounded font-semibold text-sm hover:bg-red-600 disabled:opacity-50 transition"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};
