import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pennella, ritaglioIstantaneo, UNIFORMITA_MIN, MAX_FILE } from '../src/landing/ritaglio.js';

/*
 * Lo strumento gratuito della home.
 *
 * Qui sta solo la parte che non ha bisogno di un browser — pennello e
 * decisione «istantaneo o modello?» — perché è quella che può rovinare il
 * lavoro di qualcuno senza sollevare un errore.
 */

/** Uno sticker: soggetto, disco colorato, fondo piatto. */
function sticker(w = 48, h = 48) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - w / 2, y - h / 2);
      const c = d < w * 0.15 ? [240, 150, 180] : d < w * 0.4 ? [80, 200, 140] : [255, 255, 255];
      const i = (y * w + x) * 4;
      [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]] = [...c, 255];
    }
  }
  return { rgba, w, h };
}

/** Rumore: nessun fondo piatto da nessuna parte. */
function fotografia(w = 48, h = 48) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = (i * 7) % 256;
    rgba[i * 4 + 1] = (i * 13) % 256;
    rgba[i * 4 + 2] = (i * 29) % 256;
    rgba[i * 4 + 3] = 255;
  }
  return { rgba, w, h };
}

test('uno sticker si ritaglia all’istante, senza modello', () => {
  const r = ritaglioIstantaneo(sticker());
  assert.ok(r, 'un fondo piatto deve dare un risultato immediato');
  assert.ok(r.uniformita >= UNIFORMITA_MIN);
});

test('una foto non dà un risultato scadente: non ne dà nessuno', () => {
  // La regola che protegge la fiducia: uno strumento che consegna comunque
  // qualcosa quando SA di sbagliare insegna a non credere al prossimo
  // risultato. Qui `null` significa «tocca al modello», non «errore».
  assert.equal(ritaglioIstantaneo(fotografia()), null);
});

test('la home accetta tre file, e tre è scritto in un posto solo', () => {
  assert.equal(MAX_FILE, 3);
});

test('il pennello rimette al centro e non tocca lontano', () => {
  const w = 20;
  const h = 20;
  const alpha = new Uint8ClampedArray(w * h); // tutto trasparente
  pennella(alpha, w, h, { x: 10, y: 10, raggio: 4, valore: 255 });
  assert.equal(alpha[10 * w + 10], 255, 'il centro del tratto è pieno');
  assert.equal(alpha[0], 0, 'un angolo lontano non si tocca');
});

test('il pennello toglie con lo stesso codice con cui rimette', () => {
  // Due funzioni separate per «togli» e «rimetti» divergono: la seconda volta
  // che si corregge una, l'altra resta indietro e i due bordi non combaciano.
  const w = 20;
  const h = 20;
  const alpha = new Uint8ClampedArray(w * h).fill(255);
  pennella(alpha, w, h, { x: 10, y: 10, raggio: 4, valore: 0 });
  assert.equal(alpha[10 * w + 10], 0);
  assert.equal(alpha[0], 255);
});

test('il bordo del tratto è sfumato, non a gradino', () => {
  // Un pennello a gradino lascia una scalinata che si vede più dell'errore
  // che stava correggendo.
  const w = 40;
  const h = 40;
  const alpha = new Uint8ClampedArray(w * h);
  pennella(alpha, w, h, { x: 20, y: 20, raggio: 10, valore: 255 });
  const bordo = alpha[20 * w + 29]; // quasi sul raggio
  assert.ok(bordo > 0 && bordo < 255, `il bordo dovrebbe essere parziale, è ${bordo}`);
});

test('il pennello sul bordo dell’immagine non esce dai byte', () => {
  const w = 16;
  const h = 16;
  const alpha = new Uint8ClampedArray(w * h);
  assert.doesNotThrow(() => pennella(alpha, w, h, { x: 0, y: 0, raggio: 9, valore: 255 }));
  assert.doesNotThrow(() => pennella(alpha, w, h, { x: 15, y: 15, raggio: 9, valore: 255 }));
  assert.equal(alpha.length, w * h, 'la maschera non cambia misura');
});
