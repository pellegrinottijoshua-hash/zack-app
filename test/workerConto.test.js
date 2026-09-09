import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
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
  SITO: 'https://zack-app.com',
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

test('tutto il resto resta il sito di prima', async () => {
  // Il Worker si e' messo DAVANTI ai file statici. Se sbagliasse a lasciarli
  // passare, il sito sparirebbe — ed e' la prima cosa che si nota.
  rete(() => new Response('{}', { status: 200 }));
  const res = await worker.fetch(new Request('https://zack-app.com/'), AMBIENTE);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'la home');
});
