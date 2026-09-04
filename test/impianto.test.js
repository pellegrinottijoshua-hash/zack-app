import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DESCRITTORI } from '../src/servizi/index.js';

/*
 * L'impianto legge il descrittore, non consulta liste di `id`.
 *
 * Il difetto che questo test impedisce di ripetere: il comportamento sparso
 * in `[...].includes(tool)` dentro App.jsx. Una lista dimenticata non solleva
 * niente — si vede aprendo il servizio, ed e' gia' costato una volta.
 */
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

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
  const mappa = APP.slice(inizio, inizio + 1200);
  for (const d of Object.values(DESCRITTORI)) {
    for (const s of d.strumenti) {
      assert.match(mappa, new RegExp(`\\b${s.id}\\b`), `manca il gesto per «${s.id}» (${d.id})`);
    }
  }
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
