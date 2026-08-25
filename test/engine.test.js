import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, getModel, BLOCKED_MODELS } from '../src/engine/models.js';

test('nessun modello non commerciale può entrare nel registro', () => {
  for (const m of MODELS) {
    assert.equal(m.commercial, true, `${m.id} non è utilizzabile commercialmente`);
    assert.ok(
      /^(MIT|Apache-2\.0)$/.test(m.license),
      `${m.id} ha licenza "${m.license}", non consentita`,
    );
  }
});

test('i modelli vietati sono nominati esplicitamente e assenti', () => {
  // bria-rmbg è il DEFAULT della CLI di rembg: va escluso di proposito, non per
  // dimenticanza. u2net_portrait viene da un repo Apache-2.0 ma è addestrato su
  // APDrawing, che è non commerciale.
  assert.ok(BLOCKED_MODELS.includes('bria-rmbg'));
  assert.ok(BLOCKED_MODELS.includes('u2net_portrait'));
  for (const bad of BLOCKED_MODELS) {
    assert.equal(
      MODELS.find((m) => m.id === bad),
      undefined,
      `${bad} è nel registro`,
    );
  }
});

test('isnet non usa la normalizzazione ImageNet', () => {
  // Sbagliarla produce una maschera completamente errata SENZA errori a
  // runtime: è già successo durante la sonda del 2026-08-25.
  const isnet = getModel('isnet-general-use');
  assert.deepEqual(isnet.norm.mean, [0.5, 0.5, 0.5]);
  assert.deepEqual(isnet.norm.std, [1, 1, 1]);
  assert.equal(isnet.size, 1024);

  const u2net = getModel('u2net');
  assert.deepEqual(u2net.norm.mean, [0.485, 0.456, 0.406]);
  assert.equal(u2net.size, 320);
});

test('ogni livello ha un modello', () => {
  assert.ok(MODELS.some((m) => m.tier === 'accelerato'));
  assert.ok(MODELS.some((m) => m.tier === 'compatibilita'));
});

test('getModel rifiuta un id sconosciuto', () => {
  assert.throws(() => getModel('inesistente'), /sconosciuto/);
});

// ─── compositing (Task 2) ───────────────────────────────────────────────────
import { normalizeMask, maskToU8, applyMaskToRgba } from '../src/engine/compose.js';

test('normalizeMask riscala su 0..1 usando min e max effettivi', () => {
  const out = normalizeMask(Float32Array.from([-2, 0, 2]));
  assert.equal(out[0], 0);
  assert.equal(out[1], 0.5);
  assert.equal(out[2], 1);
});

test('normalizeMask non divide per zero su una maschera piatta', () => {
  const out = normalizeMask(Float32Array.from([3, 3, 3]));
  assert.ok(Number.isFinite(out[0]), 'una maschera piatta non deve produrre NaN');
});

test('maskToU8 porta la maschera su 0..255', () => {
  const out = maskToU8(Float32Array.from([0, 0.5, 1]));
  assert.equal(out[0], 0);
  assert.equal(out[1], 128);
  assert.equal(out[2], 255);
});

test('applyMaskToRgba scrive nel canale alfa e non tocca RGB', () => {
  const rgba = Uint8ClampedArray.from([255, 255, 255, 255, 0, 0, 0, 255]);
  const mask = Uint8ClampedArray.from([0, 200]);
  const out = applyMaskToRgba(rgba, mask, 2);

  assert.equal(out[3], 0, 'il primo pixel deve diventare trasparente');
  assert.equal(out[7], 200, 'il secondo pixel prende il valore della maschera');
  assert.equal(out[0], 255, 'il rosso del primo pixel non deve cambiare');
  assert.equal(out[4], 0, 'il rosso del secondo pixel non deve cambiare');
});

test('applyMaskToRgba rifiuta lunghezze incoerenti invece di corrompere', () => {
  const rgba = new Uint8ClampedArray(8);
  assert.throws(() => applyMaskToRgba(rgba, new Uint8ClampedArray(5), 2), /non combacia/);
});
