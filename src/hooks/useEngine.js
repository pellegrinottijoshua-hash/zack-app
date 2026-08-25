import { useCallback, useEffect, useRef, useState } from 'react';
import { createEngine } from '../engine/client.js';
import { detectWebGpu, pickTier, defaultModelFor, modelsFor } from '../engine/capabilities.js';

/**
 * Tutta la complessità del motore ridotta a: `cutout(file) → Blob`.
 *
 * Il componente che lo usa non sa nulla di worker, provider, tensori o
 * maschere. È il punto in cui il prodotto smette di essere un esperimento.
 */
export function useEngine() {
  const engineRef = useRef(null);
  const [tier, setTier] = useState(null);
  const [phase, setPhase] = useState(null);

  useEffect(() => {
    let alive = true;
    let engine = null;

    (async () => {
      // Sportello per provare la modalità lenta senza cambiare macchina.
      const forced = localStorage.getItem('jayl.forceTier');
      const has = forced ? forced === 'accelerato' : await detectWebGpu(navigator.gpu);
      const chosen = pickTier(has);

      engine = createEngine();
      await engine.init(chosen);
      if (!alive) {
        engine.dispose();
        return;
      }
      engineRef.current = engine;
      setTier(chosen);
    })();

    return () => {
      alive = false;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const cutout = useCallback(
    async (file, modelId) => {
      const engine = engineRef.current;
      if (!engine) {
        const err = new Error('engine-not-ready');
        err.code = 'engine-not-ready';
        throw err;
      }

      const bitmap = await createImageBitmap(file);
      const chosen = modelId || defaultModelFor(tier).id;

      try {
        const { rgba, width, height } = await engine.cutout(bitmap, chosen, setPhase);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
        return await new Promise((res) => canvas.toBlob(res, 'image/png'));
      } finally {
        setPhase(null);
      }
    },
    [tier],
  );

  const upscale = useCallback(async (bitmap, scaleId, onProgress) => {
    const engine = engineRef.current;
    if (!engine) {
      const err = new Error('engine-not-ready');
      err.code = 'engine-not-ready';
      throw err;
    }
    return engine.upscale(bitmap, scaleId, onProgress);
  }, []);

  const stopUpscale = useCallback(() => engineRef.current?.stopUpscale(), []);

  return {
    tier,
    phase,
    cutout,
    upscale,
    stopUpscale,
    ready: Boolean(tier),
    models: tier ? modelsFor(tier) : [],
    defaultModelId: tier ? defaultModelFor(tier).id : null,
  };
}
