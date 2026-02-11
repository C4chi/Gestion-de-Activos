import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

/**
 * Modal: Estado Operacional del Activo
 * Se muestra al crear una requisición de repuesto
 * Pregunta si el activo puede seguir operando o está detenido
 */
export const OperationalStatusModal = ({ isOpen, onClose, onConfirm, assetInfo }) => {
  const [selectedStatus, setSelectedStatus] = useState('DISPONIBLE_ESPERA');
  const [notas, setNotas] = useState('');

  const handleConfirm = () => {
    onConfirm({
      estado_operacional: selectedStatus,
      requiere_urgencia: selectedStatus === 'NO_DISPONIBLE_ESPERA',
      prioridad: selectedStatus === 'NO_DISPONIBLE_ESPERA' ? 'Urgente' : 'Media',
      notas_operacionales: notas,
      fecha_detencion: selectedStatus === 'NO_DISPONIBLE_ESPERA' ? new Date().toISOString() : null
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">⚠️ Impacto Operacional</h2>
              <p className="text-sm text-orange-100">
                Define el estado actual del activo
              </p>
            </div>
          </div>
        </div>

        {/* Body - Con scroll */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Información del Activo */}
          {assetInfo && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Ficha:</span>
                  <span className="font-semibold ml-2">{assetInfo.ficha}</span>
                </div>
                <div>
                  <span className="text-gray-600">Nombre:</span>
                  <span className="font-semibold ml-2">{assetInfo.nombre || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Marca/Modelo:</span>
                  <span className="font-semibold ml-2">
                    {assetInfo.marca} {assetInfo.modelo}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Ubicación:</span>
                  <span className="font-semibold ml-2">{assetInfo.ubicacion_actual || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pregunta Principal */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              ¿El activo puede seguir operando mientras llegan los repuestos?
            </h3>

            <div className="space-y-4">
              {/* Opción 1: DISPONIBLE - ESPERA REPUESTO */}
              <div
                onClick={() => setSelectedStatus('DISPONIBLE_ESPERA')}
                className={`
                  relative cursor-pointer rounded-xl border-2 p-5 transition-all
                  ${selectedStatus === 'DISPONIBLE_ESPERA'
                    ? 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200'
                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${selectedStatus === 'DISPONIBLE_ESPERA'
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 bg-white'
                    }
                  `}>
                    {selectedStatus === 'DISPONIBLE_ESPERA' && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-gray-900">
                        SÍ - DISPONIBLE EN ESPERA DE REPUESTO
                      </h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        ✓ El activo <strong>puede seguir trabajando</strong>
                      </p>
                      <p className="text-gray-700">
                        ✓ Prioridad: <span className="font-semibold text-yellow-700">MEDIA/NORMAL</span>
                      </p>
                      <p className="text-gray-700">
                        ✓ Tipo: Reparación preventiva, mejora, o respaldo
                      </p>
                      <p className="text-gray-600 italic text-xs mt-2">
                        Ejemplo: Fuga menor de aceite, llanta de repuesto, mejora de cabina, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opción 2: NO DISPONIBLE - ESPERA REPUESTO */}
              <div
                onClick={() => setSelectedStatus('NO_DISPONIBLE_ESPERA')}
                className={`
                  relative cursor-pointer rounded-xl border-2 p-5 transition-all
                  ${selectedStatus === 'NO_DISPONIBLE_ESPERA'
                    ? 'border-red-500 bg-red-50 shadow-lg ring-2 ring-red-200'
                    : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${selectedStatus === 'NO_DISPONIBLE_ESPERA'
                      ? 'border-red-500 bg-red-500'
                      : 'border-gray-300 bg-white'
                    }
                  `}>
                    {selectedStatus === 'NO_DISPONIBLE_ESPERA' && (
                      <XCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <h4 className="font-bold text-gray-900">
                        NO - NO DISPONIBLE EN ESPERA DE REPUESTO
                      </h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        ✗ El activo está <strong className="text-red-700">DETENIDO</strong> - No puede operar
                      </p>
                      <p className="text-gray-700">
                        ✗ Prioridad: <span className="font-semibold text-red-700">ALTA/URGENTE</span> (automática)
                      </p>
                      <p className="text-gray-700">
                        ✗ Tipo: Reparación crítica, falla operacional
                      </p>
                      <div className="bg-red-100 border border-red-300 rounded p-2 mt-2">
                        <p className="text-red-800 font-semibold text-xs flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Se notificará inmediatamente a Gerencia y Compras
                        </p>
                      </div>
                      <p className="text-gray-600 italic text-xs mt-2">
                        Ejemplo: Motor dañado, transmisión rota, sistema hidráulico sin presión, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notas Adicionales */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 Notas adicionales sobre la condición del activo (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Motor hace ruido extraño desde hace 2 días, se recalienta al usar más de 4 horas continuas..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              rows={3}
            />
          </div>

          {/* Resumen */}
          <div className={`
            rounded-lg p-4 border-2
            ${selectedStatus === 'NO_DISPONIBLE_ESPERA'
              ? 'bg-red-50 border-red-300'
              : 'bg-green-50 border-green-300'
            }
          `}>
            <h4 className="font-bold text-sm mb-2 text-gray-800">📋 Resumen de la Solicitud:</h4>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700">
                <strong>Estado:</strong>{' '}
                {selectedStatus === 'NO_DISPONIBLE_ESPERA'
                  ? '🔴 NO DISPONIBLE - ESPERA REPUESTO'
                  : '🟢 DISPONIBLE - ESPERA REPUESTO'
                }
              </p>
              <p className="text-gray-700">
                <strong>Prioridad:</strong>{' '}
                {selectedStatus === 'NO_DISPONIBLE_ESPERA' ? 'URGENTE 🚨' : 'MEDIA'}
              </p>
              <p className="text-gray-700">
                <strong>Notificación:</strong>{' '}
                {selectedStatus === 'NO_DISPONIBLE_ESPERA'
                  ? 'Inmediata a Gerencia + Compras'
                  : 'Flujo normal'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Fijo en la parte inferior */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            ❌ Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`
              px-6 py-2 rounded-lg font-bold transition shadow-lg
              ${selectedStatus === 'NO_DISPONIBLE_ESPERA'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
              }
            `}
          >
            ✅ Confirmar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationalStatusModal;
