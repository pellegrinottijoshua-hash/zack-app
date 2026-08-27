import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planJobs,
  sostituisciRisultato,
  isEmptyPlan,
  progressOf,
  estimateRemaining,
  averageMs,
  markJob,
  nextJob,
  summarize,
  OPS,
  attesaJobs,
  SECONDI_PER_OP,
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

test("l'ingrandimento viene dopo lo scontorno, sempre", () => {
  // Ingrandire lo sfondo per poi buttarlo via è tempo speso su pixel che
  // nessuno vedrà: su quaranta file diventano minuti regalati.
  const jobs = planJobs([f('a.png')], { cutout: true, upscale: true });
  assert.deepEqual(jobs.map((j) => j.op), [OPS.cutout, OPS.upscale]);
});

test('il solo ingrandimento è già un piano valido', () => {
  assert.equal(isEmptyPlan({ upscale: true }), false);
  assert.equal(planJobs(files, { upscale: true }).length, 3);
});

// ── L'attesa detta prima di premere ────────────────────────────────────────
//
// «Quaranta file in un colpo» taceva sul fatto che il colpo dura mezz'ora, e
// l'utente lo scopriva dopo aver premuto. Questi test proteggono la promessa,
// non il numero: i numeri cambieranno quando li rimisureremo.

test('un blocco vuoto non promette attesa', () => {
  assert.deepEqual(attesaJobs([]), { secondi: 0, certo: true });
});

test("l'attesa cresce col numero di file", () => {
  const uno = attesaJobs(planJobs([{ name: 'a.png' }], { cutout: true }));
  const dieci = attesaJobs(planJobs(Array.from({ length: 10 }, (_, i) => ({ name: `${i}.png` })), { cutout: true }));
  assert.equal(dieci.secondi, uno.secondi * 10);
});

test("l'ingrandimento è il costo che domina, e per questo va detto", () => {
  const file = [{ name: 'a.png' }];
  const solo = attesaJobs(planJobs(file, { cutout: true }));
  const con = attesaJobs(planJobs(file, { cutout: true, upscale: true }));
  assert.ok(con.secondi > solo.secondi * 10, 'un ×4 vale decine di scontorni');
});

test("un'operazione dal costo non misurato rende l'attesa un «almeno»", () => {
  // La regola del progetto in un booleano: dove non c'è una misura non c'è un
  // avviso, e una stima che si spaccia per misura è peggio di nessuna stima.
  const file = [{ name: 'a.png' }];
  assert.equal(attesaJobs(planJobs(file, { cutout: true })).certo, true);
  assert.equal(attesaJobs(planJobs(file, { cutout: true, vector: true })).certo, false);
  assert.equal(attesaJobs(planJobs(file, { exportPresets: ['gelato-front-350'] })).certo, false);
});

test('ogni operazione del piano ha un costo dichiarato', () => {
  // Un lavoro che non compare in SECONDI_PER_OP sparirebbe dal conto in
  // silenzio, e l'attesa scritta sul tasto sarebbe più bassa del vero.
  for (const op of Object.values(OPS)) {
    assert.ok(Number.isFinite(SECONDI_PER_OP[op]), `manca il costo di ${op}`);
  }
});

/*
 * La correzione a mano torna nel Blocco, non solo in libreria.
 *
 * Il difetto raccontato dal committente il 2026-08-27: «quando faccio
 * correggi a mano e poi recupera e applica mi ritorna come prima… quello
 * corretto va in libreria quando in realtà voglio vada direttamente nel
 * canva».
 *
 * `fixFromBatch` era una porta a senso unico: copiava il risultato nel banco
 * a file singolo e si dimenticava da dove veniva, quindi al momento di
 * applicare non c'era piu' nessun posto a cui restituire il file. La
 * piastrella restava quella di prima e nasceva un doppione `-corretto`.
 *
 * L'identita' e' il FILE di partenza, non l'indice: fra l'apertura del
 * pennello e l'applicazione il blocco puo' aver finito altri lavori e
 * riordinato la lista.
 */
test('la correzione sostituisce il risultato di quel file, e solo quello', () => {
  const a = { name: 'uno.png' };
  const b = { name: 'due.png' };
  const results = [
    { file: a, blob: 'vecchio-a', assetId: 'A' },
    { file: b, blob: 'vecchio-b', assetId: 'B' },
  ];
  const dopo = sostituisciRisultato(results, a, 'corretto-a');
  assert.equal(dopo[0].blob, 'corretto-a');
  assert.equal(dopo[0].assetId, 'A', "l'identita' in libreria non cambia: e' lo stesso asset un minuto dopo");
  assert.equal(dopo[1].blob, 'vecchio-b', "gli altri risultati non si toccano");
});

test('correggere un file che non e nella lista non inventa una riga', () => {
  // Puo' succedere se il blocco e' stato svuotato mentre il pennello era
  // aperto: meglio non fare niente che far comparire un risultato orfano.
  const results = [{ file: { name: 'uno.png' }, blob: 'x', assetId: 'A' }];
  const dopo = sostituisciRisultato(results, { name: 'altro.png' }, 'y');
  assert.deepEqual(dopo, results);
});
