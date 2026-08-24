import path from 'node:path';
import { mkdir } from 'node:fs/promises';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const TMP = path.join(ROOT, 'tmp');
export const LIBRARY = path.join(ROOT, 'library');
export const PY_PROJECT = path.join(ROOT, 'py');

export async function ensureDirs() {
  await mkdir(TMP, { recursive: true });
  await mkdir(LIBRARY, { recursive: true });
}
