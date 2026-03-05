import { createInspection, completeInspection } from '../services/hseService';
import { createSafetyReport } from '../services/safetyService';
import { loadPayloadFromDb, removePayloadFromDb, savePayloadToDb } from './offlineDb';

const OFFLINE_QUEUE_KEY = 'rodicon_offline_queue_v2';
const OFFLINE_QUEUE_EVENT = 'offlineQueueUpdated';
const INLINE_PAYLOAD_MAX_LENGTH = 12000;

const getDeviceId = () => {
  const key = 'rodicon_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(key, created);
  return created;
};

const readQueue = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading offline queue:', error);
    return [];
  }
};

const writeQueue = (queue) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT, { detail: queue }));
};

const markOperationAttempt = (operationId, errorMessage) => {
  const queue = readQueue();
  const updated = queue.map((operation) => {
    if (operation.id !== operationId) return operation;

    const nextAttemptNumber = (operation.attempts || 0) + 1;
    const backoffMs = Math.min(300000, 15000 * (2 ** (nextAttemptNumber - 1)));
    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    return {
      ...operation,
      attempts: nextAttemptNumber,
      lastAttemptAt: new Date().toISOString(),
      lastError: errorMessage || 'Error desconocido',
      nextRetryAt,
      status: 'pending'
    };
  });

  writeQueue(updated);
};

export const isOnline = () => navigator.onLine;

export const getOfflineQueue = () => readQueue();

export const getOfflineQueueCount = () => readQueue().length;

export const clearOfflineQueue = () => writeQueue([]);

export const removeOfflineOperation = async (operationId) => {
  const queue = readQueue();
  const target = queue.find((operation) => operation.id === operationId);

  if (target?.payloadRef) {
    try {
      await removePayloadFromDb(target.payloadRef);
    } catch (error) {
      console.warn('Could not remove offline payload from IndexedDB:', error);
    }
  }

  const filtered = queue.filter((operation) => operation.id !== operationId);
  writeQueue(filtered);
};

export const addOfflineOperation = async (operation) => {
  const queue = readQueue();

  let data = operation.data;
  let payloadRef = null;

  try {
    const serialized = JSON.stringify(operation.data);
    if (serialized.length > INLINE_PAYLOAD_MAX_LENGTH) {
      payloadRef = await savePayloadToDb(operation.data);
      data = null;
    }
  } catch (error) {
    console.warn('Could not serialize operation payload, keeping inline:', error);
  }

  const item = {
    id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    attempts: 0,
    lastError: null,
    nextRetryAt: null,
    status: 'pending',
    ...operation,
    data,
    payloadRef
  };

  queue.push(item);
  writeQueue(queue);
  return item;
};

export const saveInspectionOffline = async ({ createPayload, completePayload }) => {
  return await addOfflineOperation({
    type: 'HSE_INSPECTION_SUBMISSION',
    data: {
      createPayload,
      completePayload
    }
  });
};

export const saveSafetyReportOffline = async (reportPayload) => {
  return await addOfflineOperation({
    type: 'SAFETY_REPORT_CREATE',
    data: reportPayload,
  });
};

const resolveOperationData = async (operation) => {
  if (operation.data) return operation.data;
  if (operation.payloadRef) {
    return await loadPayloadFromDb(operation.payloadRef);
  }
  return null;
};

const syncInspectionSubmission = async (operation) => {
  const operationData = await resolveOperationData(operation);
  const createPayload = operationData?.createPayload;
  const completePayload = operationData?.completePayload;

  if (!createPayload || !completePayload) {
    throw new Error('Operación inválida: faltan datos de inspección');
  }

  const createdInspection = await createInspection(createPayload);
  await completeInspection(createdInspection.id, completePayload);
};

const syncSafetyReportCreate = async (operation) => {
  const reportPayload = await resolveOperationData(operation);
  if (!reportPayload) {
    throw new Error('Operación inválida: faltan datos del reporte de seguridad');
  }

  const result = await createSafetyReport(reportPayload);
  if (result?.error) throw result.error;
};

export const syncOfflineQueue = async () => {
  const queueSnapshot = readQueue();
  if (queueSnapshot.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const operation of queueSnapshot) {
    if (operation.nextRetryAt && new Date(operation.nextRetryAt).getTime() > Date.now()) {
      continue;
    }

    try {
      if (operation.type === 'HSE_INSPECTION_SUBMISSION') {
        await syncInspectionSubmission(operation);
      } else if (operation.type === 'SAFETY_REPORT_CREATE') {
        await syncSafetyReportCreate(operation);
      } else {
        throw new Error(`Tipo de operación no soportado: ${operation.type}`);
      }

      await removeOfflineOperation(operation.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      markOperationAttempt(operation.id, error.message);
      console.error(`Error syncing offline operation ${operation.id}:`, error);
    }
  }

  return {
    synced,
    failed,
    remaining: readQueue().length
  };
};

export { OFFLINE_QUEUE_EVENT };
