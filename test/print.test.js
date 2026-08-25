import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GARMENTS,
  getGarment,
  relativeLuminance,
  contrastRatio,
  cmFromPx,
  checkPrint,
  worstLevel,
  MIN_CM,
  SOFT_RATIO_MAX,
} from '../src/engine/print.js';
import { PRESETS } from '../src/engine/export.js';

const base = {
  image: { w: 4000, h: 5000 },
  // Piu' grande dell'area di sicurezza: cosi' la stampa la riempie davvero,
  // che e' il caso normale di un file preparato bene.
  box: { x: 0, y: 0, w: 3400, h: 4500 },
  color: [245, 240, 232],
  hasTransparency: true,
  softRatio: 0.02,
  touches: { left: false, right: false, top: false, bottom: false },
};

const find = (r, id) => r.findings.find((f) => f.id === id);

test('ogni capo ha un colore vero', () => {
  for (const g of GARMENTS) {
    assert.equal(g.rgb.length, 3, `${g.id} senza colore`);
    assert.ok(g.rgb.every((v) => v >= 0 && v <= 255));
  }
  assert.throws(() => getGarment('fucsia'), /sconosciuto/);
});

test('solo i formati di stampa dichiarano i dpi', () => {
  // Senza dpi non ci sono centimetri, e senza centimetri il controllo non ha
  // niente da dire: meglio tacere che inventare.
  for (const p of PRESETS) {
    if (p.group === 'stampa') assert.ok(p.dpi > 0, `${p.id} senza dpi`);
    else assert.equal(p.dpi, undefined, `${p.id} non è un formato di stampa`);
  }
});

test('i pixel diventano centimetri', () => {
  assert.ok(Math.abs(cmFromPx(300, 300) - 2.54) < 1e-9, 'trecento pixel a 300 dpi sono un pollice');
  assert.ok(Math.abs(cmFromPx(3661, 300) - 30.99) < 0.01, "l'area Gelato è circa 31 cm");
});

test('la luminanza è percettiva, non una media dei canali', () => {
  // Il verde pesa quanto rosso e blu insieme: è cosi' che vede l'occhio, ed è
  // il motivo per cui una media aritmetica darebbe verdetti sbagliati.
  assert.ok(relativeLuminance([0, 255, 0]) > relativeLuminance([255, 0, 0]));
  assert.ok(relativeLuminance([255, 0, 0]) > relativeLuminance([0, 0, 255]));
  assert.ok(Math.abs(relativeLuminance([255, 255, 255]) - 1) < 1e-9);
  assert.equal(relativeLuminance([0, 0, 0]), 0);
});

test('il contrasto è simmetrico e va da 1 a 21', () => {
  assert.ok(Math.abs(contrastRatio([0, 0, 0], [255, 255, 255]) - 21) < 0.01);
  assert.equal(contrastRatio([17, 17, 17], [17, 17, 17]), 1);
  assert.equal(
    contrastRatio([200, 30, 30], [10, 10, 10]),
    contrastRatio([10, 10, 10], [200, 30, 30]),
  );
});

test('su un formato social non si parla di stampa', () => {
  const r = checkPrint(base, { preset: 'square', garment: 'nero' });
  assert.equal(r.printable, false);
  assert.deepEqual(r.findings, []);
});

test('una grafica ampia e contrastata passa tutto', () => {
  const r = checkPrint(base, { preset: 'gelato-front', garment: 'nero' });
  assert.equal(worstLevel(r.findings), 'ok', JSON.stringify(r.findings));
  assert.ok(r.size.w > 20, `stampa larga ${r.size.w} cm`);
});

test('un file piu\' piccolo dell area stampabile non viene ingrandito: si avvisa', () => {
  // Ingrandirlo darebbe una stampa sgranata sul tessuto. Preferiamo dire che
  // uscira' piu' piccola.
  const r = checkPrint({ ...base, box: { x: 0, y: 0, w: 2000, h: 2600 } }, {
    preset: 'gelato-front',
    garment: 'nero',
  });
  const f = find(r, 'size');
  assert.equal(f.level, 'attenzione');
  assert.ok(r.placement.upscaleLimited);
});

test('una grafica minuscola è un errore, non un dettaglio', () => {
  // Sedici pixel non diventano una maglietta: non ingrandiamo, e lo diciamo.
  const r = checkPrint({ ...base, box: { x: 0, y: 0, w: 60, h: 60 } }, {
    preset: 'gelato-front',
    garment: 'nero',
  });
  const f = find(r, 'size');
  assert.equal(f.level, 'errore');
  assert.ok(cmFromPx(60, 300) < MIN_CM);
});

test('nero su nero è invisibile e va detto', () => {
  const r = checkPrint({ ...base, color: [20, 20, 20] }, {
    preset: 'gelato-front',
    garment: 'nero',
  });
  assert.equal(find(r, 'contrast').level, 'errore');
  assert.equal(worstLevel(r.findings), 'errore');
});

test('lo stesso file su un capo chiaro va benissimo', () => {
  // È la prova che il controllo guarda la coppia grafica+capo, non la grafica.
  const r = checkPrint({ ...base, color: [20, 20, 20] }, {
    preset: 'gelato-front',
    garment: 'panna',
  });
  assert.equal(find(r, 'contrast').level, 'ok');
});

test('senza trasparenza la stampa è un rettangolo di inchiostro', () => {
  const r = checkPrint({ ...base, hasTransparency: false }, {
    preset: 'gelato-front',
    garment: 'nero',
  });
  assert.equal(find(r, 'background').level, 'attenzione');
});

test('troppi bordi sfumati diventano un alone', () => {
  const r = checkPrint({ ...base, softRatio: SOFT_RATIO_MAX + 0.05 }, {
    preset: 'gelato-front',
    garment: 'nero',
  });
  const f = find(r, 'edges');
  assert.equal(f.level, 'attenzione');
  assert.equal(f.values.pct, 23);
});

test('su un vettore non si parla di bordi sfumati', () => {
  // Sarebbero i pixel della NOSTRA rasterizzazione, non del file: un avviso
  // su un difetto che abbiamo introdotto noi è peggio di nessun avviso.
  const alone = { ...base, softRatio: 0.6 };
  assert.equal(find(checkPrint(alone, { preset: 'gelato-front', garment: 'nero' }), 'edges').level, 'attenzione');
  assert.equal(
    find(checkPrint(alone, { preset: 'gelato-front', garment: 'nero', isVector: true }), 'edges'),
    undefined,
  );
});

test('un soggetto già tagliato dal bordo viene segnalato', () => {
  const r = checkPrint({ ...base, touches: { ...base.touches, right: true } }, {
    preset: 'gelato-front',
    garment: 'nero',
  });
  assert.equal(find(r, 'clipped').level, 'attenzione');
});

test('un file vuoto è un errore solo, non cinque', () => {
  const r = checkPrint({ ...base, box: null }, { preset: 'gelato-front', garment: 'nero' });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].id, 'empty');
});

test('il verdetto complessivo è il peggiore dei singoli', () => {
  assert.equal(worstLevel([{ level: 'ok' }, { level: 'attenzione' }]), 'attenzione');
  assert.equal(worstLevel([{ level: 'attenzione' }, { level: 'errore' }]), 'errore');
  assert.equal(worstLevel([{ level: 'ok' }]), 'ok');
});
