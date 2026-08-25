import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { MODELS } from '../src/engine/models.js';
import { MODELS as SERVER_MODELS } from '../server/jobs/removeBg.js';
import { compareAlpha, IOU_MIN, MEAN_DIFF_MAX } from './helpers/compareAlpha.js';

test('i modelli del browser esistono anche lato server', () => {
  // Se divergono, il confronto di parità mette a paragone cose diverse e non
  // protegge da nulla.
  const serverIds = SERVER_MODELS.map((m) => m.id);
  for (const m of MODELS) {
    assert.ok(serverIds.includes(m.id), `${m.id} non esiste lato server`);
  }
});

test('nessun modello vietato è raggiungibile dal server', () => {
  const ids = SERVER_MODELS.map((m) => m.id);
  assert.equal(ids.includes('bria-rmbg'), false, 'bria-rmbg non è vendibile');
  assert.equal(ids.includes('u2net_portrait'), false, 'u2net_portrait non è vendibile');
});

test('due maschere identiche passano con margine pieno', async () => {
  const png = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
  const r = await compareAlpha(png, png);
  assert.equal(r.iou, 1);
  assert.equal(r.meanDiff, 0);
  assert.equal(r.pass, true);
});

test('una maschera invertita viene respinta', async () => {
  const opaque = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
  const clear = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();

  const r = await compareAlpha(opaque, clear);
  assert.equal(r.pass, false, 'una maschera completamente sbagliata deve fallire');
  assert.equal(r.iou, 0);
  assert.ok(r.meanDiff > MEAN_DIFF_MAX);
});

test('una differenza minima resta dentro le soglie', async () => {
  // Il browser e sharp non ridimensionano la maschera con lo stesso filtro:
  // una differenza piccola è attesa e non deve far fallire il confronto.
  const base = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
  const almost = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 254 / 255 } },
  })
    .png()
    .toBuffer();

  const r = await compareAlpha(base, almost);
  assert.ok(r.iou >= IOU_MIN, `IoU ${r.iou} sotto la soglia`);
  assert.ok(r.meanDiff <= MEAN_DIFF_MAX, `differenza media ${r.meanDiff} sopra la soglia`);
  assert.equal(r.pass, true);
});

test('dimensioni diverse sono un errore, non un confronto approssimato', async () => {
  const a = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  const b = await sharp({ create: { width: 9, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  await assert.rejects(() => compareAlpha(a, b), /non confrontabili/);
});
