import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { removeBackground, MODELS } from './jobs/removeBg.js';
import { exportPreset, PRESETS } from './jobs/export.js';

// Deliberately NOT `PORT`: `npm run dev` starts two processes, and any
// ambient PORT (a preview harness, a shell export) would collide with Vite.
const PORT = Number(process.env.API_PORT || 5174);

export function buildServer({ logger = true } = {}) {
  const app = Fastify({ logger });

  app.register(cors, { origin: true });
  app.register(multipart, {
    // Print files are big; 3661×4843 PNGs routinely pass 20MB.
    limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  });

  app.get('/api/health', async () => ({
    ok: true,
    models: MODELS,
    presets: Object.entries(PRESETS).map(([id, p]) => ({ id, ...p })),
  }));

  app.post('/api/remove-bg', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No file uploaded' });

    const model = file.fields?.model?.value || 'u2net';
    const buf = await file.toBuffer();

    const out = await removeBackground(buf, { model });
    return reply.type('image/png').send(out);
  });

  app.post('/api/export', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No file uploaded' });

    const preset = file.fields?.preset?.value || 'gelato-front';
    const buf = await file.toBuffer();

    const { buffer, meta } = await exportPreset(buf, { preset });
    return reply
      .type('image/png')
      .header('X-Export-Meta', JSON.stringify(meta))
      .header('Access-Control-Expose-Headers', 'X-Export-Meta')
      .send(buffer);
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error(err);
    reply.code(500).send({ error: err.message });
  });

  return app;
}

// Only listen when run directly, so tests can import buildServer freely.
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const app = buildServer();
  app.listen({ port: PORT, host: '127.0.0.1' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
