import React from 'react';

export const MtoDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-scaleIn">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Detalle de Mantenimiento</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✖</button>
        </div>
        <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg border">
          <p><strong>Tipo:</strong> <span className={`font-bold ${log.tipo === 'CORRECTIVO' ? 'text-red-600' : 'text-purple-600'}`}>{log.tipo}</span></p>
          <p><strong>Fecha:</strong> {new Date(log.fecha).toLocaleDateString()}</p>
          <p><strong>Mecánico/Proveedor:</strong> {log.mecanico || 'N/A'}</p>
          <p><strong>Usuario que registra:</strong> {log.created_by ?? 'N/A'}</p>
          <hr/>
          <p><strong>Descripción del Trabajo:</strong></p>
          <p className="italic bg-white p-2 rounded border">{log.descripcion || 'Sin descripción.'}</p>
          <hr/>
          <p><strong>Kilometraje/Horómetro:</strong> {log.km_recorrido ?? 'No registrado'}</p>
          <p><strong>Próximo Mantenimiento:</strong> {log.proyeccion_proxima_km ? `${log.proyeccion_proxima_km} km` : 'No registrado'}</p>
        </div>
        <button onClick={onClose} className="w-full mt-4 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Cerrar</button>
      </div>
    </div>
  );
};