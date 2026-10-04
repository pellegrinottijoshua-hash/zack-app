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

/* ------------------------------------------------------------------------ *
 * Fetta 6b — le voci. ⚠️ Gli indirizzi sono quelli della documentazione
 * pubblica di ElevenLabs; vanno riconfermati con la chiave vera il giorno
 * della misura, come gli id delle voci pronte.
 * ------------------------------------------------------------------------ */

const conChiave = (env, extra = {}) => {
  if (!env.ELEVENLABS_API_KEY) throw errore('non-configurato');
  return { 'xi-api-key': env.ELEVENLABS_API_KEY, ...extra };
};

/** Il modello che disegna le voci da una descrizione. */
const MODELLO_DISEGNO = 'eleven_multilingual_ttv_v2';
/** Il modello che cambia la voce di una registrazione (6c). */
const MODELLO_CAMBIO = 'eleven_multilingual_sts_v2';

async function jsonOErrore(res) {
  // Mai il corpo nell'errore: potrebbe citare la descrizione del cliente.
  if (!res.ok) throw errore('fornitore', { stato: res.status });
  return res.json().catch(() => {
    throw errore('fornitore', { stato: res.status });
  });
}

/**
 * Descrizione → tre anteprime. Nessuna voce è ancora creata: si sceglie
 * un'anteprima e la si tiene con `creaDaAnteprima`.
 *
 * @returns `[{ id, dati, mime }]`, almeno una, o solleva.
 */
export async function disegnaConElevenLabs({ descrizione, env }) {
  const res = await fetch(`${BASE}/text-to-voice/design`, {
    method: 'POST',
    headers: conChiave(env, { 'content-type': 'application/json' }),
    body: JSON.stringify({ voice_description: descrizione, model_id: MODELLO_DISEGNO, auto_generate_text: true }),
  });
  const d = await jsonOErrore(res);
  const anteprime = (d.previews || [])
    .filter((p) => p?.generated_voice_id && p?.audio_base_64)
    .map((p) => ({ id: p.generated_voice_id, dati: p.audio_base_64, mime: p.media_type || 'audio/mpeg' }));
  if (!anteprime.length) throw errore('fornitore', { stato: 200 });
  return anteprime;
}

/** Tiene un'anteprima: diventa una voce del conto ElevenLabs. Torna il suo id. */
export async function creaDaAnteprima({ nome, descrizione, anteprima, env }) {
  const res = await fetch(`${BASE}/text-to-voice`, {
    method: 'POST',
    headers: conChiave(env, { 'content-type': 'application/json' }),
    body: JSON.stringify({ voice_name: nome, voice_description: descrizione, generated_voice_id: anteprima }),
  });
  const d = await jsonOErrore(res);
  if (!d.voice_id) throw errore('fornitore', { stato: 200 });
  return d.voice_id;
}

/**
 * Clonazione istantanea da un campione. Il consenso lo ha già controllato e
 * scritto il Worker: qui non si arriva senza. Torna l'id della voce.
 */
export async function clonaConElevenLabs({ nome, campione, mime, env }) {
  const corpo = new FormData();
  corpo.append('name', nome);
  corpo.append('files', new Blob([campione], { type: mime || 'audio/mpeg' }), 'campione');
  const res = await fetch(`${BASE}/voices/add`, { method: 'POST', headers: conChiave(env), body: corpo });
  const d = await jsonOErrore(res);
  if (!d.voice_id) throw errore('fornitore', { stato: 200 });
  return d.voice_id;
}

/**
 * Cancella una voce presso ElevenLabs. Un 404 è un successo: la voce non c'è
 * più, che è quello che si voleva. Torna `true`, o solleva.
 */
export async function cancellaConElevenLabs({ voce, env }) {
  const res = await fetch(`${BASE}/voices/${encodeURIComponent(voce)}`, { method: 'DELETE', headers: conChiave(env) });
  if (res.ok || res.status === 404) return true;
  throw errore('fornitore', { stato: res.status });
}

/**
 * Fetta 6c — la voce di una registrazione diventa un'altra (speech-to-speech).
 * Entra un WAV, esce un MP3. `{ dati, mime }`, o solleva.
 */
export async function cambiaConElevenLabs({ voce, audio, env }) {
  const corpo = new FormData();
  corpo.append('audio', new Blob([audio], { type: 'audio/wav' }), 'voce.wav');
  corpo.append('model_id', MODELLO_CAMBIO);
  const res = await fetch(`${BASE}/speech-to-speech/${encodeURIComponent(voce)}?output_format=${FORMATO}`, {
    method: 'POST',
    headers: conChiave(env, { accept: 'audio/mpeg' }),
    body: corpo,
  });
  if (!res.ok) throw errore('fornitore', { stato: res.status });
  const buffer = await res.arrayBuffer();
  if (!buffer.byteLength) throw errore('fornitore', { stato: 200 });
  return { dati: base64(buffer), mime: 'audio/mpeg' };
}
