import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { inventaEffetto } from '../worker/voce.js';
import {
  EFFETTO_INVENTA, DURATE_EFFETTO, MISURA_EFFETTO, effettoNonValido, prezzoEffetto,
} from '../src/engine/listinoVoce.js';
import { priceFor } from '../src/engine/ledger.js';
import { mondo, MP3 } from './helpers/mondoVoce.js';

/* «Inventane uno» (fase 7c): listino e Worker, con la rete finta. */

const AMBIENTE = {
  SUPABASE_SERVICE_KEY: 'sb_secret_finta',
  ELEVENLABS_API_KEY: 'el-finta',
  ASSETS: { fetch: async () => new Response('la home') },
};
const CHI = { id: 'u-1' };
const MISURA = 20; // millesimi a secondo, FINTA
const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});
const tocca = (c, pezzo) => c.some((x) => x.url.includes(pezzo));
const inventa = (corpo) => inventaEffetto({ descrizione: 'un tuono lontano', durata: 2, ...corpo }, CHI, AMBIENTE, { misura: MISURA });

test('⚠️ senza misura nessun prezzo; con una misura, a secondo', () => {
  assert.equal(MISURA_EFFETTO, null);
  assert.equal(prezzoEffetto(2), null);
  assert.deepEqual(prezzoEffetto(5, MISURA), priceFor(100));
  assert.equal(prezzoEffetto(3, MISURA), null, 'una durata non offerta non ha prezzo');
});

test('la richiesta: descrizione e durata fra quelle offerte', () => {
  assert.equal(effettoNonValido({ descrizione: 'tuono', durata: 2 }), null);
  assert.equal(effettoNonValido({ descrizione: 'ab', durata: 2 }), 'descrizione-corta');
  assert.equal(effettoNonValido({ descrizione: 'x'.repeat(451), durata: 2 }), 'descrizione-lunga');
  assert.equal(effettoNonValido({ descrizione: 'tuono', durata: 30 }), 'durata');
  assert.ok(DURATE_EFFETTO.every((d) => d >= 0.5 && d <= 22));
});

test('⚠️ la rotta vera, oggi: 503 «non-misurato» senza addebitare', async () => {
  const c = mondo();
  const res = await worker.fetch(
    new Request('https://zack-app.com/genera', {
      method: 'POST',
      headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
      body: JSON.stringify({ servizio: EFFETTO_INVENTA, descrizione: 'un tuono', durata: 2 }),
    }),
    AMBIENTE,
  );
  assert.equal(res.status, 503);
  assert.ok(!tocca(c, '/rpc/addebita'));
});

test('addebita, chiama ElevenLabs con testo e durata, risponde l’MP3', async () => {
  const c = mondo({ saldo: 1000 });
  const res = await inventa({ descrizione: '  un tuono lontano  ', durata: 5 });
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.prezzo, prezzoEffetto(5, MISURA).total);
  assert.deepEqual([...Uint8Array.from(atob(d.dati), (x) => x.charCodeAt(0))], [...MP3]);
  const el = c.find((x) => x.url.includes('/v1/sound-generation'));
  assert.deepEqual(el.corpo, { text: 'un tuono lontano', duration_seconds: 5, prompt_influence: 0.3 });
});

test('⚠️ ElevenLabs fallisce: rimborsato, e lo si dice', async () => {
  const c = mondo({ saldo: 1000, fornitore: () => new Response('', { status: 500 }) });
  const res = await inventa();
  assert.equal(res.status, 502);
  assert.equal((await res.json()).rimborsato, true);
  assert.ok(tocca(c, '/rpc/accredita'));
});

test('storta o senza chiave: rifiutata prima dei soldi', async () => {
  const c = mondo();
  assert.equal((await inventa({ durata: 30 })).status, 400);
  assert.equal(
    (await inventaEffetto({ descrizione: 'tuono', durata: 2 }, CHI, { ...AMBIENTE, ELEVENLABS_API_KEY: '' }, { misura: MISURA })).status,
    503,
  );
  assert.ok(!tocca(c, '/rpc/addebita'));
});
