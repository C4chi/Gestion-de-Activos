import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * Gestor de Ubicaciones
 * Permite crear, editar y eliminar ubicaciones de activos
 */
export const LocationManager = ({ onClose }) => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      // Obtener todas las ubicaciones únicas de los activos
      const { data, error } = await supabase
        .from('assets')
        .select('ubicacion_actual');

      if (error) throw error;

      // Extraer ubicaciones únicas y ordenar
      const uniqueLocations = [...new Set(
        data
          .map(item => item.ubicacion_actual)
          .filter(Boolean)
      )].sort();

      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
      toast.error('Error al cargar ubicaciones');
    }
  };

  const handleAddLocation = async () => {
    const trimmed = newLocation.trim().toUpperCase();
    
    if (!trimmed) {
      toast.error('Ingresa un nombre de ubicación');
      return;
    }

    if (locations.includes(trimmed)) {
      toast.error('Esta ubicación ya existe');
      return;
    }

    setLocations([...locations, trimmed].sort());
    setNewLocation('');
    toast.success('✅ Ubicación agregada (úsala al editar un activo)');
  };

  const handleDeleteLocation = async (location) => {
    const confirm = window.confirm(
      `¿Estás seguro de eliminar "${location}"?\n\nNOTA: Los activos con esta ubicación NO se eliminarán, pero la ubicación desaparecerá de la lista.`
    );

    if (!confirm) return;

    try {
      setLoading(true);

      // Contar cuántos activos tienen esta ubicación
      const { count, error: countError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('ubicacion_actual', location);

      if (countError) throw countError;

      if (count > 0) {
        toast.error(
          `No se puede eliminar. ${count} activo(s) tienen esta ubicación.`,
          { duration: 4000 }
        );
        setLoading(false);
        return;
      }

      // Si no hay activos con esa ubicación, remover de la lista
      setLocations(locations.filter(loc => loc !== location));
      toast.success(`✅ Ubicación "${location}" eliminada`);

    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al verificar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Gestión de Ubicaciones</h2>
              <p className="text-sm text-gray-500">Administra las ubicaciones de tus activos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Agregar nueva ubicación */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              ➕ Agregar Nueva Ubicación
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                placeholder="Ej: PROYECTO CHIRIQUÍ"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddLocation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Las ubicaciones se guardan automáticamente cuando editas un activo
            </p>
          </div>

          {/* Lista de ubicaciones */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
              <span>📍 Ubicaciones Existentes ({locations.length})</span>
            </h3>
            
            {locations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MapPin className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>No hay ubicaciones registradas</p>
                <p className="text-sm">Agrega tu primera ubicación arriba</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locations.map((location) => (
                  <div
                    key={location}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition group"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-800">{location}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteLocation(location)}
                      disabled={loading}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                      title="Eliminar ubicación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ℹ️ <strong>Nota:</strong> Solo puedes eliminar ubicaciones que no estén asignadas a ningún activo.
              Si una ubicación está en uso, primero cambia la ubicación de esos activos.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
