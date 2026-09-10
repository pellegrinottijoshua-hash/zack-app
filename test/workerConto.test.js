import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

/*
 * Il Worker intero, provato in Node prima di andare in produzione.
 *
 * Si puo' fare perche' il Worker e' scritto con le cose che Node ha gia':
 * `Request`, `Response`, `fetch`, `crypto.subtle`. Sono gli stessi nomi, e
 * quindi la stessa prova. Provarlo solo dopo il `deploy` vorrebbe dire
 * scoprire in produzione che la porta del pagamento e' aperta.
 *
 * La prova che conta di piu' e' l'ultima: un webhook con la firma falsa deve
 * ricevere 400. Se ricevesse 200, il prodotto sarebbe gratis per chiunque
 * sappia fare una POST.
 */

const SEGRETO = 'whsec_prova';
const AMBIENTE = {
  SUPABASE_URL: 'https://finto.supabase.co',
  SUPABASE_CHIAVE_PUBBLICA: 'sb_publishable_finta',
  SUPABASE_SERVICE_KEY: 'sb_secret_finta',
  STRIPE_SECRET_KEY: 'sk_test_finta',
  STRIPE_WEBHOOK_SECRET: SEGRETO,
  STRIPE_PREZZO: 'price_finto',
  ASSETS: { fetch: async () => new Response('la home', { status: 200 }) },
};

const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});

/** Registra le chiamate in uscita e risponde con quello che gli si dice. */
function rete(rispondi) {
  const chiamate = [];
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u?.url || u);
    chiamate.push({ url, metodo: o.method || 'GET', corpo: o.body, intestazioni: o.headers });
    return rispondi(url, o) ?? new Response('{}', { status: 200 });
  };
  return chiamate;
}

const firmaPer = (corpo, t) =>
  `t=${t},v1=${createHmac('sha256', SEGRETO).update(`${t}.${corpo}`).digest('hex')}`;

const posta = (percorso, corpo, intestazioni = {}) =>
  new Request(`https://api.zack-app.com${percorso}`, { method: 'POST', body: corpo, headers: intestazioni });

/* ---------------------------------------------------------------- */

test('/me senza token non regala niente', async () => {
  rete(() => new Response('{}', { status: 200 }));
  const res = await worker.fetch(new Request('https://api.zack-app.com/me'), AMBIENTE);
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { errore: 'non-collegato' });
});

test('/me con un token che Supabase rifiuta non regala niente', async () => {
  rete((url) => (url.includes('/auth/v1/user') ? new Response('no', { status: 401 }) : null));
  const res = await worker.fetch(
    new Request('https://api.zack-app.com/me', { headers: { authorization: 'Bearer inventato' } }),
    AMBIENTE,
  );
  assert.equal(res.status, 401);
});

test('/me a chi non c’era ancora fa nascere quattordici giorni di prova', async () => {
  const chiamate = rete((url) => {
    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'u-1', email: 'chi@esempio.it' }), { status: 200 });
    }
    // La riga non c'e' ancora.
    if (url.includes('/rest/v1/conti?')) return new Response('[]', { status: 200 });
    return new Response('{}', { status: 201 });
  });

  const res = await worker.fetch(
    new Request('https://api.zack-app.com/me', { headers: { authorization: 'Bearer buono' } }),
    AMBIENTE,
  );
  const corpo = await res.json();
  assert.equal(res.status, 200);
  assert.equal(corpo.abbonato, false);
  assert.equal(corpo.crediti, 0, 'il campo dei crediti deve esserci da subito — spec § 4.1');

  const giorni = (new Date(corpo.provaFino) - Date.now()) / 86400000;
  assert.ok(giorni > 13.9 && giorni < 14.1, `la prova dura ${giorni} giorni invece di 14`);

  // E la prova e' stata SCRITTA, non solo detta: se resta solo nella risposta,
  // il giorno dopo ne nasce un'altra e la prova non finisce mai.
  const scritta = chiamate.find((c) => c.metodo === 'POST' && c.url.includes('/rest/v1/conti'));
  assert.ok(scritta, 'la prova non e’ stata scritta: ne nascerebbe una nuova ogni volta');
  assert.match(scritta.corpo, /prova_fino/);
});

/* ---------------------------------------------------------------- */

test('⚠️ un webhook con la firma falsa riceve 400, non 200', async () => {
  /*
   * Se questo test diventa verde su 200, il prodotto e' gratis: chiunque puo'
   * mandare un finto «pagamento riuscito» e regalarsi l'abbonamento. Non
   * solleva errori, non compare nei log come un problema, e si scopre
   * guardando i conti di Stripe che non tornano.
   */
  const chiamate = rete(() => new Response('{}', { status: 200 }));
  const res = await worker.fetch(
    posta('/webhook', '{"type":"checkout.session.completed"}', { 'stripe-signature': 't=1,v1=finta' }),
    AMBIENTE,
  );
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { errore: 'firma' });
  assert.equal(chiamate.length, 0, 'ha scritto nell’archivio prima di verificare la firma');
});

test('un webhook senza firma del tutto riceve 400', async () => {
  rete(() => new Response('{}', { status: 200 }));
  const res = await worker.fetch(posta('/webhook', '{"type":"invoice.paid"}'), AMBIENTE);
  assert.equal(res.status, 400);
});

test('senza il segreto configurato il webhook CHIUDE, non apre', async () => {
  // Il caso del deploy fatto di fretta. Aprire qui sarebbe il difetto
  // peggiore, perche' capita in produzione e non da' segno di se'.
  rete(() => new Response('{}', { status: 200 }));
  const corpo = '{"type":"invoice.paid"}';
  const t = Math.floor(Date.now() / 1000);
  const res = await worker.fetch(
    posta('/webhook', corpo, { 'stripe-signature': firmaPer(corpo, t) }),
    { ...AMBIENTE, STRIPE_WEBHOOK_SECRET: '' },
  );
  assert.equal(res.status, 400);
});

test('un webhook firmato bene accredita l’abbonamento a chi lo ha pagato', async () => {
  const corpo = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { metadata: { utente: 'u-7' }, customer: 'cus_7' } },
  });
  const t = Math.floor(Date.now() / 1000);
  const chiamate = rete(() => new Response('{}', { status: 201 }));

  const res = await worker.fetch(
    posta('/webhook', corpo, { 'stripe-signature': firmaPer(corpo, t) }),
    AMBIENTE,
  );
  assert.equal(res.status, 200);

  const scritta = chiamate.find((c) => c.url.includes('/rest/v1/conti'));
  assert.ok(scritta, 'il pagamento non e’ finito nell’archivio');
  const dati = JSON.parse(scritta.corpo);
  assert.equal(dati.utente, 'u-7');
  assert.equal(dati.abbonato, true);
  assert.equal(dati.stripe_cliente, 'cus_7');
  // Se la riga c'e' si aggiorna, se non c'e' nasce: il primo pagamento puo'
  // arrivare prima che il conto esista.
  assert.match(String(scritta.intestazioni.prefer), /merge-duplicates/);
});

test('se l’archivio non prende, si risponde MALE: Stripe riprova', async () => {
  /*
   * Rispondere «va bene» a un pagamento che non abbiamo scritto vuol dire
   * perderlo per sempre e in silenzio. Stripe riprova per tre giorni, ma solo
   * se gli si dice che e' andata storta.
   */
  const corpo = JSON.stringify({
    type: 'invoice.paid',
    data: { object: { subscription_details: { metadata: { utente: 'u-8' } } } },
  });
  const t = Math.floor(Date.now() / 1000);
  rete((url) => (url.includes('/rest/v1/conti') ? new Response('no', { status: 500 }) : null));

  const res = await worker.fetch(
    posta('/webhook', corpo, { 'stripe-signature': firmaPer(corpo, t) }),
    AMBIENTE,
  );
  assert.equal(res.status, 500);
});

/* ---------------------------------------------------------------- */

test('/checkout senza token non apre nessun pagamento', async () => {
  const chiamate = rete(() => new Response('{}', { status: 200 }));
  const res = await worker.fetch(posta('/checkout', null), AMBIENTE);
  assert.equal(res.status, 401);
  assert.equal(chiamate.length, 0, 'ha chiamato Stripe senza sapere chi fosse');
});

test('/checkout dice a Stripe di chi e’ l’abbonamento, non solo la sessione', async () => {
  /*
   * ⚠️ Il difetto che questo test esiste per impedire: mettere il `metadata`
   * solo sulla sessione. Il primo mese funziona; al rinnovo arriva una fattura
   * che discende dall'ABBONAMENTO, e se l'abbonamento non sa di chi e', il
   * pagamento arriva e non c'e' nessuno a cui accreditarlo. Il cliente paga il
   * secondo mese e trova il muro, senza che niente si lamenti da nessuna parte.
   */
  const chiamate = rete((url) => {
    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'u-9', email: 'chi@esempio.it' }), { status: 200 });
    }
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/x' }), { status: 200 });
  });

  const res = await worker.fetch(
    new Request('https://api.zack-app.com/checkout', {
      method: 'POST',
      headers: { authorization: 'Bearer buono' },
    }),
    AMBIENTE,
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { url: 'https://checkout.stripe.com/x' });

  const aStripe = chiamate.find((c) => c.url.includes('api.stripe.com'));
  assert.ok(aStripe, 'non ha chiamato Stripe');
  const inviato = String(aStripe.corpo);
  assert.match(inviato, /metadata%5Butente%5D=u-9/, 'la sessione non sa di chi e’');
  assert.match(
    inviato,
    /subscription_data%5Bmetadata%5D%5Butente%5D=u-9/,
    'l’ABBONAMENTO non sa di chi e’: il rinnovo non trovera’ nessuno',
  );
  // Il prezzo viene da Stripe, non dal codice: scritto due volte, diverge.
  assert.match(inviato, /line_items%5B0%5D%5Bprice%5D=price_finto/);
  // E il ritorno da Stripe punta all'origine da cui e' arrivata la richiesta,
  // non a un indirizzo scritto in una variabile che qualcuno deve ricordarsi
  // di configurare — e che il giorno che sbaglia manda il cliente altrove.
  assert.match(inviato, /success_url=https%3A%2F%2Fapi\.zack-app\.com%2Fapp%2F%3Fpagato%3D1/);
});

test('senza il prezzo configurato /checkout lo dice, invece di aprire un pagamento storto', async () => {
  rete((url) =>
    url.includes('/auth/v1/user')
      ? new Response(JSON.stringify({ id: 'u-10', email: 'c@e.it' }), { status: 200 })
      : null,
  );
  const res = await worker.fetch(
    new Request('https://api.zack-app.com/checkout', {
      method: 'POST',
      headers: { authorization: 'Bearer buono' },
    }),
    { ...AMBIENTE, STRIPE_PREZZO: '' },
  );
  assert.equal(res.status, 503);
});

/* ---------------------------------------------------------------- */

test('/ricarica manda a Stripe il prezzo del LISTINO, non quello del client', async () => {
  /*
   * Un client che dichiara «pacchetto da 25 €» pagandone 5 non deve poter
   * esistere. Il prezzo si prende dall'id, e l'id e' una chiave chiusa.
   */
  const chiamate = rete((url) =>
    url.includes('/auth/v1/user')
      ? new Response(JSON.stringify({ id: 'u-9', email: 'c@e.it' }), { status: 200 })
      : new Response(JSON.stringify({ url: 'https://checkout.stripe.com/x' }), { status: 200 }),
  );

  const res = await worker.fetch(
    new Request('https://zack-app.com/ricarica', {
      method: 'POST',
      headers: { authorization: 'Bearer buono', 'content-type': 'application/json' },
      body: JSON.stringify({ pacchetto: 'p5', centesimi: 1, millesimi: 999999 }),
    }),
    AMBIENTE,
  );
  assert.equal(res.status, 200);

  const aStripe = chiamate.find((c) => c.url.includes('api.stripe.com'));
  const inviato = String(aStripe.corpo);
  // La chiave e' annidata alla Stripe — `line_items[0][price_data][unit_amount]`
  // — e URLSearchParams la codifica: la `]` prima del `=` diventa `%5D`, come
  // per `price` nel test di /checkout qui sopra.
  assert.match(inviato, /unit_amount%5D=500/, 'il prezzo non viene dal listino dei pacchetti');
  assert.doesNotMatch(inviato, /unit_amount%5D=1\b/, 'ha creduto al prezzo del client');
  assert.match(inviato, /mode=payment/, 'una ricarica non e’ un abbonamento');
  assert.match(inviato, /metadata%5Bmillesimi%5D=5000/);
});

test('un pacchetto inventato non apre nessun pagamento', async () => {
  rete((url) =>
    url.includes('/auth/v1/user')
      ? new Response(JSON.stringify({ id: 'u-9', email: 'c@e.it' }), { status: 200 })
      : null,
  );
  const res = await worker.fetch(
    new Request('https://zack-app.com/ricarica', {
      method: 'POST',
      headers: { authorization: 'Bearer buono', 'content-type': 'application/json' },
      body: JSON.stringify({ pacchetto: 'p1000' }),
    }),
    AMBIENTE,
  );
  assert.equal(res.status, 400);
});

test('lo STESSO evento Stripe non accredita due volte', async () => {
  /*
   * Stripe riprova i webhook, per un timeout o un deploy a meta'. La difesa e'
   * il vincolo `unique` su `movimenti.stripe_evento`: la seconda volta la
   * transazione fallisce, il saldo non si muove, e noi rispondiamo 200 perche'
   * per Stripe e' andata bene — l'aveva gia' fatta.
   */
  const corpo = JSON.stringify({
    id: 'evt_doppio',
    type: 'checkout.session.completed',
    data: { object: { mode: 'payment', metadata: { utente: 'u-1', millesimi: '5000' } } },
  });
  const t = Math.floor(Date.now() / 1000);
  let visto = false;
  rete((url) => {
    if (!url.includes('/rpc/accredita')) return null;
    if (visto) return new Response('{"code":"23505","message":"duplicate key"}', { status: 409 });
    visto = true;
    return new Response('5000', { status: 200 });
  });

  const manda = () =>
    worker.fetch(posta('/webhook', corpo, { 'stripe-signature': firmaPer(corpo, t) }), AMBIENTE);

  assert.equal((await manda()).status, 200);
  assert.equal((await manda()).status, 200, 'il rinvio di Stripe deve ricevere 200, non un errore');
});

test('⚠️ il duplicato riconosciuto anche se PostgREST non rispondesse 409', async () => {
  /*
   * Il 409 e' l'UNICA difesa contro un rinvio che gira in tondo: se il
   * duplicato arrivasse con un altro stato — qui un 500, come farebbe
   * PostgREST per qualsiasi altro errore del database — «solo 409 = va bene»
   * risponderebbe 500 anche a un duplicato onesto, e Stripe riproverebbe lo
   * stesso webhook per giorni, respinto ogni volta. Il codice Postgres del
   * vincolo `unique`, `23505`, nel CORPO basta da solo.
   */
  const corpo = JSON.stringify({
    id: 'evt_doppio_500',
    type: 'checkout.session.completed',
    data: { object: { mode: 'payment', metadata: { utente: 'u-1', millesimi: '5000' } } },
  });
  const t = Math.floor(Date.now() / 1000);
  let visto = false;
  rete((url) => {
    if (!url.includes('/rpc/accredita')) return null;
    if (visto) return new Response('{"code":"23505","message":"duplicate key"}', { status: 500 });
    visto = true;
    return new Response('5000', { status: 200 });
  });

  const manda = () =>
    worker.fetch(posta('/webhook', corpo, { 'stripe-signature': firmaPer(corpo, t) }), AMBIENTE);

  assert.equal((await manda()).status, 200);
  assert.equal(
    (await manda()).status,
    200,
    'un duplicato travestito da 500 non deve far riprovare Stripe per giorni',
  );
});

/* ---------------------------------------------------------------- */

test('tutto il resto resta il sito di prima', async () => {
  // Il Worker si e' messo DAVANTI ai file statici. Se sbagliasse a lasciarli
  // passare, il sito sparirebbe — ed e' la prima cosa che si nota.
  rete(() => new Response('{}', { status: 200 }));
  const res = await worker.fetch(new Request('https://zack-app.com/'), AMBIENTE);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'la home');
});

test('il browser e il Worker sono d’accordo su DOVE stanno le porte', () => {
  /*
   * Il difetto trovato il 2026-09-10, un momento prima di spedirlo.
   *
   * `src/lib/conto.js` chiamava `https://api.zack-app.com`, perche' cosi'
   * diceva il disegno nella spec. Ma `wrangler.jsonc` pubblica UN Worker, su
   * `zack-app.com` e `www.zack-app.com`: quel sottodominio non lo serviva
   * nessuno.
   *
   * Cosa sarebbe successo: `/me` fallisce sempre — `fetch` verso un host che
   * non esiste — e `chiediLicenza` torna sempre «non lo so». Per sette giorni
   * non se ne accorge nessuno, perche' la grazia copre. All'ottavo il muro si
   * alza a TUTTI, paganti compresi, e il motivo e' una stringa.
   *
   * Il test non chiede di stare alla stessa origine: chiede che se il browser
   * NOMINA un host, quell'host sia fra quelli che pubblichiamo.
   */
  const conto = readFileSync(new URL('../src/lib/conto.js', import.meta.url), 'utf8');
  const wrangler = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');

  const base = conto.match(/const BASE = '([^']*)'/)?.[1];
  assert.notEqual(base, undefined, 'conto.js non dice piu’ dove sta il Worker');
  if (base === '') return; // Stessa origine: non c'e' host da confrontare.

  const host = new URL(base).host;
  assert.ok(
    wrangler.includes(`"${host}"`),
    `il browser chiama ${host}, che wrangler.jsonc non pubblica: /me fallirebbe sempre`,
  );
});

test('un Worker senza segreti, o con Supabase giu’, non esplode', async () => {
  /*
   * In un Worker un'eccezione non gestita e' una pagina d'errore di Cloudflare
   * al posto del sito — e questo Worker serve anche il sito. Vale per il
   * deploy fatto prima dei `wrangler secret put` come per Supabase irrag-
   * giungibile: fallire chiuso e in silenzio e' l'unica risposta che non fa
   * danno a chi stava solo aprendo la home.
   */
  const nudo = { ASSETS: AMBIENTE.ASSETS };
  rete(() => {
    throw new TypeError('Failed to parse URL from undefined/auth/v1/user');
  });

  const res = await worker.fetch(
    new Request('https://zack-app.com/me', { headers: { authorization: 'Bearer qualcosa' } }),
    nudo,
  );
  assert.equal(res.status, 401);

  // E soprattutto: il sito continua a esistere.
  const home = await worker.fetch(new Request('https://zack-app.com/'), nudo);
  assert.equal(home.status, 200);
  assert.equal(await home.text(), 'la home');
});

test('⚠️ se la prova non si riesce a SCRIVERE, non si regala lo stesso', async () => {
  /*
   * Il difetto piu' insidioso di tutta B1, ed era nel mio codice fino al
   * 2026-09-10: l'esito della scrittura veniva ignorato.
   *
   * Se l'archivio non prende, la volta dopo `contoDi` torna ancora vuoto e
   * nascono altri quattordici giorni. E quelli dopo ancora. Una prova che non
   * finisce mai — che e' precisamente cio' che il piano avvertiva di evitare,
   * rientrato dalla porta di servizio.
   *
   * E non si vede: sullo schermo la striscia della prova c'e', uno la guarda,
   * la crede e va via convinto che funzioni. Si scoprirebbe fra due settimane,
   * quando non ha ancora pagato nessuno.
   */
  const chiamate = rete((url, o) => {
    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'u-11', email: 'c@e.it' }), { status: 200 });
    }
    if (url.includes('/rest/v1/conti?')) return new Response('[]', { status: 200 });
    // La scrittura non prende: chiave di servizio scaduta, RLS, rete.
    if (o?.method === 'POST') return new Response('no', { status: 401 });
    return null;
  });

  const res = await worker.fetch(
    new Request('https://zack-app.com/me', { headers: { authorization: 'Bearer buono' } }),
    AMBIENTE,
  );

  assert.equal(res.status, 500, 'ha regalato una prova che non e’ riuscito a scrivere');
  const corpo = await res.json();
  assert.equal(corpo.provaFino, undefined, 'ha detto al browser una prova che non esiste');
  assert.ok(chiamate.some((c) => c.metodo === 'POST'), 'non ha nemmeno provato a scrivere');
});
