# L'impianto, e Filmato che ci entra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lo scontorno smette di essere una schermata speciale e diventa **l'impianto** di ogni servizio; Filmato è il primo a entrarci, e ci entra senza inventare un gesto nuovo.

**Architecture:** `Scontorna.jsx` diventa `Piano.jsx`, generico, e ogni servizio dichiara in `src/servizi/<id>.js` le tre cose che lo distinguono — cosa accetta il `+`, cosa fa il tasto Zack, quali strumenti compaiono e quando. Il descrittore è **dati puri**, quindi testabile in Node come `ricette.js`; `App.jsx` legge il descrittore invece di consultare liste sparse di `id`. Filmato entra per ultimo perché è la **prova** che l'impianto regge: è «uguale a scontorna», quindi se serve inventare qualcosa, l'impianto è sbagliato.

**Tech Stack:** React 19 (nessun router), Vite 6 a due entrate, `node --test` (runner nativo di Node), **non** vitest.

**Spec:** [docs/superpowers/specs/2026-09-04-impianto-unico-design.md](../specs/2026-09-04-impianto-unico-design.md) — pezzo 2, § 5-7.4.

---

## Global Constraints

- **`npm test && npm run build` verdi prima di ogni commit.**
- **`git add <percorsi>`, mai `git add -A`.** `git commit` committa tutto l'indice.
- **Un commit per decisione**, col *perché* nel corpo.
- **Interfaccia bilingue:** ogni chiave nuova va in `src/i18n/it.json` **e** `src/i18n/en.json`, o `test/i18n.test.js` fallisce.
- **«asset», mai «lavoro/work/piece»** nelle stringhe: un test le bandisce. Eccezioni: «piano di lavoro», «work surface».
- **Si dice «impianto»**, non «guscio» né «modello»: `modello` in questo codice è già il modello ONNX.
- **Gli strumenti non coprono la tela.** Unica eccezione dichiarata: l'ovale del punto oro, che è *un momento e non uno stato*.
- **I tasti sono cerchi**, e il nome sta nel `title`.
- **Gli strumenti compaiono dopo**: prima non c'è niente da correggere.
- **Il colore non è mai l'unico segnale.**
- **Il descrittore è dati, non un programma.** Niente rami condizionali dentro: se serve logica, va in un modulo `engine/` e il descrittore lo nomina.
- **Niente montaggio video, niente timeline** — il confine di `engine/clip.js` resta.
- **Ogni attesa si dichiara prima**, con la sua durata.
- **Si misura, non si suppone.** Le misure di § 9 sono fatte: `MediaRecorder` conserva l'alfa, e la striscia a 375 px lascia 229 px di margine.

---

## File Structure

| file | responsabilità | task |
|---|---|---|
| **Create** `src/servizi/index.js` | Il registro dei descrittori e le due funzioni pure che li interrogano. | 1 |
| **Create** `src/servizi/scontorna.js` | Cosa accetta il `+`, cosa fa il tasto, quali strumenti — per lo scontorno. | 1 |
| **Create** `src/servizi/filmato.js` | Idem per il filmato. | 1 |
| **Create** `test/servizi.test.js` | Che i descrittori dicano la verità, e che il validatore rifiuti quelli storti. | 1 |
| **Rename** `src/components/Scontorna.jsx` → `src/components/Piano.jsx` | L'impianto, generico. Prende un `servizio`. | 2 |
| **Modify** `src/App.jsx` | Legge il descrittore invece delle liste di `id`; Filmato entra nell'impianto. | 2, 3, 4 |
| **Modify** `src/components/FilmLab.jsx` | Perde la sua impaginazione a sé; i tre gesti diventano strumenti dell'impianto. | 4, 5 |
| **Modify** `src/styles.css` | `.film-video` prende gli scacchi. | 6 |
| **Create** `test/impianto.test.js` | Che le liste di `id` non tornino, e che il video abbia gli scacchi. | 3, 6 |

---

## Task 1: I descrittori

Puro. Nessun canvas, nessun React, nessun DOM — quindi tutto testabile in Node, che è la regola già scritta per `ricette.js`.

**Files:**
- Create: `src/servizi/index.js`, `src/servizi/scontorna.js`, `src/servizi/filmato.js`
- Create: `test/servizi.test.js`

**Interfaces:**
- Consumes: niente
- Produces:
  - `QUANDO: string[]` — la lista chiusa degli stati
  - `getDescrittore(id: string) => Descrittore` — solleva se l'id è sconosciuto
  - `strumentiVisibili(descrittore, stato: {file: boolean, risultato: boolean}) => Strumento[]`
  - `validaDescrittore(d) => void` — solleva con un messaggio che dice cosa manca
  - `Strumento = {id, icon, label, quando}`

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `test/servizi.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUANDO,
  getDescrittore,
  strumentiVisibili,
  validaDescrittore,
  DESCRITTORI,
} from '../src/servizi/index.js';

/*
 * Il descrittore di un servizio: cosa accetta il `+`, cosa fa il tasto Zack,
 * quali strumenti compaiono e quando.
 *
 * Il difetto che questi test impediscono di ripetere (2026-09-04): il
 * comportamento di ogni servizio era sparso in liste di `id` dentro App.jsx —
 * `['brain','suono','filmato','scontorna'].includes(tool)` compariva TRE
 * volte, piu' `FACCIA`, piu' otto `tool === 'scontorna'`. Ogni servizio nuovo
 * era una caccia a quelle liste, e una lista dimenticata era un bug: e' gia'
 * successo con `filmato`, rimasto fuori mentre veniva aggiunto altrove, e chi
 * apriva Filmato si trovava sopra il nome di un JPG.
 *
 * Qui il comportamento e' DATI, quindi si guarda invece di cercarlo.
 */

test('lo scontorno con un risultato mostra i quattro strumenti di correzione', () => {
  const s = strumentiVisibili(getDescrittore('scontorna'), { file: true, risultato: true });
  assert.deepEqual(s.map((x) => x.id), ['righello', 'restore', 'erase', 'undo']);
});

test('lo scontorno col solo file mostra annulla e cambia file', () => {
  // Prima del risultato non c'e' niente da correggere: il righello e i due
  // pennelli non hanno su cosa lavorare.
  const s = strumentiVisibili(getDescrittore('scontorna'), { file: true, risultato: false });
  assert.deepEqual(s.map((x) => x.id), ['undo', 'swap']);
});

test('il piano vuoto non mostra nessuno strumento', () => {
  const s = strumentiVisibili(getDescrittore('scontorna'), { file: false, risultato: false });
  assert.deepEqual(s, []);
});

test('il filmato mostra i suoi tre gesti, e solo con un file sul piano', () => {
  const d = getDescrittore('filmato');
  assert.deepEqual(
    strumentiVisibili(d, { file: true, risultato: false }).map((x) => x.id),
    ['taglia', 'fotogrammi', 'sfondo'],
  );
  assert.deepEqual(strumentiVisibili(d, { file: false, risultato: false }), []);
});

test('un servizio sconosciuto lo dice, non restituisce undefined', () => {
  // Un `undefined` qui diventerebbe una schermata vuota senza errore: il tipo
  // di guasto che si scopre solo guardandolo.
  assert.throws(() => getDescrittore('teletrasporto'), /teletrasporto/);
});

test('ogni descrittore registrato e’ valido', () => {
  for (const [id, d] of Object.entries(DESCRITTORI)) {
    assert.doesNotThrow(() => validaDescrittore(d), `${id} non passa il validatore`);
    assert.equal(d.id, id, `${id}: l’id dentro non combacia con la chiave`);
  }
});

test('uno stato «quando» inventato viene rifiutato', () => {
  // La lista e' chiusa apposta: uno stato nuovo si aggiunge qui, e allora
  // `strumentiVisibili` sa cosa farne. Uno scritto a mano nel descrittore
  // sparirebbe in silenzio — lo strumento non comparirebbe mai, e nessuno
  // saprebbe perche'.
  assert.throws(
    () =>
      validaDescrittore({
        id: 'finto',
        claim: 'drop.claim',
        accetta: { file: ['image/*'], quanti: 1 },
        tasto: { azione: 'catena' },
        strumenti: [{ id: 'x', icon: 'undo', label: 'bar.undo', quando: 'quando-mi-va' }],
      }),
    /quando-mi-va/,
  );
});

test('la lista degli stati resta chiusa', () => {
  // Se questo numero cambia e' una decisione, non una cosa che scivola dentro.
  assert.equal(QUANDO.length, 4);
});
```

- [ ] **Step 2: Far girare il test — deve fallire**

```bash
npm test 2>&1 | grep -E "^not ok|does not provide|Cannot find" | head
```

Atteso: FAIL — `src/servizi/index.js` non esiste.

- [ ] **Step 3: Scrivere `src/servizi/scontorna.js`**

```js
/**
 * Lo scontorno, dichiarato.
 *
 * Queste tre cose — cosa accetta il `+`, cosa fa il tasto, quali strumenti —
 * erano sparse dentro `App.jsx` come rami condizionali. Qui sono dati, quindi
 * un test le guarda invece di cercarle.
 */
export default {
  id: 'scontorna',
  /** La frase sotto il `+` col piano vuoto. Chiave i18n, non testo. */
  claim: 'drop.claim',

  /** Fino a tre: il quarto e' l'invito allo studio, come sulla home. */
  accetta: { file: ['image/*'], quanti: 3 },

  /**
   * Il tasto esegue la catena decisa nel punto oro. `azione` e' un id e non
   * una funzione: il descrittore e' dati, e chi esegue sta in `engine/`.
   */
  tasto: {
    azione: 'catena',
    /** I due offerti qui. Il terzo (illustrazioni) resta nel motore. */
    modelli: ['u2net', 'isnet-general-use'],
    /** Le pastiglie ×4 ×2 :2 :4 nel punto oro. */
    fattori: true,
  },

  /*
   * L'ordine e' quello del disegno: il righello guida, gli altri due
   * dipingono, l'annulla torna indietro.
   */
  strumenti: [
    { id: 'righello', icon: 'righello', label: 'brush.ruler', quando: 'con-risultato' },
    { id: 'restore', icon: 'pencil', label: 'brush.restore', quando: 'con-risultato' },
    { id: 'erase', icon: 'eraser', label: 'brush.erase', quando: 'con-risultato' },
    { id: 'undo', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
    // Cambiare file ha senso finche' non c'e' un risultato: dopo, cambiarlo
    // butterebbe via il lavoro senza dirlo.
    { id: 'swap', icon: 'swap', label: 'bar.swap', quando: 'con-file-senza-risultato' },
  ],
};
```

- [ ] **Step 4: Scrivere `src/servizi/filmato.js`**

```js
/**
 * Il filmato: «uguale a scontorna, solo per i video» (committente,
 * 2026-09-04). Uguale l'IMPIANTO — i tre gesti che gia' esistono diventano
 * i cerchi, e non se ne inventa nessuno.
 *
 * Il confine resta quello dichiarato in `engine/clip.js`: tre gesti su un
 * file solo, niente montaggio, niente timeline.
 */
export default {
  id: 'filmato',
  claim: 'film.vuotoNota',

  /** Un filmato per volta: i tre gesti sono su un file solo. */
  accetta: { file: ['video/mp4', 'video/webm', 'video/quicktime'], quanti: 1 },

  tasto: { azione: 'catena', modelli: [], fattori: false },

  strumenti: [
    { id: 'taglia', icon: 'crop', label: 'film.taglia', quando: 'con-file' },
    { id: 'fotogrammi', icon: 'film', label: 'film.frames', quando: 'con-file' },
    { id: 'sfondo', icon: 'scissors', label: 'film.sfondo', quando: 'con-file' },
  ],
};
```

- [ ] **Step 5: Scrivere `src/servizi/index.js`**

```js
import scontorna from './scontorna.js';
import filmato from './filmato.js';

/**
 * I descrittori dei servizi: dove vive il comportamento di ognuno.
 *
 * Puro — nessun canvas, nessun React, nessun DOM — perche' e' la parte che
 * decide cosa si vede, ed e' capace di sbagliare in silenzio: uno strumento
 * che non compare mai non solleva niente. Va dove i test la vedono, in Node.
 * Stessa ragione di `ricette.js`, `holes.js`, `keying.js`.
 */
export const DESCRITTORI = { scontorna, filmato };

/**
 * Gli stati in cui uno strumento puo' comparire. **Lista chiusa.**
 *
 * Chiusa apposta: uno stato nuovo si aggiunge QUI, e allora
 * `strumentiVisibili` sa cosa farne. Uno scritto a mano dentro un descrittore
 * sparirebbe in silenzio — lo strumento non comparirebbe mai, e nessuno
 * saprebbe perche'. Per questo `validaDescrittore` lo rifiuta.
 */
export const QUANDO = ['sempre', 'con-file', 'con-risultato', 'con-file-senza-risultato'];

/** Il descrittore di un servizio, o un errore che lo nomina. */
export function getDescrittore(id) {
  const d = DESCRITTORI[id];
  if (!d) throw new Error(`Servizio senza descrittore: ${id}`);
  return d;
}

/**
 * Quali strumenti si vedono, dato cosa c'e' sul piano.
 *
 * `stato` e' due booleani e basta. Se un giorno servisse di piu', si allarga
 * `QUANDO`, non si passa qui un oggetto che il descrittore deve interpretare:
 * quello sarebbe rimettere il programma dentro i dati.
 */
export function strumentiVisibili(descrittore, { file = false, risultato = false } = {}) {
  const vale = {
    sempre: () => true,
    'con-file': () => file,
    'con-risultato': () => file && risultato,
    'con-file-senza-risultato': () => file && !risultato,
  };
  return descrittore.strumenti.filter((s) => vale[s.quando]());
}

/** Un descrittore storto lo dice subito, con dentro cosa non va. */
export function validaDescrittore(d) {
  if (!d || typeof d !== 'object') throw new Error('Descrittore assente.');
  for (const campo of ['id', 'claim', 'accetta', 'tasto', 'strumenti']) {
    if (!d[campo]) throw new Error(`Descrittore ${d.id || '?'}: manca «${campo}».`);
  }
  if (!Array.isArray(d.strumenti)) {
    throw new Error(`Descrittore ${d.id}: «strumenti» non e' una lista.`);
  }
  for (const s of d.strumenti) {
    for (const campo of ['id', 'icon', 'label', 'quando']) {
      if (!s[campo]) throw new Error(`Descrittore ${d.id}, strumento ${s.id || '?'}: manca «${campo}».`);
    }
    if (!QUANDO.includes(s.quando)) {
      throw new Error(`Descrittore ${d.id}, strumento ${s.id}: «${s.quando}» non e' uno stato noto.`);
    }
  }
  const quanti = d.accetta?.quanti;
  if (!Number.isInteger(quanti) || quanti < 1) {
    throw new Error(`Descrittore ${d.id}: «accetta.quanti» deve essere un intero ≥ 1.`);
  }
}
```

- [ ] **Step 6: Far girare i test — devono passare**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)"
```

Atteso: PASS, sette test nuovi verdi.

- [ ] **Step 7: Costruire e committare**

```bash
npm run build >/dev/null && git add src/servizi test/servizi.test.js && git commit -m "$(cat <<'EOF'
feat: ogni servizio dichiara cosa fa, invece di essere cercato in liste di id

Il comportamento di ogni servizio era sparso dentro App.jsx: la lista
['brain','suono','filmato','scontorna'].includes(tool) compariva TRE volte,
piu' FACCIA, piu' otto `tool === 'scontorna'`. Ogni servizio nuovo era una
caccia a quelle liste, e una lista dimenticata era un bug — e' gia' successo
con `filmato`, rimasto fuori mentre veniva aggiunto altrove, e chi apriva
Filmato si trovava sopra il nome di un JPG.

Ora ogni servizio dichiara le tre cose che lo distinguono in
src/servizi/<id>.js: cosa accetta il `+`, cosa fa il tasto Zack, quali
strumenti compaiono e quando. E' DATI, non un programma — niente rami
condizionali dentro — quindi vive in Node dove i test lo vedono, come
ricette.js e keying.js.

`QUANDO` e' una lista chiusa e il validatore rifiuta uno stato inventato: uno
strumento con un `quando` scritto a mano non comparirebbe MAI, e non
solleverebbe niente. E' il tipo di guasto che si scopre solo guardandolo.

Nessun collegamento ancora: questo commit non cambia una riga di interfaccia.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `Scontorna.jsx` diventa `Piano.jsx`

Rinomina, più un `servizio` in ingresso. **Nessun cambiamento di comportamento**: se lo scontorno si comporta diversamente da prima, il task è sbagliato.

**Files:**
- Rename: `src/components/Scontorna.jsx` → `src/components/Piano.jsx` (via `git mv`)
- Modify: `src/App.jsx` — l'import e il tag

**Interfaces:**
- Consumes: da Task 1 — `getDescrittore`
- Produces: `<Piano servizio={…} …>` con le stesse props di prima più `servizio`

- [ ] **Step 1: Spostare il file**

```bash
git mv src/components/Scontorna.jsx src/components/Piano.jsx
```

- [ ] **Step 2: Rinominare il componente e accettare il servizio**

In `src/components/Piano.jsx`, sostituire l'apertura della funzione:

```jsx
export default function Piano({
  /** Il descrittore del servizio aperto: dice claim, modelli e fattori. */
  servizio,
  vuoto,
  ricetta,
  piano,
  /** Quanti file ci sono sul piano: con piu' di uno il tasto li fa tutti. */
  quanti,
  busy,
  models,
  modello,
  strumenti,
  lavoro,
  onPick,
  onFile,
  onFiles,
  onZack,
  onRicetta,
  onModello,
  onScarica,
  puoiScaricare,
  children,
}) {
```

- [ ] **Step 3: Usare il claim e i modelli del descrittore**

Sostituire la riga della frase sotto il `+`:

```jsx
            <p className="sc-claim">{t(servizio.claim)}</p>
```

Sostituire la costante `DUE_MODELLI` e il suo uso. Togliere:

```js
const DUE_MODELLI = ['u2net', 'isnet-general-use'];
```

e sostituire il calcolo degli `offerti`:

```js
  // Quali modelli offre QUESTO servizio: lo scontorno ne ha due, il filmato
  // nessuno. Prima era una costante nel file, cioe' una regola dello
  // scontorno scritta dentro l'impianto.
  const offerti = models.filter((m) => servizio.tasto.modelli.includes(m.id));
```

E rendere condizionali i due gruppi del punto oro, perché un servizio senza modelli non deve mostrarne il riquadro vuoto:

```jsx
            {offerti.length > 0 && (
              <div className="sc-modelli" role="group" aria-label={t('control.quality.label')}>
                {offerti.map((m) => (
                  <button
                    key={m.id}
                    className="pastiglia"
                    aria-pressed={modello === m.id}
                    title={m.id}
                    onClick={() => onModello(m.id)}
                  >
                    {t(m.labelKey)}
                  </button>
                ))}
              </div>
            )}

            {servizio.tasto.fattori && (
              <div className="sc-fattori" role="group" aria-label={t('zack.resize')}>
                {Object.keys(FATTORI).map((chiave) => (
                  <button
                    key={chiave}
                    className="pastiglia"
                    aria-pressed={ricetta.includes(`ridimensiona:${chiave}`)}
                    title={t(`zack.stepHelp.ridimensiona:${chiave}`)}
                    onClick={() => onRicetta(commutaFattore(ricetta, chiave))}
                  >
                    {SIMBOLO[chiave]}
                  </button>
                ))}
              </div>
            )}
```

- [ ] **Step 4: Aggiornare `App.jsx`**

L'import a riga 18:

```js
import Piano from './components/Piano.jsx';
```

E il tag, aggiungendo il servizio:

```jsx
          {tool === 'scontorna' ? (
            <Piano
              servizio={getDescrittore(tool)}
```

più la chiusura `</Piano>` al posto di `</Scontorna>`. E in cima, accanto agli altri import di `./engine/`:

```js
import { getDescrittore, strumentiVisibili } from './servizi/index.js';
```

- [ ] **Step 5: Test e build**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build 2>&1 | tail -3
```

Atteso: PASS + build completata. `test/scontornoCondiviso.test.js` cerca `<MaskBrush` in `App.jsx` e non è toccato da questa rinomina.

- [ ] **Step 6: Verificare nel browser che NIENTE sia cambiato**

Il punto di questo task è che non si veda. Con `preview_start` e la finestra portata a una misura vera (`resize_window`, e `innerWidth` diverso da 0):

1. `/app/` si apre sullo scontorno: `+` al centro, frase sotto, mascotte, tasto Zack.
2. Il punto oro mostra ancora i due modelli **e** le quattro pastiglie ×4 ×2 :2 :4.
3. Trascinare un'immagine, premere Zack: il ritaglio esce.

- [ ] **Step 7: Commit**

```bash
git add src/components/Piano.jsx src/App.jsx && git commit -m "$(cat <<'EOF'
refactor: Scontorna diventa Piano, l'impianto di ogni servizio

Non era una sezione fatta bene: era un IMPIANTO fatto bene, cablato in
App.jsx come caso speciale di un servizio solo. Il claim sotto il `+` e i due
modelli offerti erano costanti dentro il file — cioe' regole dello scontorno
scritte dentro il pezzo che dovrebbe valere per tutti.

Ora arrivano dal descrittore, e i due gruppi del punto oro compaiono solo se
quel servizio ha qualcosa da metterci: un servizio senza modelli mostrava un
riquadro vuoto.

Nessun cambiamento di comportamento: se lo scontorno si comporta diversamente
da prima, questo commit e' sbagliato. Verificato nel browser.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Gli strumenti vengono dal descrittore

**Files:**
- Modify: `src/App.jsx` — la prop `strumenti` del `<Piano>`
- Create: `test/impianto.test.js`

**Interfaces:**
- Consumes: da Task 1 — `strumentiVisibili`, `getDescrittore`
- Produces: `GESTI` — la mappa `id → funzione`, dentro `App.jsx`

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `test/impianto.test.js`:

```js
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
  assert.match(
    APP,
    /strumentiVisibili\(/,
    'gli strumenti sono ancora scritti a mano dentro App.jsx',
  );
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
  const mappa = APP.slice(APP.indexOf('const GESTI'), APP.indexOf('const GESTI') + 1200);
  assert.notEqual(APP.indexOf('const GESTI'), -1, 'la mappa GESTI non esiste in App.jsx');
  for (const d of Object.values(DESCRITTORI)) {
    for (const s of d.strumenti) {
      assert.match(mappa, new RegExp(`\\b${s.id}\\b`), `manca il gesto per «${s.id}» (${d.id})`);
    }
  }
});
```

- [ ] **Step 2: Far girare il test — deve fallire**

```bash
npm test 2>&1 | grep -A 3 "costruisce gli strumenti\|ha un gesto"
```

Atteso: FAIL su tutt'e due — né `strumentiVisibili(` né `const GESTI` esistono ancora in `App.jsx`.

- [ ] **Step 3: Sostituire la prop `strumenti` con la mappa dei gesti**

In `src/App.jsx`, sostituire **tutto** il blocco `strumenti={ … }` del `<Piano>` con:

```jsx
              strumenti={(() => {
                /*
                 * Il descrittore dice QUALI cerchi e QUANDO; qui si dice cosa
                 * fanno. La separazione non e' cerimonia: la prima meta' e'
                 * dati e vive in Node dove i test la vedono, la seconda sono
                 * chiusure sullo stato di React e non ci puo' vivere.
                 */
                const GESTI = {
                  righello: () => apriPennello('righello'),
                  restore: () => apriPennello('restore'),
                  erase: () => apriPennello('erase'),
                  undo: undoResult,
                  swap: swapFile,
                  taglia: () => setGestoFilm('taglia'),
                  fotogrammi: () => setGestoFilm('fotogrammi'),
                  sfondo: () => setGestoFilm('sfondo'),
                };
                const acceso = {
                  righello: brushOpen && modoPennello === 'righello',
                  restore: brushOpen && modoPennello === 'restore',
                  erase: brushOpen && modoPennello === 'erase',
                };
                return strumentiVisibili(getDescrittore(tool), {
                  file: Boolean(file),
                  risultato: result?.kind === 'png',
                }).map((s) => ({
                  id: s.id,
                  icon: s.icon,
                  label: t(s.label),
                  active: acceso[s.id] || undefined,
                  // L'annulla si spegne anche senza cronologia: premerlo
                  // quando non c'e' niente da annullare non fa niente, e un
                  // comando acceso che non fa niente e' un comando rotto.
                  disabled: Boolean(busy) || (s.id === 'undo' && history.length === 0),
                  onClick: GESTI[s.id],
                }));
              })()}
```

> `setGestoFilm` non esiste ancora: lo crea il Task 4. Fino ad allora `filmato` non passa da `<Piano>`, quindi quei tre rami non vengono mai raggiunti — ma vanno scritti ora, perché il test del passo 1 li richiede e perché il Task 4 non deve tornare qui a rileggere questo blocco.

Aggiungere lo stato, accanto agli altri `useState` in cima al componente:

```js
  /** Quale dei tre gesti del filmato e' aperto sulla tela. Nessuno: `null`. */
  const [gestoFilm, setGestoFilm] = useState(null);
```

- [ ] **Step 4: Far girare i test — devono passare**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)"
```

Atteso: PASS.

- [ ] **Step 5: Verificare nel browser**

Gli strumenti devono comportarsi **esattamente** come prima del task:

1. Piano vuoto: nessun cerchio.
2. Un'immagine sul piano, prima di Zack: **Annulla** e **Cambia file**.
3. Dopo Zack: **Righello · Recupera · Togli · Annulla**, e il righello si accende davvero (regressione del Task 4 del pezzo 1).

- [ ] **Step 6: Commit**

```bash
npm run build >/dev/null && git add src/App.jsx test/impianto.test.js && git commit -m "$(cat <<'EOF'
refactor: gli strumenti dell'impianto vengono dal descrittore

Erano un ternario annidato dentro il JSX: con risultato quattro, col solo
file due, altrimenti nessuno — e ogni servizio nuovo avrebbe aggiunto un
ramo. Ora il descrittore dice QUALI cerchi e QUANDO, e App.jsx dice solo cosa
fanno.

La separazione non e' cerimonia: la prima meta' e' dati e vive in Node dove i
test la vedono, la seconda sono chiusure sullo stato di React e non ci puo'
vivere. Il test lega le due meta': ogni strumento dichiarato deve avere un
gesto col suo nome nella mappa, perche' uno strumento senza gesto compare
come cerchio e non fa niente al clic — il difetto esatto del righello.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Filmato entra nell'impianto

La prova che l'impianto regge: Filmato è «uguale a scontorna», quindi se serve inventare qualcosa qui, l'impianto è sbagliato.

**Files:**
- Modify: `src/App.jsx` — righe 1552, 1686, 1691 (le tre liste), e il ramo di `<Piano>`
- Modify: `src/components/FilmLab.jsx` — perde l'impaginazione a sé
- Modify: `test/impianto.test.js`

**Interfaces:**
- Consumes: da Task 3 — `gestoFilm`, `setGestoFilm`, `GESTI`
- Produces: `<FilmLab gesto={…} onGesto={…}>` — il gesto aperto arriva da fuori

- [ ] **Step 1: Scrivere il test che fallisce**

In fondo a `test/impianto.test.js`:

```js
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

test('il filmato passa dall’impianto', () => {
  assert.match(
    APP,
    /tool === 'scontorna' \|\| tool === 'filmato'|\['scontorna', 'filmato'\]\.includes\(tool\)|DESCRITTORI\[tool\]/,
    'il filmato non entra ancora in <Piano>',
  );
});
```

- [ ] **Step 2: Far girare il test — deve fallire**

```bash
npm test 2>&1 | grep -A 3 "liste di esclusione\|passa dall"
```

Atteso: FAIL su tutt'e due.

- [ ] **Step 3: Far entrare il filmato in `<Piano>`**

In `src/App.jsx`, la condizione del `<Piano>`. Da:

```jsx
          {tool === 'scontorna' ? (
```

a:

```jsx
          {/* Chi ha un descrittore passa dall'impianto. La lista non si
              scrive a mano: e' la stessa domanda a cui risponde `servizi/`,
              e due risposte alla stessa domanda divergono al primo servizio
              nuovo. */}
          {DESCRITTORI[tool] ? (
```

e aggiungere `DESCRITTORI` all'import da `./servizi/index.js`:

```js
import { DESCRITTORI, getDescrittore, strumentiVisibili } from './servizi/index.js';
```

- [ ] **Step 4: Togliere `filmato` dalle tre liste**

Riga ~1552, la `StageBar` — la lista diventa il complemento dei descrittori:

```jsx
          {!isEditor && !DESCRITTORI[tool] && !['suono', 'brain'].includes(tool) && (
```

Riga ~1686, la colonna:

```jsx
          data-vuota={Boolean(DESCRITTORI[tool]) || ['brain', 'suono'].includes(tool) || undefined}
```

Riga ~1691:

```jsx
          {DESCRITTORI[tool] || ['brain', 'suono'].includes(tool) ? null : isEditor ? (
```

- [ ] **Step 5: Mettere `FilmLab` sul piano dell'impianto**

Nel blocco `suPiano`, il ramo `tool === 'filmato'` diventa:

```jsx
          ) : tool === 'filmato' ? (
            <FilmLab
              file={filmato}
              /* Il gesto aperto arriva da fuori: i tre cerchi dell'impianto
                 sono gli stessi tre gesti, e tenerli anche dentro FilmLab
                 vorrebbe dire due comandi per la stessa cosa. */
              gesto={gestoFilm}
              onGesto={setGestoFilm}
              onPick={setFilmato}
              onSave={async (blob, { kind, op }) =>
                library.save(blob, {
                  name: (filmato?.name || 'filmato').replace(/\.[^.]+$/, ''),
                  kind,
                  meta: { op },
                })
              }
              onNotice={setNotice}
              onError={setError}
            />
```

E il `<Piano>` deve sapere che per il filmato «il file sul piano» è `filmato`, non `file`. Sostituire le due props:

```jsx
              vuoto={
                tool === 'filmato'
                  ? !filmato
                  : !file && batchFiles.length === 0 && batch.results.length === 0
              }
              onPick={tool === 'filmato' ? scegliFilmato : scegliFile}
```

e aggiungere la funzione, accanto a `scegliFile`:

```js
  /** Il `+` del filmato: un file solo, dei tipi che il descrittore dichiara. */
  function scegliFilmato() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getDescrittore('filmato').accetta.file.join(',');
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) setFilmato(f);
    };
    input.click();
  }
```

Infine, gli strumenti del filmato dipendono da `filmato`, non da `file`. Nel blocco `strumenti={…}` del Task 3, sostituire la riga dello stato:

```jsx
                return strumentiVisibili(getDescrittore(tool), {
                  file: tool === 'filmato' ? Boolean(filmato) : Boolean(file),
                  risultato: result?.kind === 'png',
                }).map((s) => ({
```

- [ ] **Step 6: Togliere a `FilmLab` la sua impaginazione a sé**

In `src/components/FilmLab.jsx`, cambiare la firma:

```jsx
export default function FilmLab({ file, gesto, onGesto, onPick, onSave, onNotice, onError }) {
```

Il ramo del piano vuoto sparisce: **il `+` dell'impianto lo copre già**, e due inviti a portare un file sulla stessa schermata sono due comandi per la stessa cosa. Sostituire tutto il blocco `if (!file) { return ( … ) }` con:

```jsx
  // Niente schermata vuota qui: il `+` dell'impianto e' l'unico invito a
  // portare un file, e la frase sotto arriva dal descrittore. Due inviti
  // sulla stessa schermata sono due comandi per la stessa cosa.
  if (!file) return null;
```

`onPick` resta nella firma perché l'impianto lo usa dal suo `+`; qui dentro non si chiama più.

- [ ] **Step 7: Test e build**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build 2>&1 | tail -3
```

Atteso: PASS + build completata.

- [ ] **Step 8: Verificare nel browser**

1. Aprire Filmato: piano vuoto col `+` al centro, la frase sotto, la mascotte in basso a sinistra, il tasto Zack in basso a destra — **la stessa mappa dello scontorno**.
2. Nessuna `StageBar` sopra la tela, nessuna colonna di comandi di fianco.
3. Portare una clip col `+`: il video compare sulla tela, e a destra compaiono **tre cerchi** — taglia, fotogrammi, togli sfondo.
4. Tornare allo scontorno e rientrare in Filmato: niente si rompe.

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx src/components/FilmLab.jsx test/impianto.test.js && git commit -m "$(cat <<'EOF'
feat: Filmato entra nell'impianto, e le liste di esclusione muoiono

Il committente: «il concetto deve essere uguale a scontorna, solo per i
video». Uguale l'IMPIANTO — e Filmato e' la prova che l'impianto regge,
perche' non ha richiesto di inventare un gesto: i tre che gia' esistono
diventano i cerchi.

`['brain','suono','filmato','scontorna'].includes(tool)` compariva tre volte
identica. Ora la domanda «questo servizio passa dall'impianto?» ha UNA
risposta, `DESCRITTORI[tool]`, e le tre liste si riducono ai due servizi che
non ci sono ancora entrati. Tenere due risposte alla stessa domanda e' quello
che aveva lasciato `filmato` fuori da una lista, col tasto Zack che avrebbe
scontornato un'immagine mentre l'utente guardava una clip.

FilmLab perde la sua schermata vuota: il `+` dell'impianto e' l'unico invito
a portare un file, e due inviti sulla stessa schermata sono due comandi per
la stessa cosa.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: I tre gesti diventano i cerchi

**Files:**
- Modify: `src/components/FilmLab.jsx` — i tre `<section class="film-gesto">`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: da Task 4 — `gesto`, `onGesto`
- Produces: niente per altri task

- [ ] **Step 1: Mostrare un gesto solo, quello scelto**

In `src/components/FilmLab.jsx`, avvolgere ciascuna delle tre `<section className="film-gesto">` nella sua condizione. Per il taglio:

```jsx
        {gesto === 'taglia' && (
        <section className="film-gesto">
          <h3>{t('film.taglia')}</h3>
```

…e chiudere con `)}` dopo `</section>`. Stessa forma per `gesto === 'fotogrammi'` intorno alla sezione di `film.frames`, e `gesto === 'sfondo'` intorno a quella di `film.sfondo`.

**Perché uno solo:** i tre cerchi dell'impianto sono già la scelta. Mostrarli tutti e tre aperti sotto la tela rimetterebbe la colonna di comandi che l'impianto ha appena tolto, e coprirebbe il video — contro *«gli strumenti non coprono la tela»*.

- [ ] **Step 2: I comandi del gesto scelto stanno in fondo, non di fianco**

In `src/styles.css`, in fondo:

```css
/* I comandi del gesto scelto, sotto la tela e non di fianco: il fianco e'
   dei cerchi, e la tela e' il lavoro. Compaiono solo quando un cerchio e'
   acceso, quindi non c'e' niente da nascondere quando non servono. */
.film-comandi {
  flex: none;
  padding: 10px 0 0;
}
.film-gesto {
  border: 0;
  padding: 0;
}
```

- [ ] **Step 3: Test e build**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build 2>&1 | tail -3
```

Atteso: PASS + build completata.

- [ ] **Step 4: Verificare nel browser**

1. Con una clip sul piano e nessun cerchio premuto: **si vede solo il video**, nessun comando.
2. Premere **taglia**: compaiono i due cursori del taglio, e nient'altro.
3. Premere **fotogrammi**: spariscono i cursori, compare il conteggio.
4. Premere **togli sfondo**: compare il suo comando.
5. In nessuno dei tre casi i comandi coprono il video.

- [ ] **Step 5: Commit**

```bash
git add src/components/FilmLab.jsx src/styles.css && git commit -m "$(cat <<'EOF'
feat: i tre gesti del filmato diventano i cerchi dell'impianto

Erano tre sezioni sempre aperte in colonna sotto la tela: cioe' esattamente
la colonna di comandi che l'impianto ha appena tolto, rimessa dentro il
componente. Ora i tre cerchi SONO la scelta, e si apre un gesto solo — quello
premuto.

I comandi del gesto scelto stanno sotto la tela e non di fianco: il fianco e'
dei cerchi, la tela e' il lavoro, e «gli strumenti non coprono la tela».

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Gli scacchi dietro al video, e l'attesa dichiarata

Il requisito esplicito del committente — *«il filmato deve venire senza sfondo, non con sfondo panna»* — e la misura del 2026-09-04 dice che **il file è già senza sfondo**: il panna è nella presentazione.

**Files:**
- Modify: `src/styles.css` — `.film-video`
- Modify: `src/components/FilmLab.jsx` — l'attesa di `togliSfondo`
- Modify: `src/i18n/it.json`, `src/i18n/en.json`
- Modify: `test/impianto.test.js`

**Interfaces:**
- Consumes: niente da altri task
- Produces: chiave `film.sfondoAttesa` in tutt'e due le lingue

- [ ] **Step 1: Scrivere il test che fallisce**

In fondo a `test/impianto.test.js`:

```js
test('il video sta sugli scacchi, come i ritagli', () => {
  /*
   * MISURATO il 2026-09-04: `MediaRecorder` conserva l'alfa, e
   * `alphaFromCreamVoid` porta il panna a zero. Il filmato esce davvero senza
   * sfondo. Ma `.film-video` aveva `background: transparent`, quindi il video
   * stava sul fondo panna dell'app e un filmato CORRETTAMENTE trasparente
   * aveva l'aspetto identico a uno col fondo panna — ed e' quello che il
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
```

E aggiungere l'import di `readFileSync` se non c'è già in cima al file — c'è, dal Task 3.

- [ ] **Step 2: Far girare il test — deve fallire**

```bash
npm test 2>&1 | grep -A 4 "sta sugli scacchi"
```

Atteso: FAIL — `.film-video` ha `background: transparent`.

- [ ] **Step 3: Mettere gli scacchi**

In `src/styles.css`, nel blocco `.film-video`, sostituire `background: transparent;` con:

```css
  /* Gli stessi scacchi di `.bg-tela`, per la stessa ragione: senza, un
     filmato correttamente trasparente sta sul fondo panna dell'app e sembra
     avere il fondo panna. Misurato il 2026-09-04 — il file l'alfa ce l'ha,
     era la presentazione a mentire. */
  background:
    conic-gradient(from 90deg, #2a2a28 25%, #1b1b19 0 50%, #2a2a28 0 75%, #1b1b19 0) 0 0 / 18px 18px;
```

- [ ] **Step 4: Dichiarare l'attesa di «togli sfondo»**

MISURATO il 2026-09-04: `togliSfondo` fa **una ricerca e una passata di key per fotogramma** — una clip di 18 s a 25 fps sono 457 fotogrammi. Va detto prima di premere, che è già la regola del prodotto.

In `src/i18n/it.json`, dentro `"film"`:

```json
    "sfondoAttesa": "{n} fotogrammi da guardare uno a uno: circa {sec} secondi.",
```

In `src/i18n/en.json`, stessa posizione:

```json
    "sfondoAttesa": "{n} frames to look at one by one: about {sec} seconds.",
```

In `src/components/FilmLab.jsx`, dentro la sezione `gesto === 'sfondo'`, subito sotto il `<p className="help">`:

```jsx
          {/* L'attesa si dichiara PRIMA, non si scopre a meta'. Il conto e'
              dichiarato e non stimato a occhio: `togliSfondo` cerca un
              fotogramma alla volta a 25 al secondo, e su una clip di 18 s
              sono 457 passate — misurato il 2026-09-04. */}
          {durata > 0 && (
            <p className="help">
              {t('film.sfondoAttesa', {
                n: Math.floor(durata * 25),
                sec: Math.ceil(durata * 25 * 0.08),
              })}
            </p>
          )}
```

> `0.08` secondi per fotogramma è **provvisorio e va misurato** prima di considerarlo buono: si cronometra `togliSfondo` su una clip corta e il numero, con la data, sostituisce questo. Un'attesa dichiarata a occhio è peggio di nessuna, perché la seconda volta non le si crede più.

- [ ] **Step 5: Test e build**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build 2>&1 | tail -3
```

Atteso: PASS — compreso «italiano e inglese hanno esattamente le stesse chiavi».

- [ ] **Step 6: Verificare nel browser, e misurare il secondo per fotogramma**

1. Portare una clip **corta** sul piano di Filmato: dietro al video si vedono gli scacchi.
2. Premere **togli sfondo**: la frase dice quanti fotogrammi e quanti secondi.
3. Cronometrare l'operazione vera su quella clip, e ricavare i secondi per fotogramma.
4. Sostituire `0.08` col numero misurato, e scriverlo nel commento con la data.

⚠️ Il riquadro d'anteprima **nasconde** la pagina: `requestAnimationFrame` non scatta e `togliSfondo` si pianta. La misura va presa con la pagina visibile, o sostituendo il solo pompa-fotogrammi.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css src/components/FilmLab.jsx src/i18n/it.json src/i18n/en.json test/impianto.test.js && git commit -m "$(cat <<'EOF'
fix: il filmato trasparente si vede trasparente, e l'attesa si dichiara

Il committente: «e' importante che il video venga senza sfondo, non con
sfondo panna». MISURATO il 2026-09-04: il file e' gia' senza sfondo.
MediaRecorder+VP9 conserva l'alfa (canvas mezzo trasparente registrato e
riletto: meta' a [0,0,0,0], meta' a [254,1,1,255], su quattro istanti), e
`alphaFromCreamVoid` porta a zero il panna, il bianco puro e un panna
leggermente diverso.

Il panna era nella PRESENTAZIONE: `.film-video` aveva `background:
transparent`, quindi il video stava sul fondo panna dell'app e un filmato
correttamente trasparente aveva l'aspetto identico a uno col fondo panna.

Per i ritagli la regola era gia' pagata — `.bg-tela` ha gli scacchi, col
commento che dice perche': «senza, un ritaglio con un buco nel mezzo sembra
riuscito, e il buco si scopre in stampa». Al filmato non era mai arrivata.

E l'attesa di «togli sfondo» ora si dichiara: la funzione cerca un fotogramma
alla volta a 25 al secondo — 457 passate per una clip di 18 s, misurato lo
stesso giorno, ed e' il motivo per cui la misura era andata in timeout.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: La mascotte diventa un posto riservato

Spec § 5.3: la mascotte oggi è un `.webp` fermo, **domani sarà una o più clip senza sfondo**. L'impianto non deve riservarle un'immagine ma **un riquadro con un contratto**, e va fatto ora, mentre è ancora un `.webp`: se il riquadro dipende dal contenuto, il giorno che arriva la clip si sposta tutto.

**Files:**
- Modify: `src/styles.css` — `.sc-zack` (righe ~4478 e ~4702)
- Modify: `test/impianto.test.js`

**Interfaces:**
- Consumes: niente da altri task
- Produces: niente per altri task

- [ ] **Step 1: Scrivere il test che fallisce**

In fondo a `test/impianto.test.js`:

```js
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
    assert.doesNotMatch(
      b,
      /width:\s*auto/,
      '.sc-zack ha «width: auto»: la larghezza la decide il contenuto',
    );
  }
  assert.ok(
    blocchi.some((b) => /aspect-ratio/.test(b)),
    '.sc-zack non dichiara una proporzione: il riquadro non e’ riservato',
  );
});
```

- [ ] **Step 2: Far girare il test — deve fallire**

```bash
npm test 2>&1 | grep -A 4 "riquadro della mascotte"
```

Atteso: FAIL — `.sc-zack` ha `width: auto`.

- [ ] **Step 3: Riservare il riquadro**

In `src/styles.css`, riga ~4478, sostituire il blocco `.sc-zack`:

Sostituire il blocco **per intero** con questo — larghezza e altezza dichiarate uguali, `aspect-ratio` a dirlo esplicitamente, e `object-fit` a far stare dentro qualunque contenuto:

```css
/* La mascotte a sinistra, in basso.
   IL RIQUADRO E' RISERVATO, e non dipende da cosa ci sta dentro: oggi e' un
   `.webp` quadrato, domani sara' una clip senza sfondo (spec §5.3). Con
   `width: auto` la larghezza la decideva l'immagine, e il giorno che entra
   una clip con proporzioni diverse Zack cambierebbe taglia rispetto al
   tasto — che e' la prima cosa che si nota, ed e' il contratto gia' scritto
   per la home in RIPRENDI-QUI §6.4. `object-fit: contain` fa stare dentro
   qualunque cosa senza allargare il riquadro, quindi passare da <img> a
   <video> non muove nient'altro. */
.sc-zack {
  position: absolute;
  left: 0;
  bottom: 0;
  height: clamp(96px, 16vh, 150px);
  width: clamp(96px, 16vh, 150px);
  aspect-ratio: 1;
  object-fit: contain;
  object-position: bottom left;
  pointer-events: none;
  user-select: none;
}
```

- [ ] **Step 4: Il secondo blocco, quello che sovrascrive**

Riga ~4702, dove la mascotte scende e cresce. Deve crescere **in tutt'e due le misure**, o il riquadro torna a dipendere dal contenuto:

```css
.sc-zack {
  bottom: -14px;
  height: clamp(120px, 19vh, 185px);
  width: clamp(120px, 19vh, 185px);
}
```

- [ ] **Step 5: Test e build**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build 2>&1 | tail -3
```

Atteso: PASS + build completata.

- [ ] **Step 6: Verificare nel browser che la mascotte non si sia mossa**

Il punto è che **non si veda niente**: la `.webp` è quadrata, quindi con un riquadro quadrato dichiarato deve stare esattamente dov'era.

1. `/app/` sullo scontorno, e poi su Filmato: la mascotte è nello stesso punto di prima, della stessa taglia.
2. A 375 px e a 1280 px: in tutt'e due, e nello stesso rapporto col tasto Zack.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css test/impianto.test.js && git commit -m "$(cat <<'EOF'
fix: il riquadro della mascotte e' riservato, non deciso dall'immagine

La mascotte diventera' una o piu' clip senza sfondo (decisione del committente
del 2026-09-04, spec §5.3). `.sc-zack` aveva `width: auto`: la larghezza la
decideva il contenuto.

Finche' e' un .webp quadrato non si vede. Il giorno che entra una clip con
proporzioni diverse, Zack cambia taglia rispetto al tasto — che e' la prima
cosa che si nota, ed e' esattamente il contratto gia' scritto per la home in
RIPRENDI-QUI §6.4. Si chiude ora, che costa una riga; dopo sarebbe sembrato
un difetto dell'impaginazione invece che di questa.

Larghezza e altezza dichiarate uguali, piu' `object-fit: contain`: qualunque
cosa ci entri sta dentro senza allargare il riquadro, e passare da <img> a
<video> non muove nient'altro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Cosa questo piano NON fa

- **La striscia in alto con libreria e scarica** (spec § 5.1) resta com'è: solo la faccia del servizio. Metterceli dentro vuol dire prima fare della **Libreria una schermata** (§ 7.6), con l'inversione «scegli il file, poi il servizio» — è un pezzo suo, non una riga. La misura è già presa e li aspetta: a 375 px la striscia lascia **229 px** di margine dopo i due cerchi e la faccia.
- **Brain, Vocale e Vettoriale** non entrano nell'impianto: sono i pezzi 3 e 4. Restano nelle due liste `['brain','suono']`, che è quanto rimane delle tre liste da quattro `id`.
- **Niente montaggio, niente timeline** su Filmato: il confine di `engine/clip.js` non si tocca.
- **Nessun encoder video nuovo.** La misura del 2026-09-04 ha chiuso quella domanda: `MediaRecorder` l'alfa la conserva.

---

## Al termine

Il pezzo 2 è finito quando:

- `npm test && npm run build` sono verdi;
- **lo scontorno si comporta esattamente come prima** — è la prova che l'impianto non ha rotto niente;
- Filmato ha la stessa mappa dello scontorno: `+` al centro, mascotte in basso a sinistra, tasto Zack in basso a destra, strumenti in cerchi;
- i tre gesti del filmato sono cerchi, e se ne apre uno solo;
- dietro al video ci sono gli scacchi, e «togli sfondo» dice quanto ci mette;
- `['brain','suono','filmato','scontorna'].includes(tool)` **non esiste più**: restano `['brain','suono']`, i due che non sono ancora entrati nell'impianto.

Il pezzo 3 (Brain e Vocale) li fa entrare, e allora anche quelle due liste spariscono.
