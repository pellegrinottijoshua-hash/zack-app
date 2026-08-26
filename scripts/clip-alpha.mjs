#!/usr/bin/env node
/**
 * Da una clip generata sul vuoto panna a una clip con lo sfondo trasparente.
 *
 *   node scripts/clip-alpha.mjs a-zack-1.mp4 --out public/zack/a-zack-1 \
 *     --from 0.3 --to 3.3 --size 512
 *
 * Cosa fa, in ordine: taglia e ridimensiona con ffmpeg, calcola il canale alfa
 * fotogramma per fotogramma con `src/engine/keying.js`, riscrive un WebM VP9
 * con alfa e — se il Mac lo permette — un .mov HEVC con alfa per Safari.
 *
 * Perché due file: **VP9 con alfa non lo legge Safari**, e HEVC con alfa non lo
 * legge Firefox. Un `<video>` con due `<source>` li serve entrambi, e chi non
 * legge nessuno dei due resta sul riquadro panna, che è comunque canonico.
 *
 * Il numero che conta è `isole`: quante regioni panna circondate dal
 * personaggio sono state salvate dal key. Su una clip con il piccione, il
 * gabbiano, la falena o il becco di Zack in campo, **`isole: 0` significa che
 * il key ha mangiato il personaggio** — lo script lo dice e non lo nasconde.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { alphaFromCreamVoid, interlaceRgba, DENTRO, FUORI } from '../src/engine/keying.js';

function leggiArgomenti(argv) {
  const [input] = argv.filter((a) => !a.startsWith('--'));
  const opt = (nome, standard) => {
    const i = argv.indexOf(`--${nome}`);
    return i === -1 ? standard : argv[i + 1];
  };
  if (!input) {
    console.error('Serve un file in ingresso.\n' +
      '  node scripts/clip-alpha.mjs clip.mp4 --out public/zack/a-zack-1 --from 0.3 --to 3.3');
    process.exit(1);
  }
  return {
    input,
    out: opt('out', input.replace(/\.[^.]+$/, '')),
    from: opt('from', null),
    to: opt('to', null),
    size: Number(opt('size', 512)),
    fps: Number(opt('fps', 25)),
    dentro: Number(opt('dentro', DENTRO)),
    fuori: Number(opt('fuori', FUORI)),
  };
}

function esegui(comando, argomenti, { raccogli = false } = {}) {
  return new Promise((risolvi, rifiuta) => {
    const p = spawn(comando, argomenti, { stdio: raccogli ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    const pezzi = [];
    if (raccogli) {
      p.stdout.on('data', (d) => pezzi.push(d));
      p.stderr.resume();
    }
    p.on('error', rifiuta);
    p.on('close', (codice) => {
      if (codice !== 0) rifiuta(new Error(`${comando} è uscito con codice ${codice}`));
      else risolvi(raccogli ? Buffer.concat(pezzi) : null);
    });
  });
}

/** I fotogrammi grezzi, in RGB, già tagliati e ridimensionati. */
async function fotogrammi({ input, from, to, size, fps }) {
  const argomenti = [];
  if (from !== null) argomenti.push('-ss', String(from));
  if (to !== null) argomenti.push('-to', String(to));
  argomenti.push(
    '-i', input,
    '-vf', `fps=${fps},scale=${size}:${size}:flags=lanczos`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24',
    '-loglevel', 'error',
    '-',
  );
  const grezzo = await esegui('ffmpeg', argomenti, { raccogli: true });

  const perFotogramma = size * size * 3;
  if (grezzo.length === 0) throw new Error('ffmpeg non ha prodotto fotogrammi: controlla --from e --to.');
  if (grezzo.length % perFotogramma !== 0) {
    throw new Error('I byte non sono un multiplo intero di un fotogramma: dimensioni sbagliate.');
  }

  const fuori = [];
  for (let i = 0; i < grezzo.length; i += perFotogramma) {
    fuori.push(grezzo.subarray(i, i + perFotogramma));
  }
  return fuori;
}

const kb = (byte) => `${(byte / 1024).toFixed(0)} KB`;

async function principale() {
  const o = leggiArgomenti(process.argv.slice(2));
  const cartella = await mkdtemp(join(tmpdir(), 'jayl-alpha-'));

  try {
    console.log(`Leggo ${o.input}…`);
    const grezzi = await fotogrammi(o);
    console.log(`${grezzi.length} fotogrammi a ${o.size}×${o.size}, ${o.fps} al secondo.`);

    let isoleTotali = 0;
    let fotogrammiConIsole = 0;

    for (let n = 0; n < grezzi.length; n++) {
      const { alpha, isole } = alphaFromCreamVoid(grezzi[n], o.size, o.size, {
        dentro: o.dentro,
        fuori: o.fuori,
      });
      isoleTotali += isole;
      if (isole > 0) fotogrammiConIsole++;

      const rgba = interlaceRgba(grezzi[n], alpha, o.size, o.size);
      const png = await sharp(Buffer.from(rgba.buffer), {
        raw: { width: o.size, height: o.size, channels: 4 },
      }).png().toBuffer();
      await writeFile(join(cartella, `f${String(n).padStart(5, '0')}.png`), png);
    }

    // Il numero da guardare prima di tutti gli altri.
    console.log(
      `Isole panna salvate: ${isoleTotali} in tutto, ` +
      `su ${fotogrammiConIsole} fotogrammi di ${grezzi.length}.`,
    );
    if (isoleTotali === 0) {
      console.log(
        '\n  ATTENZIONE: nessuna isola salvata.\n' +
        '  Se in questa clip c\'è il piccione, il gabbiano, la falena, o il becco\n' +
        '  di Zack, il key li ha mangiati. Guarda un fotogramma prima di usarla,\n' +
        '  e se serve alza --dentro di qualche punto.\n',
      );
    }

    const ingresso = join(cartella, 'f%05d.png');
    const webm = `${o.out}.webm`;
    await esegui('ffmpeg', [
      '-y', '-framerate', String(o.fps), '-i', ingresso,
      '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
      '-b:v', '0', '-crf', '34', '-an',
      '-loglevel', 'error', webm,
    ]);
    console.log(`Scritto ${webm} — ${kb((await stat(webm)).size)}`);

    // Safari: HEVC con alfa. Dipende dal codificatore hardware del Mac, quindi
    // se non c'è si va avanti lo stesso invece di far fallire tutto.
    const mov = `${o.out}.mov`;
    try {
      await esegui('ffmpeg', [
        '-y', '-framerate', String(o.fps), '-i', ingresso,
        '-c:v', 'hevc_videotoolbox', '-alpha_quality', '0.9',
        '-pix_fmt', 'bgra', '-tag:v', 'hvc1', '-an',
        '-loglevel', 'error', mov,
      ]);
      console.log(`Scritto ${mov} — ${kb((await stat(mov)).size)}`);
    } catch {
      console.log(`Niente HEVC con alfa su questa macchina: ${mov} non scritto.`);
      console.log('Su Safari la clip resterà nel riquadro panna, che è comunque canonico.');
    }
  } finally {
    await rm(cartella, { recursive: true, force: true });
  }
}

principale().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
