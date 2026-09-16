import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DESCRITTORI } from '../src/servizi/index.js';

/*
 * L'impianto legge il descrittore, non consulta liste di `id`.
 *
 * Il difetto che questo test impedisce di ripetere: il comportamento sparso
 * in `[...].includes(tool)` dentro App.jsx. Una lista dimenticata non solleva
 * niente — si vede aprendo il servizio, ed e' gia' costato una volta.
 */
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const PIANO = readFileSync(new URL('../src/components/Piano.jsx', import.meta.url), 'utf8');

test('App.jsx costruisce gli strumenti dal descrittore', () => {
  assert.match(APP, /strumentiVisibili\(/, 'gli strumenti sono ancora scritti a mano dentro App.jsx');
});

test('ogni strumento dichiarato ha un gesto che lo esegue', () => {
  /*
   * Uno strumento dichiarato senza il suo gesto compare come cerchio e non fa
   * niente al clic: e' esattamente il difetto del righello del 2026-09-04, un
   * comando che si illumina e non risponde.
   *
   * Si legge il sorgente perche' i gesti sono chiusure dentro App.jsx e non
   * si possono importare: quello che si puo' controllare e' che il loro nome
   * compaia nella mappa.
   */
  const inizio = APP.indexOf('const GESTI');
  assert.notEqual(inizio, -1, 'la mappa GESTI non esiste in App.jsx');
  /*
   * Si legge FINO a `const acceso`, invece di contare i caratteri: la finestra
   * fissa da 1200 e' gia' stata troppo corta due volte — la mappa cresce a
   * ogni servizio, e il test bocciava righe giuste. Un confine nominato non
   * ha questo problema.
   */
  const fine = APP.indexOf('const acceso', inizio);
  assert.notEqual(fine, -1, 'la mappa GESTI non finisce piu’ dove il test la cerca');
  const mappa = APP.slice(inizio, fine);
  for (const d of Object.values(DESCRITTORI)) {
    for (const s of d.strumenti) {
      assert.match(mappa, new RegExp(`\\b${s.id}\\b`), `manca il gesto per «${s.id}» (${d.id})`);
    }
  }
});

test('leggiRicetta NON amputa la ricetta salvata: soloOfferti non ci abita più', () => {
  /*
   * Il difetto che questa prova impedisce ora (Critico 2 della revisione del
   * Task 6, 2026-09-16 — rovescia il test precedente, che chiedeva l'esatto
   * contrario): `leggiRicetta` che passa da `soloOfferti` cancellava «buchi»
   * — richiudi le controforme — anche dalle catene salvate e dalla ricetta
   * di fabbrica, rendendo `closeHoles` ineseguibile da qualunque punto del
   * prodotto, fabbrica compresa. La regola vera è l'opposto, ed è già scritta
   * in `landing/Landing.jsx` per la ricetta condivisa dalla home: i passi che
   * il tasto non offre più vanno IGNORATI dalla pastiglia, non CANCELLATI dal
   * dato — chi ha costruito una catena non deve perderla passando da un
   * punto che offre meno pastiglie.
   */
  const inizio = APP.indexOf('function leggiRicetta');
  assert.notEqual(inizio, -1, 'leggiRicetta non esiste piu’ in App.jsx');
  const fine = APP.indexOf('\nimport', inizio);
  assert.notEqual(fine, -1, 'leggiRicetta non finisce piu’ dove il test la cerca');
  const corpo = APP.slice(inizio, fine);
  assert.doesNotMatch(corpo, /soloOfferti\(/, 'leggiRicetta torna ad amputare la ricetta salvata');
});

test('è il punto oro (Piano.jsx), non leggiRicetta, a filtrare le pastiglie offerte', () => {
  // Il gemello della prova sopra: se nessuno filtrasse più le pastiglie da
  // nessuna parte, un passo che il tasto non offre tornerebbe a comparire
  // come pastiglia accesa — la stessa botola del Task 6, dall'altro verso.
  assert.match(PIANO, /tasto\.passi/, 'Piano.jsx non filtra piu’ le pastiglie con tasto.passi');
});

test('«filmato» non compare piu’ nelle liste di esclusione', () => {
  /*
   * Erano tre liste identiche piu' un Set, e tenerle in sincronia a mano e'
   * gia' fallito una volta: `filmato` rimasto fuori mentre veniva aggiunto
   * altrove, e chi apriva Filmato si trovava sopra il nome di un JPG e il
   * tasto Zack, che avrebbe scontornato l'immagine mentre lui guardava una
   * clip (il commento e' ancora in App.jsx a raccontarlo).
   */
  const liste = APP.match(/\[[^\]]*'filmato'[^\]]*\]\.includes\(tool\)/g) || [];
  assert.deepEqual(liste, [], `«filmato» sta ancora in ${liste.length} lista/e di esclusione`);
});

test('chi ha un descrittore passa dall’impianto', () => {
  // Una risposta sola alla domanda «questo servizio passa dall'impianto?».
  // Due risposte divergono al primo servizio nuovo: e' quello che aveva
  // lasciato `filmato` fuori da una lista.
  assert.match(APP, /DESCRITTORI\[tool\]/, 'il filmato non entra ancora in <Piano>');
});

test('la libreria e la barra di stato seguono l’impianto, non un id', () => {
  /*
   * Erano `tool !== 'scontorna'`: dicevano «tranne lo scontorno» e
   * intendevano «tranne chi passa dall'impianto». Con Filmato dentro
   * l'impianto, quelle due comparivano sotto la sua tela — la barra di stato
   * col nome di un file e «Scarica tutto» della libreria, cioe' esattamente
   * cio' che l'impianto toglie di mezzo.
   */
  assert.doesNotMatch(
    APP,
    /tool !== 'scontorna'/,
    'la libreria o la barra di stato guardano ancora un id invece del descrittore',
  );
});

test('il video sta sugli scacchi, come i ritagli', () => {
  /*
   * MISURATO il 2026-09-04: `MediaRecorder` conserva l'alfa (canvas mezzo
   * trasparente registrato e riletto: meta' a [0,0,0,0], meta' a
   * [254,1,1,255]), e `alphaFromCreamVoid` porta il panna a zero. Il filmato
   * esce davvero senza sfondo.
   *
   * Ma `.film-video` aveva `background: transparent`, quindi il video stava
   * sul fondo panna dell'app e un filmato CORRETTAMENTE trasparente aveva
   * l'aspetto identico a uno col fondo panna — ed e' quello che il
   * committente ha riferito come difetto.
   *
   * Per i ritagli la regola era gia' pagata: `.bg-tela` ha gli scacchi, col
   * commento che dice perche' — «senza, un ritaglio con un buco nel mezzo
   * sembra riuscito, e il buco si scopre in stampa». Al filmato non era mai
   * arrivata.
   */
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocco = CSS.match(/(?:^|\n)\s*\.film-video\s*\{([^}]*)\}/);
  assert.ok(blocco, '.film-video non esiste piu’ in styles.css');
  assert.match(
    blocco[1],
    /conic-gradient/,
    '.film-video non ha gli scacchi: un video trasparente sembrera’ avere il fondo panna',
  );
});

test('il riquadro della mascotte non dipende da cosa ci sta dentro', () => {
  /*
   * Spec §5.3: la mascotte diventera' una o piu' clip senza sfondo. Il
   * contratto e' gia' scritto per la home in RIPRENDI-QUI §6.4 — «riquadro
   * fisso, allineato in basso: se le clip escono con proporzioni diverse,
   * Zack cambia taglia rispetto al tasto», ed e' la prima cosa che si nota.
   *
   * Con `width: auto` la larghezza la decide l'immagine. Finche' e' un .webp
   * quadrato non si vede; il giorno che entra una clip 16:9 la mascotte
   * cambia taglia e si sposta, e sembrera' un difetto dell'impaginazione
   * invece che di questa riga. Va chiuso ORA, che costa niente.
   */
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocchi = [...CSS.matchAll(/(?:^|\n)\s*\.sc-zack\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(blocchi.length > 0, '.sc-zack non esiste piu’ in styles.css');
  for (const b of blocchi) {
    assert.doesNotMatch(b, /width:\s*auto/, '.sc-zack ha «width: auto»: la larghezza la decide il contenuto');
  }
  assert.ok(
    blocchi.some((b) => /aspect-ratio/.test(b)),
    '.sc-zack non dichiara una proporzione: il riquadro non e’ riservato',
  );
});

test('la barra dello scaricamento riceve davvero un segnale', () => {
  /*
   * Il difetto (2026-09-04, riferito dal committente come «fa "Zack sta
   * lavorando" all'infinito»): `EngineBanner` ha da agosto un ramo
   * `phase === 'downloading'` con una barra di percentuale, e il worker non
   * ha MAI emesso quella fase — mandava solo `loading`, `running`,
   * `compositing`. Era codice in attesa di un segnale che nessuno mandava, e
   * intanto 176 MB scendevano in silenzio.
   *
   * Il test lega le due meta': chi disegna la barra e chi la accende.
   */
  const WORKER = readFileSync(new URL('../src/engine/worker.js', import.meta.url), 'utf8');
  const BANNER = readFileSync(new URL('../src/components/EngineBanner.jsx', import.meta.url), 'utf8');

  assert.match(BANNER, /phase === 'downloading'/, 'la barra non guarda piu’ la fase downloading');
  assert.match(WORKER, /phase: 'downloading'/, 'il worker non emette la fase downloading: la barra resta spenta');
  assert.match(
    APP,
    /progress=\{/,
    'App.jsx non passa la percentuale al banner: la barra si disegnerebbe sempre a zero',
  );
});

test('il modello passa dalla cache, non dall’URL', () => {
  const WORKER = readFileSync(new URL('../src/engine/worker.js', import.meta.url), 'utf8');
  // Con l'URL i byte finiscono nella cache HTTP, che e' la prima a essere
  // sfrattata quando pesa 176 MB — e non e' protetta da `persist()`.
  assert.match(WORKER, /byteDelModello\(/, 'il worker scarica ancora dall’URL: si riscarichera’');
  assert.doesNotMatch(
    WORKER,
    /InferenceSession\.create\(model\.url/,
    'la sessione nasce ancora dall’URL invece che dai byte in cache',
  );
});

test('le icone si disegnano come contorni, non come macchie', () => {
  /*
   * Il difetto (2026-09-05, riferito dal committente: «le icone di strumenti
   * sono fuorvianti e non si riconoscono bene righello, gomma ecc»).
   *
   * I tracciati di `icons.js` sono CONTORNI. Solo `.tool-item svg` (la barra
   * dei servizi) dichiarava `fill: none; stroke: currentColor`, quindi i
   * cerchi degli strumenti prendevano il default del browser — riempimento
   * nero, nessun contorno. Misurato nel browser: `fill: rgb(0,0,0)`,
   * `stroke: none` su tutti e quattro. Una gomma riempita e' una macchia, e
   * `M13.8 7.2l3 3`, che e' una linea, riempita non si vede affatto.
   *
   * Ora lo dichiara il COMPONENTE, cosi' vale per ogni uso presente e futuro:
   * una regola CSS accanto va ricordata ogni volta, e la volta che ci si
   * dimentica l'icona torna una macchia senza che niente si lamenti.
   */
  const ICON = readFileSync(new URL('../src/components/Icon.jsx', import.meta.url), 'utf8');
  const tag = ICON.slice(ICON.indexOf('<svg'), ICON.indexOf('>', ICON.indexOf('<svg')));
  assert.match(tag, /fill="none"/, 'Icon.jsx non dichiara fill="none": i contorni si riempiono di nero');
  assert.match(tag, /stroke="currentColor"/, 'Icon.jsx non dichiara lo stroke: i contorni spariscono');
});

test('l’icona si sceglie per qualunque file, non solo per i .md', () => {
  /*
   * `iconaDocumento(asset)` legge `asset.meta.icona` per QUALUNQUE asset, e il
   * selettore esisteva — ma era dietro `KIND_TESTO.includes(kind)`, e
   * `KIND_TESTO = ['md']`. Quindi solo i .md potevano avere un'icona, mentre
   * su una tela con venti file e' proprio l'icona a dire cosa sono.
   *
   * Richiesta del committente del 2026-09-04: era costruito e chiuso a chiave.
   */
  const BRAIN = readFileSync(new URL('../src/components/Brain.jsx', import.meta.url), 'utf8');
  const i = BRAIN.indexOf('brain-icona');
  assert.notEqual(i, -1, 'il selettore delle icone non esiste piu’');
  // La finestra risale fino alla condizione che apre il blocco. Larga, perche'
  // il commento sopra racconta perche' il lucchetto c'era: troppo stretta, e
  // il test boccerebbe la riga giusta (e' gia' successo, 2026-09-04).
  const intorno = BRAIN.slice(Math.max(0, i - 900), i);
  const ultimaCondizione = intorno.lastIndexOf('{assetScelto');
  assert.notEqual(ultimaCondizione, -1, 'la condizione che apre il selettore non si trova');
  assert.doesNotMatch(
    intorno.slice(ultimaCondizione),
    /KIND_TESTO\.includes\([^)]*\)\s*&&/,
    'il selettore delle icone e’ ancora riservato ai .md',
  );
});

test('non restano liste di id: tutti i servizi passano dal descrittore', () => {
  /*
   * Erano tre liste identiche da quattro `id`, piu' un Set, piu' due
   * `tool !== 'scontorna'`. Il pezzo 2 le ha ridotte a `['brain','suono']`, e
   * qui spariscono: anche quei due hanno un descrittore.
   *
   * Restano i `tool === 'suono'` singoli, e vanno bene: sono «cosa vuol dire
   * PIENO per questo servizio», cioe' una cosa che il descrittore non
   * dichiara perche' e' una chiusura sullo stato di React. La lista era
   * un'altra cosa — la domanda «questo servizio passa dall'impianto?», che
   * ora ha una risposta sola.
   */
  const liste = APP.match(/\[[^\]]*'(?:brain|suono)'[^\]]*\]\.includes\(tool\)/g) || [];
  assert.deepEqual(liste, [], `restano ${liste.length} liste di id in App.jsx`);
});

test('ogni faccia della striscia e’ un file che esiste davvero', () => {
  /*
   * Il percorso e' costruito a mano — `/zack/servizi/${tool}-320.webp` — e un
   * id senza la sua immagine da' un riquadro rotto in cima allo schermo,
   * senza un errore in console. E' successo il 2026-09-08 dividendo «suono»
   * in due: «effetti» e' entrato nell'elenco e ha chiesto un file mai
   * disegnato.
   */
  const elenco = APP.match(/const FACCIA = new Set\(\[([^\]]*)\]\)/);
  assert.ok(elenco, 'FACCIA non esiste piu’ in App.jsx');
  for (const id of elenco[1].match(/'([a-z]+)'/g).map((x) => x.slice(1, -1))) {
    const f = new URL(`../public/zack/servizi/${id}-320.webp`, import.meta.url);
    assert.ok(existsSync(f), `la striscia mostrerebbe «${id}», che non ha un'immagine`);
  }
});

test('«c’e’ un risultato» non vuol dire PNG per tutti', () => {
  /*
   * Il vettoriale produce un SVG. Con `risultato: result?.kind === 'png'`
   * scritto una volta per tutti, il suo «apri nell'editor» era dichiarato nel
   * descrittore, aveva il suo gesto in `GESTI`, e non sarebbe comparso mai.
   * Nessuno degli altri test poteva vederlo: sono tutti veri presi uno per
   * uno, ed e' il loro incastro a essere sbagliato.
   */
  assert.doesNotMatch(
    APP,
    /risultato: result\?\.kind === 'png'/,
    'il tipo del risultato e’ ancora PNG per tutti i servizi',
  );
});

// ⚠️ Task 9 (committente, 2026-09-15) ha SUPERATO il contratto § 8
// (2026-09-04): la pianta dello studio rimanda il tasto Zack in basso al
// centro — «sotto di lui non c'e' piu' la fila dei servizi, che e' salita in
// cima» — e il pannello del punto oro torna ad aprirsi SOPRA di lui, non
// sotto. Le due prove qui sotto controllavano la decisione vecchia (tasto in
// alto, pannello in giu'); sono state riscritte sulla decisione nuova, non
// cancellate — lo stesso principio che il file applica a se stesso.
//
// ⚠️ C3 + M1 (revisione, giro di correzione 1): il file ha DUE blocchi
// `@media (min-width: 761px)` — questo (Task 9, riga ~1574) e il §8
// (2026-09-04, più in basso), che vince la cascata sulle stesse proprietà
// perché sta dopo nel file. Le due prove qui sotto facevano
// `CSS.slice(CSS.indexOf(...))` e poi `.match()` SENZA `/g`: il primo
// `.sc-tasto {...}` (o `.sc-tuo {...}`) che il motore incontra dopo quel
// punto è quello scritto da QUESTO blocco — cioè quello giusto per
// costruzione, non quello che vince davvero nel browser. Il controller ha
// rimesso `top: 58px` e `top: calc(100% + 10px)` nel blocco §8 (quello che
// vince) e la suite è restata verde. `ogniRegolaDesktop` estrae OGNI blocco
// `@media (min-width: 761px)` del file (bilanciando le graffe, non una
// finestra a lunghezza fissa — altrimenti si ricade in I4) e le due prove
// ora controllano OGNI occorrenza della regola, in entrambi i blocchi.
// Anche la guardia era a metà: `/top:\s*\d/` non vede `top: calc(...)`, e
// `/top:\s*calc/` non vede `top: 100px`. Le due forme sono guardate insieme.
/*
 * ⚠️ Minor (revisione, giro di correzione 2): il bilanciamento delle graffe
 * contava anche quelle dentro i commenti (innocuo oggi — zero graffe nei
 * commenti di questo blocco — ma non una garanzia per sempre), e la regola
 * per selettore cercava `\.selettore\s*\{([^}]*)\}`: un COMMENTO con una `}`
 * dentro la regola guardata tronca quella finestra prima della proprietà
 * cercata, e un selettore RAGGRUPPATO (`.sc-tasto,\n  .altro {`) non è mai
 * seguito subito da `{`, quindi sfuggirebbe. Le due funzioni sotto tolgono i
 * commenti prima di contare/cercare e confrontano i selettori spezzati per
 * virgola invece di pretendere che il selettore preceda subito la graffa.
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

function ogniRegolaDesktop(css, selettore) {
  const blocchi = [];
  const apertura = /@media \(min-width: 761px\)\s*\{/g;
  let m;
  while ((m = apertura.exec(css))) {
    const i = m.index + m[0].length;
    const fine = trovaFineBlocco(css, i);
    blocchi.push(css.slice(i, fine));
    apertura.lastIndex = fine;
  }
  return blocchi.flatMap((b) => regoleDelSelettore(b, `.${selettore}`));
}

test('sul desktop il tasto Zack sta in BASSO al centro, non piu’ in alto a destra', () => {
  /*
   * Misurato nel browser a 1280 px dopo Task 9: il tasto e' centrato in
   * orizzontale (`left: 50%; transform: translateX(-50%)`) e NON porta piu'
   * nessun `top:` che lo ancori in alto — ricade sulla regola base
   * (`bottom: 8px`), la stessa lettura di sorgente usata da questo file
   * prima del contratto § 8.
   */
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const regole = ogniRegolaDesktop(CSS, 'sc-tasto');
  assert.ok(regole.length > 0, 'il desktop non dice piu’ dove sta il tasto');
  for (const regola of regole) {
    assert.doesNotMatch(
      regola,
      /top:\s*(?:calc|\d)/,
      'il tasto e’ tornato ad ancorarsi in alto in uno dei blocchi ≥761px',
    );
  }
  assert.ok(
    regole.some((r) => /left:\s*50%/.test(r)),
    'il tasto non e’ piu’ centrato in orizzontale in nessun blocco ≥761px',
  );
});

test('sul desktop il pannello del punto oro si apre in SU, sopra il tasto', () => {
  // Il tasto e' tornato in basso: aprirsi verso il basso vuol dire finire
  // sotto la fila dei servizi, che ora sta in cima ma non lascia spazio li'.
  const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const regole = ogniRegolaDesktop(CSS, 'sc-tuo');
  assert.ok(regole.length > 0, 'il pannello non e’ stato girato per il desktop');
  for (const regola of regole) {
    assert.doesNotMatch(
      regola,
      /top:\s*(?:calc|\d)/,
      'il pannello e’ tornato ad aprirsi verso il basso in uno dei blocchi ≥761px',
    );
  }
  assert.ok(
    regole.some((r) => /left:\s*50%/.test(r)),
    'il pannello non e’ piu’ centrato sotto il tasto in nessun blocco ≥761px',
  );
});
