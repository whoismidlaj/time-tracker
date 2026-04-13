import { openDB } from 'idb';

const DB_NAME = 'time-tracker-offline';
const STORE_NAME = 'pending-actions';

export async function getOfflineDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function queueAction(action) {
  const db = await getOfflineDb();
  return db.add(STORE_NAME, {
    ...action,
    timestamp: new Date().toISOString(),
  });
}

export async function getPendingActions() {
  const db = await getOfflineDb();
  return db.getAll(STORE_NAME);
}

export async function deleteAction(id) {
  const db = await getOfflineDb();
  return db.delete(STORE_NAME, id);
}

export async function clearActions() {
  const db = await getOfflineDb();
  return db.clear(STORE_NAME);
}
