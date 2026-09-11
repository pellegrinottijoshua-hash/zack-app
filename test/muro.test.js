import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { puoiLavorare } from '../src/engine/licenza.js';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

/*
 * Il muro chiude gli STRUMENTI. Mai i file di chi li ha fatti.
 *
 * E' la promessa della spec § 3.5, ed e' quella che si rompe per prima
 * mettendo il muro nel posto sbagliato: avvolgere tutta l'app e' la cosa piu'
 * comoda da scrivere, e chiude anche la libreria.
 */

test('la libreria si vede ANCHE col muro alzato', () => {
  /*
   * La prima stesura di questo test cercava che la libreria non fosse dietro
   * un `puoiLavorare(...) &&`, e passava — ma passava a VUOTO: la libreria era
   * dietro `!DESCRITTORI[tool]`, e dal 2026-09-09 tutti e cinque i servizi
   * hanno un descrittore. Non era dietro il muro perche' non c'era proprio.
   *
   * Un test che puo' passare senza che la cosa esista non prova niente. Questo
   * chiede il contrario: che la condizione NOMINI il muro, e nel verso giusto.
   */
  const i = APP.indexOf('<Library');
  assert.notEqual(i, -1, 'la libreria non e’ montata in App.jsx');
  const condizione = APP.slice(Math.max(0, i - 300), i);
  assert.match(
    condizione,
    /chiuso \|\|/,
    'la libreria non si vede col muro alzato: § 3.5 dice che non si chiude mai',
  );
});

test('il muro e’ SPENTO finche’ non c’e’ da che parte entrare', () => {
  /*
   * Il 2026-09-09 il muro e' finito in produzione coi Task 4 e 5 — quelli che
   * permettono di ENTRARE — ancora da fare, e Cloudflare ricostruisce da solo:
   * lo studio si e' chiuso per tutti, e non c'era nemmeno la porta.
   *
   * Adesso e' un interruttore spento per difetto. Questo test esiste perche'
   * il giorno che qualcuno lo accende sia una DECISIONE e non una distrazione.
   */
  assert.match(APP, /VITE_MURO === '1'/, 'il muro non e’ piu’ dietro un interruttore');
  assert.match(APP, /const chiuso = muroAcceso &&/, 'il muro si alza senza passare dall’interruttore');
});

test('il muro prende il posto del PIANO, non della schermata', () => {
  assert.match(APP, /<Muro\b/, 'il muro non e’ montato in App.jsx');
  // Se il muro avvolgesse `.shell` chiuderebbe anche la striscia e la libreria.
  const i = APP.indexOf('<Muro');
  const intorno = APP.slice(Math.max(0, i - 600), i);
  assert.doesNotMatch(intorno, /<div className="shell"/, 'il muro avvolge tutta la schermata');
});

test('gli stati che fanno lavorare restano due', () => {
  // Se questo numero cambia e' una decisione, non una cosa che scivola dentro.
  const quali = ['aperto', 'prova', 'scaduto', 'da-ricollegare', 'mai-entrato'].filter(puoiLavorare);
  assert.deepEqual(quali, ['aperto', 'prova']);
});

test('il muro non e’ piu’ uno solo per tutto lo studio', () => {
  /*
   * Il `chiuso` globale chiudeva anche la generazione, e rendeva
   * irraggiungibili i crediti di chi ha disdetto. Questo test chiede che la
   * decisione passi da `servizioAperto`, cioe' dal descrittore.
   */
  assert.match(APP, /servizioAperto\(/, 'App.jsx decide ancora il muro per tutto lo studio');
});

test('chi e’ abbonato e ha solo il saldo corto vede la RICARICA, non il muro dell’abbonamento', () => {
  /*
   * Important del giro di correzioni: `chiuso` da solo non dice PERCHÉ. Con
   * `VITE_MURO=1` un account `aperto`/`prova` con crediti insufficienti per
   * un servizio a saldo faceva scattare `chiuso = true` (vedi
   * `test/servizi.test.js`, «senza crediti la generazione e’ chiusa anche a
   * chi e’ abbonato»), ma `<Muro>` non ha una FRASE per 'aperto'/'prova' e
   * ricadeva su FRASE['mai-entrato']: «Entra per usare lo studio», con un
   * tasto che apre un SECONDO abbonamento Stripe a un cliente che paga già.
   *
   * Qui si distinguono i due casi a livello di sorgente: il ramo
   * `chiusoPerSaldo` (abbonato senza crediti) deve portare a `<Ricarica>` e
   * MAI a `<Muro>`; il ramo alternativo (chi l’abbonamento non ce l’ha)
   * deve continuare a mostrare `<Muro>`.
   */
  const i = APP.indexOf('const chiusoPerSaldo = chiuso &&');
  assert.notEqual(i, -1, '«chiusoPerSaldo» non e’ definito: chi mostra il muro non sa piu’ perche’ e’ chiuso');
  const definizione = APP.slice(i, APP.indexOf(';', i) + 1);
  assert.match(definizione, /serve === 'saldo'/, 'non guarda se il servizio chiede il saldo (e non l’abbonamento)');
  assert.match(definizione, /puoiLavorare\(statoConto\)/, 'non guarda se l’abbonamento e’ gia’ a posto');

  const j = APP.indexOf('chiusoPerSaldo ? (');
  assert.notEqual(j, -1, 'il ramo del saldo non e’ cablato nel JSX di App.jsx');
  const k = APP.indexOf(') : (', j);
  assert.notEqual(k, -1, 'manca il ramo alternativo (il muro dell’abbonamento)');
  const ramoSaldo = APP.slice(j, k);
  const ramoAbbonamento = APP.slice(k, k + 600);

  assert.match(ramoSaldo, /<Ricarica\b/, 'abbonato senza crediti: non mostra la ricarica');
  assert.doesNotMatch(ramoSaldo, /<Muro\b/, 'abbonato senza crediti: mostra ANCORA il muro dell’abbonamento');
  assert.match(ramoAbbonamento, /<Muro\b/, 'chi non e’ abbonato non vede piu’ il muro');
});

test('la guardia sul descrittore non torna a smurare le viste fuori dall’impianto', () => {
  /*
   * Il capitolato proponeva `Boolean(DESCRITTORI[tool]) &&` dentro `chiuso`.
   * Ma `tool` non e' sempre un descrittore — l'editor, e le altre viste fuori
   * dall'impianto (piu' sotto: `!DESCRITTORI[tool]`,
   * `DESCRITTORI[tool] ? null : ...`) — ed erano murate come tutto il resto.
   * Con quella guardia avrebbero smesso di esserlo nell'istante in cui il
   * muro si accende: parte del prodotto sarebbe diventata gratis.
   *
   * `servizioAperto` gestisce gia' il descrittore assente da sola
   * (`?.serve` non e' mai `'saldo'`, si ricade su `puoiLavorare`), quindi la
   * guardia non deve tornare. Si legge solo la RIGA di `chiuso`, non tutto il
   * file: altrove in App.jsx `Boolean(DESCRITTORI[tool])` serve per altro
   * (`data-vuota`), e cercarlo ovunque avrebbe accusato codice innocente.
   */
  const i = APP.indexOf('const chiuso = muroAcceso &&');
  assert.notEqual(i, -1, '«chiuso» non e’ definito dove il test se lo aspetta');
  const definizione = APP.slice(i, APP.indexOf(';', i) + 1);
  assert.doesNotMatch(
    definizione,
    /Boolean\(DESCRITTORI\[tool\]\)/,
    'la guardia e’ tornata: le viste fuori dall’impianto si smurerebbero da sole',
  );
});
