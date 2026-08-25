import path from 'node:path';
import { mkdir } from 'node:fs/promises';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const TMP = path.join(ROOT, 'tmp');
// Overridable so the test suite never points at the real library. The tests
// wipe this folder on teardown, and it holds the user's actual work.
export const LIBRARY = process.env.JAYL_CRAFT_LIBRARY
  ? path.resolve(process.env.JAYL_CRAFT_LIBRARY)
  : path.join(ROOT, 'library');
export const PY_PROJECT = path.join(ROOT, 'py');

export async function ensureDirs() {
  await mkdir(TMP, { recursive: true });
  await mkdir(LIBRARY, { recursive: true });
}
