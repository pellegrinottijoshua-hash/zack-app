import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postoDelPiu, mostraMascotte, mostraCrediti } from '../src/servizi/pelle.js';
import { DESCRITTORI } from '../src/servizi/index.js';

test('col piano vuoto il + sta in mezzo: è il gesto con cui si comincia', () => {
  assert.equal(postoDelPiu('scontorna', { quanti: 0, tetto: 3 }), 'centro');
});

test('appena entra un file il + va a sinistra — si entra da sinistra, si esce a destra', () => {
  assert.equal(postoDelPiu('scontorna', { quanti: 1, tetto: 3 }), 'sinistra');
  assert.equal(postoDelPiu('scontorna', { quanti: 2, tetto: 3 }), 'sinistra');
});

test('al tetto il + sparisce', () => {
  assert.equal(postoDelPiu('scontorna', { quanti: 3, tetto: 3 }), null);
  // Brain tiene 99: il + non deve sparire al terzo oggetto.
  assert.equal(postoDelPiu('brain', { quanti: 3, tetto: 99 }), 'sinistra');
});

test('la mascotte è lo stato vuoto, e se ne va col primo file', () => {
  assert.equal(mostraMascotte('scontorna', { quanti: 0 }), true);
  assert.equal(mostraMascotte('scontorna', { quanti: 1 }), false);
});

test('la mascotte non c\'è su Brain: è una libreria, non uno stato vuoto', () => {
  assert.equal(mostraMascotte('brain', { quanti: 0 }), false);
});

test('i crediti NON si vedono in home né in scontorna', () => {
  // H3: chi apre un'app gratis non vuole leggere «0,00 €», vuole scontornare.
  assert.equal(mostraCrediti('scontorna'), false);
  assert.equal(mostraCrediti('brain'), false);
});

test('i crediti si vedono dove si spendono', () => {
  // ⚠️ È la porta verso il pagamento: toglierla dappertutto rifarebbe il
  // difetto peggiore di B2 (il tasto per ricaricare che spariva a saldo zero).
  assert.equal(mostraCrediti('immagine'), true);
});

test('ogni servizio dell\'impianto ha una risposta, non un undefined', () => {
  // Un servizio nuovo che nessuno elenca qui non deve «cadere» in un
  // comportamento a caso: è così che il filmato restò fuori da tre liste.
  for (const id of Object.keys(DESCRITTORI)) {
    assert.equal(typeof mostraCrediti(id), 'boolean', id);
    assert.equal(typeof mostraMascotte(id, { quanti: 0 }), 'boolean', id);
  }
});
