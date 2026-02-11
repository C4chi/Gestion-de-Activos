import React, { useEffect, useState } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { useAppContext } from './AppContext';
import { Users, Plus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export const UserAdminPanel = ({ onClose }) => {
  const { appUsers, fetchAppUsers, createAppUser, updateAppUser, can } = useAppContext();
  const isAdminGlobal = can(['ADMIN_GLOBAL']);
  const canCreate = can(['ADMIN', 'ADMIN_GLOBAL']);
  const [form, setForm] = useState({ nombre: '', nombre_usuario: '', pin: '', rol: 'LECTOR' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (canCreate) {
      fetchAppUsers();
    }
  }, [fetchAppUsers, canCreate]);

  if (!canCreate) {
    return (
      <FullScreenModal title="👥 Gestión de Usuarios" color="indigo" onClose={onClose}>
        <div className="text-center py-12 text-gray-500 font-semibold">
          No tienes permiso para acceder a este panel.
        </div>
      </FullScreenModal>
    );
  }

  const handleSubmit = async () => {
    // Validaciones
    if (!form.nombre_usuario?.trim()) {
      toast.error('El nombre de usuario es requerido');
      return;
    }
    if (form.nombre_usuario.length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(form.nombre_usuario)) {
      toast.error('El nombre de usuario solo puede contener letras, números, punto, guión y guión bajo');
      return;
    }
    if (!form.pin || form.pin.length !== 4) {
      toast.error('El PIN debe tener exactamente 4 dígitos');
      return;
    }

    // Si está editando pero no es Admin Global, bloquear
    if (editingId && !isAdminGlobal) {
      toast.error('Solo Admin Global puede editar usuarios');
      return;
    }
    setLoading(true);
    const action = editingId ? updateAppUser(editingId, form) : createAppUser(form);
    const ok = await action;
    if (ok) {
      setForm({ nombre: '', nombre_usuario: '', pin: '', rol: 'LECTOR' });
      setEditingId(null);
    }
    setLoading(false);
  };

  const handleSelectUser = (user) => {
    if (!isAdminGlobal) return; // Solo Admin Global puede editar
    setEditingId(user.id);
    setForm({ 
      nombre: user.nombre || '', 
      nombre_usuario: user.nombre_usuario || '', 
      pin: user.pin || '', 
      rol: user.rol || 'LECTOR' 
    });
  };

  return (
    <FullScreenModal title="👥 Gestión de Usuarios" color="indigo" onClose={onClose}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-800">Usuarios actuales</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {appUsers && appUsers.length > 0 ? (
              appUsers.map((u) => (
                <button
                  key={u.id}
                  className={`w-full flex items-start justify-between py-3 text-left transition ${editingId === u.id ? 'bg-indigo-50 rounded-lg px-3' : 'hover:bg-gray-50'} ${!isAdminGlobal ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={() => handleSelectUser(u)}
                  disabled={!isAdminGlobal}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{u.nombre || 'Sin nombre'}</p>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono">@{u.nombre_usuario || '—'}</span>
                    </div>
                    {isAdminGlobal && <p className="text-xs text-gray-500 mt-1">PIN: {u.pin}</p>}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold uppercase">{u.rol}</span>
                </button>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">No hay usuarios cargados</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Editar usuario' : 'Crear usuario'}</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">👤 Nombre de usuario *</label>
              <input
                type="text"
                value={form.nombre_usuario}
                onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value.toLowerCase().trim() })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ej: juan.perez"
                disabled={editingId !== null && !isAdminGlobal}
              />
              <p className="text-xs text-gray-500 mt-1">3-50 caracteres: letras, números, punto, guión</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">PIN (4 dígitos) *</label>
              <input
                type="password"
                value={form.pin}
                maxLength={4}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0000"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LECTOR">LECTOR - Solo lectura</option>
                <option value="TALLER">TALLER - Crea requisiciones, registra mantenimiento</option>
                <option value="COMPRAS">COMPRAS - Cotiza, ordena, recibe</option>
                <option value="HSE">HSE - Seguridad y salud</option>
                <option value="GERENTE">GERENTE - Ver módulos (sin aprobar)</option>
                <option value="GERENTE_TALLER">GERENTE_TALLER - Aprueba cotizaciones ⭐</option>
                <option value="ADMIN">ADMIN - Administrador local</option>
                {isAdminGlobal && <option value="ADMIN_GLOBAL">ADMIN_GLOBAL - Super administrador</option>}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {form.rol === 'GERENTE_TALLER' && '⭐ Único rol que puede aprobar cotizaciones de compras'}
                {form.rol === 'GERENTE' && 'ℹ️ Solo puede ver, no aprobar cotizaciones'}
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {editingId ? 'Guardar cambios' : 'Crear usuario'}
            </button>

            {editingId && (
              <button
                onClick={() => { setEditingId(null); setForm({ nombre: '', nombre_usuario: '', pin: '', rol: 'LECTOR' }); }}
                className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
};
