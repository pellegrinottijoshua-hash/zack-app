import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  taglio,
  riquadro,
  riquadroFormato,
  istanti,
  formato,
  FORMATI,
  MAX_FOTOGRAMMI,
} from '../src/engine/clip.js';

test('un taglio normale resta com\'è', () => {
  assert.deepEqual(taglio(10, { da: 2, a: 6 }), { da: 2, a: 6, durata: 4 });
});

test('un taglio oltre la fine viene riportato dentro', () => {
  // Un `<video>` non solleva niente su un tempo impossibile: si ottiene un
  // file vuoto, e l'utente scopre di aver perso il lavoro riaprendolo.
  assert.deepEqual(taglio(10, { da: 8, a: 99 }), { da: 8, a: 10, durata: 2 });
  assert.deepEqual(taglio(10, { da: -5, a: 3 }), { da: 0, a: 3, durata: 3 });
});

test('un taglio più corto di un fotogramma si rifiuta', () => {
  assert.throws(() => taglio(10, { da: 5, a: 5.01 }), /più corto di un fotogramma/);
});

test('senza durata dichiarata il taglio non parte', () => {
  assert.throws(() => taglio(0), /non dichiara una durata/);
  assert.throws(() => taglio(NaN), /non dichiara una durata/);
});

test('il ritaglio ha sempre lati pari', () => {
  // I codec rifiutano un lato dispari, e il rifiuto arriva alla FINE della
  // codifica: dopo aver fatto aspettare.
  const r = riquadro(1281, 721, { x: 3, y: 5, larghezza: 999, altezza: 333 });
  assert.equal(r.w % 2, 0);
  assert.equal(r.h % 2, 0);
});

test('il ritaglio non esce mai dal filmato', () => {
  const r = riquadro(640, 480, { x: 600, y: 400, larghezza: 900, altezza: 900 });
  assert.ok(r.x + r.w <= 640);
  assert.ok(r.y + r.h <= 480);
});

test('portare a verticale ritaglia i lati invece di deformare', () => {
  // Una persona schiacciata si vede; un'inquadratura più stretta no.
  const r = riquadroFormato(1920, 1080, 9 / 16);
  assert.equal(r.h, 1080, 'tiene tutta l\'altezza');
  assert.ok(r.w < 1920, 'stringe i lati');
  assert.ok(Math.abs(r.w / r.h - 9 / 16) < 0.02);
  assert.equal(r.x, Math.round((1920 - r.w) / 2), 'resta centrato');
});

test('portare a orizzontale un verticale taglia sopra e sotto', () => {
  const r = riquadroFormato(1080, 1920, 16 / 9);
  assert.equal(r.w, 1080);
  assert.ok(r.h < 1920);
});

test('un formato assurdo si rifiuta', () => {
  assert.throws(() => riquadroFormato(100, 100, 0), /Formato non valido/);
  assert.throws(() => formato('cinemascope'), /sconosciuto/);
});

test('i fotogrammi si contano, non si cadenzano', () => {
  // Con «uno ogni tot secondi» una clip di quattro minuti riempie la libreria
  // di duecento immagini che nessuno ha chiesto.
  assert.equal(istanti(4, 8).length, 8);
  assert.equal(istanti(240, 8).length, 8);
});

test('non si prende il primo né l\'ultimo istante', () => {
  // Il fotogramma a 0 è spesso nero, e quello esatto alla fine può non
  // esistere affatto.
  const i = istanti(10, 4);
  assert.ok(i[0] > 0);
  assert.ok(i[i.length - 1] < 10);
});

test('gli istanti sono in ordine e distinti', () => {
  const i = istanti(10, 12);
  for (let k = 1; k < i.length; k++) assert.ok(i[k] > i[k - 1]);
});

test('un solo fotogramma si prende a metà', () => {
  assert.deepEqual(istanti(10, 1), [5]);
});

test('c\'è un tetto al numero di fotogrammi', () => {
  // Mille immagini in libreria da un gesto solo sono un archivio rovinato,
  // e nessuno le cancella una per una.
  assert.equal(istanti(60, 9999).length, MAX_FOTOGRAMMI);
});

test('i formati sono quelli che si usano davvero', () => {
  assert.deepEqual(FORMATI.map((f) => f.id), [
    'originale',
    'quadrato',
    'verticale',
    'orizzontale',
    'ritratto',
  ]);
});
