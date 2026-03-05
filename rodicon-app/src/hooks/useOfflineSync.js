import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getOfflineQueue, syncOfflineQueue, isOnline, OFFLINE_QUEUE_EVENT } from '../utils/offlineSync';

/**
 * Hook que detecta cambios en la conexión y sincroniza
 * cambios offline cuando se restaura la conexión
 */
export const useOfflineSync = () => {
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isConnected, setIsConnected] = useState(isOnline());
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

    const handleQueueUpdate = (event) => {
      setOfflineQueue(event.detail || []);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueUpdate);

    // Cargar queue inicial
    setOfflineQueue(getOfflineQueue());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueUpdate);
    };
  }, []);

  const performSync = async () => {
    if (syncing || !isOnline()) return;
    
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
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
    pendingCount: offlineQueue.length,
    isConnected,
    syncing,
    performSync
  };
};
