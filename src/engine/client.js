/**
 * API a promesse verso il worker.
 *
 * Chi chiama non sa che esiste un worker, e non deve saperlo: passa
 * un'immagine, riceve dei pixel. Gli errori arrivano come codici, non come
 * messaggi, perché la frase da mostrare all'utente la sceglie l'interfaccia
 * nella sua lingua.
 */
export function createEngine() {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  let seq = 0;

  worker.onmessage = (e) => {
    const { type, id } = e.data;
    const entry = pending.get(id);
    if (!entry) return;
    if (type === 'progress') {
      entry.onProgress?.(e.data.phase, e.data);
      return;
    }
    pending.delete(id);
    if (type === 'error') {
      const err = new Error(e.data.code);
      err.code = e.data.code;
      entry.reject(err);
    } else {
      entry.resolve(e.data);
    }
  };

  worker.onerror = (e) => {
    console.error(e);
    for (const [, entry] of pending) {
      const err = new Error('engine-crashed');
      err.code = 'engine-crashed';
      entry.reject(err);
    }
    pending.clear();
  };

  const send = (msg, transfer, onProgress) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject, onProgress });
      worker.postMessage({ ...msg, id }, transfer || []);
    });

  return {
    init: (tier) => send({ type: 'init', tier }),
    cutout: (bitmap, modelId, onProgress) =>
      send({ type: 'cutout', bitmap, modelId }, [bitmap], onProgress),
    upscale: (bitmap, scaleId, onProgress) =>
      send({ type: 'upscale', bitmap, scaleId }, [bitmap], onProgress),
    dispose: () => worker.terminate(),
  };
}
