import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, getPreset, computePlacement, BACKGROUNDS } from '../src/engine/export.js';

test('i formati coprono stampa, social e web', () => {
  const groups = new Set(PRESETS.map((p) => p.group));
  assert.ok(groups.has('stampa'));
  assert.ok(groups.has('social'));
  assert.ok(groups.has('web'));
  assert.ok(PRESETS.some((p) => p.id === 'gelato-front' && p.w === 3661 && p.h === 4843));
});

test('getPreset rifiuta un formato sconosciuto', () => {
  assert.throws(() => getPreset('inventato'), /sconosciuto/);
});

test('la grafica viene centrata dentro l area di sicurezza', () => {
  const p = getPreset('square'); // 2048×2048, area 0.85
  const r = computePlacement(1000, 1000, p);

  assert.equal(r.canvas.w, 2048);
  // Sta dentro la scatola sicura, non sulla tela intera.
  assert.ok(r.draw.w <= Math.round(2048 * p.safeArea));
  // Centrata: i margini a sinistra e a destra coincidono.
  assert.equal(r.x, Math.round((2048 - r.draw.w) / 2));
  assert.equal(r.y, Math.round((2048 - r.draw.h) / 2));
});

test('un raster piccolo NON viene mai ingrandito', () => {
  // Su tessuto un ingrandimento si vede sgranato: meglio centrare e dirlo.
  const r = computePlacement(500, 400, getPreset('gelato-front'));
  assert.equal(r.draw.w, 500);
  assert.equal(r.draw.h, 400);
  assert.equal(r.upscaleLimited, true);
});

test('un vettore invece può essere ingrandito', () => {
  const r = computePlacement(500, 400, getPreset('gelato-front'), { isVector: true });
  assert.ok(r.draw.w > 500, 'un vettore deve poter riempire la tela');
  assert.equal(r.upscaleLimited, false);
});

test('le proporzioni della sorgente non cambiano mai', () => {
  const src = { w: 1600, h: 900 };
  for (const preset of PRESETS) {
    const r = computePlacement(src.w, src.h, preset, { isVector: true });
    const a = src.w / src.h;
    const b = r.draw.w / r.draw.h;
    assert.ok(Math.abs(a - b) < 0.01, `${preset.id} deforma l'immagine (${a} contro ${b})`);
  }
});

test('la grafica non esce mai dalla tela', () => {
  for (const preset of PRESETS) {
    for (const src of [
      [4000, 100],
      [100, 4000],
      [3661, 4843],
      [1, 1],
    ]) {
      const r = computePlacement(src[0], src[1], preset, { isVector: true });
      assert.ok(r.x >= 0 && r.y >= 0, `${preset.id} posiziona fuori dalla tela`);
      assert.ok(r.x + r.draw.w <= preset.w, `${preset.id} sborda in larghezza`);
      assert.ok(r.y + r.draw.h <= preset.h, `${preset.id} sborda in altezza`);
    }
  }
});

test('gli sfondi disponibili sono quelli della palette JAYL', () => {
  assert.equal(BACKGROUNDS.transparent, null);
  assert.equal(BACKGROUNDS.nero, '#111111');
  assert.equal(BACKGROUNDS.panna, '#F5F0E8');
  // Nessun colore fuori palette: il brand lo vieta esplicitamente.
  for (const [name, hex] of Object.entries(BACKGROUNDS)) {
    if (hex === null) continue;
    assert.ok(
      ['#111111', '#F5F0E8', '#FFFFFF'].includes(hex),
      `${name} (${hex}) è fuori dalla palette JAYL`,
    );
  }
});
