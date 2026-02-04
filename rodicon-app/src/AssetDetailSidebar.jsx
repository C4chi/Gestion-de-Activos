import React, { useState, useEffect } from 'react';
import { X, Camera, ShoppingCart, AlertTriangle, Wrench, Shield, Edit2, Save, XCircle, Package } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { AssetPhotoModal } from './components/AssetPhotoModal';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

export const AssetDetailSidebar = ({ asset, mtoLogs, safetyReports, onClose, onOpenModal, isAdmin, onUpdate, allLocations = [] }) => {
  if (!asset) return null;

  const [activeTab, setActiveTab] = useState('DATOS');
  const [mtoFilter, setMtoFilter] = useState('TODOS');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [assetData, setAssetData] = useState(asset);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [eppAsignados, setEppAsignados] = useState([]);

  // Ubicaciones dinámicas desde los activos + opción de agregar nueva
  const UBICACIONES = [...new Set([...allLocations, assetData.ubicacion_actual].filter(Boolean))].sort();

  const ESTADOS = [
    'DISPONIBLE',
    'EN PROYECTO',
    'EN TALLER',
    'NO DISPONIBLE',
    'MTT PREVENTIVO',
    'ESPERA REPUESTO',
    'VENDIDO',
  ];

  // Cargar EPP asignados al activo
  useEffect(() => {
    const loadEppAsignados = async () => {
      try {
        const { data, error } = await supabase
          .from('epp_asignaciones')
          .select(`
            *,
            epp:epp_id (nombre, codigo)
          `)
          .eq('asset_id', asset.id)
          .order('fecha_asignacion', { ascending: false });

        if (error) throw error;
        setEppAsignados(data || []);
      } catch (err) {
        console.error('Error cargando EPP asignados:', err);
      }
    };

    if (asset?.id) {
      loadEppAsignados();
    }
  }, [asset?.id]);

  const handleEdit = () => {
    setEditData({
      ubicacion_actual: assetData.ubicacion_actual || '',
      status: assetData.status || 'DISPONIBLE',
      paso_rapido: assetData.paso_rapido || '',
      observacion_mecanica: assetData.observacion_mecanica || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('assets')
        .update(editData)
        .eq('id', assetData.id);

      if (error) throw error;

      setAssetData({ ...assetData, ...editData });
      setIsEditing(false);
      toast.success('✅ Cambios guardados correctamente');
      
      // Notificar al componente padre para actualizar la lista
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({});
    setIsEditing(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40 backdrop-blur-sm" onClick={onClose}></div>
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slideInRight border-l">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Detalle Activo</h2>
          <div className="flex items-center gap-2">
            {isAdmin && !isEditing && (
              <button
                onClick={handleEdit}
                className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                title="Editar activo"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                  title="Cancelar"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </>
            )}
            <button onClick={onClose}><X className="text-gray-500"/></button>
          </div>
        </div>
        
        {/* Pestañas */}
        <div className="px-4 pt-4 border-b shrink-0">
            <div className="flex overflow-x-auto">
                <button onClick={() => setActiveTab('DATOS')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'DATOS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Datos</button>
                <button onClick={() => setActiveTab('EPP')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'EPP' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>EPP</button>
                <button onClick={() => setActiveTab('MANTENIMIENTO')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'MANTENIMIENTO' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}>Mantenimiento</button>
                <button onClick={() => setActiveTab('HSE')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'HSE' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}>HSE</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Contenido de Pestañas */}
          {activeTab === 'DATOS' && (
            <div className="space-y-6">
              <div
                onClick={() => isAdmin && setPhotoModalOpen(true)}
                className={`w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border relative group ${isAdmin ? 'cursor-pointer hover:bg-gray-200 transition' : ''}`}
              >
                {assetData.foto_url ? (
                  <>
                    <img src={assetData.foto_url} alt="Foto" className="w-full h-full object-cover" />
                    {isAdmin && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    {isAdmin && <p className="text-xs text-gray-500">Haz clic para agregar foto</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100"><div className="text-blue-900 font-black text-3xl">{assetData.ficha}</div><div className="text-right font-bold text-gray-600">{assetData.placa || '-'}</div></div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border border-gray-100">
                  <div><label className="text-xs text-gray-400 font-bold block">Marca</label>{assetData.marca}</div>
                  <div><label className="text-xs text-gray-400 font-bold block">Modelo</label>{assetData.modelo}</div>
                  <div><label className="text-xs text-gray-400 font-bold block">Año</label>{assetData.anio || assetData['año'] || '—'}</div>
                  <div><label className="text-xs text-gray-400 font-bold block">Chasis</label><span className="font-mono text-xs">{assetData.chasis}</span></div>
                  
                  {/* Estado - Editable para admin */}
                  <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">Estado</label>
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ESTADOS.map(estado => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={assetData.status}/>
                    )}
                  </div>
                  
                  {/* Ubicación - Editable para admin con opción de crear nueva */}
                  <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">Ubicación</label>
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          list="ubicaciones-list"
                          value={editData.ubicacion_actual}
                          onChange={(e) => setEditData({ ...editData, ubicacion_actual: e.target.value })}
                          placeholder="Selecciona o escribe nueva ubicación"
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <datalist id="ubicaciones-list">
                          {UBICACIONES.map(ubicacion => (
                            <option key={ubicacion} value={ubicacion} />
                          ))}
                        </datalist>
                        <p className="text-xs text-gray-500">💡 Selecciona de la lista o escribe una nueva</p>
                      </div>
                    ) : (
                      <span className="text-sm">{assetData.ubicacion_actual}</span>
                    )}
                  </div>

                  {/* Paso Rápido - Editable */}
                  {(isEditing || assetData.paso_rapido) && (
                    <div className="col-span-2">
                      <label className="text-xs text-gray-400 font-bold block mb-1">🚏 Paso Rápido</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.paso_rapido}
                          onChange={(e) => setEditData({ ...editData, paso_rapido: e.target.value })}
                          placeholder="Ej: Terminal de Albrook"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <p className="text-sm font-semibold text-blue-900">{assetData.paso_rapido}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observación Mecánica - Editable */}
                  {(isEditing || assetData.observacion_mecanica) && (
                    <div className="col-span-2">
                      <label className="text-xs text-gray-400 font-bold block mb-1">🔧 Observación Mecánica</label>
                      {isEditing ? (
                        <textarea
                          value={editData.observacion_mecanica}
                          onChange={(e) => setEditData({ ...editData, observacion_mecanica: e.target.value })}
                          placeholder="Notas técnicas sobre el estado del activo"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-sm text-gray-700">{assetData.observacion_mecanica}</p>
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* Información de Seguros */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">📋 Información de Seguros</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  {asset.aseguradora && (
                    <div>
                      <label className="text-xs text-gray-500 font-bold block">🏢 Aseguradora</label>
                      <p className="text-sm font-semibold text-gray-800">{asset.aseguradora}</p>
                    </div>
                  )}
                  {asset.numero_poliza && (
                    <div>
                      <label className="text-xs text-gray-500 font-bold block">🔐 Número de Póliza</label>
                      <p className="text-sm font-semibold text-gray-800">{asset.numero_poliza}</p>
                    </div>
                  )}
                  {asset.fecha_vencimiento_seguro && (
                    <div>
                      <label className="text-xs text-gray-500 font-bold block">📅 Vencimiento de Póliza</label>
                      <p className={`text-sm font-semibold ${new Date(asset.fecha_vencimiento_seguro) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                        {new Date(asset.fecha_vencimiento_seguro).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                  <button onClick={() => onOpenModal('CORRECTIVE_LOG')} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 flex justify-center gap-2 shadow-sm"><AlertTriangle className="w-4 h-4"/> Reportar Falla</button>
                  <button onClick={() => onOpenModal('REQ')} className="w-full bg-yellow-400 text-yellow-900 font-bold py-3 rounded-xl hover:bg-yellow-500 flex justify-center gap-2 shadow-sm"><ShoppingCart className="w-4 h-4"/> Solicitar Repuesto</button>
                  <button onClick={() => onOpenModal('PREVENTIVE_MTO')} className="w-full bg-purple-50 text-purple-700 font-bold py-3 rounded-xl hover:bg-purple-100 border border-purple-200 flex justify-center gap-2"><Wrench className="w-4 h-4"/> Registrar Preventivo</button>
                  <button onClick={() => onOpenModal('SAFETY_FORM')} className="w-full bg-orange-50 text-orange-700 font-bold py-3 rounded-xl hover:bg-orange-100 border border-orange-200 flex justify-center gap-2"><AlertTriangle className="w-4 h-4"/> Reportar Incidente</button>
              </div>
            </div>
          )}

          {activeTab === 'MANTENIMIENTO' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-purple-800 flex items-center gap-2"><Wrench size={16}/> Historial de Mantenimiento</h3>
                <div className="flex border rounded-lg text-xs overflow-hidden">
                  <button onClick={() => setMtoFilter('TODOS')} className={`px-2 py-1 font-bold ${mtoFilter === 'TODOS' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600'}`}>Todos</button>
                  <button onClick={() => setMtoFilter('CORRECTIVO')} className={`px-2 py-1 font-bold ${mtoFilter === 'CORRECTIVO' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600'}`}>Correctivo</button>
                  <button onClick={() => setMtoFilter('PREVENTIVO')} className={`px-2 py-1 font-bold ${mtoFilter === 'PREVENTIVO' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600'}`}>Preventivo</button>
                </div>
              </div>
              {mtoLogs && mtoLogs.length > 0 ? mtoLogs
                .filter(log => mtoFilter === 'TODOS' || log.tipo === mtoFilter)
                .map(log => (
                <button key={log.id} onClick={() => onOpenModal('MTO_DETAIL', log)} className="w-full text-left bg-white p-3 rounded-lg border text-xs hover:bg-purple-50 hover:border-purple-300 transition">
                  <div className="flex justify-between items-center">
                    <p className={`font-bold ${log.tipo === 'CORRECTIVO' ? 'text-red-600' : 'text-purple-600'}`}>{log.tipo}</p>
                    <p className="font-semibold text-gray-700">{new Date(log.fecha).toLocaleDateString()}</p>
                  </div>
                  <p className="italic text-gray-600 my-1 truncate">"{log.descripcion}"</p>
                </button>
              )) : <p className="text-sm text-gray-400 text-center py-8">No hay registros.</p>}
            </div>
          )}

          {activeTab === 'HSE' && (
            <div className="space-y-3">
              <h3 className="font-bold text-orange-800 flex items-center gap-2"><Shield size={16}/> Historial de Seguridad</h3>
              {safetyReports && safetyReports.length > 0 ? safetyReports.map(report => (
                <div key={report.id} className="bg-white p-3 rounded-lg border text-xs">
                  <div className="flex justify-between items-center">
                    <p className="font-bold">{report.tipo}: <span className="font-normal">{new Date(report.created_at).toLocaleDateString()}</span></p>
                    <StatusBadge status={report.estado} />
                  </div>
                  <p className="italic text-gray-600 my-1">"{report.descripcion}"</p>
                  <p className="text-gray-500">Reportado por: {report.reportado_por}</p>
                </div>
              )) : <p className="text-sm text-gray-400 text-center py-8">No hay reportes.</p>}
            </div>
          )}

          {activeTab === 'EPP' && (
            <div className="space-y-3">
              <h3 className="font-bold text-blue-800 flex items-center gap-2"><Package size={16}/> EPP Asignados</h3>
              {eppAsignados && eppAsignados.length > 0 ? eppAsignados.map(asig => (
                <div
                  key={asig.id}
                  className={`bg-white p-3 rounded-lg border text-xs ${
                    asig.estado === 'ASIGNADO' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-blue-900">{asig.epp?.nombre}</p>
                      <p className="text-gray-600">Código: {asig.epp?.codigo}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      asig.estado === 'ASIGNADO' ? 'bg-blue-200 text-blue-800' :
                      asig.estado === 'DEVUELTO' ? 'bg-green-200 text-green-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {asig.estado}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <div>
                      <p className="text-gray-500 text-xs">Cantidad</p>
                      <p className="font-semibold">{asig.cantidad}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Asignado</p>
                      <p className="font-semibold">{new Date(asig.fecha_asignacion).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  {asig.observaciones && (
                    <p className="text-gray-600 italic mt-2 text-xs">{asig.observaciones}</p>
                  )}
                </div>
              )) : <p className="text-sm text-gray-400 text-center py-8">No hay EPP asignados.</p>}
            </div>
          )}
        </div>
      </aside>

      {/* Photo Modal */}
      {photoModalOpen && (
        <AssetPhotoModal
          asset={assetData}
          isAdmin={isAdmin}
          onClose={() => setPhotoModalOpen(false)}
          onPhotoUploaded={(photoUrl) => {
            setAssetData({ ...assetData, foto_url: photoUrl });
          }}
        />
      )}
    </>
  );
};
