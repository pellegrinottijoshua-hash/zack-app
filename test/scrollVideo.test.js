import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionProgress, timeFor, shouldSeek } from '../src/landing/scrollVideo.js';

const VH = 800;

test('prima della sezione il progresso è zero', () => {
  // La sezione deve ancora arrivare: top positivo.
  assert.equal(sectionProgress(VH, 2400, VH), 0);
  assert.equal(sectionProgress(10, 2400, VH), 0);
});

test('a metà scorrimento il progresso è a metà', () => {
  // Sezione 2400, schermo 800 → 1600 di scorrimento utile.
  assert.equal(sectionProgress(-800, 2400, VH), 0.5);
});

test('oltre la sezione il progresso resta a uno', () => {
  assert.equal(sectionProgress(-1600, 2400, VH), 1);
  assert.equal(sectionProgress(-99999, 2400, VH), 1, 'non deve superare uno');
});

test('una sezione alta quanto lo schermo non divide per zero', () => {
  // Senza il controllo il video salterebbe fra 0 e infinito.
  assert.equal(sectionProgress(0, VH, VH), 1);
  assert.equal(sectionProgress(100, VH, VH), 0);
  assert.ok(Number.isFinite(sectionProgress(-50, VH, VH)));
});

test('una sezione più bassa dello schermo non produce valori assurdi', () => {
  const p = sectionProgress(-10, 400, VH);
  assert.ok(p >= 0 && p <= 1, `progresso fuori scala: ${p}`);
});

test('il tempo segue il progresso lungo la durata', () => {
  assert.equal(timeFor(0, 10), 0);
  assert.equal(timeFor(0.5, 10), 5);
  assert.equal(timeFor(1, 10), 10);
});

test('una durata sconosciuta non manda il video a NaN', () => {
  // Prima che i metadati siano caricati, duration è NaN: impostarlo su
  // currentTime lascerebbe il video bloccato per sempre.
  assert.equal(timeFor(0.5, NaN), 0);
  assert.equal(timeFor(0.5, Infinity), 0);
  assert.equal(timeFor(0.5, 0), 0);
});

test('il tempo resta dentro la durata anche con progressi fuori scala', () => {
  assert.equal(timeFor(-1, 10), 0);
  assert.equal(timeFor(2, 10), 10);
});

test('non si cerca per differenze invisibili', () => {
  // Impostare currentTime a ogni evento inonda il decoder e il video scatta
  // invece di scorrere.
  assert.equal(shouldSeek(5, 5.001), false);
  assert.equal(shouldSeek(5, 5.5), true);
  assert.equal(shouldSeek(5, 4.5), true);
});

test('la soglia è configurabile', () => {
  assert.equal(shouldSeek(5, 5.1, 0.5), false);
  assert.equal(shouldSeek(5, 5.1, 0.01), true);
});
