import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DESCRITTORI } from '../src/servizi/index.js';

/*
 * L'impianto legge il descrittore, non consulta liste di `id`.
 *
 * Il difetto che questo test impedisce di ripetere: il comportamento sparso
 * in `[...].includes(tool)` dentro App.jsx. Una lista dimenticata non solleva
 * niente — si vede aprendo il servizio, ed e' gia' costato una volta.
 */
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('App.jsx costruisce gli strumenti dal descrittore', () => {
  assert.match(APP, /strumentiVisibili\(/, 'gli strumenti sono ancora scritti a mano dentro App.jsx');
});

test('ogni strumento dichiarato ha un gesto che lo esegue', () => {
  /*
   * Uno strumento dichiarato senza il suo gesto compare come cerchio e non fa
   * niente al clic: e' esattamente il difetto del righello del 2026-09-04, un
   * comando che si illumina e non risponde.
   *
   * Si legge il sorgente perche' i gesti sono chiusure dentro App.jsx e non
   * si possono importare: quello che si puo' controllare e' che il loro nome
   * compaia nella mappa.
   */
  const inizio = APP.indexOf('const GESTI');
  assert.notEqual(inizio, -1, 'la mappa GESTI non esiste in App.jsx');
  const mappa = APP.slice(inizio, inizio + 1200);
  for (const d of Object.values(DESCRITTORI)) {
    for (const s of d.strumenti) {
      assert.match(mappa, new RegExp(`\\b${s.id}\\b`), `manca il gesto per «${s.id}» (${d.id})`);
    }
  }
});
