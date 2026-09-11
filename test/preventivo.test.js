import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prezzoDi, limitiDi } from '../src/engine/listino.js';
import { formatEuro } from '../src/engine/ledger.js';
import immagine from '../src/servizi/immagine.js';
import { SERVICES } from '../src/services.js';
import { DESCRITTORI } from '../src/servizi/index.js';

const PREVENTIVO = readFileSync(new URL('../src/components/Preventivo.jsx', import.meta.url), 'utf8');
const RIFERIMENTI = readFileSync(new URL('../src/components/Riferimenti.jsx', import.meta.url), 'utf8');
const PIANO = readFileSync(new URL('../src/components/Piano.jsx', import.meta.url), 'utf8');
const RICARICA = readFileSync(new URL('../src/components/Ricarica.jsx', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const TOOLRAIL = readFileSync(new URL('../src/components/ToolRail.jsx', import.meta.url), 'utf8');

// Il blocco che ripete il preventivo accanto al prompt: non tutto App.jsx,
// che e' enorme e ha ragioni sue per contenere cifre (pesi in KB, percentuali)
// che non sono prezzi.
const inizioLab = APP.indexOf('<div className="immagine-lab">');
const fineLab = APP.indexOf('</div>', inizioLab);
const IMMAGINE_LAB = APP.slice(inizioLab, fineLab);

/*
 * «Ogni generazione ti dice quanto costa prima che tu prema.»
 *
 * E' pubblicata sulla home, quindi non e' una preferenza dell'interfaccia: e'
 * una promessa operativa. Questi test la difendono.
 */

test('nessun prezzo scritto a mano nei sorgenti di Immagine', () => {
  /*
   * Una cifra scritta nel componente sarebbe una seconda fonte del prezzo, e
   * il giorno che il listino cambia resterebbe indietro — mostrando un numero
   * e addebitandone un altro. E' la § 3.1: un posto solo.
   *
   * Allargato oltre Preventivo.jsx (il Minor della revisione): una cifra in
   * Riferimenti.jsx o nel blocco che ripete il preventivo accanto al prompt
   * in App.jsx (`immagine-lab`) sarebbe passata inosservata.
   *
   * Allargato di nuovo per Task 8: il capitolato di `Ricarica.jsx` disegnava
   * un secondo elenco di prezzi scritto a mano, proprio sulla schermata dove
   * si paga — il posto peggiore per una seconda fonte.
   *
   * Il criterio resta "una cifra decimale seguita da €", non un `\d+` nudo:
   * un `\d+` nudo si sarebbe acceso su «VTracer, 140 KB» (commento vero in
   * App.jsx, riga 762) o su un peso in KB calcolato a schermo altrove — ne'
   * l'uno ne' l'altro e' un prezzo, e un test che li segnala si disattiva
   * alla svelta invece di essere ascoltato.
   *
   * Allargato di nuovo per il giro di correzioni di Task 8 (correzione 1):
   * ToolRail.jsx e' la barra dove «Immagine» e' diventato raggiungibile, ed
   * e' li' che il vecchio `price: 0.13` di `services.js` finiva stampato —
   * accanto, sulla stessa schermata, al 0,15 € vero del preventivo. Questo
   * regex non l'avrebbe mai preso (il numero era un letterale JS, non testo
   * con «€»): la copertura vera per QUEL difetto e' il test strutturale qui
   * sotto, che legge i dati invece del testo sorgente.
   */
  const SORGENTI = {
    'Preventivo.jsx': PREVENTIVO,
    'Riferimenti.jsx': RIFERIMENTI,
    'App.jsx (blocco immagine-lab)': IMMAGINE_LAB,
    'Ricarica.jsx': RICARICA,
    'ToolRail.jsx': TOOLRAIL,
  };
  for (const [nome, testo] of Object.entries(SORGENTI)) {
    assert.doesNotMatch(testo, /\b\d+[.,]\d{2}\s*€/, `${nome}: c’e’ un prezzo scritto a mano`);
  }
  assert.match(PREVENTIVO, /prezzoDi\(/, 'il preventivo non legge il listino');
  assert.match(PREVENTIVO, /formatEuro\(/);
});

test('un servizio che il listino conosce non porta un prezzo scritto a mano in services.js', () => {
  /*
   * Correzione 1 del giro di correzioni di Task 8: `services.js` teneva
   * `immagine.price: 0.13` («indicativo», diceva il commento) per dare
   * l'ordine di grandezza in barra — finche' il servizio era spento nessuno
   * lo vedeva accanto a niente. Acceso, i due numeri sono finiti fianco a
   * fianco sulla stessa schermata: 0,13 € in barra, 0,15 € nel preventivo.
   * Due cifre diverse per la stessa generazione rompono la promessa della
   * home, non per poco.
   *
   * Il controllo e' strutturale (sui dati importati, non su testo scritto a
   * mano) perche' e' l'unico modo di prendere QUESTO difetto: `price: 0.13`
   * e' un numero JavaScript, non una stringa con «€» dentro, e il regex qui
   * sopra non l'avrebbe mai visto rosso.
   */
  for (const s of SERVICES) {
    if (DESCRITTORI[s.id]?.listino) {
      assert.equal(
        s.price,
        undefined,
        `${s.id}: ha sia una voce di listino (${DESCRITTORI[s.id].listino}) sia un "price" scritto a mano in services.js`,
      );
    }
  }
});

test('la barra legge il prezzo di un servizio acceso dal listino, non da un numero suo', () => {
  /*
   * Complemento del test sopra: verifica che `ToolRail.jsx` (la barra)
   * chiami davvero `prezzoDi`/`formatEuro`, non solo che `services.js` non
   * porti piu' un `price` per «Immagine» — un letterale nuovo scritto
   * direttamente in `ToolRail.jsx` avrebbe superato il test precedente senza
   * problemi.
   */
  assert.match(TOOLRAIL, /prezzoDi\(/, 'la barra non legge il listino');
  assert.match(TOOLRAIL, /formatEuro\(/, 'la barra non formatta col resto del progetto');
});

test('il preventivo passa il conteggio dei riferimenti a prezzoDi: il prezzo sale con loro', () => {
  /*
   * Important 1 della revisione: un `prezzoDi(servizio)` senza `{ riferimenti
   * }` resta al prezzo base per sempre, e niente nei test lo impediva — il
   * cuore della promessa della home senza difesa. Si legge il sorgente
   * perche' questo progetto non disegna componenti (niente jsdom, niente
   * testing-library): i test sono su funzioni pure e sul testo dei sorgenti.
   */
  assert.match(
    PREVENTIVO,
    /prezzoDi\(\s*servizio\s*,\s*\{\s*riferimenti\s*\}\s*\)/,
    'Preventivo chiama prezzoDi senza passargli i riferimenti: il prezzo non sale piu’ con loro',
  );
});

test('il tasto Zack in Piano.jsx resta spento mentre un’operazione e’ in corso', () => {
  /*
   * Important 2 della revisione: e' la difesa contro il doppio addebito —
   * diciotto secondi davanti a un tasto muto sono un invito a premere una
   * seconda volta, e la seconda volta si addebita di nuovo. Togliendo
   * `disabled` (o togliendo `busy` da dentro) i test restavano verdi.
   */
  const i = PIANO.indexOf('className="zack-oval"');
  assert.notEqual(i, -1, 'il tasto Zack non c’e’ piu’ in Piano.jsx');
  const dopo = PIANO.slice(i, i + 1800);
  const disabledMatch = dopo.match(/disabled=\{([\s\S]*?)\}\s*\n/);
  assert.ok(disabledMatch, 'il tasto Zack non ha un attributo disabled');
  assert.match(disabledMatch[1], /\bbusy\b/, 'il tasto Zack resta premibile durante un’operazione in corso (busy)');
});

test('il prezzo mostrato e’ quello che il Worker addebita', () => {
  /*
   * Le due strade partono dalla stessa funzione: qui si verifica che il
   * numero che finisce sullo schermo sia proprio quello.
   *
   * 145 e non 140: il costo misurato di NBP e' 127 millesimi (Task 0), non i
   * 123 di una stesura precedente — 127 + 18 di margine fa 145. Lo stesso
   * numero e' gia' verificato in test/listino.test.js; qui si controlla che
   * ARRIVI FINO ALLO SCHERMO, formattato.
   */
  const { total } = prezzoDi('immagine-nbp');
  assert.equal(total, 145);
  // U+00A0 (spazio unificatore) fra numero e simbolo, non uno spazio normale:
  // e' cio' che `Intl.NumberFormat('it-IT')` scrive davvero (ruling Task 1),
  // e impedisce che «0,15» e «€» finiscano su due righe in pagina.
  assert.equal(formatEuro(total, 'it'), '0,15 €');
});

test('il servizio immagine e’ dichiarato per intero', () => {
  assert.equal(immagine.id, 'immagine');
  assert.equal(immagine.serve, 'saldo');
  assert.equal(immagine.listino, 'immagine-nbp');
  assert.ok(limitiDi(immagine.listino).totale > 0);
});

test('i limiti duplicati in «accetta» restano uguali a quelli del listino', () => {
  /*
   * Il listino e' la FONTE — e' l'unico posto che sa cosa accetta il
   * fornitore — e `immagine.accetta` ne e' una COPIA: due letterali scritti a
   * mano (`quanti: 14`, `menu: ['personaggio','oggetto','stile']`), non
   * calcolati. Restano letterali perche' i descrittori sono dati puri,
   * un'invariante di questo progetto: importare `limitiDi` dentro il
   * descrittore lo renderebbe calcolato, e romperebbe quell'invariante per
   * risparmiarsi due righe.
   *
   * Una copia scritta a mano puo' divergere dall'originale al primo
   * fornitore nuovo — e quel giorno si addebiterebbe (o si offrirebbe) una
   * richiesta che il fornitore rifiuta. Questo test non impedisce la
   * divergenza: la fa scoppiare qui, rossa, invece che in produzione.
   */
  const limiti = limitiDi(immagine.listino);
  assert.equal(immagine.accetta.quanti, limiti.totale, 'il tetto dei riferimenti diverge dal listino');

  const ruoli = Object.keys(limiti).filter((k) => k !== 'totale');
  assert.deepEqual(
    [...immagine.accetta.menu].sort(),
    [...ruoli].sort(),
    'i ruoli offerti divergono da quelli del listino',
  );
});
