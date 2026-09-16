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

/*
 * ⚠️ I4 (revisione, giro 1): `CSS.indexOf('@media (min-width: 761px)')`
 * cadeva DENTRO il commento che sta appena sopra il blocco vero — quel
 * commento nomina la media query fra apici per dire «deve restare il primo
 * del file», e la stessa stringa letterale ci finisce prima della regola
 * reale (257 caratteri prima, misurato). Innocuo qui perché la finestra da
 * 2000 caratteri arriva comunque al blocco vero, ma l'ancora prendeva il
 * commento scritto per proteggerla, non la regola. `estraiBloccoBilanciato`
 * cerca la media query seguita da `{` (il commento la fa seguire da un
 * apice, mai da una graffa) e poi bilancia le parentesi graffe, cosi' non
 * dipende da una finestra a lunghezza fissa.
 */
function estraiBloccoBilanciato(css, aperturaRegex) {
  const m = aperturaRegex.exec(css);
  if (!m) return null;
  let i = m.index + m[0].length;
  let profondita = 1;
  let j = i;
  while (profondita > 0 && j < css.length) {
    if (css[j] === '{') profondita++;
    else if (css[j] === '}') profondita--;
    j++;
  }
  return css.slice(i, j - 1);
}

// Prova DI SORGENTE (Task 9): niente browser qui — legge la pianta dello
// studio direttamente da styles.css e pretende che sia una FILA in cima,
// non più una colonna a sinistra.
test('sul desktop i servizi stanno in alto, non in colonna a sinistra', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocco = estraiBloccoBilanciato(CSS, /@media \(min-width: 761px\)\s*\{/);
  assert.notEqual(blocco, null, 'manca il blocco della pianta dello studio');
  assert.match(blocco, /\.toolrail\s*\{[^}]*flex-direction:\s*row/s, 'la barra non è una fila in alto');
  assert.match(blocco, /\.main\s*\{[^}]*grid-template-areas/s, 'lo studio non ha una pianta');
});

// Prova DI SORGENTE (Important 2, giro di correzione 1): il controller ha
// dimostrato che si può cancellare `.brain-tasto { grid-area: brain }`,
// `.stage { grid-area: tela }` o `.rail { grid-area: pannello }` — una alla
// volta — lasciando la suite intera verde (704/704). Ognuna delle tre righe
// qui sotto va rotta apposta (cancellata dal blocco) per vedere IL TEST
// CADERE prima di essere ripristinata: quella è la prova che ora contano.
test('la pianta piazza davvero Brain, la tela e il pannello (non solo la fila)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocco = estraiBloccoBilanciato(CSS, /@media \(min-width: 761px\)\s*\{/);
  assert.notEqual(blocco, null, 'manca il blocco della pianta dello studio');
  assert.match(
    blocco,
    /\.brain-tasto\s*\{[^}]*grid-area:\s*brain/s,
    'Brain non è più piazzato dalla pianta: torna a "position: absolute; top: 8px; left: 8px", dentro la fila dei servizi',
  );
  assert.match(
    blocco,
    /\.stage\s*\{[^}]*grid-area:\s*tela/s,
    'la tela non è più piazzata dalla pianta',
  );
  assert.match(
    blocco,
    /\.rail\s*\{[^}]*grid-area:\s*pannello/s,
    'il pannello non è più piazzato dalla pianta',
  );
});

// Prova DI SORGENTE (C1, giro di correzione 1): c'era un secondo
// `@media (max-width: 940px)` che riscriveva `.main { grid-template-columns
// }` per la STESSA fascia (761-940px) governata dalla pianta qui sopra —
// stessa specificità, e a vincere era chi stava più in basso nel file (la
// pianta), che ci rimetteva la traccia da 300px per il pannello: misurato,
// il canvas a 800px tornava a 430px invece dei 610/744px che dava quella
// regola da sola. La fascia doppia è stata chiusa restringendo quel blocco
// al solo telefono (`max-width: 760px`, dove era già ridondante con la
// riscrittura completa di `.main` più sotto): niente più due regole per la
// stessa larghezza.
test('non c’è più un secondo `.main` che si contende la fascia 761-940px (C1)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(
    CSS,
    /@media \(max-width: 940px\)/,
    'è tornato un `@media (max-width: 940px)`: la fascia 761-940px ha di nuovo due regole per `.main`, e a vincere decide l’ordine nel file, non una scelta',
  );
});

// Prova DI SORGENTE (Ruling B, giro di correzione 1): misurato nel browser
// PRIMA di questa riga — dentro un cerchio da 56px con l'icona e (per
// Immagine e Video, che portano anche un prezzo/«presto») una terza riga
// nella stessa colonna flessibile, il nome arrivava ad altezza 0
// (`getBoundingClientRect().height === 0`): `.tool-name` ha `overflow:
// hidden` per i puntini di sospensione, e per un figlio flessibile con
// overflow diverso da `visible` il minimo automatico è zero — è il primo a
// sparire quando lo spazio non basta. Il nome ora esce dal flusso della
// colonna (`position: absolute`) e non compete più per lo spazio: la prova
// controlla che resti fuori dal flusso, non che «esista» soltanto (un
// `position: absolute` tolto da qui rimette il nome dentro il cerchio senza
// cambiare nient'altro che il test debba notare).
test('il nome della fila esce dal cerchio, non ci compete più dentro (Ruling B)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocco = estraiBloccoBilanciato(CSS, /@media \(min-width: 761px\)\s*\{/);
  assert.notEqual(blocco, null, 'manca il blocco della pianta dello studio');
  assert.match(
    blocco,
    /\.toolrail \.tool-name\s*\{[^}]*position:\s*absolute/s,
    'il nome sotto i cerchi è tornato dentro il flusso della colonna: torna a competere per lo spazio con icona e prezzo/«presto», e su Immagine/Video sparisce di nuovo (altezza 0)',
  );
});
