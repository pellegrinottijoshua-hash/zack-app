import * as db from './db.js';
import { normalizzaTela } from '../engine/brain.js';
import * as files from './files.js';
import {
  makeAsset,
  makeFolder,
  makeMoodboard,
  uniqueName,
  normalizeTag,
  canMoveFolder,
  cleanNote,
  isFolderColor,
  isFolderIcon,
} from './model.js';

/**
 * La libreria: un solo posto da cui l'interfaccia legge e scrive.
 *
 * Combina i metadati (IndexedDB) e i file (OPFS) e garantisce che restino
 * coerenti: se il file non si scrive, il record non esiste. Il contrario —
 * un record che punta al nulla — è il modo in cui una libreria diventa
 * inaffidabile e l'utente smette di fidarsi.
 */

export async function isSupported() {
  return files.isSupported();
}

export async function listAssets() {
  return db.all('assets');
}
export async function listFolders() {
  return db.all('folders');
}
export async function listMoodboards() {
  return db.all('moodboards');
}

export async function snapshot() {
  const [assets, folders, moodboards, use] = await Promise.all([
    db.all('assets'),
    db.all('folders'),
    db.all('moodboards'),
    files.usage().catch(() => ({ used: null, quota: null })),
  ]);
  return { assets, folders, moodboards, usage: use };
}

/**
 * Salva un lavoro. Il file prima, il record dopo: se il disco è pieno l'utente
 * vede un errore invece di ritrovarsi una voce che non apre nulla.
 */
export async function saveAsset(blob, { name, kind, meta = {}, folderId = null } = {}) {
  const existing = await db.all('assets');
  const asset = makeAsset({ name, kind, bytes: blob.size, meta, folderId });
  asset.file = uniqueName(asset.file, existing.map((a) => a.file));

  await files.writeFile(asset.file, blob);
  try {
    await db.put('assets', asset);
  } catch (err) {
    // Il record non è entrato: non lasciamo un file orfano sul disco.
    await files.deleteFile(asset.file);
    throw err;
  }
  return asset;
}

export async function readAsset(id) {
  const asset = await db.get('assets', id);
  if (!asset) throw new Error(`Nessun lavoro con id ${id}`);
  return { asset, file: await files.readFile(asset.file) };
}

export async function deleteAsset(id) {
  const asset = await db.get('assets', id);
  if (!asset) return;
  await db.remove('assets', id);
  await files.deleteFile(asset.file);
}

/**
 * Riscrive i byte di un asset che c'è già, senza crearne un altro.
 *
 * Esiste per i documenti. Modificare un `.md` e ritrovarsi un asset nuovo a
 * ogni correzione non è versionare: è riempire la libreria di doppioni di un
 * file che l'utente considera **uno**, e disfare in una sessione la potatura
 * che abbiamo appena costruito.
 *
 * Non tocca `id`, non tocca `file`, non tocca la provenienza: l'identità resta
 * quella: cambiano soltanto il contenuto e il peso. Per un'immagine derivata da
 * un'altra la funzione giusta resta `saveAsset` — là il file nuovo *è* un
 * lavoro nuovo, e la catena di provenienza è il punto.
 */
export async function sovrascriviAsset(id, blob) {
  const asset = await db.get('assets', id);
  if (!asset) throw new Error(`Nessun asset con id ${id}`);
  await files.writeFile(asset.file, blob);
  const next = { ...asset, bytes: blob.size };
  await db.put('assets', next);
  return next;
}

export async function updateAsset(id, patch) {
  const asset = await db.get('assets', id);
  if (!asset) throw new Error(`Nessun lavoro con id ${id}`);
  const next = { ...asset, ...patch, id: asset.id, file: asset.file };
  await db.put('assets', next);
  return next;
}

export async function addTag(id, tag) {
  const clean = normalizeTag(tag);
  if (!clean) return null;
  const asset = await db.get('assets', id);
  if (!asset) return null;
  if (asset.tags.includes(clean)) return asset;
  return updateAsset(id, { tags: [...asset.tags, clean] });
}

export async function setNote(id, note) {
  return updateAsset(id, { note: cleanNote(note) });
}

export async function toggleStar(id) {
  const asset = await db.get('assets', id);
  if (!asset) return null;
  return updateAsset(id, { starred: !asset.starred });
}

export async function removeTag(id, tag) {
  const asset = await db.get('assets', id);
  if (!asset) return null;
  return updateAsset(id, { tags: asset.tags.filter((t) => t !== tag) });
}

// ─── cartelle ──────────────────────────────────────────────────────────────

export async function createFolder(name, parentId = null, look = {}) {
  const folder = makeFolder({ name, parentId, ...look });
  await db.put('folders', folder);
  return folder;
}

/** Cambia aspetto o nota di una cartella, rifiutando valori fuori insieme. */
export async function updateFolder(id, patch) {
  const folder = await db.get('folders', id);
  if (!folder) throw new Error(`Nessuna cartella con id ${id}`);
  const next = { ...folder, ...patch, id: folder.id };
  if (patch.color != null && !isFolderColor(patch.color)) next.color = folder.color;
  if (patch.icon != null && !isFolderIcon(patch.icon)) next.icon = folder.icon;
  if (patch.note != null) next.note = cleanNote(patch.note);
  await db.put('folders', next);
  return next;
}

export async function moveFolder(id, newParentId) {
  const folders = await db.all('folders');
  if (!canMoveFolder(folders, id, newParentId)) {
    throw Object.assign(new Error('folder-cycle'), { code: 'folder-cycle' });
  }
  const folder = folders.find((f) => f.id === id);
  await db.put('folders', { ...folder, parentId: newParentId });
}

/**
 * Elimina una cartella. I lavori NON vengono cancellati: tornano alla radice.
 * Cancellare il lavoro di qualcuno perché ha eliminato un raccoglitore sarebbe
 * un tradimento della sua aspettativa.
 */
export async function deleteFolder(id) {
  const [assets, folders] = await Promise.all([db.all('assets'), db.all('folders')]);
  for (const a of assets.filter((a) => a.folderId === id)) {
    await db.put('assets', { ...a, folderId: null });
  }
  for (const f of folders.filter((f) => f.parentId === id)) {
    await db.put('folders', { ...f, parentId: null });
  }
  await db.remove('folders', id);
}

// ─── moodboard ─────────────────────────────────────────────────────────────

export async function createMoodboard(name, { note = '', palette = [] } = {}) {
  const board = makeMoodboard({ name, note, palette });
  await db.put('moodboards', board);
  return board;
}

export async function updateMoodboard(id, patch) {
  const board = await db.get('moodboards', id);
  if (!board) throw new Error(`Nessuna moodboard con id ${id}`);
  const next = { ...board, ...patch, id: board.id };
  await db.put('moodboards', next);
  return next;
}

/**
 * La tela di Brain di una raccolta.
 *
 * Sta dentro il record della raccolta invece che in un archivio suo: una tela
 * senza la sua raccolta non significa niente, e tenerle separate vorrebbe
 * dire poterle cancellare a metà. Si normalizza in lettura, non in scrittura:
 * ciò che è salvato può tornare indietro sbagliato, e il momento in cui te ne
 * accorgi deve essere prima di disegnarlo.
 */
export async function readBrain(id) {
  const board = await db.get('moodboards', id);
  return normalizzaTela(board?.brain);
}

export async function saveBrain(id, items) {
  return updateMoodboard(id, { brain: normalizzaTela(items) });
}

export async function deleteMoodboard(id) {
  const assets = await db.all('assets');
  for (const a of assets.filter((a) => (a.moodboardIds || []).includes(id))) {
    await db.put('assets', { ...a, moodboardIds: a.moodboardIds.filter((m) => m !== id) });
  }
  await db.remove('moodboards', id);
}

export async function setInMoodboard(assetId, moodboardId, on) {
  const asset = await db.get('assets', assetId);
  if (!asset) return null;
  const current = new Set(asset.moodboardIds || []);
  if (on) current.add(moodboardId);
  else current.delete(moodboardId);
  return updateAsset(assetId, { moodboardIds: [...current] });
}

// ─── manutenzione ──────────────────────────────────────────────────────────

/**
 * Ripara i disallineamenti: record senza file e file senza record.
 * Non è paranoia — una scheda chiusa a metà scrittura li produce, e senza
 * questa funzione la libreria degrada in silenzio.
 */
export async function repair() {
  const [assets, names] = await Promise.all([db.all('assets'), files.listFiles()]);
  const onDisk = new Set(names);
  const referenced = new Set(assets.map((a) => a.file));

  let recordsRimossi = 0;
  for (const a of assets) {
    if (!onDisk.has(a.file)) {
      await db.remove('assets', a.id);
      recordsRimossi++;
    }
  }
  let fileOrfani = 0;
  for (const n of names) {
    if (!referenced.has(n)) {
      await files.deleteFile(n);
      fileOrfani++;
    }
  }
  return { recordsRimossi, fileOrfani };
}

export async function wipe() {
  await db.clearAll();
  await files.wipe();
}

export { files };
