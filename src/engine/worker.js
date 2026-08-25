// Gira dentro un Web Worker. Il thread principale non esegue MAI inferenza:
// durante la sonda del 2026-08-25 un giro a 1024px sul thread principale ha
// bloccato il tab per oltre tre minuti.
import * as ort from 'onnxruntime-web/webgpu';
import { getModel } from './models.js';
import { maskToU8, applyMaskToRgba } from './compose.js';
import { getScale, planTiles, canUpscale } from './upscale.js';

ort.env.wasm.wasmPaths = '/ort/';

let session = null;
let sessionModelId = null;
let provider = 'wasm';

// Sessione separata per l'ingrandimento: alternarla con quella dello
// scontorno costringerebbe a ricaricare un modello a ogni operazione.
let upSession = null;
let upScaleId = null;

const post = (msg, transfer) => self.postMessage(msg, transfer || []);

async function ensureSession(modelId) {
  if (session && sessionModelId === modelId) return;
  const model = getModel(modelId);
  await session?.release?.();
  session = await ort.InferenceSession.create(model.url, {
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

      if (!canUpscale(w, h)) {
        bitmap.close?.();
        post({ type: 'error', id, code: 'upscale-too-large' });
        return;
      }

      post({ type: 'progress', id, phase: 'loading' });
      await ensureUpscale(scaleId);

      const src = new OffscreenCanvas(w, h);
      const sctx = src.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(bitmap, 0, 0);

      const out = new OffscreenCanvas(w * scale.factor, h * scale.factor);
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

        const f = scale.factor;
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
      }

      bitmap.close?.();
      const img = octx.getImageData(0, 0, out.width, out.height);
      post({ type: 'result', id, rgba: img.data, width: out.width, height: out.height }, [
        img.data.buffer,
      ]);
      return;
    }

    if (type === 'cutout') {
      const { bitmap, modelId } = e.data;
      post({ type: 'progress', id, phase: 'loading' });
      await ensureSession(modelId);

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
