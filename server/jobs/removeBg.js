import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '../..');
const TMP = path.join(ROOT, 'tmp');
const PY_PROJECT = path.join(ROOT, 'py');

// Only models we have actually verified against the installed rembg.
// `u2net` downloads fast and is the sane default; birefnet is slower to
// fetch the first time but noticeably cleaner on hair and thin edges.
export const MODELS = [
  'u2net',
  'isnet-general-use',
  'isnet-anime',
  'birefnet-general-lite',
  'birefnet-general',
];

/**
 * Strip the background from an image buffer.
 * Runs rembg in the uv-managed venv as a subprocess — no Python server.
 * @returns {Promise<Buffer>} PNG with an alpha channel.
 */
export async function removeBackground(inputBuffer, { model = 'u2net' } = {}) {
  if (!MODELS.includes(model)) {
    throw new Error(`Unknown model "${model}". Known: ${MODELS.join(', ')}`);
  }

  const id = randomUUID();
  const inPath = path.join(TMP, `${id}-in`);
  const outPath = path.join(TMP, `${id}-out.png`);

  try {
    await writeFile(inPath, inputBuffer);
    await execFileAsync(
      'uv',
      ['run', '--project', PY_PROJECT, 'rembg', 'i', '-m', model, inPath, outPath],
      {
        // The first run for a given model downloads it (hundreds of MB).
        timeout: 10 * 60 * 1000,
        maxBuffer: 1024 * 1024,
      },
    );
    return await readFile(outPath);
  } finally {
    await Promise.all([
      unlink(inPath).catch(() => {}),
      unlink(outPath).catch(() => {}),
    ]);
  }
}
