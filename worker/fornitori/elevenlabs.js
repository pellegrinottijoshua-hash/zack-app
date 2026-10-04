/**
 * ElevenLabs, tradotto (fase 6).
 *
 * L'unico posto che sa com'è fatto ElevenLabs, come `google.js` per Google e
 * `seedance.js` per Seedance. Il Worker gli passa testo, voce e chiave, e ne
 * riceve la stessa forma di sempre: `{ dati, mime, caratteri }`, oppure un
 * errore con `code`.
 *
 * La chiave sta nei segreti del Worker (`ELEVENLABS_API_KEY`), mai nel browser.
 */

import { MODELLO_VOCE } from '../../src/engine/listinoVoce.js';

const BASE = 'https://api.elevenlabs.io/v1';
/** MP3 a 128 kbps: lo leggono tutti i browser e CapCut, ed è il formato più leggero. */
const FORMATO = 'mp3_44100_128';

const errore = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

/** I byte in base64, a pezzi: `String.fromCharCode(...tutti)` sfonda lo stack. */
function base64(buffer) {
  const byte = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < byte.length; i += 0x8000) {
    s += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/**
 * Testo → audio.
 *
 * @returns `{ dati, mime, caratteri }`: l'MP3 in base64, e i caratteri che
 *   ElevenLabs dichiara di aver contato (l'intestazione `x-character-count`),
 *   o `null` se non li dichiara — il Worker ricade sul conto suo, per eccesso.
 */
export async function leggiConElevenLabs({ testo, voce, env }) {
  if (!env.ELEVENLABS_API_KEY) throw errore('non-configurato');

  const res = await fetch(`${BASE}/text-to-speech/${encodeURIComponent(voce)}?output_format=${FORMATO}`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'content-type': 'application/json',
      accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text: testo, model_id: MODELLO_VOCE }),
  });

  // Mai il corpo nell'errore: potrebbe citare il testo del cliente. Lo stato basta.
  if (!res.ok) throw errore('fornitore', { stato: res.status });

  const buffer = await res.arrayBuffer();
  // Un `200` senza audio è comunque un fallimento: il cliente non paga un file vuoto.
  if (!buffer.byteLength) throw errore('fornitore', { stato: 200 });

  const contati = Number(res.headers.get('x-character-count'));
  return {
    dati: base64(buffer),
    mime: 'audio/mpeg',
    caratteri: Number.isFinite(contati) && contati > 0 ? contati : null,
  };
}
