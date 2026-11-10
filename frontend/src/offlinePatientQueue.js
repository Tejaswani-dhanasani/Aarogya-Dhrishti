const DATABASE_NAME = 'aarogya-drishti-offline';
const STORE_NAME = 'patient-queue';
const DATABASE_VERSION = 1;

function openQueueDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'clientId' });
        store.createIndex('workerId', 'workerId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open offline patient storage.'));
  });
}

async function useQueue(mode, operation) {
  const database = await openQueueDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try {
      result = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(result?.result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Offline patient storage failed.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('Offline patient storage was interrupted.'));
    };
  });
}

export async function saveQueuedPatient(record) {
  return useQueue('readwrite', (store) => store.put(record));
}

export async function getQueuedPatients(workerId) {
  const database = await openQueueDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME)
      .index('workerId')
      .getAll(String(workerId));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to read offline patient records.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Unable to read offline patient records.'));
    };
  });
}

export async function deleteQueuedPatient(clientId, workerId) {
  return useQueue('readwrite', (store) => {
    const request = store.get(clientId);
    request.onsuccess = () => {
      if (request.result?.workerId === String(workerId)) store.delete(clientId);
    };
    return request;
  });
}

export async function updateQueuedPatient(clientId, workerId, update) {
  return useQueue('readwrite', (store) => {
    const request = store.get(clientId);
    request.onsuccess = () => {
      if (request.result?.workerId === String(workerId)) {
        store.put({ ...request.result, ...update });
      }
    };
    return request;
  });
}
