import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuovoGesto, giu, muove, su, dueDita, applica } from '../src/engine/gesti.js';

test('un dito solo lavora: non muove e non ingrandisce', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 10, y: 10 });
  assert.equal(dueDita(g), false);
  assert.equal(muove(g, { id: 1, x: 40, y: 10 }), null, 'un dito non deve spostare la vista');
});

test('due dita che si allontanano ingrandiscono', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  assert.equal(dueDita(g), true);
  const m = muove(g, { id: 2, x: 200, y: 0 });
  assert.ok(m.fattore > 1.9 && m.fattore < 2.1, `atteso ~2, ottenuto ${m.fattore}`);
});

test('due dita che scorrono insieme spostano e non ingrandiscono', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  const m1 = muove(g, { id: 1, x: 20, y: 0 });
  const m2 = muove(g, { id: 2, x: 120, y: 0 });
  // Difetto nella prova originale del brief: `muove` processa UN dito alla
  // volta, quindi un pan a due dita arriva come DUE eventi separati. Da
  // f1=(0,0) f2=(100,0): dopo il primo evento la distanza scende 100→80
  // (fattore 0.8, le dita sono davvero più vicine A META' GESTO), dopo il
  // secondo risale 80→100 (fattore 1.25). Pretendere che m2.fattore da solo
  // sia ~1 è falso per costruzione: chiede al modulo di mentire su uno stato
  // intermedio reale. La proprietà vera è che un pan COMPLETO non cambia la
  // scala: il PRODOTTO dei due fattori torna a 1 (0.8 × 1.25 = 1 esatto).
  assert.ok(Math.abs(m1.fattore * m2.fattore - 1) < 0.01, 'un pan completo non deve cambiare la scala');
  assert.ok(m1.dx + m2.dx > 0, 'lo spostamento va nella direzione delle dita');
});

test('alzare un dito non fa saltare la vista', () => {
  // Il difetto classico: si alza un dito, il centro fra i due salta, e
  // l'immagine schizza via. Dopo `su` il gesto riparte dal dito rimasto.
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  muove(g, { id: 2, x: 200, y: 0 });
  su(g, 2);
  assert.equal(muove(g, { id: 1, x: 10, y: 0 }), null, 'rimasto un dito solo: si torna a lavorare');
});

test('l’ingrandimento non esce dai limiti', () => {
  assert.deepEqual(
    applica({ x: 0, y: 0, z: 1 }, { dx: 0, dy: 0, fattore: 100 }, { min: 0.5, max: 8 }),
    { x: 0, y: 0, z: 8 },
  );
  assert.equal(applica({ x: 0, y: 0, z: 1 }, { dx: 0, dy: 0, fattore: 0.001 }, { min: 0.5, max: 8 }).z, 0.5);
});
