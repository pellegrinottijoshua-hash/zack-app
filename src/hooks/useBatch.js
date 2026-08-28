import { useCallback, useRef, useState } from 'react';
import {
  planJobs,
  sostituisciRisultato,
  isEmptyPlan,
  markJob,
  nextJob,
  summarize,
  averageMs,
  estimateRemaining,
  OPS,
} from '../engine/batch.js';
import { nomeConSuffisso } from '../store/model.js';
import { renderExport } from '../engine/render.js';
import { planReady } from '../engine/ready.js';
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
  // I ritagli prodotti, tenuti da parte per poterli correggere a mano.
  // Serve il file di PARTENZA insieme al risultato: senza, «Recupera»
  // ridipinge nero, perché il colore tolto vive solo nell'originale.
  const [results, setResults] = useState([]);
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
    setResults([]);
    setCurrent(null);
    setEta(null);
    durations.current = [];
  }, []);

  const run = useCallback(
    async (files, options) => {
      if (!files?.length || isEmptyPlan(options)) return null;

      stopRef.current = false;
      durations.current = [];
      setResults([]);
      let list = planJobs(files, options);
      setJobs(list);
      setRunning(true);

      // I risultati di uno stesso file si incatenano: si esporta il ritaglio,
      // non l'originale. È il motivo per cui l'ordine è per file.
      const latest = new Map();

      /**
       * L'asset che ogni file ha già in libreria, dentro QUESTO giro.
       *
       * Una mappa locale e non lo stato `results`: dentro un ciclo asincrono
       * `results` è il valore catturato alla partenza, e a metà blocco sarebbe
       * sempre vuoto. Serve a far sovrascrivere all'ingrandimento l'asset
       * dello scontorno invece di crearne un secondo con lo stesso nome.
       */
      const assetiDelGiro = new Map();

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
              // Il nome resta quello del file, senza suffisso. "-scontornato"
              // era rumore: che sia scontornato lo dice `meta.op`, e su quaranta
              // file quel suffisso si moltiplicava a ogni passaggio. Il nome si
              // cambia dentro l'app, dove si guarda il risultato.
              const asset = await library.save(blob, {
                name: job.file.name.replace(/\.[^.]+$/, ''),
                kind: 'png',
                meta: { op: 'remove-bg', batch: true },
              });
              assetiDelGiro.set(job.file, asset?.id ?? null);
              setResults((r) => [...r, { file: job.file, blob, assetId: asset?.id }]);
            } else if (job.op === OPS.upscale) {
              // Il fattore lo decide il file, non l'utente: quaranta immagini
              // hanno quaranta misure, e chiedere un fattore unico vuol dire
              // sbagliarlo su quasi tutte.
              const bmp = await createImageBitmap(source);
              const plan = planReady({ w: bmp.width, h: bmp.height }, { cutout: false });
              if (!plan.scaleId) {
                bmp.close?.();
                list = markJob(list, job.id, 'fatto');
                setJobs(list);
                continue;
              }
              const up = await engine.upscale(bmp, plan.scaleId);
              const cv = document.createElement('canvas');
              cv.width = up.width;
              cv.height = up.height;
              cv.getContext('2d').putImageData(new ImageData(up.rgba, up.width, up.height), 0, 0);
              const big = await new Promise((r) => cv.toBlob(r, 'image/png'));
              latest.set(job.file, big);
              /*
               * L'ingrandimento SOVRASCRIVE l'asset dello scontorno.
               *
               * Prima ne salvava un secondo, con lo stesso identico nome — il
               * suffisso l'abbiamo tolto apposta — e la griglia mostra solo
               * l'ultimo passaggio: quello di mezzo restava in libreria,
               * invisibile, a pesare 45 MB per file. Su quaranta erano un paio
               * di gigabyte che nessuno avrebbe mai guardato.
               *
               * Si sovrascrive invece di saltare il primo salvataggio, perché
               * il blocco si può fermare a metà: chi si ferma dopo lo scontorno
               * deve trovarselo in libreria, non scoprire che era un passo
               * intermedio e non è stato tenuto.
               */
              const gia = assetiDelGiro.get(job.file) ?? null;
              const meta = { op: 'ready', scale: plan.scaleId, batch: true };
              let grande;
              if (gia) {
                await library.sovrascrivi(gia, big);
                // `sovrascriviAsset` cambia i byte e il peso, non il `meta`:
                // senza questa riga l'asset resterebbe etichettato `remove-bg`
                // dopo essere stato ingrandito. Un'etichetta sbagliata non
                // rompe niente oggi e si scopre mesi dopo.
                grande = await library.update(gia, { meta });
              } else {
                grande = await library.save(big, {
                  name: job.file.name.replace(/\.[^.]+$/, ''),
                  kind: 'png',
                  meta,
                });
              }
              // Il risultato mostrato è l'ULTIMO passaggio, non lo scontorno:
              // chi guarda la griglia vuole vedere il file che si porterà via,
              // e scaricare quello a metà catena sarebbe una trappola muta.
              setResults((r) =>
                r.map((x) =>
                  x.file === job.file ? { ...x, blob: big, assetId: grande?.id ?? x.assetId } : x,
                ),
              );
            } else if (job.op === OPS.vector) {
              const { svg } = await traceToSvg(source, { preset: 'poster', clean: true });
              await library.save(new Blob([svg], { type: 'image/svg+xml' }), {
                name: nomeConSuffisso(job.file.name.replace(/\.[^.]+$/, ''), 'vettoriale'),
                kind: 'svg',
                meta: { op: 'vectorize', batch: true },
              });
            } else if (job.op === OPS.export) {
              const { blob } = await renderExport(source, {
                preset: job.preset,
                background: 'transparent',
              });
              await library.save(blob, {
                name: nomeConSuffisso(job.file.name.replace(/\.[^.]+$/, ''), job.preset),
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

  /**
   * Rimette dentro il Blocco un risultato corretto a mano.
   *
   * Senza questa, «correggi a mano» era una porta a senso unico: la
   * correzione finiva nel banco a file singolo e in libreria, e la piastrella
   * qui restava quella sbagliata.
   */
  const correggi = useCallback(
    (file, blob) => setResults((r) => sostituisciRisultato(r, file, blob)),
    [],
  );

  return {
    jobs,
    running,
    current,
    eta,
    results,
    run,
    stop,
    clear,
    correggi,
    summary: summarize(jobs),
  };
}
