import { useCallback, useRef, useState } from 'react';
import {
  getRecipe,
  playbackRate,
  driveCurve,
  impulseResponse,
  detectOnsets,
  describeRhythm,
} from '../engine/sound.js';

/**
 * Registra la voce e la trasforma.
 *
 * Nessun modello, nessuna API, nessun costo: è tutta elaborazione del segnale
 * dentro Web Audio.
 *
 * **Sull'intonazione, una precisazione onesta.** Il cambio avviene per
 * variazione di velocità, che sposta insieme altezza e timbro — è esattamente
 * il vecchio trucco del nastro rallentato, ed è il motivo per cui funziona:
 * abbassare la sola altezza darebbe un effetto da giradischi guasto, non da
 * gigante. La conseguenza è che il suono cambia anche di durata, cosa che per
 * un effetto sonoro è quasi sempre desiderabile.
 *
 * Il campo `formants` è una pendenza spettrale, non un vero spostamento delle
 * formanti: scurisce o schiarisce il timbro. Fa il suo lavoro, ma chiamarlo
 * col nome giusto evita di aspettarsi ciò che non fa.
 */
export function useSound() {
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState(null); // { buffer, url }
  const [rhythm, setRhythm] = useState(null);
  const [error, setError] = useState(null);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const ctxRef = useRef(null);

  const audioCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  };

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        // Il microfono va spento davvero: lasciarlo acceso accende la spia del
        // dispositivo e fa giustamente insospettire.
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        const buffer = await audioCtx().decodeAudioData(await blob.arrayBuffer());
        const samples = buffer.getChannelData(0);
        const onsets = detectOnsets(samples, buffer.sampleRate);
        setClip({ buffer, url: URL.createObjectURL(blob) });
        setRhythm({ ...describeRhythm(onsets), onsets });
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
    } catch (e) {
      console.error(e);
      setError('mic-denied');
    }
  }, []);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  }, []);

  /** Applica una ricetta e restituisce il risultato come file WAV. */
  const apply = useCallback(
    async (recipeId) => {
      if (!clip?.buffer) return null;
      const r = getRecipe(recipeId);
      const src = clip.buffer;

      const rate = playbackRate(r.semitones);
      const tailSeconds = r.reverb.seconds;
      const length = Math.ceil((src.duration / rate + tailSeconds) * src.sampleRate);

      const off = new OfflineAudioContext(2, length, src.sampleRate);
      const node = off.createBufferSource();
      node.buffer = src;
      node.playbackRate.value = rate;

      // Pendenza spettrale: scurisce o schiarisce senza spostare la nota.
      const tilt = off.createBiquadFilter();
      tilt.type = 'lowshelf';
      tilt.frequency.value = 900;
      tilt.gain.value = -r.formants * 1.5;

      const band = off.createBiquadFilter();
      band.type = r.filter.type;
      band.frequency.value = r.filter.freq;
      band.Q.value = r.filter.q;

      // Il vento nasce dal filtro che si muove: fermo suonerebbe come un tubo.
      if (r.sweep) {
        band.frequency.setValueAtTime(r.sweep.from, 0);
        band.frequency.linearRampToValueAtTime(r.sweep.to, r.sweep.seconds / 2);
        band.frequency.linearRampToValueAtTime(r.sweep.from, r.sweep.seconds);
      }

      const shaper = off.createWaveShaper();
      shaper.curve = driveCurve(r.drive);
      shaper.oversample = '4x';

      const ir = impulseResponse(src.sampleRate, r.reverb.seconds, r.reverb.decay);
      const irBuffer = off.createBuffer(2, ir.length, src.sampleRate);
      irBuffer.copyToChannel(ir.left, 0);
      irBuffer.copyToChannel(ir.right, 1);
      const conv = off.createConvolver();
      conv.buffer = irBuffer;

      const dry = off.createGain();
      const wet = off.createGain();
      dry.gain.value = 1 - r.reverb.mix;
      wet.gain.value = r.reverb.mix;

      node.connect(tilt).connect(band).connect(shaper);
      shaper.connect(dry).connect(off.destination);
      shaper.connect(conv).connect(wet).connect(off.destination);
      node.start();

      const rendered = await off.startRendering();
      return { blob: encodeWav(rendered), buffer: rendered };
    },
    [clip],
  );

  const reset = useCallback(() => {
    if (clip?.url) URL.revokeObjectURL(clip.url);
    setClip(null);
    setRhythm(null);
  }, [clip]);

  return { recording, clip, rhythm, error, start, stop, apply, reset };
}

/**
 * WAV a 16 bit, scritto a mano.
 *
 * Il browser sa decodificare qualunque formato ma non sa codificarne nessuno
 * se non registrando: per consegnare un file servono queste quaranta righe.
 */
function encodeWav(buffer) {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const bytes = frames * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));

  const text = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes, true);

  const data = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      // Il limite è necessario: il riverbero può spingere oltre 1 e senza
      // questo il suono si ripiegherebbe producendo uno scoppio.
      const v = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}
