/**
 * Il modello della libreria: cartelle, asset, moodboard.
 *
 * Tutto qui dentro è puro — nessun IndexedDB, nessun OPFS, nessun DOM — perché
 * è la parte che sbaglia in silenzio. Un asset finito nella cartella sbagliata
 * o un nome che si scontra con un altro non sollevano errori: si scoprono
 * quando il lavoro è già perso.
 */

/** Un asset non è un file: è l'originale più tutto ciò che ne è derivato. */
export const KINDS = ['png', 'svg', 'wav'];

export function newId(rand = Math.random) {
  // Abbastanza corto da leggersi in un nome di file, abbastanza lungo da non
  // scontrarsi nella libreria di una persona sola.
  return Array.from({ length: 8 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)]).join('');
}

/** Ripulisce un nome perché sia usabile come file su disco e leggibile. */
export function safeName(name) {
  const base = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60);
  return base || 'senza-nome';
}

/**
 * Rende unico un nome dentro un insieme, come fa il Finder.
 * Sovrascrivere in silenzio un lavoro con lo stesso nome è il difetto peggiore
 * che una libreria possa avere.
 */
export function uniqueName(name, taken) {
  const set = taken instanceof Set ? taken : new Set(taken || []);
  if (!set.has(name)) return name;

  const m = name.match(/^(.*?)(\.[^.]+)?$/);
  const stem = m[1];
  const ext = m[2] || '';
  for (let i = 2; i < 10000; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!set.has(candidate)) return candidate;
  }
  throw new Error('Troppi nomi uguali: rinomina qualcosa a mano.');
}

export function makeAsset({ name, kind, bytes, meta = {}, folderId = null, now = Date.now, rand = Math.random }) {
  if (!KINDS.includes(kind)) throw new Error(`Tipo sconosciuto: ${kind}`);
  const id = newId(rand);
  return {
    id,
    name: safeName(name),
    kind,
    bytes: Number(bytes) || 0,
    folderId,
    tags: [],
    moodboardIds: [],
    createdAt: new Date(now()).toISOString(),
    note: '',
    starred: false,
    // Da quale lavoro deriva questo: la catena di provenienza è ciò che rende
    // ritrovabile un file di cui non si ricorda il nome.
    fromId: meta.fromId ?? null,
    meta,
    file: `${safeName(name).replace(/\.[^.]+$/, '')}-${id}.${kind}`,
  };
}

export function makeFolder({
  name,
  parentId = null,
  color = FOLDER_COLORS[0],
  icon = FOLDER_ICONS[0],
  note = '',
  now = Date.now,
  rand = Math.random,
}) {
  return {
    id: newId(rand),
    name: safeName(name),
    parentId,
    // Un colore o un'icona fuori insieme tornano al valore predefinito invece
    // di entrare nei dati: è così che un insieme chiuso resta chiuso.
    color: isFolderColor(color) ? color : FOLDER_COLORS[0],
    icon: isFolderIcon(icon) ? icon : FOLDER_ICONS[0],
    note: cleanNote(note),
    createdAt: new Date(now()).toISOString(),
  };
}

export function makeMoodboard({ name, note = '', palette = [], now = Date.now, rand = Math.random }) {
  return {
    id: newId(rand),
    name: safeName(name),
    note,
    palette: palette.filter(isHex),
    createdAt: new Date(now()).toISOString(),
  };
}

export function isHex(c) {
  return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
}

/**
 * Colori e icone per le cartelle.
 *
 * Un insieme CHIUSO, di proposito. Le etichette libere sembrano flessibili e
 * diventano ingestibili: dopo tre mesi si hanno «brand», «Brand» e «branding»
 * e non se ne usa nessuna. Pochi colori riconoscibili funzionano perché sono
 * pochi.
 *
 * I colori escono dalla palette JAYL più due neutri, così una cartella non può
 * introdurre un colore fuori marchio.
 */
export const FOLDER_COLORS = ['#C4A35A', '#8A8A85', '#F5F0E8', '#6E6E6A', '#3D3D3A'];

export const FOLDER_ICONS = [
  'cartella',
  'maglietta',
  'personaggio',
  'stella',
  'fuoco',
  'occhio',
  'tag',
  'cerchio',
];

export function isFolderColor(c) {
  return FOLDER_COLORS.includes(c);
}

export function isFolderIcon(i) {
  return FOLDER_ICONS.includes(i);
}

/** Una nota libera, ma non infinita: una nota di mille righe non è una nota. */
export function cleanNote(note) {
  return String(note ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

/** Una cartella non può finire dentro se stessa o dentro un suo discendente. */
export function canMoveFolder(folders, id, newParentId) {
  if (id === newParentId) return false;
  if (newParentId === null) return true;
  let cur = folders.find((f) => f.id === newParentId);
  const seen = new Set();
  while (cur) {
    if (cur.id === id) return false;
    if (seen.has(cur.id)) return false; // ciclo già esistente: non peggioriamolo
    seen.add(cur.id);
    cur = folders.find((f) => f.id === cur.parentId);
  }
  return true;
}

/** Il percorso leggibile di una cartella, dalla radice in giù. */
export function folderPath(folders, id) {
  const out = [];
  const seen = new Set();
  let cur = folders.find((f) => f.id === id);
  while (cur && !seen.has(cur.id)) {
    out.unshift(cur.name);
    seen.add(cur.id);
    cur = folders.find((f) => f.id === cur.parentId);
  }
  return out;
}

/** Filtra e ordina gli asset per la vista corrente. */
export function queryAssets(assets, { folderId = undefined, moodboardId = undefined, tag = null, search = '', kind = null } = {}) {
  const needle = String(search || '').trim().toLowerCase();
  return assets
    .filter((a) => (folderId === undefined ? true : a.folderId === folderId))
    .filter((a) => (moodboardId === undefined ? true : (a.moodboardIds || []).includes(moodboardId)))
    .filter((a) => (tag ? (a.tags || []).includes(tag) : true))
    .filter((a) => (kind ? a.kind === kind : true))
    .filter((a) => (needle ? a.name.toLowerCase().includes(needle) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Tutti i tag usati, con quante volte, dal più usato. */
export function allTags(assets) {
  const counts = new Map();
  for (const a of assets) {
    for (const t of a.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * La catena di derivazione di un lavoro, dalla radice a lui.
 * Si ferma su un anello: dati incoerenti non devono impiantare l'interfaccia.
 */
export function lineage(assets, id) {
  const chain = [];
  const seen = new Set();
  let cur = assets.find((a) => a.id === id);
  while (cur && !seen.has(cur.id)) {
    chain.unshift(cur);
    seen.add(cur.id);
    cur = cur.fromId ? assets.find((a) => a.id === cur.fromId) : null;
  }
  return chain;
}

/** I lavori nati da questo. */
export function derivedFrom(assets, id) {
  return assets.filter((a) => a.fromId === id);
}

/** Le raccolte pronte: quasi sempre si cerca qualcosa di recente. */
export function smartCollections(assets, now = Date.now()) {
  const week = now - 7 * 24 * 60 * 60 * 1000;
  return [
    {
      id: 'recenti',
      labelKey: 'library.smart.recent',
      match: (a) => Date.parse(a.createdAt) >= week,
    },
    { id: 'preferiti', labelKey: 'library.smart.starred', match: (a) => a.starred === true },
    {
      id: 'riferimenti',
      labelKey: 'library.smart.references',
      match: (a) => (a.moodboardIds || []).length > 0,
    },
  ].map((c) => ({ ...c, count: assets.filter(c.match).length }));
}

/** Normalizza un tag: minuscolo, senza spazi doppi, mai vuoto. */
export function normalizeTag(tag) {
  const t = String(tag || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 30);
  return t || null;
}
