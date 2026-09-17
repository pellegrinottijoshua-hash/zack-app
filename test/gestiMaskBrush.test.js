import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Prova DI SORGENTE (come in `home.test.js`, `impianto.test.js`, ...): il
 * difetto del Nuovo Problema 4 vive TUTTO dentro `MaskBrush.jsx`, e nessuna
 * combinazione di `accumula`/`applica` in Node lo vede — `node --test
 * test/gesti.test.js` restava 13/13 verde con `MaskBrush.jsx` che tornava a
 * pinzare per EVENTO invece che per gesto, perché il modulo puro fa
 * esattamente quello che gli si chiede: è la CHIAMATA sbagliata a mancare,
 * non la matematica.
 *
 * Niente jsdom (regola del giro): si legge il testo del file, non lo si
 * monta. La prova è volutamente stretta — cerca la forma della chiamata nel
 * ramo a due dita di `move`, non il comportamento — perché è tutto ciò che
 * si può controllare senza un DOM vero.
 */
const SORGENTE = readFileSync(new URL('../src/components/MaskBrush.jsx', import.meta.url), 'utf8');

/** Il corpo di `move`, dal suo `const move = (ev) => {` al prossimo gestore. */
function corpoDiMove(sorgente) {
  const inizio = sorgente.indexOf('const move = (ev) => {');
  assert.notEqual(inizio, -1, 'move non c’è più in MaskBrush.jsx sotto questo nome');
  const fine = sorgente.indexOf('const end = (ev) => {', inizio);
  assert.notEqual(fine, -1, 'non trovo la fine di move (il gestore end che la segue)');
  return sorgente.slice(inizio, fine);
}

/** Il corpo di `begin`, dal suo `const begin = (ev) => {` al prossimo gestore. */
function corpoDiBegin(sorgente) {
  const inizio = sorgente.indexOf('const begin = (ev) => {');
  assert.notEqual(inizio, -1, 'begin non c’è più in MaskBrush.jsx sotto questo nome');
  const fine = sorgente.indexOf('const move = (ev) => {', inizio);
  assert.notEqual(fine, -1, 'non trovo la fine di begin (il gestore move che la segue)');
  return sorgente.slice(inizio, fine);
}

/** Il corpo di `end`, dal suo `const end = (ev) => {` al prossimo simbolo di primo livello. */
function corpoDiEnd(sorgente) {
  const inizio = sorgente.indexOf('const end = (ev) => {');
  assert.notEqual(inizio, -1, 'end non c’è più in MaskBrush.jsx sotto questo nome');
  const fine = sorgente.indexOf('const undo = () => {', inizio);
  assert.notEqual(fine, -1, 'non trovo la fine di end (il gestore undo che la segue)');
  return sorgente.slice(inizio, fine);
}

test('Nuovo Problema 4: il ramo a due dita di move accumula grezzo prima di pinzare', () => {
  const corpo = corpoDiMove(SORGENTE);
  assert.match(
    corpo,
    /vistaGrezza\.current\s*=\s*accumula\(/,
    'move non accumula più su vistaGrezza.current: il pizzico rischia di tornare a pinzare per EVENTO (Critico 2, giro 1)',
  );
});

test('Nuovo Problema 4: move pinza vistaGrezza.current, non il delta grezzo del solo evento', () => {
  const corpo = corpoDiMove(SORGENTE);
  assert.match(
    corpo,
    /setVista\(\s*applica\(\s*vistaGrezza\.current/,
    'applica non legge più vistaGrezza.current: se legge m o vista invece, il clamp è tornato a essere per evento',
  );
});

test('Nuovo Problema 4: ogni chiamata ad applica nel ramo a due dita legge vistaGrezza.current, non altro', () => {
  const corpo = corpoDiMove(SORGENTE);
  // Il difetto reale, così come si presentava prima del giro 1 (e nella
  // variante che il committente ha misurato nel browser): `applica`
  // chiamata su `vista`, su una copia locale (`v`), o direttamente sul
  // delta `m` del singolo evento — qualunque primo argomento diverso da
  // `vistaGrezza.current` è di nuovo un clamp per EVENTO, non per gesto.
  const chiamate = [...corpo.matchAll(/applica\(\s*([A-Za-z0-9_.]+)\s*,/g)].map((m) => m[1]);
  assert.ok(chiamate.length > 0, 'nessuna chiamata ad applica nel ramo a due dita di move');
  for (const primoArgomento of chiamate) {
    assert.equal(
      primoArgomento,
      'vistaGrezza.current',
      `applica chiamata su \`${primoArgomento}\` invece che su vistaGrezza.current: è di nuovo un clamp per evento`,
    );
  }
});

// --- Trovato verificando la Ruling nel browser (Giro di correzione 2) -----
//
// `.brush-stage[data-zoom]` (styles.css) fa dipendere l'ALTEZZA del palco
// stesso da `zoom > 1` — misurato: 182px sotto 1x, 550px sopra, sullo
// stesso telefono. Leggere `stageRef.current.clientHeight` dal vivo a ogni
// `pointermove` pinza lo spostamento su un palco che PUÒ cambiare misura a
// META' GESTO (un pizzico che attraversa lo zero attorno a 1x): misurato nel
// browser, uno spostamento legittimo di -8px a 1x veniva azzerato perché il
// passo precedente aveva lasciato `data-zoom` acceso, portando il palco letto
// a 550 — margine verticale negativo, pinzato a zero da `Math.max(0, ...)`.
// Il palco va catturato UNA VOLTA all'inizio del gesto, come `vistaGrezza`.
// Nessuna combinazione di `gesti.js` in Node lo vede: la CSS non esiste li'.

test('il palco per il pinzaggio si cattura UNA VOLTA all’inizio del gesto a due dita', () => {
  const corpo = corpoDiBegin(SORGENTE);
  assert.match(
    corpo,
    /palcoCatturato\.current\s*=/,
    'begin non cattura più palcoCatturato: limiti() rischia di leggere il palco dal vivo a ogni evento, e .brush-stage[data-zoom] lo cambia a metà gesto',
  );
});

test('limiti() preferisce il palco catturato a quello letto dal vivo', () => {
  const inizio = SORGENTE.indexOf('const limiti = () => {');
  assert.notEqual(inizio, -1, 'limiti non c’è più in MaskBrush.jsx sotto questo nome');
  const fine = SORGENTE.indexOf('/**', inizio + 10);
  const corpo = SORGENTE.slice(inizio, fine === -1 ? inizio + 600 : fine);
  assert.match(
    corpo,
    /palcoCatturato\.current\s*\|\|/,
    'limiti() non antepone più palcoCatturato.current alla misura dal vivo: torna il palco che cambia a metà gesto',
  );
});

test('il palco catturato si azzera quando il gesto a due dita finisce', () => {
  const corpo = corpoDiEnd(SORGENTE);
  assert.match(
    corpo,
    /palcoCatturato\.current\s*=\s*null/,
    'end non azzera più palcoCatturato: il prossimo gesto ripartirebbe da un palco vecchio invece di ricatturarlo',
  );
});
