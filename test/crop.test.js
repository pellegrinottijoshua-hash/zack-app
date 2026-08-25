import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASPECTS,
  getAspect,
  withMargin,
  windowFor,
  slideToContain,
  smartCrop,
  savedRatio,
} from '../src/engine/crop.js';

const stats = (box, image = { w: 1000, h: 1000 }, centroid) => ({
  image,
  box,
  centroid: centroid || { x: box.x + box.w / 2, y: box.y + box.h / 2 },
});

test('ogni formato è dichiarato e traducibile', () => {
  for (const a of ASPECTS) {
    assert.ok(a.id && a.labelKey, `${a.id} incompleto`);
    assert.ok(a.ratio === null || a.ratio > 0, `${a.id} ha un rapporto assurdo`);
  }
  assert.throws(() => getAspect('boh'), /sconosciuto/);
});

test('il margine è una frazione del soggetto, non un numero di pixel', () => {
  // 40 px sono aria attorno a un francobollo e una linea attorno a un manifesto.
  const piccolo = withMargin({ x: 100, y: 100, w: 100, h: 100 }, 0.1, { w: 1000, h: 1000 });
  const grande = withMargin({ x: 100, y: 100, w: 500, h: 500 }, 0.1, { w: 1000, h: 1000 });
  assert.equal(piccolo.w, 120);
  assert.equal(grande.w, 600);
});

test('il margine non esce mai dall immagine', () => {
  const r = withMargin({ x: 0, y: 0, w: 100, h: 100 }, 0.5, { w: 120, h: 120 });
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
  assert.equal(r.w, 120);
  assert.equal(r.h, 120);
});

test('la finestra rispetta il rapporto richiesto', () => {
  const w = windowFor({ x: 0, y: 0, w: 200, h: 100 }, 1, { w: 1000, h: 1000 });
  assert.equal(w.w, 200);
  assert.equal(w.h, 200, 'un quadrato attorno a un rettangolo largo cresce in altezza');
  assert.equal(w.cut, false);
});

test('se il formato non ci sta si perde margine, non si esce dall immagine', () => {
  // Aggiungere tela finta sarebbe inventare pixel: si preferisce tagliare.
  const w = windowFor({ x: 0, y: 0, w: 100, h: 100 }, 1, { w: 60, h: 200 });
  assert.equal(w.w, 60);
  assert.equal(w.h, 60);
  assert.equal(w.cut, true, 'va detto che qualcosa verrà tagliato');
});

test('senza rapporto la finestra resta la forma del soggetto', () => {
  const w = windowFor({ x: 0, y: 0, w: 137, h: 42 }, null, { w: 1000, h: 1000 });
  assert.equal(w.w, 137);
  assert.equal(w.h, 42);
});

test('la finestra scivola per contenere il soggetto', () => {
  // Il baricentro chiederebbe 0, ma il soggetto va da 50 a 90: una finestra
  // da 50 deve spostarsi a 40 per non tagliargli i piedi.
  assert.equal(slideToContain(0, 50, 50, 90, 1000), 40);
});

test('quando la scelta è libera comanda il baricentro', () => {
  // Soggetto 10..20, finestra 100: qualunque posizione fra -80 e 10 lo
  // contiene, quindi si segue la preferenza.
  assert.equal(slideToContain(5, 100, 10, 20, 1000), 5);
});

test('un soggetto più grande della finestra non la fa impazzire', () => {
  // Nessuna posizione lo contiene: si resta sulla preferenza, dentro i bordi.
  const pos = slideToContain(300, 100, 0, 1000, 1000);
  assert.ok(pos >= 0 && pos <= 900);
});

test('il ritaglio non esce mai dall immagine', () => {
  const image = { w: 400, h: 400 };
  for (const a of ASPECTS) {
    for (const box of [
      { x: 0, y: 0, w: 30, h: 30 },
      { x: 370, y: 370, w: 30, h: 30 },
      { x: 0, y: 0, w: 400, h: 400 },
      { x: 150, y: 10, w: 100, h: 380 },
    ]) {
      const c = smartCrop(stats(box, image), { aspect: a.id, margin: 0.2 });
      assert.ok(c.x >= 0 && c.y >= 0, `${a.id} esce in alto a sinistra`);
      assert.ok(c.x + c.w <= image.w, `${a.id} esce a destra`);
      assert.ok(c.y + c.h <= image.h, `${a.id} esce in basso`);
      assert.ok(c.w > 0 && c.h > 0);
    }
  }
});

test('il ritaglio segue il soggetto, non il centro della tela', () => {
  // È tutta qui la differenza con un ritaglio centrato: un soggetto in un
  // angolo resta intero invece di sparire.
  const c = smartCrop(stats({ x: 700, y: 60, w: 120, h: 120 }), { aspect: 'quadrato' });
  assert.ok(c.x > 600, `ritaglio a ${c.x}: è tornato al centro della tela`);
  assert.ok(c.x <= 700 && c.x + c.w >= 820, 'il soggetto deve restarci tutto dentro');
});

test('un rapporto stretto tiene comunque dentro il soggetto in larghezza', () => {
  const c = smartCrop(stats({ x: 400, y: 400, w: 200, h: 100 }), { aspect: 'storia', margin: 0 });
  assert.ok(c.x <= 400 && c.x + c.w >= 600, 'il soggetto è uscito dai lati');
});

test('senza soggetto non si ritaglia', () => {
  assert.equal(smartCrop({ image: { w: 10, h: 10 }, box: null }), null);
  assert.equal(savedRatio(null, { w: 10, h: 10 }), 0);
});

test('si sa quanto si è guadagnato', () => {
  // Serve a non proporre un ritaglio che toglie il tre per cento.
  const c = smartCrop(stats({ x: 450, y: 450, w: 100, h: 100 }), { aspect: 'quadrato', margin: 0 });
  assert.ok(savedRatio(c, { w: 1000, h: 1000 }) > 0.98);
});

test('un soggetto che riempie già tutto non promette guadagni', () => {
  const c = smartCrop(stats({ x: 0, y: 0, w: 1000, h: 1000 }), { aspect: 'auto', margin: 0 });
  assert.equal(savedRatio(c, { w: 1000, h: 1000 }), 0);
});
