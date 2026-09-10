import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

/*
 * Il giro dei soldi, provato in Node prima di spendere un centesimo vero.
 *
 * Le due regole che questo file esiste per difendere:
 *   1. non si va sotto zero, nemmeno con due schede aperte;
 *   2. una generazione fallita non costa niente.
 * La seconda non e' una cortesia: hai incassato per una cosa che non e'
 * successa (spec B1 § 3.2).
 */

const AMBIENTE = {
  SUPABASE_SERVICE_KEY: 'sb_secret_finta',
  STRIPE_SECRET_KEY: 'sk_test_finta',
  GOOGLE_API_KEY: 'goog_finta',
  ASSETS: { fetch: async () => new Response('la home', { status: 200 }) },
};

const fetchVero = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchVero; });

/**
 * Finge Supabase, Google, e tiene un saldo vero: cosi' i test guardano il
 * SALDO invece che le chiamate, che e' quello che conta davvero.
 *
 * `rimborsoOk` finge un `/rpc/accredita` che risponde male (rete, 500,
 * Supabase giu'): e' il caso che la correzione 2 difende — un rimborso che
 * non prende non deve mai sembrare riuscito.
 */
function mondo({ saldo = 5000, googleOk = true, rimborsoOk = true } = {}) {
  const stato = { saldo, chiamate: [], lavori: [] };
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u?.url || u);
    const corpo = o.body ? JSON.parse(o.body) : {};
    stato.chiamate.push(url);

    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'u-1', email: 'c@e.it' }), { status: 200 });
    }
    if (url.includes('/rpc/addebita')) {
      if (stato.saldo < corpo.p_prezzo) return new Response('null', { status: 200 });
      stato.saldo -= corpo.p_prezzo;
      return new Response(String(stato.saldo), { status: 200 });
    }
    if (url.includes('/rpc/accredita')) {
      if (!rimborsoOk) return new Response('{"errore":"archivio giu’"}', { status: 500 });
      stato.saldo += corpo.p_millesimi;
      return new Response(String(stato.saldo), { status: 200 });
    }
    if (url.includes('/rest/v1/lavori')) {
      stato.lavori.push(corpo);
      return new Response('{}', { status: 201 });
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      // Google risponde JPEG, SEMPRE (misurato) — mai PNG. E' per questo che
      // il listino dichiara `resa: 'jpeg'`: una finzione che rispondesse PNG
      // certificherebbe un errore, non lo proverebbe.
      return googleOk
        ? new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }] } }],
            // Lo `usageMetadata` VERO, misurato il 2026-09-10 su questa
            // stessa chiamata — non un `totalTokenCount` di comodo che
            // `costoVero()` non guarda nemmeno.
            usageMetadata: {
              promptTokenCount: 1314,
              candidatesTokenCount: 1286,
              totalTokenCount: 2879,
              candidatesTokensDetails: [{ modality: 'IMAGE', tokenCount: 1120 }],
              thoughtsTokenCount: 279,
            },
          }), { status: 200 })
        : new Response('{"error":{"message":"quota"}}', { status: 429 });
    }
    return new Response('{}', { status: 200 });
  };
  return stato;
}

const chiedi = (corpo) =>
  new Request('https://zack-app.com/genera', {
    method: 'POST',
    headers: { authorization: 'Bearer buono', 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });

test('una generazione riuscita costa esattamente il preventivo', async () => {
  const w = mondo({ saldo: 5000 });
  const res = await worker.fetch(chiedi({ servizio: 'immagine-nbp', prompt: 'un cane' }), AMBIENTE);
  assert.equal(res.status, 200);
  const corpo = await res.json();
  // Google risponde JPEG, sempre: e' misurato, non e' la finzione della
  // prima stesura (che diceva PNG e certificava un errore).
  assert.equal(corpo.mime, 'image/jpeg');
  // 145 = 127 (costo, zero riferimenti) + 18 (margine 14%, arrotondato).
  // Non 140: quel numero e' rimasto da quando il costo si credeva 123,
  // prima che si misurasse la misura ('1K'/'2K').
  assert.equal(corpo.prezzo, 145, 'il prezzo risposto non e’ quello del listino');
  assert.equal(w.saldo, 5000 - 145);
});

test('⚠️ una generazione fallita non costa NIENTE', async () => {
  // Il fornitore risponde 429. Hai incassato per una cosa che non e' successa:
  // i crediti tornano, e c'e' un movimento che lo dice.
  const w = mondo({ saldo: 5000, googleOk: false });
  const res = await worker.fetch(chiedi({ servizio: 'immagine-nbp', prompt: 'un cane' }), AMBIENTE);
  assert.equal(res.status, 502);
  assert.equal(w.saldo, 5000, `il saldo e’ sceso a ${w.saldo}: la generazione fallita ha fatto pagare`);
  assert.ok(w.chiamate.some((c) => c.includes('/rpc/accredita')), 'non ha rimborsato');
});

test('⚠️ se il rimborso fallisce, il lavoro resta in-corso e il saldo non mente', async () => {
  /*
   * `rimborsa()` torna la Response grezza di `/rpc/accredita`: se qui non se
   * ne guardasse l'esito, il cliente leggerebbe "soldi tornati" mentre non e'
   * successo niente, il lavoro uscirebbe da 'in-corso' verso 'rimborsato', e
   * lo spazzino del Task 5 — che raccoglie SOLO i lavori 'in-corso' — non lo
   * ritroverebbe mai piu'. Nessuno se ne accorgerebbe.
   */
  const w = mondo({ saldo: 5000, googleOk: false, rimborsoOk: false });
  const res = await worker.fetch(chiedi({ servizio: 'immagine-nbp', prompt: 'un cane' }), AMBIENTE);
  assert.equal(res.status, 502);
  const corpo = await res.json();
  // Il saldo e' sceso di 145 e ci resta: si risponde col saldo VERO, non con
  // quello sperato (rimasto + prezzo).
  assert.equal(corpo.saldo, 5000 - 145, 'ha millantato un rimborso che non e’ successo');
  assert.equal(w.saldo, 5000 - 145);
  assert.equal(
    w.lavori.at(-1).stato, 'in-corso',
    'il lavoro si e’ chiuso anche se il rimborso e’ fallito: lo spazzino non lo ritrova piu’',
  );
});

test('senza saldo non si genera, e non si chiama il fornitore', async () => {
  const w = mondo({ saldo: 100 });   // meno dei 145 che serve
  const res = await worker.fetch(chiedi({ servizio: 'immagine-nbp', prompt: 'un cane' }), AMBIENTE);
  assert.equal(res.status, 402);
  assert.equal(w.saldo, 100);
  assert.ok(
    !w.chiamate.some((c) => c.includes('googleapis')),
    'ha chiamato il fornitore senza poterlo pagare: quello lo addebita a NOI',
  );
});

test('l’addebito viene PRIMA della chiamata al fornitore', async () => {
  // Se si chiamasse prima e si addebitasse dopo, due schede in parallelo
  // farebbero due generazioni con il credito per una.
  const w = mondo({ saldo: 5000 });
  await worker.fetch(chiedi({ servizio: 'immagine-nbp', prompt: 'x' }), AMBIENTE);
  const iAddebito = w.chiamate.findIndex((c) => c.includes('/rpc/addebita'));
  const iGoogle = w.chiamate.findIndex((c) => c.includes('googleapis'));
  assert.ok(iAddebito >= 0 && iAddebito < iGoogle, 'ha chiamato il fornitore prima di addebitare');
});

test('un servizio che non e’ a listino non addebita niente', async () => {
  const w = mondo({ saldo: 5000 });
  const res = await worker.fetch(chiedi({ servizio: 'inventato', prompt: 'x' }), AMBIENTE);
  assert.equal(res.status, 400);
  assert.equal(w.saldo, 5000);
});

test('i riferimenti si contano contro il LISTINO', async () => {
  const w = mondo({ saldo: 5000 });
  const troppi = (n, ruolo) =>
    Array.from({ length: n }, () => ({ ruolo, immagine: 'data:image/png;base64,AAAA' }));

  for (const [rif, perche] of [
    [troppi(15, 'oggetto'), 'quindici in tutto'],
    [troppi(6, 'personaggio'), 'sei personaggi quando il massimo e’ cinque'],
    [troppi(4, 'stile'), 'quattro stili quando il massimo e’ tre'],
    [[{ ruolo: 'inventato', immagine: 'data:image/png;base64,AAAA' }], 'un ruolo che non esiste'],
    // ⚠️ `ruolo: 'toString'` e' un nome EREDITATO da Object, non uno vero:
    // con `in` passerebbe il controllo (la catena dei prototipi ce l'ha) e
    // `conta['toString'] += 1` farebbe NaN, scavalcando i limiti per ruolo.
    [[{ ruolo: 'toString', immagine: 'data:image/png;base64,AAAA' }], 'un nome ereditato da Object, non un ruolo vero'],
  ]) {
    const res = await worker.fetch(
      chiedi({ servizio: 'immagine-nbp', prompt: 'x', riferimenti: rif }), AMBIENTE);
    assert.equal(res.status, 400, perche);
  }
  assert.equal(w.saldo, 5000, 'ha addebitato una richiesta che il fornitore avrebbe rifiutato');
});

test('il costo REALE si registra: 131 millesimi esatti, non un tipo qualsiasi', async () => {
  /*
   * Senza quel numero, «di ogni euro Zack ne rimette 12 centesimi» e' una
   * promessa che non puoi provare — e una promessa che non puoi provare fa
   * mettere in dubbio anche quelle vere. Per questo il test chiede la CIFRA
   * esatta e non un `typeof === 'number'`: zero e' un numero, quindi un
   * `typeof` passerebbe anche con `costoVero()` completamente rotta (per
   * esempio se guardasse `totalTokenCount`, un campo che non usa).
   *
   * Ricalcolo a mano dai token misurati il 2026-09-10 (vedi il fixture qui
   * sopra): immagine 1120 token; testo 1286 (candidatesTokenCount) - 1120
   * (l'immagine, gia' contata) + 279 (thoughtsTokenCount) = 445; dollari
   * (1314*2 + 445*12 + 1120*120) / 1e6 = 0,142368; per il cambio 0,92 e per
   * mille (euro → millesimi) = 131,0...  → 131.
   */
  const w = mondo({ saldo: 5000 });
  await worker.fetch(chiedi({ servizio: 'immagine-nbp', prompt: 'x' }), AMBIENTE);
  const chiuso = w.lavori.at(-1);
  assert.equal(chiuso?.costo_reale, 131);
  assert.equal(chiuso.stato, 'fatto');
});

test('senza token non si genera', async () => {
  const w = mondo();
  const res = await worker.fetch(
    new Request('https://zack-app.com/genera', { method: 'POST', body: '{}' }), AMBIENTE);
  assert.equal(res.status, 401);
  assert.equal(w.saldo, 5000);
});
