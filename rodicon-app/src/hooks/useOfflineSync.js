import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getOfflineQueue, syncOfflineQueue, isOnline } from '../utils/offlineSync';

/**
 * Hook que detecta cambios en la conexión y sincroniza
 * cambios offline cuando se restaura la conexión
 */
export const useOfflineSync = (supabaseClient) => {
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Actualizar estado de conexión
    const handleOnline = async () => {
      setIsConnected(true);
      toast.success('✅ Conexión restaurada');
      
      // Sincronizar cambios pendientes
      await performSync();
    };

    const handleOffline = () => {
      setIsConnected(false);
      toast.error('⚠️ Sin conexión - Los cambios se sincronizarán cuando tengas señal');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar queue inicial
    setOfflineQueue(getOfflineQueue());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performSync = async () => {
    if (syncing || !isOnline()) return;
    
    setSyncing(true);
    try {
      const result = await syncOfflineQueue(supabaseClient);
      if (result.synced > 0) {
        toast.success(`✅ ${result.synced} cambio(s) sincronizado(s)`);
      }
      setOfflineQueue(getOfflineQueue());
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  return {
    offlineQueue,
    isConnected,
    syncing,
    performSync
  };
};
