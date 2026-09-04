import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOME_CACHE,
  byteDelModello,
  chiediSpazioPersistente,
  leggiConAvanzamento,
} from '../src/engine/modelloCache.js';

/*
 * Il modello scaricato una volta sola.
 *
 * Il difetto (2026-09-04, riferito dal committente): «e' lenta, non funziona,
 * mi dice che lo strumento non e' riuscito a scontornare, oppure fa "Zack sta
 * lavorando" all'infinito». Misurato: i modelli su R2 arrivano SENZA
 * `Cache-Control` (header assente, `cf-cache-status: DYNAMIC`), quindi
 * finivano solo nella cache HTTP — la prima a essere sfrattata quando una
 * voce pesa 176 MB. E mentre riscaricava, nessuno lo diceva.
 *
 * Le dipendenze sono iniettabili apposta: senza, questa parte si potrebbe
 * provare solo a mano su un telefono, ed e' proprio quella che sbaglia in
 * silenzio — un modello che non arriva non solleva niente, resta un'attesa
 * che non finisce.
 */

/** Una Cache finta: si comporta come quella vera per quel che serve qui. */
function cacheFinta() {
  const dentro = new Map();
  return {
    dentro,
    async match(url) {
      return dentro.get(url) ?? undefined;
    },
    async put(url, res) {
      dentro.set(url, new Response(await res.arrayBuffer()));
    },
  };
}

/** Una risposta di rete finta, che si legge a pezzi come quella vera. */
function reteFinta(byte, { pezzo = 4, contentLength = true } = {}) {
  let chiamate = 0;
  const rete = async () => {
    chiamate++;
    const body = new ReadableStream({
      start(c) {
        for (let i = 0; i < byte.length; i += pezzo) c.enqueue(byte.slice(i, i + pezzo));
        c.close();
      },
    });
    return new Response(body, {
      status: 200,
      headers: contentLength ? { 'content-length': String(byte.length) } : {},
    });
  };
  rete.chiamate = () => chiamate;
  return rete;
}

const PESI = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

test('la prima volta scarica, la seconda no', async () => {
  // È il punto di tutto il file: 176 MB una volta sola.
  const cache = cacheFinta();
  const rete = reteFinta(PESI);

  const a = await byteDelModello('https://esempio/u2net.onnx', { cache, rete });
  const b = await byteDelModello('https://esempio/u2net.onnx', { cache, rete });

  assert.deepEqual([...a], [...PESI]);
  assert.deepEqual([...b], [...PESI]);
  assert.equal(rete.chiamate(), 1, 'il modello e’ stato riscaricato: la cache non serve a niente');
});

test('mentre scarica dice quanto manca', async () => {
  // Senza questo l'utente legge «Zack sta lavorando…» per minuti, che e'
  // indistinguibile da un guasto.
  const avanzamenti = [];
  await byteDelModello('https://esempio/u2net.onnx', {
    cache: cacheFinta(),
    rete: reteFinta(PESI, { pezzo: 5 }),
    onProgress: (d) => avanzamenti.push(d),
  });

  assert.ok(avanzamenti.length >= 2, 'nessun avanzamento emesso');
  assert.equal(avanzamenti.at(-1).fatti, PESI.length);
  assert.equal(avanzamenti.at(-1).frazione, 1);
});

test('senza content-length la frazione e’ null, non zero', async () => {
  /*
   * Una barra che finge di sapere quanto manca e' peggio di nessuna barra:
   * la seconda volta non le si crede piu'. Stessa scelta gia' fatta in
   * `scaricaModello` per la home.
   */
  const avanzamenti = [];
  await byteDelModello('https://esempio/u2net.onnx', {
    cache: cacheFinta(),
    rete: reteFinta(PESI, { contentLength: false }),
    onProgress: (d) => avanzamenti.push(d),
  });
  assert.equal(avanzamenti.at(-1).frazione, null);
  assert.ok(avanzamenti.at(-1).fatti > 0, 'i megabyte fatti si dicono lo stesso');
});

test('una rete che risponde male lo dice con un codice', async () => {
  await assert.rejects(
    () =>
      byteDelModello('https://esempio/u2net.onnx', {
        cache: cacheFinta(),
        rete: async () => new Response('', { status: 502 }),
      }),
    (e) => e.code === 'modello-irraggiungibile',
  );
});

test('una cache che non si puo’ scrivere non impedisce di lavorare', async () => {
  // Spazio finito o permesso negato: questo giro deve funzionare comunque.
  const rotta = {
    async match() {
      return undefined;
    },
    async put() {
      throw new Error('quota superata');
    },
  };
  const byte = await byteDelModello('https://esempio/u2net.onnx', {
    cache: rotta,
    rete: reteFinta(PESI),
  });
  assert.deepEqual([...byte], [...PESI]);
});

test('lo spazio persistente si chiede, e un rifiuto non rompe niente', async () => {
  assert.equal(await chiediSpazioPersistente({ persist: async () => true }), true);
  assert.equal(await chiediSpazioPersistente({ persist: async () => false }), false);
  // Gia' concesso: non si richiede.
  let richiesto = false;
  const esito = await chiediSpazioPersistente({
    persisted: async () => true,
    persist: async () => {
      richiesto = true;
      return true;
    },
  });
  assert.equal(esito, true);
  assert.equal(richiesto, false, 'ha richiesto un permesso che aveva gia’');
  // Browser che non lo conosce, o che solleva: si va avanti lo stesso.
  assert.equal(await chiediSpazioPersistente(undefined), null);
  assert.equal(
    await chiediSpazioPersistente({
      persist: async () => {
        throw new Error('negato');
      },
    }),
    null,
  );
});

test('il nome della cache porta una versione', () => {
  // Se un giorno i file dei modelli cambiassero a nome invariato, si alza il
  // numero e le copie vecchie si buttano. Senza, resterebbero a servire pesi
  // sbagliati.
  assert.match(NOME_CACHE, /-v\d+$/);
});

test('leggiConAvanzamento regge anche una risposta senza corpo leggibile a pezzi', async () => {
  // Non tutti gli ambienti danno un `body.getReader()`: si ripiega su
  // `arrayBuffer()` invece di restare senza modello.
  const finta = {
    headers: new Headers({ 'content-length': String(PESI.length) }),
    body: null,
    arrayBuffer: async () => PESI.buffer.slice(0),
  };
  const avanzamenti = [];
  const byte = await leggiConAvanzamento(finta, (d) => avanzamenti.push(d));
  assert.deepEqual([...byte], [...PESI]);
  assert.equal(avanzamenti.at(-1).frazione, 1);
});
