import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planReady, readyLabel, TARGET_SIDE, CUTOUT_SECONDS } from '../src/engine/ready.js';

test('un file piccolo viene scontornato e ingrandito in un colpo solo', () => {
  // È tutto il senso del pulsante: per chi stampa sono una cosa sola.
  const p = planReady({ w: 1000, h: 1000 });
  assert.deepEqual(p.steps, ['cutout', 'upscale']);
  assert.equal(p.scaleId, 'x4');
  assert.deepEqual(p.out, { w: 4000, h: 4000 });
  assert.equal(p.reached, true);
});

test('se nessun fattore basta si prende il più grande utilizzabile', () => {
  // Meglio 6000 di 3000: non si arriva al bersaglio, ma ci si avvicina, e
  // `reached` resta falso perché la differenza va detta.
  const p = planReady({ w: 3000, h: 3000 }, { target: 20000 });
  assert.equal(p.scaleId, 'x2', 'il ×4 sforerebbe la tela');
  assert.deepEqual(p.out, { w: 6000, h: 6000 });
  assert.equal(p.reached, false);
});

test('si sceglie il fattore PIÙ PICCOLO che arriva al bersaglio', () => {
  // Ingrandire più del necessario costa tempo e memoria senza dare un pixel
  // utile in più: da 2100 bastano due volte, non quattro.
  const p = planReady({ w: 2100, h: 2100 });
  assert.equal(p.scaleId, 'x2');
  assert.deepEqual(p.out, { w: 4200, h: 4200 });
});

test('un file già abbastanza grande non viene ingrandito', () => {
  // Ricostruire dettaglio che c'è già è solo attesa.
  const p = planReady({ w: 4200, h: 3000 });
  assert.deepEqual(p.steps, ['cutout']);
  assert.equal(p.factor, null);
  assert.equal(p.reason, 'abbastanza');
  assert.equal(p.seconds, CUTOUT_SECONDS);
});

test('poco sotto il bersaglio conta come abbastanza', () => {
  // 3900 su 4000 non giustifica due minuti di attesa per il 2% di lato.
  assert.equal(planReady({ w: 3900, h: 2000 }).factor, null);
});

test('conta il lato LUNGO, non la larghezza', () => {
  // Un ritratto stretto e alto riempie comunque l'area di stampa.
  const p = planReady({ w: 900, h: 4100 });
  assert.equal(p.factor, null, 'il lato lungo è già oltre il bersaglio');
});

test('quando nemmeno il massimo arriva al bersaglio, lo dice', () => {
  // Promettere quattromila e consegnarne milleduecento sarebbe peggio che
  // dirlo prima di partire.
  const p = planReady({ w: 300, h: 300 });
  assert.equal(p.scaleId, 'x4');
  assert.deepEqual(p.out, { w: 1200, h: 1200 });
  assert.equal(p.reached, false);
});

test('un file troppo grande per essere ingrandito resta com è, senza errori', () => {
  // 5000 di lato sfora la tela anche col ×2: si scontorna e basta, e si dice
  // perché, invece di sollevare un errore in faccia a chi voleva stampare.
  const p = planReady({ w: 5000, h: 5000 }, { target: 20000 });
  assert.equal(p.factor, null);
  assert.equal(p.reason, 'troppo-grande');
  assert.equal(p.reached, false);
  assert.deepEqual(p.steps, ['cutout']);
});

test('si può preparare anche senza riscontornare', () => {
  // Su un file già scontornato rifare lo scontorno rischia di mangiare pezzi.
  const p = planReady({ w: 1000, h: 1000 }, { cutout: false });
  assert.deepEqual(p.steps, ['upscale']);
  assert.ok(p.seconds < planReady({ w: 1000, h: 1000 }).seconds);
});

test("l'attesa è pronta da scrivere, e non è mai zero", () => {
  const l = readyLabel(planReady({ w: 4200, h: 4200 }));
  assert.ok(l.value >= 1);
  assert.ok(['sec', 'min'].includes(l.unit));
});

test('senza immagine è un errore, non un piano vuoto', () => {
  assert.throws(() => planReady(null), /Nessuna immagine/);
  assert.throws(() => planReady({ w: 0, h: 10 }), /Nessuna immagine/);
});

test('il bersaglio è quello dell area di stampa, non un numero tondo a caso', () => {
  // Gelato a 350 dpi: area stampabile 3844×5085 dentro una tela 4271×5650.
  assert.equal(TARGET_SIDE, 4000);
  assert.ok(TARGET_SIDE >= 3844, 'sotto l area stampabile il bersaglio non servirebbe');
});
