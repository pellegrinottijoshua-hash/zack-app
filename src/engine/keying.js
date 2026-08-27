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
 * Il colore del fondo, campionato dal bordo dell'immagine — e quanto è piatto.
 *
 * La **mediana** di ogni canale, non la media: se il soggetto tocca il bordo,
 * la media si sposta verso il soggetto e il fondo campionato non è più il
 * fondo. La mediana regge finché il soggetto non occupa più di metà del bordo,
 * e a quel punto non c'è più un fondo da campionare.
 *
 * `uniformita` è la frazione di pixel del bordo che stanno davvero vicini a
 * quel colore. Su uno sticker è 1; su una fotografia crolla. Serve a **poter
 * rifiutare**: questo metodo è esatto su un fondo piatto e sbagliato su tutto
 * il resto, e sbagliato in silenzio è la cosa peggiore che possa fare — l'
 * utente vedrebbe un ritaglio orrendo senza sapere che ha scelto lo strumento
 * sbagliato.
 *
 * @param {Uint8ClampedArray} rgba  quattro byte per pixel
 * @returns {{colore: number[], uniformita: number}}
 */
export function coloreDelBordo(rgba, w, h, { dentro = DENTRO } = {}) {
  const total = w * h;
  if (!rgba || !w || !h || rgba.length < total * 4) {
    throw new Error('Immagine non leggibile: dimensioni e byte non coincidono.');
  }

  const indici = [];
  for (let x = 0; x < w; x++) {
    indici.push(x, (h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    indici.push(y * w, y * w + w - 1);
  }

  const canale = (k) => {
    const v = indici.map((i) => rgba[i * 4 + k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const colore = [canale(0), canale(1), canale(2)];

  let vicini = 0;
  for (const i of indici) {
    if (distanzaDalPanna(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], colore) <= dentro) vicini++;
  }

  return { colore, uniformita: indici.length ? vicini / indici.length : 0 };
}

/**
 * Scontorno per fondo piatto: nessun modello, nessun download.
 *
 * È `alphaFromCreamVoid` con il colore campionato invece che fissato al panna
 * del canone. La logica è identica e lo è per una ragione, non per pigrizia:
 * il problema del becco panna di Zack dentro un vuoto panna e il problema del
 * disco verde dentro un fondo bianco **sono lo stesso problema**, e hanno la
 * stessa soluzione — si toglie il fondo *raggiungibile dal bordo*, non il
 * fondo per colore.
 *
 * Quando è lo strumento giusto: illustrazioni, sticker, loghi, tutto ciò che
 * è generato o disegnato su una tinta unita. Su una fotografia non lo è, ed è
 * `uniformita` a dirlo.
 *
 * @returns {{alpha: Uint8ClampedArray, isole: number, uniformita: number, colore: number[]}}
 *   `isole` sono le regioni del colore di fondo circondate dal disegno e
 *   salvate: se è 0 su un'immagine che ne ha, il key se le è mangiate.
 */
export function alphaDaFondoPiatto(rgba, w, h, { dentro = DENTRO, fuori = FUORI, colore } = {}) {
  const total = w * h;
  if (!rgba || !w || !h || rgba.length < total * 4) {
    throw new Error('Immagine non leggibile: dimensioni e byte non coincidono.');
  }
  if (!(fuori > dentro)) {
    throw new Error('La banda morbida è al contrario: "fuori" deve superare "dentro".');
  }

  const bordo = coloreDelBordo(rgba, w, h, { dentro });
  const fondo = colore || bordo.colore;

  // Il canale RGB da solo, perché `alphaFromCreamVoid` lavora su tre byte: la
  // conversione sta qui e non nel chiamante, che altrimenti dovrebbe conoscere
  // un dettaglio interno di questo file.
  const rgb = new Uint8ClampedArray(total * 3);
  for (let i = 0; i < total; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }

  const { alpha, isole } = alphaFromCreamVoid(rgb, w, h, { panna: fondo, dentro, fuori });
  return { alpha, isole, uniformita: bordo.uniformita, colore: fondo };
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
