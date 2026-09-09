import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRAZIA_GIORNI, PROVA_GIORNI, statoLicenza, puoiLavorare, giorniAllaProva } from '../src/engine/licenza.js';

/*
 * Chi puo' lavorare, e chi no.
 *
 * E' la parte che decide se un cliente pagante apre lo studio o resta fuori,
 * quindi e' pura e sta in Node: qui la si guarda tutta in una volta, invece di
 * scoprirla il giorno che qualcuno non riesce a entrare.
 *
 * LE DATE SONO DUE, e confonderle sbaglia in tutt'e due i versi (spec § 7.1):
 *
 *   `validoFino`  fino a quando e' pagato       — lo dice Stripe
 *   `chiestoIl`   quando il server ha risposto  — lo dice il browser
 *
 * Solo la prima: chi disdice e resta offline lavora per un mese intero.
 * Solo la seconda: chi non ha mai pagato lavora per sempre, basta staccare la
 * rete. Servono tutt'e due.
 */

const ORA = new Date('2026-10-01T12:00:00Z');
const giorniFa = (n) => new Date(ORA.getTime() - n * 86400000).toISOString();
const fraGiorni = (n) => new Date(ORA.getTime() + n * 86400000).toISOString();

test('la tabella dei casi, per intera', () => {
  const casi = [
    ['nessuna licenza', null, 'mai-entrato'],
    ['abbonato, risposta fresca', { abbonato: true, validoFino: fraGiorni(20), chiestoIl: giorniFa(0) }, 'aperto'],
    ['abbonato, risposta di 6 giorni fa', { abbonato: true, validoFino: fraGiorni(20), chiestoIl: giorniFa(6) }, 'aperto'],
    ['abbonato, risposta di 8 giorni fa', { abbonato: true, validoFino: fraGiorni(20), chiestoIl: giorniFa(8) }, 'da-ricollegare'],
    ['abbonamento scaduto', { abbonato: true, validoFino: giorniFa(1), chiestoIl: giorniFa(0) }, 'scaduto'],
    ['mai abbonato', { abbonato: false, validoFino: null, chiestoIl: giorniFa(0) }, 'scaduto'],
    ['in prova', { abbonato: false, validoFino: null, chiestoIl: giorniFa(0), provaFino: fraGiorni(10) }, 'prova'],
    ['prova finita', { abbonato: false, validoFino: null, chiestoIl: giorniFa(0), provaFino: giorniFa(1) }, 'scaduto'],
  ];
  for (const [che, licenza, atteso] of casi) {
    assert.equal(statoLicenza(licenza, { adesso: ORA }), atteso, `«${che}» dovrebbe dare «${atteso}»`);
  }
});

test('un abbonamento valido NON basta se la risposta e’ vecchia', () => {
  // Il verso che si dimentica: chi ha disdetto ieri ha ancora `validoFino` nel
  // futuro dell'ultima risposta salvata, e senza la seconda data lavorerebbe
  // fino a fine mese senza pagare.
  const l = { abbonato: true, validoFino: fraGiorni(20), chiestoIl: giorniFa(GRAZIA_GIORNI + 1) };
  assert.equal(statoLicenza(l, { adesso: ORA }), 'da-ricollegare');
});

test('una risposta fresca NON basta se l’abbonamento e’ scaduto', () => {
  // L'altro verso: staccare la rete non deve regalare niente.
  const l = { abbonato: true, validoFino: giorniFa(1), chiestoIl: giorniFa(0) };
  assert.equal(statoLicenza(l, { adesso: ORA }), 'scaduto');
});

test('si lavora solo da abbonati o in prova', () => {
  assert.equal(puoiLavorare('aperto'), true);
  assert.equal(puoiLavorare('prova'), true);
  for (const s of ['scaduto', 'da-ricollegare', 'mai-entrato']) {
    assert.equal(puoiLavorare(s), false, `«${s}» non deve far lavorare`);
  }
});

test('uno stato inventato non fa lavorare', () => {
  // Puo' arrivare da una memoria vecchia. Nel dubbio si chiude: il danno di
  // chiudere per sbaglio si ripara con un tasto, quello di aprire no.
  assert.equal(puoiLavorare('boh'), false);
  assert.equal(puoiLavorare(undefined), false);
});

test('una licenza storta non fa lavorare e non esplode', () => {
  for (const rotta of [{}, { abbonato: true }, { chiestoIl: 'ieri' }, { abbonato: true, validoFino: 'mai', chiestoIl: giorniFa(0) }]) {
    const s = statoLicenza(rotta, { adesso: ORA });
    assert.equal(puoiLavorare(s), false, `${JSON.stringify(rotta)} ha fatto passare`);
  }
});

test('i due numeri sono dichiarati, non sparsi nel codice', () => {
  // Si cambieranno. Quando succede si cambiano QUI, e i test lo raccontano.
  assert.equal(GRAZIA_GIORNI, 7);
  assert.equal(PROVA_GIORNI, 14);
});

test('i giorni di prova che restano si contano per eccesso', () => {
  // «Restano 0 giorni» a chi ne ha ancora mezzo e' una bugia che fa chiudere
  // l'app e non riaprirla.
  assert.equal(giorniAllaProva({ provaFino: fraGiorni(13.2) }, { adesso: ORA }), 14);
  assert.equal(giorniAllaProva({ provaFino: fraGiorni(0.3) }, { adesso: ORA }), 1);
  assert.equal(giorniAllaProva({ provaFino: giorniFa(1) }, { adesso: ORA }), 0);
  assert.equal(giorniAllaProva({}, { adesso: ORA }), 0);
});
