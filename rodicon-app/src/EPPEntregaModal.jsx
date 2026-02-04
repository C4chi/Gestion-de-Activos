import React, { useState, useRef, useContext } from 'react';
import { AppContext } from './AppContext';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';
import { Camera, Loader, Send } from 'lucide-react';

export function EPPEntregaModal({ asignacionId, asignacion, onClose, onSuccess }) {
  const { user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firma_responsable: '',
    observaciones: '',
    foto_base64: null,
    fotoPreview: null,
  });

  const [cameraActive, setCameraActive] = useState(false);

  // Activar cámara
  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accediendo a cámara:', err);
      toast.error('No se puede acceder a la cámara');
    }
  };

  // Capturar foto
  const handleCapture = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const base64 = canvasRef.current.toDataURL('image/jpeg');
      setFormData({
        ...formData,
        foto_base64: base64,
        fotoPreview: base64,
      });

      // Detener stream
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
    }
  };

  // Subir foto desde archivo
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        foto_base64: reader.result,
        fotoPreview: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  // Registrar entrega
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firma_responsable) {
      toast.error('Ingresa el nombre de quien recibe');
      return;
    }

    try {
      setLoading(true);

      // Subir foto a Supabase Storage si existe
      let fotoUrl = null;
      if (formData.foto_base64) {
        const fileName = `entrega-${asignacionId}-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('epp-entregas')
          .upload(fileName, formData.foto_base64.split(',')[1], {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('epp-entregas')
          .getPublicUrl(fileName);

        fotoUrl = publicUrl;
      }

      // Registrar entrega
      const { error } = await supabase
        .from('epp_entregas')
        .insert({
          asignacion_id: asignacionId,
          firma_responsable: formData.firma_responsable,
          foto_comprobante_url: fotoUrl,
          observaciones: formData.observaciones,
        });

      if (error) throw error;

      toast.success('Entrega registrada');
      setFormData({ firma_responsable: '', observaciones: '', foto_base64: null, fotoPreview: null });
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error registrando entrega:', err);
      toast.error('Error al registrar entrega');
    } finally {
      setLoading(false);
    }
  };

  if (!asignacion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Comprobante de Entrega</h1>
          <button
            onClick={onClose}
            className="text-white hover:text-green-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Datos de la asignación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-bold text-blue-900 mb-3">Información de Asignación</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">EPP:</p>
                <p className="font-bold">{asignacion.epp?.nombre}</p>
              </div>
              <div>
                <p className="text-gray-600">Cantidad:</p>
                <p className="font-bold">{asignacion.cantidad}</p>
              </div>
              <div>
                <p className="text-gray-600">Asignado a:</p>
                <p className="font-bold">
                  {asignacion.asset ? `${asignacion.asset.codigo} (Activo)` : `${asignacion.empleado?.nombre} (Empleado)`}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Fecha:</p>
                <p className="font-bold">{new Date(asignacion.fecha_asignacion).toLocaleDateString('es-ES')}</p>
              </div>
            </div>
          </div>

          {/* Firma */}
          <div>
            <label className="block text-sm font-bold mb-2">Nombre de quien recibe *</label>
            <input
              type="text"
              value={formData.firma_responsable}
              onChange={(e) => setFormData({ ...formData, firma_responsable: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-sm font-bold mb-2">Comprobante de Entrega (foto)</label>

            {/* Preview */}
            {formData.fotoPreview ? (
              <div className="relative mb-4">
                <img
                  src={formData.fotoPreview}
                  alt="Foto de entrega"
                  className="w-full max-h-64 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, foto_base64: null, fotoPreview: null })}
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                >
                  Eliminar
                </button>
              </div>
            ) : null}

            {/* Cámara */}
            {cameraActive ? (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded border"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Capturar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current?.srcObject) {
                        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                      }
                      setCameraActive(false);
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {!formData.fotoPreview && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" /> Usar Cámara
                    </button>

                    <div className="text-center text-gray-500">o</div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                    >
                      Subir Foto
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-bold mb-2">Observaciones (opcional)</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              rows="3"
              placeholder="Ej: Entrega en buen estado, recibido conforme..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Registrar Entrega
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
