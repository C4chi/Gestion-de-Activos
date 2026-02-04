import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const CorrectiveLogModal = ({ asset, onClose, onSubmit }) => {
  // Función para obtener la fecha local en formato YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  };

  const [form, setForm] = useState({
    mecanico: '',
    fecha_entrada: getLocalDate(), // Default to local today
    observacion_mecanica: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInternalSubmit = async () => {
    if (!form.observacion_mecanica || !form.mecanico) {
      toast.error("Por favor, completa el mecánico y la descripción de la falla.");
      return;
    }
    await onSubmit(form);
    toast.success("Falla reportada. El activo ahora está 'No Disponible'.");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Reportar Falla: {asset?.ficha}</h3>
        <div className="space-y-3">
          <input name="mecanico" value={form.mecanico} onChange={handleChange} placeholder="Mecánico que reporta" className="w-full border p-2 rounded text-sm" />
          <input name="fecha_entrada" type="date" value={form.fecha_entrada} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-gray-50" />
          <textarea name="observacion_mecanica" value={form.observacion_mecanica} onChange={handleChange} placeholder="Describe la falla o el motivo por el cual el equipo no está disponible..." className="w-full border p-2 rounded text-sm h-28" />
          <button onClick={handleInternalSubmit} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 shadow-md">Confirmar y Poner No Disponible</button>
          <button onClick={onClose} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
};