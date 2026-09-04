// Gira dentro un Web Worker. Il thread principale non esegue MAI inferenza:
// durante la sonda del 2026-08-25 un giro a 1024px sul thread principale ha
// bloccato il tab per oltre tre minuti.
import * as ort from 'onnxruntime-web/webgpu';
import { getModel } from './models.js';
import { maskToU8, applyMaskToRgba } from './compose.js';
import {
  getScale,
  planTiles,
  canUpscale,
  probeCanvasPixels,
  reductionFor,
  MODEL_FACTOR,
  MAX_OUTPUT_PIXELS,
} from './upscale.js';
import { bleedEdges, extractAlpha, hasAlpha } from './compose.js';
import { origine } from './origine.js';
import { byteDelModello, chiediSpazioPersistente } from './modelloCache.js';

// Stessa idea di models.js: in locale i file del runtime stanno sotto /ort/.
// `stage-ort.js` li rigenera a ogni build da node_modules, e fra loro
// ort-wasm-simd-threaded.jsep.wasm pesa 26,5 MiB — sopra il tetto di 25 MiB
// di Cloudflare Pages anche se non fosse mai caricato dal browser. In
// produzione va escluso da dist/ e servito da R2 con VITE_ORT_BASE.
ort.env.wasm.wasmPaths = origine(import.meta.env, 'VITE_ORT_BASE', '/ort/');

let session = null;
let sessionModelId = null;
let provider = 'wasm';

// Sessione separata per l'ingrandimento: alternarla con quella dello
// scontorno costringerebbe a ricaricare un modello a ogni operazione.
let upSession = null;
let upScaleId = null;
// Un ingrandimento grande dura minuti: senza un modo di fermarlo, l'unica via
// d'uscita e' chiudere la scheda.
let stopUpscale = false;

// Si chiede UNA volta, all'avvio: senza, la Cache API resta «best effort» e
// il browser la sfratta quando gli serve posto — che e' esattamente cio' che
// faceva riscaricare 176 MB. Un rifiuto non blocca niente.
chiediSpazioPersistente().catch(() => {});

const post = (msg, transfer) => self.postMessage(msg, transfer || []);

/**
 * La sessione, e il modello che le serve.
 *
 * `id` non e' decorativo: serve a emettere la fase `downloading` sulla
 * richiesta giusta. `EngineBanner` ha da agosto una barra con la percentuale
 * per quella fase, e nessuno l'aveva mai emessa nello studio — chi aspettava
 * 176 MB su rete mobile leggeva «Zack sta lavorando…» per minuti.
 *
 * E i byte passano da `byteDelModello`, non piu' dall'URL: cosi' finiscono
 * nella Cache API, che e' l'unica memoria protetta da
 * `navigator.storage.persist()`. Dalla cache HTTP venivano sfrattati.
 */
async function ensureSession(modelId, id) {
  if (session && sessionModelId === modelId) return;
  const model = getModel(modelId);
  await session?.release?.();

  const byte = await byteDelModello(model.url, {
    onProgress: (d) => post({ type: 'progress', id, phase: 'downloading', ...d }),
  });

  session = await ort.InferenceSession.create(byte, {
    executionProviders: [provider],
    graphOptimizationLevel: 'all',
  });
  sessionModelId = modelId;
}

function preprocess(bitmap, model) {
  const { size, norm } = model;
  const c = new OffscreenCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const plane = size * size;
  // rembg divide per il massimo effettivo dell'immagine, non per 255 fisso.
  let max = 1e-6;
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    if (data[p] > max) max = data[p];
    if (data[p + 1] > max) max = data[p + 1];
    if (data[p + 2] > max) max = data[p + 2];
  }

  const f = new Float32Array(3 * plane);
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    f[i] = (data[p] / max - norm.mean[0]) / norm.std[0];
    f[plane + i] = (data[p + 1] / max - norm.mean[1]) / norm.std[1];
    f[2 * plane + i] = (data[p + 2] / max - norm.mean[2]) / norm.std[2];
  }
  return new ort.Tensor('float32', f, [1, 3, size, size]);
}

/** Riporta la maschera a piena risoluzione e la applica ai pixel ORIGINALI. */
function compositeFullRes(bitmap, maskU8, mw, mh) {
  const w = bitmap.width;
  const h = bitmap.height;

  const mc = new OffscreenCanvas(mw, mh);
  const mctx = mc.getContext('2d');
  const md = mctx.createImageData(mw, mh);
  for (let i = 0; i < maskU8.length; i++) {
    md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = maskU8[i];
    md.data[i * 4 + 3] = 255;
  }
  mctx.putImageData(md, 0, 0);

  const up = new OffscreenCanvas(w, h);
  const uctx = up.getContext('2d', { willReadFrequently: true });
  uctx.imageSmoothingQuality = 'high';
  uctx.drawImage(mc, 0, 0, w, h);
  const upMask = uctx.getImageData(0, 0, w, h).data;

  const oc = new OffscreenCanvas(w, h);
  const octx = oc.getContext('2d', { willReadFrequently: true });
  octx.drawImage(bitmap, 0, 0);
  const img = octx.getImageData(0, 0, w, h);

  const flat = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) flat[i] = upMask[i * 4];
  applyMaskToRgba(img.data, flat, w * h);

  return { rgba: img.data, width: w, height: h };
}

async function ensureUpscale(scaleId) {
  if (upSession && upScaleId === scaleId) return;
  const scale = getScale(scaleId);
  await upSession?.release?.();
  upSession = await ort.InferenceSession.create(scale.url, {
    executionProviders: [provider],
    graphOptimizationLevel: 'all',
  });
  upScaleId = scaleId;
}

/** Una piastrella di pixel → tensore NCHW normalizzato 0..1. */
function tileToTensor(data, w, h) {
  const plane = w * h;
  const f = new Float32Array(3 * plane);
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    f[i] = data[p] / 255;
    f[plane + i] = data[p + 1] / 255;
    f[2 * plane + i] = data[p + 2] / 255;
  }
  return new ort.Tensor('float32', f, [1, 3, h, w]);
}

self.onmessage = async (e) => {
  // Arriva mentre l'ingrandimento e' in corso: si limita ad alzare la bandiera,
  // il ciclo la guarda fra una piastrella e l'altra.
  if (e.data.type === 'stop-upscale') {
    stopUpscale = true;
    return;
  }

  const { type, id } = e.data;
  try {
    if (type === 'init') {
      provider = e.data.tier === 'accelerato' ? 'webgpu' : 'wasm';
      post({ type: 'result', id, provider });
      return;
    }

    if (type === 'upscale') {
      const { bitmap, scaleId } = e.data;
      const scale = getScale(scaleId);
      const w = bitmap.width;
      const h = bitmap.height;

      // Il tetto lo decide questo browser, non una costante: una tela oltre il
      // suo limite si crea lo stesso e restituisce pixel vuoti in silenzio.
      const maxOutputPixels = Math.min(MAX_OUTPUT_PIXELS, probeCanvasPixels() || MAX_OUTPUT_PIXELS);
      const verdict = canUpscale(w, h, scale.factor, { maxOutputPixels });
      if (!verdict.ok) {
        bitmap.close?.();
        post({ type: 'error', id, code: `upscale-too-large-${verdict.reason}` });
        return;
      }

      stopUpscale = false;

      post({ type: 'progress', id, phase: 'loading' });
      await ensureUpscale(scaleId);

      const src = new OffscreenCanvas(w, h);
      const sctx = src.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(bitmap, 0, 0);

      // ── L'alfa non passa dal modello ──────────────────────────────────
      // La rete di super-risoluzione ha tre canali: la trasparenza non la
      // vede e non la restituisce. Ingrandire un ritaglio senza mettere da
      // parte l'alfa lo riconsegna opaco — e siccome fuori dal soggetto il
      // canvas ha lasciato NERO, il ritaglio torna un rettangolo nero.
      const srcImg = sctx.getImageData(0, 0, w, h);
      const alpha = hasAlpha(srcImg.data, w * h) ? extractAlpha(srcImg.data, w * h) : null;
      if (alpha) {
        // Il colore del bordo cola nel vuoto prima di dare i pixel al modello:
        // altrimenti ricostruisce quel nero come un contorno vero, e ricompare
        // come alone appena si riapplica l'alfa.
        bleedEdges(srcImg.data, w, h);
        for (let i = 0; i < w * h; i++) srcImg.data[i * 4 + 3] = 255;
        sctx.putImageData(srcImg, 0, 0);
      }

      const out = new OffscreenCanvas(w * MODEL_FACTOR, h * MODEL_FACTOR);
      const octx = out.getContext('2d');

      const tileSize = scale.tile;
      const tiles = planTiles(w, h, tileSize);
      // Il modello pretende una misura fissa: si legge sempre in una tela di
      // quella misura, replicando il bordo quando l'immagine è più piccola —
      // riempire di nero farebbe scurire i margini del risultato.
      const pad = new OffscreenCanvas(tileSize, tileSize);
      const pctx = pad.getContext('2d', { willReadFrequently: true });

      let done = 0;
      for (const t of tiles) {
        pctx.clearRect(0, 0, tileSize, tileSize);
        pctx.drawImage(src, t.read.x, t.read.y, t.avail.w, t.avail.h, 0, 0, t.avail.w, t.avail.h);
        if (t.avail.w < tileSize) {
          pctx.drawImage(pad, t.avail.w - 1, 0, 1, t.avail.h, t.avail.w, 0, tileSize - t.avail.w, t.avail.h);
        }
        if (t.avail.h < tileSize) {
          pctx.drawImage(pad, 0, t.avail.h - 1, tileSize, 1, 0, t.avail.h, tileSize, tileSize - t.avail.h);
        }
        const px = pctx.getImageData(0, 0, tileSize, tileSize);
        const feeds = { [upSession.inputNames[0]]: tileToTensor(px.data, tileSize, tileSize) };
        const res = await upSession.run(feeds);
        const tensor = res[upSession.outputNames[0]];
        const [, , oh, ow] = tensor.dims;

        // Il modello restituisce NCHW 0..1: torna a RGBA per il canvas.
        const plane = ow * oh;
        const rgba = new Uint8ClampedArray(plane * 4);
        for (let i = 0, p = 0; i < plane; i++, p += 4) {
          rgba[p] = Math.max(0, Math.min(255, tensor.data[i] * 255));
          rgba[p + 1] = Math.max(0, Math.min(255, tensor.data[plane + i] * 255));
          rgba[p + 2] = Math.max(0, Math.min(255, tensor.data[2 * plane + i] * 255));
          rgba[p + 3] = 255;
        }

        const tileCanvas = new OffscreenCanvas(ow, oh);
        tileCanvas.getContext('2d').putImageData(new ImageData(rgba, ow, oh), 0, 0);

        const f = MODEL_FACTOR;
        octx.drawImage(
          tileCanvas,
          t.offset.x * f,
          t.offset.y * f,
          t.write.w * f,
          t.write.h * f,
          t.write.x * f,
          t.write.y * f,
          t.write.w * f,
          t.write.h * f,
        );

        post({ type: 'progress', id, phase: 'running', done: ++done, total: tiles.length });

        // Un risultato a meta' e' nitido da una parte e vuoto dall'altra: non
        // si consegna, si dice che e' stato fermato.
        if (stopUpscale) {
          bitmap.close?.();
          post({ type: 'error', id, code: 'upscale-stopped' });
          return;
        }
      }

      bitmap.close?.();

      // Il modello consegna sempre ×4: per un ×2 si riduce a meta' partendo da
      // un'immagine gia' ricostruita, che e' meglio di interpolarla dal piccolo.
      const reduce = reductionFor(scale.factor);
      let final = out;
      if (reduce !== 1) {
        final = new OffscreenCanvas(Math.round(out.width / reduce), Math.round(out.height / reduce));
        const fctx = final.getContext('2d');
        fctx.imageSmoothingQuality = 'high';
        fctx.drawImage(out, 0, 0, final.width, final.height);
      }

      const fw = final.width;
      const fh = final.height;
      const img = final.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, fw, fh);

      if (alpha) {
        // L'alfa si ingrandisce per conto suo, con un ridimensionamento
        // morbido: e' una maschera, non un dettaglio da ricostruire.
        const ac = new OffscreenCanvas(w, h);
        const actx = ac.getContext('2d');
        const ai = actx.createImageData(w, h);
        for (let i = 0; i < w * h; i++) {
          ai.data[i * 4] = ai.data[i * 4 + 1] = ai.data[i * 4 + 2] = alpha[i];
          ai.data[i * 4 + 3] = 255;
        }
        actx.putImageData(ai, 0, 0);

        const big = new OffscreenCanvas(fw, fh);
        const bctx = big.getContext('2d', { willReadFrequently: true });
        bctx.imageSmoothingQuality = 'high';
        bctx.drawImage(ac, 0, 0, fw, fh);
        const bd = bctx.getImageData(0, 0, fw, fh).data;
        for (let i = 0; i < fw * fh; i++) img.data[i * 4 + 3] = bd[i * 4];
      }

      post({ type: 'result', id, rgba: img.data, width: fw, height: fh }, [img.data.buffer]);
      return;
    }

    if (type === 'cutout') {
      const { bitmap, modelId } = e.data;
      post({ type: 'progress', id, phase: 'loading' });
      await ensureSession(modelId, id);

      post({ type: 'progress', id, phase: 'running' });
      const model = getModel(modelId);
      const feeds = { [session.inputNames[0]]: preprocess(bitmap, model) };
      const out = await session.run(feeds);

      const tensor = out[session.outputNames[0]];
      const dims = tensor.dims;
      const mh = dims[dims.length - 2];
      const mw = dims[dims.length - 1];

      post({ type: 'progress', id, phase: 'compositing' });
      const maskU8 = maskToU8(Float32Array.from(tensor.data));
      const result = compositeFullRes(bitmap, maskU8, mw, mh);

      post({ type: 'result', id, ...result }, [result.rgba.buffer]);
      bitmap.close?.();
    }
  } catch (err) {
    // Lo stack va in console per chi sviluppa. All'utente arriva solo un
    // codice, che l'interfaccia traduce in una frase comprensibile.
    console.error(err);
    post({ type: 'error', id, code: type === 'init' ? 'engine-init' : `${type}-failed` });
  }
};
