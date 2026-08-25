import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stamp,
  stroke,
  maskFromRgba,
  applyMask,
  changedPixels,
  ERASE,
  RESTORE,
} from '../src/engine/brush.js';

const W = 40;
const H = 40;
const pieno = () => new Uint8ClampedArray(W * H).fill(255);
const vuoto = () => new Uint8ClampedArray(W * H).fill(0);
const at = (m, x, y) => m[y * W + x];

test('il timbro cancella al centro e lascia intatto il lontano', () => {
  const m = pieno();
  stamp(m, W, H, 20, 20, 6, ERASE, 1);
  assert.equal(at(m, 20, 20), 0, 'il centro deve essere cancellato');
  assert.equal(at(m, 2, 2), 255, 'lontano dal timbro non si tocca nulla');
});

test('il timbro recupera ciò che era stato tolto', () => {
  const m = vuoto();
  stamp(m, W, H, 10, 10, 5, RESTORE, 1);
  assert.equal(at(m, 10, 10), 255);
});

test('il bordo è sfumato, non netto', () => {
  // Un bordo netto sull alfa lascia una scalinata visibile a ogni passata.
  const m = pieno();
  stamp(m, W, H, 20, 20, 10, ERASE, 0.2);
  const centro = at(m, 20, 20);
  const mezzo = at(m, 27, 20);
  const fuori = at(m, 31, 20);
  assert.equal(centro, 0);
  assert.ok(mezzo > 0 && mezzo < 255, `il bordo deve sfumare, vale ${mezzo}`);
  assert.equal(fuori, 255, 'oltre il raggio non si tocca');
});

test('con durezza massima il bordo è netto', () => {
  const m = pieno();
  stamp(m, W, H, 20, 20, 5, ERASE, 1);
  assert.equal(at(m, 24, 20), 0, 'dentro il raggio, tutto cancellato');
  assert.equal(at(m, 26, 20), 255, 'appena fuori, intatto');
});

test('il timbro non esce mai dai bordi dell immagine', () => {
  // Un indice fuori intervallo corromperebbe l immagine senza sollevare nulla.
  const m = pieno();
  assert.doesNotThrow(() => stamp(m, W, H, 0, 0, 15, ERASE, 1));
  assert.doesNotThrow(() => stamp(m, W, H, W - 1, H - 1, 15, ERASE, 1));
  assert.doesNotThrow(() => stamp(m, W, H, -20, -20, 10, ERASE, 1));
  assert.equal(m.length, W * H, 'la maschera non deve cambiare misura');
});

test('un raggio nullo o negativo non fa nulla', () => {
  const m = pieno();
  const prima = m.slice();
  stamp(m, W, H, 20, 20, 0, ERASE, 1);
  stamp(m, W, H, 20, 20, -3, ERASE, 1);
  assert.equal(changedPixels(prima, m), 0);
});

test('il tratto è continuo anche con il mouse veloce', () => {
  // Senza interpolazione un movimento rapido lascia cerchi staccati, e il
  // pennello sembra rotto anche quando funziona.
  const m = pieno();
  stroke(m, W, H, { x: 5, y: 20 }, { x: 35, y: 20 }, 3, ERASE, 1);
  for (let x = 6; x <= 34; x++) {
    assert.equal(at(m, x, 20), 0, `buco nel tratto a x=${x}`);
  }
});

test('il tratto fra due punti coincidenti si comporta come un timbro', () => {
  const a = pieno();
  const b = pieno();
  stamp(a, W, H, 20, 20, 5, ERASE, 1);
  stroke(b, W, H, { x: 20, y: 20 }, { x: 20, y: 20 }, 5, ERASE, 1);
  assert.equal(changedPixels(a, b), 0);
});

test('il flusso parziale sfuma invece di cancellare del tutto', () => {
  const m = pieno();
  stamp(m, W, H, 20, 20, 5, ERASE, 1, 0.5);
  const v = at(m, 20, 20);
  assert.ok(v > 0 && v < 255, `flusso a metà deve dare un valore intermedio, vale ${v}`);
});

test('passate ripetute con flusso parziale si accumulano', () => {
  const m = pieno();
  for (let i = 0; i < 6; i++) stamp(m, W, H, 20, 20, 5, ERASE, 1, 0.5);
  assert.ok(at(m, 20, 20) < 10, 'insistendo si arriva a cancellare');
});

test('maschera e immagine vanno e tornano senza perdere i colori', () => {
  const px = 3;
  const rgba = new Uint8ClampedArray([10, 20, 30, 200, 40, 50, 60, 100, 70, 80, 90, 0]);
  const mask = maskFromRgba(rgba, px);
  assert.deepEqual([...mask], [200, 100, 0]);

  mask[1] = 255;
  applyMask(rgba, mask, px);
  assert.equal(rgba[7], 255, 'alfa aggiornata');
  assert.equal(rgba[4], 40, 'il rosso non deve cambiare');
  assert.equal(rgba[5], 50);
  assert.equal(rgba[6], 60);
});

test('applyMask rifiuta dimensioni incoerenti invece di corrompere', () => {
  assert.throws(() => applyMask(new Uint8ClampedArray(8), new Uint8ClampedArray(3), 2), /non combacia/);
});

test('changedPixels conta davvero le differenze', () => {
  const a = pieno();
  const b = pieno();
  assert.equal(changedPixels(a, b), 0);
  b[0] = 0;
  b[5] = 1;
  assert.equal(changedPixels(a, b), 2);
});
