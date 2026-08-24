import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { buildServer } from '../server/index.js';
import { PRESETS } from '../server/jobs/export.js';

let app;

before(async () => {
  app = buildServer({ logger: false });
  await app.ready();
});

after(async () => {
  await app.close();
});

/** A red disc on white — small, deterministic, and has an obvious subject. */
async function sampleImage() {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
       <rect width="400" height="300" fill="#ffffff"/>
       <circle cx="200" cy="150" r="90" fill="#c4553d"/>
     </svg>`,
  );
  return sharp(svg).png().toBuffer();
}

function multipart(fields, fileBuf, filename = 'sample.png') {
  const boundary = '----studiolab' + Math.random().toString(16).slice(2);
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`,
      ),
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: image/png\r\n\r\n`,
    ),
    fileBuf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { body: Buffer.concat(parts), boundary };
}

test('health reports models and presets', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.models.includes('u2net'), 'u2net must be offered');
  assert.ok(body.presets.some((p) => p.id === 'gelato-front'));
});

test('export places artwork on the Gelato canvas with alpha', async () => {
  const img = await sampleImage();
  const { body, boundary } = multipart({ preset: 'gelato-front' }, img);

  const res = await app.inject({
    method: 'POST',
    url: '/api/export',
    payload: body,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  });

  assert.equal(res.statusCode, 200, res.body?.toString?.().slice(0, 300));

  const meta = JSON.parse(res.headers['x-export-meta']);
  const out = await sharp(res.rawPayload).metadata();

  assert.equal(out.width, PRESETS['gelato-front'].w);
  assert.equal(out.height, PRESETS['gelato-front'].h);
  assert.equal(out.channels, 4, 'export must keep an alpha channel');
  assert.ok(out.hasAlpha);
  // The disc is 180px wide, far below the safe area, so we must not upscale.
  assert.equal(meta.upscaleLimited, true);
  assert.ok(meta.placed.w <= meta.source.w);
});

test('export rejects an unknown preset', async () => {
  const img = await sampleImage();
  const { body, boundary } = multipart({ preset: 'nope' }, img);

  const res = await app.inject({
    method: 'POST',
    url: '/api/export',
    payload: body,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  });

  assert.equal(res.statusCode, 500);
  assert.match(res.json().error, /Unknown preset/);
});

test('remove-bg returns a PNG with a real alpha channel', { timeout: 600000 }, async () => {
  const img = await sampleImage();
  const { body, boundary } = multipart({ model: 'u2net' }, img);

  const res = await app.inject({
    method: 'POST',
    url: '/api/remove-bg',
    payload: body,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  });

  assert.equal(res.statusCode, 200, res.body?.toString?.().slice(0, 300));

  const out = sharp(res.rawPayload);
  const meta = await out.metadata();
  assert.ok(meta.hasAlpha, 'cutout must have alpha');

  // The corners were white background — they must now be transparent.
  const { data, info } = await out.raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
  assert.ok(alphaAt(2, 2) < 40, 'top-left corner should be cut away');
  assert.ok(
    alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2)) > 200,
    'the subject should survive',
  );
});
