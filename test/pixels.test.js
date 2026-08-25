import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzePixels } from '../src/engine/pixels.js';

/** Costruisce un'immagine RGBA con un rettangolo pieno dentro. */
function withRect(w, h, rect, { color = [255, 0, 0], alpha = 255 } = {}) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const i = (y * w + x) * 4;
      d[i] = color[0];
      d[i + 1] = color[1];
      d[i + 2] = color[2];
      d[i + 3] = alpha;
    }
  }
  return d;
}

test('il riquadro del soggetto è quello del soggetto, non della tela', () => {
  const d = withRect(40, 40, { x: 10, y: 4, w: 8, h: 12 });
  const s = analyzePixels(d, 40, 40);
  assert.deepEqual(s.box, { x: 10, y: 4, w: 8, h: 12 });
});

test("un'immagine vuota non inventa un soggetto", () => {
  // Restituire un riquadro finto qui farebbe ritagliare il nulla piu' avanti.
  const s = analyzePixels(new Uint8ClampedArray(16 * 16 * 4), 16, 16);
  assert.equal(s.box, null);
  assert.equal(s.centroid, null);
  assert.equal(s.color, null);
  assert.equal(s.coverage, 0);
});

test('byte e dimensioni che non coincidono sono un errore, non un risultato', () => {
  assert.throws(() => analyzePixels(new Uint8ClampedArray(10), 40, 40), /non leggibili/);
});

test('il baricentro è pesato sull opacità, non sul riquadro', () => {
  // Corpo pieno a sinistra, alone quasi invisibile a destra: il centro deve
  // restare sul corpo, o il ritaglio insegue l'alone.
  const w = 100;
  const h = 20;
  const d = withRect(w, h, { x: 0, y: 0, w: 20, h: 20 });
  for (let y = 0; y < 20; y++) {
    for (let x = 80; x < 100; x++) d[(y * w + x) * 4 + 3] = 12;
  }
  const s = analyzePixels(d, w, h);
  assert.ok(s.box.w === 100, 'il riquadro comprende tutto');
  assert.ok(s.centroid.x < 30, `baricentro a ${s.centroid.x}: l'alone l'ha spostato`);
});

test('i pixel mezzo trasparenti si contano a parte', () => {
  // Sono quelli che in stampa diretta diventano alone: vanno misurati, non
  // sommati ai pieni.
  const d = withRect(20, 20, { x: 0, y: 0, w: 10, h: 20 }, { alpha: 255 });
  const d2 = withRect(20, 20, { x: 10, y: 0, w: 10, h: 20 }, { alpha: 128 });
  for (let i = 0; i < d.length; i++) d[i] ||= d2[i];
  const s = analyzePixels(d, 20, 20);
  assert.equal(s.opaque, 200);
  assert.equal(s.soft, 200);
  assert.ok(Math.abs(s.softRatio - 0.5) < 1e-9);
});

test('il colore medio ignora i pixel trasparenti', () => {
  // Includere i trasparenti tirerebbe ogni colore verso il nero, e il
  // controllo del contrasto direbbe sempre la stessa cosa.
  const d = withRect(20, 20, { x: 0, y: 0, w: 4, h: 4 }, { color: [200, 100, 50] });
  const s = analyzePixels(d, 20, 20);
  assert.deepEqual(s.color, [200, 100, 50]);
});

test('un soggetto che tocca il bordo viene segnalato lato per lato', () => {
  const s = analyzePixels(withRect(30, 30, { x: 0, y: 5, w: 10, h: 10 }), 30, 30);
  assert.equal(s.touches.left, true);
  assert.equal(s.touches.right, false);
  assert.equal(s.touches.top, false);
});

test("un'immagine senza un solo pixel trasparente lo dichiara", () => {
  const s = analyzePixels(withRect(8, 8, { x: 0, y: 0, w: 8, h: 8 }), 8, 8);
  assert.equal(s.hasTransparency, false);
  assert.equal(s.coverage, 1);
});
