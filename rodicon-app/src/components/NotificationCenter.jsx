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
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
        title="Notificaciones"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modal de notificaciones */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-end">
          <div
            className="bg-white w-96 max-h-[600px] shadow-2xl overflow-hidden flex flex-col rounded-lg m-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-white" />
                <h3 className="text-white font-bold">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full">
                    {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-orange-700 rounded transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Filtros */}
            <div className="border-b p-3 flex gap-2 flex-wrap bg-gray-50">
              <button
                onClick={() => setFilterType(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  filterType === null
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-500'
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
                        ? 'bg-orange-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-500'
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
                <div className="divide-y">
                  {filtered.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition ${
                        notification.leida
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {getIconForType(notification.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <h4 className="font-semibold text-gray-800 text-sm flex-1 break-words">
                              {notification.titulo}
                            </h4>
                            {!notification.leida && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.contenido}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span className="bg-gray-200 px-2 py-1 rounded">
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
                          className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {unreadCount > 0 && (
              <div className="border-t p-3 bg-gray-50">
                <button
                  onClick={onMarkAllAsRead}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-orange-600 transition flex items-center justify-center gap-2"
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
