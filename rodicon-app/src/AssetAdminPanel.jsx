import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from './AppContext';
import { FullScreenModal } from './FullScreenModal';
import { supabase } from './supabaseClient';
import { Search, Edit2, Save, X, Trash2, Upload, MapPin, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from './hooks/useDebounce';
import AssetImporter from './components/AssetImporter';
import { LocationManager } from './components/LocationManager';
import { PDFStatusImporter } from './components/PDFStatusImporter';
import { ImportadorExcelModal } from './ImportadorExcelModal';

/**
 * AssetAdminPanel
 * Panel de administrador para editar detalles completos de activos
 * Solo ADMIN puede acceder - puede marcar como VENDIDO
 * Integrado con AppContext para sincronización global
 */
export const AssetAdminPanel = ({ onClose, isAdmin = true }) => {
  const { assets, updateAsset, fetchAllData } = useAppContext();
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showPDFImporter, setShowPDFImporter] = useState(false);
  const [showExcelImporter, setShowExcelImporter] = useState(false);

  if (!isAdmin) {
    return (
      <FullScreenModal title="⚙️ Panel de Administrador" color="indigo" onClose={onClose}>
        <div className="text-center py-12 text-gray-500 font-semibold">
          No tienes permiso para acceder a este panel.
        </div>
      </FullScreenModal>
    );
  }

  // Computar activos filtrados SIEMPRE que assets o search cambien
  // Esto asegura que siempre se usen los datos más recientes
  const filteredAssets = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return assets || [];
    }

    const term = debouncedSearch.toLowerCase();
    const filtered = (assets || []).filter(
      (asset) =>
        (asset.ficha || '').toLowerCase().includes(term) ||
        (asset.marca || '').toLowerCase().includes(term) ||
        (asset.modelo || '').toLowerCase().includes(term) ||
        (asset.tipo || '').toLowerCase().includes(term)
    );
    return filtered;
  }, [debouncedSearch, assets]);

  // Seleccionar activo para editar
  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    // Normalizar visible: asegurar que sea 0 o 1, nunca undefined/null
    const normalizedAsset = {
      ...asset,
      visible: asset.visible ? 1 : 0
    };
    setEditData(normalizedAsset);
    setIsEditing(true);
  };

  // Guardar cambios usando el contexto global
  const handleSaveChanges = async () => {
    if (!selectedAsset) return;

    setIsLoading(true);
    try {
      console.log('💾 Guardando cambios para activo:', selectedAsset.ficha);
      console.log('📋 Datos editados:', editData);
      
      // Usar SOLO campos core que definitivamente existen
      const updatePayload = {};
      
      // Campos que queremos persistir; requiere que existan en la tabla assets
      const coreFields = [
        'ficha', 'tipo', 'marca', 'modelo', 'año', 'chasis', 'matricula',
        'ubicacion_actual', 'status', 'observacion_mecanica',
        'numero_requisicion', 'taller_responsable',
        'fecha_vencimiento_seguro', 'aseguradora', 'numero_poliza', 'paso_rapido',
        'proyeccion_entrada', 'proyeccion_salida', 'foto_url',
        'visible'
      ];

      coreFields.forEach(field => {
        if (field in editData && editData[field] !== undefined) {
          let value = editData[field];

          // Normalizar fechas vacías a null (evita error 22007)
          if ((field === 'proyeccion_entrada' || field === 'proyeccion_salida' || field === 'fecha_vencimiento_seguro') && value === '') {
            value = null;
          }

          // Normalizar año a número o null
          if (field === 'año') {
            value = value === '' ? null : Number(value);
            if (Number.isNaN(value)) value = null;
          }

          // Normalizar visible a 0 o 1
          if (field === 'visible') {
            value = value ? 1 : 0;
          }

          updatePayload[field] = value;
        }
      });

      console.log('🎯 Payload a enviar:', updatePayload);

      if (Object.keys(updatePayload).length === 0) {
        toast.info('Sin cambios para guardar');
        setIsEditing(false);
        return;
      }

      // Usar el método del contexto que sincroniza globalmente
      console.log('📤 Enviando actualización a Supabase...');
      const success = await updateAsset(selectedAsset.id, updatePayload);
      
      if (success) {
        console.log('✅ Guardado exitoso');
        toast.success('✅ Activo actualizado correctamente');
        
        // Esperar a que se actualicen los datos en el contexto
        console.log('🔄 Recargando datos...');
        await fetchAllData();
        
        console.log('🔍 Cerrando modo edición...');
        setIsEditing(false);
        setSelectedAsset(null);
        setEditData({});
      } else {
        console.log('❌ La actualización falló');
        toast.error('No se pudo guardar los cambios');
      }
    } catch (err) {
      console.error('🚨 Error crítico:', err);
      toast.error('Error al guardar los cambios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  // Marcar como VENDIDO (solo admin)
  const handleMarkAsSold = async () => {
    if (!selectedAsset) return;

    const confirmSell = window.confirm(
      `¿Estás seguro de que deseas marcar "${selectedAsset.ficha}" como VENDIDO? Esta acción ocultará el activo de la población.`
    );

    if (!confirmSell) return;

    setIsLoading(true);
    try {
      // Usar el método del contexto para actualizar
      const success = await updateAsset(selectedAsset.id, {
        status: 'VENDIDO',
        visible: false,
      });

      if (success) {
        toast.success('✅ Activo marcado como VENDIDO y removido del inventario');
        setIsEditing(false);
        setSelectedAsset(null);
      }
    } catch (err) {
      toast.error('Error al marcar como vendido');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FullScreenModal
      title="⚙️ Panel de Administrador - Detalles de Activos"
      color="indigo"
      onClose={onClose}
    >
      {showImporter ? (
        <AssetImporter 
          onSuccess={() => {
            setShowImporter(false);
            fetchAllData();
          }}
          onClose={() => setShowImporter(false)}
        />
      ) : showExcelImporter ? (
        <ImportadorExcelModal
          onClose={() => {
            setShowExcelImporter(false);
            fetchAllData();
          }}
        />
      ) : showPDFImporter ? (
        <PDFStatusImporter 
          assets={assets}
          onSuccess={() => {
            setShowPDFImporter(false);
            fetchAllData();
          }}
          onClose={() => setShowPDFImporter(false)}
        />
      ) : showLocationManager ? (
        <LocationManager 
          onClose={() => setShowLocationManager(false)}
        />
      ) : !isEditing ? (
        <>
          {/* Búsqueda y botón de importar */}
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por ficha, marca, modelo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setShowImporter(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-sm"
              >
                <Upload size={18} />
                Importar Activos
              </button>
              <button
                onClick={() => setShowExcelImporter(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition text-sm"
              >
                <FileText size={18} />
                Importar Excel
              </button>
              <button
                onClick={() => setShowPDFImporter(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition text-sm"
              >
                <FileText size={18} />
                Importar PDF
              </button>
              <button
                onClick={() => setShowLocationManager(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm"
              >
                <MapPin size={18} />
                Ubicaciones
              </button>
            </div>
          </div>

          {/* Lista de Activos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                ⏳ Cargando activos...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                ❌ No hay activos que coincidan con tu búsqueda
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                >
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-600">Ficha</p>
                    <p className="text-lg font-bold text-indigo-600">{asset.ficha}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Tipo</p>
                      <p className="font-semibold">{asset.tipo || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Marca</p>
                      <p className="font-semibold">{asset.marca || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Modelo</p>
                      <p className="font-semibold">{asset.modelo || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">Año</p>
                      <p className="font-semibold">{asset.año || '—'}</p>
                    </div>
                  </div>

                  <div className="mb-4 text-sm">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Estado</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        asset.status === 'DISPONIBLE'
                          ? 'bg-green-100 text-green-800'
                          : asset.status === 'EN_MANTENIMIENTO'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSelectAsset(asset)}
                    className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar Detalles
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : isEditing ? (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                ✏️ Editando: {selectedAsset?.ficha}
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Ficha (solo lectura) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📌 Ficha (No editable)
                </label>
                <input
                  type="text"
                  value={editData.ficha || ''}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔧 Tipo
                </label>
                <input
                  type="text"
                  value={editData.tipo || ''}
                  onChange={(e) => handleEditChange('tipo', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Marca */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏷️ Marca
                </label>
                <input
                  type="text"
                  value={editData.marca || ''}
                  onChange={(e) => handleEditChange('marca', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚗 Modelo
                </label>
                <input
                  type="text"
                  value={editData.modelo || ''}
                  onChange={(e) => handleEditChange('modelo', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Año */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Año
                </label>
                <input
                  type="number"
                  value={editData.año || ''}
                  onChange={(e) => handleEditChange('año', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Chasis */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔢 Chasis
                </label>
                <input
                  type="text"
                  value={editData.chasis || ''}
                  onChange={(e) => handleEditChange('chasis', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Matrícula */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚙 Matrícula
                </label>
                <input
                  type="text"
                  value={editData.matricula || ''}
                  onChange={(e) => handleEditChange('matricula', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ⚙️ Estado
                </label>
                <select
                  value={editData.status || 'DISPONIBLE'}
                  onChange={(e) => handleEditChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DISPONIBLE">✅ Disponible</option>
                  <option value="EN_MANTENIMIENTO">🔧 En Mantenimiento</option>
                  <option value="DAÑADO">❌ Dañado</option>
                </select>
              </div>

              {/* Ubicación Actual */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📍 Ubicación Actual
                </label>
                <input
                  type="text"
                  value={editData.ubicacion_actual || ''}
                  onChange={(e) => handleEditChange('ubicacion_actual', e.target.value)}
                  placeholder="Ej: Taller Principal"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Fecha Vencimiento Seguro */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Vencimiento Seguro
                </label>
                <input
                  type="date"
                  value={editData.fecha_vencimiento_seguro || ''}
                  onChange={(e) =>
                    handleEditChange('fecha_vencimiento_seguro', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Aseguradora */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏢 Aseguradora
                </label>
                <input
                  type="text"
                  value={editData.aseguradora || ''}
                  onChange={(e) => handleEditChange('aseguradora', e.target.value)}
                  placeholder="Nombre de la aseguradora"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Número de Póliza */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📋 Número de Póliza
                </label>
                <input
                  type="text"
                  value={editData.numero_poliza || ''}
                  onChange={(e) => handleEditChange('numero_poliza', e.target.value)}
                  placeholder="Ej: POL-2025-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Paso Rápido */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚏 Paso Rápido
                </label>
                <input
                  type="text"
                  value={editData.paso_rapido || ''}
                  onChange={(e) => handleEditChange('paso_rapido', e.target.value)}
                  placeholder="Ej: Paso A-1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Taller Responsable */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔧 Taller Responsable
                </label>
                <input
                  type="text"
                  value={editData.taller_responsable || ''}
                  onChange={(e) => handleEditChange('taller_responsable', e.target.value)}
                  placeholder="Nombre del taller"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Número de Requisición */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📋 Requisición
                </label>
                <input
                  type="text"
                  value={editData.numero_requisicion || ''}
                  onChange={(e) => handleEditChange('numero_requisicion', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Proyección Entrada */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📥 Proyección Entrada
                </label>
                <input
                  type="date"
                  value={editData.proyeccion_entrada || ''}
                  onChange={(e) => handleEditChange('proyeccion_entrada', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Proyección Salida */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📤 Proyección Salida
                </label>
                <input
                  type="date"
                  value={editData.proyeccion_salida || ''}
                  onChange={(e) => handleEditChange('proyeccion_salida', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Observación Mecánica (Full width) */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📝 Observación Mecánica
              </label>
              <textarea
                value={editData.observacion_mecanica || ''}
                onChange={(e) => handleEditChange('observacion_mecanica', e.target.value)}
                placeholder="Notas técnicas sobre el estado del activo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Visibilidad en Dashboard */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editData.visible !== 0}
                  onChange={(e) => handleEditChange('visible', e.target.checked ? 1 : 0)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600"
                />
                <span className="ml-3 font-semibold text-gray-700">
                  👁️ Visible en Dashboard Principal
                </span>
              </label>
              <p className="text-xs text-gray-600 mt-2">
                Si desactivas esto, el activo no aparecerá en el dashboard pero seguirá visible aquí en admin.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              {isAdmin && editData.status !== 'VENDIDO' && (
                <button
                  onClick={handleMarkAsSold}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  title="Marcar como vendido - Oculta el activo del inventario"
                >
                  <Trash2 className="w-4 h-4" />
                  {isLoading ? 'Procesando...' : 'Marcar Vendido'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </FullScreenModal>
  );
};
