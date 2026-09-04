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

test('«filmato» non compare piu’ nelle liste di esclusione', () => {
  /*
   * Erano tre liste identiche piu' un Set, e tenerle in sincronia a mano e'
   * gia' fallito una volta: `filmato` rimasto fuori mentre veniva aggiunto
   * altrove, e chi apriva Filmato si trovava sopra il nome di un JPG e il
   * tasto Zack, che avrebbe scontornato l'immagine mentre lui guardava una
   * clip (il commento e' ancora in App.jsx a raccontarlo).
   */
  const liste = APP.match(/\[[^\]]*'filmato'[^\]]*\]\.includes\(tool\)/g) || [];
  assert.deepEqual(liste, [], `«filmato» sta ancora in ${liste.length} lista/e di esclusione`);
});

test('chi ha un descrittore passa dall’impianto', () => {
  // Una risposta sola alla domanda «questo servizio passa dall'impianto?».
  // Due risposte divergono al primo servizio nuovo: e' quello che aveva
  // lasciato `filmato` fuori da una lista.
  assert.match(APP, /DESCRITTORI\[tool\]/, 'il filmato non entra ancora in <Piano>');
});

test('la libreria e la barra di stato seguono l’impianto, non un id', () => {
  /*
   * Erano `tool !== 'scontorna'`: dicevano «tranne lo scontorno» e
   * intendevano «tranne chi passa dall'impianto». Con Filmato dentro
   * l'impianto, quelle due comparivano sotto la sua tela — la barra di stato
   * col nome di un file e «Scarica tutto» della libreria, cioe' esattamente
   * cio' che l'impianto toglie di mezzo.
   */
  assert.doesNotMatch(
    APP,
    /tool !== 'scontorna'/,
    'la libreria o la barra di stato guardano ancora un id invece del descrittore',
  );
});
