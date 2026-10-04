import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MISURA_VOCE, MAX_CARATTERI, VOCI_PRONTE, caratteriDi, costoLettura, letturaNonValida, prezzoLettura,
} from '../src/engine/listinoVoce.js';
import { priceFor } from '../src/engine/ledger.js';

/*
 * Il listino della voce (fetta 6a). Il costo si misura prima di scrivere il
 * prezzo: finché la misura manca, nessun prezzo.
 */

const VOCE = VOCI_PRONTE[0].id;

test('⚠️ senza misura non c’è prezzo: `null`, mai uno zero', () => {
  // Il giorno della misura questa prova si rompe apposta: va riletta la spec §2.2.
  assert.equal(MISURA_VOCE, null, 'la misura è stata scritta: aggiorna questa prova e lo stato');
  assert.equal(prezzoLettura('ciao'), null);
  assert.equal(costoLettura(1000), null);
  assert.equal(costoLettura(1000, 0), null);
  assert.equal(costoLettura(1000, Number.NaN), null);
});

test('con una misura: a carattere, per eccesso, col ricarico di Immagine e Video', () => {
  assert.equal(costoLettura(1000, 30), 30);
  assert.equal(costoLettura(1, 30), 1, 'un carattere costa almeno un millesimo, arrotondato per eccesso');
  assert.equal(costoLettura(1001, 30), 31);
  assert.deepEqual(prezzoLettura('a'.repeat(1000), 30), priceFor(30));
});

test('il testo vuoto non dice «0 €»: il prezzo accanto al tasto parte da un carattere', () => {
  assert.deepEqual(prezzoLettura('', 30), priceFor(1));
  assert.deepEqual(prezzoLettura('   ', 30), priceFor(1));
});

test('i caratteri si contano senza gli spazi ai bordi, in UTF-16 (per eccesso)', () => {
  assert.equal(caratteriDi('  ciao  '), 4);
  assert.equal(caratteriDi('🦆'), 2);
  assert.equal(caratteriDi(null), 0);
});

test('la richiesta: testo, tetto e voce della lista chiusa', () => {
  assert.equal(letturaNonValida({ testo: 'ciao', voce: VOCE }), null);
  assert.equal(letturaNonValida({ testo: '  ', voce: VOCE }), 'senza-testo');
  assert.equal(letturaNonValida({ testo: 42, voce: VOCE }), 'senza-testo');
  assert.equal(letturaNonValida({ testo: 'a'.repeat(MAX_CARATTERI), voce: VOCE }), null);
  assert.equal(letturaNonValida({ testo: 'a'.repeat(MAX_CARATTERI + 1), voce: VOCE }), 'testo-troppo-lungo');
  assert.equal(letturaNonValida({ testo: 'ciao', voce: 'toString' }), 'voce-sconosciuta');
  assert.equal(letturaNonValida({ testo: 'ciao' }), 'voce-sconosciuta');
});

test('le voci pronte hanno id e nome, senza doppioni', () => {
  assert.ok(VOCI_PRONTE.length >= 2);
  assert.equal(new Set(VOCI_PRONTE.map((v) => v.id)).size, VOCI_PRONTE.length);
  for (const v of VOCI_PRONTE) assert.ok(v.id && v.nome);
});
