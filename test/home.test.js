import { test } from 'node:test';
import { DESCRITTORI } from '../src/servizi/index.js';
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

test('video è acceso dalla fase 3, e ha un descrittore che lo fa pagare col saldo', () => {
  // Era «video dice che arriva, e non finge» (ready: false) fino alla fase 3.
  assert.equal(getService('video').ready, true);
  assert.equal(DESCRITTORI.video.serve, 'saldo');
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
 *
 * ⚠️ Minor (revisione, giro 2): il bilanciamento contava le graffe senza
 * saltare i commenti — innocuo finché nessun commento dentro il blocco ne
 * contiene una spaiata, ma un blocco che cresce ad ogni correzione non può
 * contare su quella fortuna per sempre. `trovaFineBlocco` salta il testo
 * dentro `/* ... *\/` prima di contare.
 */
function trovaFineBlocco(css, inizio) {
  let profondita = 1;
  let i = inizio;
  while (profondita > 0 && i < css.length) {
    if (css.startsWith('/*', i)) {
      const fine = css.indexOf('*/', i + 2);
      i = fine === -1 ? css.length : fine + 2;
      continue;
    }
    if (css[i] === '{') profondita++;
    else if (css[i] === '}') profondita--;
    i++;
  }
  return i - 1;
}

function estraiBloccoBilanciato(css, aperturaRegex) {
  const m = aperturaRegex.exec(css);
  if (!m) return null;
  const i = m.index + m[0].length;
  return css.slice(i, trovaFineBlocco(css, i));
}

/*
 * ⚠️ Minor (revisione, giro 2): le prove qui sotto cercavano il corpo di una
 * regola con `\.selettore\s*\{[^}]*prop`. Due modi in cui questo si rompe
 * senza che la pianta sia cambiata per davvero:
 * - un COMMENTO dentro quella regola con una `}` (anche solo decorativa)
 *   tronca la finestra `[^}]*` prima della proprietà cercata;
 * - un selettore RAGGRUPPATO (`.foo,\n  .bar {`) non è mai seguito
 *   immediatamente da `{`, quindi `\.foo\s*\{` non lo vede — una regressione
 *   scritta così sfuggirebbe.
 * `regoleDelSelettore` toglie i commenti prima di cercare e spezza la lista
 * dei selettori per virgola, confrontando ogni pezzo per uguaglianza esatta
 * invece di pretendere che il selettore preceda subito la graffa.
 */
function regoleDelSelettore(blocco, selettoreEsatto) {
  const senzaCommenti = blocco.replace(/\/\*[\s\S]*?\*\//g, '');
  const risultati = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(senzaCommenti))) {
    const selettori = m[1].split(',').map((s) => s.replace(/\s+/g, ' ').trim());
    if (selettori.includes(selettoreEsatto)) risultati.push(m[2]);
  }
  return risultati;
}

// Prova DI SORGENTE (Task 9): niente browser qui — legge la pianta dello
// studio direttamente da styles.css e pretende che sia una FILA in cima,
// non più una colonna a sinistra.
/*
 * ⚠️ MINOR 2 (giro di correzione 3): le due `assert.match` qui sotto (le
 * uniche due rimaste con una finestra `[^}]*` a mano) non passavano per
 * `regoleDelSelettore` come il resto del file — due modi in cui questo si
 * rompe senza che la pianta sia cambiata per davvero: un commento
 * decorativo con una `}` dentro come prima riga del corpo di `.main`
 * tronca `[^}]*` prima di `grid-template-areas` (fallisce con «lo studio
 * non ha una pianta», un messaggio che non descrive il difetto vero); un
 * selettore raggruppato (`.toolrail,\n  .altro {`) non è mai seguito
 * subito da `{`, quindi `\.toolrail\s*\{` non lo vede. Sostituite con
 * `regoleDelSelettore`, che toglie i commenti prima di cercare e confronta
 * ogni selettore per uguaglianza esatta.
 */
test('sul desktop i servizi stanno in alto, non in colonna a sinistra', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocco = estraiBloccoBilanciato(CSS, /@media \(min-width: 761px\)\s*\{/);
  assert.notEqual(blocco, null, 'manca il blocco della pianta dello studio');
  assert.ok(
    regoleDelSelettore(blocco, '.toolrail').some((c) => /flex-direction:\s*row/.test(c)),
    'la barra non è una fila in alto',
  );
  assert.ok(
    regoleDelSelettore(blocco, '.main').some((c) => /grid-template-areas/.test(c)),
    'lo studio non ha una pianta',
  );
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
  assert.ok(
    regoleDelSelettore(blocco, '.brain-tasto').some((c) => /grid-area:\s*brain/.test(c)),
    'Brain non è più piazzato dalla pianta: torna a "position: absolute; top: 8px; left: 8px", dentro la fila dei servizi',
  );
  assert.ok(
    regoleDelSelettore(blocco, '.stage').some((c) => /grid-area:\s*tela/.test(c)),
    'la tela non è più piazzata dalla pianta',
  );
  assert.ok(
    regoleDelSelettore(blocco, '.rail').some((c) => /grid-area:\s*pannello/.test(c)),
    'il pannello non è più piazzato dalla pianta',
  );
});

/*
 * ⚠️ IMPORTANT 1 e IMPORTANT 2 (revisione, giro di correzione 3): Critical 1
 * (sotto) leggeva `.main` dentro il solo PRIMO blocco `@media (min-width:
 * 761px)` (`estraiBloccoBilanciato` + `[corpo]`, il primo trovato) — mai si
 * chiedeva chi vincesse davvero la cascata. Tre iniezioni, tutte a suite
 * verde (misurato dal controllo): un secondo `.main { grid-template-columns:
 * auto 1fr var(--rail) }` aggiunto DOPO, nello STESSO blocco; lo stesso
 * dentro il blocco §8 (`@media (min-width: 761px)` più in basso nel file);
 * lo stesso dentro un `@media (max-width: 940px)` piazzato dopo la pianta —
 * a 800px quella fascia combacia comunque (761-940), e la regola più avanti
 * nel file vince a specificità pari, a prescindere da QUALE `@media` la
 * contiene. Critical 2 (più sotto) aveva lo stesso vizio al contrario:
 * bastava che ESISTESSE una regola successiva con `display` diverso da
 * `none` per il selettore — non che fosse quella vincente — quindi
 * appendere UN'ALTRA regola ancora più avanti (`display: none`) restava
 * invisibile alla prova pur vincendo davvero la cascata.
 *
 * ⚠️ IMPORTANT 1 (revisione, giro di correzione 4): `regolaVincente` (il
 * rimpiazzo scritto al giro 3, ora sostituito) non faceva quello che il suo
 * nome prometteva. Due difetti distinti, tutti e due riprodotti dal
 * controllo:
 *
 * (a) NON guardava la specificità. Confrontava il selettore carattere per
 *     carattere e teneva l'ultimo per posizione nel file. Appendere a
 *     `styles.css` `@media (min-width: 761px) { .shell .toolrail[data-
 *     collapsed='true'] .tool-name { display: none } .shell .main {
 *     grid-template-columns: auto 1fr var(--rail) } }` lasciava la suite a
 *     710/710 mentre il browser a 800×700 misurava la griglia `70px 430px
 *     300px` (la fascia cieca di nuovo lì, tela 430px) e tutti e sei i nomi
 *     `display: none`. Una classe in più davanti — e `.shell` c'è davvero,
 *     è il padre di `.main` — bastava a passare accanto alla guardia.
 *
 * (b) Restituiva l'ultima REGOLA, non l'ultima DICHIARAZIONE: una regola
 *     che nomina il selettore ma NON dichiara la proprietà cercata
 *     «vinceva» lo stesso e faceva cadere la prova su CSS innocuo.
 *     `@media (min-width: 761px) { .main { gap: 0 } }` più una `.tool-name
 *     { opacity: 1 }` facevano fallire tre prove («la regola .main VINCENTE
 *     … non dichiara grid-template-columns») mentre il browser mostrava
 *     tela 730px e sei nomi `display: block`. Le DICHIARAZIONI cascano; le
 *     regole no.
 *
 * `regolaVincente` è stata TOLTA (non corretta: il suo nome prometteva una
 * cosa che la sua firma — «restituisci un corpo di regola» — non può
 * mantenere). Al suo posto c'è `valoreVincente`, e la domanda che gli si fa
 * non è più «quale regola» ma «quale VALORE arriva alla proprietà P
 * sull'elemento descritto da questo selettore, a questa larghezza»:
 *
 * - specificità calcolata davvero (id / classi-attributi-pseudoclassi /
 *   elementi-pseudoelementi, con `:is()/:not()/:has()` al massimo dei loro
 *   argomenti e `:where()` a zero), poi `!important`, poi l'ordine nel file
 *   e l'ordine dentro il corpo della regola;
 * - candidata è ogni DICHIARAZIONE di P (o di una sua SCORCIATOIA: `padding`
 *   scrive `padding-bottom`, ed è esattamente così che il difetto di MINOR 1
 *   batteva la riserva da 26px) su un selettore che può applicarsi
 *   all'elemento descritto. Una regola che nomina il selettore ma NON
 *   dichiara P non è candidata e non «vince» niente: è il difetto (b).
 * - «può applicarsi» in due gradi, e la differenza conta: il compound del
 *   SOGGETTO della candidata dev'essere un SOTTOINSIEME di quello del
 *   bersaglio (`.toolrail` si applica a `.toolrail[data-collapsed='true']`,
 *   non viceversa: chiedere `.toolrail` vuol dire chiedere della barra
 *   APERTA, e una regola che pretende l'attributo lì non arriva); gli
 *   ANTENATI in più invece non si possono decidere leggendo il solo CSS
 *   (`.shell .main` si applica davvero, `.qualcosaltro .main` chissà), e
 *   quelle candidate restano marcate INCERTE. Le prove chiedono il valore
 *   DUE volte — fra tutte le candidate e fra le sole CERTE — e pretendono
 *   che sia giusto in entrambi i casi: un antenato in più non può né
 *   nascondere un difetto (la lettura «certe») né fabbricarne uno
 *   silenzioso (la lettura «tutte» lo nomina).
 * - una scorciatoia che il risolutore non sa espandere (`grid-template`,
 *   `grid`, `all`) non viene ignorata in silenzio: solleva un errore che
 *   dice di insegnargliela. Meglio una prova che si ferma di una che tace.
 */
function senzaCommentiConOffset(css) {
  // Sostituisce ogni commento con spazi della STESSA lunghezza: gli offset
  // assoluti restano validi — servono per stabilire chi viene dopo nel file.
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
}

function condizioneCombacia(condizione, larghezza) {
  if (!condizione) return true; // nessuna @media: si applica a ogni larghezza
  const min = /min-width:\s*(\d+)px/.exec(condizione);
  const max = /max-width:\s*(\d+)px/.exec(condizione);
  if (min && larghezza < Number(min[1])) return false;
  if (max && larghezza > Number(max[1])) return false;
  // Una condizione che non parla di larghezza (`prefers-reduced-motion`,
  // `hover`, `print`) resta DENTRO: qui si sbaglia per eccesso apposta —
  // includere una regola che forse non si applica fa al massimo cadere la
  // prova con il selettore in chiaro nel messaggio, escluderla la farebbe
  // tacere. La direzione del rumore è quella giusta per questa fase.
  return true;
}

function blocchiMediaDiPrimoLivello(cssPulito) {
  const blocchi = [];
  const apertura = /@media\s*([^{]+)\{/g;
  let m;
  while ((m = apertura.exec(cssPulito))) {
    const condizione = m[1].trim();
    const inizio = m.index + m[0].length;
    const fine = trovaFineBlocco(cssPulito, inizio);
    blocchi.push({ condizione, inizio, fine });
    apertura.lastIndex = fine; // le @media annidate restano dentro: non servono qui
  }
  return blocchi;
}

function ogniRegolaFoglia(cssPulito) {
  const risultati = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(cssPulito))) {
    const selettori = m[1].split(',').map((s) => s.replace(/\s+/g, ' ').trim());
    risultati.push({ offset: m.index, selettori, corpo: m[2] });
  }
  return risultati;
}

// ── il risolutore di cascata ───────────────────────────────────────────────

function trovaChiusura(s, i) {
  const chiude = s[i] === '(' ? ')' : ']';
  let profondita = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'") {
      const q = c;
      j++;
      while (j < s.length && s[j] !== q) j += s[j] === '\\' ? 2 : 1;
      continue;
    }
    if (c === s[i]) profondita++;
    else if (c === chiude && --profondita === 0) return j;
  }
  return s.length - 1;
}

function dividiTopLevel(s, separatore) {
  const pezzi = [];
  let corrente = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1;
      corrente += s.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === '(' || c === '[') {
      const f = trovaChiusura(s, i);
      corrente += s.slice(i, f + 1);
      i = f;
      continue;
    }
    if (c === separatore) {
      pezzi.push(corrente);
      corrente = '';
      continue;
    }
    corrente += c;
  }
  pezzi.push(corrente);
  return pezzi;
}

const PSEUDO_ELEMENTI_A_UN_DUE_PUNTI = new Set(['before', 'after', 'first-line', 'first-letter']);
const PSEUDO_FUNZIONALI_TRASPARENTI = new Set(['is', 'not', 'has', 'matches', 'any']);
const PSEUDO_NTH = new Set(['nth-child', 'nth-last-child', 'nth-of-type', 'nth-last-of-type']);

function piuAlta(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? a : b;
  return a;
}

// (id, classi+attributi+pseudoclassi, elementi+pseudoelementi) — `:where()` a
// zero, `:is()/:not()/:has()` al massimo dei propri argomenti, come da spec.
function specificita(selettore) {
  const s = selettore;
  let spec = [0, 0, 0];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '#') {
      spec[0]++;
      i++;
      while (i < s.length && /[\w-]/.test(s[i])) i++;
    } else if (c === '.') {
      spec[1]++;
      i++;
      while (i < s.length && /[\w-]/.test(s[i])) i++;
    } else if (c === '[') {
      spec[1]++;
      i = trovaChiusura(s, i) + 1;
    } else if (c === ':') {
      const doppio = s[i + 1] === ':';
      let j = i + (doppio ? 2 : 1);
      let nome = '';
      while (j < s.length && /[\w-]/.test(s[j])) nome += s[j++];
      nome = nome.toLowerCase();
      let argomento = null;
      if (s[j] === '(') {
        const f = trovaChiusura(s, j);
        argomento = s.slice(j + 1, f);
        j = f + 1;
      }
      i = j;
      if (doppio || PSEUDO_ELEMENTI_A_UN_DUE_PUNTI.has(nome)) {
        spec[2]++;
      } else if (nome === 'where') {
        // zero, sempre
      } else if (PSEUDO_FUNZIONALI_TRASPARENTI.has(nome) && argomento !== null) {
        let massimo = [0, 0, 0];
        for (const p of dividiTopLevel(argomento, ',')) {
          if (p.trim()) massimo = piuAlta(massimo, specificita(p.trim()));
        }
        spec = [spec[0] + massimo[0], spec[1] + massimo[1], spec[2] + massimo[2]];
      } else if (PSEUDO_NTH.has(nome) && argomento !== null) {
        spec[1]++;
        const of = /\bof\b([\s\S]+)/i.exec(argomento);
        if (of) {
          let massimo = [0, 0, 0];
          for (const p of dividiTopLevel(of[1], ',')) {
            if (p.trim()) massimo = piuAlta(massimo, specificita(p.trim()));
          }
          spec = [spec[0] + massimo[0], spec[1] + massimo[1], spec[2] + massimo[2]];
        }
      } else {
        spec[1]++;
      }
    } else if (/[\w-]/.test(c)) {
      spec[2]++;
      while (i < s.length && /[\w-]/.test(s[i])) i++;
    } else {
      i++; // `*`, combinatori, spazi: zero
    }
  }
  return spec;
}

// Spezza un selettore nei suoi COMPOUND, ciascuno con il combinatore che lo
// precede (`null` per il primo, ' ' per il discendente).
function pezziDelSelettore(selettore) {
  const s = selettore.replace(/\s+/g, ' ').trim();
  const pezzi = [];
  let corrente = '';
  let comb = null;
  const spingi = () => {
    if (!corrente) return false;
    pezzi.push({ combinatore: comb, compound: corrente });
    corrente = '';
    return true;
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') {
      const f = trovaChiusura(s, i);
      corrente += s.slice(i, f + 1);
      i = f;
    } else if (c === '>' || c === '+' || c === '~') {
      spingi();
      comb = c;
    } else if (c === ' ') {
      if (spingi()) comb = ' ';
    } else {
      corrente += c;
    }
  }
  spingi();
  return pezzi;
}

// I pezzi SEMPLICI di un compound, normalizzati: `[a='b']` e `[a=b]` sono lo
// stesso vincolo e devono confrontarsi uguali.
function semplici(compound) {
  const out = [];
  let i = 0;
  while (i < compound.length) {
    const c = compound[i];
    if (c === '[') {
      const f = trovaChiusura(compound, i);
      out.push(compound.slice(i, f + 1).replace(/["']/g, ''));
      i = f + 1;
    } else if (c === '.' || c === '#') {
      let j = i + 1;
      while (j < compound.length && /[\w-]/.test(compound[j])) j++;
      out.push(compound.slice(i, j));
      i = j;
    } else if (c === ':') {
      let j = i + 1;
      if (compound[j] === ':') j++;
      while (j < compound.length && /[\w-]/.test(compound[j])) j++;
      if (compound[j] === '(') j = trovaChiusura(compound, j) + 1;
      out.push(compound.slice(i, j).replace(/["']/g, ''));
      i = j;
    } else if (/[\w-]/.test(c)) {
      let j = i;
      while (j < compound.length && /[\w-]/.test(compound[j])) j++;
      out.push(compound.slice(i, j).toLowerCase());
      i = j;
    } else {
      i++; // `*` e resto: nessun vincolo
    }
  }
  return out;
}

const discendente = (comb) => comb === null || comb === ' ';

function sottoinsieme(a, b) {
  return a.every((x) => b.includes(x));
}

/*
 * 'certa'   — la candidata si applica di sicuro all'elemento descritto dal
 *             bersaglio, leggendo il solo CSS;
 * 'incerta' — si applica se e solo se l'elemento ha, nel DOM, antenati che il
 *             bersaglio non nomina (`.shell .main` per il bersaglio `.main`);
 * null      — non si applica: il SOGGETTO chiede più di quanto il bersaglio
 *             offra (`.toolrail[data-collapsed='true']` non arriva alla barra
 *             APERTA, che è quello che si chiede scrivendo `.toolrail`).
 */
function applicabilita(selCandidato, selBersaglio) {
  const c = pezziDelSelettore(selCandidato);
  const b = pezziDelSelettore(selBersaglio);
  if (c.length === 0 || b.length === 0) return null;
  const soggettoC = c[c.length - 1];
  const soggettoB = b[b.length - 1];
  if (!sottoinsieme(semplici(soggettoC.compound), semplici(soggettoB.compound))) return null;
  const antenatiC = c.slice(0, -1);
  if (antenatiC.length === 0) return 'certa';
  if (!discendente(soggettoC.combinatore)) return 'incerta';
  const antenatiB = b.slice(0, -1);
  let k = 0;
  for (const a of antenatiC) {
    if (!discendente(a.combinatore)) return 'incerta';
    let trovato = false;
    while (k < antenatiB.length) {
      const t = antenatiB[k++];
      if (discendente(t.combinatore) && sottoinsieme(semplici(a.compound), semplici(t.compound))) {
        trovato = true;
        break;
      }
    }
    if (!trovato) return 'incerta';
  }
  return 'certa';
}

function dichiarazioniDi(corpo) {
  const out = [];
  dividiTopLevel(corpo, ';').forEach((pezzo, ordine) => {
    const i = pezzo.indexOf(':');
    if (i === -1) return;
    const prop = pezzo.slice(0, i).trim().toLowerCase();
    if (!prop || /[^\w-]/.test(prop) || prop.startsWith('--')) return;
    let valore = pezzo.slice(i + 1).trim();
    const bang = /!\s*important\s*$/i.exec(valore);
    const important = Boolean(bang);
    if (bang) valore = valore.slice(0, bang.index).trim();
    if (!valore) return;
    out.push({ prop, valore, important, ordine });
  });
  return out;
}

// Per ogni proprietà interrogata: quali scorciatoie la scrivono e il
// risolutore sa espandere (`sa`), e quali la scrivono ma NON sa espandere
// (`nonSa`). Le seconde fermano la prova con un errore invece di passare in
// silenzio: una guardia che tace su un caso che non capisce è esattamente il
// difetto che questa fase ha già pagato dodici volte.
const SCORCIATOIE = {
  'padding-bottom': { sa: ['padding'], nonSa: ['all'] },
  'grid-template-columns': { sa: [], nonSa: ['grid', 'grid-template', 'all'] },
  display: { sa: [], nonSa: ['all'] },
};

function valoreScritto(dich, proprieta) {
  if (dich.prop === proprieta) return dich.valore;
  const regola = SCORCIATOIE[proprieta];
  if (!regola) {
    throw new Error(`il risolutore non sa quali scorciatoie scrivono \`${proprieta}\`: aggiungila a SCORCIATOIE`);
  }
  if (regola.nonSa.includes(dich.prop)) {
    throw new Error(
      `\`${dich.prop}\` può scrivere \`${proprieta}\` e il risolutore non la sa espandere: insegnagliela in SCORCIATOIE invece di lasciarla passare in silenzio`,
    );
  }
  if (!regola.sa.includes(dich.prop)) return undefined;
  if (dich.prop === 'padding' || dich.prop === 'margin') {
    const lati = dividiTopLevel(dich.valore, ' ').map((v) => v.trim()).filter(Boolean);
    const quattro = [lati[0], lati[1] ?? lati[0], lati[2] ?? lati[0], lati[3] ?? lati[1] ?? lati[0]];
    return quattro[{ top: 0, right: 1, bottom: 2, left: 3 }[proprieta.split('-')[1]]];
  }
  return undefined;
}

function candidateCascata(css, bersaglio, proprieta, larghezza) {
  const pulito = senzaCommentiConOffset(css);
  const blocchi = blocchiMediaDiPrimoLivello(pulito);
  const condizioneA = (offset) => {
    const b = blocchi.find((b) => offset >= b.inizio && offset < b.fine);
    return b ? b.condizione : null;
  };
  const candidate = [];
  for (const regola of ogniRegolaFoglia(pulito)) {
    if (!condizioneCombacia(condizioneA(regola.offset), larghezza)) continue;
    const dich = dichiarazioniDi(regola.corpo);
    if (dich.length === 0) continue;
    for (const sel of regola.selettori) {
      const grado = applicabilita(sel, bersaglio);
      if (!grado) continue;
      for (const d of dich) {
        const valore = valoreScritto(d, proprieta);
        if (valore === undefined) continue;
        candidate.push({
          valore,
          selettore: sel,
          offset: regola.offset,
          ordine: d.ordine,
          spec: specificita(sel),
          important: d.important,
          incerta: grado === 'incerta',
        });
      }
    }
  }
  return candidate;
}

function confrontaCascata(a, b) {
  if (a.important !== b.important) return a.important ? 1 : -1;
  for (let i = 0; i < 3; i++) if (a.spec[i] !== b.spec[i]) return a.spec[i] - b.spec[i];
  if (a.offset !== b.offset) return a.offset - b.offset;
  return a.ordine - b.ordine;
}

function valoreVincente(css, bersaglio, proprieta, larghezza, { soloCerte = false } = {}) {
  const candidate = candidateCascata(css, bersaglio, proprieta, larghezza).filter(
    (c) => !(soloCerte && c.incerta),
  );
  if (candidate.length === 0) return undefined;
  return candidate.reduce((migliore, c) => (confrontaCascata(c, migliore) >= 0 ? c : migliore));
}

/*
 * Ogni prova di cascata chiede il valore DUE volte e pretende che sia giusto
 * in entrambe le letture. Non è una ridondanza: la lettura «certe» non può
 * essere resa verde da una regola con un antenato in più (che nasconderebbe
 * un difetto vero), e la lettura «tutte» nomina quella regola invece di
 * ignorarla (che è il difetto (a), quello che `.shell` in testa faceva
 * passare).
 */
function perOgniLettura(css, bersaglio, proprieta, larghezza, controlla) {
  for (const soloCerte of [false, true]) {
    const vinta = valoreVincente(css, bersaglio, proprieta, larghezza, { soloCerte });
    const dove = soloCerte
      ? 'fra le sole candidate CERTE'
      : 'fra TUTTE le candidate (compresi i selettori con antenati in più)';
    controlla(vinta, `a ${larghezza}px, ${dove}`);
  }
}

// Le stesse larghezze misurate a mano nei giri precedenti: 761 e 940 sono i
// due bordi della fascia contesa da C1/Critical 1, 800 e 1280 i due schermi
// provati nel browser a ogni giro.
const LARGHEZZE_DESKTOP = [761, 800, 940, 1280];

/*
 * ⚠️ Critical 1 (revisione, giro di correzione 2): il vecchio guardiano qui
 * sotto (rimosso) vietava la STRINGA `@media (max-width: 940px)`, non la
 * REGOLA che l'aveva resa un problema — bandisce per sempre una fascia di
 * larghezza di per sé innocente (ce n'è già una legittima a 1100px, riga
 * ~1126) e non vede `939px`, `(width <= 940px)`,
 * `screen and (max-width: 940px)`, né un secondo `.main {
 * grid-template-columns }` scritto a una fascia diversa. Il difetto vero
 * che il controller ha riprodotto stava (e sta) in UNA riga: `.main {
 * grid-template-columns: auto 1fr var(--rail) }` — 300px SEMPRE riservati a
 * un pannello che a 761-940px è `display: none` in ogni stato raggiungibile
 * — al posto di `auto`, che costa zero mentre il pannello è vuoto e si apre
 * da solo il giorno che smette di esserlo (Ruling A, giro 1). Questa prova
 * guarda la RIGA, non una stringa accanto ad essa: legge `.main {
 * grid-template-columns }` dentro la pianta ed esige che la terza traccia
 * sia esattamente `auto`, non `var(--rail)` né una qualunque larghezza
 * fissa (`300px` compreso — la stessa cifra riservata da `var(--rail)`).
 */
test('la terza traccia della pianta è `auto`, non una larghezza riservata sempre (Critical 1)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  for (const larghezza of LARGHEZZE_DESKTOP) {
    perOgniLettura(CSS, '.main', 'grid-template-columns', larghezza, (vinta, dove) => {
      assert.notEqual(vinta, undefined, `nessuna dichiarazione \`grid-template-columns\` per \`.main\` ${dove}`);
      const tracce = vinta.valore.split(/\s+/);
      assert.equal(
        tracce.length,
        3,
        `.main ${dove} ha ${tracce.length} tracce invece di 3: "${vinta.valore}" (da \`${vinta.selettore}\`)`,
      );
      assert.equal(
        tracce[2],
        'auto',
        `${dove} la terza traccia VINCENTE è "${tracce[2]}", non "auto" — la dichiara \`${vinta.selettore}\` (specificità ${vinta.spec.join(',')}): un'altra regola \`grid-template-columns\` che si applica a \`.main\` — più avanti nel file, in un secondo \`@media (min-width: 761px)\` (§8), in una fascia che si sovrappone come \`@media (max-width: 940px)\` piazzata dopo la pianta, o con una classe in più davanti (\`.shell .main\`, che vince per SPECIFICITÀ a prescindere dall'ordine) — sta vincendo la cascata al posto suo, e 300px tornano ciechi alla tela in quella fascia`,
      );
    });
  }
});

/*
 * ⚠️ MINOR 1 (giro di correzione 3, guardato al giro 4): la riserva da 26px
 * sotto la fila (`padding-bottom`, per il nome che esce dal cerchio più
 * basso — Scontorna, 72px) è stata scritta al giro 1 e RESA EFFICACE al giro
 * 3, ma non l'ha mai guardata nessuna prova: cancellare la regola lasciava la
 * suite a 710/710. Il difetto che il giro 3 ha corretto non era l'assenza
 * della riserva ma la sua SCONFITTA: `.toolrail[data-collapsed='true']
 * { padding: 12px 8px }` (riga ~1416, 0,2,0) batte
 * `@media (min-width: 761px) .toolrail { padding-bottom: 26px }` (0,1,0) a
 * prescindere dall'ordine nel file — e la barra CHIUSA è lo stato di
 * PARTENZA di ogni utente desktop (`localStorage` pulito). Misurato allora:
 * barra 98px invece di 112, `scrollHeight` 97 contro `clientHeight` 96,
 * «Scontorna» tagliata di 0.80px dall'`overflow-y: hidden`.
 *
 * Perciò questa prova NON cerca la riga: chiede quanto `padding-bottom`
 * arriva davvero alla barra nei DUE stati — aperta (`.toolrail`) e chiusa
 * (`.toolrail[data-collapsed='true']`) — passando per le scorciatoie, che è
 * proprio il modo in cui la riserva veniva battuta. Rotta apposta: cancellare
 * `.toolrail[data-collapsed='true'] { padding-bottom: 26px }` dalla pianta
 * fa cadere lo stato chiuso (torna a 12px); cancellare
 * `.toolrail { padding-bottom: 26px }` fa cadere quello aperto.
 */
const RISERVA_NOME = 26; // px, misurati: 72 di cerchio + 4 di margine + ~11 di riga a 9px = 87 contro 72+12

test('la riserva sotto la fila arriva alla barra in TUTTI e due gli stati, non solo in quello aperto (MINOR 1)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const stati = [
    ['.toolrail', 'APERTA'],
    [".toolrail[data-collapsed='true']", 'CHIUSA (lo stato di PARTENZA: `localStorage` pulito)'],
  ];
  for (const larghezza of LARGHEZZE_DESKTOP) {
    for (const [bersaglio, nomeStato] of stati) {
      perOgniLettura(CSS, bersaglio, 'padding-bottom', larghezza, (vinta, dove) => {
        assert.notEqual(vinta, undefined, `nessun \`padding-bottom\` arriva alla barra ${nomeStato} ${dove}`);
        const px = /^(\d+(?:\.\d+)?)px$/.exec(vinta.valore);
        assert.notEqual(
          px,
          null,
          `il \`padding-bottom\` VINCENTE della barra ${nomeStato} ${dove} è "${vinta.valore}" (da \`${vinta.selettore}\`): non è una riserva in px misurabile`,
        );
        assert.ok(
          Number(px[1]) >= RISERVA_NOME,
          `la barra ${nomeStato} ${dove} riserva ${px[1]}px sotto i cerchi invece dei ${RISERVA_NOME} misurati — la dichiara \`${vinta.selettore}\` (specificità ${vinta.spec.join(',')}). Il nome esce dal cerchio (\`position: absolute; top: 100%\`) e l'\`overflow-y: hidden\` della barra lo taglia: con 12px «Scontorna» perdeva 0.80px e la barra scendeva da 112px a 98`,
        );
      });
    }
  }
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
  assert.ok(
    regoleDelSelettore(blocco, '.toolrail .tool-name').some((c) => /position:\s*absolute/.test(c)),
    'il nome sotto i cerchi è tornato dentro il flusso della colonna: torna a competere per lo spazio con icona e prezzo/«presto», e su Immagine/Video sparisce di nuovo (altezza 0)',
  );
});

/*
 * ⚠️ Trovato nel browser (giro di correzione 2, non segnalato dal
 * controller — misurato mentre si provava Critical 2 a `localStorage`
 * pulito): `.toolrail .tool-name`, spostato FUORI dal cerchio da Ruling B,
 * eredita `color: var(--panna)` da `.tool-item` (nero con testo panna —
 * regola condivisa con `.btn`/`.opt`, pensata per un'etichetta DENTRO un
 * cerchio nero). Fuori dal cerchio il nome sta sul fondo panna della
 * PAGINA: panna su panna, invisibile — misurato,
 * `getComputedStyle(nome).color === getComputedStyle(document.body)
 * .backgroundColor` su cinque cerchi su sei (il sesto, quello attivo, si
 * salva per un altro motivo: `color: var(--oro)`). Il Ruling B del giro 1
 * aveva misurato solo l'ALTEZZA del nome (11px, uniforme), mai il colore:
 * la suite restava verde con un nome tecnicamente `display: block` e
 * otticamente invisibile. Stessa situazione già risolta altrove in questo
 * file (`.brain-nome`, il nome del telefono in fondo schermo): entrambi
 * dichiarano `color: var(--inchiostro)` per lo stesso motivo.
 */
test('il nome della fila, fuori dal cerchio, ha un colore leggibile sul fondo panna', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocco = estraiBloccoBilanciato(CSS, /@media \(min-width: 761px\)\s*\{/);
  assert.notEqual(blocco, null, 'manca il blocco della pianta dello studio');
  const regole = regoleDelSelettore(blocco, '.toolrail .tool-name');
  assert.ok(regole.length > 0, 'la pianta non dichiara più `.toolrail .tool-name`');
  assert.ok(
    regole.some((c) => /color:\s*var\(--inchiostro\)/.test(c)),
    'il nome fuori dal cerchio non ha più un `color` esplicito leggibile: eredita il panna del bottone nero e sparisce sul fondo panna della pagina (misurato: stesso rgb del testo e dello sfondo)',
  );
});

/*
 * ⚠️ Critical 2 (giro di correzione 2): la barra CHIUSA è lo stato di
 * PARTENZA di ogni utente desktop — `ToolRail.jsx` legge
 * `localStorage.getItem('jayl.rail') === 'aperta'`, falso finché nessuno ha
 * mai premuto `.rail-apri`, e quel bottone è nascosto sopra i 760px dalla
 * pianta stessa (`.rail-apri { display: none }`). La regola generale
 * `.toolrail[data-collapsed='true'] .tool-name { display: none }`, scritta
 * fuori da qualunque media query (quindi valida anche sopra i 760px), batte
 * per specificità (0,3,0) la `.toolrail .tool-name` della pianta (0,2,0):
 * un utente mai arrivato ad "aperta" vede sei cerchi senza nome.
 *
 * ⚠️ IMPORTANT 2 (revisione, giro di correzione 3): la prova cercava «UNA
 * regola successiva con `display` diverso da `none`», fermandosi alla prima
 * trovata — non la regola VINCENTE. Appendere in fondo al file un'ALTRA
 * regola ancora, per lo stesso selettore, dentro un altro `@media
 * (min-width: 761px)` con `display: none`, lasciava la prova verde: quella
 * regola aggiunta vince davvero la cascata (stessa specificità, ultima nel
 * file) e i sei cerchi restano senza nome, ma il ciclo aveva già trovato la
 * regola BUONA prima di arrivare a quella cattiva e non tornava più
 * indietro. ~~`regolaVincente` non si ferma alla prima: guarda tutto il file
 * e restituisce l'ultima regola che vince per quel selettore a quella
 * larghezza~~ — vero per il giro 3, ma quella funzione NON esiste più: il
 * giro 4 l'ha tolta perché «l'ultima regola» non è «quella che vince» (né
 * per specificità, né per dichiarazione). La prova qui sotto usa
 * `perOgniLettura` + `valoreVincente`, e pretende che il `display` che
 * arriva DAVVERO al nome sia diverso da `none` in tutte e due le letture.
 */
test('sul desktop la barra CHIUSA (stato di partenza) non nasconde più i nomi (Critical 2)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const selettore = ".toolrail[data-collapsed='true'] .tool-name";
  for (const larghezza of LARGHEZZE_DESKTOP) {
    perOgniLettura(CSS, selettore, 'display', larghezza, (vinta, dove) => {
      assert.notEqual(vinta, undefined, `nessuna dichiarazione \`display\` per "${selettore}" ${dove}`);
      assert.notEqual(
        vinta.valore,
        'none',
        `${dove} il \`display\` VINCENTE per "${selettore}" è "none" — lo dichiara \`${vinta.selettore}\` (specificità ${vinta.spec.join(',')}): un utente desktop con \`localStorage\` pulito (stato di partenza, sempre "chiuso") vede sei cerchi senza nome`,
      );
    });
  }
});

/*
 * ⚠️ RULING (giro di correzione 3, 2026-09-16): la stessa domanda, per
 * `.tool-soon` — il marcatore «presto» di Video. `.toolrail[data-
 * collapsed='true'] .tool-soon { display: none; }`, scritta fuori da
 * qualunque media query con la STESSA specificità (0,3,0) e la STESSA
 * ragione di quella di `.tool-name` qui sopra (un cerchio muto sul telefono
 * è un guasto, non un'attesa — Task 8, H1-bis), vale anche sopra i 760px:
 * in una fila orizzontale non c'è larghezza da risparmiare nascondendo
 * un'etichetta di 8px sotto un cerchio che occupa comunque il suo posto —
 * lo stesso ragionamento che ha restituito il nome alla barra chiusa vale
 * verbatim per «presto». Non è una porta CHIUSA (Video apre comunque la
 * schermata «non c'è ancora» al clic), ma il codice non può dire due cose
 * diverse sulla stessa domanda. Stessa tecnica di guardia di Critical 2: la
 * regola VINCENTE, non la prima né una qualunque.
 */
test('sul desktop la barra CHIUSA non nasconde più il «presto» di Video (RULING)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const selettore = ".toolrail[data-collapsed='true'] .tool-soon";
  for (const larghezza of LARGHEZZE_DESKTOP) {
    perOgniLettura(CSS, selettore, 'display', larghezza, (vinta, dove) => {
      assert.notEqual(vinta, undefined, `nessuna dichiarazione \`display\` per "${selettore}" ${dove}`);
      assert.notEqual(
        vinta.valore,
        'none',
        `${dove} il \`display\` VINCENTE per "${selettore}" è "none" — lo dichiara \`${vinta.selettore}\` (specificità ${vinta.spec.join(',')}): il «presto» di Video resta nascosto nello stato di partenza`,
      );
    });
  }
});
