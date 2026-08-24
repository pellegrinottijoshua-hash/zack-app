import { randomUUID } from 'node:crypto';
import { readFile, writeFile, readdir, unlink, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { LIBRARY } from './paths.js';

/**
 * The library is just a folder of files plus a sidecar .json each. No database:
 * the user can open ~/jayl-craft/library in Finder and everything is there
 * under a readable name, which is the whole point of "easy to download".
 */

const THUMB = 320;

function safeName(name) {
  return (
    String(name || 'senza-nome')
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'senza-nome'
  );
}

/**
 * @param {Buffer|string} data  PNG bytes, or an SVG string.
 * @returns {Promise<object>} the item record.
 */
export async function saveWork(data, { name, kind, meta = {} }) {
  // Created here, not only at boot: the folder is a plain directory the user
  // can move or delete at any time, and losing a result over that would be
  // absurd. mkdir -p is free when it already exists.
  await mkdir(LIBRARY, { recursive: true });

  const id = randomUUID().slice(0, 8);
  const isSvg = kind === 'svg';
  const ext = isSvg ? 'svg' : 'png';
  const base = `${safeName(name).replace(/\.[^.]+$/, '')}-${id}.${ext}`;
  const file = path.join(LIBRARY, base);

  const bytes = isSvg ? Buffer.from(data, 'utf8') : data;
  await writeFile(file, bytes);

  // Thumbnails are PNG whatever the source: sharp rasterises SVG for us.
  let thumb = null;
  try {
    thumb = (
      await sharp(bytes)
        .resize(THUMB, THUMB, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
    ).toString('base64');
  } catch {
    // A malformed SVG should still be saved and downloadable, just without a
    // preview — losing the file would be far worse than losing the thumbnail.
  }

  const record = {
    id,
    file: base,
    name: base,
    kind: isSvg ? 'svg' : 'png',
    bytes: bytes.length,
    createdAt: new Date().toISOString(),
    meta,
  };

  await writeFile(path.join(LIBRARY, `${base}.json`), JSON.stringify({ ...record, thumb }, null, 2));
  return { ...record, thumb };
}

export async function listWorks() {
  let files;
  try {
    files = await readdir(LIBRARY);
  } catch {
    return [];
  }
  const records = [];
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try {
      records.push(JSON.parse(await readFile(path.join(LIBRARY, f), 'utf8')));
    } catch {
      // Ignore a corrupt sidecar rather than blanking the whole library.
    }
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readWork(id) {
  const items = await listWorks();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Nessun lavoro con id "${id}"`);
  const file = path.join(LIBRARY, item.file);
  await stat(file); // surface a missing file as an error, not empty bytes
  return { item, file, buffer: await readFile(file) };
}

export async function deleteWork(id) {
  const { item } = await readWork(id);
  await Promise.all([
    unlink(path.join(LIBRARY, item.file)).catch(() => {}),
    unlink(path.join(LIBRARY, `${item.file}.json`)).catch(() => {}),
  ]);
  return { id };
}

export { LIBRARY };
