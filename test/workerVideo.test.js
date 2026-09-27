import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { sbloccaVideo } from '../worker/video.js';
import { prezzoVideo } from '../src/engine/listinoVideo.js';

/*
 * Il video attraverso il Worker intero (fase 3), con la rete finta.
 * Ogni prova parte da uno stato dichiarato: saldo e lavoro li decide la
 * prova, mai un saldo già carico per caso. Nessuna chiave vera.
 */

const AMBIENTE = {
  SUPABASE_SERVICE_KEY: 'sb_secret_finta',
  ARK_API_KEY: 'ark-finta',
  HF_CREDENTIALS: 'id:segreto',
  ASSETS: { fetch: async () => new Response('la home') },
};
const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});

const PREZZO = prezzoVideo({ durata: 5, risoluzione: '720p' }).total;
const VIDEO = { servizio: 'video-seedance25', prompt: 'un gatto', durata: 5, risoluzione: '720p', formato: '16:9' };

/**
 * La rete: Supabase dice chi sei e tiene il saldo; il fornitore risponde come
 * gli si dice. Ogni chiamata si registra, in ordine.
 */
function mondo({ saldo = 100000, fornitore = {}, lavoro = null } = {}) {
  const chiamate = [];
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    const corpo = o.body ? JSON.parse(o.body) : null;
    chiamate.push({ url, metodo: o.method || 'GET', corpo });
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u-1', email: 'c@e.it' }));
    if (url.includes('/rpc/addebita')) {
      return new Response(JSON.stringify(saldo >= corpo.p_prezzo ? saldo - corpo.p_prezzo : null));
    }
    if (url.includes('/rpc/accredita')) return new Response('1');
    if (url.includes('/rest/v1/lavori') && o.method === 'POST') return new Response('{}', { status: 201 });
    if (url.includes('/rest/v1/lavori') && o.method === 'PATCH') return new Response('{}');
    if (url.includes('/rest/v1/lavori?')) return new Response(JSON.stringify(lavoro ? [lavoro] : []));
    if (url.includes('bytepluses.com') || url.includes('higgsfield.ai')) {
      const r = typeof fornitore === 'function' ? fornitore(url, o) : fornitore;
      if (r instanceof Response) return r;
      return new Response(JSON.stringify(r));
    }
    return new Response('{}');
  };
  return chiamate;
}

const genera = (corpo, env = AMBIENTE) =>
  worker.fetch(
    new Request('https://zack-app.com/genera', {
      method: 'POST',
      headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
    env,
  );
const chiedi = (id) =>
  worker.fetch(new Request(`https://zack-app.com/lavoro?id=${id}`, { headers: { authorization: 'Bearer t' } }), AMBIENTE);

test('⚠️ l’ordine: addebita, apre il lavoro, crea il task, lo annota — e risponde 202', async () => {
  const c = mondo({ fornitore: { id: 'cgt-9' } });
  const res = await genera(VIDEO);
  assert.equal(res.status, 202);
  const d = await res.json();
  assert.equal(d.prezzo, PREZZO, 'addebitato un prezzo diverso da quello del listino');
  const i = (f) => c.findIndex(f);
  const addebito = i((x) => x.url.includes('/rpc/addebita'));
  const apre = i((x) => x.metodo === 'POST' && x.url.includes('/rest/v1/lavori'));
  const task = i((x) => x.url.includes('bytepluses.com'));
  const annota = i((x) => x.metodo === 'PATCH');
  assert.ok(addebito < apre && apre < task && task < annota, `ordine ${[addebito, apre, task, annota]}`);
  assert.equal(c[annota].corpo.fornitore_rif, 'cgt-9');
  assert.deepEqual(c[annota].corpo.richiesta, { durata: 5, risoluzione: '720p', formato: '16:9' });
});

test('saldo corto: 402 col prezzo, e il fornitore non viene nemmeno chiamato', async () => {
  const c = mondo({ saldo: PREZZO - 1 });
  const res = await genera(VIDEO);
  assert.equal(res.status, 402);
  assert.equal((await res.json()).prezzo, PREZZO);
  assert.equal(c.filter((x) => x.url.includes('bytepluses')).length, 0);
});

test('⚠️ il cancello: Higgsfield a listino non addebita e non genera senza VIDEO_ACCETTA_PERDITA', async () => {
  /*
   * Rompere apposta: togli il controllo `canaleConsentito` da `generaVideo`
   * → ogni video da Higgsfield costa il doppio di quanto incassiamo.
   */
  const c = mondo({ fornitore: { request_id: 'hf-1' } });
  const res = await genera(VIDEO, { ...AMBIENTE, VIDEO_FORNITORE: 'higgsfield' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).errore, 'canale-in-perdita');
  assert.equal(c.filter((x) => x.url.includes('/rpc/addebita')).length, 0, 'ha addebitato prima del cancello');

  const c2 = mondo({ fornitore: { request_id: 'hf-1' } });
  const ok = await genera(VIDEO, { ...AMBIENTE, VIDEO_FORNITORE: 'higgsfield', VIDEO_ACCETTA_PERDITA: '1' });
  assert.equal(ok.status, 202);
  assert.ok(c2.some((x) => x.url.includes('higgsfield.ai')));
});

test('un canale inventato in configurazione non ricade in silenzio su un altro', async () => {
  mondo();
  const res = await genera(VIDEO, { ...AMBIENTE, VIDEO_FORNITORE: 'boh' });
  assert.equal(res.status, 503);
});

test('⚠️ il fornitore rifiuta il task: il cliente è rimborsato, e il lavoro chiuso', async () => {
  const c = mondo({ fornitore: () => new Response('{}', { status: 500 }) });
  const res = await genera(VIDEO);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).rimborsato, true);
  const rimborso = c.find((x) => x.url.includes('/rpc/accredita'));
  assert.ok(rimborso, 'addebitato e mai rimborsato');
  assert.equal(rimborso.corpo.p_millesimi, PREZZO);
  assert.match(rimborso.corpo.p_stripe, /^rimborso:/, 'senza la chiave unica il rimborso potrebbe ripetersi');
});

test('durata, risoluzione e formato fuori lista: 400, niente addebito', async () => {
  for (const storto of [{ durata: 7 }, { risoluzione: '1080p' }, { formato: '2:1' }, { prompt: '  ' }]) {
    const c = mondo();
    const res = await genera({ ...VIDEO, ...storto });
    assert.equal(res.status, 400, JSON.stringify(storto));
    assert.equal(c.filter((x) => x.url.includes('/rpc/addebita')).length, 0);
  }
});

/* ── /lavoro ─────────────────────────────────────────────────────────── */

const LAVORO = {
  id: 'l-1', utente: 'u-1', prezzo: PREZZO, stato: 'in-corso', servizio: 'video-seedance25',
  fornitore: 'byteplus', fornitore_rif: 'cgt-9', richiesta: { durata: 5, risoluzione: '720p', formato: '16:9' },
  creato_il: new Date().toISOString(),
};

test('/lavoro chiede solo i lavori di chi chiede', async () => {
  const c = mondo({ lavoro: null });
  const res = await chiedi('l-altrui');
  assert.equal(res.status, 404);
  assert.match(c.find((x) => x.url.includes('/rest/v1/lavori?')).url, /utente=eq\.u-1/, 'si legge un lavoro senza guardare di chi è');
});

test('/lavoro: finito → URL consegnato e lavoro chiuso «fatto» col costo vero', async () => {
  const c = mondo({ lavoro: LAVORO, fornitore: { status: 'succeeded', content: { video_url: 'https://v/1' }, usage: { total_tokens: 108000 } } });
  const d = await (await chiedi('l-1')).json();
  assert.deepEqual(d, { stato: 'fatto', url: 'https://v/1' });
  const chiude = c.find((x) => x.metodo === 'PATCH');
  assert.equal(chiude.corpo.stato, 'fatto');
  assert.ok(chiude.corpo.costo_reale > 0 && chiude.corpo.costo_reale <= PREZZO);
  assert.equal(c.filter((x) => x.url.includes('/rpc/accredita')).length, 0);
});

test('⚠️ /lavoro: fallito o moderato → rimborso, una volta, con la chiave del lavoro', async () => {
  const c = mondo({ lavoro: LAVORO, fornitore: { status: 'failed' } });
  const d = await (await chiedi('l-1')).json();
  assert.equal(d.stato, 'rimborsato');
  const r = c.find((x) => x.url.includes('/rpc/accredita'));
  assert.equal(r.corpo.p_stripe, 'rimborso:l-1');
  assert.equal(r.corpo.p_millesimi, PREZZO);
});

test('⚠️ /lavoro: il fornitore non risponde → «in corso», niente rimborso e niente consegna', async () => {
  /*
   * «Se il server non risponde, non si conclude niente.» Rompere apposta:
   * nel `catch` di `statoLavoro` rimborsa → un wifi ballerino dal lato del
   * fornitore regalerebbe video.
   */
  const c = mondo({ lavoro: LAVORO, fornitore: () => { throw new TypeError('rete giù'); } });
  const d = await (await chiedi('l-1')).json();
  assert.deepEqual(d, { stato: 'in-corso' });
  assert.equal(c.filter((x) => x.url.includes('/rpc/accredita')).length, 0);
});

test('un lavoro già «fatto» non si rimborsa mai, qualunque cosa dica dopo il fornitore', async () => {
  const c = mondo({ lavoro: { ...LAVORO, stato: 'fatto' }, fornitore: { status: 'expired' } });
  await chiedi('l-1');
  assert.equal(c.filter((x) => x.url.includes('/rpc/accredita')).length, 0);
});

/* ── il giro orario ──────────────────────────────────────────────────── */

test('⚠️ il giro orario chiede al fornitore prima di rimborsare un video', async () => {
  const unOraFa = new Date(Date.now() - 60 * 60000).toISOString();
  // ancora in corso, un'ora: si aspetta
  let c = mondo({ fornitore: { status: 'running' } });
  await sbloccaVideo({ ...LAVORO, creato_il: unOraFa }, AMBIENTE);
  assert.equal(c.filter((x) => x.url.includes('/rpc/accredita')).length, 0, 'rimborsato un video che stava girando');
  // finito nel frattempo: si chiude fatto, niente rimborso
  c = mondo({ fornitore: { status: 'succeeded', content: { video_url: 'https://v' } } });
  await sbloccaVideo({ ...LAVORO, creato_il: unOraFa }, AMBIENTE);
  assert.equal(c.filter((x) => x.url.includes('/rpc/accredita')).length, 0);
  assert.equal(c.find((x) => x.metodo === 'PATCH').corpo.stato, 'fatto');
  // in corso da tre ore (BytePlus lo ha già fatto scadere): si rimborsa
  c = mondo({ fornitore: { status: 'running' } });
  await sbloccaVideo({ ...LAVORO, creato_il: new Date(Date.now() - 180 * 60000).toISOString() }, AMBIENTE);
  assert.equal(c.filter((x) => x.url.includes('/rpc/accredita')).length, 1);
});
