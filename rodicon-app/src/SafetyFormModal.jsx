import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const SafetyFormModal = ({ asset, onClose, onSubmit }) => {
  const [form, setForm] = useState({ tipo: 'INCIDENTE', prioridad: 'Media', desc: '', asignado: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInternalSubmit = async () => {
    await onSubmit(form);
    toast.success("Reporte de Seguridad Enviado.");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo Reporte HSE: {asset?.ficha}</h3>
        <div className="space-y-3">
          <select name="tipo" value={form.tipo} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-gray-50"><option>INCIDENTE</option><option>CONDICION INSEGURA</option><option>OBSERVACION</option></select>
          <select name="prioridad" value={form.prioridad} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-gray-50"><option>Baja</option><option>Media</option><option>Alta</option></select>
          <textarea name="desc" placeholder="Descripción detallada del evento..." className="w-full border p-2 rounded text-sm" value={form.desc} onChange={handleChange} />
          <input name="asignado" placeholder="Asignado a (Opcional)" className="w-full border p-2 rounded text-sm" value={form.asignado} onChange={handleChange} />
          <button onClick={handleInternalSubmit} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 shadow-md">Enviar Reporte</button>
          <button onClick={onClose} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
};