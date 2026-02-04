import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const CloseOrderModal = ({ asset, onClose, onSubmit }) => {
  const [form, setForm] = useState({ 
    mecanico: asset.taller_responsable || '', // Pre-llenar con el mecánico actual
    descripcion: '', 
    costo: '', 
    km: '', 
    proyeccion_km: '' 
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInternalSubmit = async () => {
    await onSubmit(form);
    toast.success("Orden Cerrada. Vehículo Disponible.");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Cerrar Orden Taller: {asset?.ficha}</h3>
        <div className="space-y-3">
          <input name="mecanico" value={form.mecanico} placeholder="Mecánico que finaliza" className="w-full border p-2 rounded text-sm" onChange={handleChange} />
          <textarea name="descripcion" value={form.descripcion} placeholder="Resumen del trabajo final realizado..." className="w-full border p-2 rounded text-sm" onChange={handleChange} />
          <input name="km" type="number" placeholder="Kilometraje / Horómetro Actual" className="w-full border p-2 rounded text-sm" onChange={handleChange} />
          <input name="proyeccion_km" type="number" placeholder="Próximo Mantenimiento (Km/H)" className="w-full border p-2 rounded text-sm" onChange={handleChange} />
          <button onClick={handleInternalSubmit} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-md">Finalizar</button>
          <button onClick={onClose} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
};