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
 * `regolaVincente` guarda l'INTERO file, non un blocco solo, e non si
 * accontenta di «una regola che va bene esiste da qualche parte»: raccoglie
 * ogni regola-foglia (bilanciata a graffe, commenti tolti prima di cercare,
 * come `regoleDelSelettore`) per il selettore ESATTO richiesto, scarta
 * quelle la cui `@media` non combacia con la larghezza data (`min-width` /
 * `max-width` in px — le uniche forme usate in questo file per le fasce di
 * larghezza) e restituisce l'ULTIMA per posizione nel file: a specificità
 * pari è quella, e non la prima né una qualunque, a vincere davvero.
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

function regolaVincente(css, selettoreEsatto, larghezza) {
  const pulito = senzaCommentiConOffset(css);
  const blocchi = blocchiMediaDiPrimoLivello(pulito);
  const condizioneA = (offset) => {
    const b = blocchi.find((b) => offset >= b.inizio && offset < b.fine);
    return b ? b.condizione : null;
  };
  const candidate = ogniRegolaFoglia(pulito)
    .filter((r) => r.selettori.includes(selettoreEsatto))
    .filter((r) => condizioneCombacia(condizioneA(r.offset), larghezza));
  if (candidate.length === 0) return undefined;
  return candidate[candidate.length - 1].corpo; // l'ultima per offset = l'ultima nel file
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
    const corpo = regolaVincente(CSS, '.main', larghezza);
    assert.notEqual(corpo, undefined, `nessuna regola \`.main\` vince la cascata a ${larghezza}px`);
    const m = /grid-template-columns:\s*([^;]+);/.exec(corpo);
    assert.notEqual(m, null, `la regola \`.main\` VINCENTE a ${larghezza}px non dichiara \`grid-template-columns\``);
    const tracce = m[1].trim().split(/\s+/);
    assert.equal(tracce.length, 3, `.main (regola vincente a ${larghezza}px) ha ${tracce.length} tracce invece di 3: "${m[1].trim()}"`);
    assert.equal(
      tracce[2],
      'auto',
      `a ${larghezza}px la terza traccia VINCENTE è "${tracce[2]}", non "auto": un'altra regola \`.main { grid-template-columns }\` più avanti nel file — nello stesso blocco, in un secondo \`@media (min-width: 761px)\` (§8), o in una fascia che si sovrappone come \`@media (max-width: 940px)\` piazzata dopo la pianta — sta vincendo la cascata al posto suo, e 300px tornano ciechi alla tela in quella fascia`,
    );
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
 * indietro. `regolaVincente` non si ferma alla prima: guarda tutto il file e
 * restituisce l'ultima regola che vince per quel selettore a quella
 * larghezza — quella, e solo quella, deve avere `display` diverso da
 * `none`.
 */
test('sul desktop la barra CHIUSA (stato di partenza) non nasconde più i nomi (Critical 2)', () => {
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const selettore = ".toolrail[data-collapsed='true'] .tool-name";
  for (const larghezza of LARGHEZZE_DESKTOP) {
    const corpo = regolaVincente(CSS, selettore, larghezza);
    assert.notEqual(corpo, undefined, `nessuna regola per "${selettore}" vince la cascata a ${larghezza}px`);
    assert.match(
      corpo,
      /display:\s*(?!none\b)\S/,
      `a ${larghezza}px la regola VINCENTE per "${selettore}" nasconde ancora il nome (display: none): un utente desktop con \`localStorage\` pulito (stato di partenza, sempre "chiuso") vede sei cerchi senza nome`,
    );
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
    const corpo = regolaVincente(CSS, selettore, larghezza);
    assert.notEqual(corpo, undefined, `nessuna regola per "${selettore}" vince la cascata a ${larghezza}px`);
    assert.match(
      corpo,
      /display:\s*(?!none\b)\S/,
      `a ${larghezza}px la regola VINCENTE per "${selettore}" nasconde ancora il «presto» di Video (display: none)`,
    );
  }
});
