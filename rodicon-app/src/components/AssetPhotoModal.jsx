import React, { useState, useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

/**
 * Modal para subir foto a un activo
 * Solo visible para admins
 */
export const AssetPhotoModal = ({ asset, onClose, onPhotoUploaded, isAdmin }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(asset?.foto_url || null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede ser mayor a 5MB');
      return;
    }

    try {
      setUploading(true);

      // Crear preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Subir a Supabase Storage
      const fileName = `assets/${asset.id}-${Date.now()}.${file.type.split('/')[1]}`;
      
      const { data, error: uploadError } = await supabase.storage
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

      // Actualizar registro en BD
      const { error: updateError } = await supabase
        .from('assets')
        .update({ foto_url: publicUrl })
        .eq('id', asset.id);

      if (updateError) throw updateError;

      toast.success('Foto subida exitosamente');
      onPhotoUploaded?.(publicUrl);
      onClose();

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!asset.foto_url) return;

    try {
      setUploading(true);

      // Actualizar BD para remover URL
      const { error } = await supabase
        .from('assets')
        .update({ foto_url: null })
        .eq('id', asset.id);

      if (error) throw error;

      setPreview(null);
      toast.success('Foto eliminada');
      onPhotoUploaded?.(null);

    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Error al eliminar la foto');
    } finally {
      setUploading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">📸 Foto del Activo</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="mb-4 bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 aspect-video flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <Camera className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Sin foto</p>
            </div>
          )}
        </div>

        {/* Ficha Info */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Activo: <span className="font-bold text-blue-900">{asset.ficha}</span></p>
          <p className="text-sm text-gray-600">{asset.marca} {asset.modelo} ({asset.año})</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Subiendo...' : 'Seleccionar'}
          </button>

          {preview && (
            <button
              onClick={handleRemovePhoto}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              <X className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};
