import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { TMP, PY_PROJECT } from '../lib/paths.js';

const execFileAsync = promisify(execFile);

export const MODELS = [
  { id: 'u2net', label: 'u2net', note: 'veloce' },
  { id: 'isnet-general-use', label: 'isnet general', note: 'equilibrato' },
  { id: 'isnet-anime', label: 'isnet anime', note: 'illustrazioni' },
  { id: 'birefnet-general-lite', label: 'birefnet lite', note: 'bordi fini' },
  { id: 'birefnet-general', label: 'birefnet', note: 'massimo' },
];

const MODEL_IDS = MODELS.map((m) => m.id);

/**
 * How large an image the neural net actually sees. The net is the slow part
 * and its cost grows with area, so past this size we hand it a reduced copy
 * and reuse the resulting mask at full resolution.
 */
export const DETAIL = {
  fast: 1024,
  balanced: 1536,
  fine: 2048,
};

const MAX_PIXELS = 400_000_000; // ~20000×20000; refuse rather than thrash swap.

async function rembg(args) {
  return execFileAsync('uv', ['run', '--project', PY_PROJECT, 'rembg', 'i', ...args], {
    timeout: 15 * 60 * 1000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

/**
 * Strip the background, preserving the source resolution whatever its size.
 *
 * Small images go straight through rembg. Large ones use a mask pipeline: the
 * net segments a downscaled copy, and that mask is scaled back up and joined
 * onto the untouched original as its alpha channel. The full-resolution pixels
 * are therefore never resampled — only the mask is — so a 3661×4843 print file
 * costs the same net time as a 1536px one.
 *
 * @returns {Promise<{buffer: Buffer, meta: object}>}
 */
export async function removeBackground(
  inputBuffer,
  { model = 'u2net', detail = 'balanced', decontaminate = true } = {},
) {
  if (!MODEL_IDS.includes(model)) {
    throw new Error(`Modello sconosciuto "${model}". Disponibili: ${MODEL_IDS.join(', ')}`);
  }
  const modelMax = DETAIL[detail];
  if (!modelMax) {
    throw new Error(
      `Dettaglio sconosciuto "${detail}". Disponibili: ${Object.keys(DETAIL).join(', ')}`,
    );
  }

  const source = sharp(inputBuffer, { limitInputPixels: MAX_PIXELS });
  const { width, height } = await source.metadata();
  if (!width || !height) throw new Error('Non riesco a leggere le dimensioni di questa immagine.');

  const longSide = Math.max(width, height);
  const id = randomUUID();
  const scratch = [];
  const tmp = (suffix) => {
    const f = path.join(TMP, `${id}-${suffix}`);
    scratch.push(f);
    return f;
  };

  const started = Date.now();
  try {
    // ── Small enough: let rembg produce the cutout directly. ──────────────
    if (longSide <= modelMax) {
      const inPath = tmp('in.png');
      const outPath = tmp('out.png');
      await writeFile(inPath, inputBuffer);

      const flags = ['-m', model, '-ppm'];
      if (decontaminate) flags.push('-dc');
      await rembg([...flags, inPath, outPath]);

      const buffer = await sharp(outPath).png({ compressionLevel: 9 }).toBuffer();
      return {
        buffer,
        meta: {
          strategy: 'direct',
          model,
          source: { w: width, h: height },
          output: { w: width, h: height },
          modelSaw: { w: width, h: height },
          ms: Date.now() - started,
        },
      };
    }

    // ── Large: segment a small copy, apply the mask at full resolution. ───
    const smallPath = tmp('small.png');
    const maskPath = tmp('mask.png');

    const small = await source
      .clone()
      .resize(modelMax, modelMax, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });
    await writeFile(smallPath, small.data);

    await rembg(['-m', model, '-ppm', '-om', smallPath, maskPath]);

    // Lanczos keeps the upscaled edge from turning into a staircase; the RGB
    // pixels themselves are never resampled.
    const mask = await sharp(maskPath)
      .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
      .greyscale()
      .raw()
      .toBuffer();

    const rgb = await sharp(inputBuffer, { limitInputPixels: MAX_PIXELS })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer();

    // Interleaved by hand on purpose. sharp's joinChannel silently returns a
    // 3-channel image here — it drops the mask without raising — so the result
    // would come out fully opaque with no error anywhere to explain why.
    const pixels = width * height;
    if (mask.length !== pixels || rgb.length !== pixels * 3) {
      throw new Error('Maschera e immagine non combaciano: scontorno interrotto.');
    }
    const rgba = Buffer.allocUnsafe(pixels * 4);
    for (let i = 0, j = 0, k = 0; i < pixels; i++, j += 3, k += 4) {
      rgba[k] = rgb[j];
      rgba[k + 1] = rgb[j + 1];
      rgba[k + 2] = rgb[j + 2];
      rgba[k + 3] = mask[i];
    }

    const buffer = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toBuffer();

    return {
      buffer,
      meta: {
        strategy: 'mask',
        model,
        source: { w: width, h: height },
        output: { w: width, h: height },
        modelSaw: { w: small.info.width, h: small.info.height },
        ms: Date.now() - started,
      },
    };
  } finally {
    await Promise.all(scratch.map((f) => unlink(f).catch(() => {})));
  }
}
