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

test('la libreria non sta dietro NESSUNA condizione', () => {
  /*
   * La prima stesura di questo test cercava che la libreria non fosse dietro
   * un `puoiLavorare(...) &&`, e passava — ma passava a VUOTO: la libreria era
   * dietro `!DESCRITTORI[tool]`, e dal 2026-09-09 tutti e cinque i servizi
   * avevano un descrittore. Non era dietro il muro perche' non c'era proprio.
   *
   * La seconda stesura (Task 8, giro precedente) chiedeva che la condizione
   * nominasse il muro nel verso giusto (`chiuso ||`). Passava anche quella,
   * e intanto la libreria era raggiungibile SOLO dall'editor: entrati tutti
   * i servizi nell'impianto, `!DESCRITTORI[tool]` (l'altra metà della
   * condizione) era vero soltanto lì. Una prova che guarda la FORMA della
   * guardia non vede la guardia sbagliata.
   *
   * La cura (Task 8, H2): la libreria si monta SEMPRE, senza condizione. Chi
   * ha fatto dei file non li tiene in ostaggio dietro nessun `&&`, né
   * commerciale né accidentale.
   */
  const i = APP.indexOf('<Library');
  assert.notEqual(i, -1, 'la libreria non è montata in App.jsx');
  // Finestra larga apposta: il commento JSX che precede `<Library` in
  // produzione e' lungo diverse righe, e deve starci tutto (apertura
  // compresa) perche' lo spogliatoio qui sotto lo riconosca.
  const prima = APP.slice(Math.max(0, i - 1200), i);
  /*
   * ⚠️ Giro di correzione 1, Important 3: la prova precedente cercava
   * l'ASSENZA di due nomi precisi (`chiuso`, `DESCRITTORI`) — una lista nera
   * di due voci, buona solo contro i due modi in cui questa porta si è già
   * chiusa. Il controller ha rimontato la libreria come
   * `{puoiLavorare(statoConto) && (<Library … />)}` — un TERZO nome, che non
   * sta nella lista — e la prova restava verde mentre i file del cliente
   * finivano di nuovo dietro il muro dell'abbonamento.
   *
   * La cura: non si cerca più l'assenza di nomi, si prova l'EFFETTO. Una
   * `<Library` senza nessuna condizione e' un fratello semplice nell'albero
   * JSX — l'ultimo carattere di codice prima di lei (tolti i commenti JSX
   * `{/* ... *\/}`, che non sono codice) e' la `>` di chiusura dell'elemento
   * precedente. Qualunque condizione — `{x && (`, `{x ? (`, `{x && <Library`
   * — finisce invece con `(` o con l'apertura `{` stessa: MAI con `>`.
   *
   * Si spoglia all'indietro un commento JSX alla volta (invece di un solo
   * `.replace` globale) perché un `.replace` con finestra tagliata a meta'
   * commento non trova l'apertura `{/*` e non toglie niente: qui invece si
   * cerca l'ULTIMA apertura prima della chiusura finale, quale che sia la
   * lunghezza del commento o quanti ce ne sono in fila.
   */
  let senzaCommentiJsx = prima;
  for (;;) {
    senzaCommentiJsx = senzaCommentiJsx.replace(/\s+$/, '');
    if (!senzaCommentiJsx.endsWith('*/}')) break;
    const apertura = senzaCommentiJsx.lastIndexOf('{/*');
    if (apertura === -1) break;
    senzaCommentiJsx = senzaCommentiJsx.slice(0, apertura);
  }
  const ultimoCarattere = senzaCommentiJsx.slice(-1);
  assert.equal(
    ultimoCarattere,
    '>',
    `la libreria e' preceduta da "…${senzaCommentiJsx.slice(-40)}": non e' più un fratello semplice nell'albero JSX — è di nuovo dietro una condizione`,
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

test('un servizio a saldo non si mura mai: si vede lo strumento col prezzo', () => {
  /*
   * Fetta 2b (2026-09-26). Il muro davanti alla generazione diceva «Entra per
   * usare lo studio» a chi aveva saldo zero — la porta sui soldi chiusa
   * davanti a chi doveva pagare, ed era il cancello duro dello script di
   * raggiungibilità. Ora `chiuso` esclude i servizi a saldo PRIMA di
   * chiedere `servizioAperto`: il saldo corto lo dice `Preventivo`, e il
   * muro resta dell'abbonamento.
   *
   * Rompere apposta: togli `DESCRITTORI[tool]?.serve !== 'saldo' &&` dalla
   * riga di `chiuso` → questa prova diventa rossa.
   */
  const i = APP.indexOf('const chiuso = muroAcceso &&');
  assert.notEqual(i, -1, '«chiuso» non e’ definito dove il test se lo aspetta');
  const definizione = APP.slice(i, APP.indexOf(';', i) + 1);
  assert.match(
    definizione,
    /DESCRITTORI\[tool\]\?\.serve !== 'saldo' &&/,
    'la generazione e’ di nuovo dietro il muro: chi ha saldo zero non vede il prezzo',
  );
  assert.match(definizione, /servizioAperto\(/, 'il muro dell’abbonamento non passa piu’ dal descrittore');
  assert.doesNotMatch(APP, /chiusoPerSaldo/, 'il rattoppo del muro sbagliato e’ tornato');
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
