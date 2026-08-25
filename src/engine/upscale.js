/**
 * Ingrandimento con super-risoluzione.
 *
 * Non è un ridimensionamento: un `resize` inventa pixel interpolando e il
 * risultato resta morbido. Un modello di super-risoluzione ricostruisce il
 * dettaglio, ed è la differenza fra "più grande" e "più definito".
 *
 * Modello: RealPLKSR (darktable-org, MIT, 28 MB). Convoluzionale di proposito —
 * i transformer come BiRefNet o Swin2SR sforano il limite di storage buffer di
 * WebGPU su Metal, verificato il 2026-08-25.
 */

/**
 * `tile` è una proprietà DEL MODELLO, non una costante globale: l'ingresso è di
 * dimensione fissa e cambia da variante a variante — x4 vuole 256, x2 vuole
 * 512. Sbagliarla fa fallire l'intera operazione con un errore sulle
 * dimensioni, non con un risultato brutto.
 */
/**
 * Il modello ingrandisce SEMPRE quattro volte: e' l'unica cosa che sa fare.
 * Il «due volte» si ottiene ingrandendo per quattro e riducendo a meta', che e'
 * il modo migliore di ottenere un ×2 — la riduzione parte da un'immagine gia'
 * ricostruita, non interpolata. Un modello ×2 dedicato darebbe un risultato
 * peggiore impiegando quattro volte il tempo: misurato il 2026-08-25.
 */
export const MODEL_FACTOR = 4;

export const SCALES = [
  { id: 'x2', factor: 2, tile: 256, url: '/models/upscale-x4.onnx', labelKey: 'upscale.x2' },
  { id: 'x4', factor: 4, tile: 256, url: '/models/upscale-x4.onnx', labelKey: 'upscale.x4' },
];

/** Di quanto va ridotta l'uscita del modello per consegnare il fattore chiesto. */
export function reductionFor(factor) {
  return MODEL_FACTOR / factor;
}

/**
 * Solo x4, e non per semplicità: misurato il 2026-08-25, la variante x2
 * produce la STESSA uscita (1200×1200 da 600×600) impiegando quattro volte il
 * tempo — 118 secondi contro 30. Le sue piastrelle da 512 costano quanto
 * quattro da 256 ma rendono gli stessi pixel. Tenerla sarebbe offrire
 * un'opzione peggiore sotto ogni aspetto.
 */

/**
 * Secondi per piastrella, a modello gia' caricato.
 *
 * Rimisurato il 2026-08-25 su M5 in WebGPU: 4 piastrelle in 3,9 s, cioe' circa
 * **un secondo l'una**. Il vecchio 7,5 comprendeva il caricamento del modello e
 * rendeva ogni stima quasi otto volte piu' pessimista del vero — motivo per cui
 * il limite d'ingresso era stato messo cosi' basso.
 */
export const SECONDS_PER_TILE = 1.0;

/** Il caricamento del modello, una volta sola per sessione. */
export const MODEL_LOAD_SECONDS = 1.5;

/**
 * Un'immagine intera non entra in memoria una volta ingrandita quattro volte:
 * si lavora a piastrelle con un margine di sovrapposizione, altrimenti si
 * vedono le giunture.
 */
export const TILE = 256;
export const OVERLAP = 16;

export function getScale(id) {
  const s = SCALES.find((x) => x.id === id);
  if (!s) throw new Error(`Ingrandimento sconosciuto: ${id}`);
  return s;
}

/**
 * Le piastrelle che coprono un'immagine, con sovrapposizione ai bordi interni.
 *
 * **La lettura è SEMPRE esattamente `tile`×`tile`**: il modello ha un ingresso
 * di dimensione fissa e rifiuta qualunque altra misura. Ai bordi la finestra
 * scorre verso l'interno invece di rimpicciolirsi; solo quando l'immagine è più
 * piccola della piastrella resta un margine da riempire, segnalato da `pad`.
 *
 * Pura: si verifica senza browser, ed è la parte che sbaglia in silenzio
 * lasciando righe visibili nel risultato.
 */
export function planTiles(width, height, tile = TILE, overlap = OVERLAP) {
  if (width <= 0 || height <= 0) throw new Error('Dimensioni non valide');
  const step = tile - overlap * 2;
  if (step <= 0) throw new Error('La sovrapposizione non può superare la piastrella');

  const clampOrigin = (v, size) => Math.max(0, Math.min(v, Math.max(0, size - tile)));

  const tiles = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const rx = clampOrigin(x - overlap, width);
      const ry = clampOrigin(y - overlap, height);
      tiles.push({
        read: { x: rx, y: ry, w: tile, h: tile },
        // Quanto di quella finestra esiste davvero nell'immagine.
        avail: { w: Math.min(tile, width - rx), h: Math.min(tile, height - ry) },
        pad: width < tile || height < tile,
        write: { x, y, w: Math.min(step, width - x), h: Math.min(step, height - y) },
        offset: { x: x - rx, y: y - ry },
      });
    }
  }
  return tiles;
}

/** Quanto costa in pixel: serve a rifiutare prima di far attendere invano. */
export function outputSize(width, height, factor) {
  return { w: width * factor, h: height * factor, pixels: width * height * factor * factor };
}

/**
 * Il tetto vero non e' il tempo: e' la tela.
 *
 * Una tela oltre il limite del browser **si crea lo stesso e restituisce pixel
 * vuoti, in silenzio** — il difetto peggiore possibile per un file di stampa.
 * Il limite si misura, non si indovina: `probeCanvasPixels` prova finche' non
 * trova cosa regge davvero questo browser. Misurato il 2026-08-25 su Chrome:
 * 16384×16384, e 16385 fallisce.
 *
 * Sopra la tela c'e' un secondo tetto, la memoria: fra tela di uscita, copia
 * dei pixel e trasferimento al thread principale si spendono circa dodici byte
 * per pixel di uscita. Ottanta milioni di pixel sono quasi un gigabyte, ed e'
 * la soglia oltre la quale una scheda del browser comincia a morire invece di
 * rallentare.
 */
export const MAX_OUTPUT_PIXELS = 80e6;

/** Nessun lato oltre questo, comunque vada la misura dell'area. */
export const MAX_OUTPUT_SIDE = 16384;

/**
 * L'ingresso piu' grande che si puo' ingrandire, dato cio' che regge l'uscita.
 * Torna sia i pixel sia il lato, perche' un'immagine lunga e stretta puo'
 * sforare il lato pur restando dentro l'area.
 */
export function inputLimits(factor, { maxOutputPixels = MAX_OUTPUT_PIXELS, maxOutputSide = MAX_OUTPUT_SIDE } = {}) {
  return {
    pixels: Math.floor(maxOutputPixels / (factor * factor)),
    side: Math.floor(maxOutputSide / factor),
  };
}

/**
 * @returns {{ok: boolean, reason?: 'area'|'lato'}} il motivo serve a scrivere
 * un messaggio che dice cosa fare, non solo che non si puo'.
 */
export function canUpscale(width, height, factor = 4, limits = {}) {
  const { pixels, side } = inputLimits(factor, limits);
  if (Math.max(width, height) > side) return { ok: false, reason: 'lato' };
  if (width * height > pixels) return { ok: false, reason: 'area' };
  return { ok: true };
}

/**
 * La tela piu' grande che questo browser regge davvero.
 *
 * Non basta crearla: una tela oltre il limite si crea e poi restituisce pixel
 * vuoti. Si disegna e si rilegge un pixel nell'angolo piu' lontano, che e'
 * l'unica prova che la tela esista per intero.
 *
 * Il risultato si misura una volta e resta.
 */
let probed = null;
export function probeCanvasPixels(make) {
  if (probed !== null) return probed;
  const create =
    make ||
    ((w, h) =>
      typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : null);

  const works = (side) => {
    try {
      const c = create(side, side);
      if (!c) return false;
      const x = c.getContext('2d', { willReadFrequently: true });
      if (!x) return false;
      x.fillStyle = '#ff0000';
      x.fillRect(side - 2, side - 2, 2, 2);
      const d = x.getImageData(side - 1, side - 1, 1, 1).data;
      return d[0] === 255 && d[3] === 255;
    } catch {
      return false;
    }
  };

  // Dal piu' grande al piu' piccolo: il caso comune e' il primo, e la prova
  // costa una tela sola.
  for (const side of [16384, 11585, 8192, 5793, 4096, 2048]) {
    if (works(side)) {
      probed = side * side;
      return probed;
    }
  }
  // Nessuna tela regge: meglio zero, che ferma tutto, di un numero inventato.
  probed = 0;
  return probed;
}

/** Quante piastrelle servono, e quindi quanto durerà. */
export function estimateTiles(width, height, tile = TILE, overlap = OVERLAP) {
  const step = tile - overlap * 2;
  return Math.ceil(width / step) * Math.ceil(height / step);
}

export function estimateSeconds(width, height, scale, { warm = true } = {}) {
  const tiles = estimateTiles(width, height, scale.tile);
  return Math.round(tiles * SECONDS_PER_TILE + (warm ? 0 : MODEL_LOAD_SECONDS));
}

/** L'attesa detta come la direbbe una persona: 30 s, oppure 4 min. */
export function humanSeconds(sec) {
  if (sec < 90) return { value: Math.max(1, Math.round(sec)), unit: 'sec' };
  return { value: Math.round(sec / 60), unit: 'min' };
}
