import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { cambiaVoce } from '../worker/voce.js';
import { VOCE_CAMBIA, VOCI_PRONTE, MAX_SECONDI_CAMBIO, prezzoCambio } from '../src/engine/listinoVoce.js';
import { base64Di, wavPcm16 } from '../src/engine/audioVoce.js';
import { mondo, MP3 } from './helpers/mondoVoce.js';

/*
 * «Cambia voce» attraverso il Worker (fetta 6c). Il prezzo si fa sulla durata
 * che il Worker legge dal WAV, mai su un numero dichiarato dal browser.
 */

const AMBIENTE = {
  SUPABASE_SERVICE_KEY: 'sb_secret_finta',
  ELEVENLABS_API_KEY: 'el-finta',
  ASSETS: { fetch: async () => new Response('la home') },
};
const CHI = { id: 'u-1' };
const VOCE = VOCI_PRONTE[1].id;
const MISURA = 3; // millesimi a secondo, FINTA
const wav = (secondi, frequenza = 16000) => base64Di(wavPcm16(new Float32Array(Math.round(secondi * frequenza)), frequenza));

const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});
const tocca = (c, pezzo) => c.some((x) => x.url.includes(pezzo));
const cambia = (corpo, misura = MISURA) => cambiaVoce({ voce: VOCE, ...corpo }, CHI, AMBIENTE, { misura });

test('⚠️ la rotta vera, oggi: 503 «non-misurato» senza addebitare', async () => {
  const c = mondo();
  const res = await worker.fetch(
    new Request('https://zack-app.com/genera', {
      method: 'POST',
      headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
      body: JSON.stringify({ servizio: VOCE_CAMBIA, voce: VOCE, audio: wav(2) }),
    }),
    AMBIENTE,
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).errore, 'non-misurato');
  assert.ok(!tocca(c, '/rpc/addebita'));
});

test('⚠️ il prezzo è quello della durata VERA del WAV, qualunque cosa dica il browser', async () => {
  const c = mondo({ saldo: 1000 });
  const res = await cambia({ audio: wav(10), secondi: 1 });
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.prezzo, prezzoCambio(10, MISURA).total);
  assert.equal(d.mime, 'audio/mpeg');
  assert.deepEqual([...Uint8Array.from(atob(d.dati), (x) => x.charCodeAt(0))], [...MP3]);
  const el = c.find((x) => x.url.includes('/v1/speech-to-speech/'));
  assert.match(el.url, new RegExp(`/v1/speech-to-speech/${VOCE}\\?output_format=mp3_44100_128$`));
  assert.ok(el.corpo instanceof FormData, 'l’audio va come multipart');
  assert.equal(el.corpo.get('audio').type, 'audio/wav');
});

test('un audio che non è il WAV atteso: 400, senza rete', async () => {
  for (const audio of [btoa('non sono un wav'), wav(2, 44100), 'non base64 !', null]) {
    const c = mondo();
    const res = await cambia({ audio });
    assert.equal(res.status, 400);
    assert.equal(c.length, 0);
  }
});

test('oltre il tetto di secondi: 413, senza rete', async () => {
  const c = mondo();
  const res = await cambia({ audio: wav(MAX_SECONDI_CAMBIO + 1) });
  assert.equal(res.status, 413);
  assert.equal(c.length, 0);
});

test('⚠️ la voce di un altro non si usa: 400 dopo l’archivio, senza addebito', async () => {
  const c = mondo({ voci: ['el-mia'] });
  const res = await cambia({ voce: 'el-altrui', audio: wav(2) });
  assert.equal(res.status, 400);
  assert.ok(!tocca(c, '/rpc/addebita'));
  assert.ok(!tocca(c, 'elevenlabs'));
});

test('una voce del conto si usa', async () => {
  const c = mondo({ voci: ['el-mia'] });
  const res = await cambia({ voce: 'el-mia', audio: wav(2) });
  assert.equal(res.status, 200);
  assert.ok(tocca(c, '/v1/speech-to-speech/el-mia'));
});

test('⚠️ ElevenLabs fallisce: rimborsato, e lo si dice', async () => {
  const c = mondo({ saldo: 1000, fornitore: () => new Response('', { status: 422 }) });
  const res = await cambia({ audio: wav(2) });
  assert.equal(res.status, 502);
  const d = await res.json();
  assert.equal(d.rimborsato, true);
  assert.equal(d.saldo, 1000);
  assert.ok(tocca(c, '/rpc/accredita'));
});

test('senza chiave: 503 prima dell’addebito', async () => {
  const c = mondo();
  const res = await cambiaVoce({ voce: VOCE, audio: wav(2) }, CHI, { ...AMBIENTE, ELEVENLABS_API_KEY: '' }, { misura: MISURA });
  assert.equal(res.status, 503);
  assert.ok(!tocca(c, '/rpc/addebita'));
});
