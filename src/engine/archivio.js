/**
 * L'archivio di Brain: la pool, il cestino, lo spazio (fase 5a).
 *
 * Modulo puro: niente IndexedDB, niente React. La libreria scrive, qui si
 * decide — ed è la parte che può sbagliare in silenzio: un file cestinato che
 * resta visibile, o uno vivo che sparisce, non sollevano nessun errore.
 *
 * Il cestino è un CAMPO (`cestinatoIl`), non un posto: un file cestinato resta
 * dov'era — sulla tela, nel pocket, nella sua cartella — e chi lo rimette lo
 * ritrova lì. Svuotare il cestino è l'unica cancellazione vera del prodotto.
 */

import { togli } from './brain.js';

/** Quanti file mostra la pool prima di «altri». */
export const POOL_VISIBILI = 20;

export const inCestino = (a) => Boolean(a?.cestinatoIl);

export function cestina(asset, now = Date.now) {
  return { ...asset, cestinatoIl: new Date(now()).toISOString() };
}

export function rimetti(asset) {
  return { ...asset, cestinatoIl: null };
}

/** I file vivi e quelli nel cestino, separati in un passaggio solo. */
export function dividi(assets) {
  const vivi = [];
  const cestino = [];
  for (const a of assets) (inCestino(a) ? cestino : vivi).push(a);
  // Il cestino dal più recente: chi ha appena buttato qualcosa per sbaglio
  // lo cerca in cima.
  cestino.sort((a, b) => String(b.cestinatoIl).localeCompare(String(a.cestinatoIl)));
  return { vivi, cestino };
}

const minuscolo = (s) => String(s ?? '').toLocaleLowerCase();

/**
 * La pool: una lente sull'archivio, non una scatola (P1). I vivi dal più
 * recente, filtrati dalla ricerca su nome, nota e tag, i primi `quanti`.
 * Restituisce anche quanti ne restano: «altri» si mostra solo se ce ne sono.
 */
export function pool(assets, { cerca = '', quanti = POOL_VISIBILI } = {}) {
  const q = minuscolo(cerca).trim();
  const trovati = assets
    .filter((a) => !inCestino(a))
    .filter(
      (a) =>
        !q ||
        minuscolo(a.name).includes(q) ||
        minuscolo(a.note).includes(q) ||
        (a.tags || []).some((t) => minuscolo(t).includes(q)),
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { mostrati: trovati.slice(0, quanti), restano: Math.max(0, trovati.length - quanti) };
}

/**
 * Quanto è pieno lo spazio del browser. Senza una misura non c'è un avviso
 * (regola del prodotto): una quota sconosciuta è `ignoto`, non `ok`.
 */
export function livelloSpazio({ used, quota } = {}) {
  if (!Number.isFinite(used) || !Number.isFinite(quota) || quota <= 0) return 'ignoto';
  const r = used / quota;
  if (r >= 0.95) return 'pieno';
  if (r >= 0.8) return 'attento';
  return 'ok';
}

/** Quanti byte libera svuotare il cestino. */
export function pesoCestino(assets) {
  return assets.filter(inCestino).reduce((s, a) => s + (Number(a.bytes) || 0), 0);
}

/**
 * Un file salvato di nuovo, identico a uno che c'è già (`saveAsset` è
 * idempotente). Se quello di prima sta nel cestino lo si RIMETTE: chi rifà un
 * file lo vuole, e restituirlo cestinato lo lascerebbe invisibile — il
 * salvataggio sembrerebbe non essere successo.
 */
export function ritrovato(gia) {
  return inCestino(gia) ? { asset: rimetti(gia), daScrivere: true } : { asset: gia, daScrivere: false };
}

/**
 * Una tela senza i file cancellati per davvero (svuotando il cestino), e
 * senza le frecce che li toccavano. Restituisce la STESSA lista se non c'era
 * niente da togliere, così chi chiama sa se deve salvare.
 */
export function senzaFile(items, ids) {
  let next = items;
  for (const o of items) if (o.t === 'asset' && ids.has(o.assetId)) next = togli(next, o.id);
  return next;
}

/**
 * Un peso come si scrive a un umano (lo stesso passo della libreria). Coi GB:
 * la quota di un browser sul desktop è di centinaia di GB, e «314091.5 MB»
 * non si legge.
 */
export function pesoLeggibile(n) {
  const b = Number(n) || 0;
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

/**
 * Gli oggetti della tela da NON disegnare: i file nel cestino e le frecce che
 * li toccano. Si nascondono nel disegno e non si tolgono dai dati — Brain
 * riscrive la tela intera a ogni mossa, e togliendoli il salvataggio
 * successivo li perderebbe: «rimetti» non li riporterebbe più al loro posto.
 */
export function oggettiNascosti(items, cestinati) {
  const via = new Set(items.filter((o) => o.t === 'asset' && cestinati.has(o.assetId)).map((o) => o.id));
  for (const o of items) if (o.t === 'freccia' && (via.has(o.da) || via.has(o.a))) via.add(o.id);
  return via;
}
