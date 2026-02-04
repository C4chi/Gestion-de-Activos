import React, { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * UpdateWorkStatusModal
 * Modal para actualizar estado de orden de mantenimiento
 * Captura observaciones, tiempo estimado, costo estimado
 */
export const UpdateWorkStatusModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  title = 'Actualizar Estado de Orden',
}) => {
  const [observaciones, setObservaciones] = useState('');
  const [tiempoEstimado, setTiempoEstimado] = useState('');
  const [costoEstimado, setCostoEstimado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getModalContent = () => {
    switch (currentStatus) {
      case 'PENDIENTE':
        return {
          title: '📥 Recibir en Taller',
          fields: ['observaciones'],
          placeholder: 'Ej: Activo recibido en buen estado, sin daños aparentes',
        };
      case 'RECIBIDO':
        return {
          title: '🔧 Iniciar Reparación',
          fields: ['observaciones', 'tiempoEstimado'],
          placeholder: 'Ej: Se debe cambiar aceite y filtros, revisar....',
        };
      case 'EN_REPARACION':
        return {
          title: '✓ Completar Reparación',
          fields: ['observaciones', 'costoEstimado'],
          placeholder: 'Ej: Reparación completada. Se reemplazó...',
        };
      default:
        return {
          title: 'Actualizar Estado',
          fields: ['observaciones'],
          placeholder: 'Agregar notas...',
        };
    }
  };

  const content = getModalContent();

  const handleSubmit = async () => {
    if (!observaciones.trim()) {
      toast.error('Por favor agrega observaciones');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = { observaciones };
      if (tiempoEstimado) updateData.tiempo_estimado = tiempoEstimado;
      if (costoEstimado) updateData.costo_estimado = parseFloat(costoEstimado);

      await onConfirm?.(updateData);
      resetForm();
    } catch (err) {
      toast.error(err.message || 'Error al procesar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const resetForm = () => {
    setObservaciones('');
    setTiempoEstimado('');
    setCostoEstimado('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{content.title}</h2>

        {/* Observaciones */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📝 Observaciones
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={content.placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Tiempo Estimado (si aplica) */}
        {content.fields.includes('tiempoEstimado') && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ⏱️ Tiempo Estimado (horas)
            </label>
            <input
              type="number"
              value={tiempoEstimado}
              onChange={(e) => setTiempoEstimado(e.target.value)}
              placeholder="Ej: 2.5"
              min="0"
              step="0.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Costo Estimado (si aplica) */}
        {content.fields.includes('costoEstimado') && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              💰 Costo Estimado ($)
            </label>
            <input
              type="number"
              value={costoEstimado}
              onChange={(e) => setCostoEstimado(e.target.value)}
              placeholder="Ej: 150.00"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="text-xs text-gray-400 mb-4">
          💡 Tip: Presiona Ctrl+Enter para enviar
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onClose?.();
              resetForm();
            }}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-400 disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? '⏳ Procesando...' : '✅ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
