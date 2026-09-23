import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  impilaRisultato,
  vaIndietro,
  vaAvanti,
  riduciStoria,
  STORIA_VUOTA,
  TETTO,
} from '../src/engine/storia.js';

/*
 * Le due pile di «indietro» e «avanti», isolate da React (Critico 1 della
 * revisione del Task 6, 2026-09-16).
 *
 * Ogni prova dichiara da quali pile parte — storia e futuro, esplicite — così
 * chi legge non deve indovinare lo stato di partenza: è la lezione B2 numero
 * 2, e qui vale doppio perché la botola del Critico 1 stava proprio in una
 * combinazione di pile che nessuna prova aveva mai scritto.
 */

test('impilare: un risultato nuovo fa crescere la storia e svuota il futuro', () => {
  const storia = ['R1'];
  const futuro = ['R2']; // un vecchio "avanti" ancora in piedi: deve sparire
  const { storia: nuovaStoria, futuro: nuovoFuturo } = impilaRisultato(storia, 'R1prima');
  assert.deepEqual(nuovaStoria, ['R1', 'R1prima']);
  assert.deepEqual(nuovoFuturo, []);
  // Le pile di partenza non si mutano: la funzione è pura.
  assert.deepEqual(storia, ['R1']);
  assert.deepEqual(futuro, ['R2']);
});

test('impilare: un risultato attuale che non c\'è (null) non si impila — Critico 1', () => {
  // Il caso che ha aperto la botola: foto sul piano, primo scontorno mai
  // fatto. `risultatoDiPrima` è `null` perché non esiste ancora nessun
  // risultato prima di questo. Impilarlo comunque costruirebbe una storia
  // che porta a `risultato: null`, con la colonna intera nascosta.
  const storia = [];
  const { storia: nuovaStoria, futuro: nuovoFuturo } = impilaRisultato(storia, null);
  assert.deepEqual(nuovaStoria, [], 'un null impilato apre la botola del Critico 1');
  assert.deepEqual(nuovoFuturo, []);
});

test('impilare: il tetto resta a otto mosse', () => {
  const storia = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];
  const { storia: nuovaStoria } = impilaRisultato(storia, 'R9');
  assert.deepEqual(nuovaStoria, ['R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']);
  assert.equal(nuovaStoria.length, 8);
});

test('indietro: la cima della storia diventa il risultato attuale, quello di prima va nel futuro', () => {
  const storia = ['R1', 'R2'];
  const futuro = [];
  const mossa = vaIndietro(storia, futuro, 'R3');
  assert.deepEqual(mossa, { storia: ['R1'], futuro: ['R3'], risultato: 'R2' });
});

test('indietro: con la storia vuota non fa nulla — il tasto resta spento, non una botola', () => {
  const mossa = vaIndietro([], ['R1'], 'R2');
  assert.equal(mossa, null);
});

test('indietro: il tetto del futuro resta a otto mosse', () => {
  const futuro = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'];
  const mossa = vaIndietro(['R1'], futuro, 'R2');
  assert.deepEqual(mossa.futuro, ['F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'R2']);
});

test('avanti: esatto contrario di indietro', () => {
  const storia = ['R1'];
  const futuro = ['R3'];
  const mossa = vaAvanti(storia, futuro, 'R2');
  assert.deepEqual(mossa, { storia: ['R1', 'R2'], futuro: [], risultato: 'R3' });
});

test('avanti: con il futuro vuoto non fa nulla', () => {
  const mossa = vaAvanti(['R1'], [], 'R2');
  assert.equal(mossa, null);
});

test('avanti: il tetto della storia resta a otto mosse', () => {
  const storia = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];
  const mossa = vaAvanti(storia, ['R9'], 'R8prima');
  assert.deepEqual(mossa.storia, ['R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R8prima']);
});

test('un giro completo: impila, indietro, avanti torna dov\'era', () => {
  // Il flusso più comune: un solo scontorno, un annulla, un rifai. Prima
  // della correzione, il primo "indietro" qui portava a `risultato: null` e
  // «avanti» spariva con tutta la colonna.
  let storia = [];
  let futuro = [];
  let risultato = null;

  // Primo scontorno: nessun risultato prima, quindi non si impila nulla.
  ({ storia, futuro } = impilaRisultato(storia, risultato));
  risultato = 'R1';
  assert.deepEqual(storia, [], 'il primo scontorno non deve impilare null');

  // Un ritocco: ora sì che c\'è un risultato di prima da impilare.
  ({ storia, futuro } = impilaRisultato(storia, risultato));
  risultato = 'R2';
  assert.deepEqual(storia, ['R1']);

  // Indietro: torna R1, R2 va nel futuro.
  let mossa = vaIndietro(storia, futuro, risultato);
  assert.notEqual(mossa, null);
  ({ storia, futuro, risultato } = mossa);
  assert.deepEqual(storia, []);
  assert.deepEqual(futuro, ['R2']);
  assert.equal(risultato, 'R1');

  // Avanti: torna R2, storia riprende R1.
  mossa = vaAvanti(storia, futuro, risultato);
  assert.notEqual(mossa, null);
  ({ storia, futuro, risultato } = mossa);
  assert.deepEqual(storia, ['R1']);
  assert.deepEqual(futuro, []);
  assert.equal(risultato, 'R2');
});

/*
 * ─── Il riduttore (Bloccante 1 della revisione finale, 2026-09-23) ───────
 *
 * Le prove qui sopra guardano le pile; queste guardano le SEQUENZE che un
 * dito fa davvero sui tasti, passando per lo stesso riduttore che `App.jsx`
 * monta con `useReducer`. Ogni prova dichiara lo stato di partenza. Il
 * difetto che le ha fatte nascere non stava nelle pile: stava nel modo in
 * cui React le chiamava — per questo, in fondo, c'è anche la prova di
 * sorgente su `App.jsx`.
 */

/** Applica una fila di azioni, restituendo ogni stato attraversato. */
function giro(partenza, azioni) {
  const stati = [];
  let stato = partenza;
  for (const azione of azioni) {
    stato = riduciStoria(stato, azione);
    stati.push(stato);
  }
  return stati;
}
const nuovo = (risultato) => ({ tipo: 'nuovo', risultato });
const INDIETRO = { tipo: 'indietro' };
const AVANTI = { tipo: 'avanti' };

test('riduttore: lo stato vuoto è davvero vuoto e congelato', () => {
  assert.deepEqual(STORIA_VUOTA, { risultato: null, storia: [], futuro: [] });
  assert.ok(Object.isFrozen(STORIA_VUOTA));
});

test('riduttore: il primo risultato non impila il null di partenza — annulla resta spento', () => {
  // Partenza dichiarata: piano con un file, nessun risultato mai fatto.
  const [s1] = giro(STORIA_VUOTA, [nuovo('R1')]);
  assert.deepEqual(s1, { risultato: 'R1', storia: [], futuro: [] });
  // «indietro» al primo risultato vero non fa nulla: stesso oggetto, niente render.
  assert.equal(riduciStoria(s1, INDIETRO), s1);
});

test('riduttore: indietro, poi avanti, torna esattamente dov\'era', () => {
  // Partenza dichiarata: due risultati fatti, R1 poi R2.
  const [, s2, s3, s4] = giro(STORIA_VUOTA, [nuovo('R1'), nuovo('R2'), INDIETRO, AVANTI]);
  assert.deepEqual(s2, { risultato: 'R2', storia: ['R1'], futuro: [] });
  assert.deepEqual(s3, { risultato: 'R1', storia: [], futuro: ['R2'] });
  assert.deepEqual(s4, { risultato: 'R2', storia: ['R1'], futuro: [] });
});

test('riduttore: la sequenza misurata dal revisore — Annulla, Rifai, Annulla, Annulla, Rifai', () => {
  // Partenza dichiarata: tre risultati, R1 → R2 → R3. Nessun doppione deve
  // comparire in nessuna pila, e ogni risultato resta raggiungibile.
  const stati = giro(STORIA_VUOTA, [nuovo('R1'), nuovo('R2'), nuovo('R3'), INDIETRO, AVANTI, INDIETRO, INDIETRO, AVANTI]);
  const passi = stati.slice(3);
  assert.deepEqual(passi, [
    { risultato: 'R2', storia: ['R1'], futuro: ['R3'] }, // Annulla
    { risultato: 'R3', storia: ['R1', 'R2'], futuro: [] }, // Rifai
    { risultato: 'R2', storia: ['R1'], futuro: ['R3'] }, // Annulla
    { risultato: 'R1', storia: [], futuro: ['R3', 'R2'] }, // Annulla
    { risultato: 'R2', storia: ['R1'], futuro: ['R3'] }, // Rifai
  ]);
  for (const s of passi) {
    const tutti = [...s.storia, s.risultato, ...s.futuro];
    assert.equal(new Set(tutti).size, tutti.length, `doppione in ${JSON.stringify(s)}`);
    assert.deepEqual([...tutti].sort(), ['R1', 'R2', 'R3'], 'un risultato è diventato irraggiungibile');
  }
});

test('riduttore: indietro-indietro-avanti', () => {
  // Partenza dichiarata: R1 → R2 → R3.
  const stati = giro(STORIA_VUOTA, [nuovo('R1'), nuovo('R2'), nuovo('R3'), INDIETRO, INDIETRO, AVANTI]);
  assert.deepEqual(stati.at(-1), { risultato: 'R2', storia: ['R1'], futuro: ['R3'] });
});

test('riduttore: un risultato nuovo dopo un annulla svuota il futuro', () => {
  // Partenza dichiarata: R1 → R2, poi indietro (futuro = [R2]), poi un ritocco R2bis.
  const stati = giro(STORIA_VUOTA, [nuovo('R1'), nuovo('R2'), INDIETRO, nuovo('R2bis')]);
  assert.deepEqual(stati.at(-1), { risultato: 'R2bis', storia: ['R1'], futuro: [] });
  // E «avanti» ora non fa nulla: il vecchio R2 appartiene a una storia che non c'è più.
  assert.equal(riduciStoria(stati.at(-1), AVANTI), stati.at(-1));
});

test('riduttore: avanti con il futuro vuoto restituisce lo stesso oggetto', () => {
  const [, s2] = giro(STORIA_VUOTA, [nuovo('R1'), nuovo('R2')]);
  assert.equal(riduciStoria(s2, AVANTI), s2);
});

test('riduttore: il tetto — dopo TETTO+3 risultati la storia tiene gli ultimi TETTO', () => {
  assert.equal(TETTO, 8);
  const azioni = Array.from({ length: TETTO + 3 }, (_, i) => nuovo(`R${i + 1}`));
  const fine = giro(STORIA_VUOTA, azioni).at(-1);
  assert.equal(fine.risultato, `R${TETTO + 3}`);
  assert.equal(fine.storia.length, TETTO);
  assert.deepEqual(fine.storia, Array.from({ length: TETTO }, (_, i) => `R${i + 3}`));
  // Tutto indietro fino in fondo, poi tutto avanti: il futuro tocca il tetto e ci resta.
  const giù = giro(fine, Array.from({ length: TETTO + 2 }, () => INDIETRO));
  assert.equal(giù.at(-1).risultato, 'R3');
  assert.equal(giù.at(-1).storia.length, 0);
  assert.equal(giù.at(-1).futuro.length, TETTO);
  const su = giro(giù.at(-1), Array.from({ length: TETTO + 2 }, () => AVANTI));
  assert.equal(su.at(-1).risultato, `R${TETTO + 3}`);
  assert.equal(su.at(-1).futuro.length, 0);
});

test('riduttore: azzera svuota le pile e mette il risultato dato (o nessuno)', () => {
  const [, , s3] = giro(STORIA_VUOTA, [nuovo('R1'), nuovo('R2'), INDIETRO]);
  assert.deepEqual(riduciStoria(s3, { tipo: 'azzera' }), { risultato: null, storia: [], futuro: [] });
  assert.deepEqual(riduciStoria(s3, { tipo: 'azzera', risultato: 'B' }), { risultato: 'B', storia: [], futuro: [] });
});

test('riduttore: un\'azione sconosciuta è un errore, non un silenzio', () => {
  assert.throws(() => riduciStoria(STORIA_VUOTA, { tipo: 'rifai' }), /azione sconosciuta/);
});

/*
 * Prova di sorgente, DICHIARATA stretta: legge `src/App.jsx` come testo e
 * guarda solo come il risultato e le sue pile sono tenuti. Non monta nulla
 * (niente DOM per scelta del progetto) e non prova che i tasti funzionino —
 * quello lo prova il browser, nel rapporto. Prova una cosa sola: che il
 * difetto del Bloccante 1 — tre `useState` e setter annidati negli updater —
 * non possa tornare senza arrossare la suite.
 */
test('App.jsx: risultato e pile sono UN useReducer(riduciStoria), niente setter annidati', () => {
  const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(APP, /useReducer\(\s*riduciStoria\s*,\s*STORIA_VUOTA\s*\)/, 'lo stato deve passare dal riduttore puro');
  for (const nome of ['result', 'history', 'futuro']) {
    assert.doesNotMatch(
      APP,
      new RegExp(`\\[\\s*${nome}\\s*,\\s*set\\w+\\s*\\]\\s*=\\s*useState`),
      `\`${nome}\` è tornato un useState a sé: le tre cose cambiano insieme e devono essere uno stato`,
    );
  }
  for (const setter of ['setResult', 'setHistory', 'setFuturo']) {
    assert.ok(!APP.includes(setter), `${setter} è tornato in App.jsx`);
  }

  // Il corpo delle tre mosse: una sola `mandaStoria`, nessun updater `set…((`.
  const corpo = (firma) => {
    const i = APP.indexOf(firma);
    assert.notEqual(i, -1, `manca ${firma} in App.jsx`);
    return APP.slice(i, APP.indexOf('\n  }', i) + 4);
  };
  const mosse = {
    'function undoResult()': "mandaStoria({ tipo: 'indietro' })",
    'function redoResult()': "mandaStoria({ tipo: 'avanti' })",
  };
  for (const [firma, atteso] of Object.entries(mosse)) {
    const c = corpo(firma);
    assert.ok(c.includes(atteso), `${firma} deve essere la sola mossa ${atteso}`);
    assert.doesNotMatch(c, /\bset[A-Z]\w*\(\s*\(/, `${firma}: un setter con updater è tornato dentro la mossa`);
  }
  assert.match(
    APP,
    /const pushResult = \(next\) => mandaStoria\(\{ tipo: 'nuovo', risultato: next \}\);/,
    'pushResult deve essere una sola mossa sul riduttore',
  );
});
