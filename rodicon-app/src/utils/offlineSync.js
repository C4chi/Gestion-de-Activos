/**
 * Sistema de sincronización offline
 * Almacena cambios en localStorage cuando no hay conexión
 * y los sincroniza cuando la conexión se restaura
 */

const OFFLINE_QUEUE_KEY = 'rodicon_offline_queue';
const OFFLINE_METADATA_KEY = 'rodicon_offline_metadata';

/**
 * Añade una operación a la cola offline
 */
export const addOfflineOperation = (operation) => {
  const queue = getOfflineQueue();
  const timestamp = new Date().toISOString();
  const item = {
    id: `${Date.now()}-${Math.random()}`,
    timestamp,
    ...operation,
    status: 'pending'
  };
  
  queue.push(item);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  
  // Emit evento para que components sepan que hay cambios offline
  window.dispatchEvent(new CustomEvent('offlineQueueUpdated', { detail: queue }));
  
  return item;
};

/**
 * Obtiene la cola de operaciones pendientes
 */
export const getOfflineQueue = () => {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (err) {
    console.error('Error reading offline queue:', err);
    return [];
  }
};

/**
 * Limpia la cola de operaciones offline
 */
export const clearOfflineQueue = () => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  window.dispatchEvent(new CustomEvent('offlineQueueUpdated', { detail: [] }));
};

/**
 * Marca una operación como completada
 */
export const removeOfflineOperation = (operationId) => {
  const queue = getOfflineQueue();
  const filtered = queue.filter(op => op.id !== operationId);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent('offlineQueueUpdated', { detail: filtered }));
};

/**
 * Guarda datos de inspección para sincronizar después
 * @param {Object} inspectionData - Datos de la inspección
 */
export const saveInspectionOffline = (inspectionData) => {
  return addOfflineOperation({
    type: 'INSPECTION_SUBMIT',
    data: inspectionData,
    syncAttempts: 0
  });
};

/**
 * Guarda una foto localmente para sincronizar después
 */
export const savePhotoOffline = (ficha, photoData) => {
  return addOfflineOperation({
    type: 'PHOTO_UPLOAD',
    ficha,
    photoData, // Base64 encoded
    syncAttempts: 0
  });
};

/**
 * Hook para escuchar cambios en la cola offline
 */
export const useOfflineQueue = (callback) => {
  const handleQueueUpdate = (event) => {
    callback(event.detail);
  };

  React.useEffect(() => {
    // Inicial
    callback(getOfflineQueue());
    
    // Listener
    window.addEventListener('offlineQueueUpdated', handleQueueUpdate);
    return () => window.removeEventListener('offlineQueueUpdated', handleQueueUpdate);
  }, [callback]);
};

/**
 * Verifica si hay conexión a internet
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Sincroniza operaciones pendientes con el servidor
 */
export const syncOfflineQueue = async (supabaseClient) => {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) return { synced: 0, failed: 0 };
  
  let synced = 0;
  let failed = 0;
  
  for (const operation of queue) {
    try {
      if (operation.type === 'INSPECTION_SUBMIT') {
        // Sincronizar inspección HSE
        const { data, error } = await supabaseClient
          .from('safety_reports')
          .insert([operation.data]);
        
        if (error) throw error;
        synced++;
        removeOfflineOperation(operation.id);
        
      } else if (operation.type === 'PHOTO_UPLOAD') {
        // Aquí iría la lógica de sincronización de foto
        // Por ahora solo marcar como completada
        synced++;
        removeOfflineOperation(operation.id);
      }
    } catch (err) {
      console.error(`Error syncing operation ${operation.id}:`, err);
      failed++;
      
      // Incrementar intentos de sincronización
      const queue = getOfflineQueue();
      const updated = queue.map(op => 
        op.id === operation.id 
          ? { ...op, syncAttempts: (op.syncAttempts || 0) + 1 }
          : op
      );
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    }
  }
  
  return { synced, failed };
};
