import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { rm } from 'node:fs/promises';
import { buildServer } from '../server/index.js';
import { PRESETS } from '../server/jobs/export.js';
import { LIBRARY } from '../server/lib/paths.js';

let app;

before(async () => {
  app = buildServer({ logger: false });
  await app.ready();
});

after(async () => {
  await app.close();
  // Safe only because `npm test` points JAYL_CRAFT_LIBRARY at a throwaway dir.
  // Without that guard this line would delete the user's actual work.
  if (!process.env.JAYL_CRAFT_LIBRARY) {
    throw new Error('Rifiuto di ripulire: JAYL_CRAFT_LIBRARY non è impostata. Usa `npm test`.');
  }
  await rm(LIBRARY, { recursive: true, force: true }).catch(() => {});
});

/** A red disc on white — deterministic, with an obvious subject. */
async function sample(width = 400, height = 300) {
  const r = Math.floor(Math.min(width, height) * 0.3);
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
         <rect width="${width}" height="${height}" fill="#ffffff"/>
         <circle cx="${width / 2}" cy="${height / 2}" r="${r}" fill="#C4A35A"/>
       </svg>`,
    ),
  )
    .png()
    .toBuffer();
}

function multipart(fields, fileBuf, filename = 'sample.png', type = 'image/png') {
  const boundary = '----jaylcraft' + Math.random().toString(16).slice(2);
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`),
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${type}\r\n\r\n`,
    ),
    fileBuf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { body: Buffer.concat(parts), boundary };
}

function send(url, fields, buf, filename, type) {
  const { body, boundary } = multipart(fields, buf, filename, type);
  return app.inject({
    method: 'POST',
    url,
    payload: body,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  });
}

const metaOf = (res) => JSON.parse(decodeURIComponent(res.headers['x-meta']));

test('health advertises every capability the UI renders', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(res.statusCode, 200);
  const b = res.json();
  assert.ok(b.models.some((m) => m.id === 'u2net'));
  assert.ok(b.presets.some((p) => p.id === 'gelato-front'));
  assert.ok(b.tracePresets.some((p) => p.id === 'poster'));
  assert.ok(b.detail.some((d) => d.id === 'balanced'));
  assert.ok(b.backgrounds.includes('transparent'));
});

test('export places artwork on the Gelato canvas keeping alpha', async () => {
  const res = await send('/api/export', { preset: 'gelato-front', save: 'false' }, await sample());
  assert.equal(res.statusCode, 200, res.body?.toString?.().slice(0, 300));

  const meta = metaOf(res);
  const out = await sharp(res.rawPayload).metadata();
  const spec = PRESETS.find((p) => p.id === 'gelato-front');

  assert.equal(out.width, spec.w);
  assert.equal(out.height, spec.h);
  assert.ok(out.hasAlpha, 'export must keep an alpha channel');
  assert.equal(meta.upscaleLimited, true, 'a 400px source must not be blown up to 3661px');
});

test('export onto a solid background produces no transparent pixels', async () => {
  const res = await send(
    '/api/export',
    { preset: 'square', background: 'nero', save: 'false' },
    await sample(),
  );
  assert.equal(res.statusCode, 200);

  const { data, info } = await sharp(res.rawPayload).raw().toBuffer({ resolveWithObject: true });
  const corner = data[3];
  assert.equal(corner, 255, 'a solid background must be fully opaque');
  assert.equal(info.width, 2048);
});

test('export rejects an unknown preset', async () => {
  const res = await send('/api/export', { preset: 'nope', save: 'false' }, await sample());
  assert.equal(res.statusCode, 500);
  assert.match(res.json().error, /Formato sconosciuto/);
});

test('vectorize refuses to save an empty trace', async () => {
  // A pale gold disc on white: "bw" thresholds them together and finds nothing.
  // Returning an empty SVG here would look exactly like success.
  const res = await send('/api/vectorize', { preset: 'bw' }, await sample());
  assert.equal(res.statusCode, 500);
  assert.match(res.json().error, /nessuna forma/);
});

test('vectorize turns pixels into paths and saves to the library', async () => {
  const res = await send('/api/vectorize', { preset: 'poster' }, await sample());
  assert.equal(res.statusCode, 200, res.body?.toString?.().slice(0, 300));

  const svg = res.body.toString();
  const meta = metaOf(res);
  assert.match(svg, /<svg/);
  assert.ok(meta.paths > 0, 'the disc must produce at least one path');
  assert.match(svg, /viewBox=/, 'viewBox must survive svgo, or scaling breaks');
  assert.ok(meta.work?.id, 'the result must land in the library');

  const list = await app.inject({ method: 'GET', url: '/api/library' });
  assert.ok(list.json().items.some((i) => i.id === meta.work.id));
});

test('vectorizing a transparent design keeps its transparency', async () => {
  // A gold disc on a TRANSPARENT canvas — a print design in miniature.
  const src = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
         <circle cx="300" cy="300" r="200" fill="#C4A35A"/>
       </svg>`,
    ),
  )
    .png()
    .toBuffer();
  assert.ok((await sharp(src).metadata()).hasAlpha, 'the fixture must have alpha');

  const res = await send('/api/vectorize', { preset: 'poster', save: 'false' }, src);
  assert.equal(res.statusCode, 200, res.body?.toString?.().slice(0, 300));
  const svg = res.body.toString();

  // The flattening white must be masked out by an alpha-derived clip, not left
  // behind as a white square around the artwork.
  assert.match(svg, /clipPath/, 'a transparent source must produce a clip path');
  assert.match(svg, /clip-path="url\(#/, 'the clip must actually be applied');

  // Render it and check the corners really are transparent.
  const png = await sharp(Buffer.from(svg)).resize(200, 200, { fit: 'inside' }).png().toBuffer();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
  assert.ok(alphaAt(2, 2) < 40, 'the corner outside the disc must stay transparent');
  assert.ok(
    alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2)) > 200,
    'the disc itself must be opaque',
  );
});

test('a saved work can be downloaded and deleted', async () => {
  const saved = await app.inject({
    method: 'POST',
    url: '/api/svg/save',
    payload: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>', name: 'prova' },
  });
  assert.equal(saved.statusCode, 200);
  const { work } = saved.json();

  const file = await app.inject({ method: 'GET', url: `/api/library/${work.id}/file` });
  assert.equal(file.statusCode, 200);
  assert.match(file.headers['content-disposition'], /attachment/);
  assert.match(file.body, /<svg/);

  const del = await app.inject({ method: 'DELETE', url: `/api/library/${work.id}` });
  assert.equal(del.statusCode, 200);

  const gone = await app.inject({ method: 'GET', url: `/api/library/${work.id}/file` });
  assert.equal(gone.statusCode, 500);
});

test('svg clean shrinks without dropping the viewBox', async () => {
  const messy =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<!-- commento --><g><rect x="0" y="0" width="10.00000" height="10.00000" fill="#111111"/></g></svg>';
  const res = await app.inject({ method: 'POST', url: '/api/svg/clean', payload: { svg: messy } });
  assert.equal(res.statusCode, 200);
  const { svg, meta } = res.json();
  assert.ok(meta.after < meta.before);
  assert.match(svg, /viewBox/);
});

test('remove-bg keeps full resolution on a large file via the mask path', { timeout: 900000 }, async () => {
  // Larger than the "balanced" 1536px threshold, so it must take the mask route.
  const big = await sample(3000, 2000);
  const res = await send('/api/remove-bg', { model: 'u2net', detail: 'balanced' }, big);
  assert.equal(res.statusCode, 200, res.body?.toString?.().slice(0, 300));

  const meta = metaOf(res);
  assert.equal(meta.strategy, 'mask', 'a 3000px image must not go through the direct path');
  assert.equal(meta.modelSaw.w, 1536, 'the net should see the downscaled copy');

  const img = sharp(res.rawPayload);
  const out = await img.metadata();
  assert.equal(out.width, 3000, 'output must keep the source width');
  assert.equal(out.height, 2000);
  assert.ok(out.hasAlpha);

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
  assert.ok(alphaAt(3, 3) < 40, 'the corner background must be cut away');
  assert.ok(alphaAt(1500, 1000) > 200, 'the subject must survive');
});
