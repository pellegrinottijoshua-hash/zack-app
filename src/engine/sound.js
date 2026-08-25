/**
 * Il laboratorio dei suoni.
 *
 * **Qui non si genera niente.** Si registra la voce e la si trasforma con
 * filtri: matematica su un'onda, cento per cento in locale, costo zero. È il
 * mestiere dei fonici Foley da cinquant'anni — un tonfo di cocco per uno
 * zoccolo, una busta stropicciata per il fuoco.
 *
 * La differenza con la generazione è sostanziale: nessun modello, nessuna API,
 * nessuna attesa. E il risultato è tuo, non di un fornitore.
 *
 * Questo file contiene solo le RICETTE e la matematica: sono pure e si
 * verificano senza browser. La catena Web Audio la monta `useSound`.
 */

/**
 * Ogni ricetta dice quale gesto vocale imitare e quali filtri applicarci.
 *
 * `semitones` è lo spostamento di intonazione; negativo = più grave.
 * `formants` sposta il timbro senza spostare la nota: è ciò che rende un suono
 * "grande" invece che semplicemente "basso" — abbassare solo l'intonazione dà
 * un effetto da giradischi lento, non da gigante.
 */
export const RECIPES = [
  {
    id: 'gigante',
    labelKey: 'sound.giant.label',
    hintKey: 'sound.giant.hint',
    semitones: -24,
    formants: -6,
    drive: 0.35,
    reverb: { seconds: 2.6, decay: 2.4, mix: 0.4 },
    filter: { type: 'lowpass', freq: 900, q: 0.7 },
  },
  {
    id: 'vento',
    labelKey: 'sound.wind.label',
    hintKey: 'sound.wind.hint',
    semitones: -5,
    formants: -2,
    drive: 0,
    reverb: { seconds: 3.4, decay: 1.8, mix: 0.55 },
    filter: { type: 'bandpass', freq: 700, q: 0.6 },
    sweep: { from: 400, to: 1400, seconds: 3 },
  },
  {
    id: 'motore',
    labelKey: 'sound.engine.label',
    hintKey: 'sound.engine.hint',
    semitones: -12,
    formants: -4,
    drive: 0.7,
    reverb: { seconds: 1.2, decay: 3, mix: 0.18 },
    filter: { type: 'lowpass', freq: 1400, q: 3.5 },
  },
  {
    id: 'metallo',
    labelKey: 'sound.metal.label',
    hintKey: 'sound.metal.hint',
    semitones: 5,
    formants: 3,
    drive: 0.5,
    reverb: { seconds: 3.8, decay: 1.4, mix: 0.6 },
    filter: { type: 'highpass', freq: 1200, q: 1.2 },
  },
  {
    id: 'mostro',
    labelKey: 'sound.monster.label',
    hintKey: 'sound.monster.hint',
    semitones: -14,
    formants: -8,
    drive: 0.55,
    reverb: { seconds: 1.8, decay: 2.2, mix: 0.3 },
    filter: { type: 'lowpass', freq: 1100, q: 1.5 },
  },
  {
    id: 'radio',
    labelKey: 'sound.radio.label',
    hintKey: 'sound.radio.hint',
    semitones: 0,
    formants: 0,
    drive: 0.45,
    reverb: { seconds: 0.4, decay: 4, mix: 0.1 },
    filter: { type: 'bandpass', freq: 1800, q: 4 },
  },
];

export function getRecipe(id) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`Ricetta sconosciuta: ${id}`);
  return r;
}

/** Da semitoni a rapporto di velocità: dodici semitoni = un'ottava. */
export function playbackRate(semitones) {
  return 2 ** (semitones / 12);
}

/**
 * La curva della distorsione morbida.
 *
 * `drive` a zero deve restituire una curva che NON altera il segnale, o un
 * effetto "spento" continuerebbe a sporcare il suono.
 */
export function driveCurve(drive, samples = 1024) {
  const curve = new Float32Array(samples);
  const k = drive * 100;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = k === 0 ? x : ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

/**
 * Il riverbero, come rumore che decade.
 *
 * Costruirlo qui invece di caricare un campione tiene tutto locale e senza
 * file da scaricare.
 */
export function impulseResponse(sampleRate, seconds, decay) {
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const fade = (1 - i / length) ** decay;
    left[i] = (Math.random() * 2 - 1) * fade;
    right[i] = (Math.random() * 2 - 1) * fade;
  }
  return { left, right, length };
}

/**
 * Gli attacchi in una registrazione: quando comincia ogni evento.
 *
 * È la parte che porta il ritmo della tua voce, e si estrae in locale senza
 * modelli. Un attacco è un salto d'energia rispetto a poco prima.
 */
export function detectOnsets(samples, sampleRate, { threshold = 0.18, minGapMs = 90 } = {}) {
  if (!samples?.length || !sampleRate) return [];

  const win = Math.max(1, Math.floor(sampleRate * 0.01));
  const energies = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let sum = 0;
    for (let j = 0; j < win; j++) sum += samples[i + j] * samples[i + j];
    energies.push(Math.sqrt(sum / win));
  }

  let peak = 0;
  for (const e of energies) if (e > peak) peak = e;
  // Silenzio: nessun attacco, invece di trovarne ovunque nel rumore di fondo.
  if (peak < 0.01) return [];

  const minGap = Math.max(1, Math.floor((minGapMs / 1000) * (sampleRate / win)));
  const onsets = [];
  let last = -minGap;
  for (let i = 1; i < energies.length; i++) {
    const rise = (energies[i] - energies[i - 1]) / peak;
    if (rise > threshold && i - last >= minGap) {
      onsets.push({ time: (i * win) / sampleRate, strength: energies[i] / peak });
      last = i;
    }
  }
  return onsets;
}

/**
 * Il ritmo estratto, in forma leggibile: quanti colpi e a che velocità.
 * Serve a mostrare all'utente che la sua voce è stata capita.
 */
export function describeRhythm(onsets) {
  if (onsets.length < 2) return { count: onsets.length, bpm: null };
  const gaps = [];
  for (let i = 1; i < onsets.length; i++) gaps.push(onsets[i].time - onsets[i - 1].time);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { count: onsets.length, bpm: mean > 0 ? Math.round(60 / mean) : null };
}
