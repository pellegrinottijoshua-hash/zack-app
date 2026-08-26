import { SCALES, canUpscale, estimateSeconds, getScale, humanSeconds } from './upscale.js';

/**
 * «Pronto per la stampa»: un pulsante solo.
 *
 * Scontornare e poi ingrandire sono due gesti separati soltanto per chi ha
 * scritto il programma. Per chi stampa sono **una cosa sola**: voglio il
 * soggetto senza sfondo, grande abbastanza da riempire una maglietta.
 *
 * Qui c'è la decisione, pura e verificabile: quanto ingrandire, se ingrandire,
 * e quanto ci vorrà. L'esecuzione sta nell'app, dove può usare il motore.
 */

/**
 * Il lato lungo a cui puntare.
 *
 * L'area stampabile di Gelato a 350 dpi è 3844×5085 px dentro una tela di
 * 4271×5650. Quattromila sul lato lungo la riempie con un margine, ed è il
 * numero che serve avere in mano — non una scelta di comodo.
 */
export const TARGET_SIDE = 4000;

/** Sotto questa frazione del bersaglio non vale la pena ingrandire. */
export const ENOUGH = 0.95;

/** Lo scontorno, misurato a modello caldo. Serve solo a dire l'attesa. */
export const CUTOUT_SECONDS = 2;

/**
 * @param {{w:number,h:number}} image
 * @param {object} [opts]
 * @param {number} [opts.target]  lato lungo desiderato
 * @param {boolean} [opts.cutout] se lo scontorno fa parte del piano
 * @returns {{steps: string[], factor: number|null, scaleId: string|null,
 *            out: {w:number,h:number}, seconds: number, reached: boolean,
 *            reason: string|null}}
 */
export function planReady(image, { target = TARGET_SIDE, cutout = true } = {}) {
  if (!image?.w || !image?.h) throw new Error('Nessuna immagine da preparare.');

  const side = Math.max(image.w, image.h);
  const steps = cutout ? ['cutout'] : [];
  let seconds = cutout ? CUTOUT_SECONDS : 0;

  // Già abbastanza grande: ingrandire non aggiungerebbe dettaglio, solo attesa.
  if (side >= target * ENOUGH) {
    return {
      steps,
      factor: null,
      scaleId: null,
      out: { w: image.w, h: image.h },
      seconds,
      reached: true,
      reason: 'abbastanza',
    };
  }

  // Il fattore più piccolo che arriva al bersaglio: ingrandire più del
  // necessario costa tempo e memoria senza dare un pixel utile in più.
  const needed = target / side;
  const usable = SCALES.filter((s) => canUpscale(image.w, image.h, s.factor).ok).sort(
    (a, b) => a.factor - b.factor,
  );

  if (!usable.length) {
    return {
      steps,
      factor: null,
      scaleId: null,
      out: { w: image.w, h: image.h },
      seconds,
      reached: false,
      reason: 'troppo-grande',
    };
  }

  const chosen = usable.find((s) => s.factor >= needed) || usable[usable.length - 1];
  steps.push('upscale');
  seconds += estimateSeconds(image.w, image.h, getScale(chosen.id));

  const out = { w: image.w * chosen.factor, h: image.h * chosen.factor };
  return {
    steps,
    factor: chosen.factor,
    scaleId: chosen.id,
    out,
    seconds,
    // Vero solo se ci si arriva davvero: promettere quattromila e consegnarne
    // milleduecento sarebbe peggio che dirlo prima.
    reached: Math.max(out.w, out.h) >= target * ENOUGH,
    reason: null,
  };
}

/** L'attesa da scrivere sul pulsante, già pronta per l'interfaccia. */
export function readyLabel(plan) {
  return humanSeconds(plan.seconds);
}
