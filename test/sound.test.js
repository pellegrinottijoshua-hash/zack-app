import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPES,
  getRecipe,
  playbackRate,
  driveCurve,
  impulseResponse,
  detectOnsets,
  describeRhythm,
} from '../src/engine/sound.js';

test('ogni ricetta è completa e traducibile', () => {
  for (const r of RECIPES) {
    assert.ok(r.id && r.labelKey && r.hintKey, `${r.id} incompleta`);
    assert.equal(typeof r.semitones, 'number');
    assert.equal(typeof r.formants, 'number');
    assert.ok(r.reverb && r.filter, `${r.id} senza riverbero o filtro`);
    assert.ok(r.drive >= 0 && r.drive <= 1, `${r.id} ha una distorsione fuori scala`);
  }
  assert.throws(() => getRecipe('inventata'), /sconosciuta/);
});

test('i suoni grandi abbassano ANCHE le formanti, non solo l intonazione', () => {
  // Abbassare la sola intonazione dà un effetto da giradischi lento, non da
  // gigante: è lo spostamento delle formanti a rendere un suono "grande".
  for (const id of ['gigante', 'mostro']) {
    const r = getRecipe(id);
    assert.ok(r.semitones < 0, `${id} dovrebbe essere più grave`);
    assert.ok(r.formants < 0, `${id} senza spostamento delle formanti suona solo rallentato`);
  }
});

test('dodici semitoni sono un ottava', () => {
  assert.ok(Math.abs(playbackRate(12) - 2) < 1e-9);
  assert.ok(Math.abs(playbackRate(-12) - 0.5) < 1e-9);
  assert.equal(playbackRate(0), 1);
});

test('distorsione a zero non altera il segnale', () => {
  // Un effetto "spento" che continua a sporcare è il difetto peggiore di una
  // catena di filtri: si sente e non si capisce da dove venga.
  const curve = driveCurve(0, 5);
  assert.ok(Math.abs(curve[0] + 1) < 1e-9, 'estremo negativo');
  assert.ok(Math.abs(curve[2]) < 1e-9, 'centro');
  assert.ok(Math.abs(curve[4] - 1) < 1e-9, 'estremo positivo');
});

test('la distorsione resta dentro i limiti e cresce col drive', () => {
  const morbida = driveCurve(0.2, 512);
  const forte = driveCurve(0.9, 512);
  for (const c of [morbida, forte]) {
    for (const v of c) assert.ok(v >= -1.001 && v <= 1.001, `valore fuori scala: ${v}`);
  }
  // A metà strada, più drive significa più segnale spinto verso l'estremo.
  const i = Math.floor(512 * 0.75);
  assert.ok(forte[i] > morbida[i], 'più drive deve spingere di più');
});

test('il riverbero decade e ha due canali della stessa lunghezza', () => {
  const ir = impulseResponse(8000, 0.5, 2);
  assert.equal(ir.length, 4000);
  assert.equal(ir.left.length, ir.right.length);
  const inizio = Math.abs(ir.left[10]);
  const fine = Math.abs(ir.left[ir.length - 10]);
  assert.ok(fine < inizio, 'il riverbero deve spegnersi, non restare');
});

test('un riverbero cortissimo non produce un buffer vuoto', () => {
  // Un buffer di lunghezza zero fa fallire il nodo di convoluzione.
  assert.ok(impulseResponse(44100, 0, 2).length >= 1);
});

/** Tre impulsi a distanza nota, su fondo silenzioso. */
function impulsi(sampleRate, tempi, durata = 2) {
  const n = Math.floor(sampleRate * durata);
  const s = new Float32Array(n);
  for (const t of tempi) {
    const start = Math.floor(t * sampleRate);
    for (let i = 0; i < Math.floor(sampleRate * 0.05); i++) {
      if (start + i < n) s[start + i] = Math.sin(i * 0.3) * (1 - i / (sampleRate * 0.05));
    }
  }
  return s;
}

test('gli attacchi si trovano dove sono davvero', () => {
  const sr = 8000;
  const onsets = detectOnsets(impulsi(sr, [0.2, 0.7, 1.2]), sr);
  assert.equal(onsets.length, 3, `trovati ${onsets.length} attacchi invece di 3`);
  const tempi = onsets.map((o) => +o.time.toFixed(1));
  assert.deepEqual(tempi, [0.2, 0.7, 1.2]);
});

test('il silenzio non produce attacchi', () => {
  // Senza questo controllo il rumore di fondo verrebbe scambiato per ritmo.
  const sr = 8000;
  assert.deepEqual(detectOnsets(new Float32Array(sr), sr), []);
  assert.deepEqual(detectOnsets(null, sr), []);
  assert.deepEqual(detectOnsets(new Float32Array(100), 0), []);
});

test('due colpi troppo vicini contano come uno', () => {
  // Una voce non produce due eventi distinti in venti millesimi: sarebbe
  // l'attacco e la sua stessa coda, contati due volte.
  const sr = 8000;
  const onsets = detectOnsets(impulsi(sr, [0.3, 0.32]), sr, { minGapMs: 90 });
  assert.equal(onsets.length, 1);
});

test('ogni attacco porta la sua intensità', () => {
  const sr = 8000;
  const onsets = detectOnsets(impulsi(sr, [0.2, 0.8]), sr);
  for (const o of onsets) {
    assert.ok(o.strength > 0 && o.strength <= 1, `intensità fuori scala: ${o.strength}`);
  }
});

test('il ritmo si descrive in colpi e battute al minuto', () => {
  const r = describeRhythm([{ time: 0 }, { time: 0.5 }, { time: 1 }]);
  assert.equal(r.count, 3);
  assert.equal(r.bpm, 120, 'mezzo secondo fra i colpi sono 120 bpm');
});

test('un solo colpo non ha una velocità', () => {
  assert.deepEqual(describeRhythm([{ time: 0.3 }]), { count: 1, bpm: null });
  assert.deepEqual(describeRhythm([]), { count: 0, bpm: null });
});
