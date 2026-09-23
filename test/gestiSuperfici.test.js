import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Prove DI SORGENTE (come `gestiMaskBrush.test.js`): Brain e la home libera
 * (Task 11) cablano il gesto di `engine/gesti.js` in due componenti React,
 * e niente jsdom per regola. La matematica sta in `gesti.test.js`; qui si
 * controlla solo la FORMA dei punti in cui un cablaggio sbagliato chiude
 * una porta senza che nessuna prova di Node lo veda. Strette apposta: ognuna
 * nomina il difetto che prende.
 */
const BRAIN = readFileSync(new URL('../src/components/Brain.jsx', import.meta.url), 'utf8');
const RITAGLIO = readFileSync(new URL('../src/landing/Ritaglio.jsx', import.meta.url), 'utf8');
const STILI = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

/**
 * Il corpo di una funzione dichiarata `function nome(`: dalla dichiarazione
 * alla graffa che la chiude alla STESSA rientranza (il formato di Prettier).
 */
function corpo(sorgente, nome) {
  const inizio = sorgente.indexOf(`function ${nome}(`);
  assert.notEqual(inizio, -1, `${nome} non c'e' piu' sotto questo nome`);
  const rientro = sorgente.slice(sorgente.lastIndexOf('\n', inizio) + 1, inizio);
  const fine = sorgente.indexOf(`\n${rientro}}\n`, inizio);
  assert.notEqual(fine, -1, `non trovo la fine di ${nome}`);
  return sorgente.slice(inizio, fine + rientro.length + 2);
}

// --- Brain ------------------------------------------------------------------

test('Brain: il secondo dito MOLLA l\'oggetto preso prima di ingrandire', () => {
  // Il brief, ⚠️: senza, l'oggetto vola via seguendo il centro delle dita.
  const c = corpo(BRAIN, 'ditoAppoggiato');
  assert.match(
    c,
    /if \(!dueDita\(gesto\.current\)\) return;\s*(?:\/\/[^\n]*\n\s*)*preso\.current = null;/,
    'ditoAppoggiato non azzera preso.current quando arriva il secondo dito',
  );
});

test('Brain: prendi non riprende l\'oggetto sotto il secondo dito', () => {
  // `prendi` gira DOPO la cattura sul piano: se non si ferma, il secondo dito
  // che atterra su un oggetto lo riprende appena mollato.
  assert.match(corpo(BRAIN, 'prendi'), /^function prendi\(e, id\) \{\s*(?:\/\/[^\n]*\n\s*)*if \(dueDita\(gesto\.current\)\) return;/);
});

test('Brain: le dita si contano in fase di CATTURA sul piano', () => {
  // In fase di bolla l'oggetto sotto il dito decide prima del piano, e non
  // puo' sapere che e' il secondo.
  assert.match(BRAIN, /onPointerDownCapture=\{ditoAppoggiato\}/);
  assert.match(BRAIN, /onPointerMove=\{ditoMosso\}/);
  assert.match(BRAIN, /onPointerUp=\{ditoAlzato\}/);
  assert.match(BRAIN, /onPointerCancel=\{ditoAlzato\}/);
});

test('Brain: il gesto scrive `vista` con ancora, lo stesso stato della rotella', () => {
  assert.match(corpo(BRAIN, 'ditoMosso'), /setVista\(\s*ancora\(/, 'il pizzico non scrive piu\' vista via ancora');
  assert.match(corpo(BRAIN, 'ditoMosso'), /if \(!m\) \{\s*trascina\(e\);/, 'un dito solo non trascina piu\' l\'oggetto');
});

test('Brain: la rotella resta com\'e\' (sul desktop e\' il gesto giusto)', () => {
  // Il testo di `rotella` al commit fef964c, parola per parola.
  const atteso = [
    'function rotella(e) {',
    '    if (!e.ctrlKey && !e.metaKey) {',
    '      setVista((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));',
    '      return;',
    '    }',
    '    setVista((v) => ({ ...v, z: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.z - e.deltaY * 0.002)) }));',
    '  }',
  ].join('\n');
  assert.ok(BRAIN.includes(atteso), 'rotella e\' cambiata');
  assert.match(BRAIN, /onWheel=\{rotella\}/);
});

test('Brain: `touch-action: none` resta sul piano', () => {
  const blocco = /\.brain-piano \{[^}]*\}/.exec(STILI);
  assert.ok(blocco, '.brain-piano non c\'e\' piu\' in styles.css');
  assert.match(blocco[0], /touch-action: none;/);
});

// --- La home libera ---------------------------------------------------------

test('home: il modulo si importa con l\'alias del brief (giu/muovi sono gia\' presi)', () => {
  assert.ok(
    RITAGLIO.includes("import { nuovoGesto, giu as ditoGiu, muove as ditoMuove, su as ditoSu, dueDita } from '../engine/gesti.js';"),
  );
});

test('home: un dito corregge, il secondo ferma il tratto', () => {
  const c = corpo(RITAGLIO, 'ditoSulFile');
  assert.match(c, /if \(!dueDita\(g\)\) \{\s*giu\(e, l\);\s*return;\s*\}/, 'il primo dito non passa piu\' al tratto');
  assert.match(c, /trascino\.current = null;/, 'il secondo dito non ferma il tratto in corso: lascerebbe una riga');
  assert.match(corpo(RITAGLIO, 'ditoSulFileMosso'), /if \(!m\) \{\s*muovi\(e, l\);/);
});

test('home: il pizzico scrive `zoom[l.id]`, lo stesso stato dei pulsanti + e −', () => {
  assert.match(corpo(RITAGLIO, 'ditoSulFileMosso'), /setZoom\(\(s\) => \(\{ \.\.\.s, \[l\.id\]: v\.z \}\)\)/);
  assert.match(RITAGLIO, /const cambiaZoom = \(id, d\) =>\s*setZoom\(/);
});

test('home: ingrandire ingrandisce il DISEGNO, non la scatola', () => {
  // Misurato sul telefono prima del Task 11: a 2× e 3× la scatola passava da
  // 337 a 674 e 1011 px e l'immagine restava 150×150 — `max-height` della
  // colonna e `object-fit: contain` la rimpicciolivano di nuovo.
  const inizio = RITAGLIO.indexOf('const stileZoom = (id) => {');
  assert.notEqual(inizio, -1, 'stileZoom non c\'e\' piu\'');
  const s = RITAGLIO.slice(inizio, RITAGLIO.indexOf('\n  };', inizio));
  assert.match(s, /width: b \? `\$\{b\.w \* zz\}px`/, 'la larghezza non e\' piu\' la base disegnata per lo zoom');
  assert.match(s, /maxHeight: 'none'/, 'il tetto d\'altezza resta acceso a zoom > 1: il disegno non cresce');
});

test('home: il tocco si converte sul rettangolo disegnato', () => {
  assert.match(corpo(RITAGLIO, 'suImmagine'), /rettangoloDisegnato\(canvas\.getBoundingClientRect\(\)/);
  assert.match(corpo(RITAGLIO, 'pennellata'), /rettangoloDisegnato\(cv\.getBoundingClientRect\(\)/);
});

test('home: `touch-action: none` resta sulla tela', () => {
  assert.match(RITAGLIO, /touchAction: 'none',/);
});
