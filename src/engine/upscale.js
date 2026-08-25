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
export const SCALES = [
  { id: 'x4', factor: 4, tile: 256, url: '/models/upscale-x4.onnx', labelKey: 'upscale.x4' },
];

/**
 * Solo x4, e non per semplicità: misurato il 2026-08-25, la variante x2
 * produce la STESSA uscita (1200×1200 da 600×600) impiegando quattro volte il
 * tempo — 118 secondi contro 30. Le sue piastrelle da 512 costano quanto
 * quattro da 256 ma rendono gli stessi pixel. Tenerla sarebbe offrire
 * un'opzione peggiore sotto ogni aspetto.
 */

/** Secondi per piastrella, misurati su M5 in WebGPU. Serve a dire l'attesa. */
export const SECONDS_PER_TILE = 7.5;

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
 * Il limite non è la memoria ma il tempo: ogni piastrella costa ~7,5 secondi,
 * e oltre il minuto e mezzo la funzione smette di essere utilizzabile.
 * L'ingrandimento serve comunque su asset piccoli — un logo, un'icona, un
 * ritaglio — non su un file di stampa che è già grande.
 */
export const MAX_INPUT_SIDE = 512;

export function canUpscale(width, height) {
  return Math.max(width, height) <= MAX_INPUT_SIDE;
}

/** Quante piastrelle servono, e quindi quanto durerà. */
export function estimateTiles(width, height, tile = TILE, overlap = OVERLAP) {
  const step = tile - overlap * 2;
  return Math.ceil(width / step) * Math.ceil(height / step);
}

export function estimateSeconds(width, height, scale) {
  return Math.round(estimateTiles(width, height, scale.tile) * SECONDS_PER_TILE);
}
