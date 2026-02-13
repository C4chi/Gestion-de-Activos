import React, { useState } from 'react';
import { AlertCircle, Camera, MapPin, Send, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import toast from 'react-hot-toast';

/**
 * MaintenanceRequestForm
 * Formulario mobile-friendly para que operadores reporten problemas en equipos
 * Punto B del diagrama: ÁREAS → Detección problemática → Solicitud de trabajo
 */
export const MaintenanceRequestForm = ({ onClose, onSuccess }) => {
  const { user, assets } = useAppContext();
  
  const [formData, setFormData] = useState({
    asset_id: '',
    titulo: '',
    descripcion: '',
    categoria: 'MECANICO',
    prioridad: 'MEDIA',
    solicitante_area: 'PRODUCCION',
  });
  
  const [evidencias, setEvidencias] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const [gpsData, setGpsData] = useState(null);

  const categorias = [
    { value: 'MECANICO', label: '🔧 Mecánico', icon: '⚙️' },
    { value: 'ELECTRICO', label: '⚡ Eléctrico', icon: '💡' },
    { value: 'HIDRAULICO', label: '💧 Hidráulico', icon: '🌊' },
    { value: 'NEUMATICO', label: '🛞 Neumático', icon: '🚗' },
    { value: 'CARROCERIA', label: '🚗 Carrocería', icon: '🎨' },
    { value: 'OTRO', label: '📦 Otro', icon: '❓' },
  ];

  const prioridades = [
    { value: 'BAJA', label: 'Baja', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
    { value: 'MEDIA', label: 'Media', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
    { value: 'ALTA', label: 'Alta', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
    { value: 'CRITICA', label: 'Crítica', color: 'bg-red-100 text-red-700', icon: '🔴' },
  ];

  const areas = [
    'PRODUCCION',
    'OPERACIONES',
    'LOGISTICA',
    'CARGA_DESCARGA',
    'MANTENIMIENTO',
    'ADMINISTRACION',
  ];

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Tu dispositivo no soporta geolocalización');
      return;
    }

    setUseGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          precision: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };
        setGpsData(data);
        toast.success('📍 Ubicación capturada');
      },
      (error) => {
        toast.error('No se pudo obtener ubicación');
        console.error('GPS error:', error);
        setUseGPS(false);
      }
    );
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `maintenance-requests/${fileName}`;

        const { data, error } = await supabase.storage
          .from('evidencias')
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          url: urlData.publicUrl,
          tipo: file.type,
          nombre: file.name,
        });
      }

      setEvidencias([...evidencias, ...uploadedFiles]);
      toast.success(`✅ ${uploadedFiles.length} foto(s) cargada(s)`);
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Error al cargar fotos');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setEvidencias(evidencias.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.asset_id || !formData.titulo) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        solicitante_id: user.id,
        solicitante_nombre: user.nombre,
        evidencias: evidencias.length > 0 ? evidencias : null,
        ubicacion_gps: gpsData,
        estado: 'PENDIENTE',
        fecha_solicitud: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('maintenance_requests')
        .insert([payload]);

      if (error) throw error;

      toast.success('✅ Solicitud enviada a Mantenimiento');
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Error al enviar solicitud: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === formData.asset_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Reportar Problema en Equipo
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selección de Activo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Equipo / Activo <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.asset_id}
              onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
              required
            >
              <option value="">Selecciona el equipo</option>
              {assets
                .filter(a => a.visible)
                .sort((a, b) => a.ficha.localeCompare(b.ficha))
                .map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.ficha} - {asset.marca} {asset.modelo}
                  </option>
                ))}
            </select>
            {selectedAsset && (
              <p className="mt-2 text-sm text-gray-600">
                📦 <strong>{selectedAsset.tipo}</strong> | 🏷️ Marca: {selectedAsset.marca}
              </p>
            )}
          </div>

          {/* Título del problema */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ¿Qué problema tiene? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Motor hace ruido extraño"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
              required
              maxLength={200}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Describe el problema (opcional)
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Proporciona más detalles del problema..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de problema
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categorias.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, categoria: cat.value })}
                  className={`px-4 py-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${
                    formData.categoria === cat.value
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label.replace(/.*\s/, '')}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ¿Qué tan urgente es?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {prioridades.map(prio => (
                <button
                  key={prio.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, prioridad: prio.value })}
                  className={`px-4 py-3 rounded-lg font-semibold text-sm transition ${
                    formData.prioridad === prio.value
                      ? prio.color + ' ring-2 ring-offset-2 ring-gray-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{prio.icon}</span>
                  {prio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Área */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tu área
            </label>
            <select
              value={formData.solicitante_area}
              onChange={(e) => setFormData({ ...formData, solicitante_area: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {areas.map(area => (
                <option key={area} value={area}>
                  {area.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Fotos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fotos del problema (opcional)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {evidencias.map((ev, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={ev.url}
                    alt={ev.nombre}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer hover:bg-blue-100 transition">
              <Camera className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700 font-semibold">
                {uploading ? 'Subiendo...' : 'Tomar/Adjuntar Foto'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* GPS */}
          <div>
            <button
              type="button"
              onClick={handleGetGPS}
              disabled={useGPS}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                gpsData
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              {gpsData ? '✅ Ubicación capturada' : '📍 Capturar ubicación'}
            </button>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {saving ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
