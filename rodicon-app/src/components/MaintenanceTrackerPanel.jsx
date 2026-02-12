import React, { useState, useEffect } from 'react';
import { Gauge, Calendar, Wrench, AlertCircle, CheckCircle, Clock, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * MaintenanceTrackerPanel
 * Panel de seguimiento de mantenimiento en el sidebar del activo
 * Muestra último mto, próximo mto y permite actualizar km/horas
 */
export const MaintenanceTrackerPanel = ({ asset, onUpdate }) => {
  const [mtoStatus, setMtoStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (asset?.ficha) {
      loadMaintenanceStatus();
    }
  }, [asset?.ficha]);

  const loadMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_maintenance_status')
        .select('*')
        .eq('ficha', asset.ficha)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setMtoStatus(data || {});
      
      // Inicializar valor editable
      if (data) {
        const currentValue = data.tipo_medicion === 'HOROMETRO' 
          ? data.horometro_actual 
          : data.kilometraje_actual;
        setEditValue(currentValue || 0);
      }
    } catch (error) {
      console.error('Error cargando estado de mantenimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKm = async () => {
    if (!editValue || parseFloat(editValue) < 0) {
      toast.error('Ingrese un valor válido');
      return;
    }

    setSaving(true);
    try {
      const isHorometro = mtoStatus?.tipo_medicion === 'HOROMETRO';
      const updateData = isHorometro 
        ? { horometro_actual: parseFloat(editValue) }
        : { kilometraje_actual: parseInt(editValue) };

      const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('ficha', asset.ficha);

      if (error) throw error;

      toast.success(`✅ ${isHorometro ? 'Horómetro' : 'Kilometraje'} actualizado`);
      setIsEditing(false);
      
      // Recargar estado de mantenimiento
      await loadMaintenanceStatus();
      
      // Notificar al padre para refrescar
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Error al actualizar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeTipoMedicion = async (nuevoTipo) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ tipo_medicion: nuevoTipo })
        .eq('ficha', asset.ficha);

      if (error) throw error;

      toast.success(`✅ Tipo de medición cambiado a ${nuevoTipo === 'HOROMETRO' ? 'Horómetro' : 'Kilometraje'}`);
      
      // Recargar estado de mantenimiento
      await loadMaintenanceStatus();
      
      // Notificar al padre para refrescar
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Error al cambiar tipo: ' + error.message);
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'VENCIDO':
        return (
          <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold">
            <AlertCircle className="w-3 h-3" />
            VENCIDO
          </div>
        );
      case 'PROXIMO':
        return (
          <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-bold">
            <Clock className="w-3 h-3" />
            PRÓXIMO
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
            <CheckCircle className="w-3 h-3" />
            AL DÍA
          </div>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-sm text-gray-500">Cargando seguimiento...</p>
      </div>
    );
  }

  const isHorometro = mtoStatus?.tipo_medicion === 'HOROMETRO';
  const medicionLabel = isHorometro ? 'Horas' : 'Km';
  const currentValue = isHorometro ? mtoStatus?.horometro_actual : mtoStatus?.kilometraje_actual;

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        🔧 Seguimiento de Mantenimiento
      </h3>

      {/* Selector de Tipo de Medición */}
      <div className="mb-3 bg-white border border-gray-300 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">
          Tipo de Medición
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleChangeTipoMedicion('KILOMETRAJE')}
            disabled={!isHorometro}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${
              !isHorometro
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🚗 Kilometraje
          </button>
          <button
            onClick={() => handleChangeTipoMedicion('HOROMETRO')}
            disabled={isHorometro}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${
              isHorometro
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⚙️ Horómetro
          </button>
        </div>
      </div>

      {/* Medición Actual - Editable */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-3 border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">
              {isHorometro ? 'Horómetro' : 'Kilometraje'} Actual
            </span>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-purple-100 rounded transition"
              title="Editar"
            >
              <Edit2 className="w-4 h-4 text-purple-600" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder={`Ej: ${isHorometro ? '1250.5' : '45000'}`}
              step={isHorometro ? '0.1' : '1'}
            />
            <button
              onClick={handleSaveKm}
              disabled={saving}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
              title="Guardar"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditValue(currentValue || 0);
              }}
              className="p-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="text-3xl font-black text-purple-900 mt-1">
            {currentValue ? currentValue.toLocaleString() : '0'} 
            <span className="text-lg font-semibold text-purple-600 ml-1">{medicionLabel}</span>
          </div>
        )}
      </div>

      {/* Último Mantenimiento */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-bold text-gray-600 uppercase">Último Mantenimiento</span>
        </div>
        
        {mtoStatus?.ultimo_mto_fecha ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">
                  {formatDate(mtoStatus.ultimo_mto_fecha)}
                </span>
              </div>
              {mtoStatus.dias_desde_ultimo_mto !== null && (
                <span className="text-xs text-gray-500">
                  Hace {mtoStatus.dias_desde_ultimo_mto} días
                </span>
              )}
            </div>
            
            {(isHorometro ? mtoStatus.ultimo_mto_horas : mtoStatus.ultimo_mto_km) && (
              <div className="flex items-center gap-2">
                <Gauge className="w-3 h-3 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {(isHorometro ? mtoStatus.ultimo_mto_horas : mtoStatus.ultimo_mto_km).toLocaleString()} {medicionLabel}
                </span>
              </div>
            )}
            
            {mtoStatus.ultimo_mto_tipo && (
              <div className="mt-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  mtoStatus.ultimo_mto_tipo === 'PREVENTIVO' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {mtoStatus.ultimo_mto_tipo}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Sin mantenimientos registrados</p>
        )}
      </div>

      {/* Próximo Mantenimiento */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase">Próximo Mantenimiento</span>
          </div>
          {mtoStatus?.estado_mantenimiento && getEstadoBadge(mtoStatus.estado_mantenimiento)}
        </div>
        
        {((isHorometro ? mtoStatus?.proximo_mto_fecha_horas : mtoStatus?.proximo_mto_fecha_km) || 
          (isHorometro ? mtoStatus?.proximo_mto_horas : mtoStatus?.proximo_mto_km)) ? (
          <div className="space-y-1">
            {(isHorometro ? mtoStatus.proximo_mto_fecha_horas : mtoStatus.proximo_mto_fecha_km) && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    {formatDate(isHorometro ? mtoStatus.proximo_mto_fecha_horas : mtoStatus.proximo_mto_fecha_km)}
                  </span>
                </div>
                {mtoStatus.dias_hasta_proximo_mto !== null && (
                  <span className={`text-xs font-semibold ${
                    mtoStatus.dias_hasta_proximo_mto < 0 
                      ? 'text-red-600' 
                      : mtoStatus.dias_hasta_proximo_mto <= 7 
                        ? 'text-yellow-600' 
                        : 'text-green-600'
                  }`}>
                    {mtoStatus.dias_hasta_proximo_mto < 0 
                      ? `Atrasado ${Math.abs(mtoStatus.dias_hasta_proximo_mto)} días`
                      : `En ${mtoStatus.dias_hasta_proximo_mto} días`}
                  </span>
                )}
              </div>
            )}
            
            {(isHorometro ? mtoStatus.proximo_mto_horas : mtoStatus.proximo_mto_km) && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-3 h-3 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    {(isHorometro ? mtoStatus.proximo_mto_horas : mtoStatus.proximo_mto_km).toLocaleString()} {medicionLabel}
                  </span>
                </div>
                {currentValue && (isHorometro ? mtoStatus.proximo_mto_horas : mtoStatus.proximo_mto_km) && (
                  <span className={`text-xs font-semibold ${
                    currentValue >= (isHorometro ? mtoStatus.proximo_mto_horas : mtoStatus.proximo_mto_km)
                      ? 'text-red-600' 
                      : currentValue >= (isHorometro ? mtoStatus.proximo_mto_horas : mtoStatus.proximo_mto_km) * 0.9 
                        ? 'text-yellow-600' 
                        : 'text-green-600'
                  }`}>
                    {currentValue >= (isHorometro ? mtoStatus.proximo_mto_horas : mtoStatus.proximo_mto_km)
                      ? 'EXCEDIDO'
                      : `Faltan ${((isHorometro ? mtoStatus.proximo_mto_horas : mtoStatus.proximo_mto_km) - currentValue).toLocaleString()} ${medicionLabel}`}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No hay próximo mantenimiento programado</p>
        )}
      </div>

      {/* Mensaje de alerta si está vencido */}
      {mtoStatus?.estado_mantenimiento === 'VENCIDO' && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Mantenimiento Vencido</p>
            <p className="text-xs text-red-600 mt-0.5">
              Este activo requiere mantenimiento inmediato
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
