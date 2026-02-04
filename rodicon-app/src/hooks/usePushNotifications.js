import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para gestionar notificaciones push
 * Solicita permisos, suscribe al usuario y gestiona las notificaciones
 */
export const usePushNotifications = (userId) => {
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Verificar soporte
    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(isPushSupported);

    if (isPushSupported && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Solicitar permiso para notificaciones
   */
  const requestPermission = useCallback(async () => {
    if (!supported) {
      console.warn('Push notifications no soportadas en este navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        console.log('✅ Permisos de notificación otorgados');
        return true;
      } else {
        console.log('❌ Permisos de notificación denegados');
        return false;
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      return false;
    }
  }, [supported]);

  /**
   * Suscribir a notificaciones push
   */
  const subscribe = useCallback(async () => {
    if (!supported || permission !== 'granted') {
      console.warn('No se puede suscribir: soporte o permisos faltantes');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Verificar si ya hay una suscripción
      let pushSubscription = await registration.pushManager.getSubscription();

      if (!pushSubscription) {
        // Crear nueva suscripción
        // NOTA: Necesitarás generar VAPID keys en producción
        // const vapidPublicKey = 'TU_CLAVE_PUBLICA_VAPID';
        // const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // applicationServerKey: convertedKey
        });

        console.log('✅ Nueva suscripción push creada');
      }

      // Guardar suscripción en Supabase
      if (userId && pushSubscription) {
        const subscriptionData = JSON.stringify(pushSubscription);
        
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            subscription: subscriptionData,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error guardando suscripción:', error);
        } else {
          console.log('✅ Suscripción guardada en BD');
        }
      }

      setSubscription(pushSubscription);
      return pushSubscription;

    } catch (error) {
      console.error('Error al suscribirse:', error);
      return null;
    }
  }, [supported, permission, userId]);

  /**
   * Desuscribir de notificaciones
   */
  const unsubscribe = useCallback(async () => {
    if (!subscription) return true;

    try {
      await subscription.unsubscribe();
      
      // Remover de BD
      if (userId) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }

      setSubscription(null);
      console.log('✅ Desuscripción exitosa');
      return true;
    } catch (error) {
      console.error('Error al desuscribirse:', error);
      return false;
    }
  }, [subscription, userId]);

  /**
   * Solicitar permisos y suscribir en un paso
   */
  const enableNotifications = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (hasPermission) {
      return await subscribe();
    }
    return null;
  }, [requestPermission, subscribe]);

  return {
    supported,
    permission,
    subscription,
    isSubscribed: !!subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    enableNotifications,
  };
};

// Función auxiliar para convertir VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
