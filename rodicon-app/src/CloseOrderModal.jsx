import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, X, Image } from 'lucide-react';
import { supabase } from './supabaseClient';

export const CloseOrderModal = ({ asset, onClose, onSubmit }) => {
  const [form, setForm] = useState({ 
    mecanico: asset.taller_responsable || '', // Pre-llenar con el mecánico actual
    descripcion: '', 
    costo: '', 
    km: '', 
    proyeccion_km: '' 
  });
  const [evidencias, setEvidencias] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const urlsSubidas = [];

    try {
      for (const file of files) {
        // Validar tipo (imagen o video)
        const esImagen = file.type.startsWith('image/');
        const esVideo = file.type.startsWith('video/');
        
        if (!esImagen && !esVideo) {
          toast.error(`${file.name}: Solo se permiten imágenes o videos`);
          continue;
        }

        // Validar tamaño (10MB para imágenes, 50MB para videos)
        const maxSize = esVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`${file.name}: Archivo muy grande (máx ${esVideo ? '50MB' : '10MB'})`);
          continue;
        }

        // Subir a Supabase Storage
        const extension = file.name.split('.').pop();
        const fileName = `workshop-evidence/${asset.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        
        const { error: uploadError } = await supabase.storage
          .from('asset-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('asset-photos')
          .getPublicUrl(fileName);

        urlsSubidas.push({ url: publicUrl, tipo: esVideo ? 'video' : 'image', nombre: file.name });
      }

      setEvidencias([...evidencias, ...urlsSubidas]);
      toast.success(`${urlsSubidas.length} archivo(s) subido(s)`);
    } catch (error) {
      console.error('Error subiendo evidencia:', error);
      toast.error('Error al subir archivos');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveEvidencia = (index) => {
    setEvidencias(evidencias.filter((_, i) => i !== index));
  };

  const handleInternalSubmit = async () => {
    await onSubmit({ ...form, evidencias });
    toast.success("Orden Cerrada. Vehículo Disponible.");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Cerrar Orden Taller: {asset?.ficha}</h3>
        <div className="space-y-3">
          <input name="mecanico" value={form.mecanico} placeholder="Mecánico que finaliza" className="w-full border p-2 rounded text-sm" onChange={handleChange} />
          <textarea name="descripcion" value={form.descripcion} placeholder="Resumen del trabajo final realizado..." className="w-full border p-2 rounded text-sm" rows="3" onChange={handleChange} />
          <input name="km" type="number" placeholder="Kilometraje / Horómetro Actual" className="w-full border p-2 rounded text-sm" onChange={handleChange} />
          <input name="proyeccion_km" type="number" placeholder="Próximo Mantenimiento (Km/H)" className="w-full border p-2 rounded text-sm" onChange={handleChange} />
          
          {/* Sección de Evidencias */}
          <div className="border-t pt-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📸 Evidencia Fotográfica / Video (opcional)
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="evidencia-upload"
              disabled={uploading}
            />
            <label
              htmlFor="evidencia-upload"
              className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg p-3 cursor-pointer transition ${
                uploading ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-blue-50 hover:border-blue-400'
              }`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload size={18} className="text-blue-600" />
                  <span className="text-sm text-gray-600">Subir fotos o videos</span>
                </>
              )}
            </label>
            
            {/* Lista de evidencias subidas */}
            {evidencias.length > 0 && (
              <div className="mt-3 space-y-2">
                {evidencias.map((ev, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {ev.tipo === 'video' ? (
                        <span className="text-lg">🎥</span>
                      ) : (
                        <Image size={16} className="text-blue-600" />
                      )}
                      <span className="text-xs text-gray-700 truncate max-w-[180px]">{ev.nombre}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveEvidencia(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleInternalSubmit} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-md">Finalizar</button>
          <button onClick={onClose} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
};