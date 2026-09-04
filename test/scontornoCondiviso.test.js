import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * L'app e la home devono decidere allo STESSO MODO se serve il modello.
 *
 * Il difetto che questo test impedisce di ripetere (2026-09-04): il contratto
 * UX §5 dichiarava «la home e lo strumento nell'app sono lo stesso
 * componente», e non lo erano. `ritaglio.js` viveva in `src/landing/`, quindi
 * la scorciatoia da venti millisecondi esisteva solo per chi arrivava dalla
 * home. Nello studio ogni scontorno scendeva ai 175 MB del modello — e il
 * committente lo ha riferito come «l'app e' lenta», che e' il sintomo giusto
 * di una causa che nessun test guardava.
 *
 * Si legge il sorgente perche' il difetto NON e' in una funzione: e' in chi la
 * chiama. Stessa ragione, e stesso metodo, di `test/sovrapposizioni.test.js`.
 */
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const HOME = readFileSync(new URL('../src/landing/Ritaglio.jsx', import.meta.url), 'utf8');

test('lo studio importa il ritaglio senza modello dal motore', () => {
  assert.match(
    APP,
    /import\s*\{[^}]*\britaglioIstantaneo\b[^}]*\}\s*from\s*'\.\/engine\/ritaglio\.js'/,
    "App.jsx non importa `ritaglioIstantaneo`: lo scontorno dell'app scende sempre al modello",
  );
  assert.match(
    APP,
    /import\s*\{[^}]*\bpixelDaFile\b[^}]*\}\s*from\s*'\.\/engine\/ritaglio\.js'/,
    'App.jsx non legge i pixel prima di chiamare il modello',
  );
});

test('la home importa lo stesso modulo, dallo stesso posto', () => {
  assert.match(
    HOME,
    /from\s*'\.\.\/engine\/ritaglio\.js'/,
    'la home ha una sua copia della decisione: e’ il difetto di partenza',
  );
});

test('nessuno importa piu’ il modulo dalla vecchia cartella', () => {
  for (const [nome, sorgente] of [
    ['App.jsx', APP],
    ['Ritaglio.jsx', HOME],
  ]) {
    assert.doesNotMatch(
      sorgente,
      /landing\/ritaglio\.js/,
      `${nome} punta ancora a src/landing/ritaglio.js, che non esiste piu’`,
    );
  }
});

test('lo studio prova il fondo piatto PRIMA di svegliare il modello', () => {
  // L'ordine e' il punto: chiamare `ritaglioIstantaneo` dopo `engine.cutout`
  // farebbe passare i due test qui sopra senza far guadagnare un millisecondo.
  const iIstante = APP.indexOf('ritaglioIstantaneo(');
  const iModello = APP.indexOf('engine.cutout(');
  assert.notEqual(iIstante, -1, '`ritaglioIstantaneo` non viene mai chiamato in App.jsx');
  assert.notEqual(iModello, -1, '`engine.cutout` non viene mai chiamato in App.jsx');
  assert.ok(
    iIstante < iModello,
    'il modello viene chiamato prima della prova senza modello: la scorciatoia non serve a niente',
  );
});

test('il pennello si rimonta quando cambia strumento', () => {
  /*
   * Il difetto (2026-09-04, riferito dal committente come «il righello non
   * funziona»): `MaskBrush` legge lo strumento d'ingresso con
   * `useState(modoIniziale || 'erase')`, e `useState` guarda il valore SOLO
   * al montaggio. `App.jsx` montava `<MaskBrush>` senza `key`, quindi non lo
   * rimontava mai.
   *
   * Risultato: premere il cerchio del righello mentre il pennello e' gia'
   * aperto ACCENDEVA il cerchio — `aria-pressed` legge `modoPennello` — e non
   * cambiava lo strumento. Un comando che si illumina e non fa niente e' la
   * definizione esatta di «rotto», e la matematica del righello era giusta e
   * testata da dodici test: il ponte non passava.
   *
   * La `key` e' la cura giusta e non un rattoppo: cambiare strumento vuol dire
   * ricominciare il gesto, e lo stato interno del pennello precedente non ha
   * niente da dire al nuovo.
   */
  const i = APP.indexOf('<MaskBrush');
  assert.notEqual(i, -1, '<MaskBrush> non si trova piu’ in App.jsx');
  // La finestra tiene la `key` ancorata a QUESTO elemento invece di cercarla
  // in tutto il file: 600 caratteri stanno dentro i suoi attributi e non
  // arrivano al successivo. Larga abbastanza da contenere il commento che
  // spiega la `key` — con 200 il test bocciava la riga giusta.
  assert.match(
    APP.slice(i, i + 600),
    /key=\{modoPennello\}/,
    'senza `key={modoPennello}` il pennello resta sullo strumento con cui e’ stato aperto',
  );
});
