import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANVAS,
  GARMENT_SHAPES,
  getShape,
  placeOnGarment,
  outlineFor,
} from '../src/engine/mockup.js';

test('ogni sagoma è completa e traducibile', () => {
  for (const s of GARMENT_SHAPES) {
    assert.ok(s.id && s.labelKey, `${s.id} incompleta`);
    assert.ok(s.path.startsWith('M ') && s.path.trim().endsWith('Z'), `${s.id} non è chiusa`);
    for (const d of s.details || []) assert.ok(d.d.startsWith('M '), `${s.id}: dettaglio malformato`);
  }
  assert.throws(() => getShape('canotta'), /sconosciuta/);
});

test("l'area di stampa sta dentro il capo e ha proporzioni credibili", () => {
  for (const s of GARMENT_SHAPES) {
    const a = s.area;
    assert.ok(a.x > 0 && a.y > 0, `${s.id}: l'area parte dal bordo`);
    assert.ok(a.x + a.w <= 1, `${s.id}: l'area esce di lato`);
    assert.ok(a.y + a.h <= 1, `${s.id}: l'area esce in basso`);
    // Un'area di stampa reale è alta piu' che larga, o quadrata: mai un
    // nastro orizzontale.
    const ratio = (a.w * CANVAS.w) / (a.h * CANVAS.h);
    assert.ok(ratio > 0.5 && ratio < 1.3, `${s.id}: area con rapporto ${ratio.toFixed(2)}`);
  }
});

test('la grafica non supera mai l area di stampa', () => {
  // Un mockup che mostra la grafica piu' grande di quanto la stampa consenta
  // è peggio di nessun mockup: promette una cosa che non arriverà.
  for (const s of GARMENT_SHAPES) {
    for (const [w, h] of [[4000, 400], [400, 4000], [1, 1], [3661, 4843]]) {
      const p = placeOnGarment(w, h, s);
      assert.ok(p.w <= Math.ceil(p.area.w) && p.h <= Math.ceil(p.area.h), `${s.id} sfora con ${w}×${h}`);
      assert.ok(p.x >= Math.floor(p.area.x), `${s.id} esce a sinistra`);
      assert.ok(p.x + p.w <= Math.ceil(p.area.x + p.area.w), `${s.id} esce a destra`);
    }
  }
});

test('le proporzioni della grafica non si deformano', () => {
  const p = placeOnGarment(2000, 1000, getShape('tee-front'));
  assert.ok(Math.abs(p.w / p.h - 2) < 0.02, `rapporto ${p.w / p.h}`);
});

test('la grafica resta centrata orizzontalmente', () => {
  const shape = getShape('tee-front');
  const p = placeOnGarment(600, 1800, shape);
  const centroArea = p.area.x + p.area.w / 2;
  assert.ok(Math.abs(p.x + p.w / 2 - centroArea) <= 1, 'una stampa storta si nota subito');
});

test('la sagoma si riscala senza cambiare proporzioni', () => {
  const shape = getShape('tote');
  const piccolo = placeOnGarment(1000, 1000, shape, { w: 600, h: 750 });
  const grande = placeOnGarment(1000, 1000, shape, { w: 2400, h: 3000 });
  assert.ok(Math.abs(grande.w / piccolo.w - 4) < 0.02);
  assert.ok(Math.abs(grande.x / piccolo.x - 4) < 0.02);
});

test('si sa quanto dell area viene riempita', () => {
  // Sotto un terzo, sulla maglietta vera sembrerà un francobollo.
  const shape = getShape('tee-front');
  // Un quadrato non riempie il 100% di un'area piu' alta che larga: il
  // massimo possibile e' il rapporto dell'area stessa, ed e' giusto cosi'.
  assert.ok(placeOnGarment(1000, 1000, shape).fill > 0.6);
  assert.ok(placeOnGarment(4000, 400, shape).fill < 0.3);
});

test('una grafica senza dimensioni è un errore', () => {
  assert.throws(() => placeOnGarment(0, 100, getShape('tee-front')), /senza dimensioni/);
});

test('il bordo della sagoma cambia col colore del capo', () => {
  // Un contorno scuro su capo nero non esiste: la sagoma sparirebbe.
  assert.notEqual(outlineFor('nero'), outlineFor('bianco'));
  assert.ok(outlineFor('nero').includes('245'), 'su nero serve un bordo chiaro');
  assert.ok(outlineFor('panna').includes('17'), 'su panna serve un bordo scuro');
});
