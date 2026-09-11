import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

/*
 * Se il Worker muore fra l'addebito e l'esito — il fornitore ci mette troppo,
 * la richiesta scade, il deploy arriva a meta' — l'addebito resta e il rimborso
 * non arriva mai. Non se ne accorge nessuno tranne il cliente, che ha pagato
 * per un'immagine che non ha visto.
 */

const AMBIENTE = { SUPABASE_SERVICE_KEY: 'sb_secret_finta', ASSETS: { fetch: async () => new Response('') } };
const fetchVero = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchVero; });

const vecchio = new Date(Date.now() - 45 * 60000).toISOString();

test('un lavoro appeso da piu’ di mezz’ora si rimborsa', async () => {
  const fatte = [];
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    fatte.push({ url, corpo: o.body });
    if (url.includes('/rest/v1/lavori?') && (o.method || 'GET') === 'GET') {
      return new Response(JSON.stringify([
        { id: 'l-1', utente: 'u-1', prezzo: 140, stato: 'in-corso', creato_il: vecchio },
      ]), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };

  await worker.scheduled({}, AMBIENTE, { waitUntil: () => {} });

  const reso = fatte.find((c) => c.url.includes('/rpc/accredita'));
  assert.ok(reso, 'il lavoro appeso non e’ stato rimborsato');
  assert.match(String(reso.corpo), /"p_millesimi":140/);
  assert.match(String(reso.corpo), /"p_genere":"rimborso"/);
});

test('un lavoro appena partito NON si rimborsa', async () => {
  // Mezz'ora e' molto piu' di qualunque generazione e molto meno della
  // pazienza di chi ha pagato. Rimborsare a due minuti vorrebbe dire
  // rimborsare i video di B3 mentre stanno ancora lavorando.
  const fatte = [];
  globalThis.fetch = async (u, o = {}) => {
    fatte.push(String(u));
    if (String(u).includes('/rest/v1/lavori?') && (o.method || 'GET') === 'GET') {
      // La query filtra per data: se e' scritta bene, non torna niente.
      return new Response('[]', { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };
  await worker.scheduled({}, AMBIENTE, { waitUntil: () => {} });
  assert.ok(!fatte.some((c) => c.includes('/rpc/accredita')), 'ha rimborsato un lavoro vivo');
});

/*
 * Correzione 1: senza una chiave di idempotenza sul rimborso, un lavoro che
 * prende il rimborso ma la cui `chiudiLavoro` fallisce (una PATCH storta)
 * resterebbe 'in-corso' — e il giro dell'ora dopo lo rimborserebbe DI NUOVO.
 * Niente lo fermerebbe: e' una perdita illimitata, un lavoro alla volta.
 *
 * Questi test provano tutt'e due i versi del rischio: che il primo rimborso
 * passi DAVVERO (altrimenti la difesa nasconderebbe anche i rimborsi onesti),
 * e che il secondo tentativo sullo STESSO lavoro non muova piu' il saldo.
 */

/**
 * Finge Supabase per lo spazzino: `lavori` e' l'elenco dei lavori appesi da
 * restituire alla GET. `giaRimborsati` e' l'insieme delle chiavi `p_stripe`
 * per cui `/rpc/accredita` ha gia' "visto" un rimborso — cosi' si simula il
 * vincolo `unique` VERO, che sta sulla colonna `stripe_evento` (cioe' su
 * `p_stripe`, NON su `p_lavoro`) senza un vero database. Chiave sbagliata
 * qui vorrebbe dire provare la difesa sbagliata.
 */
function mondoSpazzino({ lavori, giaRimborsati = new Set() }) {
  const stato = { rimborsi: [], chiusure: [] };
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    const metodo = o.method || 'GET';
    if (url.includes('/rest/v1/lavori?') && metodo === 'GET') {
      return new Response(JSON.stringify(lavori), { status: 200 });
    }
    if (url.includes('/rpc/accredita')) {
      const corpo = JSON.parse(o.body);
      stato.rimborsi.push(corpo);
      if (giaRimborsati.has(corpo.p_stripe)) {
        // Lo stesso 23505/409 con cui il Task 3 riconosce un webhook rimandato:
        // qui vuol dire che QUESTA chiave era gia' stata vista prima.
        return new Response('{"code":"23505","message":"duplicate key value violates unique constraint"}', { status: 409 });
      }
      giaRimborsati.add(corpo.p_stripe);
      return new Response('999', { status: 200 });
    }
    if (url.includes('/rest/v1/lavori?id=eq.') && metodo === 'PATCH') {
      const id = new URL(url).searchParams.get('id').replace('eq.', '');
      stato.chiusure.push({ id, corpo: JSON.parse(o.body) });
      return new Response('{}', { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };
  return stato;
}

test('il primo rimborso di un lavoro appeso passa, e il lavoro si chiude rimborsato', async () => {
  const stato = mondoSpazzino({
    lavori: [{ id: 'l-1', utente: 'u-1', prezzo: 140, stato: 'in-corso', creato_il: vecchio }],
  });
  await worker.scheduled({}, AMBIENTE, { waitUntil: () => {} });

  assert.equal(stato.rimborsi.length, 1, 'non ha nemmeno provato a rimborsare');
  assert.equal(stato.rimborsi[0].p_millesimi, 140);
  // La chiave di idempotenza VERA, quella che il vincolo unique su
  // `movimenti.stripe_evento` guarda davvero: senza, questo test passerebbe
  // anche se `rimborsa()` non la mandasse piu'.
  assert.equal(
    stato.rimborsi[0].p_stripe, 'rimborso:l-1',
    'manca la chiave di idempotenza sul rimborso: il secondo tentativo pagherebbe di nuovo',
  );
  assert.equal(
    stato.chiusure.length, 1,
    'il rimborso e’ passato ma il lavoro non si e’ chiuso: lo spazzino lo ritroverebbe ogni ora',
  );
  assert.equal(stato.chiusure[0].id, 'l-1');
  assert.equal(stato.chiusure[0].corpo.stato, 'rimborsato');
});

test('⚠️ un secondo rimborso dello STESSO lavoro non muove il saldo, ma il lavoro si chiude comunque', async () => {
  /*
   * Questo e' il cuore della correzione 1: `chiudiLavoro` era fallita l'ora
   * scorsa (una PATCH storta), il rimborso invece era gia' passato, e il
   * lavoro e' rimasto 'in-corso'. Lo spazzino ci riprova: il SECONDO
   * `/rpc/accredita` viola l'unique sulla chiave di idempotenza e torna
   * 409/23505 — che va letto come «i soldi erano gia' tornati», non come un
   * fallimento. Se venisse letto come fallimento, il lavoro resterebbe
   * 'in-corso' per SEMPRE, in un ciclo che lo spazzino ripete ogni ora senza
   * mai chiuderlo.
   */
  const giaRimborsati = new Set(['rimborso:l-1']);
  const stato = mondoSpazzino({
    lavori: [{ id: 'l-1', utente: 'u-1', prezzo: 140, stato: 'in-corso', creato_il: vecchio }],
    giaRimborsati,
  });
  await worker.scheduled({}, AMBIENTE, { waitUntil: () => {} });

  assert.equal(stato.rimborsi.length, 1, 'ha provato a rimborsare');
  assert.equal(
    stato.chiusure.length, 1,
    'il duplicato e’ stato letto come fallimento: il lavoro resta in-corso in eterno',
  );
  assert.equal(stato.chiusure[0].id, 'l-1');
  assert.equal(stato.chiusure[0].corpo.stato, 'rimborsato');
});

test('due lavori diversi dello stesso utente si rimborsano tutt’e due', async () => {
  // La chiave di idempotenza e' per LAVORO, non per utente: se fosse larga
  // come l'utente, il secondo lavoro sembrerebbe un duplicato del primo e
  // resterebbe senza rimborso.
  const stato = mondoSpazzino({
    lavori: [
      { id: 'l-1', utente: 'u-1', prezzo: 140, stato: 'in-corso', creato_il: vecchio },
      { id: 'l-2', utente: 'u-1', prezzo: 200, stato: 'in-corso', creato_il: vecchio },
    ],
  });
  await worker.scheduled({}, AMBIENTE, { waitUntil: () => {} });

  assert.equal(stato.rimborsi.length, 2, 'non ha rimborsato tutt’e due i lavori');
  // Chiavi diverse per lavori diversi: se fosse per-utente, la seconda
  // chiamata sembrerebbe un duplicato della prima e resterebbe senza
  // rimborso vero.
  assert.deepEqual(
    stato.rimborsi.map((r) => r.p_stripe).sort(),
    ['rimborso:l-1', 'rimborso:l-2'],
    'la chiave di idempotenza confonde i due lavori, o manca del tutto',
  );
  assert.deepEqual(
    stato.chiusure.map((c) => c.id).sort(),
    ['l-1', 'l-2'],
    'un lavoro si e’ perso, o la chiave di idempotenza ha confuso i due lavori',
  );
  assert.ok(stato.chiusure.every((c) => c.corpo.stato === 'rimborsato'));
});

/*
 * Correzione 2: lo spazzino ripete esattamente l'errore che il Task 4 ha
 * corretto nel `catch` di `/genera` — marcare 'rimborsato' senza guardare se
 * il rimborso e' andato. Stessa regola: se non prende, il lavoro resta
 * 'in-corso' e ci si riprova al giro dopo, che qui e' il mestiere della
 * funzione.
 */
test('⚠️ se il rimborso fallisce (non e’ un duplicato), il lavoro resta in-corso', async () => {
  const stato = { chiusure: [] };
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    const metodo = o.method || 'GET';
    if (url.includes('/rest/v1/lavori?') && metodo === 'GET') {
      return new Response(JSON.stringify([
        { id: 'l-1', utente: 'u-1', prezzo: 140, stato: 'in-corso', creato_il: vecchio },
      ]), { status: 200 });
    }
    if (url.includes('/rpc/accredita')) {
      // Un guasto vero: Supabase giu', 500. Non 409, non 23505 nel corpo.
      return new Response('{"errore":"archivio giu’"}', { status: 500 });
    }
    if (url.includes('/rest/v1/lavori?id=eq.') && metodo === 'PATCH') {
      stato.chiusure.push(JSON.parse(o.body));
      return new Response('{}', { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };

  await worker.scheduled({}, AMBIENTE, { waitUntil: () => {} });

  assert.equal(
    stato.chiusure.length, 0,
    'ha marcato rimborsato un lavoro il cui rimborso e’ fallito: lo spazzino non lo ritrova piu’',
  );
});
