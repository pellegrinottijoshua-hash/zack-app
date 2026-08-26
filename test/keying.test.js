import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alphaFromCreamVoid,
  interlaceRgba,
  PANNA,
  DENTRO,
} from '../src/engine/keying.js';

const W = 32;
const H = 32;

/** Un fotogramma tutto panna: vuoto di scena, nessun personaggio. */
function fondo() {
  const rgb = new Uint8ClampedArray(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    rgb[i * 3] = PANNA[0];
    rgb[i * 3 + 1] = PANNA[1];
    rgb[i * 3 + 2] = PANNA[2];
  }
  return rgb;
}

function rettangolo(rgb, x0, y0, x1, y1, [r, g, b]) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * W + x) * 3;
      rgb[i] = r; rgb[i + 1] = g; rgb[i + 2] = b;
    }
  }
}

const NERO = [0x11, 0x11, 0x11];
const at = (a, x, y) => a[y * W + x];

test('il vuoto panna che tocca il bordo diventa trasparente', () => {
  const rgb = fondo();
  rettangolo(rgb, 10, 10, 21, 21, NERO);
  const { alpha } = alphaFromCreamVoid(rgb, W, H);

  assert.equal(at(alpha, 1, 1), 0, 'l\'angolo del fotogramma è fondo');
  assert.equal(at(alpha, 15, 15), 255, 'il personaggio resta pieno');
});

test('il becco panna dentro il personaggio NON diventa trasparente', () => {
  // È il test per cui esiste tutto il file. Mezzo cast è panna: il piccione,
  // il petto del gabbiano, la falena, il becco di Zack. Un key sul colore li
  // trapana, e il difetto si vede solo quando la clip finisce sopra una foto.
  const rgb = fondo();
  rettangolo(rgb, 8, 8, 23, 23, NERO);
  rettangolo(rgb, 13, 13, 18, 18, PANNA); // il becco

  const { alpha, isole } = alphaFromCreamVoid(rgb, W, H);

  assert.equal(at(alpha, 15, 15), 255, 'il becco panna resta opaco');
  assert.equal(at(alpha, 1, 1), 0, 'il fondo panna resta trasparente');
  assert.equal(isole, 1, 'una sola isola salvata: il becco');
});

test('un personaggio interamente panna sopravvive al key', () => {
  // Il piccione è panna dalla testa ai piedi. Se questo test cade, la clip
  // A-SWAP esce vuota e nessun test di colore se ne accorgerebbe.
  const rgb = fondo();
  rettangolo(rgb, 10, 10, 21, 21, NERO);
  rettangolo(rgb, 12, 12, 19, 19, PANNA);

  const { alpha } = alphaFromCreamVoid(rgb, W, H);
  assert.equal(at(alpha, 15, 15), 255);
});

test('il bordo del personaggio si sfuma invece di scalinare', () => {
  // Senza banda morbida ogni contorno diventa una scalinata visibile: è lo
  // stesso motivo per cui il pennello ha un bordo sfumato.
  const rgb = fondo();
  rettangolo(rgb, 10, 10, 21, 21, NERO);
  // un pixel a metà strada fra panna e nero, dove sta l'antialiasing vero
  const mezzo = [(0xf5 + 0x11) >> 1, (0xf0 + 0x11) >> 1, (0xe8 + 0x11) >> 1];
  rettangolo(rgb, 9, 15, 9, 15, mezzo);

  const { alpha } = alphaFromCreamVoid(rgb, W, H, { dentro: 10, fuori: 200 });
  const v = at(alpha, 9, 15);
  assert.ok(v > 0 && v < 255, `il bordo deve essere parziale, era ${v}`);
});

test('una banda morbida al contrario si rifiuta di partire', () => {
  assert.throws(
    () => alphaFromCreamVoid(fondo(), W, H, { dentro: 50, fuori: 10 }),
    /banda morbida/,
  );
});

test('un fotogramma che non coincide con le dimensioni si rifiuta di partire', () => {
  assert.throws(() => alphaFromCreamVoid(new Uint8ClampedArray(9), W, H), /non leggibile/);
});

test('interlacciare RGBA tiene colore e alfa allineati', () => {
  // `sharp.joinChannel` restituisce tre canali in silenzio e la maschera
  // sparisce: è una trappola già pagata, e questo test è il suo promemoria.
  const rgb = new Uint8ClampedArray([1, 2, 3, 4, 5, 6]);
  const alpha = new Uint8ClampedArray([7, 8]);
  const out = interlaceRgba(rgb, alpha, 2, 1);

  assert.deepEqual(Array.from(out), [1, 2, 3, 7, 4, 5, 6, 8]);
});

test('la soglia interna è dichiarata e non zero', () => {
  // A zero, solo il panna esattamente identico sarebbe fondo: la compressione
  // video sposta ogni pixel di qualche livello e il key non toglierebbe nulla.
  assert.ok(DENTRO > 0);
});
