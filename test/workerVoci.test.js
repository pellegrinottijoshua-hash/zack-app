import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { disegnaVoce, clonaVoce, tieniVoce, cancellaVoce, MAX_VOCI_PER_CONTO } from '../worker/voce.js';
import { VOCE_DISEGNA, VOCE_CLONA, VOCI_PRONTE, prezzoDisegno, prezzoClonazione } from '../src/engine/listinoVoce.js';
import { CONSENSO } from '../src/engine/voci.js';
import { mondo } from './helpers/mondoVoce.js';

/*
 * Le voci attraverso il Worker (fetta 6b): disegnare, tenere, clonare col
 * consenso, cancellare. Rete finta, nessuna chiave vera. Le misure dei listini
 * oggi non ci sono: le prove del giro di soldi ne passano una finta, le rotte
 * vere rispondono 503 senza addebitare.
 */

const AMBIENTE = {
  SUPABASE_SERVICE_KEY: 'sb_secret_finta',
  ELEVENLABS_API_KEY: 'el-finta',
  ASSETS: { fetch: async () => new Response('la home') },
};
const CHI = { id: 'u-1' };
const DESCRIZIONE = 'Una voce di donna anziana, calda, con un accento toscano leggero.';
const CAMPIONE = btoa('un campione audio finto');
const MIA = { scelta: 'mia' };

const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});

const tocca = (c, pezzo) => c.some((x) => x.url.includes(pezzo));
const rotta = (percorso, corpo) =>
  worker.fetch(
    new Request(`https://zack-app.com${percorso}`, {
      method: 'POST',
      headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
    AMBIENTE,
  );

const ANTEPRIME = {
  previews: [
    { generated_voice_id: 'g-1', audio_base_64: 'AAA=', media_type: 'audio/mpeg' },
    { generated_voice_id: 'g-2', audio_base_64: 'BBB=' },
  ],
};
const elevenlabs = (url, o) => {
  if (url.endsWith('/v1/text-to-voice/design')) return new Response(JSON.stringify(ANTEPRIME));
  if (url.endsWith('/v1/text-to-voice')) return new Response(JSON.stringify({ voice_id: 'el-nuova' }));
  if (url.endsWith('/v1/voices/add')) return new Response(JSON.stringify({ voice_id: 'el-clonata' }));
  if (o.method === 'DELETE') return new Response('{}');
  return new Response('{}', { status: 404 });
};

/* ------------------------------- disegna ------------------------------- */

test('⚠️ le rotte vere, oggi: disegnare e clonare rispondono 503 «non-misurato» senza addebitare', async () => {
  for (const corpo of [
    { servizio: VOCE_DISEGNA, descrizione: DESCRIZIONE },
    { servizio: VOCE_CLONA, nome: 'Io', consenso: MIA, campione: CAMPIONE, mime: 'audio/webm' },
  ]) {
    const c = mondo({ fornitore: elevenlabs });
    const res = await rotta('/genera', corpo);
    assert.equal(res.status, 503, corpo.servizio);
    assert.equal((await res.json()).errore, 'non-misurato');
    assert.ok(!tocca(c, '/rpc/addebita'));
    assert.ok(!tocca(c, 'elevenlabs'));
    assert.ok(!tocca(c, '/rest/v1/consensi'), 'consenso scritto per una clonazione che non può partire');
  }
});

test('disegnare: descrizione corta o lunga → 400, senza rete', async () => {
  for (const descrizione of ['corta', 'x'.repeat(1001), null]) {
    const c = mondo();
    const res = await disegnaVoce({ descrizione }, CHI, AMBIENTE, { misura: 40 });
    assert.equal(res.status, 400);
    assert.equal(c.length, 0);
  }
});

test('disegnare: addebita il disegno e risponde le anteprime', async () => {
  const c = mondo({ saldo: 1000, fornitore: elevenlabs });
  const res = await disegnaVoce({ descrizione: DESCRIZIONE }, CHI, AMBIENTE, { misura: 40 });
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.prezzo, prezzoDisegno(40).total);
  assert.deepEqual(d.anteprime, [
    { id: 'g-1', dati: 'AAA=', mime: 'audio/mpeg' },
    { id: 'g-2', dati: 'BBB=', mime: 'audio/mpeg' },
  ]);
  const el = c.find((x) => x.url.includes('text-to-voice/design'));
  assert.equal(el.corpo.voice_description, DESCRIZIONE);
});

test('⚠️ disegnare: nessuna anteprima è un fallimento, e si rimborsa', async () => {
  const c = mondo({ saldo: 1000, fornitore: () => new Response(JSON.stringify({ previews: [] })) });
  const res = await disegnaVoce({ descrizione: DESCRIZIONE }, CHI, AMBIENTE, { misura: 40 });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).rimborsato, true);
  assert.ok(tocca(c, '/rpc/accredita'));
});

/* -------------------------------- tieni -------------------------------- */

test('tenere un’anteprima: la voce nasce e si registra nel conto, senza soldi', async () => {
  const c = mondo({ fornitore: elevenlabs });
  const res = await rotta('/voce/tieni', { anteprima: 'g-1', nome: ' Nonna ', descrizione: DESCRIZIONE });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).voce, { id: 'el-nuova', nome: 'Nonna', origine: 'disegnata', consenso: null });
  assert.deepEqual(c.voci, ['el-nuova']);
  assert.ok(!tocca(c, '/rpc/addebita'));
});

test('⚠️ il tetto di voci per conto: oltre, 409 e ElevenLabs non si chiama', async () => {
  const piene = Array.from({ length: MAX_VOCI_PER_CONTO }, (_, i) => `el-${i}`);
  const c = mondo({ voci: piene, fornitore: elevenlabs });
  const res = await tieniVoce({ anteprima: 'g-1', nome: 'Altra', descrizione: DESCRIZIONE }, CHI, AMBIENTE);
  assert.equal(res.status, 409);
  assert.ok(!tocca(c, 'elevenlabs'));
});

test('⚠️ tenere: se l’archivio non la registra, la voce si cancella presso ElevenLabs', async () => {
  let registra = 0;
  const c = mondo({ fornitore: elevenlabs });
  const fetchMondo = globalThis.fetch;
  globalThis.fetch = async (u, o = {}) => {
    if (String(u).includes('/rest/v1/voci') && o.method === 'POST') {
      registra += 1;
      return new Response('{}', { status: 500 });
    }
    return fetchMondo(u, o);
  };
  const res = await tieniVoce({ anteprima: 'g-1', nome: 'Nonna', descrizione: DESCRIZIONE }, CHI, AMBIENTE);
  assert.equal(res.status, 500);
  assert.equal(registra, 2, 'un secondo tentativo, poi basta');
  assert.ok(c.some((x) => x.metodo === 'DELETE' && x.url.includes('/v1/voices/el-nuova')));
});

/* -------------------------------- clona -------------------------------- */

const clona = (corpo, misura = 100) =>
  clonaVoce({ nome: 'Io', consenso: MIA, campione: CAMPIONE, mime: 'audio/webm', ...corpo }, CHI, AMBIENTE, { misura });

test('⚠️ senza consenso valido la clonazione non parte: 400, nessuna rete', async () => {
  for (const consenso of [null, { scelta: 'boh' }, { scelta: 'permesso' }, { scelta: 'permesso', chiParla: ' ' }]) {
    const c = mondo({ fornitore: elevenlabs });
    const res = await clona({ consenso });
    assert.equal(res.status, 400, JSON.stringify(consenso));
    assert.equal(c.length, 0);
  }
});

test('clonare: campione storto o troppo grande → rifiutato prima di tutto', async () => {
  for (const [corpo, stato] of [
    [{ mime: 'image/png' }, 400],
    [{ campione: 'non è base64!' }, 400],
    [{ campione: 'A'.repeat(14 * 1024 * 1024) }, 413],
  ]) {
    const c = mondo();
    const res = await clona(corpo);
    assert.equal(res.status, stato, JSON.stringify(Object.keys(corpo)));
    assert.equal(c.length, 0);
  }
});

test('⚠️ l’ordine: il consenso si scrive PRIMA dell’addebito e della chiamata, col testo del giorno', async () => {
  const c = mondo({ saldo: 1000, fornitore: elevenlabs });
  const res = await clona({ consenso: { scelta: 'permesso', chiParla: ' Marta ' } });
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.prezzo, prezzoClonazione(100).total);
  assert.equal(d.voce.id, 'el-clonata');
  assert.equal(d.voce.origine, 'clonata');

  const i = (f) => c.findIndex(f);
  const consenso = i((x) => x.url.includes('/rest/v1/consensi'));
  const addebito = i((x) => x.url.includes('/rpc/addebita'));
  const chiama = i((x) => x.url.includes('/v1/voices/add'));
  assert.ok(consenso >= 0 && consenso < addebito && addebito < chiama);

  const riga = c[consenso].corpo;
  assert.equal(riga.scelta, 'permesso');
  assert.equal(riga.chi_parla, 'Marta');
  assert.match(riga.impronta, /^[0-9a-f]{64}$/);
  assert.ok(riga.testo.includes('Questa voce è di Marta.') && riga.testo.includes(CONSENSO.versione));
  assert.equal(d.voce.consenso, riga.id, 'la voce porta il riferimento alla SUA riga di consenso');
  assert.deepEqual(c.voci, ['el-clonata']);
});

test('⚠️ il consenso non si scrive: la clonazione non parte e non si addebita', async () => {
  const c = mondo({ saldo: 1000, fornitore: elevenlabs, archivioConsensi: false });
  const res = await clona();
  assert.equal(res.status, 500);
  assert.ok(!tocca(c, '/rpc/addebita'));
  assert.ok(!tocca(c, 'elevenlabs'));
});

test('clonare: ElevenLabs rifiuta (es. il piano gratuito) → rimborsato, e lo si dice', async () => {
  const c = mondo({ saldo: 1000, fornitore: () => new Response('{"detail":"piano"}', { status: 401 }) });
  const res = await clona();
  assert.equal(res.status, 502);
  const d = await res.json();
  assert.equal(d.rimborsato, true);
  assert.equal(d.saldo, 1000);
  assert.deepEqual(c.voci, []);
});

test('⚠️ clonare: l’archivio non registra la voce → si cancella presso ElevenLabs e si rimborsa', async () => {
  const c = mondo({ saldo: 1000, fornitore: elevenlabs });
  const fetchMondo = globalThis.fetch;
  globalThis.fetch = async (u, o = {}) =>
    String(u).includes('/rest/v1/voci') && o.method === 'POST' ? new Response('{}', { status: 500 }) : fetchMondo(u, o);
  const res = await clona();
  assert.equal(res.status, 502);
  assert.equal((await res.json()).rimborsato, true);
  assert.ok(c.some((x) => x.metodo === 'DELETE' && x.url.includes('/v1/voices/el-clonata')));
});

/* ------------------------------- cancella ------------------------------ */

test('cancellare una voce del conto: presso ElevenLabs e poi nell’archivio', async () => {
  const c = mondo({ voci: ['el-mia'], fornitore: elevenlabs });
  const res = await rotta('/voce/cancella', { voce: 'el-mia' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const del = c.findIndex((x) => x.metodo === 'DELETE' && x.url.includes('api.elevenlabs.io/v1/voices/el-mia'));
  const arch = c.findIndex((x) => x.metodo === 'DELETE' && x.url.includes('/rest/v1/voci'));
  assert.ok(del >= 0 && del < arch);
});

test('⚠️ la voce di un altro non si cancella: per questo conto non esiste', async () => {
  const c = mondo({ voci: ['el-mia'], fornitore: elevenlabs });
  const res = await cancellaVoce({ voce: 'el-altrui' }, CHI, AMBIENTE);
  assert.deepEqual(await res.json(), { ok: true, gia: true });
  assert.ok(!tocca(c, 'elevenlabs'));
});

test('⚠️ ElevenLabs non cancella: 502, e la riga dell’archivio resta', async () => {
  const c = mondo({ voci: ['el-mia'], fornitore: () => new Response('', { status: 500 }) });
  const res = await cancellaVoce({ voce: 'el-mia' }, CHI, AMBIENTE);
  assert.equal(res.status, 502);
  assert.ok(!c.some((x) => x.metodo === 'DELETE' && x.url.includes('/rest/v1/voci')));
});

test('una voce pronta non si cancella; senza chiave 503', async () => {
  mondo();
  assert.equal((await cancellaVoce({ voce: VOCI_PRONTE[0].id }, CHI, AMBIENTE)).status, 400);
  assert.equal((await cancellaVoce({ voce: 'el-mia' }, CHI, { ...AMBIENTE, ELEVENLABS_API_KEY: '' })).status, 503);
});

test('le rotte senza soldi vogliono il login', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  const res = await rotta('/voce/cancella', { voce: 'el-mia' });
  assert.equal(res.status, 401);
});
