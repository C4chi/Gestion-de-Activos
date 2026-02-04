import React from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * Componente para gestionar suscripción a notificaciones push
 */
export const NotificationToggle = ({ userId }) => {
  const {
    supported,
    permission,
    isSubscribed,
    enableNotifications,
    unsubscribe,
  } = usePushNotifications(userId);

  if (!supported) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 px-3 py-2 bg-gray-100 rounded-lg">
        <AlertCircle className="w-4 h-4" />
        <span>Notificaciones no disponibles en este navegador</span>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        // toast.success('Notificaciones desactivadas');
      }
    } else {
      const subscription = await enableNotifications();
      if (subscription) {
        // toast.success('¡Notificaciones activadas! Recibirás alertas importantes.');
      } else {
        // toast.error('No se pudo activar notificaciones. Verifica los permisos del navegador.');
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition ${
        isSubscribed
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={isSubscribed ? 'Desactivar notificaciones' : 'Activar notificaciones'}
    >
      {isSubscribed ? (
        <>
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">Notificaciones: ON</span>
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4" />
          <span className="hidden sm:inline">Notificaciones: OFF</span>
        </>
      )}
    </button>
  );
};
