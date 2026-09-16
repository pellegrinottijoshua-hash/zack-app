import { test } from 'node:test';
import assert from 'node:assert/strict';
import { impilaRisultato, vaIndietro, vaAvanti } from '../src/engine/storia.js';

/*
 * Le due pile di «indietro» e «avanti», isolate da React (Critico 1 della
 * revisione del Task 6, 2026-09-16).
 *
 * Ogni prova dichiara da quali pile parte — storia e futuro, esplicite — così
 * chi legge non deve indovinare lo stato di partenza: è la lezione B2 numero
 * 2, e qui vale doppio perché la botola del Critico 1 stava proprio in una
 * combinazione di pile che nessuna prova aveva mai scritto.
 */

test('impilare: un risultato nuovo fa crescere la storia e svuota il futuro', () => {
  const storia = ['R1'];
  const futuro = ['R2']; // un vecchio "avanti" ancora in piedi: deve sparire
  const { storia: nuovaStoria, futuro: nuovoFuturo } = impilaRisultato(storia, 'R1prima');
  assert.deepEqual(nuovaStoria, ['R1', 'R1prima']);
  assert.deepEqual(nuovoFuturo, []);
  // Le pile di partenza non si mutano: la funzione è pura.
  assert.deepEqual(storia, ['R1']);
  assert.deepEqual(futuro, ['R2']);
});

test('impilare: un risultato attuale che non c\'è (null) non si impila — Critico 1', () => {
  // Il caso che ha aperto la botola: foto sul piano, primo scontorno mai
  // fatto. `risultatoDiPrima` è `null` perché non esiste ancora nessun
  // risultato prima di questo. Impilarlo comunque costruirebbe una storia
  // che porta a `risultato: null`, con la colonna intera nascosta.
  const storia = [];
  const { storia: nuovaStoria, futuro: nuovoFuturo } = impilaRisultato(storia, null);
  assert.deepEqual(nuovaStoria, [], 'un null impilato apre la botola del Critico 1');
  assert.deepEqual(nuovoFuturo, []);
});

test('impilare: il tetto resta a otto mosse', () => {
  const storia = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];
  const { storia: nuovaStoria } = impilaRisultato(storia, 'R9');
  assert.deepEqual(nuovaStoria, ['R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']);
  assert.equal(nuovaStoria.length, 8);
});

test('indietro: la cima della storia diventa il risultato attuale, quello di prima va nel futuro', () => {
  const storia = ['R1', 'R2'];
  const futuro = [];
  const mossa = vaIndietro(storia, futuro, 'R3');
  assert.deepEqual(mossa, { storia: ['R1'], futuro: ['R3'], risultato: 'R2' });
});

test('indietro: con la storia vuota non fa nulla — il tasto resta spento, non una botola', () => {
  const mossa = vaIndietro([], ['R1'], 'R2');
  assert.equal(mossa, null);
});

test('indietro: il tetto del futuro resta a otto mosse', () => {
  const futuro = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'];
  const mossa = vaIndietro(['R1'], futuro, 'R2');
  assert.deepEqual(mossa.futuro, ['F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'R2']);
});

test('avanti: esatto contrario di indietro', () => {
  const storia = ['R1'];
  const futuro = ['R3'];
  const mossa = vaAvanti(storia, futuro, 'R2');
  assert.deepEqual(mossa, { storia: ['R1', 'R2'], futuro: [], risultato: 'R3' });
});

test('avanti: con il futuro vuoto non fa nulla', () => {
  const mossa = vaAvanti(['R1'], [], 'R2');
  assert.equal(mossa, null);
});

test('avanti: il tetto della storia resta a otto mosse', () => {
  const storia = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];
  const mossa = vaAvanti(storia, ['R9'], 'R8prima');
  assert.deepEqual(mossa.storia, ['R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R8prima']);
});

test('un giro completo: impila, indietro, avanti torna dov\'era', () => {
  // Il flusso più comune: un solo scontorno, un annulla, un rifai. Prima
  // della correzione, il primo "indietro" qui portava a `risultato: null` e
  // «avanti» spariva con tutta la colonna.
  let storia = [];
  let futuro = [];
  let risultato = null;

  // Primo scontorno: nessun risultato prima, quindi non si impila nulla.
  ({ storia, futuro } = impilaRisultato(storia, risultato));
  risultato = 'R1';
  assert.deepEqual(storia, [], 'il primo scontorno non deve impilare null');

  // Un ritocco: ora sì che c\'è un risultato di prima da impilare.
  ({ storia, futuro } = impilaRisultato(storia, risultato));
  risultato = 'R2';
  assert.deepEqual(storia, ['R1']);

  // Indietro: torna R1, R2 va nel futuro.
  let mossa = vaIndietro(storia, futuro, risultato);
  assert.notEqual(mossa, null);
  ({ storia, futuro, risultato } = mossa);
  assert.deepEqual(storia, []);
  assert.deepEqual(futuro, ['R2']);
  assert.equal(risultato, 'R1');

  // Avanti: torna R2, storia riprende R1.
  mossa = vaAvanti(storia, futuro, risultato);
  assert.notEqual(mossa, null);
  ({ storia, futuro, risultato } = mossa);
  assert.deepEqual(storia, ['R1']);
  assert.deepEqual(futuro, []);
  assert.equal(risultato, 'R2');
});
