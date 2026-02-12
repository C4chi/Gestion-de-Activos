import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const PreventiveMtoModal = ({ asset, onClose, onSubmit }) => {
  const defaultTipoMedicion = asset?.tipo_medicion || 'KILOMETRAJE';
  const [form, setForm] = useState({ 
    mecanico: '', 
    descripcion: '', 
    costo: 0, 
    km: '', 
    proyeccion_km: '',
    tipo_medicion: defaultTipoMedicion
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInternalSubmit = async () => {
    // Creamos un objeto log compatible con la función de cierre de orden, pero con tipo PREVENTIVO
    const preventiveLog = { 
      ...form, 
      tipo: 'PREVENTIVO', 
      fecha: new Date(),
      tipo_medicion: form.tipo_medicion
    };
    await onSubmit(preventiveLog);
    toast.success("Mantenimiento Preventivo Registrado.");
    onClose();
  };

  const isHorometro = form.tipo_medicion === 'HOROMETRO';
  const medicionLabel = isHorometro ? 'Horas' : 'Km';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Mantenimiento Preventivo: {asset?.ficha}</h3>
        <div className="space-y-3">
          {/* Selector de tipo de medición */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de Medición</label>
            <select 
              name="tipo_medicion" 
              value={form.tipo_medicion} 
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="KILOMETRAJE">🚗 Kilometraje (Vehículos)</option>
              <option value="HOROMETRO">⚙️ Horómetro (Equipos)</option>
            </select>
          </div>

          <input 
            name="mecanico" 
            value={form.mecanico} 
            placeholder="Mecánico/Proveedor" 
            className="w-full border p-2 rounded text-sm" 
            onChange={handleChange} 
          />
          
          <textarea 
            name="descripcion" 
            value={form.descripcion} 
            placeholder="Trabajo preventivo realizado..." 
            className="w-full border p-2 rounded text-sm h-20" 
            onChange={handleChange} 
          />

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              {isHorometro ? 'Horómetro Actual (Horas)' : 'Kilometraje Actual (Km)'}
            </label>
            <input 
              name="km" 
              type="number" 
              step={isHorometro ? "0.1" : "1"}
              placeholder={isHorometro ? "Ej: 1250.5" : "Ej: 45000"}
              className="w-full border p-2 rounded text-sm" 
              onChange={handleChange} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              Próximo Mantenimiento ({medicionLabel})
            </label>
            <input 
              name="proyeccion_km" 
              type="number" 
              step={isHorometro ? "0.1" : "1"}
              placeholder={isHorometro ? "Ej: 1500.0" : "Ej: 55000"}
              className="w-full border p-2 rounded text-sm" 
              onChange={handleChange} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Costo (Opcional)</label>
            <input 
              name="costo" 
              type="number" 
              step="0.01"
              placeholder="Costo del mantenimiento" 
              className="w-full border p-2 rounded text-sm" 
              onChange={handleChange} 
            />
          </div>

          <button 
            onClick={handleInternalSubmit} 
            className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 shadow-md transition"
          >
            Registrar Mantenimiento
          </button>
          <button 
            onClick={onClose} 
            className="w-full text-gray-500 py-2 text-sm hover:bg-gray-100 rounded transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};