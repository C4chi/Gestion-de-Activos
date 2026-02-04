import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

/**
 * CreateWorkOrderModal
 * Modal para crear nueva orden de mantenimiento
 */
export const CreateWorkOrderModal = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [formData, setFormData] = useState({
    asset_id: '',
    tipo_mantenimiento: 'CORRECTIVO',
    descripcion: '',
    prioridad: 'Normal',
    usuario: '',
  });
  const [assets, setAssets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Cargar activos disponibles
  useEffect(() => {
    const loadAssets = async () => {
      if (!isOpen) return;
      setIsLoadingAssets(true);
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('id, nombre, codigo, estado')
          .order('nombre');

        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        toast.error('Error al cargar activos');
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadAssets();
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.asset_id) {
      toast.error('Selecciona un activo');
      return;
    }
    if (!formData.descripcion.trim()) {
      toast.error('Escribe una descripción');
      return;
    }
    if (!formData.usuario.trim()) {
      toast.error('Ingresa el usuario responsable');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm?.(formData);
      resetForm();
    } catch (err) {
      toast.error(err.message || 'Error al crear orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      asset_id: '',
      tipo_mantenimiento: 'CORRECTIVO',
      descripcion: '',
      prioridad: 'Normal',
      usuario: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">🔧 Nueva Orden de Mantenimiento</h2>

        {/* Activo */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📦 Seleccionar Activo *
          </label>
          <select
            name="asset_id"
            value={formData.asset_id}
            onChange={handleChange}
            disabled={isSubmitting || isLoadingAssets}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {isLoadingAssets ? 'Cargando activos...' : 'Selecciona un activo'}
            </option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.nombre} ({asset.codigo})
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Mantenimiento */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📝 Tipo de Mantenimiento *
          </label>
          <div className="flex gap-2">
            {['PREVENTIVO', 'CORRECTIVO'].map((type) => (
              <button
                key={type}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    tipo_mantenimiento: type,
                  }))
                }
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                  formData.tipo_mantenimiento === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'PREVENTIVO' ? '📋 Preventivo' : '⚠️ Correctivo'}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📋 Descripción *
          </label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            placeholder="Describe el mantenimiento necesario..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Prioridad */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🎯 Prioridad
          </label>
          <div className="flex gap-2">
            {['Alta', 'Normal', 'Baja'].map((priority) => (
              <button
                key={priority}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, prioridad: priority }))
                }
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                  formData.prioridad === priority
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {priority === 'Alta' && '🔴 '}
                {priority === 'Normal' && '🟡 '}
                {priority === 'Baja' && '🟢 '}
                {priority}
              </button>
            ))}
          </div>
        </div>

        {/* Usuario Responsable */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            👤 Responsable *
          </label>
          <input
            type="text"
            name="usuario"
            value={formData.usuario}
            onChange={handleChange}
            placeholder="Nombre del técnico"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onClose?.();
              resetForm();
            }}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-400 disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? '⏳ Creando...' : '✅ Crear Orden'}
          </button>
        </div>
      </div>
    </div>
  );
};
