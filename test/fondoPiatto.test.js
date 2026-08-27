import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coloreDelBordo, alphaDaFondoPiatto } from '../src/engine/keying.js';

/*
 * Il caso vero che ha fatto nascere questa funzione (2026-08-27).
 *
 * Il committente scontorna uno sticker generato con l'AI: una creatura rosa
 * su un **disco verde** su un **quadrato bianco**. Il modello di segmentazione
 * toglie il bianco *e* il disco, perché non sa che il disco è parte del
 * disegno — e `holes.js` non può rimediare: una volta tolti, bianco e disco
 * sono un'unica regione trasparente attaccata al bordo, quindi geometricamente
 * il disco *è* sfondo.
 *
 * La distinzione giusta è quella già scritta in questo file per le clip:
 * **posizione, non colore.** Si toglie il fondo raggiungibile dal bordo. Al
 * disco verde non ci si arriva dal bordo senza attraversare il verde, quindi
 * resta. Nessun modello, nessun download, esatto per costruzione.
 */

/** Un'immagine RGBA: fondo, disco al centro, soggetto dentro il disco. */
function sticker({ w = 64, h = 64, fondo = [255, 255, 255], disco = [80, 200, 140], soggetto = [240, 150, 180] } = {}) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const c = d < w * 0.15 ? soggetto : d < w * 0.4 ? disco : fondo;
      const i = (y * w + x) * 4;
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = 255;
    }
  }
  return { rgba, w, h };
}

test('il colore del fondo si campiona dal bordo', () => {
  const { rgba, w, h } = sticker();
  const { colore } = coloreDelBordo(rgba, w, h);
  assert.deepEqual([...colore], [255, 255, 255]);
});

test('un fondo piatto si dichiara uniforme', () => {
  const { rgba, w, h } = sticker();
  assert.equal(coloreDelBordo(rgba, w, h).uniformita, 1);
});

test('il disco resta, il fondo se ne va', () => {
  // È il test che descrive il difetto per cui la funzione esiste.
  const w = 64;
  const h = 64;
  const { rgba } = sticker({ w, h });
  const { alpha } = alphaDaFondoPiatto(rgba, w, h);

  const at = (x, y) => alpha[y * w + x];
  assert.equal(at(1, 1), 0, "l'angolo è fondo e deve sparire");
  assert.equal(at(32, 32), 255, 'il soggetto al centro deve restare');
  assert.equal(at(32, 12), 255, 'il disco verde è parte del disegno e deve restare');
});

test('un fondo bianco NON mangia il bianco circondato dal soggetto', () => {
  // La lezione del becco panna di Zack, che è il motivo per cui questo file
  // esiste: «togli tutto il bianco» trapanerebbe il disegno. Qui il centro è
  // ESATTAMENTE del colore del fondo, ma per arrivarci dal bordo bisogna
  // attraversare il soggetto — quindi non è fondo, e resta.
  const w = 64;
  const h = 64;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - 32, y - 32);
      // bianco al centro (il becco), anello di soggetto, bianco fuori (il fondo)
      const c = d < 6 ? [255, 255, 255] : d < 22 ? [240, 150, 180] : [255, 255, 255];
      const i = (y * w + x) * 4;
      [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]] = [...c, 255];
    }
  }
  const { alpha, isole } = alphaDaFondoPiatto(rgba, w, h);
  assert.equal(alpha[1 * w + 1], 0, 'il fondo bianco se ne va');
  assert.equal(alpha[32 * w + 32], 255, 'il bianco circondato dal soggetto resta');
  assert.ok(isole > 0, 'se `isole` è 0 il key si è mangiato il disegno');
});

test('una foto non ha un fondo piatto, e lo dice', () => {
  // Dove non c'è una misura non c'è un avviso: questo metodo è esatto solo su
  // un fondo piatto, e su una foto deve poter essere rifiutato PRIMA di
  // produrre un ritaglio sbagliato in silenzio.
  const w = 32;
  const h = 32;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = (i * 7) % 256;
    rgba[i * 4 + 1] = (i * 13) % 256;
    rgba[i * 4 + 2] = (i * 29) % 256;
    rgba[i * 4 + 3] = 255;
  }
  assert.ok(coloreDelBordo(rgba, w, h).uniformita < 0.5);
});

test('byte e dimensioni che non coincidono sollevano invece di mentire', () => {
  assert.throws(() => alphaDaFondoPiatto(new Uint8ClampedArray(10), 64, 64));
});
