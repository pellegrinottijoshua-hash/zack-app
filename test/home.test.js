import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ordineDellaFila, SERVICES, getService } from '../src/services.js';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('l’ordine della fila è quello deciso, e scontorna sta in mezzo', () => {
  const ids = ordineDellaFila().map((s) => s.id);
  assert.deepEqual(ids, ['vettorializza', 'immagine', 'scontorna', 'video', 'vocale', 'effetti']);
  // Sei oggi, sette il giorno che l'editor di testo esiste: allora scontorna
  // sarà il quarto di sette, cioè esattamente il centro. Con sei è il terzo,
  // e va bene lo stesso — quello che conta è che immagine gli stia a sinistra
  // e video a destra, che è il disegno.
  const i = ids.indexOf('scontorna');
  assert.equal(ids[i - 1], 'immagine');
  assert.equal(ids[i + 1], 'video');
});

test('Brain non sta nella fila: sta in alto a sinistra, sempre', () => {
  assert.equal(ordineDellaFila().some((s) => s.id === 'brain'), false);
  // Ma esiste ancora come servizio: il suo cerchio è solo altrove.
  assert.equal(getService('brain').ready, true);
});

test('nessun servizio sparisce dal prodotto', () => {
  // ⚠️ La regola che B2 ha insegnato: ripulire non deve chiudere porte.
  //
  // Giro di correzione 1, Critical 1: questo test aggiungeva 'brain' A MANO
  // all'insieme che poi controlla — non poteva cadere per Brain in nessun
  // caso, nemmeno cancellando il suo bottone (il controller l'ha fatto, e la
  // suite è restata verde). La sua presenza qui ora dipende dalla STESSA
  // prova di sorgente del test qui sotto: se il bottone sparisce o si
  // scollega da `apriServizio('brain')`, 'brain' non entra più in `nella`, e
  // questo loop cade per lui come per chiunque altro.
  const brainHaBottone = /brain-tasto[\s\S]{0,450}?onClick=\{\(\) => apriServizio\('brain'\)\}/.test(APP);
  const nella = new Set(ordineDellaFila().map((s) => s.id));
  if (brainHaBottone) nella.add('brain');
  for (const s of SERVICES) assert.ok(nella.has(s.id), `${s.id} non è raggiungibile da nessuna parte`);
});

// Prova DI SORGENTE (Critical 1, giro di correzione 1): dal Task 8 Brain non
// sta più in FILA — la sua unica porta è questo bottone, in `.main`, senza
// nessuna guardia attorno. Il controller l'ha cancellato e la suite e'
// restata verde: questa prova legge il sorgente e pretende che ci sia,
// agganciato al gesto giusto.
test('il tasto di Brain esiste ed è agganciato ad apriServizio(\'brain\')', () => {
  const i = APP.indexOf('brain-tasto');
  assert.notEqual(i, -1, 'il tasto di Brain non c’è più in App.jsx: Brain è diventato irraggiungibile');
  const finestra = APP.slice(i, i + 500);
  assert.match(
    finestra,
    /onClick=\{\(\) => apriServizio\('brain'\)\}/,
    'il tasto di Brain non chiama più apriServizio(\'brain\'): il gesto è scollegato dal servizio',
  );
});

// Prova DI SORGENTE (Important 4, giro di correzione 1): styles.css (§ 8)
// dice che ogni cerchio della barra tiene un nome visibile SEMPRE sul
// telefono, perché su un touch `title` non compare mai — e nomina proprio
// Brain come il caso che l'aveva insegnato. Tolto dalla fila, il suo cerchio
// portava solo `title`/`aria-label`: nessun modo di leggerlo col dito.
test('Brain ha un nome visibile anche sul telefono, non solo aria-label/title', () => {
  const i = APP.indexOf('brain-tasto');
  assert.notEqual(i, -1, 'il tasto di Brain non c’è più in App.jsx');
  const fine = APP.indexOf('</button>', i);
  assert.notEqual(fine, -1, 'il bottone di Brain non si chiude più con </button>');
  const finestra = APP.slice(i, fine);
  assert.match(
    finestra,
    /<span className="brain-nome">\{t\('tool\.brain\.label'\)\}<\/span>/,
    'il tasto di Brain non ha più un nome visibile in JSX: su un touch resta senza etichetta',
  );
});

test('non si dichiara un cerchio per un servizio che non esiste', () => {
  // L'«editor di testo» ha il posto prenotato nell'ordine, ma finché non c'è
  // il servizio non c'è il cerchio: un cerchio che si accende e non fa niente
  // è il difetto del righello del 2026-09-04.
  for (const s of ordineDellaFila()) assert.ok(s?.id, 'la fila nomina un servizio che non esiste');
});

test('video dice che arriva, e non finge', () => {
  assert.equal(getService('video').ready, false);
});

// Prova DI SORGENTE (come in `muro.test.js`): App.jsx non si monta in prova
// (niente DOM), quindi qui si legge cosa c'è scritto nel file, come già fa
// `test/pelle.test.js` per i tre Critici del Giro 1.
test('se il servizio aperto sparisce dalla fila, App.jsx ripiega su scontorna', () => {
  /*
   * ⚠️ Decisione del committente (H1-bis, 2026-09-15): se il muro si accende
   * (o l'abbonamento scade) mentre si è su un servizio da abbonamento,
   * `mostraInFila` lo toglie dalla barra — e nessun cerchio resterebbe
   * acceso. App.jsx deve ripiegare su `scontorna`, non restare su una
   * schermata che nella fila non ha più nessuna porta d'ingresso.
   */
  const i = APP.indexOf('mostraInFila(DESCRITTORI[tool]');
  assert.notEqual(i, -1, 'App.jsx non consulta più `mostraInFila` per il servizio aperto: il ripiego è scollegato dalla fila');
  const finestra = APP.slice(i, i + 300);
  assert.match(
    finestra,
    /apriServizio\('scontorna'\)/,
    'quando il servizio sparisce dalla fila, App.jsx non ripiega più su scontorna',
  );
});

// Prova DI SORGENTE (Task 9): niente browser qui — legge la pianta dello
// studio direttamente da styles.css e pretende che sia una FILA in cima,
// non più una colonna a sinistra.
test('sul desktop i servizi stanno in alto, non in colonna a sinistra', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const i = CSS.indexOf('@media (min-width: 761px)');
  assert.notEqual(i, -1, 'manca il blocco della pianta dello studio');
  const blocco = CSS.slice(i, i + 2000);
  assert.match(blocco, /\.toolrail\s*\{[^}]*flex-direction:\s*row/s, 'la barra non è una fila in alto');
  assert.match(blocco, /\.main\s*\{[^}]*grid-template-areas/s, 'lo studio non ha una pianta');
});
