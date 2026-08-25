/**
 * I file dei lavori, nel disco privato del browser (OPFS).
 *
 * OPFS è veloce e non ha limiti di quota stretti come IndexedDB per i binari,
 * ma vive dentro il browser: svuotare i dati del sito cancella tutto. Per
 * questo l'interfaccia deve dirlo chiaramente e l'export completo deve essere
 * sempre a un clic — sono requisiti di prodotto, non gentilezze.
 */

const DIR = 'lavori';

let rootPromise = null;

async function dir() {
  if (!rootPromise) {
    rootPromise = (async () => {
      if (!navigator.storage?.getDirectory) {
        throw Object.assign(new Error('opfs-unsupported'), { code: 'opfs-unsupported' });
      }
      const root = await navigator.storage.getDirectory();
      return root.getDirectoryHandle(DIR, { create: true });
    })();
  }
  return rootPromise;
}

export async function isSupported() {
  try {
    await dir();
    return true;
  } catch {
    return false;
  }
}

export async function writeFile(name, blob) {
  const d = await dir();
  const handle = await d.getFileHandle(name, { create: true });
  const w = await handle.createWritable();
  await w.write(blob);
  await w.close();
  return name;
}

export async function readFile(name) {
  const d = await dir();
  const handle = await d.getFileHandle(name);
  return handle.getFile();
}

export async function deleteFile(name) {
  const d = await dir();
  await d.removeEntry(name).catch(() => {});
}

export async function listFiles() {
  const d = await dir();
  const names = [];
  for await (const [name] of d.entries()) names.push(name);
  return names;
}

/** Quanto occupa la libreria, e quanto spazio concede il browser. */
export async function usage() {
  const est = (await navigator.storage?.estimate?.()) || {};
  return { used: est.usage ?? null, quota: est.quota ?? null };
}

/**
 * Cancella tutto. Esiste perché l'utente possa ripartire davvero: nasconderlo
 * lo costringerebbe a svuotare i dati del browser, perdendo anche le
 * preferenze.
 */
export async function wipe() {
  const d = await dir();
  for await (const [name] of d.entries()) await d.removeEntry(name).catch(() => {});
}
