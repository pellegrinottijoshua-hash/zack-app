/**
 * Il pocket (fase 4, quaderno §T3 e §T6).
 *
 * Modulo puro: niente React, niente `localStorage` — chi lo chiama legge e
 * scrive la chiave, qui c'è solo la regola. Il pocket è una **lista di id**
 * della libreria, non di file: i file vivono in Brain, e il pocket ne tiene
 * solo il richiamo. Per questo svuotarlo ogni giorno non cancella niente.
 *
 * Decisioni del committente (2026-09-27): si svuota a mezzanotte **locale**;
 * dei 10 se ne vedono 4 e gli altri scorrono al tocco; c'è anche sulla home.
 */

export const CHIAVE = 'jayl.pocket';
/** Quanti richiami tiene: l'undicesimo fa uscire il più vecchio. */
export const TETTO = 10;
/** Quanti se ne vedono insieme; gli altri scorrono al tocco. */
export const VISIBILI = 4;

/** La data locale del cliente, `AAAA-MM-GG`: mezzanotte si misura qui. */
export function giornoLocale(d = new Date()) {
  const due = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

/**
 * Legge il pocket salvato (testo JSON o `null`). Tutto ciò che non ha la
 * forma giusta — o è di un altro giorno — torna un pocket vuoto di oggi:
 * un salvataggio rotto non deve rompere la barra.
 */
export function leggiPocket(testo, oggi) {
  const vuoto = { giorno: oggi, ids: [] };
  let v;
  try {
    v = JSON.parse(testo);
  } catch {
    return vuoto;
  }
  if (!v || v.giorno !== oggi || !Array.isArray(v.ids)) return vuoto;
  const ids = [...new Set(v.ids.filter((x) => typeof x === 'string' && x))].slice(-TETTO);
  return { giorno: oggi, ids };
}

/**
 * Mette un id nel pocket. Se c'è già, torna in cima invece di doppiarsi.
 * Restituisce il pocket nuovo e l'id uscito per il tetto (da DIRE, non in
 * silenzio), oppure `null`.
 */
export function metti(pocket, id) {
  const senza = pocket.ids.filter((x) => x !== id);
  const ids = [...senza, id];
  const uscito = ids.length > TETTO ? ids[0] : null;
  return { pocket: { ...pocket, ids: ids.slice(-TETTO) }, uscito };
}

export function togli(pocket, id) {
  return { ...pocket, ids: pocket.ids.filter((x) => x !== id) };
}

/**
 * I richiami che esistono ancora, dal più recente: un id che in libreria non
 * c'è più si salta senza errori.
 */
export function vivi(pocket, assets) {
  const perId = new Map(assets.map((a) => [a.id, a]));
  return pocket.ids
    .map((id) => perId.get(id))
    .filter(Boolean)
    .reverse();
}

/**
 * La finestra dei 4 visibili, a partire da `inizio`. Il carosello gira: dopo
 * l'ultimo si ricomincia dal primo, così un tocco porta sempre avanti.
 */
export function finestra(lista, inizio = 0) {
  if (lista.length <= VISIBILI) return lista;
  const n = lista.length;
  const da = ((inizio % n) + n) % n;
  return Array.from({ length: VISIBILI }, (_, i) => lista[(da + i) % n]);
}

/**
 * Dove può andare un file, per tipo (§2.3). Una tabella sola: l'ovale del
 * tocco la legge adesso, il trascinamento (4b) accenderà le stesse.
 * `pocket` e `brain` valgono per tutti; i servizi solo dove hanno senso.
 */
const IMMAGINE = ['pocket', 'scontorna', 'vettorializza', 'immagine', 'video-primo', 'video-riferimento', 'brain'];
export const DESTINAZIONI = Object.freeze({
  png: IMMAGINE,
  jpg: IMMAGINE,
  svg: ['pocket', 'vettorializza', 'brain'],
  mp4: ['pocket', 'brain'],
  wav: ['pocket', 'brain'],
});

export function destinazioniDi(kind) {
  return Object.hasOwn(DESTINAZIONI, kind) ? DESTINAZIONI[kind] : ['pocket', 'brain'];
}

/**
 * Il trascinamento (4b): i cerchi su cui si posa un file e le destinazioni
 * che ognuno vuol dire. Video ne ha due — posarci sopra chiede quale, con le
 * sole due voci (§2.4). Nessuna destinazione nuova: la tabella resta
 * `DESTINAZIONI`, qui c'è solo dove stanno sullo schermo.
 */
export const BERSAGLI = Object.freeze({
  pocket: ['pocket'],
  brain: ['brain'],
  scontorna: ['scontorna'],
  vettorializza: ['vettorializza'],
  immagine: ['immagine'],
  video: ['video-primo', 'video-riferimento'],
});

/** Le destinazioni di un bersaglio possibili per quel tipo: vuoto = spento. */
export function destinazioniSu(bersaglio, kind) {
  const possibili = destinazioniDi(kind);
  return (Object.hasOwn(BERSAGLI, bersaglio) ? BERSAGLI[bersaglio] : []).filter((d) =>
    possibili.includes(d),
  );
}

/**
 * I bersagli che si accendono trascinando un file di quel tipo. `da` è il
 * bersaglio da cui il file parte: un file del pocket non si posa nel pocket.
 */
export function bersagliAccesi(kind, da = null) {
  return Object.keys(BERSAGLI).filter((b) => b !== da && destinazioniSu(b, kind).length > 0);
}

/**
 * Quanti pixel prima che un tocco diventi un trascinamento. Sotto la soglia
 * resta un tocco e apre l'ovale: un dito non sta mai fermo del tutto, e il
 * tocco è la strada che sul telefono non deve fallire.
 */
export const SOGLIA = 8;

export function eTrascinamento(dx, dy) {
  return Math.hypot(dx, dy) >= SOGLIA;
}

/**
 * I riferimenti di Immagine e Video si pescano anche dal pocket (A7): i suoi
 * file vengono prima, dal più recente, e sotto non si ripetono. `assets` è
 * già filtrato per ciò che il servizio accetta, quindi un video nel pocket
 * non compare fra le immagini di Video.
 */
export function dividiPerPocket(pocket, assets) {
  const dalPocket = vivi(pocket, assets);
  const dentro = new Set(dalPocket.map((a) => a.id));
  return { dalPocket, resto: assets.filter((a) => !dentro.has(a.id)) };
}
