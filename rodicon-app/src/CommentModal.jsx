import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const CommentModal = ({ onClose, onSubmit }) => {
  const [comment, setComment] = useState('');

  const handleInternalSubmit = () => {
    if (!comment.trim()) {
      toast.error("El comentario es obligatorio para una recepción parcial.");
      return;
    }
    onSubmit(comment);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recepción Parcial</h3>
        <p className="text-sm text-gray-600 mb-4">Por favor, especifica qué ítems se recibieron y cuáles quedan pendientes.</p>
        <div className="space-y-3">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ej: Se recibieron 2 de 4 filtros. Quedan pendientes las correas." className="w-full border p-2 rounded text-sm h-28" />
          <button onClick={handleInternalSubmit} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 shadow-md">Registrar Recepción Parcial</button>
          <button onClick={onClose} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
};