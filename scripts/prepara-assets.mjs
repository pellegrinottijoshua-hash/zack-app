/**
 * Da una cartella di PNG generati a 1024² agli asset che il sito serve.
 *
 * Perché uno script e non «li ho ridimensionati a mano»: le misure e i pesi
 * stanno scritti in `docs/2026-08-27-iconcine-cast.md`, e un file rifatto fra
 * sei mesi deve uscire uguale. Qui la regola è eseguibile.
 *
 *   node scripts/prepara-assets.mjs ~/Desktop/"zack assets app"
 *
 * Lo scontorno usa **il motore del prodotto** (`alphaDaFondoPiatto`), non un
 * comando esterno: se un giorno quel codice sbaglia, sbaglia anche qui e ce ne
 * accorgiamo sui nostri stessi asset invece che sui file di un cliente.
 *
 * `uniformita` decide chi si può scontornare: sotto la soglia il soggetto è
 * dello stesso colore del fondo — il piccione, il gabbiano, la falena sono
 * panna su panna — e tagliare li trapanerebbe. Quelli restano interi e il sito
 * li mostra dentro un cerchio.
 */
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { alphaDaFondoPiatto, interlaceRgba } from '../src/engine/keying.js';

const OUT = resolve(process.cwd(), 'public/zack');

/**
 * Sotto questa uniformità del bordo lo scontorno non è affidabile.
 *
 * MISURATO il 2026-08-27 sui file veri: izack 1.00, sound 0.98, zack draw
 * 0.96, **ipigeon 0.64**. Il salto fra 0.96 e 0.64 è netto e separa
 * esattamente i personaggi scuri da quelli panna, quindi 0.90 sta comodo in
 * mezzo senza essere un numero scelto a caso.
 */
const UNIFORMITA_MIN = 0.9;

/** Quali file, dove finiscono, quanto grandi. Da `docs/2026-08-27-iconcine-cast.md`. */
const PIANO = [
  // I sei del cast: ritratto grande e iconcina. Interi, senza scontorno: il
  // sito li mette in un cerchio, che è anche il motivo per cui il fondo non
  // dà fastidio.
  { da: /^i(zack|pigeon|seagull|moth|cat|ant)\.png$/, in: 'cast', misure: [512, 96], taglia: false },
  // I fermi immagine delle clip: servono sotto `prefers-reduced-motion`, dove
  // un video non parte e senza di loro non resta niente.
  { da: /^r.+\.png$/, in: 'fermi', misure: [512], taglia: false },
  // Stati vuoti e insegne dei servizi: grandi, uno per schermata.
  { da: /^(ebrain|evideo|image|library|sound)\.png$/, in: '', misure: [800], taglia: false },
  // Zack che disegna con la piuma: è l'unico che deve GALLEGGIARE sulla
  // pagina, accanto al tasto e durante l'attesa. Quindi si scontorna.
  { da: /^zack draw\.png$/, in: '', misure: [720, 360], taglia: true, nome: 'zack-disegna' },
  // L'insegna della serie: fondo scuro, resta intera perché il fondo È il
  // disegno. NON si chiama «insegna»: quel nome è già di un altro asset in
  // public/zack/, e usarlo lo sovrascrive in silenzio (successo il 2026-08-27).
  { da: /^hero\.png$/, in: '', misure: [1600, 800], taglia: false, nome: 'hero' },
];

/** Toglie il fondo piatto col motore del prodotto, o spiega perché non l'ha fatto. */
async function scontorna(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const r = alphaDaFondoPiatto(new Uint8ClampedArray(data), w, h);
  if (r.uniformita < UNIFORMITA_MIN) {
    return { ok: false, uniformita: r.uniformita };
  }
  const rgb = new Uint8ClampedArray(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = data[i * 4];
    rgb[i * 3 + 1] = data[i * 4 + 1];
    rgb[i * 3 + 2] = data[i * 4 + 2];
  }
  const rgba = interlaceRgba(rgb, r.alpha, w, h);
  return {
    ok: true,
    uniformita: r.uniformita,
    isole: r.isole,
    img: sharp(Buffer.from(rgba.buffer), { raw: { width: w, height: h, channels: 4 } }),
  };
}

const sorgente = process.argv[2];
if (!sorgente) {
  console.error('Serve la cartella dei PNG.\n  node scripts/prepara-assets.mjs <cartella>');
  process.exit(1);
}

const files = (await readdir(sorgente)).filter((f) => f.endsWith('.png')).sort();
let fatti = 0;

for (const f of files) {
  const regola = PIANO.find((p) => p.da.test(f));
  if (!regola) {
    console.log(`  ${f.padEnd(20)} — nessuna regola, saltato`);
    continue;
  }

  const dir = resolve(OUT, regola.in);
  await mkdir(dir, { recursive: true });
  const base = regola.nome || f.replace(/\.png$/, '');

  let img = sharp(resolve(sorgente, f));
  let nota = '';
  if (regola.taglia) {
    const t = await scontorna(resolve(sorgente, f));
    if (t.ok) {
      img = t.img;
      nota = `scontornato (uniformità ${t.uniformita.toFixed(2)}, ${t.isole} isole)`;
    } else {
      nota = `INTERO: uniformità ${t.uniformita.toFixed(2)} < ${UNIFORMITA_MIN} — panna su panna`;
    }
  }

  const pesi = [];
  for (const m of regola.misure) {
    const nome = regola.misure.length > 1 && m !== regola.misure[0] ? `${base}-${m}` : base;
    const out = resolve(dir, `${nome}.webp`);
    const info = await img
      .clone()
      .resize(m, m, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(out);
    pesi.push(`${m}px ${(info.size / 1024).toFixed(0)}KB`);
  }

  fatti++;
  console.log(`  ${f.padEnd(20)} → ${regola.in || '.'}/${base}  ${pesi.join(' · ')}  ${nota}`);
}

console.log(`\n${fatti} asset preparati in public/zack/`);
