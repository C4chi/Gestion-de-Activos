const DB_NAME = 'rodicon-offline-db';
const DB_VERSION = 1;
const PAYLOAD_STORE = 'offline_payloads';

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PAYLOAD_STORE)) {
        const store = db.createObjectStore(PAYLOAD_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });

  return dbPromise;
};

const withStore = async (mode, callback) => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PAYLOAD_STORE, mode);
    const store = transaction.objectStore(PAYLOAD_STORE);

    let request;
    try {
      request = callback(store);
    } catch (error) {
      reject(error);
      return;
    }

    if (!request) {
      transaction.oncomplete = () => resolve(undefined);
      transaction.onerror = () => reject(transaction.error);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePayloadToDb = async (payload) => {
  const payloadId = `payload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await withStore('readwrite', (store) => store.put({ id: payloadId, payload, createdAt: new Date().toISOString() }));
  return payloadId;
};

export const loadPayloadFromDb = async (payloadId) => {
  const result = await withStore('readonly', (store) => store.get(payloadId));
  return result?.payload || null;
};

export const removePayloadFromDb = async (payloadId) => {
  await withStore('readwrite', (store) => store.delete(payloadId));
};
