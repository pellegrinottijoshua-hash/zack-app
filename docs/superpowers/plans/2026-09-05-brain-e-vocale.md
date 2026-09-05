# Brain e Vocale nell'impianto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gli ultimi due servizi entrano nell'impianto, e con loro spariscono le ultime liste di `id` dentro `App.jsx`.

**Architecture:** Due motori **puri** scritti in TDD — `engine/riordina.js` (quattro regole deterministiche per la tela di Brain) e `engine/dizionarioVoce.js` (dalla descrizione ai filtri, senza AI) — poi i due descrittori, poi il cablaggio. I motori per primi perché sono la parte capace di sbagliare in silenzio: un riordino che sposta le cose in modo diverso a ogni pressione non solleva niente, si scopre usandolo.

**Tech Stack:** React 19, `node --test` (runner nativo di Node), Web Audio per la resa dei filtri.

**Spec:** [docs/superpowers/specs/2026-09-04-impianto-unico-design.md](../specs/2026-09-04-impianto-unico-design.md) — § 7.1 (Brain) e § 7.3 (Vocale).

---

## Global Constraints

- **`npm test && npm run build` verdi prima di ogni commit.**
- **`git add <percorsi>`, mai `git add -A`.**
- **Un commit per decisione**, col perché nel corpo.
- **Ogni chiave i18n va in `it.json` e `en.json`**, o un test fallisce.
- **«asset», mai «lavoro/work/piece»** nelle stringhe.
- **Il descrittore è dati, non un programma**: niente rami condizionali dentro.
- **Niente AI**: il dizionario è locale, e se non conosce una parola **lo dice e non tocca niente**.
- **La sessione del suono non si salva come progetto** (contratto UX § 9.1): si compone, si esporta, finita. Salvare *un vocale registrato come asset* è un'altra cosa ed è ammesso.
- **Il riordino è deterministico**: premere due volte dà lo stesso risultato, o non è riorganizzare, è rimescolare.

---

## File Structure

| file | responsabilità | task |
|---|---|---|
| **Create** `src/engine/riordina.js` | Le quattro regole di riordino della tela. Puro. | 1 |
| **Create** `test/riordina.test.js` | Che riordinino, e che siano deterministiche. | 1 |
| **Create** `src/engine/dizionarioVoce.js` | Dalla descrizione ai filtri, e il coraggio di non indovinare. | 2 |
| **Create** `test/dizionarioVoce.test.js` | Che capisca ciò che sa, e taccia su ciò che non sa. | 2 |
| **Create** `src/servizi/brain.js`, `src/servizi/vocale.js` | I due descrittori. | 3 |
| **Modify** `src/App.jsx` | I due entrano in `<Piano>`; muoiono le ultime liste. | 3, 4 |
| **Modify** `src/components/Brain.jsx` | Il `+` e gli strumenti arrivano da fuori; l'icona si sceglie per ogni file. | 4, 6 |
| **Modify** `src/components/SoundLab.jsx` | Il vocale registrato si salva; la descrizione in basso. | 5 |
| **Modify** `src/i18n/*.json` | Le stringhe nuove, in due lingue. | 2, 5 |

---

## Task 1: `engine/riordina.js` — le quattro regole

**Files:** Create `src/engine/riordina.js`, `test/riordina.test.js`

**Interfaces:**
- Consumes: da `engine/brain.js` — `MISURE`, e la forma degli oggetti `{id, t, x, y, w, h, cat?, gruppo?}`
- Produces: `REGOLE: string[]`, `riordina(items, regola) => items` (una lista **nuova**, stessi id)

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `test/riordina.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGOLE, riordina } from '../src/engine/riordina.js';

/*
 * Il tasto Zack di Brain: riorganizza la tela.
 *
 * La regola che conta piu' di tutte e' il DETERMINISMO. Un riordino che
 * sposta le cose in modo diverso a ogni pressione non solleva niente: si
 * preme, si guarda, e non si preme mai piu'. Per questo e' la prima cosa
 * provata qui, su tutte e quattro le regole.
 */

const tela = () => [
  { id: 'a', t: 'nota', cat: 'idea', x: 300, y: 500, w: 200, h: 120 },
  { id: 'b', t: 'nota', cat: 'task', x: 10, y: 40, w: 200, h: 120 },
  { id: 'c', t: 'asset', x: 800, y: 90, w: 180, h: 180 },
  { id: 'd', t: 'cerchio', x: 60, y: 700, w: 320, h: 240 },
  { id: 'e', t: 'freccia', da: 'a', a: 'b' },
];

test('ogni regola e’ deterministica: premere due volte da’ lo stesso risultato', () => {
  for (const regola of REGOLE) {
    const uno = riordina(tela(), regola);
    const due = riordina(tela(), regola);
    assert.deepEqual(due, uno, `«${regola}» rimescola invece di riordinare`);
    // E rifarlo su un risultato gia' riordinato non lo muove piu':
    // un riordino che continua a spostare non e' arrivato da nessuna parte.
    assert.deepEqual(riordina(uno, regola), uno, `«${regola}» non si ferma mai`);
  }
});

test('nessuna regola perde o inventa oggetti', () => {
  for (const regola of REGOLE) {
    const dopo = riordina(tela(), regola);
    assert.deepEqual(
      dopo.map((o) => o.id).sort(),
      ['a', 'b', 'c', 'd', 'e'],
      `«${regola}» ha perso o inventato qualcosa`,
    );
  }
});

test('le frecce non si spostano: seguono i nodi', () => {
  // Una freccia non ha una posizione sua — collega due oggetti. Darle delle
  // coordinate la scollerebbe da cio' che collega.
  for (const regola of REGOLE) {
    const f = riordina(tela(), regola).find((o) => o.id === 'e');
    assert.equal(f.t, 'freccia');
    assert.equal(f.x, undefined, `«${regola}» ha dato una posizione a una freccia`);
  }
});

test('«tipo» mette insieme le cose dello stesso tipo', () => {
  const dopo = riordina(tela(), 'tipo');
  const colonnaDi = (id) => dopo.find((o) => o.id === id).x;
  // Le due note finiscono nella stessa colonna; l'asset e il gruppo no.
  assert.equal(colonnaDi('a'), colonnaDi('b'));
  assert.notEqual(colonnaDi('a'), colonnaDi('c'));
  assert.notEqual(colonnaDi('c'), colonnaDi('d'));
});

test('«compatta» non riordina: toglie i buchi mantenendo l’ordine', () => {
  /*
   * E' il meno invasivo dei quattro, e serve che resti tale: chi lo preme
   * vuole ritrovare le sue cose dove le aveva messe, solo piu' vicine. Se
   * cambiasse anche l'ordine, sarebbe «per tipo» con un altro nome.
   */
  const prima = tela().filter((o) => o.t !== 'freccia');
  const dopo = riordina(tela(), 'compatta').filter((o) => o.t !== 'freccia');
  const perY = (l) => [...l].sort((p, q) => p.y - q.y || p.x - q.x).map((o) => o.id);
  assert.deepEqual(perY(dopo), perY(prima), '«compatta» ha cambiato l’ordine');
});

test('«compatta» avvicina davvero', () => {
  const ingombro = (l) => {
    const m = l.filter((o) => o.t !== 'freccia');
    const w = Math.max(...m.map((o) => o.x + o.w)) - Math.min(...m.map((o) => o.x));
    const h = Math.max(...m.map((o) => o.y + o.h)) - Math.min(...m.map((o) => o.y));
    return w * h;
  };
  assert.ok(
    ingombro(riordina(tela(), 'compatta')) < ingombro(tela()),
    '«compatta» non ha compattato niente',
  );
});

test('«gruppi» tiene insieme chi sta nello stesso gruppo', () => {
  const conGruppi = [
    { id: 'a', t: 'nota', gruppo: 'g1', x: 900, y: 10, w: 200, h: 120 },
    { id: 'b', t: 'nota', gruppo: 'g1', x: 20, y: 700, w: 200, h: 120 },
    { id: 'c', t: 'nota', gruppo: 'g2', x: 500, y: 300, w: 200, h: 120 },
  ];
  const dopo = riordina(conGruppi, 'gruppi');
  const y = (id) => dopo.find((o) => o.id === id).y;
  assert.equal(y('a'), y('b'), 'due cose dello stesso gruppo sono finite su righe diverse');
  assert.notEqual(y('a'), y('c'), 'gruppi diversi sono finiti sulla stessa riga');
});

test('«frecce» impagina dall’alto in basso seguendo il verso', () => {
  const catena = [
    { id: 'a', t: 'nota', x: 0, y: 0, w: 200, h: 120 },
    { id: 'b', t: 'nota', x: 0, y: 0, w: 200, h: 120 },
    { id: 'c', t: 'nota', x: 0, y: 0, w: 200, h: 120 },
    { id: 'f1', t: 'freccia', da: 'a', a: 'b' },
    { id: 'f2', t: 'freccia', da: 'b', a: 'c' },
  ];
  const dopo = riordina(catena, 'frecce');
  const y = (id) => dopo.find((o) => o.id === id).y;
  assert.ok(y('a') < y('b'), 'a dovrebbe stare sopra b');
  assert.ok(y('b') < y('c'), 'b dovrebbe stare sopra c');
});

test('una regola sconosciuta non tocca la tela', () => {
  // Una regola salvata puo' tornare indietro sbagliata. Non deve ne'
  // esplodere ne' spostare le cose a caso.
  const prima = tela();
  assert.deepEqual(riordina(prima, 'a-caso'), prima);
});

test('le quattro regole restano quattro', () => {
  // Se questo numero cambia e' una decisione, non una cosa che scivola dentro.
  assert.deepEqual([...REGOLE].sort(), ['compatta', 'frecce', 'gruppi', 'tipo']);
});
```

- [ ] **Step 2: Far girare i test — devono fallire**

```bash
npm test 2>&1 | grep -E "^not ok|Cannot find" | head
```

Atteso: FAIL — `src/engine/riordina.js` non esiste.

- [ ] **Step 3: Scrivere `src/engine/riordina.js`**

```js
import { MISURE } from './brain.js';

/**
 * Il tasto Zack di Brain: riorganizza la tela.
 *
 * **Puro**, e per una ragione precisa: un riordino sbagliato non solleva
 * niente. Sposta le cose, l'utente guarda, e se il risultato e' diverso a
 * ogni pressione non lo preme mai piu'. Il determinismo qui non e'
 * un'eleganza, e' la funzione: per questo e' la prima cosa che i test
 * provano, su tutte e quattro le regole.
 *
 * La regola la sceglie l'utente nel punto oro, come i modelli e la catena
 * dello scontorno: sono tutt'e due «come deve comportarsi il tasto».
 */

/** Le quattro regole. Lista chiusa: una in piu' e' una decisione. */
export const REGOLE = ['gruppi', 'tipo', 'compatta', 'frecce'];

/** Quanto spazio fra una cosa e l'altra. Un valore solo, per tutte le regole. */
const PASSO = 28;

/** L'ordine dei tipi in «per tipo»: dal piu' denso di senso al piu' accessorio. */
const ORDINE_TIPI = ['nota', 'asset', 'cerchio'];

const posizionabili = (items) => items.filter((o) => o.t !== 'freccia');
const larghezza = (o) => o.w ?? MISURE[o.t]?.w ?? 200;
const altezza = (o) => o.h ?? MISURE[o.t]?.h ?? 120;

/**
 * Impagina una lista di righe, ogni riga una fila orizzontale.
 *
 * Tutte e quattro le regole finiscono qui: cambia solo COME si formano le
 * righe. Tenere un impaginatore solo evita che le quattro divergano nello
 * spazio fra gli oggetti — e con quattro copie sarebbe successo.
 */
function impagina(righe) {
  const posizioni = new Map();
  let y = 0;
  for (const riga of righe) {
    let x = 0;
    let alta = 0;
    for (const o of riga) {
      posizioni.set(o.id, { x, y });
      x += larghezza(o) + PASSO;
      alta = Math.max(alta, altezza(o));
    }
    y += alta + PASSO;
  }
  return posizioni;
}

/** Applica le posizioni, lasciando intatto tutto il resto (frecce comprese). */
function applica(items, posizioni) {
  return items.map((o) => (posizioni.has(o.id) ? { ...o, ...posizioni.get(o.id) } : o));
}

/** Una riga per gruppo; chi non ha gruppo va in fondo, uno per riga. */
function perGruppi(items) {
  const dentro = posizionabili(items);
  const gruppi = new Map();
  const sciolti = [];
  for (const o of dentro) {
    if (o.gruppo) {
      if (!gruppi.has(o.gruppo)) gruppi.set(o.gruppo, []);
      gruppi.get(o.gruppo).push(o);
    } else {
      sciolti.push(o);
    }
  }
  // I gruppi in ordine di nome: e' l'unico ordine che non dipende da dove
  // stavano prima, quindi l'unico che non cambia a ogni pressione.
  const righe = [...gruppi.keys()].sort().map((k) => gruppi.get(k));
  // Gli sciolti a cinque per riga, come `prossimoPosto` gia' fa altrove.
  for (let i = 0; i < sciolti.length; i += 5) righe.push(sciolti.slice(i, i + 5));
  return righe;
}

/** Una riga per tipo, nell'ordine dichiarato. */
function perTipo(items) {
  const dentro = posizionabili(items);
  return ORDINE_TIPI.map((t) => dentro.filter((o) => o.t === t)).filter((r) => r.length > 0);
}

/**
 * Toglie i buchi SENZA cambiare l'ordine.
 *
 * E' il meno invasivo dei quattro, e deve restarlo: chi lo preme vuole
 * ritrovare le sue cose dove le aveva messe, solo piu' vicine. Se cambiasse
 * anche l'ordine sarebbe «per tipo» con un altro nome.
 */
function compatta(items) {
  const dentro = [...posizionabili(items)].sort((a, b) => a.y - b.y || a.x - b.x);
  const righe = [];
  for (let i = 0; i < dentro.length; i += 4) righe.push(dentro.slice(i, i + 4));
  return righe;
}

/**
 * Segue il verso delle frecce, dall'alto in basso.
 *
 * Chi non e' toccato da nessuna freccia finisce in fondo: la tela puo' essere
 * meta' schema e meta' archivio, e lo schema non deve trascinarsi dietro
 * l'archivio.
 */
function perFrecce(items) {
  const dentro = posizionabili(items);
  const perId = new Map(dentro.map((o) => [o.id, o]));
  const frecce = items.filter((o) => o.t === 'freccia' && perId.has(o.da) && perId.has(o.a));

  const entranti = new Map(dentro.map((o) => [o.id, 0]));
  const uscite = new Map(dentro.map((o) => [o.id, []]));
  for (const f of frecce) {
    entranti.set(f.a, entranti.get(f.a) + 1);
    uscite.get(f.da).push(f.a);
  }

  // Livelli: prima chi non ha frecce entranti, poi chi dipende da loro.
  // L'ordine dentro ogni livello e' quello della lista, che non cambia.
  const righe = [];
  const fatti = new Set();
  let livello = dentro.filter((o) => entranti.get(o.id) === 0);
  while (livello.length > 0) {
    righe.push(livello);
    livello.forEach((o) => fatti.add(o.id));
    const prossimo = [];
    for (const o of dentro) {
      if (fatti.has(o.id) || prossimo.includes(o)) continue;
      // Entra nel livello quando TUTTI quelli che puntano a lui sono gia' usciti.
      const chiPunta = frecce.filter((f) => f.a === o.id).map((f) => f.da);
      if (chiPunta.length > 0 && chiPunta.every((id) => fatti.has(id))) prossimo.push(o);
    }
    livello = prossimo;
  }
  // Un ciclo fra le frecce lascerebbe qualcuno fuori: va messo comunque, o
  // sparirebbe dalla tela.
  const rimasti = dentro.filter((o) => !fatti.has(o.id));
  if (rimasti.length > 0) righe.push(rimasti);
  return righe;
}

const COME = { gruppi: perGruppi, tipo: perTipo, compatta, frecce: perFrecce };

/**
 * La tela riordinata. Restituisce una lista NUOVA con gli stessi id.
 *
 * Una regola sconosciuta lascia la tela com'e': puo' arrivare da un archivio
 * vecchio, e spostare le cose a caso sarebbe peggio che non fare niente.
 */
export function riordina(items, regola) {
  if (!Array.isArray(items) || !COME[regola]) return items;
  return applica(items, impagina(COME[regola](items)));
}
```

- [ ] **Step 4: Far girare i test — devono passare**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)"
```

Atteso: PASS, dieci test nuovi verdi. Se «deterministica» fallisce, la regola colpevole ordina per qualcosa che dipende dalla posizione di partenza: va ordinata per un dato stabile (il nome, o l'ordine della lista).

- [ ] **Step 5: Commit**

```bash
npm run build >/dev/null && git add src/engine/riordina.js test/riordina.test.js && git commit -m "$(cat <<'EOF'
feat: le quattro regole di riordino della tela di Brain

Il tasto Zack di Brain riorganizza, e la regola la sceglie l'utente nel punto
oro — come i modelli e la catena dello scontorno: sono tutt'e due «come deve
comportarsi il tasto».

Puro, e per una ragione precisa: un riordino sbagliato non solleva niente.
Sposta le cose, l'utente guarda, e se il risultato e' diverso a ogni pressione
non lo preme mai piu'. Il determinismo qui non e' un'eleganza, e' la funzione:
per questo e' la PRIMA cosa che i test provano, su tutte e quattro le regole,
e provano anche che riapplicarle non muova piu' niente.

Un impaginatore solo per tutte e quattro: cambia come si formano le righe, non
come si dispongono. Con quattro copie lo spazio fra gli oggetti sarebbe
divergato al primo ritocco.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `engine/dizionarioVoce.js` — dalla descrizione ai filtri

**Files:** Create `src/engine/dizionarioVoce.js`, `test/dizionarioVoce.test.js`; Modify `src/i18n/it.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: da `engine/sound.js` — la forma di una ricetta (`{semitones, formants, drive, reverb, filter}`)
- Produces: `leggiDescrizione(testo) => {capito: string[], nonCapito: string[], filtri: object}`

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `test/dizionarioVoce.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leggiDescrizione, PAROLE } from '../src/engine/dizionarioVoce.js';

/*
 * Dalla descrizione ai filtri, SENZA AI.
 *
 * Il committente aveva chiesto che il tasto usasse un modello linguistico per
 * capire la frase; l'AI e' stata rimandata il 2026-09-04 perche' sarebbe stata
 * la prima cosa a non girare nel browser del cliente. Qui c'e' un dizionario
 * locale: gratis, istantaneo, e soprattutto ONESTO — se non conosce una
 * parola lo dice, invece di indovinare.
 *
 * «Il tasto imposta, non decide»: i filtri restano tutti modificabili a mano.
 */

test('capisce le parole che conosce, e le somma', () => {
  const r = leggiDescrizione('piu calda e meno sibilante');
  assert.deepEqual(r.capito.sort(), ['calda', 'sibilante']);
  assert.deepEqual(r.nonCapito, []);
  assert.ok(r.filtri.formants < 0, '«calda» dovrebbe scurire il timbro');
});

test('dice quello che NON ha capito, invece di indovinare', () => {
  /*
   * E' la regola che rende il tasto affidabile: un dizionario che inventa
   * qualcosa su una parola sconosciuta insegna a non fidarsi del prossimo
   * risultato. Meglio dire «questa non la so».
   */
  const r = leggiDescrizione('voce da flangiatore quantistico');
  assert.deepEqual(r.capito, []);
  assert.ok(r.nonCapito.length > 0, 'non ha segnalato niente di sconosciuto');
});

test('senza NIENTE di riconosciuto non tocca i filtri', () => {
  const r = leggiDescrizione('asdf qwerty');
  assert.deepEqual(r.filtri, {}, 'ha toccato i filtri pur non avendo capito niente');
});

test('una descrizione vuota non e’ un errore', () => {
  for (const vuota of ['', '   ', null, undefined]) {
    const r = leggiDescrizione(vuota);
    assert.deepEqual(r.capito, []);
    assert.deepEqual(r.filtri, {});
  }
});

test('e’ deterministico: la stessa frase da’ gli stessi filtri', () => {
  const a = leggiDescrizione('grave, da radio, un po’ sporca');
  const b = leggiDescrizione('grave, da radio, un po’ sporca');
  assert.deepEqual(b, a);
});

test('l’ordine delle parole non cambia il risultato', () => {
  // «calda e grave» e «grave e calda» sono la stessa richiesta.
  const a = leggiDescrizione('calda e grave');
  const b = leggiDescrizione('grave e calda');
  assert.deepEqual(b.filtri, a.filtri);
});

test('accenti e maiuscole non contano', () => {
  assert.deepEqual(leggiDescrizione('PIÙ CALDA').filtri, leggiDescrizione('piu calda').filtri);
});

test('ogni parola del dizionario produce almeno un filtro', () => {
  // Una voce che non fa niente e' una promessa non mantenuta: l'utente la
  // scrive, il tasto dice «capito», e non cambia nulla.
  for (const p of Object.keys(PAROLE)) {
    const r = leggiDescrizione(p);
    assert.ok(Object.keys(r.filtri).length > 0, `«${p}» non produce nessun filtro`);
  }
});

test('due parole opposte non si annullano in silenzio', () => {
  // «grave e acuta» e' una richiesta contraddittoria: va detto, non risolto
  // di nascosto a favore dell'ultima.
  const r = leggiDescrizione('grave e acuta');
  assert.ok(r.contraddizioni.length > 0, 'non ha segnalato la contraddizione');
});
```

- [ ] **Step 2: Far girare i test — devono fallire**

```bash
npm test 2>&1 | grep -E "^not ok|Cannot find" | head
```

- [ ] **Step 3: Scrivere `src/engine/dizionarioVoce.js`**

```js
/**
 * Dalla descrizione ai filtri, senza AI.
 *
 * Il committente aveva chiesto un modello linguistico che leggesse la frase.
 * L'AI e' stata rimandata il 2026-09-04: sarebbe stata la prima cosa nell'app
 * a non girare nel browser del cliente, contro «tutto gratis e in locale, e'
 * il motivo dei 3,99 €».
 *
 * Un dizionario fa il 90% di quel lavoro, gratis e all'istante — e fa una cosa
 * che un modello linguistico non fa: **dice quando non ha capito**. Un tasto
 * che indovina insegna a non fidarsi del prossimo risultato; uno che dichiara
 * «questa parola non la so» resta credibile anche quando sbaglia.
 *
 * «Il tasto imposta, non decide»: cio' che esce e' un punto di partenza, e
 * tutte le manopole restano dove sono.
 */

/**
 * Le parole che il dizionario conosce, e cosa spostano.
 *
 * I nomi dei campi sono quelli di una ricetta in `sound.js`, cosi' cio' che
 * esce si applica senza traduzioni in mezzo. `formants` li' e' una pendenza
 * spettrale e non un vero spostamento delle formanti — il commento in
 * `useSound.js` lo dice — quindi qui si promette solo «scurisce/schiarisce».
 */
export const PAROLE = {
  calda: { formants: -3, filter: { type: 'lowpass', freq: 5200, q: 0.7 } },
  scura: { formants: -4 },
  chiara: { formants: 3 },
  brillante: { formants: 4 },
  grave: { semitones: -5 },
  acuta: { semitones: 5 },
  profonda: { semitones: -8, formants: -2 },
  radio: { drive: 0.4, filter: { type: 'bandpass', freq: 1600, q: 1.4 } },
  telefono: { filter: { type: 'bandpass', freq: 1800, q: 3 } },
  sporca: { drive: 0.6 },
  pulita: { drive: 0 },
  sibilante: { filter: { type: 'lowpass', freq: 4200, q: 1.2 } },
  ampia: { reverb: { seconds: 2.8, decay: 2.2, mix: 0.45 } },
  vicina: { reverb: { seconds: 0.4, decay: 1, mix: 0.08 } },
  lontana: { reverb: { seconds: 3.4, decay: 2.6, mix: 0.6 } },
};

/** Le coppie che non possono convivere: si segnalano, non si risolvono. */
const OPPOSTI = [
  ['grave', 'acuta'],
  ['calda', 'chiara'],
  ['scura', 'brillante'],
  ['sporca', 'pulita'],
  ['vicina', 'lontana'],
];

/**
 * «Meno X» va inteso al contrario di «più X».
 *
 * Senza questo, «meno sibilante» accenderebbe il filtro delle sibilanti
 * invece di spegnerlo — e sarebbe il tipo di errore che sembra un guasto del
 * dizionario e invece e' una parola non letta.
 */
const NEGAZIONI = ['meno', 'poco', 'senza'];

/** Via accenti e maiuscole: «PIÙ CALDA» e «piu calda» sono la stessa cosa. */
const pulisci = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Fonde due insiemi di filtri: i numeri si sommano, gli oggetti si sostituiscono. */
function fondi(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'number') out[k] = (out[k] ?? 0) + v;
    else out[k] = v;
  }
  return out;
}

/** Inverte un filtro, per «meno X». */
const inverti = (f) =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'number' ? -v : v]));

/**
 * Legge una descrizione.
 *
 * @returns {{capito: string[], nonCapito: string[], contraddizioni: string[][], filtri: object}}
 */
export function leggiDescrizione(testo) {
  const parole = pulisci(testo);
  const capito = [];
  const nonCapito = [];
  let filtri = {};
  let nega = false;

  for (const p of parole) {
    if (NEGAZIONI.includes(p)) {
      nega = true;
      continue;
    }
    // Le parole di legatura non sono «non capite»: nessuno si aspetta che
    // «e» faccia qualcosa, e segnalarle renderebbe l'avviso illeggibile.
    if (['piu', 'e', 'un', 'una', 'po', 'da', 'la', 'il', 'di', 'molto'].includes(p)) continue;

    if (PAROLE[p]) {
      capito.push(p);
      filtri = fondi(filtri, nega ? inverti(PAROLE[p]) : PAROLE[p]);
    } else {
      nonCapito.push(p);
    }
    nega = false;
  }

  const contraddizioni = OPPOSTI.filter(([x, y]) => capito.includes(x) && capito.includes(y));
  return { capito, nonCapito, contraddizioni, filtri };
}
```

- [ ] **Step 4: Far girare i test — devono passare**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)"
```

- [ ] **Step 5: Le stringhe, in due lingue**

`src/i18n/it.json`, dentro `"sound"`:

```json
    "descrivi": "Cosa vuoi ottenere",
    "descriviAiuto": "Scrivilo a parole: «più calda», «meno sibilante», «da radio». Quello che imposta resta modificabile a mano.",
    "capito": "Ho capito: {parole}.",
    "nonCapito": "Non conosco: {parole}. Il resto l'ho applicato.",
    "nienteCapito": "Non ho riconosciuto nessuna parola, quindi non ho toccato niente.",
    "contraddizione": "«{a}» e «{b}» chiedono il contrario: ho applicato tutt'e due, guarda tu quale tenere.",
```

`src/i18n/en.json`, stessa posizione:

```json
    "descrivi": "What do you want",
    "descriviAiuto": "Say it in words: “warmer”, “less sibilant”, “radio”. Whatever it sets stays editable by hand.",
    "capito": "I understood: {parole}.",
    "nonCapito": "I don't know: {parole}. I applied the rest.",
    "nienteCapito": "I didn't recognise a single word, so I changed nothing.",
    "contraddizione": "“{a}” and “{b}” ask for opposites: I applied both, you pick which to keep.",
```

- [ ] **Step 6: Test, build, commit**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build >/dev/null
git add src/engine/dizionarioVoce.js test/dizionarioVoce.test.js src/i18n/it.json src/i18n/en.json
git commit -m "$(cat <<'EOF'
feat: dalla descrizione ai filtri della voce, senza AI

Il committente aveva chiesto che il tasto usasse un modello linguistico per
leggere la frase. L'AI e' stata rimandata il 2026-09-04: sarebbe stata la
prima cosa nell'app a non girare nel browser del cliente.

Un dizionario locale fa il 90% di quel lavoro, gratis e all'istante — e fa una
cosa che un modello linguistico non fa: DICE QUANDO NON HA CAPITO. Un tasto
che indovina insegna a non fidarsi del prossimo risultato; uno che dichiara
«questa parola non la so» resta credibile anche quando sbaglia. Per questo
`nonCapito` e `contraddizioni` escono insieme ai filtri, e senza niente di
riconosciuto i filtri restano intatti.

«Meno X» inverte, o «meno sibilante» avrebbe acceso il filtro invece di
spegnerlo: un errore che sembra un guasto e invece e' una parola non letta.

I nomi dei campi sono quelli di una ricetta in `sound.js`, cosi' cio' che esce
si applica senza traduzioni in mezzo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: I due descrittori

**Files:** Create `src/servizi/brain.js`, `src/servizi/vocale.js`; Modify `src/servizi/index.js`

**Interfaces:**
- Consumes: da `src/servizi/index.js` — `QUANDO`, `validaDescrittore`
- Produces: `DESCRITTORI.brain`, `DESCRITTORI.vocale`

> ⚠️ **Il servizio del suono si chiama `suono`** in `services.js` e in `App.jsx` (`tool === 'suono'`). Il descrittore va registrato con **quella** chiave, non con «vocale», o `DESCRITTORI[tool]` non lo trova mai — e il servizio resterebbe fuori dall'impianto senza che niente si lamenti.

- [ ] **Step 1: Scrivere `src/servizi/brain.js`**

```js
/**
 * Brain, dichiarato.
 *
 * Il `+` ha TRE voci e non quattro: «idea» non e' un tipo, e' una nota con la
 * categoria «idea» — `CATEGORIE` in `engine/brain.js` e' gia'
 * `idea · task · domanda · riferimento · fatto`. Due tasti che creano lo
 * stesso oggetto avrebbero solo impedito di scoprire le altre quattro.
 *
 * La freccia non e' nel `+`: ha bisogno di due oggetti gia' sulla tela, e una
 * voce che il piu' delle volte non si puo' premere non e' una voce del `+`.
 */
export default {
  id: 'brain',
  claim: 'brain.claim',

  /** La tela non ha un tetto: quanti ne vuoi. */
  accetta: { menu: ['nota', 'gruppo', 'file'], quanti: 99 },

  tasto: {
    azione: 'riordina',
    modelli: [],
    fattori: false,
    /** Le pastiglie del punto oro: la regola di riordino. */
    opzioni: ['gruppi', 'tipo', 'compatta', 'frecce'],
    predefinita: 'gruppi',
  },

  strumenti: [
    { id: 'freccia', icon: 'freccia', label: 'brain.add.arrow', quando: 'con-file' },
    { id: 'annulla', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
  ],
};
```

- [ ] **Step 2: Scrivere `src/servizi/vocale.js`**

```js
/**
 * Il vocale, dichiarato.
 *
 * Il `+` da' due scelte perche' sono due gesti diversi: **registrare** apre il
 * microfono, **aggiungere** prende un file che hai gia'. Metterli in uno solo
 * avrebbe voluto dire scegliere al posto dell'utente quale dei due intendeva.
 *
 * Il tasto imposta i filtri dalla descrizione scritta in basso, con
 * `engine/dizionarioVoce.js`: locale, istantaneo, e onesto su cio' che non ha
 * capito. Niente modelli, quindi niente attesa e niente costo.
 */
export default {
  id: 'suono',
  claim: 'sound.claim',

  accetta: { menu: ['registra', 'aggiungi'], quanti: 1 },

  tasto: { azione: 'filtriDaDescrizione', modelli: [], fattori: false },

  strumenti: [
    { id: 'riascolta', icon: 'wave', label: 'sound.play', quando: 'con-file' },
    { id: 'salvaVoce', icon: 'stella', label: 'sound.saveVoice', quando: 'con-file' },
    { id: 'annulla', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
  ],
};
```

- [ ] **Step 3: Registrarli**

In `src/servizi/index.js`:

```js
import scontorna from './scontorna.js';
import filmato from './filmato.js';
import brain from './brain.js';
import vocale from './vocale.js';

export const DESCRITTORI = { scontorna, filmato, brain, suono: vocale };
```

- [ ] **Step 4: Le stringhe nuove, in due lingue**

`src/i18n/it.json` — dentro `"brain"`: `"claim": "La tela dove metti in ordine le idee: note, gruppi, frecce e i tuoi file."`
Dentro `"sound"`: `"claim": "Registra la tua voce o portane una, e trasformala."`, `"play": "Riascolta"`, `"saveVoice": "Salva questa voce"`.

`src/i18n/en.json` — dentro `"brain"`: `"claim": "The canvas where you sort your ideas out: notes, groups, arrows and your files."`
Dentro `"sound"`: `"claim": "Record your voice or bring one in, and transform it."`, `"play": "Play back"`, `"saveVoice": "Save this voice"`.

- [ ] **Step 5: Test, build, commit**

`test/servizi.test.js` gira gia' su **tutti** i descrittori registrati (`ogni descrittore registrato e' valido`), quindi i due nuovi vengono validati senza scrivere un test in piu'. Se il validatore protesta, dice cosa manca.

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build >/dev/null
git add src/servizi test/servizi.test.js src/i18n/it.json src/i18n/en.json
git commit -m "feat: i descrittori di Brain e del Vocale

Registrato sotto la chiave `suono`, non «vocale»: e' quella che App.jsx usa
in `tool === 'suono'`, e con l'altra `DESCRITTORI[tool]` non l'avrebbe mai
trovato — il servizio sarebbe restato fuori dall'impianto senza che niente si
lamentasse.

Il test «ogni descrittore registrato e' valido» gira gia' su tutti, quindi i
due nuovi sono coperti senza un test in piu'.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Brain entra nell'impianto

**Files:** Modify `src/App.jsx`, `src/components/Brain.jsx`, `test/impianto.test.js`

**Interfaces:**
- Consumes: da Task 1 — `riordina(items, regola)`; da Task 3 — `DESCRITTORI.brain`
- Produces: `regolaRiordino` (stato in `App.jsx`), `<Brain menu onMenu>`

- [ ] **Step 1: Il test che fallisce**

In fondo a `test/impianto.test.js`:

```js
test('non restano liste di id: tutti i servizi passano dal descrittore', () => {
  /*
   * Erano tre liste identiche da quattro `id`, piu' un Set, piu' due
   * `tool !== 'scontorna'`. Il pezzo 2 le ha ridotte a `['brain','suono']`;
   * qui spariscono, perche' anche quei due hanno un descrittore.
   */
  const liste = APP.match(/\[[^\]]*'(?:brain|suono)'[^\]]*\]\.includes\(tool\)/g) || [];
  assert.deepEqual(liste, [], `restano ${liste.length} liste di id in App.jsx`);
});
```

- [ ] **Step 2: Far girare — deve fallire**

```bash
npm test 2>&1 | grep -A 3 "non restano liste di id"
```

- [ ] **Step 3: Togliere le ultime liste**

In `src/App.jsx`, le tre righe che ancora nominano `['brain', 'suono']` diventano il solo `DESCRITTORI[tool]`:

```jsx
          {!isEditor && !DESCRITTORI[tool] && (
```

```jsx
          data-vuota={Boolean(DESCRITTORI[tool]) || undefined}
```

```jsx
          {DESCRITTORI[tool] ? null : isEditor ? (
```

- [ ] **Step 4: Il `+` di Brain e il tasto che riordina**

In `src/App.jsx`, accanto agli altri `useState`:

```js
  /** La regola con cui il tasto Zack riordina la tela di Brain. */
  const [regolaRiordino, setRegolaRiordino] = useState('gruppi');
  /** Il menu del `+` aperto, quando il servizio ne dichiara uno. */
  const [menuPiu, setMenuPiu] = useState(false);
```

`onPick` per Brain apre il menu invece del selettore di file:

```jsx
              onPick={
                tool === 'filmato'
                  ? scegliFilmato
                  : getDescrittore(tool).accetta.menu
                    ? () => setMenuPiu(true)
                    : scegliFile
              }
```

E `onZack`, per Brain, riordina:

```jsx
                if (tool === 'brain') {
                  // Deterministico: premere due volte da' lo stesso risultato.
                  // Il test di `riordina.js` lo difende.
                  cambiaTela(riordina(tela, regolaRiordino));
                  return;
                }
```

- [ ] **Step 5: Le pastiglie della regola nel punto oro**

In `src/components/Piano.jsx`, dentro `.sc-tuo`, dopo i modelli:

```jsx
            {servizio.tasto.opzioni && (
              <div className="sc-fattori" role="group" aria-label={t('zack.what')}>
                {servizio.tasto.opzioni.map((o) => (
                  <button
                    key={o}
                    className="pastiglia"
                    aria-pressed={opzione === o}
                    onClick={() => onOpzione(o)}
                  >
                    {t(`brain.riordina.${o}`)}
                  </button>
                ))}
              </div>
            )}
```

con due props nuove, `opzione` e `onOpzione`, passate da `App.jsx` come `regolaRiordino` / `setRegolaRiordino`. E le quattro chiavi `brain.riordina.gruppi|tipo|compatta|frecce` in tutt'e due le lingue: *Per gruppi · Per tipo · Compatta · Segui le frecce* / *By group · By kind · Tighten up · Follow the arrows*.

- [ ] **Step 6: Il menu del `+`**

In `src/components/Piano.jsx`, quando `menuPiu` è aperto, sopra la tela (è **un momento e non uno stato**, come l'ovale del punto oro):

```jsx
      {menu && (
        <div className="sc-menu" role="menu">
          {servizio.accetta.menu.map((voce) => (
            <button key={voce} role="menuitem" className="pastiglia" onClick={() => onMenu(voce)}>
              {t(`menu.${voce}`)}
            </button>
          ))}
        </div>
      )}
```

`Piano` riceve `menu={menuPiu}` e `onMenu={...}` da `App.jsx` — per Brain la
funzione mette l'oggetto sulla tela, per il Vocale è `menuVocale` del Task 5.
Chiavi `menu.nota|gruppo|file|registra|aggiungi` in due lingue: *Nota · Gruppo · File · Registra · Aggiungi* / *Note · Group · File · Record · Add*. Stile `.sc-menu`: stessa forma di `.sc-tuo`, centrato sotto il `+`.

- [ ] **Step 7: Verificare nel browser**

1. Brain si apre nell'impianto: `+` al centro, mascotte, tasto Zack, nessuna `statusbar`.
2. Il `+` apre tre voci; «nota» mette una nota sulla tela.
3. Il punto oro mostra le quattro regole.
4. Premere Zack riordina; **premerlo di nuovo non muove più niente**.

- [ ] **Step 8: Commit**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build >/dev/null
git add src/App.jsx src/components/Piano.jsx src/components/Brain.jsx src/styles.css src/i18n/it.json src/i18n/en.json test/impianto.test.js
git commit -m "feat: Brain entra nell'impianto, e muoiono le ultime liste di id

`['brain','suono'].includes(tool)` era quanto restava delle tre liste da
quattro. Ora la domanda «questo servizio passa dall'impianto?» ha una risposta
sola per tutti: `DESCRITTORI[tool]`.

Il `+` apre un menu invece del selettore di file, perche' su una tela non si
«aggiunge un file», si sceglie cosa mettere. Il tasto Zack riordina con la
regola scelta nel punto oro, e riordinare due volte non muove piu' niente —
lo difende un test in `riordina.js`.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Il Vocale entra nell'impianto, e la voce si salva

**Files:** Modify `src/App.jsx`, `src/components/SoundLab.jsx`, `src/styles.css`, `src/i18n/*.json`

**Interfaces:**
- Consumes: da Task 2 — `leggiDescrizione`; da Task 3 — `DESCRITTORI.suono`
- Produces: `descrizioneVoce` (stato), e un asset `kind: 'wav'` con `meta.op === 'voce'`

> **Perché salvare conta più di quanto sembri.** Il committente il 2026-09-05: *«sarebbe bello poter registrare delle voci e salvarle, e poi riutilizzarle»*. Oggi si registra e si esporta, e la registrazione se ne va. Senza un archivio delle voci, qualunque cosa venga dopo — varianti, cast, clonazione — non ha su cosa appoggiarsi. È il pezzo che va messo ora anche se il resto è lontano.

- [ ] **Step 1: Il `+` con due scelte, e i filtri che il tasto imposterà**

In `src/App.jsx`, accanto agli altri `useState`:

```js
  /** La frase scritta in basso nel Vocale: da lì il tasto ricava i filtri. */
  const [descrizioneVoce, setDescrizioneVoce] = useState('');
  /**
   * I filtri impostati dal tasto, come scostamento dalla ricetta scelta.
   *
   * Sta QUI e non dentro `SoundLab` perché il tasto Zack vive nell'impianto:
   * se lo stato fosse nel componente, il tasto non potrebbe toccarlo.
   */
  const [filtriVoce, setFiltriVoce] = useState({});
```

e la funzione che il tasto userà — è la sola cosa che «applica» i filtri, e li
**fonde** con quelli già impostati invece di sostituirli, perché due frasi di
seguito sono due richieste che si sommano:

```js
  /** Il tasto imposta, non decide: si fonde con ciò che c'è già. */
  function applicaFiltriVoce(nuovi) {
    setFiltriVoce((v) => ({ ...v, ...nuovi }));
  }
```

E `onMenu`, per il servizio `suono`:

```js
  function menuVocale(voce) {
    setMenuPiu(false);
    if (voce === 'registra') return sound.start();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) sound.apriFile?.(f);
    };
    input.click();
  }
```

⚠️ `sound.apriFile` **non esiste** in `useSound` (che oggi espone `recording,
clip, rhythm, error, start, stop, apply, reset, suona, comeFile`): va
aggiunto — prende un `File`, lo decodifica con `AudioContext.decodeAudioData`
e lo mette in `clip` esattamente come fa `stop()` con la registrazione. Senza,
la voce «aggiungi» del menu non fa niente, ed è la metà del gesto che il
contratto § 7.3 chiede.

Il vocale acquisito va **in alto**, sopra la tela — contratto § 7.3.

- [ ] **Step 2: Il campo della descrizione, in basso**

In `SoundLab.jsx`, sotto la tela:

```jsx
      <label className="voce-descrizione">
        <span>{t('sound.descrivi')}</span>
        <input
          type="text"
          value={descrizione}
          placeholder={t('sound.descriviAiuto')}
          onChange={(e) => onDescrizione(e.target.value)}
        />
      </label>
```

`SoundLab` riceve le due props da `App.jsx` come
`descrizione={descrizioneVoce}` e `onDescrizione={setDescrizioneVoce}` — sono
lo stesso valore, con due nomi perché uno è lo stato e l'altro la prop.

- [ ] **Step 3: Il tasto Zack imposta i filtri**

In `App.jsx`, dentro `onZack`:

```jsx
                if (tool === 'suono') {
                  const letto = leggiDescrizione(descrizioneVoce);
                  if (letto.capito.length === 0) {
                    setNotice(t('sound.nienteCapito'));
                    return;
                  }
                  applicaFiltriVoce(letto.filtri);
                  // Si dice sempre cosa si e' capito E cosa no: il tasto
                  // imposta, non decide, e l'utente deve poter correggere.
                  const detto = [t('sound.capito', { parole: letto.capito.join(', ') })];
                  if (letto.nonCapito.length > 0) {
                    detto.push(t('sound.nonCapito', { parole: letto.nonCapito.join(', ') }));
                  }
                  for (const [a, b] of letto.contraddizioni) {
                    detto.push(t('sound.contraddizione', { a, b }));
                  }
                  setNotice(detto.join(' '));
                  return;
                }
```

- [ ] **Step 4: «Salva questa voce»**

Lo strumento `salvaVoce` del descrittore salva la clip corrente in libreria:

```js
  async function salvaVoce() {
    const file = sound.comeFile?.();
    if (!file) return;
    await library.save(file, {
      name: `voce-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`,
      kind: 'wav',
      // `op: 'voce'` distingue una VOCE da un effetto sonoro: e' la
      // differenza che servira' per ritrovarle quando saranno tante.
      meta: { op: 'voce' },
    });
    setNotice(t('sound.saved'));
  }
```

Chiave `sound.saved`: *«Voce salvata in libreria.»* / *“Voice saved to your library.”*

- [ ] **Step 5: Verificare nel browser**

1. Suono si apre nell'impianto, col `+` che offre *Registra* e *Aggiungi*.
2. Portato un file audio, compaiono i tre cerchi.
3. Scritto «più calda e meno sibilante» e premuto Zack: l'avviso dice cosa ha capito, e i filtri si muovono.
4. Scritto «flangiatore quantistico»: dice che non ha riconosciuto niente e **non tocca i filtri**.
5. «Salva questa voce» la mette in libreria, e si ritrova.

- [ ] **Step 6: Commit**

```bash
npm test 2>&1 | grep -E "^not ok|^# (tests|pass|fail)" && npm run build >/dev/null
git add src/App.jsx src/components/SoundLab.jsx src/styles.css src/i18n/it.json src/i18n/en.json
git commit -m "feat: il Vocale nell'impianto, e le voci si salvano

Il `+` da' due scelte perche' sono due gesti diversi: registrare apre il
microfono, aggiungere prende un file che hai gia'.

Il tasto imposta i filtri dalla descrizione, con il dizionario locale. Dice
sempre cosa ha capito E cosa no: il tasto imposta, non decide.

E le voci registrate ora si SALVANO come asset (`meta.op === 'voce'`).
Richiesta del committente del 2026-09-05: oggi si registra, si esporta, e la
registrazione se ne va. Senza un archivio delle voci, qualunque cosa venga
dopo — varianti, cast, clonazione — non ha su cosa appoggiarsi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: L'icona si sceglie per qualunque file

Spec § 7.1, richiesta del committente del 2026-09-04: *«deve essere possibile aggiungere anche un file e dargli un'icona»*. È **costruito e chiuso a chiave**, non da inventare.

**Files:** Modify `src/components/Brain.jsx`, `test/impianto.test.js`

- [ ] **Step 1: Il test che fallisce**

```js
test('l’icona si sceglie per qualunque file, non solo per i .md', () => {
  /*
   * `iconaDocumento(asset)` legge `asset.meta.icona` per QUALUNQUE asset, e il
   * selettore esiste — ma era dietro `KIND_TESTO.includes(kind)`, e
   * `KIND_TESTO = ['md']`. Quindi solo i .md potevano avere un'icona, mentre
   * su una tela con venti file e' proprio l'icona a dire cosa sono.
   */
  const BRAIN = readFileSync(new URL('../src/components/Brain.jsx', import.meta.url), 'utf8');
  const i = BRAIN.indexOf('brain-icona');
  assert.notEqual(i, -1, 'il selettore delle icone non esiste piu’');
  const intorno = BRAIN.slice(Math.max(0, i - 400), i);
  assert.doesNotMatch(
    intorno,
    /KIND_TESTO\.includes\([^)]*\)\s*&&/,
    'il selettore delle icone e’ ancora riservato ai .md',
  );
});
```

- [ ] **Step 2: Togliere la condizione**

In `src/components/Brain.jsx`, la riga `{assetScelto && KIND_TESTO.includes(assetScelto.kind) && (` che precede il selettore diventa `{assetScelto && (`.

⚠️ **Da guardare mentre si toglie:** `ICONE_DOCUMENTO` è `FOLDER_ICONS`, pensato per documenti. Se non c'è un'icona sensata per un audio o un filmato, **vanno disegnate** — se no cadono tutte su `ICONE_DOCUMENTO[0]` e una tela con dieci file diventa dieci icone identiche, che è il difetto che questo task dovrebbe risolvere.

- [ ] **Step 3: Verificare nel browser**

Portare su Brain un `.wav` e un `.png`: il selettore delle icone c'è per tutt'e due, e sceglierne una la mostra sulla scheda.

- [ ] **Step 4: Commit**

```bash
git add src/components/Brain.jsx test/impianto.test.js
git commit -m "fix: l'icona si sceglie per qualunque file, non solo per i .md

Richiesta del committente del 2026-09-04. Era costruito e chiuso a chiave:
`iconaDocumento` legge `meta.icona` per QUALUNQUE asset e il selettore
esisteva, ma dietro `KIND_TESTO = ['md']`.

Su una tela con venti file e' proprio l'icona a dire cosa sono: un'immagine si
vede, tutto il resto e' un'icona con un nome.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Al termine

- `npm test && npm run build` verdi;
- **`includes(tool)` non esiste più in `App.jsx`**: tutti e cinque i servizi passano dall'impianto;
- Brain riordina, e riordinare due volte non muove più niente;
- il Vocale registra, salva le voci, e imposta i filtri da una frase — dicendo cosa non ha capito;
- un file qualunque su Brain può avere la sua icona.

Restano: **il pezzo 4** (Vettoriale) e **il pezzo 5** (il desktop). E fuori dai pezzi, la **Libreria come schermata**, che sblocca la striscia in alto.
