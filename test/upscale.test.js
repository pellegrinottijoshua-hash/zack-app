import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  inputLimits,
  probeCanvasPixels,
  humanSeconds,
  MAX_OUTPUT_PIXELS,
  MAX_OUTPUT_SIDE,
  planTiles,
  outputSize,
  canUpscale,
  getScale,
  reductionFor,
  MODEL_FACTOR,
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

test('il limite è la tela, non il tempo', () => {
  // Il vecchio tetto di 512 px veniva da una stima otto volte pessimista.
  // Rimisurato, un file di stampa ci sta: quello che non ci sta è una tela
  // oltre il limite del browser, che si crea e restituisce pixel vuoti.
  assert.equal(canUpscale(300, 300, 4).ok, true);
  assert.equal(canUpscale(1024, 1024, 4).ok, true, 'un file da 1024 deve passare');
  assert.equal(canUpscale(2048, 2048, 4).ok, true);
});

test('il rifiuto dice QUALE limite si è superato', () => {
  // «Troppo grande» non dice cosa fare. «Troppo largo di lato» sì.
  const lato = canUpscale(5000, 100, 4);
  assert.equal(lato.ok, false);
  assert.equal(lato.reason, 'lato', 'oltre 4096 di lato l uscita sfora la tela');

  const area = canUpscale(3000, 3000, 4);
  assert.equal(area.ok, false);
  assert.equal(area.reason, 'area');
});

test('i limiti d ingresso derivano da quelli d uscita, non da una costante', () => {
  const x4 = inputLimits(4);
  assert.equal(x4.side, Math.floor(MAX_OUTPUT_SIDE / 4));
  assert.equal(x4.pixels, Math.floor(MAX_OUTPUT_PIXELS / 16));
  // Un fattore più piccolo lascia entrare immagini più grandi: è aritmetica,
  // e se smettesse di valerlo il limite sarebbe scritto a mano da qualche parte.
  assert.ok(inputLimits(2).pixels > x4.pixels);
});

test('un tetto di tela più basso stringe l ingresso', () => {
  // Su Safari mobile la tela regge molto meno: il limite deve seguirla.
  const stretto = canUpscale(1024, 1024, 4, { maxOutputPixels: 4e6 });
  assert.equal(stretto.ok, false);
  assert.equal(stretto.reason, 'area');
});

test('la prova della tela rifiuta una tela che si crea ma resta vuota', () => {
  // È il caso pericoloso: oltre il limite la tela NON solleva errori, produce
  // pixel vuoti. Crearla non basta come prova, va riletta.
  const finta = (w, h) => ({
    getContext: () => ({
      fillRect() {},
      getImageData: () => ({ data: w <= 4096 ? [255, 0, 0, 255] : [0, 0, 0, 0] }),
    }),
    width: w,
    height: h,
  });
  assert.equal(probeCanvasPixels(finta), 4096 * 4096);
});

test('la stima del tempo si dice come la direbbe una persona', () => {
  assert.deepEqual(humanSeconds(30), { value: 30, unit: 'sec' });
  assert.deepEqual(humanSeconds(89), { value: 89, unit: 'sec' });
  assert.deepEqual(humanSeconds(120), { value: 2, unit: 'min' });
  // Mai «0 secondi»: un'attesa esiste sempre, e dire zero sembra un guasto.
  assert.equal(humanSeconds(0.2).value, 1);
});

test('il caricamento del modello si conta solo la prima volta', () => {
  const scale = getScale('x4');
  const freddo = estimateSeconds(300, 300, scale, { warm: false });
  const caldo = estimateSeconds(300, 300, scale);
  assert.ok(freddo > caldo, 'la prima volta si aspetta anche il modello');
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
  // 300x300 con passo 224 fa 2x2 piastrelle.
  assert.equal(estimateTiles(300, 300), 4);
});

test('il ×2 si ottiene dal ×4, non da un secondo modello', () => {
  // Un modello ×2 dedicato costa quattro volte il tempo per un risultato
  // peggiore: ridurre a metà un'immagine già ricostruita batte interpolarla
  // dal piccolo. Un solo modello da scaricare, due fattori da offrire.
  assert.deepEqual(SCALES.map((s) => s.id), ['x2', 'x4']);
  for (const s of SCALES) assert.equal(s.url, '/models/upscale-x4.onnx');
  assert.equal(reductionFor(4), 1, 'il ×4 esce dal modello così com è');
  assert.equal(reductionFor(2), 2, 'il ×2 si riduce a metà');
  assert.equal(MODEL_FACTOR, 4);
});

test('un fattore più piccolo lascia entrare immagini più grandi', () => {
  // È il motivo pratico per cui il ×2 serve: su un file già grande il ×4
  // sfora la tela, il ×2 no.
  assert.equal(canUpscale(3000, 3000, 4).ok, false);
  assert.equal(canUpscale(3000, 3000, 2).ok, true);
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
  assert.equal(getScale('x2').factor, 2);
  assert.throws(() => getScale('x8'), /sconosciuto/);
  for (const s of SCALES) assert.match(s.url, /^\/models\/.*\.onnx$/);
});

test('le costanti hanno valori sensati', () => {
  assert.ok(TILE > OVERLAP * 2, 'la piastrella deve lasciare spazio utile oltre i margini');
});
