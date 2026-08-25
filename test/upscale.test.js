import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planTiles,
  outputSize,
  canUpscale,
  getScale,
  SCALES,
  TILE,
  OVERLAP,
  estimateTiles,
  estimateSeconds,
} from '../src/engine/upscale.js';

test('le piastrelle coprono tutta l immagine senza buchi', () => {
  const w = 700;
  const h = 500;
  const tiles = planTiles(w, h);
  const coperto = new Uint8Array(w * h);
  for (const t of tiles) {
    for (let y = t.write.y; y < t.write.y + t.write.h; y++) {
      for (let x = t.write.x; x < t.write.x + t.write.w; x++) coperto[y * w + x] = 1;
    }
  }
  assert.equal(coperto.indexOf(0), -1, 'un pixel scoperto lascia un buco nel risultato');
});

test('le zone scritte non si sovrappongono mai', () => {
  // La sovrapposizione serve solo in lettura, per il contesto. Se si
  // sovrapponesse anche in scrittura, i bordi verrebbero disegnati due volte.
  const w = 700;
  const h = 500;
  const conta = new Uint8Array(w * h);
  for (const t of planTiles(w, h)) {
    for (let y = t.write.y; y < t.write.y + t.write.h; y++) {
      for (let x = t.write.x; x < t.write.x + t.write.w; x++) conta[y * w + x]++;
    }
  }
  // Niente Math.max(...array): con centinaia di migliaia di elementi
  // l'operatore di spread sfonda lo stack.
  let massimo = 0;
  for (const v of conta) if (v > massimo) massimo = v;
  assert.equal(massimo, 1, 'una zona scritta due volte produce giunture');
});

test('la lettura è SEMPRE della misura fissa che il modello pretende', () => {
  // Il modello rifiuta qualunque ingresso diverso da 256x256: una piastrella
  // di bordo più piccola fa fallire l'intera operazione.
  for (const [w, h] of [[100, 100], [700, 500], [1, 1], [1024, 33], [257, 257]]) {
    for (const t of planTiles(w, h)) {
      assert.equal(t.read.w, TILE, `lettura larga ${t.read.w} su ${w}x${h}`);
      assert.equal(t.read.h, TILE, `lettura alta ${t.read.h} su ${w}x${h}`);
      assert.equal(planTiles(w, h, 512)[0].read.w, 512, 'la misura deve essere configurabile');
      assert.ok(t.read.x >= 0 && t.read.y >= 0, `origine negativa su ${w}x${h}`);
    }
  }
});

test('su immagini grandi la finestra scorre dentro, senza sconfinare', () => {
  for (const t of planTiles(700, 500)) {
    assert.ok(t.read.x + t.read.w <= 700, 'sconfina a destra');
    assert.ok(t.read.y + t.read.h <= 500, 'sconfina in basso');
    assert.equal(t.pad, false, 'un immagine più grande della piastrella non va riempita');
  }
});

test('un immagine più piccola della piastrella richiede il riempimento', () => {
  const t = planTiles(100, 80)[0];
  assert.equal(t.pad, true);
  assert.deepEqual(t.avail, { w: 100, h: 80 }, 'quanto esiste davvero');
});

test('la lettura contiene sempre la scrittura', () => {
  for (const t of planTiles(700, 500)) {
    assert.ok(t.read.x <= t.write.x, 'la lettura deve iniziare prima o insieme');
    assert.ok(t.read.y <= t.write.y);
    assert.ok(t.read.x + t.read.w >= t.write.x + t.write.w, 'la lettura deve finire dopo o insieme');
    assert.ok(t.read.y + t.read.h >= t.write.y + t.write.h);
  }
});

test('l offset indica dove la scrittura comincia dentro la lettura', () => {
  for (const t of planTiles(700, 500)) {
    assert.equal(t.offset.x, t.write.x - t.read.x);
    assert.equal(t.offset.y, t.write.y - t.read.y);
  }
});

test('un immagine più piccola di una piastrella produce una sola piastrella', () => {
  const tiles = planTiles(100, 80);
  assert.equal(tiles.length, 1);
  assert.deepEqual(tiles[0].write, { x: 0, y: 0, w: 100, h: 80 });
});

test('dimensioni non valide vengono rifiutate', () => {
  assert.throws(() => planTiles(0, 100), /non valide/);
  assert.throws(() => planTiles(100, -1), /non valide/);
});

test('una sovrapposizione troppo grande viene rifiutata invece di ciclare all infinito', () => {
  assert.throws(() => planTiles(500, 500, 32, 20), /sovrapposizione/);
});

test('canUpscale limita per TEMPO, non per memoria', () => {
  // Ogni piastrella costa ~7,5 secondi: oltre il minuto e mezzo la funzione
  // smette di essere utilizzabile, per quanta memoria ci sia.
  assert.equal(canUpscale(300, 300), true);
  assert.equal(canUpscale(512, 512), true);
  assert.equal(canUpscale(1000, 1000), false, 'un minuto e mezzo di attesa non è una funzione');
  assert.equal(canUpscale(3661, 4843), false);
});

test('outputSize dice quanto diventerà grande', () => {
  assert.deepEqual(outputSize(300, 300, 4), { w: 1200, h: 1200, pixels: 1_440_000 });
});

test('la stima del tempo cresce col numero di piastrelle', () => {
  const scale = getScale('x4');
  const piccola = estimateSeconds(300, 300, scale);
  const grande = estimateSeconds(512, 512, scale);
  assert.ok(piccola > 0, 'una stima di zero secondi sarebbe una bugia');
  assert.ok(grande > piccola, 'più area, più attesa');
  // 300x300 con passo 224 fa 2x2 piastrelle: circa mezzo minuto.
  assert.equal(estimateTiles(300, 300), 4);
});

test('si offre solo x4, perché x2 è misurabilmente peggiore', () => {
  // Stessa uscita, quattro volte il tempo: tenerla sarebbe offrire
  // un'opzione peggiore sotto ogni aspetto.
  assert.equal(SCALES.length, 1);
  assert.equal(SCALES[0].id, 'x4');
});

test('ogni scala dichiara la misura di piastrella che il suo modello pretende', () => {
  // Non è una costante globale: sbagliarla fa fallire l'operazione con un
  // errore sulle dimensioni, non con un risultato brutto.
  assert.equal(getScale('x4').tile, 256);
  for (const s of SCALES) {
    assert.ok(Number.isInteger(s.tile) && s.tile > 0, `${s.id} senza misura di piastrella`);
  }
});

test('le scale disponibili sono coerenti', () => {
  assert.equal(getScale('x4').factor, 4);
  assert.throws(() => getScale('x8'), /sconosciuto/);
  for (const s of SCALES) assert.match(s.url, /^\/models\/.*\.onnx$/);
});

test('le costanti hanno valori sensati', () => {
  assert.ok(TILE > OVERLAP * 2, 'la piastrella deve lasciare spazio utile oltre i margini');
});
