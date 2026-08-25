import { useCallback, useRef, useState } from 'react';
import {
  planJobs,
  isEmptyPlan,
  markJob,
  nextJob,
  summarize,
  averageMs,
  estimateRemaining,
  OPS,
} from '../engine/batch.js';
import { renderExport } from '../engine/render.js';
import { traceToSvg } from '../engine/trace.js';

/**
 * Esegue le operazioni in blocco, una alla volta.
 *
 * **Una alla volta di proposito.** Il motore ha una sola sessione ONNX e la
 * memoria del browser è finita: lanciarne quaranta in parallelo non le rende
 * più veloci, le fa fallire tutte insieme.
 */
export function useBatch({ engine, library, model }) {
  const [jobs, setJobs] = useState([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(null);
  const [eta, setEta] = useState(null);

  const stopRef = useRef(false);
  const durations = useRef([]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const clear = useCallback(() => {
    setJobs([]);
    setCurrent(null);
    setEta(null);
    durations.current = [];
  }, []);

  const run = useCallback(
    async (files, options) => {
      if (!files?.length || isEmptyPlan(options)) return null;

      stopRef.current = false;
      durations.current = [];
      let list = planJobs(files, options);
      setJobs(list);
      setRunning(true);

      // I risultati di uno stesso file si incatenano: si esporta il ritaglio,
      // non l'originale. È il motivo per cui l'ordine è per file.
      const latest = new Map();

      try {
        for (;;) {
          const job = nextJob(list);
          if (!job || stopRef.current) break;

          setCurrent(job);
          const started = Date.now();
          try {
            const source = latest.get(job.file) || job.file;

            if (job.op === OPS.cutout) {
              const blob = await engine.cutout(job.file, model);
              latest.set(job.file, blob);
              await library.save(blob, {
                name: `${job.file.name.replace(/\.[^.]+$/, '')}-scontornato`,
                kind: 'png',
                meta: { op: 'remove-bg', batch: true },
              });
            } else if (job.op === OPS.vector) {
              const { svg } = await traceToSvg(source, { preset: 'poster', clean: true });
              await library.save(new Blob([svg], { type: 'image/svg+xml' }), {
                name: `${job.file.name.replace(/\.[^.]+$/, '')}-vettoriale`,
                kind: 'svg',
                meta: { op: 'vectorize', batch: true },
              });
            } else if (job.op === OPS.export) {
              const { blob } = await renderExport(source, {
                preset: job.preset,
                background: 'transparent',
              });
              await library.save(blob, {
                name: `${job.file.name.replace(/\.[^.]+$/, '')}-${job.preset}`,
                kind: 'png',
                meta: { op: 'export', preset: job.preset, batch: true },
              });
            }

            durations.current.push(Date.now() - started);
            list = markJob(list, job.id, 'fatto');
          } catch (err) {
            // Un file rotto non ferma gli altri trentanove.
            console.error(err);
            list = markJob(list, job.id, 'fallito', { error: err.code || err.message });
          }

          setJobs(list);
          setEta(estimateRemaining(list, averageMs(durations.current)));
        }
      } finally {
        setRunning(false);
        setCurrent(null);
        setEta(null);
      }

      return summarize(list);
    },
    [engine, library, model],
  );

  return { jobs, running, current, eta, run, stop, clear, summary: summarize(jobs) };
}
