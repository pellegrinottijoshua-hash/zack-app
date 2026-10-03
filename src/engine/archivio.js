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
