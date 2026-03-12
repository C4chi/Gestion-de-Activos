import React, { useState } from 'react';
import { Bell, X, Trash2, Check } from 'lucide-react';
import { getIconForType } from '../hooks/useNotifications';

/**
 * NotificationCenter
 * Componente para mostrar notificaciones en la UI
 * Incluye badge con contador y modal de notificaciones
 */
export const NotificationCenter = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState(null);

  const filtered = filterType
    ? notifications.filter(n => n.tipo === filterType)
    : notifications;

  const handleNotificationClick = (notification) => {
    if (!notification.leida) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <>
      {/* Badge y botón */}
      <button
        onClick={() => setShowModal(!showModal)}
        className="relative p-2.5 text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition border border-slate-200 shadow-sm"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-indigo-600" />
        {unreadCount > 0 && <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modal de notificaciones */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-start justify-end">
          <div
            className="bg-white/95 backdrop-blur w-[390px] max-h-[620px] shadow-2xl overflow-hidden flex flex-col rounded-2xl m-3 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-white" />
                <h3 className="text-white font-bold">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="bg-white text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">
                    {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-indigo-700 rounded transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Filtros */}
            <div className="border-b p-3 flex gap-2 flex-wrap bg-slate-50">
              <button
                onClick={() => setFilterType(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  filterType === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-indigo-400'
                }`}
              >
                Todas
              </button>
              {['HSE', 'COMPRAS', 'TALLER', 'GENERAL'].map((type) => {
                const count = notifications.filter(n => n.tipo === type).length;
                return count > 0 ? (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      filterType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {getIconForType(type)} {type} ({count})
                  </button>
                ) : null;
              })}
            </div>

            {/* Lista de notificaciones */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filtered.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        notification.leida
                          ? 'bg-white border-slate-200 hover:bg-slate-50'
                          : 'bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100/70'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-xl flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          {getIconForType(notification.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <h4 className="font-semibold text-slate-800 text-sm flex-1 break-words">
                              {notification.titulo}
                            </h4>
                            {!notification.leida && (
                              <span className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-2" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {notification.contenido}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <span className="bg-slate-200 px-2 py-1 rounded">
                              {notification.tipo}
                            </span>
                            <span>
                              {new Date(notification.fecha_creacion).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
                          }}
                          className="flex-shrink-0 p-1 hover:bg-rose-100 rounded transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {unreadCount > 0 && (
              <div className="border-t p-3 bg-slate-50">
                <button
                  onClick={onMarkAllAsRead}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Marcar todas como leídas
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cerrar modal al hacer clic afuera */}
      {showModal && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowModal(false)}
        />
      )}
    </>
  );
};
