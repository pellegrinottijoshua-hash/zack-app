import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
// archiver 8 is ESM with named classes; the old `archiver('zip')` factory is gone.
import { ZipArchive } from 'archiver';
import path from 'node:path';
import { removeBackground, MODELS, DETAIL } from './jobs/removeBg.js';
import { exportPreset, PRESETS, BACKGROUNDS } from './jobs/export.js';
import { traceToSvg, cleanSvg, TRACE_PRESETS } from './jobs/vectorize.js';
import { saveWork, listWorks, readWork, deleteWork } from './lib/library.js';
import { ensureDirs, LIBRARY } from './lib/paths.js';

// Deliberately NOT `PORT`: `npm run dev` starts two processes, and any ambient
// PORT (a preview harness, a shell export) would collide with Vite.
const PORT = Number(process.env.API_PORT || 5174);

/** Read one uploaded file plus the text fields that came with it. */
async function readUpload(req) {
  const part = await req.file();
  if (!part) throw new Error('Nessun file caricato.');
  const fields = {};
  for (const [k, v] of Object.entries(part.fields || {})) {
    if (v && typeof v.value === 'string') fields[k] = v.value;
  }
  return { buffer: await part.toBuffer(), filename: part.filename || 'senza-nome', fields };
}

function stem(filename) {
  return path.basename(filename).replace(/\.[^.]+$/, '');
}

export function buildServer({ logger = true } = {}) {
  const app = Fastify({ logger, bodyLimit: 512 * 1024 * 1024 });

  app.register(cors, { origin: true, exposedHeaders: ['X-Meta'] });
  app.register(multipart, {
    // Print files are big; a 3661×4843 PNG routinely passes 20MB, and users
    // drop camera-resolution originals in here.
    limits: { fileSize: 400 * 1024 * 1024, files: 1 },
  });

  app.addHook('onReady', ensureDirs);

  const withMeta = (reply, meta) =>
    reply.header('X-Meta', encodeURIComponent(JSON.stringify(meta)));

  // ── capabilities ───────────────────────────────────────────────────────
  app.get('/api/health', async () => ({
    ok: true,
    models: MODELS,
    detail: Object.entries(DETAIL).map(([id, px]) => ({ id, px })),
    presets: PRESETS,
    backgrounds: Object.keys(BACKGROUNDS),
    tracePresets: TRACE_PRESETS.map(({ id, label, note }) => ({ id, label, note })),
    libraryPath: LIBRARY,
  }));

  // ── background removal ─────────────────────────────────────────────────
  app.post('/api/remove-bg', async (req, reply) => {
    const { buffer, filename, fields } = await readUpload(req);
    const { buffer: out, meta } = await removeBackground(buffer, {
      model: fields.model,
      detail: fields.detail,
      decontaminate: fields.decontaminate !== 'false',
    });

    if (fields.save !== 'false') {
      meta.work = await saveWork(out, {
        name: `${stem(filename)}-scontornato`,
        kind: 'png',
        meta: { op: 'remove-bg', model: meta.model, strategy: meta.strategy },
      });
    }
    return withMeta(reply, meta).type('image/png').send(out);
  });

  // ── raster → vector ────────────────────────────────────────────────────
  app.post('/api/vectorize', async (req, reply) => {
    const { buffer, filename, fields } = await readUpload(req);
    const { svg, meta } = await traceToSvg(buffer, {
      preset: fields.preset,
      clean: fields.clean !== 'false',
    });

    if (fields.save !== 'false') {
      meta.work = await saveWork(svg, {
        name: `${stem(filename)}-vettoriale`,
        kind: 'svg',
        meta: { op: 'vectorize', preset: meta.preset, paths: meta.paths },
      });
    }
    return withMeta(reply, meta).type('image/svg+xml').send(svg);
  });

  // ── svg cleanup + save from the editor ─────────────────────────────────
  app.post('/api/svg/clean', async (req, reply) => {
    const { svg } = req.body || {};
    if (typeof svg !== 'string' || !svg.trim()) {
      return reply.code(400).send({ error: 'Serve un campo "svg" con il contenuto.' });
    }
    const { svg: out, meta } = cleanSvg(svg);
    return { svg: out, meta };
  });

  app.post('/api/svg/save', async (req, reply) => {
    const { svg, name } = req.body || {};
    if (typeof svg !== 'string' || !svg.trim()) {
      return reply.code(400).send({ error: 'Serve un campo "svg" con il contenuto.' });
    }
    const work = await saveWork(svg, {
      name: name || 'disegno',
      kind: 'svg',
      meta: { op: 'editor' },
    });
    return { work };
  });

  // ── export ─────────────────────────────────────────────────────────────
  app.post('/api/export', async (req, reply) => {
    const { buffer, filename, fields } = await readUpload(req);
    const isVector =
      fields.isVector === 'true' || /\.svg$/i.test(filename) || buffer.slice(0, 400).includes('<svg');

    const { buffer: out, meta } = await exportPreset(buffer, {
      preset: fields.preset,
      background: fields.background,
      isVector,
    });

    if (fields.save !== 'false') {
      meta.work = await saveWork(out, {
        name: `${stem(filename)}-${meta.preset}`,
        kind: 'png',
        meta: { op: 'export', preset: meta.preset, background: meta.background },
      });
    }
    return withMeta(reply, meta).type('image/png').send(out);
  });

  // ── library ────────────────────────────────────────────────────────────
  app.get('/api/library', async () => ({ items: await listWorks(), path: LIBRARY }));

  app.get('/api/library/:id/file', async (req, reply) => {
    const { item, buffer } = await readWork(req.params.id);
    return reply
      .type(item.kind === 'svg' ? 'image/svg+xml' : 'image/png')
      .header('Content-Disposition', `attachment; filename="${item.file}"`)
      .send(buffer);
  });

  app.delete('/api/library/:id', async (req) => deleteWork(req.params.id));

  /** Everything in one zip — the "give me all my work" button. */
  app.get('/api/library/bundle', async (req, reply) => {
    const items = await listWorks();
    if (!items.length) return reply.code(404).send({ error: 'La libreria è vuota.' });

    const zip = new ZipArchive({ zlib: { level: 9 } });
    reply
      .type('application/zip')
      .header('Content-Disposition', `attachment; filename="jayl-craft-${Date.now()}.zip"`);

    for (const item of items) {
      zip.file(path.join(LIBRARY, item.file), { name: item.file });
    }
    zip.finalize();
    return reply.send(zip);
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error(err);
    const code = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    reply.code(code).send({ error: err.message });
  });

  return app;
}

if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const app = buildServer();
  app.listen({ port: PORT, host: '127.0.0.1' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
