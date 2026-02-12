import { openDB } from 'idb';

const DB_NAME = 'mapql-playground';
const DB_VERSION = 1;
const STORE_NAME = 'files';

/** @returns {Promise<import('idb').IDBPDatabase>} */
function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('order', 'order');
      }
    },
  });
}

/** Get all files sorted by order */
export async function getAllFiles() {
  const db = await getDb();
  return db.getAllFromIndex(STORE_NAME, 'order');
}

/** Get a single file by id */
export async function getFile(id) {
  const db = await getDb();
  return db.get(STORE_NAME, id);
}

/** Create or update a file */
export async function putFile(file) {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, file);
  } catch (e) {
    console.error('Failed to save file to IndexedDB:', e);
  }
}

/** Delete a file by id */
export async function deleteFile(id) {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
