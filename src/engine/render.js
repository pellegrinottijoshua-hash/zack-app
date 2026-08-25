import { computePlacement, getPreset, BACKGROUNDS } from './export.js';

/**
 * Disegna l'export su canvas, nel browser.
 *
 * Sta separato da `export.js` di proposito: qui c'è solo il disegno, là c'è la
 * matematica — che è la parte capace di sbagliare in silenzio ed è quindi la
 * parte coperta dai test.
 */

/** Ritaglia il vuoto trasparente attorno alla grafica. */
function trimTransparent(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = canvas;
  const { data } = ctx.getImageData(0, 0, w, h);

  let top = h;
  let left = w;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  // Immagine interamente trasparente: non c'è niente da ritagliare.
  if (right < 0) return { canvas, box: { x: 0, y: 0, w, h } };
  return { canvas, box: { x: left, y: top, w: right - left + 1, h: bottom - top + 1 } };
}

async function toCanvas(source) {
  const bitmap = await createImageBitmap(source);
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  c.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return c;
}

/**
 * @param {Blob|File} source  immagine da esportare
 * @returns {Promise<{blob: Blob, meta: object}>}
 */
export async function renderExport(source, { preset: presetId, background = 'transparent', isVector = false } = {}) {
  const preset = getPreset(presetId);
  if (!(background in BACKGROUNDS)) throw new Error(`Sfondo sconosciuto: ${background}`);

  const src = await toCanvas(source);
  const { box } = trimTransparent(src);

  const place = computePlacement(box.w, box.h, preset, { isVector });

  const out = document.createElement('canvas');
  out.width = place.canvas.w;
  out.height = place.canvas.h;
  const ctx = out.getContext('2d');

  const bg = BACKGROUNDS[background];
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, out.width, out.height);
  }

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    src,
    box.x,
    box.y,
    box.w,
    box.h,
    place.x,
    place.y,
    place.draw.w,
    place.draw.h,
  );

  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  return { blob, meta: { preset: preset.id, background, ...place } };
}
