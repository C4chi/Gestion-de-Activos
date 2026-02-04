import React from 'react';
import { Image, Video } from 'lucide-react';

export const MtoDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  // Parsear evidencias si existen
  let evidencias = [];
  if (log.evidencias) {
    try {
      evidencias = typeof log.evidencias === 'string' 
        ? JSON.parse(log.evidencias) 
        : log.evidencias;
    } catch (e) {
      console.error('Error parsing evidencias:', e);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
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
          
          {/* Mostrar evidencias si existen */}
          {evidencias.length > 0 && (
            <>
              <hr/>
              <div>
                <p className="font-bold mb-2">📸 Evidencias ({evidencias.length}):</p>
                <div className="grid grid-cols-2 gap-2">
                  {evidencias.map((ev, idx) => (
                    <a
                      key={idx}
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group border rounded-lg overflow-hidden hover:border-blue-400 transition"
                    >
                      {ev.tipo === 'video' ? (
                        <div className="aspect-video bg-gray-900 flex items-center justify-center">
                          <Video className="w-8 h-8 text-white" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <span className="text-white text-xs font-bold">▶ Ver video</span>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video relative">
                          <img 
                            src={ev.url} 
                            alt={ev.nombre || 'Evidencia'} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Image className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-4 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Cerrar</button>
      </div>
    </div>
  );
};