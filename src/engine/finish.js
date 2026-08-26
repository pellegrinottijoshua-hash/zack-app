import { analyzePixels } from './pixels.js';
import { fillHoles } from './holes.js';
import { CANVAS, getShape, placeOnGarment, getGarment, outlineFor } from './mockup.js';

/**
 * Le tre rifiniture, lato browser.
 *
 * Qui c'è solo il disegno su canvas: la matematica sta in `pixels.js`,
 * `crop.js`, `print.js` e `mockup.js`, dove si può verificare senza browser.
 * È la stessa divisione di `export.js` / `render.js`, per la stessa ragione —
 * il codice capace di sbagliare in silenzio deve stare dove i test lo vedono.
 */

async function toCanvas(source) {
  // Un SVG non passa da createImageBitmap in tutti i browser: si rasterizza
  // con un'immagine, che la sa leggere ovunque. Costa un giro in piu' solo
  // dove serve davvero.
  if (source?.type === 'image/svg+xml') return svgToCanvas(source);

  const bitmap = await createImageBitmap(source);
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  c.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return c;
}

/** Sotto questa misura la rasterizzazione di un vettore misura se stessa. */
const SVG_MIN = 1200;

function svgToCanvas(blob) {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      // Un SVG dichiarato piccolo (o senza dimensioni: alcuni browser lo
      // consegnano a 150×150, altri a 0) va rasterizzato grande lo stesso.
      // Misurato il 2026-08-25: lo stesso cerchio dà il 6,8% di bordi sfumati
      // a 160 px e l'1,5% a 800 — sarebbe un avviso di aloni inventato dal
      // nostro stesso antialiasing.
      const w = img.naturalWidth || SVG_MIN;
      const h = img.naturalHeight || SVG_MIN;
      const k = Math.max(1, SVG_MIN / Math.max(w, h));
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG non leggibile.'));
    };
    img.src = url;
  });
}

/**
 * Legge i pixel una volta sola e restituisce le misure.
 *
 * Su immagini enormi la lettura costa: si campiona riducendo il lato lungo,
 * perché tutte le misure che ci servono sono rapporti e riquadri, e un rapporto
 * non cambia se lo si misura su un decimo dei pixel. Il riquadro torna poi in
 * scala piena, così il ritaglio resta esatto.
 */
export async function analyze(source, { sample = 1400 } = {}) {
  const src = await toCanvas(source);
  const scale = Math.min(1, sample / Math.max(src.width, src.height));

  let work = src;
  if (scale < 1) {
    work = document.createElement('canvas');
    work.width = Math.max(1, Math.round(src.width * scale));
    work.height = Math.max(1, Math.round(src.height * scale));
    const c = work.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(src, 0, 0, work.width, work.height);
  }

  const ctx = work.getContext('2d', { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, work.width, work.height);
  const stats = analyzePixels(data, work.width, work.height);

  if (scale === 1) return { ...stats, source: { w: src.width, h: src.height }, scale: 1 };

  // Riporto in scala piena ciò che è misurato in pixel; i rapporti restano.
  const up = (v) => Math.round(v / scale);
  return {
    ...stats,
    image: { w: src.width, h: src.height },
    source: { w: src.width, h: src.height },
    scale,
    box: stats.box
      ? { x: up(stats.box.x), y: up(stats.box.y), w: up(stats.box.w), h: up(stats.box.h) }
      : null,
    centroid: stats.centroid ? { x: stats.centroid.x / scale, y: stats.centroid.y / scale } : null,
  };
}

/** Applica un ritaglio già calcolato. Nessuna decisione qui: solo forbici. */
export async function applyCrop(source, rect) {
  const src = await toCanvas(source);
  const out = document.createElement('canvas');
  out.width = Math.max(1, rect.w);
  out.height = Math.max(1, rect.h);
  out.getContext('2d').drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return canvasToPng(out);
}

/**
 * Disegna il capo con la grafica sopra.
 *
 * Lo sfondo è panna anche per i capi chiari: un capo bianco su fondo bianco è
 * una sagoma invisibile, e il mockup serve proprio a vedere i bordi.
 */
export async function renderMockup(
  source,
  { shape: shapeId, garment: garmentId, size = 1200, box = null } = {},
) {
  const shape = getShape(shapeId);
  const garment = getGarment(garmentId);
  const art = await toCanvas(source);

  const out = document.createElement('canvas');
  out.width = size;
  out.height = Math.round((size * CANVAS.h) / CANVAS.w);
  const ctx = out.getContext('2d');

  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, out.width, out.height);

  ctx.save();
  ctx.scale(out.width / CANVAS.w, out.height / CANVAS.h);
  ctx.fillStyle = `rgb(${garment.rgb.join(',')})`;
  ctx.strokeStyle = outlineFor(garmentId);
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';

  const body = new Path2D(shape.path);
  ctx.fill(body);
  ctx.stroke(body);

  for (const d of shape.details || []) {
    const p = new Path2D(d.d);
    if (d.fill) {
      ctx.fill(p);
      ctx.stroke(p);
    } else {
      ctx.lineWidth = d.width || 8;
      ctx.stroke(p);
      ctx.lineWidth = 6;
    }
  }
  ctx.restore();

  // Si posiziona il SOGGETTO, non il file: un PNG con mezzo metro di margine
  // trasparente finirebbe stampato grande come un francobollo.
  const cut = box || { x: 0, y: 0, w: art.width, h: art.height };
  const place = placeOnGarment(cut.w, cut.h, shape, { w: out.width, h: out.height });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(art, cut.x, cut.y, cut.w, cut.h, place.x, place.y, place.w, place.h);

  return { blob: await canvasToPng(out), place };
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas vuoto.'))), 'image/png'),
  );
}

/**
 * Richiude i buchi che lo scontorno apre dentro un logo.
 *
 * Il lato browser: legge i pixel, passa il solo canale alfa a `holes.js`, e
 * riscrive l'alfa corretto. La decisione — quale regione è un buco e quale è
 * sfondo vero — sta là, dove i test la vedono senza browser.
 *
 * **A piena risoluzione, senza campionare.** `analyze` può permettersi di
 * ridurre perché misura rapporti; qui si modificano i pixel veri, e un buco
 * ricostruito su un decimo dei pixel tornerebbe indietro con il bordo sbagliato.
 *
 * Il colore sotto i pixel richiusi non si inventa: si tiene quello che c'è già.
 * Il canvas premoltiplica, quindi un pixel portato a trasparente ha perso il
 * suo colore sul posto — dentro una controforma quel colore è nero, ed è
 * esattamente il nero del logo. Rimetterci l'alfa lo fa riapparire.
 *
 * @returns {Promise<{blob: Blob, richiusi: number, lasciati: number}>}
 */
export async function closeHoles(source, opts = {}) {
  const canvas = await toCanvas(source);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const total = canvas.width * canvas.height;
  const mask = new Uint8ClampedArray(total);
  for (let i = 0; i < total; i++) mask[i] = img.data[i * 4 + 3];

  const esito = fillHoles(mask, canvas.width, canvas.height, opts);
  if (esito.richiusi === 0) {
    return { blob: source, richiusi: 0, lasciati: esito.lasciati };
  }

  for (let i = 0; i < total; i++) img.data[i * 4 + 3] = mask[i];
  ctx.putImageData(img, 0, 0);

  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  return { blob, richiusi: esito.richiusi, lasciati: esito.lasciati };
}
