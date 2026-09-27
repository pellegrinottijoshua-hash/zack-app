import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { crea, leggi, SCADENZA_SECONDI } from '../worker/fornitori/seedance.js';

/*
 * I due adattatori di Seedance 2.5 (fase 3), con la rete finta. Niente chiavi
 * vere, niente chiamate vere: i subagent e le prove non si collegano a nessun
 * fornitore.
 */

const ENV = { ARK_API_KEY: 'ark-finta', HF_CREDENTIALS: 'id-finto:segreto-finto' };
const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});

function rete(risposta) {
  const chiamate = [];
  globalThis.fetch = async (u, o = {}) => {
    chiamate.push({ url: String(u), metodo: o.method || 'GET', auth: o.headers?.authorization, corpo: o.body && JSON.parse(o.body) });
    return new Response(JSON.stringify(risposta), { status: 200 });
  };
  return chiamate;
}

const RICHIESTA = { prompt: 'un gatto al tramonto', durata: 5, risoluzione: '720p', formato: '16:9', utente: 'u-1' };

test('BytePlus: il task nasce col modello 2.5, la scadenza di un’ora e senza filigrana', async () => {
  const c = rete({ id: 'cgt-1' });
  assert.deepEqual(await crea({ canale: 'byteplus', ...RICHIESTA }, ENV), { rif: 'cgt-1' });
  assert.match(c[0].url, /contents\/generations\/tasks$/);
  assert.equal(c[0].auth, 'Bearer ark-finta');
  assert.equal(c[0].corpo.model, 'dreamina-seedance-2-5-260628');
  assert.deepEqual(c[0].corpo.content, [{ type: 'text', text: 'un gatto al tramonto' }]);
  assert.equal(c[0].corpo.execution_expires_after, SCADENZA_SECONDI, 'senza scadenza il rimborso del giro orario non è sicuro');
  assert.equal(c[0].corpo.watermark, false);
  assert.equal(c[0].corpo.ratio, '16:9');
});

test('Higgsfield: il task nasce sul modello 2.5 con la chiave «Key id:segreto»', async () => {
  const c = rete({ request_id: 'hf-1', status: 'queued' });
  assert.deepEqual(await crea({ canale: 'higgsfield', ...RICHIESTA }, ENV), { rif: 'hf-1' });
  assert.equal(c[0].url, 'https://api.higgsfield.ai/bytedance/seedance-2.5/text-to-video');
  assert.equal(c[0].auth, 'Key id-finto:segreto-finto');
  assert.equal(c[0].corpo.aspect_ratio, '16:9');
});

test('senza chiave il canale dice «non-configurato» e non chiama nessuno', async () => {
  const c = rete({});
  await assert.rejects(crea({ canale: 'byteplus', ...RICHIESTA }, {}), /non-configurato/);
  assert.equal(c.length, 0);
});

test('i dialetti dei due fornitori diventano tre stati soli', async () => {
  const casi = [
    ['byteplus', { status: 'queued' }, 'in-corso'],
    ['byteplus', { status: 'running' }, 'in-corso'],
    ['byteplus', { status: 'succeeded', content: { video_url: 'https://v/1' }, usage: { total_tokens: 99 } }, 'fatto'],
    ['byteplus', { status: 'failed' }, 'fallito'],
    ['byteplus', { status: 'expired' }, 'fallito'],
    ['byteplus', { status: 'cancelled' }, 'fallito'],
    ['higgsfield', { status: 'in_progress' }, 'in-corso'],
    ['higgsfield', { status: 'completed', video: { url: 'https://v/2' } }, 'fatto'],
    ['higgsfield', { status: 'nsfw' }, 'fallito'],
    ['higgsfield', { status: 'failed' }, 'fallito'],
    ['higgsfield', { status: 'uno-stato-nuovo' }, 'in-corso'],
  ];
  for (const [canale, risposta, atteso] of casi) {
    rete(risposta);
    const r = await leggi({ canale, rif: 'x', durata: 5, risoluzione: '720p' }, ENV);
    assert.equal(r.stato, atteso, `${canale} ${risposta.status}`);
  }
});

test('⚠️ «finito» senza URL non è finito: è fallito, e si rimborsa', async () => {
  /*
   * Rompere apposta: togli il controllo `stato === 'fatto' && !url` → il
   * lavoro si chiuderebbe «fatto», addebitato, con niente da consegnare.
   */
  rete({ status: 'succeeded', content: {} });
  assert.equal((await leggi({ canale: 'byteplus', rif: 'x' }, ENV)).stato, 'fallito');
  rete({ status: 'completed' });
  assert.equal((await leggi({ canale: 'higgsfield', rif: 'x', durata: 5, risoluzione: '720p' }, ENV)).stato, 'fallito');
});

test('i token veri arrivano da BytePlus; per Higgsfield si stimano per eccesso', async () => {
  rete({ status: 'succeeded', content: { video_url: 'https://v' }, usage: { total_tokens: 108000 } });
  assert.equal((await leggi({ canale: 'byteplus', rif: 'x' }, ENV)).token, 108000);
  rete({ status: 'completed', video: { url: 'https://v' } });
  assert.ok((await leggi({ canale: 'higgsfield', rif: 'x', durata: 5, risoluzione: '720p' }, ENV)).token >= 108000);
});

test('un fornitore che risponde male solleva «fornitore», senza portarsi dietro il corpo', async () => {
  globalThis.fetch = async () => new Response('{"messaggio":"segreto"}', { status: 500 });
  await assert.rejects(crea({ canale: 'byteplus', ...RICHIESTA }, ENV), (e) => e.code === 'fornitore' && !/segreto/.test(e.message));
});
