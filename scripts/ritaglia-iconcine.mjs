/**
 * Dai fogli di facce alle iconcine singole.
 *
 *   node scripts/ritaglia-iconcine.mjs ~/Desktop/"zack the duck/zack assets app/characters 2d"
 *
 * I fogli sono griglie di facce su fondo panna, di misure diverse e con
 * numeri di righe e colonne diversi. **Non si passano le griglie a mano**: si
 * trovano guardando i pixel, perché una griglia scritta a mano è giusta finché
 * qualcuno non rigenera il foglio con una faccia in più.
 *
 * Il metodo: si costruisce il profilo di «quanto contenuto c'è» per colonna e
 * per riga, si tagliano i vuoti, e ogni cella si ritaglia sul suo contenuto
 * vero. Funziona su qualunque griglia, anche irregolare.
 */
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/zack/pg');

/** Quanto un pixel deve staccarsi dal fondo per contare come disegno. */
const SOGLIA = 26;

/** Sotto questa frazione di pixel pieni, una riga o colonna è vuota. */
const VUOTO = 0.004;

/** Le facce che il sito usa per ogni personaggio. Le altre restano nel foglio. */
const QUANTE = 5;

/** Da quale foglio esce quale personaggio, e con che nome. */
const FOGLI = [
  { da: /^cat icons 3\.png$/i, nome: 'icat' },
  { da: /^pigeon icons\.png$/i, nome: 'ipigeon' },
  { da: /^seagull icons\.png$/i, nome: 'iseagull' },
  { da: /^moth flying\.png$/i, nome: 'imoth' },
  { da: /^ant carrying things\.png$/i, nome: 'iant' },
];

/** I tratti pieni di una banda, come frazione. */
function profilo(pieno, w, h, { asseX }) {
  const n = asseX ? w : h;
  const m = asseX ? h : w;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let c = 0;
    for (let j = 0; j < m; j++) c += pieno[asseX ? j * w + i : i * w + j];
    out[i] = c / m;
  }
  return out;
}

/** Le bande contigue sopra la soglia di vuoto. */
function bande(prof) {
  const out = [];
  let da = null;
  for (let i = 0; i < prof.length; i++) {
    const c = prof[i] > VUOTO;
    if (c && da === null) da = i;
    if (!c && da !== null) {
      out.push([da, i - 1]);
      da = null;
    }
  }
  if (da !== null) out.push([da, prof.length - 1]);
  // Le bande di un pixel sono rumore di compressione, non facce.
  return out.filter(([a, b]) => b - a > 4);
}

async function facce(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // Il fondo è il colore dell'angolo: questi fogli sono tutti su tinta unita.
  const fondo = [data[0], data[1], data[2]];
  const pieno = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const d =
      Math.abs(data[i * 4] - fondo[0]) +
      Math.abs(data[i * 4 + 1] - fondo[1]) +
      Math.abs(data[i * 4 + 2] - fondo[2]);
    pieno[i] = d > SOGLIA ? 1 : 0;
  }

  const righe = bande(profilo(pieno, w, h, { asseX: false }));
  const celle = [];
  for (const [y0, y1] of righe) {
    // Le colonne si cercano DENTRO la riga, non su tutto il foglio: due righe
    // con un numero diverso di facce non si allineano, e cercare le colonne
    // globalmente le fonderebbe in una banda sola.
    const bandaH = y1 - y0 + 1;
    const sotto = pieno.subarray(y0 * w, (y1 + 1) * w);
    for (const [x0, x1] of bande(profilo(sotto, w, bandaH, { asseX: true }))) {
      celle.push({ x0, y0, x1, y1 });
    }
  }
  return { celle, w, h };
}

const sorgente = process.argv[2];
if (!sorgente) {
  console.error('Serve la cartella dei fogli.');
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const files = await readdir(sorgente);

for (const regola of FOGLI) {
  const f = files.find((x) => regola.da.test(x));
  if (!f) {
    console.log(`  ${regola.nome.padEnd(10)} — foglio non trovato`);
    continue;
  }
  const via = resolve(sorgente, f);
  const { celle } = await facce(via);
  const scelte = celle.slice(0, QUANTE);

  const pesi = [];
  for (const [i, c] of scelte.entries()) {
    // Quadrata attorno al contenuto, con un margine: una faccia ritagliata al
    // pixel dentro un cerchio tocca il bordo e sembra schiacciata.
    const lato = Math.round(Math.max(c.x1 - c.x0, c.y1 - c.y0) * 1.18);
    const cx = (c.x0 + c.x1) / 2;
    const cy = (c.y0 + c.y1) / 2;
    const info = await sharp(via)
      .extract({
        left: Math.max(0, Math.round(cx - lato / 2)),
        top: Math.max(0, Math.round(cy - lato / 2)),
        width: lato,
        height: lato,
      })
      .resize(96, 96)
      .webp({ quality: 84, effort: 6 })
      .toFile(resolve(OUT, `${regola.nome}-${i + 1}.webp`));
    pesi.push(`${(info.size / 1024).toFixed(1)}KB`);
  }
  console.log(`  ${regola.nome.padEnd(10)} ${celle.length} facce trovate, ${scelte.length} usate — ${pesi.join(' ')}`);
}
