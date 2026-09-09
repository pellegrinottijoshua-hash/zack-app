import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verificaFirma } from '../worker/firma.js';

/*
 * ⚠️ La riga che, se manca, non rompe niente e REGALA IL PRODOTTO.
 *
 * Un webhook non verificato e' un abbonamento gratis per chiunque sappia fare
 * una POST: basta mandare al nostro `/webhook` un finto «pagamento riuscito».
 * Non solleva errori, non compare nei log come un problema, e si scopre
 * guardando i conti di Stripe che non tornano.
 */

const SEGRETO = 'whsec_prova';
const ORA = new Date('2026-10-01T12:00:00Z');
const T = Math.floor(ORA.getTime() / 1000);
const CORPO = JSON.stringify({ type: 'checkout.session.completed' });
const firmaPer = (corpo, t) =>
  `t=${t},v1=${createHmac('sha256', SEGRETO).update(`${t}.${corpo}`).digest('hex')}`;

test('una firma giusta passa', async () => {
  assert.equal(await verificaFirma(CORPO, firmaPer(CORPO, T), SEGRETO, { adesso: ORA }), true);
});

test('una firma sbagliata NON passa', async () => {
  assert.equal(await verificaFirma(CORPO, `t=${T},v1=${'0'.repeat(64)}`, SEGRETO, { adesso: ORA }), false);
});

test('un corpo cambiato dopo la firma NON passa', async () => {
  // E' l'attacco vero: prendere un webhook autentico e cambiarci dentro l'id
  // dell'utente per regalarsi l'abbonamento.
  const firma = firmaPer(CORPO, T);
  const altro = JSON.stringify({ type: 'checkout.session.completed', ladro: true });
  assert.equal(await verificaFirma(altro, firma, SEGRETO, { adesso: ORA }), false);
});

test('una firma vecchia NON passa', async () => {
  // Senza il controllo sull'ora, un webhook autentico intercettato una volta
  // vale per sempre.
  assert.equal(await verificaFirma(CORPO, firmaPer(CORPO, T - 3600), SEGRETO, { adesso: ORA }), false);
});

test('un’intestazione storta NON passa, e non esplode', async () => {
  for (const brutta of ['', 'boh', 't=,v1=', null, undefined, 't=abc,v1=def']) {
    assert.equal(await verificaFirma(CORPO, brutta, SEGRETO, { adesso: ORA }), false, `«${brutta}»`);
  }
});

test('un segreto vuoto NON fa passare tutto', async () => {
  // Il caso della configurazione dimenticata: senza segreto si deve CHIUDERE,
  // non aprire. E' il difetto peggiore perche' capita in produzione, al primo
  // deploy fatto di fretta, e non si vede.
  assert.equal(await verificaFirma(CORPO, firmaPer(CORPO, T), '', { adesso: ORA }), false);
  assert.equal(await verificaFirma(CORPO, firmaPer(CORPO, T), undefined, { adesso: ORA }), false);
});
