import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * Il Worker non si connette a Postgres per essere provato (spec, e la
 * consegna di questo giro di correzioni lo vieta esplicitamente): si legge il
 * sorgente SQL, come gia' fa `workerConto.test.js` per `wrangler.jsonc`.
 *
 * Task 1a della revisione: `accredita` faceva l'INSERT in `movimenti` PRIMA
 * dell'UPDATE su `conti`. Se l'utente non aveva ancora una riga in `conti`
 * (e il cammino esiste: `/me` e' l'unico posto che la crea, e puo' fallire),
 * l'UPDATE non trovava niente, `rimasto` restava NULL, e la funzione
 * TORNAVA senza sollevare: la transazione commetteva lo stesso, il movimento
 * restava scritto, e il vincolo `unique` su `stripe_evento` aveva gia'
 * consumato l'id dell'evento — irrecuperabile, perche' Stripe non
 * riproverebbe mai piu' un webhook per cui ha gia' ricevuto 200.
 */

const SQL = readFileSync(new URL('../docs/2026-09-10-schema-b2.sql', import.meta.url), 'utf8');

/** Il corpo di una delle due funzioni, dalla sua `create` alla sua `revoke`. */
function corpoFunzione(nome) {
  const inizio = SQL.indexOf(`create or replace function ${nome}(`);
  assert.notEqual(inizio, -1, `la funzione ${nome} non e’ piu’ nel file`);
  const fine = SQL.indexOf(`revoke execute on function ${nome}`, inizio);
  assert.notEqual(fine, -1, `manca la revoca dopo ${nome}: la funzione resterebbe eseguibile da chiunque`);
  return SQL.slice(inizio, fine);
}

test('⚠️ accredita solleva se il conto non esiste, DOPO l’update: non incassa senza accreditare', () => {
  const corpo = corpoFunzione('accredita');
  const iUpdate = corpo.indexOf('update conti');
  assert.notEqual(iUpdate, -1, 'accredita non aggiorna piu’ conti');

  const iRaise = corpo.indexOf('raise exception', iUpdate);
  assert.ok(
    iRaise > iUpdate,
    'accredita non solleva DOPO l’update quando il conto non esiste: la transazione commette lo stesso, il movimento resta scritto e l’evento Stripe e’ consumato per sempre',
  );

  // La guardia deve dipendere DAVVERO dall'esito dell'update (`rimasto`), non
  // essere un `raise` scollegato messo li' solo per far passare il test.
  const guardia = corpo.slice(iUpdate, iRaise + 200);
  assert.match(guardia, /rimasto is null/, 'la guardia non controlla se l’update ha trovato la riga da accreditare');
});

test('il file resta idempotente: si puo’ ancora reincollare tutto insieme senza guastarsi', () => {
  // Vincolo esplicito della consegna: il committente reincolla il file INTERO
  // ogni volta. `create or replace function` e `add column if not exists`
  // sono le due forme che lo rendono sicuro da rieseguire.
  assert.match(SQL, /alter table conti add column if not exists crediti/);
  assert.match(SQL, /create or replace function accredita\(/);
  assert.match(SQL, /create or replace function addebita\(/);
});
