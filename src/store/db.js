/**
 * I metadati della libreria, in IndexedDB.
 *
 * I file binari stanno in OPFS (vedi `files.js`); qui vivono solo i record:
 * asset, cartelle, moodboard. Separarli tiene le query veloci e permette di
 * ricostruire l'indice se un giorno si disallineasse dai file.
 */

const NAME = 'jayl-studio';
const VERSION = 1;
export const STORES = ['assets', 'folders', 'moodboards'];

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(Object.assign(new Error('idb-unsupported'), { code: 'idb-unsupported' }));
      return;
    }
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run(store, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const out = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(out?.result ?? out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const put = (store, record) => run(store, 'readwrite', (s) => s.put(record));
export const remove = (store, id) => run(store, 'readwrite', (s) => s.delete(id));
export const get = (store, id) => run(store, 'readonly', (s) => s.get(id));
export const all = (store) => run(store, 'readonly', (s) => s.getAll());

export async function clearAll() {
  for (const s of STORES) await run(s, 'readwrite', (store) => store.clear());
}
