import React, { useEffect, useMemo, useState } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { useAppContext } from './AppContext';
import { Users, Plus, Shield, Search, Pencil, RotateCcw, UserX, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = { nombre: '', nombre_usuario: '', pin: '', rol: 'LECTOR' };

const normalizeUsername = (value) => String(value || '').toLowerCase().trim();

const roleBadgeClass = (rol) => {
  const role = String(rol || '').toUpperCase();
  if (role === 'ADMIN_GLOBAL' || role === 'ADMIN') return 'bg-red-50 text-red-700';
  if (role === 'GERENTE' || role === 'GERENTE_TALLER') return 'bg-indigo-50 text-indigo-700';
  if (role === 'HSE') return 'bg-blue-50 text-blue-700';
  if (role === 'COMPRAS') return 'bg-emerald-50 text-emerald-700';
  if (role === 'TALLER') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-700';
};

const validateUserForm = (form, users, editingId) => {
  const validationErrors = {};
  const username = normalizeUsername(form.nombre_usuario);

  if (!username) {
    validationErrors.nombre_usuario = 'El nombre de usuario es requerido';
  } else if (username.length < 3) {
    validationErrors.nombre_usuario = 'Debe tener al menos 3 caracteres';
  } else if (username.length > 50) {
    validationErrors.nombre_usuario = 'Debe tener máximo 50 caracteres';
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    validationErrors.nombre_usuario = 'Solo se permiten letras, números, punto, guión y guión bajo';
  } else {
    const usernameExists = (users || []).some(
      (u) => normalizeUsername(u.nombre_usuario) === username && u.id !== editingId
    );
    if (usernameExists) {
      validationErrors.nombre_usuario = 'Este nombre de usuario ya existe';
    }
  }

  if (!/^\d{4}$/.test(String(form.pin || ''))) {
    validationErrors.pin = 'El PIN debe tener exactamente 4 dígitos';
  }

  if (!form.rol) {
    validationErrors.rol = 'Selecciona un rol';
  }

  return validationErrors;
};

export const UserAdminPanel = ({ onClose }) => {
  const { appUsers, fetchAppUsers, createAppUser, updateAppUser, can, user } = useAppContext();
  const isAdminGlobal = can(['ADMIN_GLOBAL']);
  const canCreate = can(['ADMIN', 'ADMIN_GLOBAL']);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState({});
  const [statusBanner, setStatusBanner] = useState(null);
  const [rowActionLoading, setRowActionLoading] = useState({ userId: null, action: null });
  const [undoDeactivateData, setUndoDeactivateData] = useState(null);

  const pageSize = 8;

  const validationErrors = useMemo(
    () => validateUserForm(form, appUsers, editingId),
    [form, appUsers, editingId]
  );

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  useEffect(() => {
    if (canCreate) {
      fetchAppUsers();
    }
  }, [fetchAppUsers, canCreate]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const users = Array.isArray(appUsers) ? [...appUsers] : [];

    const filtered = users.filter((u) => {
      const roleMatches = roleFilter === 'ALL' || u.rol === roleFilter;
      if (!roleMatches) return false;

      if (!term) return true;
      const nombre = String(u.nombre || '').toLowerCase();
      const username = String(u.nombre_usuario || '').toLowerCase();
      const role = String(u.rol || '').toLowerCase();
      return nombre.includes(term) || username.includes(term) || role.includes(term);
    });

    filtered.sort((a, b) => {
      const aNombre = String(a.nombre || '').toLowerCase();
      const bNombre = String(b.nombre || '').toLowerCase();
      const aUser = String(a.nombre_usuario || '').toLowerCase();
      const bUser = String(b.nombre_usuario || '').toLowerCase();
      const aRole = String(a.rol || '').toLowerCase();
      const bRole = String(b.rol || '').toLowerCase();

      switch (sortBy) {
        case 'name_desc':
          return bNombre.localeCompare(aNombre);
        case 'username_asc':
          return aUser.localeCompare(bUser);
        case 'username_desc':
          return bUser.localeCompare(aUser);
        case 'role_asc':
          return aRole.localeCompare(bRole);
        case 'role_desc':
          return bRole.localeCompare(aRole);
        case 'name_asc':
        default:
          return aNombre.localeCompare(bNombre);
      }
    });

    return filtered;
  }, [appUsers, searchTerm, roleFilter, sortBy]);

  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, sortBy]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const setFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getRandomPin = () => String(Math.floor(1000 + Math.random() * 9000));

  const showError = (field) => Boolean((submitAttempted || touched[field]) && validationErrors[field]);

  const clearForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSubmitAttempted(false);
    setTouched({});
  };

  const handleSubmit = async () => {
    if (loading) return;

    setSubmitAttempted(true);

    if (hasValidationErrors) {
      toast.error('Revisa los campos del formulario');
      setStatusBanner({ type: 'error', text: 'Hay errores de validación. Corrige los campos marcados.' });
      return;
    }

    if (editingId && !isAdminGlobal) {
      toast.error('Solo Admin Global puede editar usuarios');
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      nombre_usuario: normalizeUsername(form.nombre_usuario),
    };

    const ok = editingId
      ? await updateAppUser(editingId, payload)
      : await createAppUser(payload);

    if (ok) {
      clearForm();
      setStatusBanner({
        type: 'success',
        text: editingId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.'
      });
    } else {
      setStatusBanner({
        type: 'error',
        text: editingId ? 'No se pudo actualizar el usuario.' : 'No se pudo crear el usuario.'
      });
    }

    setLoading(false);
  };

  const handleSelectUser = (targetUser) => {
    if (!isAdminGlobal) return;

    setEditingId(targetUser.id);
    setForm({
      nombre: targetUser.nombre || '',
      nombre_usuario: targetUser.nombre_usuario || '',
      pin: targetUser.pin || '',
      rol: targetUser.rol || 'LECTOR'
    });
    setSubmitAttempted(false);
    setTouched({});
  };

  const handleResetPin = async (targetUser) => {
    if (!isAdminGlobal) return;
    if (!window.confirm(`¿Restablecer PIN para ${targetUser.nombre || targetUser.nombre_usuario}?`)) return;

    const newPin = getRandomPin();
    setRowActionLoading({ userId: targetUser.id, action: 'reset_pin' });

    const ok = await updateAppUser(targetUser.id, { pin: newPin });
    if (ok) {
      setStatusBanner({
        type: 'success',
        text: `PIN restablecido para @${targetUser.nombre_usuario}. Nuevo PIN: ${newPin}`
      });
      toast.success('PIN restablecido');
    }

    setRowActionLoading({ userId: null, action: null });
  };

  const handleDeactivate = async (targetUser) => {
    if (!isAdminGlobal) return;

    if (user?.id === targetUser.id) {
      toast.error('No puedes desactivar tu propio usuario');
      return;
    }

    const confirmed = window.confirm(
      `¿Desactivar el acceso de @${targetUser.nombre_usuario}?\n\nSe cambiará a rol LECTOR y se invalidará su PIN actual.`
    );
    if (!confirmed) return;

    const lockedPin = getRandomPin();
    setRowActionLoading({ userId: targetUser.id, action: 'deactivate' });

    const ok = await updateAppUser(targetUser.id, { rol: 'LECTOR', pin: lockedPin });
    if (ok) {
      setUndoDeactivateData({
        id: targetUser.id,
        nombreUsuario: targetUser.nombre_usuario,
        prevRol: targetUser.rol,
        prevPin: targetUser.pin || null,
      });

      setStatusBanner({
        type: 'success',
        text: `Usuario @${targetUser.nombre_usuario} desactivado (acceso bloqueado).`
      });
      toast.success('Usuario desactivado');
    }

    setRowActionLoading({ userId: null, action: null });
  };

  const handleUndoDeactivate = async () => {
    if (!undoDeactivateData?.id || !undoDeactivateData?.prevPin) {
      toast.error('No hay datos suficientes para deshacer');
      return;
    }

    setRowActionLoading({ userId: undoDeactivateData.id, action: 'undo_deactivate' });

    const ok = await updateAppUser(undoDeactivateData.id, {
      rol: undoDeactivateData.prevRol,
      pin: undoDeactivateData.prevPin,
    });

    if (ok) {
      setStatusBanner({
        type: 'success',
        text: `Desactivación revertida para @${undoDeactivateData.nombreUsuario}.`
      });
      setUndoDeactivateData(null);
      toast.success('Desactivación revertida');
    }

    setRowActionLoading({ userId: null, action: null });
  };

  if (!canCreate) {
    return (
      <FullScreenModal title="👥 Gestión de Usuarios" color="indigo" onClose={onClose}>
        <div className="text-center py-12 text-gray-500 font-semibold">
          No tienes permiso para acceder a este panel.
        </div>
      </FullScreenModal>
    );
  }

  return (
    <FullScreenModal title="👥 Gestión de Usuarios" color="indigo" onClose={onClose}>
      <div className="space-y-4">
        {statusBanner && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-3 ${
              statusBanner.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <span>{statusBanner.text}</span>
            {undoDeactivateData?.prevPin && (
              <button
                onClick={handleUndoDeactivate}
                disabled={rowActionLoading.action === 'undo_deactivate'}
                className="text-xs font-semibold underline disabled:opacity-50"
              >
                {rowActionLoading.action === 'undo_deactivate' ? 'Revirtiendo...' : 'Deshacer'}
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-800">Usuarios actuales</h3>
              </div>
              <p className="text-sm text-gray-500 font-medium">{totalUsers} usuario(s)</p>
            </div>

            <div className="sticky top-0 z-10 bg-white pb-3 space-y-2 border-b border-gray-100 mb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, usuario o rol..."
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Todos los roles</option>
                  <option value="LECTOR">LECTOR</option>
                  <option value="TALLER">TALLER</option>
                  <option value="COMPRAS">COMPRAS</option>
                  <option value="HSE">HSE</option>
                  <option value="GERENTE">GERENTE</option>
                  <option value="GERENTE_TALLER">GERENTE_TALLER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="ADMIN_GLOBAL">ADMIN_GLOBAL</option>
                </select>

                <div className="relative">
                  <ArrowUpDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="name_asc">Nombre A-Z</option>
                    <option value="name_desc">Nombre Z-A</option>
                    <option value="username_asc">Usuario A-Z</option>
                    <option value="username_desc">Usuario Z-A</option>
                    <option value="role_asc">Rol A-Z</option>
                    <option value="role_desc">Rol Z-A</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((u) => {
                  const isRowBusy = rowActionLoading.userId === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 transition ${
                        editingId === u.id ? 'bg-indigo-50 rounded-lg px-3' : 'hover:bg-gray-50 px-1 sm:px-2 rounded-lg'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800 truncate">{u.nombre || 'Sin nombre'}</p>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono">
                            @{u.nombre_usuario || '—'}
                          </span>
                        </div>
                        {isAdminGlobal && <p className="text-xs text-gray-500 mt-1">PIN: {u.pin || '****'}</p>}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${roleBadgeClass(u.rol)}`}>
                          {u.rol}
                        </span>

                        {isAdminGlobal && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSelectUser(u)}
                              className="p-1.5 rounded-md border border-gray-200 hover:bg-white"
                              title="Editar usuario"
                              disabled={isRowBusy}
                            >
                              <Pencil className="w-4 h-4 text-gray-700" />
                            </button>

                            <button
                              onClick={() => handleResetPin(u)}
                              className="p-1.5 rounded-md border border-gray-200 hover:bg-white disabled:opacity-50"
                              title="Restablecer PIN"
                              disabled={isRowBusy}
                            >
                              <RotateCcw className="w-4 h-4 text-gray-700" />
                            </button>

                            <button
                              onClick={() => handleDeactivate(u)}
                              className="p-1.5 rounded-md border border-red-200 hover:bg-red-50 disabled:opacity-50"
                              title="Desactivar acceso"
                              disabled={isRowBusy}
                            >
                              <UserX className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">No hay usuarios para los filtros aplicados</div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">Página {currentPage} de {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
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
                  onChange={(e) => setFormField('nombre', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de usuario *</label>
                <input
                  type="text"
                  value={form.nombre_usuario}
                  onChange={(e) => setFormField('nombre_usuario', normalizeUsername(e.target.value))}
                  onBlur={() => markTouched('nombre_usuario')}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                    showError('nombre_usuario') ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                  placeholder="ej: juan.perez"
                  disabled={editingId !== null && !isAdminGlobal}
                />
                <p className="text-xs text-gray-500 mt-1">3-50 caracteres: letras, números, punto, guión, guión bajo</p>
                {showError('nombre_usuario') && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.nombre_usuario}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">PIN (4 dígitos) *</label>
                <input
                  type="password"
                  value={form.pin}
                  maxLength={4}
                  onChange={(e) => setFormField('pin', e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => markTouched('pin')}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                    showError('pin') ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                  placeholder="0000"
                  inputMode="numeric"
                />
                {showError('pin') && <p className="text-xs text-red-600 mt-1">{validationErrors.pin}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setFormField('rol', e.target.value)}
                  onBlur={() => markTouched('rol')}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                    showError('rol') ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
                  }`}
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
                {showError('rol') && <p className="text-xs text-red-600 mt-1">{validationErrors.rol}</p>}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || hasValidationErrors}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear usuario'}
              </button>

              {editingId && (
                <button
                  onClick={clearForm}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
};
