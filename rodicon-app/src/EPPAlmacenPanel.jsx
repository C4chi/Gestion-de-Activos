import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './AppContext';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';
import { Package, Plus, Trash2, Camera, AlertCircle, ArrowRight, ShoppingCart, Boxes, Users, MoreVertical, Grid, List } from 'lucide-react';

export function EPPAlmacenPanel() {
  const { user } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('inventario');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  // Datos
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState(null);
  const [epp, setEpp] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [requisiciones, setRequisiciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [assets, setAssets] = useState([]);

  // Formularios
  const [entradaData, setEntradaData] = useState({
    epp_id: '',
    cantidad: '',
    observaciones: '',
  });

  const [asignacionActivoData, setAsignacionActivoData] = useState({
    epp_id: '',
    cantidad: '',
    asset_id: '',
    observaciones: '',
  });

  const [asignacionEmpleadoData, setAsignacionEmpleadoData] = useState({
    epp_id: '',
    cantidad: '',
    empleado_nombre: '',
    observaciones: '',
  });

  const [transferData, setTransferData] = useState({
    epp_id: '',
    cantidad: '',
    almacen_origen: '',
    almacen_destino: '',
    observaciones: '',
  });

  const [requisicionData, setRequisicionData] = useState({
    epp_id: '',
    cantidad_solicitada: '',
    observaciones: '',
  });

  const [newEppForm, setNewEppForm] = useState({
    nombre: '',
    categoria: 'Cascos',
    descripcion: '',
    cantidad_minima: '',
  });

  const [newAlmacenForm, setNewAlmacenForm] = useState({
    nombre: '',
    ubicacion: '',
    responsable: '',
    telefono: '',
    email: '',
  });

  // Cargar todos los datos
  const loadAllData = async () => {
    try {
      setLoading(true);

      const [almacenesData, eppData, movimientosData, asignacionesData, requisicionesData, empleadosData, assetsData] = await Promise.all([
        supabase.from('epp_almacenes').select('*').eq('activo', true),
        supabase.from('epp').select('*').eq('activo', true),
        supabase.from('epp_movimientos').select('*, epp:epp_id(nombre), almacen:almacen_id(nombre)').order('creado_at', { ascending: false }).limit(50),
        supabase.from('epp_asignaciones').select('*, epp:epp_id(nombre), asset:asset_id(codigo, nombre), empleado:empleado_id(nombre, apellido), almacen:almacen_id(nombre)').order('fecha_asignacion', { ascending: false }),
        supabase.from('epp_requisiciones').select('*, epp:epp_id(nombre), almacen:almacen_id(nombre)').order('fecha_solicitud', { ascending: false }),
        supabase.from('empleados').select('*').eq('activo', true),
        supabase.from('assets').select('id, codigo, nombre').eq('activo', true),
      ]);

      setAlmacenes(almacenesData.data || []);
      setEpp(eppData.data || []);
      setMovimientos(movimientosData.data || []);
      setAsignaciones(asignacionesData.data || []);
      setRequisiciones(requisicionesData.data || []);
      setEmpleados(empleadosData.data || []);
      setAssets(assetsData.data || []);

      if (almacenesData.data?.length > 0 && !selectedAlmacen) {
        setSelectedAlmacen(almacenesData.data[0].id);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Registrar movimiento
  const handleMovimiento = async (tipo) => {
    if (!entradaData.epp_id || !entradaData.cantidad || !selectedAlmacen) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('epp_movimientos').insert({
        epp_id: entradaData.epp_id,
        almacen_id: selectedAlmacen,
        tipo,
        cantidad: parseInt(entradaData.cantidad),
        observaciones: entradaData.observaciones,
        usuario_id: user?.id,
      });

      if (error) throw error;
      toast.success(`${tipo} registrada`);
      setEntradaData({ epp_id: '', cantidad: '', observaciones: '' });
      loadAllData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  // Transferencia entre almacenes
  const handleTransferencia = async () => {
    if (!transferData.epp_id || !transferData.cantidad || !transferData.almacen_origen || !transferData.almacen_destino) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('epp_movimientos').insert({
        epp_id: transferData.epp_id,
        almacen_id: transferData.almacen_origen,
        tipo: 'TRANSFERENCIA',
        cantidad: -parseInt(transferData.cantidad),
        almacen_destino_id: transferData.almacen_destino,
        observaciones: transferData.observaciones,
        usuario_id: user?.id,
      });

      if (error) throw error;

      const { error: error2 } = await supabase.from('epp_movimientos').insert({
        epp_id: transferData.epp_id,
        almacen_id: transferData.almacen_destino,
        tipo: 'TRANSFERENCIA',
        cantidad: parseInt(transferData.cantidad),
        observaciones: `Transferencia desde ${almacenes.find(a => a.id === transferData.almacen_origen)?.nombre}`,
        usuario_id: user?.id,
      });

      if (error2) throw error2;

      toast.success('Transferencia completada');
      setTransferData({ epp_id: '', cantidad: '', almacen_origen: '', almacen_destino: '', observaciones: '' });
      loadAllData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error en transferencia');
    } finally {
      setLoading(false);
    }
  };

  // Crear requisición de compra
  const handleRequisicion = async () => {
    if (!requisicionData.epp_id || !requisicionData.cantidad_solicitada || !selectedAlmacen) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('epp_requisiciones').insert({
        epp_id: requisicionData.epp_id,
        almacen_id: selectedAlmacen,
        cantidad_solicitada: parseInt(requisicionData.cantidad_solicitada),
        usuario_solicitante_id: user?.id,
        observaciones: requisicionData.observaciones,
      });

      if (error) throw error;
      toast.success('Requisición creada');
      setRequisicionData({ epp_id: '', cantidad_solicitada: '', observaciones: '' });
      loadAllData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error creando requisición');
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo EPP
  const handleCreateEPP = async () => {
    if (!newEppForm.nombre || !newEppForm.categoria || !newEppForm.cantidad_minima) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('epp').insert({
        nombre: newEppForm.nombre,
        categoria: newEppForm.categoria,
        descripcion: newEppForm.descripcion,
        cantidad_minima: parseInt(newEppForm.cantidad_minima),
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('El nombre de EPP ya existe');
        } else {
          throw error;
        }
      } else {
        toast.success('EPP creado exitosamente');
        setNewEppForm({ nombre: '', categoria: 'Cascos', descripcion: '', cantidad_minima: '' });
        loadAllData();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al crear EPP');
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo almacén
  const handleCreateAlmacen = async () => {
    if (!newAlmacenForm.nombre) {
      toast.error('El nombre del almacén es requerido');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('epp_almacenes').insert({
        nombre: newAlmacenForm.nombre,
        ubicacion: newAlmacenForm.ubicacion,
        responsable: newAlmacenForm.responsable,
        telefono: newAlmacenForm.telefono,
        email: newAlmacenForm.email,
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('Este nombre de almacén ya existe');
        } else {
          throw error;
        }
      } else {
        toast.success('Almacén creado exitosamente');
        setNewAlmacenForm({ nombre: '', ubicacion: '', responsable: '', telefono: '', email: '' });
        loadAllData();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al crear almacén');
    } finally {
      setLoading(false);
    }
  };

  // Crear asignación
  const handleAsignacion = async (tipo) => {
    const data = tipo === 'activo' ? asignacionActivoData : asignacionEmpleadoData;

    if (!data.epp_id || !data.cantidad || !selectedAlmacen) {
      toast.error('Completa todos los campos');
      return;
    }

    if (tipo === 'activo' && !data.asset_id) {
      toast.error('Selecciona un activo');
      return;
    }

    if (tipo === 'empleado' && !data.empleado_nombre) {
      toast.error('Escribe el nombre del empleado');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        epp_id: data.epp_id,
        almacen_id: selectedAlmacen,
        cantidad: parseInt(data.cantidad),
        usuario_responsable_id: user?.id,
        observaciones: data.observaciones,
        estado: 'ASIGNADO',
      };

      if (tipo === 'activo') {
        payload.asset_id = data.asset_id;
      } else {
        payload.empleado_nombre = data.empleado_nombre;
      }

      const { error } = await supabase.from('epp_asignaciones').insert(payload);
      if (error) throw error;

      const { error: movError } = await supabase.from('epp_movimientos').insert({
        epp_id: data.epp_id,
        almacen_id: selectedAlmacen,
        tipo: 'SALIDA',
        cantidad: parseInt(data.cantidad),
        observaciones: `Asignación a ${tipo === 'activo' ? 'activo' : 'empleado'}${tipo === 'empleado' ? `: ${data.empleado_nombre}` : ''}`,
        usuario_id: user?.id,
      });

      if (movError) throw movError;

      toast.success('Asignación registrada');
      if (tipo === 'activo') {
        setAsignacionActivoData({ epp_id: '', cantidad: '', asset_id: '', observaciones: '' });
      } else {
        setAsignacionEmpleadoData({ epp_id: '', cantidad: '', empleado_nombre: '', observaciones: '' });
      }
      loadAllData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error en asignación');
    } finally {
      setLoading(false);
    }
  };

  // Calcular stock total por EPP en almacén seleccionado
  const getStockByEpp = (eppId) => {
    const movs = movimientos
      .filter(m => m.epp_id === eppId && m.almacen?.id === selectedAlmacen)
      .reduce((acc, m) => {
        if (m.tipo === 'ENTRADA') return acc + m.cantidad;
        if (m.tipo === 'SALIDA') return acc - m.cantidad;
        return acc;
      }, 0);
    return Math.max(0, movs);
  };

  const eppBajoStock = epp.filter(e => getStockByEpp(e.id) < (e.cantidad_minima || 5));
  const asignacionesActivas = asignaciones.filter(a => a.estado === 'ASIGNADO' && a.almacen?.id === selectedAlmacen);
  const requisicionesPendientes = requisiciones.filter(r => r.estado === 'PENDIENTE' && r.almacen?.id === selectedAlmacen);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl">
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Boxes className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">EPP Almacén</h1>
                <p className="text-blue-100 text-sm">Gestión integral de equipos de protección</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Almacén Seleccionado:</p>
              <select
                value={selectedAlmacen || ''}
                onChange={(e) => setSelectedAlmacen(e.target.value)}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg border border-white border-opacity-30 font-semibold cursor-pointer"
              >
                {almacenes.map(a => (
                  <option key={a.id} value={a.id} className="text-gray-800">{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-8 py-6 bg-gray-50 border-b">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-gray-600 text-sm font-semibold">Total EPP</p>
            <p className="text-3xl font-bold text-blue-600">{epp.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-gray-600 text-sm font-semibold">Stock Bajo</p>
            <p className="text-3xl font-bold text-red-600">{eppBajoStock.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-gray-600 text-sm font-semibold">Asignaciones Activas</p>
            <p className="text-3xl font-bold text-green-600">{asignacionesActivas.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-gray-600 text-sm font-semibold">Requisiciones Pendientes</p>
            <p className="text-3xl font-bold text-orange-600">{requisicionesPendientes.length}</p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="border-b px-8 flex gap-1 overflow-x-auto">
          {[
            { id: 'inventario', label: '📦 Inventario' },
            { id: 'asignaciones', label: '👥 Asignaciones' },
            { id: 'transferencias', label: '🔄 Transferencias' },
            { id: 'requisiciones', label: '🛒 Requisiciones' },
            { id: 'gestionar', label: '⚙️ Crear EPP' },
            { id: 'historial', label: '📋 Historial' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-6 font-semibold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {/* INVENTARIO */}
          {activeTab === 'inventario' && (
            <div className="space-y-6">
              {eppBajoStock.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-red-800">⚠️ EPP con stock bajo</h3>
                      <p className="text-sm text-red-700 mt-1">{eppBajoStock.map(e => e.nombre).join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <h3 className="font-bold text-green-900 mb-4">📥 Registrar Entrada</h3>
                  <div className="space-y-3">
                    <select
                      value={entradaData.epp_id}
                      onChange={(e) => setEntradaData({ ...entradaData, epp_id: e.target.value })}
                      className="w-full border border-green-300 rounded-lg px-4 py-2"
                    >
                      <option value="">Seleccionar EPP...</option>
                      {epp.map(item => (
                        <option key={item.id} value={item.id}>{item.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={entradaData.cantidad}
                      onChange={(e) => setEntradaData({ ...entradaData, cantidad: e.target.value })}
                      placeholder="Cantidad"
                      className="w-full border border-green-300 rounded-lg px-4 py-2"
                      min="1"
                    />
                    <textarea
                      value={entradaData.observaciones}
                      onChange={(e) => setEntradaData({ ...entradaData, observaciones: e.target.value })}
                      placeholder="Observaciones (opcional)"
                      className="w-full border border-green-300 rounded-lg px-4 py-2 text-sm"
                      rows="2"
                    />
                    <button
                      onClick={() => handleMovimiento('ENTRADA')}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                    >
                      ✓ Registrar Entrada
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">Inventario Actual</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {epp.map(item => {
                    const stock = getStockByEpp(item.id);
                    const esAlerta = stock < item.cantidad_minima;
                    return (
                      <div
                        key={item.id}
                        className={`border-2 rounded-lg p-4 transition ${
                          esAlerta ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <h4 className="font-bold text-gray-900">{item.nombre}</h4>
                        <p className="text-sm text-gray-600 mb-3">{item.categoria}</p>
                        <div className="bg-white rounded p-3 mb-2">
                          <p className="text-xs text-gray-600">Stock Actual</p>
                          <p className={`text-2xl font-bold ${esAlerta ? 'text-red-600' : 'text-green-600'}`}>
                            {stock}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">Mín. requerido: {item.cantidad_minima}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ASIGNACIONES */}
          {activeTab === 'asignaciones' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="font-bold text-blue-900 mb-4">🏭 Asignar a Activo</h3>
                  <div className="space-y-3">
                    <select
                      value={asignacionActivoData.epp_id}
                      onChange={(e) => setAsignacionActivoData({ ...asignacionActivoData, epp_id: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2"
                    >
                      <option value="">EPP...</option>
                      {epp.map(item => (
                        <option key={item.id} value={item.id}>{item.nombre}</option>
                      ))}
                    </select>
                    <select
                      value={asignacionActivoData.asset_id}
                      onChange={(e) => setAsignacionActivoData({ ...asignacionActivoData, asset_id: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2"
                    >
                      <option value="">Activo...</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.codigo} - {a.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={asignacionActivoData.cantidad}
                      onChange={(e) => setAsignacionActivoData({ ...asignacionActivoData, cantidad: e.target.value })}
                      placeholder="Cantidad"
                      className="w-full border rounded-lg px-4 py-2"
                      min="1"
                    />
                    <textarea
                      value={asignacionActivoData.observaciones}
                      onChange={(e) => setAsignacionActivoData({ ...asignacionActivoData, observaciones: e.target.value })}
                      placeholder="Observaciones"
                      className="w-full border rounded-lg px-4 py-2 text-sm"
                      rows="2"
                    />
                    <button
                      onClick={() => handleAsignacion('activo')}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                    >
                      ✓ Asignar a Activo
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                  <h3 className="font-bold text-purple-900 mb-4">👤 Asignar a Empleado</h3>
                  <div className="space-y-3">
                    <select
                      value={asignacionEmpleadoData.epp_id}
                      onChange={(e) => setAsignacionEmpleadoData({ ...asignacionEmpleadoData, epp_id: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2"
                    >
                      <option value="">EPP...</option>
                      {epp.map(item => (
                        <option key={item.id} value={item.id}>{item.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={asignacionEmpleadoData.empleado_nombre}
                      onChange={(e) => setAsignacionEmpleadoData({ ...asignacionEmpleadoData, empleado_nombre: e.target.value })}
                      placeholder="Nombre del Empleado"
                      className="w-full border rounded-lg px-4 py-2"
                    />
                    <input
                      type="number"
                      value={asignacionEmpleadoData.cantidad}
                      onChange={(e) => setAsignacionEmpleadoData({ ...asignacionEmpleadoData, cantidad: e.target.value })}
                      placeholder="Cantidad"
                      className="w-full border rounded-lg px-4 py-2"
                      min="1"
                    />
                    <textarea
                      value={asignacionEmpleadoData.observaciones}
                      onChange={(e) => setAsignacionEmpleadoData({ ...asignacionEmpleadoData, observaciones: e.target.value })}
                      placeholder="Observaciones"
                      className="w-full border rounded-lg px-4 py-2 text-sm"
                      rows="2"
                    />
                    <button
                      onClick={() => handleAsignacion('empleado')}
                      disabled={loading}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold"
                    >
                      ✓ Asignar a Empleado
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">Asignaciones Activas</h3>
                <div className="space-y-3">
                  {asignacionesActivas.map(asig => (
                    <div key={asig.id} className="border rounded-lg p-4 bg-white hover:shadow-lg transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{asig.epp?.nombre}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {asig.asset
                              ? `🏭 ${asig.asset?.codigo} - ${asig.asset?.nombre}`
                              : `👤 ${asig.empleado?.nombre || asig.empleado_nombre || 'Empleado'}`}
                          </p>
                          <p className="text-sm text-gray-600">Cantidad: <span className="font-semibold">{asig.cantidad}</span></p>
                          {asig.observaciones && <p className="text-xs text-gray-500 mt-2 italic">{asig.observaciones}</p>}
                        </div>
                        <button
                          onClick={() => {
                            supabase.from('epp_asignaciones').update({
                              estado: 'DEVUELTO',
                              fecha_devolucion: new Date().toISOString().split('T')[0],
                            }).eq('id', asig.id).then(() => {
                              toast.success('Devolución registrada');
                              loadAllData();
                            });
                          }}
                          className="bg-green-100 text-green-700 px-3 py-2 rounded text-sm font-semibold hover:bg-green-200"
                        >
                          ✓ Devolver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TRANSFERENCIAS */}
          {activeTab === 'transferencias' && (
            <div className="max-w-2xl">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">🔄 Transferencia de EPP entre Almacenes</h3>
                <div className="space-y-4">
                  <select
                    value={transferData.epp_id}
                    onChange={(e) => setTransferData({ ...transferData, epp_id: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Seleccionar EPP...</option>
                    {epp.map(item => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Almacén Origen</label>
                      <select
                        value={transferData.almacen_origen}
                        onChange={(e) => setTransferData({ ...transferData, almacen_origen: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2"
                      >
                        <option value="">Seleccionar...</option>
                        {almacenes.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Almacén Destino</label>
                      <select
                        value={transferData.almacen_destino}
                        onChange={(e) => setTransferData({ ...transferData, almacen_destino: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2"
                      >
                        <option value="">Seleccionar...</option>
                        {almacenes.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    type="number"
                    value={transferData.cantidad}
                    onChange={(e) => setTransferData({ ...transferData, cantidad: e.target.value })}
                    placeholder="Cantidad a transferir"
                    className="w-full border rounded-lg px-4 py-2"
                    min="1"
                  />

                  <textarea
                    value={transferData.observaciones}
                    onChange={(e) => setTransferData({ ...transferData, observaciones: e.target.value })}
                    placeholder="Observaciones (opcional)"
                    className="w-full border rounded-lg px-4 py-2 text-sm"
                    rows="3"
                  />

                  <button
                    onClick={handleTransferencia}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold text-lg"
                  >
                    🔄 Realizar Transferencia
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REQUISICIONES */}
          {activeTab === 'requisiciones' && (
            <div className="space-y-6">
              <div className="max-w-2xl">
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4">🛒 Nueva Requisición de Compra</h3>
                  <div className="space-y-4">
                    <select
                      value={requisicionData.epp_id}
                      onChange={(e) => setRequisicionData({ ...requisicionData, epp_id: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2"
                    >
                      <option value="">Seleccionar EPP...</option>
                      {epp.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={requisicionData.cantidad_solicitada}
                      onChange={(e) => setRequisicionData({ ...requisicionData, cantidad_solicitada: e.target.value })}
                      placeholder="Cantidad a solicitar"
                      className="w-full border rounded-lg px-4 py-2"
                      min="1"
                    />
                    <textarea
                      value={requisicionData.observaciones}
                      onChange={(e) => setRequisicionData({ ...requisicionData, observaciones: e.target.value })}
                      placeholder="Observaciones"
                      className="w-full border rounded-lg px-4 py-2 text-sm"
                      rows="3"
                    />
                    <button
                      onClick={handleRequisicion}
                      disabled={loading}
                      className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-semibold text-lg"
                    >
                      ✓ Crear Requisición
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">Requisiciones Activas</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {requisicionesPendientes.map(req => (
                    <div key={req.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold">{req.epp?.nombre}</p>
                          <p className="text-sm text-gray-600">Cantidad: {req.cantidad_solicitada} | Estado: <span className="font-semibold text-orange-600">{req.estado}</span></p>
                          <p className="text-xs text-gray-500 mt-2">{new Date(req.fecha_solicitud).toLocaleDateString('es-ES')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GESTIONAR EPP */}
          {activeTab === 'gestionar' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-8">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Crear Nuevo EPP
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={newEppForm.nombre}
                      onChange={(e) => setNewEppForm({ ...newEppForm, nombre: e.target.value })}
                      placeholder="Ej: Casco de Seguridad"
                      className="w-full border border-blue-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Categoría *</label>
                    <select
                      value={newEppForm.categoria}
                      onChange={(e) => setNewEppForm({ ...newEppForm, categoria: e.target.value })}
                      className="w-full border border-blue-300 rounded-lg px-4 py-2"
                    >
                      <option value="Cascos">🪖 Cascos</option>
                      <option value="Guantes">🧤 Guantes</option>
                      <option value="Lentes">👓 Lentes</option>
                      <option value="Arneses">🪢 Arneses</option>
                      <option value="Respiradores">😷 Respiradores</option>
                      <option value="Botas">👢 Botas</option>
                      <option value="Cinturones">⚙️ Cinturones</option>
                      <option value="Extintores">🚒 Extintores</option>
                      <option value="Conos">🔺 Conos</option>
                      <option value="Kits">📦 Kits</option>
                      <option value="Otro">📋 Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Cantidad Mínima *</label>
                    <input
                      type="number"
                      value={newEppForm.cantidad_minima}
                      onChange={(e) => setNewEppForm({ ...newEppForm, cantidad_minima: e.target.value })}
                      placeholder="Ej: 10"
                      className="w-full border border-blue-300 rounded-lg px-4 py-2"
                      min="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Descripción</label>
                    <textarea
                      value={newEppForm.descripcion}
                      onChange={(e) => setNewEppForm({ ...newEppForm, descripcion: e.target.value })}
                      placeholder="Detalles del EPP (tamaño, color, material, etc.)"
                      className="w-full border border-blue-300 rounded-lg px-4 py-2 text-sm"
                      rows="3"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateEPP}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 font-semibold text-lg mt-6"
                >
                  ✓ Crear EPP
                </button>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-8">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Crear Nuevo Almacén
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Nombre del Almacén *</label>
                    <input
                      type="text"
                      value={newAlmacenForm.nombre}
                      onChange={(e) => setNewAlmacenForm({ ...newAlmacenForm, nombre: e.target.value })}
                      placeholder="Ej: Almacén de Taller"
                      className="w-full border border-green-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Ubicación</label>
                    <input
                      type="text"
                      value={newAlmacenForm.ubicacion}
                      onChange={(e) => setNewAlmacenForm({ ...newAlmacenForm, ubicacion: e.target.value })}
                      placeholder="Ej: Edificio A"
                      className="w-full border border-green-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Responsable</label>
                    <input
                      type="text"
                      value={newAlmacenForm.responsable}
                      onChange={(e) => setNewAlmacenForm({ ...newAlmacenForm, responsable: e.target.value })}
                      placeholder="Nombre del responsable"
                      className="w-full border border-green-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={newAlmacenForm.telefono}
                      onChange={(e) => setNewAlmacenForm({ ...newAlmacenForm, telefono: e.target.value })}
                      placeholder="Número de teléfono"
                      className="w-full border border-green-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Email</label>
                    <input
                      type="email"
                      value={newAlmacenForm.email}
                      onChange={(e) => setNewAlmacenForm({ ...newAlmacenForm, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full border border-green-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateAlmacen}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-semibold text-lg mt-6"
                >
                  ✓ Crear Almacén
                </button>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">📋 EPP Disponibles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {epp.map(item => (
                    <div key={item.id} className="bg-gray-50 border rounded-lg p-4 text-sm">
                      <p className="font-semibold text-gray-800">{item.nombre}</p>
                      <p className="text-xs text-blue-600">{item.categoria}</p>
                      {item.descripcion && <p className="text-xs text-gray-600 mt-2">{item.descripcion}</p>}
                      <p className="text-xs text-orange-600 mt-2">Min: {item.cantidad_minima}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HISTORIAL */}
          {activeTab === 'historial' && (
            <div>
              <h3 className="font-bold text-lg mb-4">Historial de Movimientos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                      <th className="px-4 py-3 text-left font-semibold">EPP</th>
                      <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-center font-semibold">Cantidad</th>
                      <th className="px-4 py-3 text-left font-semibold">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.slice(0, 30).map(mov => (
                      <tr key={mov.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{new Date(mov.fecha).toLocaleDateString('es-ES')}</td>
                        <td className="px-4 py-3 font-medium">{mov.epp?.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            mov.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' :
                            mov.tipo === 'SALIDA' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {mov.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{mov.cantidad > 0 ? '+' : ''}{mov.cantidad}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{mov.observaciones || '-'}</td>
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
