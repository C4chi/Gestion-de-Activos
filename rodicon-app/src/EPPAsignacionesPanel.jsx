import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './AppContext';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';
import { Link, Plus, Trash2, Check } from 'lucide-react';

export function EPPAsignacionesPanel() {
  const { user } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('activos'); // activos | empleados | historial
  const [loading, setLoading] = useState(false);
  
  const [epp, setEpp] = useState([]);
  const [assets, setAssets] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);

  const [formData, setFormData] = useState({
    epp_id: '',
    asset_id: '',
    empleado_id: '',
    cantidad: '',
    observaciones: '',
  });

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      
      // EPP
      const { data: eppData } = await supabase
        .from('epp')
        .select('*')
        .eq('activo', true);
      setEpp(eppData || []);

      // Assets
      const { data: assetData } = await supabase
        .from('assets')
        .select('id, codigo, nombre')
        .eq('activo', true);
      setAssets(assetData || []);

      // Empleados
      const { data: empData } = await supabase
        .from('empleados')
        .select('*')
        .eq('activo', true);
      setEmpleados(empData || []);

      // Asignaciones
      const { data: asigData } = await supabase
        .from('epp_asignaciones')
        .select(`
          *,
          epp:epp_id (nombre, codigo),
          asset:asset_id (codigo, nombre),
          empleado:empleado_id (nombre, apellido)
        `)
        .order('fecha_asignacion', { ascending: false });
      setAsignaciones(asigData || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Crear asignación
  const handleCreateAsignacion = async () => {
    if (!formData.epp_id || !formData.cantidad) {
      toast.error('Completa los campos requeridos');
      return;
    }

    if (!formData.asset_id && !formData.empleado_id) {
      toast.error('Selecciona un activo o empleado');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('epp_asignaciones')
        .insert({
          epp_id: formData.epp_id,
          asset_id: formData.asset_id || null,
          empleado_id: formData.empleado_id || null,
          cantidad: parseInt(formData.cantidad),
          usuario_responsable_id: user?.id,
          observaciones: formData.observaciones,
          estado: 'ASIGNADO',
        });

      if (error) throw error;

      toast.success('Asignación registrada');
      setFormData({ epp_id: '', asset_id: '', empleado_id: '', cantidad: '', observaciones: '' });
      loadData();
    } catch (err) {
      console.error('Error creando asignación:', err);
      toast.error('Error al registrar asignación');
    } finally {
      setLoading(false);
    }
  };

  // Marcar como devuelto
  const handleDevolver = async (asignacionId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('epp_asignaciones')
        .update({
          estado: 'DEVUELTO',
          fecha_devolucion: new Date().toISOString().split('T')[0],
        })
        .eq('id', asignacionId);

      if (error) throw error;
      toast.success('Devolución registrada');
      loadData();
    } catch (err) {
      console.error('Error registrando devolución:', err);
      toast.error('Error al registrar devolución');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar asignación
  const handleDelete = async (asignacionId) => {
    if (!confirm('¿Eliminar esta asignación?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('epp_asignaciones')
        .delete()
        .eq('id', asignacionId);

      if (error) throw error;
      toast.success('Asignación eliminada');
      loadData();
    } catch (err) {
      console.error('Error eliminando:', err);
      toast.error('Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  // Crear empleado
  const handleCreateEmpleado = async () => {
    const nombre = prompt('Nombre del empleado:');
    const apellido = prompt('Apellido:');
    const cedula = prompt('Cédula:');
    const puesto = prompt('Puesto:');

    if (!nombre) {
      toast.error('Nombre requerido');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('empleados')
        .insert({ nombre, apellido, cedula, puesto });

      if (error) throw error;
      toast.success('Empleado creado');
      loadData();
    } catch (err) {
      console.error('Error creando empleado:', err);
      toast.error('Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl m-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link className="w-6 h-6 text-white" />
            <h1 className="text-2xl font-bold text-white">Asignaciones de EPP</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-6 flex gap-4">
          {['activos', 'empleados', 'historial'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* ASIGNAR A ACTIVOS */}
          {activeTab === 'activos' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario */}
              <div>
                <h2 className="text-xl font-bold mb-4">Asignar a Activo</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">EPP</label>
                    <select
                      value={formData.epp_id}
                      onChange={(e) => setFormData({ ...formData, epp_id: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {epp.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nombre} ({item.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Activo</label>
                    <select
                      value={formData.asset_id}
                      onChange={(e) => setFormData({ ...formData, asset_id: e.target.value, empleado_id: '' })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {assets.map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.codigo} - {asset.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Cantidad</label>
                    <input
                      type="number"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Observaciones</label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                      rows="3"
                    />
                  </div>

                  <button
                    onClick={handleCreateAsignacion}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Registrando...' : 'Asignar'}
                  </button>
                </div>
              </div>

              {/* Lista de asignaciones activas a activos */}
              <div>
                <h2 className="text-xl font-bold mb-4">Asignaciones Activas</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {asignaciones
                    .filter(a => a.asset_id && a.estado === 'ASIGNADO')
                    .map(asig => (
                      <div key={asig.id} className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{asig.epp?.nombre}</p>
                            <p className="text-sm text-gray-700">
                              Activo: {asig.asset?.codigo} - {asig.asset?.nombre}
                            </p>
                            <p className="text-sm text-gray-700">Cantidad: {asig.cantidad}</p>
                            {asig.observaciones && (
                              <p className="text-xs text-gray-600 mt-1">{asig.observaciones}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDevolver(asig.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Marcar como devuelto"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ASIGNAR A EMPLEADOS */}
          {activeTab === 'empleados' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Asignar a Empleado</h2>
                  <button
                    onClick={handleCreateEmpleado}
                    className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Nuevo Empleado
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">EPP</label>
                    <select
                      value={formData.epp_id}
                      onChange={(e) => setFormData({ ...formData, epp_id: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {epp.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nombre} ({item.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Empleado</label>
                    <select
                      value={formData.empleado_id}
                      onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value, asset_id: '' })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Seleccionar...</option>
                      {empleados.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre} {emp.apellido} ({emp.puesto})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Cantidad</label>
                    <input
                      type="number"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Observaciones</label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                      rows="3"
                    />
                  </div>

                  <button
                    onClick={handleCreateAsignacion}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Registrando...' : 'Asignar'}
                  </button>
                </div>
              </div>

              {/* Lista de asignaciones activas a empleados */}
              <div>
                <h2 className="text-xl font-bold mb-4">Asignaciones Activas</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {asignaciones
                    .filter(a => a.empleado_id && a.estado === 'ASIGNADO')
                    .map(asig => (
                      <div key={asig.id} className="border rounded-lg p-3 bg-purple-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-bold">{asig.epp?.nombre}</p>
                            <p className="text-sm text-gray-700">
                              Empleado: {asig.empleado?.nombre} {asig.empleado?.apellido}
                            </p>
                            <p className="text-sm text-gray-700">Cantidad: {asig.cantidad}</p>
                            <p className="text-xs text-gray-600">
                              Asignado: {new Date(asig.fecha_asignacion).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDevolver(asig.id)}
                              className="text-green-600 hover:text-green-700"
                              title="Marcar como devuelto"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(asig.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* HISTORIAL */}
          {activeTab === 'historial' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Historial de Asignaciones</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-4 py-2 text-left">EPP</th>
                      <th className="px-4 py-2 text-left">Asignado a</th>
                      <th className="px-4 py-2 text-center">Cantidad</th>
                      <th className="px-4 py-2 text-left">Fecha Asignación</th>
                      <th className="px-4 py-2 text-left">Devolución</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asignaciones.map(asig => (
                      <tr key={asig.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{asig.epp?.nombre}</td>
                        <td className="px-4 py-2">
                          {asig.asset ? `${asig.asset.codigo} (Activo)` : `${asig.empleado?.nombre} (Empleado)`}
                        </td>
                        <td className="px-4 py-2 text-center">{asig.cantidad}</td>
                        <td className="px-4 py-2 text-sm">
                          {new Date(asig.fecha_asignacion).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {asig.fecha_devolucion ? new Date(asig.fecha_devolucion).toLocaleDateString('es-ES') : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            asig.estado === 'ASIGNADO' ? 'bg-blue-100 text-blue-800' :
                            asig.estado === 'DEVUELTO' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {asig.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
