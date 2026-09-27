import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggiungiRiferimenti, prezzoCorsia, statoTasto, TETTO, RUOLO_HOME } from '../src/landing/corsia.js';
import { prezzoDi, limitiDi } from '../src/engine/listino.js';

/*
 * La corsia Immagine della home (fetta 2c). Ogni prova parte da uno stato
 * dichiarato: nessun riferimento, saldo zero, nessuna sessione.
 */

test('il tetto dei riferimenti è quello del listino per il ruolo della home, non un numero a mano', () => {
  assert.equal(TETTO, limitiDi('immagine-nbp')[RUOLO_HOME]);
  assert.ok(TETTO > 0);
});

test('oltre il tetto i riferimenti si fermano, e quelli rimasti fuori si contano', () => {
  const pieni = Array.from({ length: TETTO - 1 }, (_, i) => i);
  const { lista, fuori } = aggiungiRiferimenti(pieni, ['a', 'b', 'c']);
  assert.equal(lista.length, TETTO);
  assert.equal(fuori, 2, 'i riferimenti in più sono spariti senza che nessuno lo dica');
});

test('il prezzo accanto al tasto conta i riferimenti: è quello che il Worker addebita', () => {
  /*
   * Rompere apposta: `prezzoDi(VOCE)` senza `{ riferimenti }` → a tre
   * riferimenti la home mostra il prezzo base, e il Worker ne addebita di più.
   */
  assert.equal(prezzoCorsia([]), prezzoDi('immagine-nbp').total);
  assert.equal(prezzoCorsia([1, 2, 3]), prezzoDi('immagine-nbp', { riferimenti: 3 }).total);
  assert.ok(prezzoCorsia([1, 2, 3]) > prezzoCorsia([]));
});

test('senza prompt il tasto è spento, anche con credito', () => {
  assert.equal(statoTasto({ prompt: '', saldo: 99999, prezzo: 146 }), 'spento');
  assert.equal(statoTasto({ prompt: '   ', saldo: 99999, prezzo: 146 }), 'spento');
});

test('⚠️ a saldo zero il tasto apre la ricarica: non sparisce e non genera', () => {
  // È il Critical di B2 (il tasto per pagare che spariva a saldo zero), detto
  // come regola pura.
  assert.equal(statoTasto({ prompt: 'un gatto', saldo: 0, prezzo: 146 }), 'ricarica');
  assert.equal(statoTasto({ prompt: 'un gatto', saldo: undefined, prezzo: 146 }), 'ricarica');
});

test('col saldo giusto si genera; al millesimo sotto no', () => {
  assert.equal(statoTasto({ prompt: 'un gatto', saldo: 146, prezzo: 146 }), 'genera');
  assert.equal(statoTasto({ prompt: 'un gatto', saldo: 145, prezzo: 146 }), 'ricarica');
});

test('un lavoro in corso spegne il tasto: due clic non fanno due addebiti', () => {
  assert.equal(statoTasto({ prompt: 'un gatto', saldo: 99999, prezzo: 146, inCorso: true }), 'spento');
});
