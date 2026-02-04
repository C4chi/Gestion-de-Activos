import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const UpdateWorkshopModal = ({ asset, onClose, onSubmit }) => {
  // Parsear el historial de comentarios para el estado inicial
  const parseComments = (commentsString) => {
    if (!commentsString) return [];
    return commentsString.split('\n').filter(line => line.trim() !== '');
  };

  const [form, setForm] = useState({
    taller_responsable: asset.taller_responsable || '',
    proyeccion_salida: asset.proyeccion_salida || '',
    new_comment: ''
  });

  const commentHistory = parseComments(asset.observacion_mecanica);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInternalSubmit = async () => {
    await onSubmit(form);
    toast.success("Información de taller actualizada.");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Actualizar Estado en Taller: {asset?.ficha}</h3>
        <div className="space-y-3">
          <input name="taller_responsable" value={form.taller_responsable} onChange={handleChange} placeholder="Mecánico Responsable" className="w-full border p-2 rounded text-sm" />
          <input name="proyeccion_salida" type="date" value={form.proyeccion_salida} onChange={handleChange} placeholder="Proyección de Salida" className="w-full border p-2 rounded text-sm bg-gray-50" />
          
          {/* Historial de Observaciones Interactivo */}
          {commentHistory.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 max-h-40 overflow-y-auto text-sm">
              <p className="font-bold text-gray-700 mb-2">Historial de Observaciones:</p>
              {commentHistory.map((comment, index) => (
                <p key={index} className="text-gray-600 mb-1">{comment}</p>
              ))}
            </div>
          )}
          <textarea name="new_comment" value={form.new_comment} onChange={handleChange} placeholder="Añadir nuevo comentario o actualización..." className="w-full border p-2 rounded text-sm h-24" />
          <button onClick={handleInternalSubmit} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md">Guardar Actualización</button>
          <button onClick={onClose} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
};