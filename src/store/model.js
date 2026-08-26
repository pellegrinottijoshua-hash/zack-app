/**
 * Il modello della libreria: cartelle, asset, moodboard.
 *
 * Tutto qui dentro è puro — nessun IndexedDB, nessun OPFS, nessun DOM — perché
 * è la parte che sbaglia in silenzio. Un asset finito nella cartella sbagliata
 * o un nome che si scontra con un altro non sollevano errori: si scoprono
 * quando il lavoro è già perso.
 */

/** Un asset non è un file: è l'originale più tutto ciò che ne è derivato. */
export const KINDS = ['png', 'jpg', 'svg', 'wav', 'mp3', 'mp4', 'webm', 'md'];

/**
 * Che cosa si può ascoltare o guardare, invece che soltanto vedere.
 *
 * Serve a Brain, dove sulla stessa tela stanno un ritaglio, una voce
 * registrata e un video di riferimento. La libreria sapeva già tenere i wav
 * del laboratorio suoni; i tre tipi aggiunti sono quelli che l'utente si
 * porta dietro da fuori — e senza di loro Brain sarebbe una bacheca di sole
 * immagini, cioè metà di quello che serve.
 */
export const KIND_AUDIO = ['wav', 'mp3'];
export const KIND_VIDEO = ['mp4', 'webm'];

/** Ciò che si guarda come immagine ferma. */
export const KIND_IMMAGINE = ['png', 'jpg', 'svg'];

/**
 * Ciò che si legge, invece che guardare o ascoltare.
 *
 * È il tipo che rende Brain un ponte invece che una bacheca. I documenti veri
 * dei progetti — una bibbia di serie, un piano di lancio, le regole di un
 * personaggio — sono `.md` sparsi in cartelle diverse, e finché stanno lì
 * nessuno vede l'insieme: né l'utente né un modello a cui lo si chiede.
 * Portati sulla tela accanto ai file a cui si riferiscono, e riscaricati nel
 * pacco, diventano una panoramica sola.
 *
 * **Uno solo, e chiuso.** Non `.txt`, non `.rtf`, non `.docx`: il markdown è
 * l'unico formato che un umano legge in chiaro, un modello capisce senza
 * conversioni e un editor di testo apre fra dieci anni. Allungare questa lista
 * significa comprarsi le conversioni, che è un altro prodotto.
 */
export const KIND_TESTO = ['md'];

/**
 * L'icona di un documento, sempre una.
 *
 * Un buco nel disegno è peggio di una scelta banale: la scheda resterebbe
 * vuota proprio nel punto in cui l'occhio cerca di che cosa parla il file.
 */
export function iconaDocumento(asset) {
  const scelta = asset?.meta?.icona;
  return isFolderIcon(scelta) ? scelta : ICONE_DOCUMENTO[0];
}

/**
 * L'assaggio che sta sulla scheda, sulla tela.
 *
 * Ha un tetto **dichiarato**, non scoperto: una bibbia da 200 KB dentro un
 * riquadro di 200 px non è illeggibile, è una tela che si impianta. Nell'editor
 * il documento si apre intero; qui si mostra da dove comincia.
 *
 * Salta il titolo markdown e le righe vuote in cima, perché le prime righe di
 * un `.md` sono quasi sempre `# Titolo` e una riga bianca — cioè un'anteprima
 * che ripete quello che il nome dice già.
 */
export function anteprimaTesto(testo, { righe = 8 } = {}) {
  const tutte = String(testo || '').split('\n');
  let i = 0;
  while (i < tutte.length && (tutte[i].trim() === '' || /^#{1,6}\s/.test(tutte[i]))) i += 1;
  return tutte.slice(i, i + righe).join('\n');
}

/**
 * Il titolo scritto dentro il documento, se c'è.
 *
 * Serve alla panoramica: «the-rug-bible.md» dice meno di «The Rug — episodio
 * 1», e in un elenco di venti progetti conta cosa c'è dentro, non come è stato
 * salvato. Se non c'è un titolo non se ne inventa uno: la prima riga di testo
 * spacciata per titolo è peggio di nessun titolo.
 */
export function titoloDocumento(testo) {
  for (const riga of String(testo || '').split('\n')) {
    const trovato = riga.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (trovato) return trovato[1].trim();
    if (riga.trim() !== '') return null;
  }
  return null;
}

/**
 * Che tipo è un file che l'utente porta da fuori.
 *
 * Si guarda l'estensione **e** il tipo dichiarato dal sistema: l'estensione
 * manca sui file scaricati da certi siti, e il tipo dichiarato manca su certi
 * sistemi. Uno dei due basta; nessuno dei due significa che non lo sappiamo
 * tenere, ed è meglio dirlo che salvare un file con l'etichetta sbagliata —
 * un'etichetta sbagliata si scopre mesi dopo, quando non si apre più.
 */
export function kindFromFile(name = '', type = '') {
  const est = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const perEstensione = { jpeg: 'jpg', jpg: 'jpg', png: 'png', svg: 'svg', wav: 'wav', mp3: 'mp3', mp4: 'mp4', webm: 'webm', md: 'md', markdown: 'md' };
  if (perEstensione[est]) return perEstensione[est];

  const perTipo = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'text/markdown': 'md',
    'text/x-markdown': 'md',
  };
  return perTipo[String(type).toLowerCase()] || null;
}

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

/**
 * Le icone che un documento può portare.
 *
 * Sono **le stesse delle cartelle**, e per la stessa ragione per cui i colori
 * delle note sono quelli delle cartelle: due insiemi di icone per due cose che
 * l'utente percepisce entrambe come «etichette» produrrebbero una stella che
 * nella libreria significa una cosa e sulla tela un'altra.
 */
export const ICONE_DOCUMENTO = FOLDER_ICONS;

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

/**
 * ── POTARE LA LIBRERIA ────────────────────────────────────────────────────
 *
 * In una sessione di prova sono finiti dentro 128 lavori e 645 MB, quasi tutti
 * scarti: la stessa maglietta scontornata undici volte per guardare un bordo.
 * Non c'era modo di sceglierne dieci e buttarli, né di vedere cosa occupava
 * spazio. Fra tre mesi d'uso vero è un archivio che nessuno apre più.
 */

/**
 * Cosa rende due lavori *lo stesso lavoro*.
 *
 * Non il contenuto — confrontare i byte di 645 MB dentro il browser è una
 * scansione che blocca la scheda. La chiave è ciò che rende un doppione un
 * doppione **nel modo in cui nascono davvero qui**: la stessa operazione,
 * sullo stesso file di partenza, con lo stesso peso esatto. Rifare due volte
 * lo stesso scontorno sullo stesso file dà esattamente questo.
 *
 * Un peso uguale per caso fra due file diversi esiste; un peso uguale **e**
 * la stessa origine **e** la stessa operazione, no.
 */
export function chiaveDoppione(a) {
  return [a.kind, a.bytes, a.fromId || '', a.meta?.op || '', a.meta?.preset || ''].join('|');
}

/**
 * Un lavoro che non si tocca, per quanto duplicato sia.
 *
 * È la parte che conta più dell'algoritmo: chi propone di cancellare deve
 * sbagliare per difetto. Un preferito, una nota scritta a mano, un
 * riferimento dentro una moodboard e un lavoro da cui ne è nato un altro
 * sono tutte prove che qualcuno ci ha messo le mani.
 */
export function intoccabile(asset, derivati = new Set()) {
  return Boolean(
    asset.starred ||
      (asset.note || '').trim() ||
      (asset.moodboardIds || []).length > 0 ||
      (asset.tags || []).length > 0 ||
      derivati.has(asset.id),
  );
}

/**
 * I doppioni da proporre, raggruppati.
 *
 * Di ogni gruppo si **tiene il più vecchio** e si propongono gli altri: il più
 * vecchio è quello che gli altri lavori possono citare come origine, ed è
 * anche quello che l'utente ricorda di aver fatto. Un gruppo in cui tutto è
 * intoccabile non compare affatto.
 *
 * Non cancella niente: restituisce una proposta. La cancellazione è un gesto
 * dell'utente, e deve vedere cosa sta per sparire prima di farlo.
 *
 * @returns {{tenuto: object, scarti: object[]}[]}
 */
export function doppioni(assets = []) {
  const derivati = new Set(assets.map((a) => a.fromId).filter(Boolean));
  const gruppi = new Map();

  for (const a of assets) {
    // Un lavoro senza peso non si confronta: peso zero significa che non
    // sappiamo quanto pesa, non che è vuoto.
    if (!a.bytes) continue;
    const k = chiaveDoppione(a);
    if (!gruppi.has(k)) gruppi.set(k, []);
    gruppi.get(k).push(a);
  }

  const out = [];
  for (const gruppo of gruppi.values()) {
    if (gruppo.length < 2) continue;
    const ordinati = [...gruppo].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const tenuto = ordinati[0];
    const scarti = ordinati.slice(1).filter((a) => !intoccabile(a, derivati));
    if (scarti.length) out.push({ tenuto, scarti });
  }
  // I gruppi che liberano più spazio per primi: è l'ordine in cui uno guarda
  // una proposta di potatura.
  return out.sort(
    (x, y) =>
      y.scarti.reduce((n, a) => n + a.bytes, 0) - x.scarti.reduce((n, a) => n + a.bytes, 0),
  );
}

/** Quanto spazio libererebbe una selezione di lavori. */
export function pesoDi(assets, ids) {
  const set = ids instanceof Set ? ids : new Set(ids);
  return assets.filter((a) => set.has(a.id)).reduce((n, a) => n + (a.bytes || 0), 0);
}
