import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * Un URL di blob non nasce dentro il render.
 *
 * Il difetto (2026-09-04): `<img src={URL.createObjectURL(f)} />` dentro una
 * `.map()` crea un URL NUOVO a ogni ridisegno e non ne revoca mai nessuno.
 * Ogni URL tiene in vita il blob a cui punta, quindi tre file e una manciata
 * di ridisegni bastano a tenere in memoria decine di copie della stessa
 * immagine — e in un'app che lavora su file di stampa le copie non sono
 * piccole. In `FilmLab` era un filmato intero.
 *
 * Non e' la causa della lentezza riferita dal committente (quella era il
 * modello che partiva sempre): e' un difetto a se', e si corregge perche' e'
 * vero.
 *
 * La cura e' sempre la stessa, ed era gia' scritta in `BatchGrid.jsx`: l'URL
 * si fa una volta in un `useMemo` legato alla sorgente, e si revoca quando
 * quella sorgente se ne va.
 */
const FILES = [
  ['src/App.jsx', '../src/App.jsx'],
  ['src/components/BatchPanel.jsx', '../src/components/BatchPanel.jsx'],
  ['src/components/FilmLab.jsx', '../src/components/FilmLab.jsx'],
];

for (const [nome, percorso] of FILES) {
  test(`${nome}: nessun URL di blob nasce dentro un attributo JSX`, () => {
    const sorgente = readFileSync(new URL(percorso, import.meta.url), 'utf8');
    assert.doesNotMatch(
      sorgente,
      /(?:src|href|poster)=\{URL\.createObjectURL\(/,
      `${nome} crea un blob URL dentro il render: uno nuovo a ogni ridisegno, nessuno revocato`,
    );
  });
}
