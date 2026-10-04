/**
 * L'audio che parte verso ElevenLabs (fasi 6b e 6c).
 *
 * Due formati, scelti apposta:
 * - **il campione da clonare** (6b): WAV mono a 44,1 kHz — la qualità del
 *   campione è la qualità della voce clonata;
 * - **l'audio da cambiare** (6c): WAV mono a 16 kHz (`WAV_CAMBIO`), perché il
 *   Worker ne legge la durata dall'intestazione e la fa pagare per quella.
 *
 * `wavPcm16` e `base64Di` sono puri (le prove li girano in node);
 * `ricampionaMono` vuole il browser (OfflineAudioContext).
 */

import { WAV_CAMBIO } from './listinoVoce.js';

export const FREQUENZA_CAMPIONE = 44100;

/** Campioni float [-1, 1] → WAV PCM 16 bit mono. */
export function wavPcm16(campioni, frequenza) {
  const n = campioni.length;
  const b = new Uint8Array(44 + n * 2);
  const v = new DataView(b.buffer);
  const scrivi = (o, s) => {
    for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i);
  };
  scrivi(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  scrivi(8, 'WAVE');
  scrivi(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, frequenza, true);
  v.setUint32(28, frequenza * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  scrivi(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, campioni[i] || 0));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return b;
}

/** I byte in base64, a pezzi (un `fromCharCode(...tutti)` sfonda lo stack). */
export function base64Di(byte) {
  let s = '';
  for (let i = 0; i < byte.length; i += 0x8000) s += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Un AudioBuffer qualunque → campioni mono alla frequenza data (browser). */
export async function ricampionaMono(buffer, frequenza) {
  const lunghezza = Math.max(1, Math.ceil(buffer.duration * frequenza));
  const ctx = new OfflineAudioContext(1, lunghezza, frequenza);
  const sorgente = ctx.createBufferSource();
  sorgente.buffer = buffer;
  sorgente.connect(ctx.destination); // più canali → uno: li mescola il browser
  sorgente.start();
  const reso = await ctx.startRendering();
  return reso.getChannelData(0);
}

/** Il campione da clonare, dal buffer della registrazione (browser). */
export async function wavDelCampione(buffer) {
  return wavPcm16(await ricampionaMono(buffer, FREQUENZA_CAMPIONE), FREQUENZA_CAMPIONE);
}

/** L'audio da cambiare, nel formato che il Worker sa misurare (browser). */
export async function wavDaCambiare(buffer) {
  return wavPcm16(await ricampionaMono(buffer, WAV_CAMBIO.frequenza), WAV_CAMBIO.frequenza);
}
