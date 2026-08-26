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

// ---------------------------------------------------------------------------
// La home a blocchi: un video solo, sempre visibile, che avanza mentre le
// informazioni gli scorrono davanti.
// ---------------------------------------------------------------------------

test('ogni blocco occupa la sua fetta di video', async () => {
  const { timeForBlock } = await import('../src/landing/scrollVideo.js');
  // Cinque blocchi su venticinque secondi: il terzo va dal decimo al quindici.
  assert.equal(timeForBlock(2, 0, 25, 5), 10);
  assert.equal(timeForBlock(2, 1, 25, 5), 15);
  assert.equal(timeForBlock(2, 0.5, 25, 5), 12.5);
});

test('il primo blocco parte da zero e l\'ultimo finisce alla fine', async () => {
  const { timeForBlock } = await import('../src/landing/scrollVideo.js');
  assert.equal(timeForBlock(0, 0, 25, 5), 0);
  assert.equal(timeForBlock(4, 1, 25, 5), 25);
});

test('un blocco fuori elenco non manda il video oltre la sua durata', async () => {
  // Una sezione aggiunta senza aggiornare il conteggio non deve produrre un
  // seek fuori scala: il video resterebbe fermo sull'ultimo fotogramma senza
  // che nulla sollevi un errore.
  const { timeForBlock } = await import('../src/landing/scrollVideo.js');
  assert.equal(timeForBlock(99, 1, 25, 5), 25);
  assert.equal(timeForBlock(-3, 0, 25, 5), 0);
});

test('un video senza durata non fa saltare il conto', async () => {
  const { timeForBlock } = await import('../src/landing/scrollVideo.js');
  assert.equal(timeForBlock(1, 0.5, NaN, 5), 0);
  assert.equal(timeForBlock(1, 0.5, 25, 0), 0);
});

test('si sta leggendo la sezione che ha già passato la metà dello schermo', async () => {
  // Non quella che sta arrivando: il testo si legge quando è al centro, e il
  // gesto di Zack deve corrispondere a ciò che si legge adesso.
  const { blockAt } = await import('../src/landing/scrollVideo.js');
  const riquadri = [
    { top: -600, height: 800 },
    { top: 200, height: 800 },
    { top: 1000, height: 800 },
  ];
  const { indice } = blockAt(riquadri, 800);
  assert.equal(indice, 1, 'la seconda ha superato la metà, la terza no');
});

test('senza sezioni il video resta al principio invece di esplodere', async () => {
  const { blockAt } = await import('../src/landing/scrollVideo.js');
  assert.deepEqual(blockAt([], 800), { indice: 0, progresso: 0 });
});
