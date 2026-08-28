import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ritaglioIstantaneo, UNIFORMITA_MIN, MAX_FILE } from '../src/landing/ritaglio.js';
import { pennellaGuidato } from '../src/engine/righello.js';

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

/*
 * Il pennello della home è quello del motore.
 *
 * Fino al 2026-08-28 ce n'erano DUE: `stamp` in engine/brush.js e una
 * `pennella` scritta per la home. Due pennelli divergono al primo ritocco di
 * uno solo, e i bordi smettono di combaciare fra studio e home. Adesso la
 * home passa da `pennellaGuidato`, che dentro usa `stamp`.
 */
const tela = (w, h) => ({ alpha: new Uint8ClampedArray(w * h), w, h });

test('senza guida il pennello dipinge dove sta la mano', () => {
  const { alpha, w, h } = tela(40, 40);
  pennellaGuidato(alpha, w, h, { x: 20, y: 20, raggio: 6, valore: 255 }, null);
  assert.ok(alpha[20 * w + 20] > 200, 'il centro del tratto e pieno');
  assert.equal(alpha[0], 0, 'un angolo lontano non si tocca');
});

test('il pennello toglie con lo stesso codice con cui rimette', () => {
  // Due funzioni separate per «togli» e «rimetti» divergono: la seconda volta
  // che se ne corregge una, l'altra resta indietro e i due bordi non
  // combaciano.
  const { alpha, w, h } = tela(40, 40);
  alpha.fill(255);
  pennellaGuidato(alpha, w, h, { x: 20, y: 20, raggio: 6, valore: 0 }, null);
  assert.ok(alpha[20 * w + 20] < 40);
  assert.equal(alpha[0], 255);
});

test('il pennello sul bordo dell immagine non esce dai byte', () => {
  const { alpha, w, h } = tela(16, 16);
  assert.doesNotThrow(() => pennellaGuidato(alpha, w, h, { x: 0, y: 0, raggio: 9, valore: 255 }, null));
  assert.doesNotThrow(() => pennellaGuidato(alpha, w, h, { x: 15, y: 15, raggio: 9, valore: 255 }, null));
  assert.equal(alpha.length, w * h, 'la maschera non cambia misura');
});
