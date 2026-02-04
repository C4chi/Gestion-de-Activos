import React, { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * CommentModal
 * Modal para capturar comentarios en transiciones PARCIAL
 * Ejemplo: "Llegó filtro de aire, frenos llegarán el 15/12"
 */
export const CommentModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Agregar Comentario',
  placeholder = 'Describe qué llegó y qué falta...',
}) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Por favor escribe un comentario');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm?.(comment);
      setComment('');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
          autoFocus
        />

        <div className="text-xs text-gray-400 mt-2">
          💡 Tip: Presiona Ctrl+Enter para enviar
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
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
            {isSubmitting ? '⏳ Enviando...' : '✅ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
