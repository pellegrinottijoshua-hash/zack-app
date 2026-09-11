import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chiPaga, cosaFare, ricaricaDa, PACCHETTI } from '../worker/eventi.js';
import { LISTINO, prezzoDi } from '../src/engine/listino.js';

/*
 * Il rinnovo deve trovare la stessa persona della prima volta.
 *
 * Il piano diceva di leggere `data.object.metadata.utente` e basta. Funziona
 * alla prima iscrizione e poi mai piu': quel `metadata` e' quello della
 * SESSIONE di pagamento, che esiste una volta sola. Al rinnovo arriva una
 * fattura, alla disdetta un abbonamento — due oggetti diversi, con due
 * `metadata` diversi.
 *
 * Il guasto sarebbe stato invisibile: primo mese giusto, poi il rinnovo arriva
 * e non trova nessuno a cui accreditarlo, ed esce da una porta che risponde
 * «va bene» senza lamentarsi. Trentadue giorni dopo un cliente che paga
 * regolarmente trova il muro. Nessun errore nei log. Solo un cliente in meno.
 */

const ORA = new Date('2026-10-01T12:00:00Z');
const FRA_UN_MESE = Math.floor(new Date('2026-11-01T12:00:00Z').getTime() / 1000);

test('la prima iscrizione: il metadata sta sulla sessione', () => {
  const fatto = cosaFare(
    {
      type: 'checkout.session.completed',
      data: { object: { metadata: { utente: 'u-1' }, customer: 'cus_1' } },
    },
    { adesso: ORA },
  );
  assert.equal(fatto.utente, 'u-1');
  assert.equal(fatto.abbonato, true);
  assert.equal(fatto.stripe_cliente, 'cus_1');
  // La sessione non porta il periodo: valgono 32 giorni, che sbagliano dalla
  // parte giusta — un mese di calendario e' al massimo 31.
  assert.equal(fatto.valido_fino, new Date('2026-11-02T12:00:00Z').toISOString());
});

test('il rinnovo: il metadata sta sulla FATTURA, in due posti diversi', () => {
  // Stripe lo mette in `subscription_details` o dentro le righe, a seconda
  // della versione dell'API. Guardare in uno solo vuol dire funzionare finche'
  // Stripe non cambia versione.
  const dentroDettagli = {
    type: 'invoice.paid',
    data: {
      object: {
        subscription_details: { metadata: { utente: 'u-2' } },
        customer: 'cus_2',
        lines: { data: [{ period: { end: FRA_UN_MESE } }] },
      },
    },
  };
  const dentroLeRighe = {
    type: 'invoice.paid',
    data: {
      object: {
        customer: 'cus_2',
        lines: { data: [{ metadata: { utente: 'u-2' }, period: { end: FRA_UN_MESE } }] },
      },
    },
  };

  for (const evento of [dentroDettagli, dentroLeRighe]) {
    const fatto = cosaFare(evento, { adesso: ORA });
    assert.equal(fatto.utente, 'u-2', 'il rinnovo non trova a chi accreditarlo');
    assert.equal(fatto.abbonato, true);
    // Qui la data VERA c'e', e vince sui 32 giorni inventati: Stripe e' la
    // fonte di verita' sui pagamenti, e due risposte alla stessa domanda
    // prima o poi divergono.
    assert.equal(fatto.valido_fino, '2026-11-01T12:00:00.000Z');
  }
});

test('la disdetta chiude, e chiude adesso', () => {
  const fatto = cosaFare(
    {
      type: 'customer.subscription.deleted',
      data: { object: { metadata: { utente: 'u-3' }, customer: 'cus_3' } },
    },
    { adesso: ORA },
  );
  assert.equal(fatto.abbonato, false);
  assert.equal(fatto.valido_fino, ORA.toISOString());
});

test('senza sapere a CHI, non si scrive niente', () => {
  /*
   * Meglio non fare che accreditare l'abbonamento alla persona sbagliata. E'
   * anche il motivo per cui il `metadata` va messo sull'ABBONAMENTO oltre che
   * sulla sessione: se ci si dimenticasse, questo caso scatterebbe a ogni
   * rinnovo — in silenzio.
   */
  const senza = { type: 'invoice.paid', data: { object: { customer: 'cus_4' } } };
  assert.equal(cosaFare(senza, { adesso: ORA }), null);
});

test('gli eventi che non ci riguardano non toccano niente', () => {
  for (const tipo of ['invoice.created', 'customer.updated', 'ping', undefined]) {
    const evento = { type: tipo, data: { object: { metadata: { utente: 'u-5' } } } };
    assert.equal(cosaFare(evento, { adesso: ORA }), null, `«${tipo}» ha scritto qualcosa`);
  }
  assert.equal(cosaFare(null, { adesso: ORA }), null);
  assert.equal(cosaFare({}, { adesso: ORA }), null);
});

test('un evento storto non esplode', () => {
  // Arriva da fuori. Che la firma sia giusta non vuol dire che la forma lo sia.
  for (const rotto of [
    { type: 'invoice.paid' },
    { type: 'invoice.paid', data: null },
    { type: 'invoice.paid', data: { object: { metadata: { utente: 'u' }, lines: { data: [] } } } },
    { type: 'invoice.paid', data: { object: { metadata: { utente: 'u' }, customer: { id: 'x' } } } },
  ]) {
    assert.doesNotThrow(() => cosaFare(rotto, { adesso: ORA }));
  }
  // Un `customer` che non e' una stringa non finisce nell'archivio come oggetto.
  const strano = cosaFare(
    { type: 'invoice.paid', data: { object: { metadata: { utente: 'u' }, customer: { id: 'x' } } } },
    { adesso: ORA },
  );
  assert.equal(strano.stripe_cliente, null);
});

test('chiPaga guarda in tutti e tre i posti, e non inventa', () => {
  assert.equal(chiPaga({ metadata: { utente: 'a' } }), 'a');
  assert.equal(chiPaga({ subscription_details: { metadata: { utente: 'b' } } }), 'b');
  assert.equal(chiPaga({ lines: { data: [{ metadata: { utente: 'c' } }] } }), 'c');
  assert.equal(chiPaga({}), null);
  assert.equal(chiPaga(), null);
});

/* ---------------------------------------------------------------- */

test('⚠️ comprare crediti NON deve regalare l’abbonamento', () => {
  /*
   * `checkout.session.completed` scatta per TUTT'E DUE: l'abbonamento e la
   * ricarica. Distinguono solo per `mode`. Senza guardarlo, chiunque compri
   * 5 € di crediti diventerebbe abbonato a vita — e non se ne accorgerebbe
   * nessuno, perche' il cliente e' contento e il difetto lavora a favore suo.
   */
  const ricarica = {
    type: 'checkout.session.completed',
    data: { object: { mode: 'payment', metadata: { utente: 'u-1', millesimi: '5000' } } },
  };
  assert.equal(cosaFare(ricarica), null, 'una ricarica ha attivato un abbonamento');
});

test('la ricarica si riconosce, e porta l’id dell’evento', () => {
  const r = ricaricaDa({
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: { object: { mode: 'payment', metadata: { utente: 'u-1', millesimi: '5000' } } },
  });
  assert.deepEqual(r, { utente: 'u-1', millesimi: 5000, evento: 'evt_1' });
});

test('un abbonamento non e’ una ricarica', () => {
  assert.equal(ricaricaDa({
    id: 'evt_2',
    type: 'checkout.session.completed',
    data: { object: { mode: 'subscription', metadata: { utente: 'u-1' } } },
  }), null);
});

test('una ricarica senza importo, o con un importo storto, non accredita', () => {
  // L'importo arriva dal `metadata` che abbiamo messo noi, ma un evento
  // arriva da fuori: che la firma sia giusta non vuol dire che il corpo lo sia.
  for (const m of [undefined, '', '0', '-100', 'tanti', '99999999999']) {
    const e = {
      id: 'evt_3',
      type: 'checkout.session.completed',
      data: { object: { mode: 'payment', metadata: { utente: 'u-1', millesimi: m } } },
    };
    assert.equal(ricaricaDa(e), null, `«${m}» ha accreditato qualcosa`);
  }
});

test('i tre pacchetti sono quelli decisi, e nessun altro', () => {
  assert.deepEqual(Object.keys(PACCHETTI).sort(), ['p10', 'p25', 'p5']);
  assert.deepEqual(PACCHETTI.p5,  { millesimi: 5000,  centesimi: 500  });
  assert.deepEqual(PACCHETTI.p10, { millesimi: 10000, centesimi: 1000 });
  assert.deepEqual(PACCHETTI.p25, { millesimi: 25000, centesimi: 2500 });
  // Stripe incassa in centesimi, il saldo vive in millesimi: il fattore mille
  // scritto due volte diverge al primo pacchetto nuovo.
  for (const p of Object.values(PACCHETTI)) {
    assert.equal(p.millesimi, p.centesimi * 10);
  }
});

test('un pacchetto vale almeno quanto una generazione', () => {
  // Vendere 5 € di credito quando la generazione piu' cara ne costa di piu'
  // sarebbe vendere qualcosa che non si puo' usare. Ma il cliente non compra
  // COSTI (quel che paghiamo al fornitore): compra GENERAZIONI, e una
  // generazione costa il PREZZO, margine compreso — sempre di piu' del
  // costo. Misurare col costo avrebbe fatto passare un pacchetto che non
  // basta nemmeno per una generazione sola.
  const piuCara = Math.max(...Object.keys(LISTINO).map((id) => prezzoDi(id).total));
  assert.ok(PACCHETTI.p5.millesimi > piuCara * 10, 'il pacchetto minimo non compra dieci generazioni');
});
