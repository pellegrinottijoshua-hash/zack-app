/**
 * Togliere il fondo panna alle clip del cast, senza bucare i personaggi.
 *
 * Le clip si generano su un vuoto panna (#F5F0E8) perché è il canone della
 * serie. Per mostrarle sopra una foto o sopra la tela dell'utente serve invece
 * un canale alfa, e la strada ovvia — "rendi trasparente tutto ciò che è
 * panna" — **non funziona**, per una ragione che si vede solo guardando i
 * personaggi: mezzo cast è panna. Il piccione è panna, il gabbiano ha il petto
 * panna, la falena è panna, e perfino Zack ha il becco panna e un piede panna.
 * Un key sul colore li trapana.
 *
 * La distinzione giusta non è di colore ma di **posizione**, ed è esattamente
 * la stessa di `holes.js`: il fondo di un'inquadratura arriva sempre fino al
 * bordo del fotogramma, il becco di una papera no. Quindi si toglie il panna
 * **raggiungibile dal bordo**, e il panna circondato dal personaggio resta.
 *
 * Per questo il lavoro vero lo fa `fillHoles`: qui si calcola solo quanto un
 * pixel somiglia al panna, poi si richiudono le "isole" — che in un logo sono
 * le controforme e in una clip sono i becchi.
 *
 * Puro, su byte: si verifica senza browser e senza ffmpeg.
 */

import { fillHoles } from './holes.js';

/** Il vuoto panna del canone, in RGB. */
export const PANNA = [0xf5, 0xf0, 0xe8];

/**
 * Sotto questa distanza dal panna il pixel è fondo pieno; sopra la seconda è
 * soggetto pieno; in mezzo si sfuma.
 *
 * VALORI PROVVISORI, NON MISURATI (2026-08-26). La banda serve ai bordi
 * antialiasati: senza, il contorno del personaggio diventa una scalinata. I
 * numeri vanno corretti guardando un fotogramma vero al 400% — è una misura
 * che si fa a occhio sui pixel, non un parametro da indovinare.
 */
export const DENTRO = 18;
export const FUORI = 46;

/**
 * Distanza di un colore dal panna, in unità RGB.
 *
 * Somma pesata, non euclidea pura: l'occhio pesa il verde più del blu, e sul
 * bordo di un becco panna contro un fondo panna la differenza si gioca su
 * pochi livelli.
 */
function distanzaDalPanna(r, g, b, [pr, pg, pb]) {
  const dr = r - pr;
  const dg = g - pg;
  const db = b - pb;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + db * db) / Math.sqrt(7);
}

/**
 * Calcola il canale alfa di un fotogramma girato sul vuoto panna.
 *
 * @param {Uint8ClampedArray|Buffer} rgb  tre byte per pixel
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]
 * @param {number[]} [opts.panna]   il colore del fondo
 * @param {number} [opts.dentro]    sotto questa distanza è fondo pieno
 * @param {number} [opts.fuori]     sopra questa distanza è soggetto pieno
 * @returns {{alpha: Uint8ClampedArray, isole: number}}
 *   `isole` è quante regioni panna circondate dal soggetto sono state salvate:
 *   se è 0 su una clip col piccione, il key ha mangiato il piccione.
 */
export function alphaFromCreamVoid(rgb, w, h, {
  panna = PANNA,
  dentro = DENTRO,
  fuori = FUORI,
} = {}) {
  const total = w * h;
  if (!rgb || !w || !h || rgb.length < total * 3) {
    throw new Error('Fotogramma non leggibile: dimensioni e byte non coincidono.');
  }
  if (!(fuori > dentro)) {
    throw new Error('La banda morbida è al contrario: "fuori" deve superare "dentro".');
  }

  const alpha = new Uint8ClampedArray(total);
  const banda = fuori - dentro;

  for (let i = 0; i < total; i++) {
    const d = distanzaDalPanna(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], panna);
    if (d <= dentro) alpha[i] = 0;
    else if (d >= fuori) alpha[i] = 255;
    else alpha[i] = Math.round(((d - dentro) / banda) * 255);
  }

  // Il passaggio che salva i becchi: ogni regione trasparente che non tocca il
  // bordo del fotogramma è dentro il personaggio, quindi non è fondo.
  // `areaMax: 1` perché qui non c'è niente da lasciare aperto — in una clip
  // non esistono "buchi voluti", esiste solo il fondo, e il fondo tocca sempre
  // il bordo.
  const { richiusi } = fillHoles(alpha, w, h, { areaMax: 1 });

  return { alpha, isole: richiusi };
}

/**
 * Interlaccia RGB e alfa in RGBA.
 *
 * A mano, un byte alla volta: `sharp.joinChannel` restituisce tre canali in
 * silenzio e la maschera sparisce — è una trappola già pagata una volta.
 */
export function interlaceRgba(rgb, alpha, w, h) {
  const total = w * h;
  const out = new Uint8ClampedArray(total * 4);
  for (let i = 0; i < total; i++) {
    out[i * 4] = rgb[i * 3];
    out[i * 4 + 1] = rgb[i * 3 + 1];
    out[i * 4 + 2] = rgb[i * 3 + 2];
    out[i * 4 + 3] = alpha[i];
  }
  return out;
}
