import {
  convertImageToSvg,
  convertImageToSvgDefault,
  TracerConfig,
  ColorMode,
  PathSimplifyMode,
  Hierarchical,
} from 'wasm_vtracer';
import { pulisciTracciato, coloreChiave, haTrasparenza, rgbDi } from './tracciato.js';

/**
 * Vettorializzazione nel browser: da pixel a forme, senza server.
 *
 * VTracer compilato in WebAssembly, 140 KB. Lavora sui pixel RGBA grezzi, quindi
 * la preparazione dell'immagine avviene qui su canvas e non altrove.
 */

/**
 * Oltre questa misura il tracciato non guadagna fedeltà, guadagna solo path:
 * un file di stampa tracciato a piena risoluzione produce un SVG da megabyte
 * che nessun editor apre volentieri. È vettoriale, quindi tracciarlo più
 * piccolo non perde nulla.
 */
const TRACE_MAX = 1400;

export const TRACE_PRESETS = [
  { id: 'poster', labelKey: 'trace.poster.label', noteKey: 'trace.poster.note' },
  { id: 'photo', labelKey: 'trace.photo.label', noteKey: 'trace.photo.note' },
  { id: 'bw', labelKey: 'trace.bw.label', noteKey: 'trace.bw.note' },
];

// La build "bundler" di wasm-bindgen istanzia il wasm all'import: non c'è un
// init() da chiamare, e cercarne uno fa fallire l'import con un errore che
// parla di export mancanti invece che di inizializzazione.

/**
 * `clean` non è un passaggio a parte: agisce sui parametri del tracciato.
 * Meno decimali nei path e più tolleranza sui puntini producono un file
 * sensibilmente più leggero, a parità di aspetto.
 */
function configFor(preset, clean, { ritaglia = false } = {}) {
  const cfg = new TracerConfig();
  // Col colore chiave (fase 8a) le sagome NON devono sovrapporsi: impilate, il
  // vuoto è una toppa sopra una base che copre tutto, e togliendo la toppa
  // ricompare la base intera (misurato: 65.000 pixel dipinti su 65.000).
  if (ritaglia) cfg.setHierarchical(Hierarchical.Cutout);
  cfg.setPathPrecision(clean ? 2 : 4);
  if (preset === 'bw') {
    cfg.setColorMode(ColorMode.Binary);
    cfg.setPathSimplifyMode(PathSimplifyMode.Spline);
    cfg.setFilterSpeckle(clean ? 12 : 8);
  } else if (preset === 'photo') {
    cfg.setColorMode(ColorMode.Color);
    cfg.setPathSimplifyMode(PathSimplifyMode.Spline);
    cfg.setColorPrecision(8);
    cfg.setFilterSpeckle(clean ? 4 : 2);
  } else {
    cfg.setColorMode(ColorMode.Color);
    cfg.setPathSimplifyMode(PathSimplifyMode.Spline);
    cfg.setColorPrecision(6);
    cfg.setFilterSpeckle(clean ? 8 : 4);
  }
  return cfg;
}

/** Ritaglia il vuoto trasparente e restituisce il riquadro del contenuto. */
function contentBox(ctx, w, h) {
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
  if (right < 0) return { x: 0, y: 0, w, h, empty: true };
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1, empty: false };
}

/**
 * @param {Blob|File} source
 * @returns {Promise<{svg: string, meta: object}>}
 */
export async function traceToSvg(source, { preset = 'poster', clean = true } = {}) {
  const started = Date.now();

  const bitmap = await createImageBitmap(source);
  const full = document.createElement('canvas');
  full.width = bitmap.width;
  full.height = bitmap.height;
  const fctx = full.getContext('2d', { willReadFrequently: true });
  fctx.drawImage(bitmap, 0, 0);

  // Un design di stampa è per lo più vuoto: tracciarne il vuoto sprecherebbe
  // tutta la risoluzione utile sul nulla.
  const box = contentBox(fctx, full.width, full.height);
  if (box.empty) {
    bitmap.close?.();
    throw Object.assign(new Error('trace-empty'), { code: 'trace-empty' });
  }

  const scale = Math.min(1, TRACE_MAX / Math.max(box.w, box.h));
  const W = Math.max(1, Math.round(box.w * scale));
  const H = Math.max(1, Math.round(box.h * scale));

  const work = document.createElement('canvas');
  work.width = W;
  work.height = H;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  wctx.drawImage(full, box.x, box.y, box.w, box.h, 0, 0, W, H);
  bitmap.close?.();

  /*
   * La trasparenza. VTracer legge l'alfa come colore: senza un fondo, il
   * vuoto diventa una macchia nera. Fino alla fase 8 il fondo era bianco, e
   * il bianco usciva come una sagoma che copriva la tela — dove cliccavi
   * nell'editor, prendevi lui (spec nodi §1).
   *
   * Ora, per i preset a colori, il vuoto si dipinge con un colore CHIAVE che
   * nel disegno non c'è, e dopo si tolgono i tracciati di quel colore
   * (`pulisciTracciato({ fondo })`). I bordi semitrasparenti si decidono a
   * metà (alfa 128): mescolati col colore chiave lascerebbero frange colorate
   * attorno al logo. Il «bianco e nero» resta sul bianco: binarizzato, il
   * colore chiave diventerebbe nero.
   */
  const immagine = wctx.getImageData(0, 0, W, H);
  const px = immagine.data;
  const binario = preset === 'bw';
  const fondo = binario || !haTrasparenza(px) ? null : coloreChiave(px);
  const [fr, fg, fb] = fondo ? rgbDi(fondo) : [255, 255, 255];
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (fondo) {
      if (a < 128) {
        px[i] = fr;
        px[i + 1] = fg;
        px[i + 2] = fb;
      }
    } else if (a < 255) {
      // Sul bianco, come prima: si mescola.
      const k = a / 255;
      px[i] = Math.round(px[i] * k + 255 * (1 - k));
      px[i + 1] = Math.round(px[i + 1] * k + 255 * (1 - k));
      px[i + 2] = Math.round(px[i + 2] * k + 255 * (1 - k));
    }
    px[i + 3] = 255;
  }

  const rgba = new Uint8Array(px.buffer);

  let svg;
  const cfg = configFor(preset, clean, { ritaglia: Boolean(fondo) });
  try {
    svg = convertImageToSvg(rgba, W, H, cfg);
  } finally {
    cfg.free?.();
  }

  // Il tracciato si pulisce per l'editor dei nodi (fase 8a): niente
  // `translate`, niente fondo bianco cliccabile, lati dritti di nuovo dritti.
  // Prima di contare: un disegno che era SOLO fondo è un tracciato vuoto.
  svg = pulisciTracciato(svg, { fondo }).svg;

  const paths = (svg.match(/<path/g) || []).length;
  if (paths === 0) {
    // Caso reale: "bianco e nero" su un soggetto chiaro su fondo chiaro non
    // trova nulla. Salvare un SVG vuoto sembrerebbe un successo.
    throw Object.assign(new Error('trace-empty'), { code: 'trace-empty' });
  }

  // Rendi il risultato indipendente dalla risoluzione: misura come la sorgente
  // ritagliata, ma la geometria resta quella tracciata.
  svg = svg.replace(/<svg([^>]*)>/, (m, attrs) => {
    const stripped = attrs.replace(/\s(width|height|viewBox)="[^"]*"/g, '');
    return `<svg${stripped} width="${box.w}" height="${box.h}" viewBox="0 0 ${W} ${H}">`;
  });

  return {
    svg,
    meta: {
      preset,
      clean,
      source: { w: bitmap.width || full.width, h: full.height },
      traced: { w: W, h: H },
      paths,
      bytes: svg.length,
      ms: Date.now() - started,
    },
  };
}

export { convertImageToSvgDefault };
