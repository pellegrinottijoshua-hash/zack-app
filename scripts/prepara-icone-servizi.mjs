#!/usr/bin/env node
/**
 * Dalle icone consegnate ai cerchi dei servizi.
 *
 * Il committente le consegna quadrate (o quasi), la faccia di Zack in panna su
 * un nero pieno. Qui diventano quello che il sito serve davvero: **cerchi**,
 * in due misure, in webp.
 *
 * Perche' il ritaglio circolare si fa QUI e non in CSS: un `border-radius` sul
 * riquadro nero funziona finche' il fondo e' nero. Nella home il fondo e'
 * panna, e un quadrato nero stondato accanto a un cerchio nero vero si vede.
 * Il cerchio col fondo trasparente sta bene su tutti e due i fondi.
 *
 * Il nome del file e' l'ID DEL SERVIZIO, non quello del disegno: e' il
 * contratto fra la cartella del committente e il codice.
 *
 *   node scripts/prepara-icone-servizi.mjs ~/Desktop/"zack the duck/zack assets app/icone servizi in alto in app"
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

/** Il disegno consegnato → il servizio a cui appartiene. */
const MAPPA = [
  [/bg remover quando ci si va sopra/i, 'scontorna-sopra'],
  [/bg remover/i, 'scontorna'],
  [/brain/i, 'brain'],
  [/rimuovi bg da video/i, 'filmato'],
  [/suono/i, 'suono'],
  [/vettoriale/i, 'vettorializza'],
];

/** Due misure sole: il cerchio grande di centro e tutti gli altri, a 2×. */
const MISURE = [160, 320];

const DENTRO = process.argv[2];
if (!DENTRO) {
  console.error('Serve la cartella delle icone.');
  process.exit(1);
}

const FUORI = resolve('public/zack/servizi');
await mkdir(FUORI, { recursive: true });

const files = (await readdir(DENTRO)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
let fatti = 0;

for (const f of files) {
  const voce = MAPPA.find(([re]) => re.test(f));
  if (!voce) {
    console.log(`· salto ${f} — nessun servizio con questo nome`);
    continue;
  }
  const [, id] = voce;
  const src = join(DENTRO, f);

  // Il quadrato si prende dal CENTRO: una delle icone arriva 1152×928, e
  // schiacciarla al quadrato storcerebbe il becco.
  const meta = await sharp(src).metadata();
  const lato = Math.min(meta.width, meta.height);

  for (const misura of MISURE) {
    const maschera = Buffer.from(
      `<svg width="${misura}" height="${misura}"><circle cx="${misura / 2}" cy="${misura / 2}" r="${misura / 2}" fill="#fff"/></svg>`,
    );
    const buf = await sharp(src)
      .extract({
        left: Math.round((meta.width - lato) / 2),
        top: Math.round((meta.height - lato) / 2),
        width: lato,
        height: lato,
      })
      .resize(misura, misura)
      // `dest-in` tiene i pixel dove la maschera e' opaca: fuori dal cerchio
      // resta trasparente, che e' tutto il punto.
      .composite([{ input: maschera, blend: 'dest-in' }])
      .webp({ quality: 92 })
      .toBuffer();
    const nome = misura === MISURE[0] ? `${id}.webp` : `${id}-${misura}.webp`;
    await writeFile(join(FUORI, nome), buf);
    console.log(`${nome.padEnd(28)} ${String(Math.round(buf.length / 1024)).padStart(4)} KB`);
  }
  fatti++;
}

console.log(`\n${fatti} servizi su ${MAPPA.length} in ${FUORI}`);
