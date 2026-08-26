#!/usr/bin/env node
/**
 * Le icone dell'app, dal logo di Zack.
 *
 *   node scripts/make-icons.mjs ~/Desktop/"zack the duck"/logo.png
 *
 * Il logo di partenza è un PNG su fondo nero con parecchia aria intorno:
 * lasciata com'è, a 32 px l'icona diventa un francobollo con un puntino in
 * mezzo. Quindi si ritaglia sul contenuto vero — misurato, non stimato — e lo
 * si ricentra su un quadrato con un margine dichiarato.
 *
 * Perché due margini: l'icona `maskable` viene ritagliata dal sistema operativo
 * dentro un cerchio o un quadrato smussato, e quello che sta oltre l'80% del
 * lato può sparire. Un'icona sola per entrambi gli usi o è troppo piccola nel
 * browser o viene tagliata sul telefono.
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const NERO = { r: 0x11, g: 0x11, b: 0x11, alpha: 1 };

/** Quanto del lato occupa il logo. Il resto è aria. */
const MARGINE = { normale: 0.86, maskable: 0.68 };

const MISURE = [
  { file: 'public/icona-512.png', lato: 512, quota: MARGINE.normale },
  { file: 'public/icona-192.png', lato: 192, quota: MARGINE.normale },
  { file: 'public/icona-maskable-512.png', lato: 512, quota: MARGINE.maskable },
  { file: 'public/apple-touch-icon.png', lato: 180, quota: MARGINE.normale },
  // Le due misure piccole vanno quasi a filo: la faccia è larga più del triplo
  // della sua altezza, quindi in un quadrato lascia comunque aria sopra e
  // sotto. Toglierne altra a sinistra e a destra la renderebbe illeggibile per
  // rispettare un margine che nessuno vede. Provata anche la variante
  // ravvicinata, che riempie il quadrato ma taglia via gli occhi: riempie
  // meglio e si riconosce peggio, quindi no.
  { file: 'public/favicon-32.png', lato: 32, quota: 0.97 },
  { file: 'public/favicon-16.png', lato: 16, quota: 0.97 },
];

/**
 * Solo la faccia, senza il nome scritto sotto.
 *
 * Il logo è un lockup: gli occhi e il becco sopra, "ZACK THE DUCK" sotto.
 * Guardato a 32 px — guardato davvero, non immaginato — il nome diventa una
 * barra grigia illeggibile e la faccia si riduce a un terzo dell'icona. La
 * faccia da sola invece si riconosce anche piccolissima, ed è il marchio: il
 * nome lo legge chi ha tempo, l'icona la si trova in una fila di venti schede.
 *
 * Si trova la banda di righe vuote fra le due parti: è più affidabile di una
 * percentuale scritta a mano, che si romperebbe al primo logo ridisegnato.
 */
function facciaSola(data, w, box) {
  const pieno = new Array(box.height).fill(0);
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const i = ((box.top + y) * w + box.left + x) * 3;
      if (data[i] + data[i + 1] + data[i + 2] > 180) pieno[y]++;
    }
  }

  // La banda vuota più alta fra il 25% e il 75% dell'altezza: sopra c'è la
  // faccia, sotto il nome.
  let inizio = -1, migliore = null;
  for (let y = Math.floor(box.height * 0.25); y < Math.floor(box.height * 0.75); y++) {
    if (pieno[y] === 0) {
      if (inizio === -1) inizio = y;
    } else if (inizio !== -1) {
      const lunga = y - inizio;
      if (!migliore || lunga > migliore.lunga) migliore = { fine: inizio, lunga };
      inizio = -1;
    }
  }
  if (!migliore) return null;
  return { left: box.left, top: box.top, width: box.width, height: migliore.fine };
}

/**
 * Dove finisce il fondo e comincia il logo.
 *
 * Si prende il colore dell'angolo come fondo e si cerca il primo pixel che se
 * ne discosta abbastanza. La soglia è alta apposta: il fondo nero del file ha
 * qualche pixel a 1 invece che a 0, e una soglia stretta prenderebbe il rumore
 * di compressione per contenuto.
 */
async function leggi(percorso) {
  return sharp(percorso).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function contenuto(data, info) {
  const { width: w, height: h } = info;
  const fondo = [data[0], data[1], data[2]];

  let l = w, r = -1, t = h, b = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const scarto =
        Math.abs(data[i] - fondo[0]) + Math.abs(data[i + 1] - fondo[1]) + Math.abs(data[i + 2] - fondo[2]);
      if (scarto > 60) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
    }
  }
  if (r < 0) throw new Error('Nel file non c\'è niente che si distingua dal fondo.');
  return { left: l, top: t, width: r - l + 1, height: b - t + 1 };
}

const sorgente = process.argv[2];
if (!sorgente) {
  console.error('Serve il logo.\n  node scripts/make-icons.mjs ~/Desktop/"zack the duck"/logo.png');
  process.exit(1);
}

const { data, info } = await leggi(sorgente);
const box = contenuto(data, info);
console.log(`Contenuto trovato: ${box.width}×${box.height} a (${box.left}, ${box.top}).`);

const faccia = facciaSola(data, info.width, box);
if (faccia) {
  console.log(`Faccia sola: ${faccia.width}×${faccia.height} — il nome scritto resta fuori.`);
} else {
  console.log('Nessuna banda vuota trovata: uso il logo intero.');
}

await mkdir('public', { recursive: true });
const ritagliato = await sharp(sorgente).extract(faccia || box).png().toBuffer();

for (const { file, lato, quota } of MISURE) {
  const dentro = Math.round(lato * quota);
  const logo = await sharp(ritagliato)
    .resize(dentro, dentro, { fit: 'contain', background: { ...NERO, alpha: 0 } })
    .toBuffer();

  await sharp({ create: { width: lato, height: lato, channels: 4, background: NERO } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(file);

  console.log(`  ${file} — ${lato}×${lato}, logo al ${Math.round(quota * 100)}%`);
}
