import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { generaVoce } from '../worker/voce.js';
import { VOCE_LEGGI, VOCI_PRONTE, prezzoLettura, MODELLO_VOCE } from '../src/engine/listinoVoce.js';

/*
 * «Leggi questo» attraverso il Worker (fetta 6a), con la rete finta.
 * Ogni prova parte da uno stato dichiarato: saldo e fornitore li decide la
 * prova. Nessuna chiave vera, nessuna chiamata vera a ElevenLabs.
 *
 * La misura del listino oggi non c'è (`MISURA_VOCE = null`): le prove del giro
 * di soldi passano una misura finta a `generaVoce`, quella della rotta resta
 * quella vera — ed è provato che la rotta risponde 503 senza addebitare.
 */

const MISURA = 30; // millesimi per mille caratteri, FINTA
const AMBIENTE = {
  SUPABASE_SERVICE_KEY: 'sb_secret_finta',
  ELEVENLABS_API_KEY: 'el-finta',
  ASSETS: { fetch: async () => new Response('la home') },
};
const CHI = { id: 'u-1' };
const VOCE = VOCI_PRONTE[0].id;
const TESTO = 'Ciao, sono Zack.';
const PREZZO = prezzoLettura(TESTO, MISURA).total;
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]);

const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});

/** Supabase tiene il saldo; ElevenLabs risponde come gli si dice. Tutto si registra, in ordine. */
function mondo({ saldo = 100000, fornitore = () => new Response(MP3, { headers: { 'x-character-count': '16' } }), accredita = () => new Response('1') } = {}) {
  const chiamate = [];
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    const corpo = o.body ? JSON.parse(o.body) : null;
    chiamate.push({ url, metodo: o.method || 'GET', corpo, intestazioni: o.headers || {} });
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u-1', email: 'c@e.it' }));
    if (url.includes('/rpc/addebita')) {
      return new Response(JSON.stringify(saldo >= corpo.p_prezzo ? saldo - corpo.p_prezzo : null));
    }
    if (url.includes('/rpc/accredita')) return accredita();
    if (url.includes('/rest/v1/lavori')) return new Response('{}', { status: o.method === 'POST' ? 201 : 200 });
    if (url.includes('api.elevenlabs.io')) return fornitore(url, o);
    return new Response('{}');
  };
  return chiamate;
}

const leggi = (corpo, env = AMBIENTE) => generaVoce({ servizio: VOCE_LEGGI, ...corpo }, CHI, env, { misura: MISURA });
const tocca = (c, pezzo) => c.some((x) => x.url.includes(pezzo));

test('⚠️ la rotta vera, oggi: senza misura 503 «non-misurato», PRIMA di addebitare', async () => {
  const c = mondo();
  const res = await worker.fetch(
    new Request('https://zack-app.com/genera', {
      method: 'POST',
      headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
      body: JSON.stringify({ servizio: VOCE_LEGGI, testo: TESTO, voce: VOCE }),
    }),
    AMBIENTE,
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).errore, 'non-misurato');
  assert.ok(!tocca(c, '/rpc/addebita'), 'ha addebitato senza un prezzo');
  assert.ok(!tocca(c, 'elevenlabs'), 'ha chiamato ElevenLabs senza un prezzo');
});

test('⚠️ senza la chiave: 503 «non-configurato» PRIMA dell’addebito', async () => {
  const c = mondo();
  const res = await leggi({ testo: TESTO, voce: VOCE }, { ...AMBIENTE, ELEVENLABS_API_KEY: '' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).errore, 'non-configurato');
  assert.ok(!tocca(c, '/rpc/addebita'));
  assert.ok(!tocca(c, 'elevenlabs'));
});

test('le richieste storte si rifiutano con 400, senza toccare i soldi', async () => {
  for (const [corpo, errore] of [
    [{ testo: '', voce: VOCE }, 'senza-testo'],
    [{ testo: 'a'.repeat(5000), voce: VOCE }, 'testo-troppo-lungo'],
    [{ testo: TESTO, voce: 'voce-di-un-altro' }, 'voce-sconosciuta'],
  ]) {
    const c = mondo();
    const res = await leggi(corpo);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).errore, errore);
    assert.equal(c.length, 0, `${errore}: ha toccato la rete`);
  }
});

test('l’ordine: addebita, apre il lavoro, chiama ElevenLabs, chiude — e risponde l’MP3', async () => {
  const c = mondo({ saldo: 1000 });
  const res = await leggi({ testo: `  ${TESTO}  `, voce: VOCE });
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.prezzo, PREZZO, 'addebitato un prezzo diverso da quello del listino');
  assert.equal(d.saldo, 1000 - PREZZO);
  assert.equal(d.mime, 'audio/mpeg');
  assert.deepEqual([...Uint8Array.from(atob(d.dati), (x) => x.charCodeAt(0))], [...MP3]);

  const i = (f) => c.findIndex(f);
  const addebito = i((x) => x.url.includes('/rpc/addebita'));
  const apre = i((x) => x.metodo === 'POST' && x.url.includes('/rest/v1/lavori'));
  const chiama = i((x) => x.url.includes('api.elevenlabs.io'));
  const chiude = i((x) => x.metodo === 'PATCH' && x.url.includes('/rest/v1/lavori'));
  assert.ok(addebito >= 0 && addebito < apre && apre < chiama && chiama < chiude, JSON.stringify(c.map((x) => x.url)));

  const el = c[chiama];
  assert.match(el.url, new RegExp(`/v1/text-to-speech/${VOCE}\\?output_format=mp3_44100_128$`));
  assert.equal(el.intestazioni['xi-api-key'], 'el-finta');
  assert.deepEqual(el.corpo, { text: TESTO, model_id: MODELLO_VOCE }, 'il testo deve arrivare ripulito ai bordi');
  assert.equal(c[apre].corpo.servizio, VOCE_LEGGI);
  // Il costo vero dai 16 caratteri dichiarati, alla misura: ceil(16 × 30 / 1000) = 1.
  assert.equal(c[chiude].corpo.costo_reale, 1);
  assert.equal(c[chiude].corpo.stato, 'fatto');
});

test('saldo corto: 402 col prezzo, e ElevenLabs non si chiama', async () => {
  const c = mondo({ saldo: PREZZO - 1 });
  const res = await leggi({ testo: TESTO, voce: VOCE });
  assert.equal(res.status, 402);
  assert.deepEqual(await res.json(), { errore: 'saldo', prezzo: PREZZO });
  assert.ok(!tocca(c, 'elevenlabs'));
  assert.ok(!tocca(c, '/rpc/accredita'), 'rimborsato un addebito mai avvenuto');
});

test('⚠️ ElevenLabs fallisce: si rimborsa, e si dice «rimborsato» col saldo di prima', async () => {
  for (const fornitore of [
    () => new Response('{"detail":"quota"}', { status: 401 }),
    () => new Response(new Uint8Array(0)), // 200 vuoto
    () => {
      throw new TypeError('rete');
    },
  ]) {
    const c = mondo({ saldo: 1000, fornitore });
    const res = await leggi({ testo: TESTO, voce: VOCE });
    assert.equal(res.status, 502);
    const d = await res.json();
    assert.equal(d.rimborsato, true);
    assert.equal(d.saldo, 1000);
    const rimborso = c.find((x) => x.url.includes('/rpc/accredita'));
    assert.equal(rimborso.corpo.p_millesimi, PREZZO);
    const chiusura = c.filter((x) => x.metodo === 'PATCH').at(-1);
    assert.equal(chiusura.corpo.stato, 'rimborsato');
  }
});

test('⚠️ il rimborso non prende: si dice «non rimborsato», e il lavoro resta in corso per lo spazzino', async () => {
  const c = mondo({
    saldo: 1000,
    fornitore: () => new Response('', { status: 500 }),
    accredita: () => new Response('{}', { status: 500 }),
  });
  const res = await leggi({ testo: TESTO, voce: VOCE });
  assert.equal(res.status, 502);
  const d = await res.json();
  assert.equal(d.rimborsato, false);
  assert.equal(d.saldo, 1000 - PREZZO, 'il saldo detto deve essere quello vero, non quello sperato');
  assert.ok(!c.some((x) => x.metodo === 'PATCH' && x.corpo?.stato === 'rimborsato'));
});

test('l’errore del fornitore non cita il testo del cliente', async () => {
  mondo({ fornitore: () => new Response(`errore su: ${TESTO}`, { status: 400 }) });
  const res = await leggi({ testo: TESTO, voce: VOCE });
  assert.ok(!(await res.text()).includes('Zack'));
});
