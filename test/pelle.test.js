import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { postoDelPiu, mostraMascotte, mostraCrediti, mostraInFila } from '../src/servizi/pelle.js';
import { pianoVuoto, quantiSulPiano } from '../src/servizi/piano.js';
import { DESCRITTORI } from '../src/servizi/index.js';

/*
 * Le prove che seguono, in fondo al file, sono prove DI SORGENTE: qui non
 * c'è un DOM, quindi invece di disegnare il componente si legge il file e si
 * cerca cosa c'è scritto — lo stesso stile di `test/impianto.test.js`. Sono
 * più deboli di una prova che monta davvero il componente, e per questo ognuna
 * cerca una cosa precisa e stretta, non una parola sparsa in tutto il file.
 */
const PIANO = readFileSync(new URL('../src/components/Piano.jsx', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const TOOLRAIL = readFileSync(new URL('../src/components/ToolRail.jsx', import.meta.url), 'utf8');

test('col piano vuoto il + sta in mezzo: è il gesto con cui si comincia', () => {
  assert.equal(postoDelPiu('scontorna', { quanti: 0, tetto: 3 }), 'centro');
});

test('appena entra un file il + va a sinistra — si entra da sinistra, si esce a destra', () => {
  assert.equal(postoDelPiu('scontorna', { quanti: 1, tetto: 3 }), 'sinistra');
  assert.equal(postoDelPiu('scontorna', { quanti: 2, tetto: 3 }), 'sinistra');
});

test('al tetto il + sparisce', () => {
  assert.equal(postoDelPiu('scontorna', { quanti: 3, tetto: 3 }), null);
  // Brain tiene 99: il + non deve sparire al terzo oggetto.
  assert.equal(postoDelPiu('brain', { quanti: 3, tetto: 99 }), 'sinistra');
});

test('la mascotte è lo stato vuoto, e se ne va col primo file', () => {
  assert.equal(mostraMascotte('scontorna', { quanti: 0 }), true);
  assert.equal(mostraMascotte('scontorna', { quanti: 1 }), false);
});

test('la mascotte non c\'è su Brain: è una libreria, non uno stato vuoto', () => {
  assert.equal(mostraMascotte('brain', { quanti: 0 }), false);
});

test('i crediti NON si vedono in home né in scontorna', () => {
  // H3: chi apre un'app gratis non vuole leggere «0,00 €», vuole scontornare.
  assert.equal(mostraCrediti('scontorna'), false);
  assert.equal(mostraCrediti('brain'), false);
});

test('i crediti si vedono dove si spendono', () => {
  // ⚠️ È la porta verso il pagamento: toglierla dappertutto rifarebbe il
  // difetto peggiore di B2 (il tasto per ricaricare che spariva a saldo zero).
  assert.equal(mostraCrediti('immagine'), true);
});

test('mostraCrediti segue il descrittore di ogni servizio: se serve è «saldo», mostraCrediti deve tornare true', () => {
  // SPENDONO è una copia a mano dell'informazione «serve: 'saldo'» che vive nel
  // descrittore di ogni servizio. Se domani nasce un servizio con serve:'saldo'
  // e chi lo aggiunge si dimentica di metterlo in SPENDONO, mostraCrediti(id)
  // tornerà false — e il tasto dei crediti (la sola porta verso la Ricarica)
  // sparirà per quel servizio. Un cliente a saldo zero resterebbe chiuso.
  //
  // Questa prova è il filo che tiene legata SPENDONO al descrittore: per ogni
  // id, controlla che mostraCrediti(id) coincida con DESCRITTORI[id].serve === 'saldo'.
  // Se i due non coincidono, fallisce e nomina il servizio che ha sbagliato.
  for (const id of Object.keys(DESCRITTORI)) {
    const deveShow = DESCRITTORI[id].serve === 'saldo';
    const mostra = mostraCrediti(id);
    assert.equal(mostra, deveShow, `${id}: mostraCrediti torna ${mostra} ma serve è «${DESCRITTORI[id].serve}»`);
  }
});

test('ogni servizio dell\'impianto ha una risposta, non un undefined', () => {
  // Un servizio nuovo che nessuno elenca qui non deve «cadere» in un
  // comportamento a caso: è così che il filmato restò fuori da tre liste.
  for (const id of Object.keys(DESCRITTORI)) {
    assert.equal(typeof mostraCrediti(id), 'boolean', id);
    assert.equal(typeof mostraMascotte(id, { quanti: 0 }), 'boolean', id);
  }
});

test('«il piano è vuoto» e «il + sta in centro» sono due domande diverse — per Immagine e il Vettoriale rispondono sempre diverso', () => {
  // ⚠️ Prova nata da un guasto vero, non da un timore teorico (Giro di
  // correzioni 1, Critico 1 della revisione del Task 7). Qualcuno ha già
  // scambiato le due domande — per somiglianza di nome, sostituendo `vuoto`
  // con `posto === 'centro'` dentro `Piano.jsx` — e il costo è stato reale:
  // con zero riferimenti Immagine perdeva prompt, Preventivo e riferimenti
  // scelti; con zero file il Vettoriale perdeva la tela panna, restando con
  // otto strumenti di disegno accesi sopra il vuoto. La suite era verde
  // (683/683) mentre queste due schermate erano coperte: nessuna prova
  // guardava DUE stati diversi (quanti file E cosa c'è davvero sul piano)
  // nello stesso confronto.
  //
  // `pianoVuoto` (piano.js) chiede: «c'è qualcosa sopra il piano, o sta
  // succedendo qualcosa?». `postoDelPiu` (pelle.js) chiede: «quanti file (o
  // riferimenti) ci sono, rispetto al tetto?» — e decide SOLO dove va il `+`.
  // Per la maggior parte dei servizi, a zero file le due risposte
  // coincidono per caso (niente sul piano → il + sta in centro). Per
  // Immagine e il Vettoriale NON coincidono mai: il loro piano è la tela
  // stessa (il prompt, il foglio da disegno), quindi non è mai «vuoto»,
  // anche quando il + sta comunque in centro perché zero file/riferimenti
  // sono stati portati dentro.
  //
  // ⚠️ Da sola, però, questa prova NON BASTA (rilievo del Giro di
  // correzioni 2): esercita `pianoVuoto` e `postoDelPiu`, le funzioni pure
  // in `piano.js`/`pelle.js` — ma non tocca mai `Piano.jsx`, che è dove il
  // Critico 1 viveva davvero (il ramo `.sc-tela` che leggeva
  // `posto === 'centro'` invece di `vuoto`). Una rottura fatta togliendo
  // una voce da `COSA_CE` (come sotto) la fa cadere; una rottura fatta
  // dentro il JSX di `Piano.jsx` — la causa vera — la lascia verde, perché
  // qui non c'è DOM e questa prova non legge quel file. Per quello servono
  // le tre prove DI SORGENTE in fondo al file (Giro di correzioni 2): solo
  // loro guardano cosa c'è scritto dentro `Piano.jsx` e `App.jsx`.
  for (const id of Object.keys(DESCRITTORI)) {
    // Uno stato dichiarato, vuoto: nessun file, nessuna clip, niente in
    // corso — il valore di default che ogni campo di `COSA_CE`/`QUANTI`
    // legge con `??` quando lo stato reale non dice nulla.
    const statoVuoto = {};
    const vuoto = pianoVuoto(id, statoVuoto);
    const quanti = quantiSulPiano(id, statoVuoto);
    const tetto = DESCRITTORI[id].accetta.quanti;
    const posto = postoDelPiu(id, { quanti, tetto });

    if (id === 'immagine' || id === 'vettorializza') {
      // La tela c'è sempre: il piano non è mai vuoto...
      assert.equal(vuoto, false, `${id}: il suo piano è la tela — non deve mai risultare vuoto`);
      // ...eppure, a zero file/riferimenti, il + sta comunque in centro.
      // Sono la prova che le due domande NON sono la stessa domanda.
      assert.equal(posto, 'centro', `${id}: a zero file/riferimenti il + sta in centro comunque`);
    } else {
      // Per gli altri servizi, con niente sul piano, le due risposte
      // coincidono — ma per coincidenza dei valori, non perché siano la
      // stessa domanda: è quello che il ramo sopra dimostra rompendosi.
      assert.equal(vuoto, true, `${id}: uno stato dichiarato vuoto deve risultare vuoto`);
      assert.equal(posto, 'centro', `${id}: col piano vuoto il + sta in centro`);
    }
  }
});

// Le due prove che seguono (e quella su «scontornato», più sotto) sono di
// SORGENTE: guardano che un nome COMPAIA nel file, non che sia usato bene.
// Non sono teoria: la suite è stata verde a 683/683 con `postoDelPiu(` e
// `mostraMascotte(` presenti in Piano.jsx e USATI MALE — la stessa funzione
// chiamata sulla domanda sbagliata (Critico 1, sopra). Restano come rete,
// perché non costano niente, ma NON CONTANO COME COPERTURA: la prova che
// avrebbe visto il difetto è quella comportamentale qui sopra.
test('il + chiede a `pelle.js` dove stare, non lo decide dentro il JSX', () => {
  assert.match(PIANO, /postoDelPiu\(/, 'Piano non consulta la regola del +');
});

test('la mascotte chiede a `pelle.js` se esserci', () => {
  assert.match(PIANO, /mostraMascotte\(/);
});

test('il saldo in cima chiede a `pelle.js` se mostrarsi', () => {
  // H3: fuori dalla home e da scontorna. Ma NON tolto dall'app: è l'unica
  // porta verso la ricarica, e in B2 toglierla è costato un Critical.
  const i = APP.indexOf('className="saldo"');
  assert.notEqual(i, -1, 'il tasto del saldo non esiste più: era l’unica porta verso la ricarica');
  assert.match(APP.slice(Math.max(0, i - 400), i), /mostraCrediti\(/);
});

test('il confronto non scrive più «scontornato» sul risultato', () => {
  // Si guarda la RIGA delle etichette, non tutto il file: `-scontornato` è
  // anche il suffisso del nome del file salvato, e quello deve restare.
  const i = APP.indexOf('labels={');
  assert.notEqual(i, -1, 'il confronto non passa più nessuna etichetta: guarda cos’è successo');
  assert.doesNotMatch(APP.slice(i, i + 200), /scontornato/, 'S3: la scritta «scontornato» se n’è andata');
});

// Le tre prove che seguono sono DI SORGENTE, aggiunte nel Giro di correzioni
// 2. Coprono i tre difetti Critici del Giro 1 — tutti e tre dentro il JSX
// di componenti che questo progetto non monta in prova (niente DOM, niente
// jsdom: scelta del progetto, non di questo compito) — e sono qui perché la
// prova comportamentale qui sopra, pur essendo vera e utile, NON basta da
// sola: esercita le funzioni pure, non Piano.jsx/App.jsx dove i difetti
// vivevano davvero. Ognuna affetta una finestra STRETTA di sorgente intorno
// al punto esatto, non l'intero file: in questo file c'è già una trappola
// nota (`-scontornato` come suffisso di un nome di file salvato, vedi la
// prova sopra su «scontornato») che ha insegnato a non cercare largo.

test('la tela sceglie fra vuoto e children guardando `vuoto`, non `posto`', () => {
  // ⚠️ Difetto già successo (Giro 1, Critico 1): il ramo `.sc-tela` leggeva
  // `posto === 'centro'` invece di `vuoto`. `postoDelPiu` conta i FILE, e a
  // zero file/riferimenti torna sempre `'centro'` — anche per Immagine
  // (dove il piano è il prompt, col Preventivo e i riferimenti scelti) e il
  // Vettoriale (dove il piano è il foglio da disegno con gli otto strumenti
  // già accesi). Con `posto === 'centro'` al posto di `vuoto`, quella
  // schermata veniva smontata per intero e sostituita dal solo `+` grande.
  // La suite era verde lo stesso: nessun test toccava questo file.
  const i = PIANO.indexOf('className="sc-tela"');
  assert.notEqual(i, -1, 'la tela `.sc-tela` non esiste più nel file');
  const finestra = PIANO.slice(i, i + 150);
  assert.match(finestra, /\{vuoto \?/, 'torna il Critico 1: la tela non guarda più `vuoto`');
  assert.doesNotMatch(
    finestra,
    /posto === 'centro'/,
    "torna il Critico 1: la tela guarda `posto === 'centro'` e smonta Immagine/Vettoriale a zero file"
  );
});

test("la guardia di `.sc-angolo` non è ristretta a `posto === 'sinistra'`: include anche la × al tetto", () => {
  // ⚠️ Difetto già successo (Giro 1, Critico 2): il contenitore
  // `.sc-angolo` si montava SOLO con `posto === 'sinistra'`. A
  // `quanti === 1` e `tetto === 1` (un file su un servizio che ne accetta
  // uno solo — Vocale, Effetti, Vettoriale) `postoDelPiu` torna `null`: il
  // `+` non serve più, giusto — ma il contenitore non si montava affatto, e
  // si portava via anche la ×, che ha una guardia propria (`quanti === 1 &&
  // onTogli`) e non c'entra col `+`. Toglieva l'unica strada per svuotare
  // il piano su tre `onTogli` cablati: `voce.reset` (Vocale), il reset
  // dell'effetto (Effetti), `reset` del file portato dentro (Vettoriale).
  // La suite era verde lo stesso: nessun test toccava questo file.
  const i = PIANO.indexOf('className="sc-angolo"');
  assert.notEqual(i, -1, 'il contenitore `.sc-angolo` non esiste più nel file');
  const finestra = PIANO.slice(Math.max(0, i - 150), i);
  assert.match(
    finestra,
    /\(posto === 'sinistra' \|\| \(quanti === 1 && onTogli\)\)/,
    "torna il Critico 2: la guardia è ristretta a `posto === 'sinistra'` e perde la × al tetto"
  );
});

test('`BatchGrid` è montato con lo zip del blocco, non con `null`', () => {
  // ⚠️ Difetto già successo (Giro 1, Critico 3): `<BatchGrid
  // onDownloadAll={null}>` — il bottone «SCARICA TUTTI» del blocco si
  // montava lo stesso (aspettando una funzione che non arrivava mai), e lo
  // zip dei risultati del blocco lavorato non aveva nessuna strada per
  // essere scaricato. `scaricaIlPiano` è la stessa funzione già cablata su
  // `GESTI.scarica` per il file singolo; con `batch.results.length > 0`
  // prende il ramo del blocco. La suite era verde lo stesso: nessun test
  // toccava questo file.
  const i = APP.indexOf('<BatchGrid');
  assert.notEqual(i, -1, '`BatchGrid` non è più montato in App.jsx');
  const finestra = APP.slice(i, i + 1100);
  assert.match(finestra, /onDownloadAll=\{scaricaIlPiano\}/, 'torna il Critico 3: lo zip del blocco non è più cablato');
  assert.doesNotMatch(finestra, /onDownloadAll=\{null\}/, 'torna il Critico 3: onDownloadAll è di nuovo null');
});

// Le prove che seguono legano la fila (`ToolRail.jsx`, e `ordineDellaFila` in
// `services.js`) alla stessa regola del muro — deciso dal committente il
// 2026-09-15 (H1-bis): un secondo elenco, scritto a mano per «chi è
// abbonato», divergerebbe dal primo al primo servizio nuovo.

test('col muro SPENTO si vede tutto: nascondere ora sarebbe togliere', () => {
  /*
   * Lo stato di oggi, dichiarato: muro spento, nessun abbonamento in corso.
   * Nascondere i servizi da abbonamento adesso li toglierebbe a TUTTI —
   * compreso chi paga — mentre nessuno può nemmeno abbonarsi, perché il primo
   * ingresso via email è ancora rotto da B1.
   */
  for (const id of ['vettorializza', 'vocale', 'effetti', 'immagine', 'scontorna']) {
    assert.equal(mostraInFila(DESCRITTORI[id], { muroAcceso: false, abbonato: false }), true, id);
  }
});

test('col muro ACCESO restano i tre che l’abbonamento non lo chiede', () => {
  const visti = ['vettorializza', 'immagine', 'scontorna', 'video', 'vocale', 'effetti']
    .filter((id) => mostraInFila(DESCRITTORI[id], { muroAcceso: true, abbonato: false }));
  assert.deepEqual(visti, ['immagine', 'scontorna', 'video']);
});

test('chi è abbonato li vede tutti, muro o no', () => {
  for (const id of Object.keys(DESCRITTORI)) {
    assert.equal(mostraInFila(DESCRITTORI[id], { muroAcceso: true, abbonato: true }), true, id);
  }
});

test('⚠️ immagine non sparisce MAI dalla fila', () => {
  // È il servizio che si paga a consumo: chi ha crediti li ha già dati. Un
  // cerchio nascosto lì è un vicolo cieco davanti a soldi suoi — la stessa
  // forma del Critical di B2.
  assert.equal(mostraInFila(DESCRITTORI.immagine, { muroAcceso: true, abbonato: false }), true);
});

test('un servizio senza descrittore resta in fila, non sparisce in silenzio', () => {
  // `video` non ha un descrittore (non è ancora nell'impianto): la stessa
  // scelta già presa da `servizioAperto` per il descrittore assente.
  assert.equal(mostraInFila(undefined, { muroAcceso: true, abbonato: false }), true);
});

// Prova DI SORGENTE (Important 2, giro di correzione 1): i test qui sopra
// provano che `mostraInFila` è corretta IN ISOLAMENTO — non provano che
// `ToolRail.jsx` la chiami affatto, né con quali argomenti. Due difetti
// reali restano invisibili a quelle prove da sole:
//   - si toglie il `.filter(...)`: col muro alzato un non abbonato vede
//     tutti e sei i cerchi — i servizi a pagamento regalati;
//   - si passa `abbonato: false` scritto a mano invece della prop vera: un
//     abbonato PAGANTE perde vettoriale/vocale/effetti — quattro porte
//     chiuse a chi ha pagato.
// Questa prova pretende che `ordineDellaFila()` sia seguito da un `.filter`
// che chiama `mostraInFila` con ENTRAMBE le variabili vere prese dalle prop,
// non con un letterale al loro posto.
test('la fila filtra DAVVERO con mostraInFila, con le variabili vere', () => {
  const i = TOOLRAIL.indexOf('ordineDellaFila()');
  assert.notEqual(i, -1, 'ToolRail.jsx non chiama più ordineDellaFila()');
  const finestra = TOOLRAIL.slice(i, i + 200);
  assert.match(
    finestra,
    /\.filter\(\(s\) => mostraInFila\(DESCRITTORI\[s\.id\],\s*\{\s*muroAcceso,\s*abbonato\s*\}\)\)/,
    'la fila non filtra più con mostraInFila(DESCRITTORI[s.id], { muroAcceso, abbonato }): il .filter è sparito, o gli argomenti non sono più le prop vere',
  );
});

// Giro finale del Bloccante 2 (2026-09-24): il palco conta i cerchi per
// fianco per farsi alto quanto la sua colonna più lunga.
test('cerchiPerLato: chi non dichiara un lato sta a destra', async () => {
  const { cerchiPerLato } = await import('../src/servizi/pelle.js');
  assert.deepEqual(cerchiPerLato([]), { sinistra: 0, destra: 0 });
  assert.deepEqual(cerchiPerLato(), { sinistra: 0, destra: 0 });
  assert.deepEqual(
    cerchiPerLato([{ id: 'a' }, { id: 'b', lato: 'destra' }, { id: 'c', lato: 'sinistra' }]),
    { sinistra: 1, destra: 2 },
  );
});

test('cerchiPerLato: il Vettoriale ha otto cerchi a sinistra (quelli che sparivano a 1280×800)', async () => {
  const { cerchiPerLato } = await import('../src/servizi/pelle.js');
  const { strumentiVisibili, getDescrittore } = await import('../src/servizi/index.js');
  const d = getDescrittore('vettorializza');
  assert.deepEqual(cerchiPerLato(strumentiVisibili(d, { file: true, risultato: false })).sinistra, 8);
});
