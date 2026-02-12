import React, { useState, useEffect } from 'react';
import { Battery, CircleDot, Plus, History, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * AssetComponentsPanel
 * Panel de componentes críticos en el sidebar del activo
 * Gestiona baterías, llantas y otros componentes sin salir del sidebar
 */
export const AssetComponentsPanel = ({ asset, currentUser }) => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBattery, setShowAddBattery] = useState(false);
  const [showAddTire, setShowAddTire] = useState(false);
  const [showHistory, setShowHistory] = useState(null); // tipo de componente

  // Formularios
  const [batteryForm, setBatteryForm] = useState({
    numero: '',
    tipo_especifico: '12V 100Ah',
    marca: '',
    modelo: '',
    serial: '',
    fecha_instalacion: new Date().toISOString().split('T')[0],
    valor_nuevo: ''
  });

  const [tireForm, setTireForm] = useState({
    numero: '',
    posicion: 'DELANTERA_IZQUIERDA',
    tipo_especifico: '',
    marca: 'Michelin',
    modelo: '',
    serial: '',
    kilometraje_instalacion: asset?.kilometer || 0,
    kilometraje_maximo: 80000,
    fecha_instalacion: new Date().toISOString().split('T')[0],
    valor_nuevo: ''
  });

  useEffect(() => {
    if (asset?.id) {
      loadComponents();
    }
  }, [asset?.id]);

  const loadComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_components')
        .select('*')
        .eq('asset_id', asset.id)
        .in('estado', ['ACTIVO', 'DESGASTADO', 'CRITICO'])
        .order('tipo', { ascending: true })
        .order('numero_identificacion', { ascending: true });

      if (error) throw error;
      setComponents(data || []);
    } catch (error) {
      console.error('Error cargando componentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBattery = async () => {
    if (!batteryForm.numero || !batteryForm.tipo_especifico) {
      toast.error('Número y tipo de batería son requeridos');
      return;
    }

    try {
      const { error } = await supabase.from('asset_components').insert([{
        asset_id: asset.id,
        tipo: 'BATERIA',
        numero_identificacion: batteryForm.numero,
        tipo_especifico: batteryForm.tipo_especifico,
        marca: batteryForm.marca || null,
        modelo: batteryForm.modelo || null,
        serial: batteryForm.serial || null,
        fecha_instalacion: batteryForm.fecha_instalacion,
        valor_nuevo: parseFloat(batteryForm.valor_nuevo) || null,
        estado: 'ACTIVO',
        created_by: currentUser?.id
      }]);

      if (error) throw error;

      toast.success(`Batería ${batteryForm.numero} agregada`);
      setBatteryForm({
        numero: '',
        tipo_especifico: '12V 100Ah',
        marca: '',
        modelo: '',
        serial: '',
        fecha_instalacion: new Date().toISOString().split('T')[0],
        valor_nuevo: ''
      });
      setShowAddBattery(false);
      loadComponents();
    } catch (error) {
      toast.error('Error al agregar batería: ' + error.message);
    }
  };

  const handleAddTire = async () => {
    if (!tireForm.numero || !tireForm.posicion || !tireForm.tipo_especifico) {
      toast.error('Número, posición y especificación son requeridos');
      return;
    }

    try {
      const { error } = await supabase.from('asset_components').insert([{
        asset_id: asset.id,
        tipo: 'LLANTA',
        numero_identificacion: tireForm.numero,
        posicion: tireForm.posicion,
        tipo_especifico: tireForm.tipo_especifico,
        marca: tireForm.marca || null,
        modelo: tireForm.modelo || null,
        serial: tireForm.serial || null,
        kilometraje_instalacion: parseInt(tireForm.kilometraje_instalacion) || 0,
        kilometraje_actual: parseInt(tireForm.kilometraje_instalacion) || 0,
        kilometraje_maximo: parseInt(tireForm.kilometraje_maximo) || 80000,
        fecha_instalacion: tireForm.fecha_instalacion,
        valor_nuevo: parseFloat(tireForm.valor_nuevo) || null,
        estado: 'ACTIVO',
        created_by: currentUser?.id
      }]);

      if (error) throw error;

      toast.success(`Llanta ${tireForm.numero} agregada`);
      setTireForm({
        numero: '',
        posicion: 'DELANTERA_IZQUIERDA',
        tipo_especifico: '',
        marca: 'Michelin',
        modelo: '',
        serial: '',
        kilometraje_instalacion: asset?.kilometer || 0,
        kilometraje_maximo: 80000,
        fecha_instalacion: new Date().toISOString().split('T')[0],
        valor_nuevo: ''
      });
      setShowAddTire(false);
      loadComponents();
    } catch (error) {
      toast.error('Error al agregar llanta: ' + error.message);
    }
  };

  const getStatusIcon = (estado, porcentaje_desgaste) => {
    if (estado === 'CRITICO' || porcentaje_desgaste > 85) return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (estado === 'DESGASTADO' || porcentaje_desgaste > 60) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const batteries = components.filter(c => c.tipo === 'BATERIA');
  const tires = components.filter(c => c.tipo === 'LLANTA');

  if (loading) return <div className="text-sm text-gray-500 p-4">Cargando componentes...</div>;

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        ⚙️ Componentes Críticos
      </h3>

      {/* Baterías */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-700">
              Baterías ({batteries.length})
            </span>
          </div>
          <button
            onClick={() => setShowAddBattery(!showAddBattery)}
            className="text-blue-600 hover:bg-blue-50 p-1 rounded transition"
            title="Agregar batería"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showAddBattery && (
          <div className="bg-blue-50 p-3 rounded-lg mb-2 space-y-2">
            <input
              type="text"
              placeholder="Número (Ej: BAT-001)"
              value={batteryForm.numero}
              onChange={(e) => setBatteryForm({...batteryForm, numero: e.target.value})}
              className="w-full px-2 py-1 text-sm border rounded"
            />
            <input
              type="text"
              placeholder="Tipo (Ej: 12V 100Ah)"
              value={batteryForm.tipo_especifico}
              onChange={(e) => setBatteryForm({...batteryForm, tipo_especifico: e.target.value})}
              className="w-full px-2 py-1 text-sm border rounded"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Marca"
                value={batteryForm.marca}
                onChange={(e) => setBatteryForm({...batteryForm, marca: e.target.value})}
                className="px-2 py-1 text-sm border rounded"
              />
              <input
                type="text"
                placeholder="Modelo"
                value={batteryForm.modelo}
                onChange={(e) => setBatteryForm({...batteryForm, modelo: e.target.value})}
                className="px-2 py-1 text-sm border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddBattery}
                className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700"
              >
                ✓ Agregar
              </button>
              <button
                onClick={() => setShowAddBattery(false)}
                className="px-3 py-1 text-gray-600 text-sm hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {batteries.map((bat) => (
            <div key={bat.id} className="bg-gray-50 rounded px-3 py-2 text-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(bat.estado, bat.porcentaje_desgaste)}
                    <span className="font-mono font-semibold text-xs bg-blue-100 px-2 py-0.5 rounded">
                      {bat.numero_identificacion}
                    </span>
                  </div>
                  <p className="text-gray-700 mt-1">{bat.tipo_especifico}</p>
                  {bat.marca && <p className="text-gray-500 text-xs">{bat.marca} {bat.modelo}</p>}
                  {bat.fecha_instalacion && (
                    <p className="text-gray-400 text-xs mt-1">
                      Inst: {new Date(bat.fecha_instalacion).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {batteries.length === 0 && !showAddBattery && (
            <p className="text-gray-400 text-xs italic">Sin baterías registradas</p>
          )}
        </div>
      </div>

      {/* Llantas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-gray-700" />
            <span className="font-semibold text-sm text-gray-700">
              Llantas ({tires.length})
            </span>
          </div>
          <button
            onClick={() => setShowAddTire(!showAddTire)}
            className="text-gray-700 hover:bg-gray-100 p-1 rounded transition"
            title="Agregar llanta"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showAddTire && (
          <div className="bg-gray-50 p-3 rounded-lg mb-2 space-y-2">
            <input
              type="text"
              placeholder="Número (Ej: LL-001)"
              value={tireForm.numero}
              onChange={(e) => setTireForm({...tireForm, numero: e.target.value})}
              className="w-full px-2 py-1 text-sm border rounded"
            />
            <select
              value={tireForm.posicion}
              onChange={(e) => setTireForm({...tireForm, posicion: e.target.value})}
              className="w-full px-2 py-1 text-sm border rounded"
            >
              <option value="DELANTERA_IZQUIERDA">Delantera Izquierda</option>
              <option value="DELANTERA_DERECHA">Delantera Derecha</option>
              <option value="TRASERA_IZQUIERDA_INTERIOR">Trasera Izq. Interior</option>
              <option value="TRASERA_IZQUIERDA_EXTERIOR">Trasera Izq. Exterior</option>
              <option value="TRASERA_DERECHA_INTERIOR">Trasera Der. Interior</option>
              <option value="TRASERA_DERECHA_EXTERIOR">Trasera Der. Exterior</option>
              <option value="REPUESTO">Repuesto</option>
              <option value="OTRO">Otra posición</option>
            </select>
            <input
              type="text"
              placeholder="Especificación (Ej: 11R22.5)"
              value={tireForm.tipo_especifico}
              onChange={(e) => setTireForm({...tireForm, tipo_especifico: e.target.value})}
              className="w-full px-2 py-1 text-sm border rounded"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Marca"
                value={tireForm.marca}
                onChange={(e) => setTireForm({...tireForm, marca: e.target.value})}
                className="px-2 py-1 text-sm border rounded"
              />
              <input
                type="number"
                placeholder="km máximo"
                value={tireForm.kilometraje_maximo}
                onChange={(e) => setTireForm({...tireForm, kilometraje_maximo: e.target.value})}
                className="px-2 py-1 text-sm border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTire}
                className="flex-1 bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium hover:bg-gray-800"
              >
                ✓ Agregar
              </button>
              <button
                onClick={() => setShowAddTire(false)}
                className="px-3 py-1 text-gray-600 text-sm hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {tires.map((tire) => {
            const kmRecorridos = (tire.kilometraje_actual || 0) - (tire.kilometraje_instalacion || 0);
            const porcentaje = tire.kilometraje_maximo ? Math.round((kmRecorridos / tire.kilometraje_maximo) * 100) : 0;
            
            return (
              <div key={tire.id} className="bg-gray-50 rounded px-3 py-2 text-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(tire.estado, porcentaje)}
                      <span className="font-mono font-semibold text-xs bg-gray-200 px-2 py-0.5 rounded">
                        {tire.numero_identificacion}
                      </span>
                      <span className="text-xs text-gray-600">
                        {tire.posicion?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1">{tire.tipo_especifico}</p>
                    {tire.marca && <p className="text-gray-500 text-xs">{tire.marca} {tire.modelo}</p>}
                    {tire.kilometraje_maximo && (
                      <p className="text-gray-400 text-xs mt-1">
                        km: {kmRecorridos.toLocaleString()} / {tire.kilometraje_maximo.toLocaleString()} ({porcentaje}%)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {tires.length === 0 && !showAddTire && (
            <p className="text-gray-400 text-xs italic">Sin llantas registradas</p>
          )}
        </div>
      </div>

      {(batteries.length > 0 || tires.length > 0) && (
        <button
          onClick={() => setShowHistory('ALL')}
          className="w-full mt-3 text-xs text-indigo-600 hover:bg-indigo-50 py-2 rounded flex items-center justify-center gap-1"
        >
          <History className="w-3 h-3" />
          Ver historial de cambios
        </button>
      )}
    </div>
  );
};
