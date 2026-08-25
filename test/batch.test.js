import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planJobs,
  isEmptyPlan,
  progressOf,
  estimateRemaining,
  averageMs,
  markJob,
  nextJob,
  summarize,
  OPS,
} from '../src/engine/batch.js';

const f = (name) => ({ name });
const files = [f('a.png'), f('b.png'), f('c.png')];

test('senza operazioni scelte non si pianifica nulla', () => {
  assert.equal(isEmptyPlan({}), true);
  assert.equal(isEmptyPlan({ exportPresets: [] }), true);
  assert.equal(isEmptyPlan({ cutout: true }), false);
  assert.equal(isEmptyPlan({ exportPresets: ['square'] }), false);
  assert.deepEqual(planJobs(files, {}), []);
});

test('ogni file riceve tutte le operazioni scelte', () => {
  const jobs = planJobs(files, { cutout: true, exportPresets: ['square', 'story'] });
  assert.equal(jobs.length, 9, '3 file × 3 operazioni');
  assert.equal(jobs.filter((j) => j.op === OPS.cutout).length, 3);
  assert.equal(jobs.filter((j) => j.op === OPS.export).length, 6);
});

test('si finisce un file prima di passare al successivo', () => {
  // Così chi guarda vede risultati completi e può fermarsi a metà
  // portandosi a casa qualcosa di finito.
  const jobs = planJobs(files, { cutout: true, exportPresets: ['square'] });
  assert.equal(jobs[0].file.name, 'a.png');
  assert.equal(jobs[1].file.name, 'a.png');
  assert.equal(jobs[2].file.name, 'b.png');
});

test('ogni lavoro nasce in attesa e con un id proprio', () => {
  const jobs = planJobs(files, { cutout: true });
  assert.ok(jobs.every((j) => j.state === 'attesa'));
  assert.equal(new Set(jobs.map((j) => j.id)).size, jobs.length, 'id duplicati');
});

test('il preset viaggia col lavoro di export', () => {
  const jobs = planJobs([f('x.png')], { exportPresets: ['gelato-front'] });
  assert.equal(jobs[0].preset, 'gelato-front');
});

test('il progresso conta fatti, falliti e mancanti', () => {
  let jobs = planJobs(files, { cutout: true });
  assert.deepEqual(progressOf(jobs), { done: 0, failed: 0, total: 3, remaining: 3, ratio: 0 });

  jobs = markJob(jobs, '0', 'fatto');
  jobs = markJob(jobs, '1', 'fallito');
  const p = progressOf(jobs);
  assert.equal(p.done, 1);
  assert.equal(p.failed, 1);
  assert.equal(p.remaining, 1);
  assert.ok(Math.abs(p.ratio - 2 / 3) < 0.001, 'anche i falliti fanno avanzare la barra');
});

test('un blocco vuoto non divide per zero', () => {
  assert.equal(progressOf([]).ratio, 0);
});

test('un fallimento non ferma il blocco', () => {
  // Su quaranta file uno sara rotto: fermarsi butterebbe via gli altri 39.
  let jobs = planJobs(files, { cutout: true });
  jobs = markJob(jobs, '0', 'fallito', { error: 'rotto' });
  const next = nextJob(jobs);
  assert.equal(next.id, '1', 'si prosegue col successivo');
  assert.equal(jobs[0].error, 'rotto', 'il motivo resta registrato');
});

test('quando non resta nulla nextJob dice null invece di ciclare', () => {
  let jobs = planJobs([f('a.png')], { cutout: true });
  jobs = markJob(jobs, '0', 'fatto');
  assert.equal(nextJob(jobs), null);
});

test('markJob non tocca gli altri lavori', () => {
  let jobs = planJobs(files, { cutout: true });
  jobs = markJob(jobs, '1', 'fatto');
  assert.equal(jobs[0].state, 'attesa');
  assert.equal(jobs[2].state, 'attesa');
});

test('la stima viene dai tempi reali, non da una costante', () => {
  // La stessa operazione dura diversamente su macchine diverse: dire un
  // numero sbagliato è peggio che non dirlo.
  assert.equal(averageMs([1000, 2000, 3000]), 2000);
  assert.equal(averageMs([]), null, 'senza misure non si inventa una stima');
  assert.equal(averageMs([0, -5, NaN]), null, 'valori assurdi non contano');

  let jobs = planJobs(files, { cutout: true });
  jobs = markJob(jobs, '0', 'fatto');
  assert.equal(estimateRemaining(jobs, 2000), 4, 'due lavori da due secondi');
  assert.equal(estimateRemaining(jobs, null), null);
});

test('a blocco finito non si promette altra attesa', () => {
  let jobs = planJobs([f('a.png')], { cutout: true });
  jobs = markJob(jobs, '0', 'fatto');
  assert.equal(estimateRemaining(jobs, 2000), null);
});

test('il riassunto nomina ogni file rotto una volta sola', () => {
  // Un file può fallire su più operazioni: elencarlo tre volte confonde.
  let jobs = planJobs([f('rotto.png')], { cutout: true, exportPresets: ['square', 'story'] });
  jobs = jobs.map((j) => ({ ...j, state: 'fallito' }));
  const s = summarize(jobs);
  assert.deepEqual(s.failedFiles, ['rotto.png']);
  assert.equal(s.failed, 3);
});
