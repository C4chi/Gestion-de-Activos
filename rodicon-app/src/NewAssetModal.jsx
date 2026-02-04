import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Lock } from 'lucide-react';
import { safeString, isNotEmpty } from './utils/validation';

export const NewAssetModal = ({ onClose, onSubmit, isAdmin = false }) => {
  const [form, setForm] = useState({
    ficha: '',
    tipo: '',
    marca: '',
    modelo: '',
    año: '',
    chasis: '',
    status: 'DISPONIBLE',
  });
  const [isLoading, setIsLoading] = useState(false);

  const TIPOS = [
    'AUTOBUS',
    'CABEZOTE',
    'MINIBUS',
    'CAMION DE COMBUSTIBLE',
    'CAMION DE SERVICIO',
    'CAMION CISTERNA',
    'CAMION VOLTEO',
    'CAMION VOLTEO 3M',
    'CAMIONETA',
    'FURGONETA',
    'MOTONIVELADORA',
    'RODILLO',
    'LUMINARIA',
    'COMPRESOR',
    'MOTOSOLDADORA',
    'MANLIFT',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async () => {
    // Validaciones robustas
    if (!isNotEmpty(form.ficha)) {
      toast.error('Ingresa la ficha técnica');
      return;
    }
    if (!isNotEmpty(form.tipo)) {
      toast.error('Selecciona el tipo de activo');
      return;
    }
    if (!isNotEmpty(form.marca)) {
      toast.error('Ingresa la marca');
      return;
    }
    if (!isNotEmpty(form.modelo)) {
      toast.error('Ingresa el modelo');
      return;
    }
    if (!isNotEmpty(form.año)) {
      toast.error('Ingresa el año');
      return;
    }

    // Validar que el año sea un número válido
    if (isNaN(Number(form.año)) || Number(form.año) < 1900 || Number(form.año) > new Date().getFullYear()) {
      toast.error('Ingresa un año válido');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onSubmit(form);
      if (success) {
        toast.success('✅ Activo creado exitosamente');
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Error al crear el activo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">📦 Registrar Nuevo Activo</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {!isAdmin ? (
          /* Mensaje de restricción */
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Lock className="w-16 h-16 text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
              <p className="text-gray-600 text-center mb-6">
                Solo administradores pueden crear nuevos activos en el sistema.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 w-full text-sm text-red-700">
                <p className="font-semibold mb-2">⚠️ Restricción de Seguridad</p>
                <p>Esta acción está reservada para personal administrativo. Si necesitas crear un activo, contacta al administrador.</p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Ficha Técnica */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📌 Ficha Técnica *
                </label>
                <input
                  type="text"
                  name="ficha"
                  placeholder="Ej: CAM-001"
                  value={form.ficha}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Código único del activo</p>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔧 Tipo de Activo *
                </label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Selecciona tipo</option>
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marca */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏷️ Marca *
                </label>
                <input
                  type="text"
                  name="marca"
                  placeholder="Ej: Volvo, CAT, Komatsu"
                  value={form.marca}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚗 Modelo *
                </label>
                <input
                  type="text"
                  name="modelo"
                  placeholder="Ej: FH16"
                  value={form.modelo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* Año */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Año *
                </label>
                <input
                  type="number"
                  name="año"
                  placeholder="Ej: 2020"
                  value={form.año}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              {/* Chasis */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔢 Número de Chasis
                </label>
                <input
                  type="text"
                  name="chasis"
                  placeholder="Ej: VOLVO1234567890"
                  value={form.chasis}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Puedes agregarlo después también</p>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">ℹ️ Nota:</p>
                <p>Después de crear el activo, podrás agregar más detalles como GPS, Póliza, Ubicación, etc. desde la vista de administrador.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {isLoading ? '⏳ Creando...' : '✅ Crear Activo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};