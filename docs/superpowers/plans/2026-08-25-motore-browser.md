# Motore nel browser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare scontorno e vettorializzazione dentro il browser del cliente, in un Web Worker, così che l'operazione principale del prodotto non costi nulla per esecuzione.

**Architecture:** Un Web Worker ospita ONNX Runtime Web (WebGPU, fallback WASM) e VTracer WASM. Il thread principale parla al worker con un'API a promesse e non tocca mai i modelli. Le funzioni pure — registro modelli, compositing, i18n, rilevamento capacità — vivono fuori dal worker e sono testabili in Node. Il backend Fastify esistente resta come modalità locale e come riferimento di correttezza per i test di parità.

**Tech Stack:** onnxruntime-web 1.29, Vite 6, React 19, node:test, sharp (solo nei test di parità lato Node).

**Spec:** `docs/superpowers/specs/2026-08-25-jayl-studio-browser-engine-design.md`

## Global Constraints

Valgono per ogni task. Non sono rifiniture finali.

- **Licenze:** solo modelli commercialmente utilizzabili. Ammessi `u2net`, `isnet-general-use`, `isnet-anime` (Apache-2.0), `birefnet-*` (MIT). Vietati `bria-rmbg` e `u2net_portrait`. Un test deve fallire se un modello vietato entra nel registro.
- **Lingua:** ogni stringa mostrata all'utente esiste in **italiano e inglese**. Nessuna stringa scritta a mano dentro un componente.
- **Un controllo senza testo d'aiuto non è finito.** Ogni comando dell'interfaccia ha una descrizione in entrambe le lingue, scritta nello stesso task che crea il comando.
- **Nessun messaggio tecnico all'utente.** Gli errori mostrati dicono cosa è successo e cosa fare. Lo stack trace va in console, mai a schermo.
- **Ogni attesa oltre un secondo mostra avanzamento** e cosa sta accadendo, in parole normali.
- **I default devono funzionare senza toccare nulla.** L'utente deve poter trascinare un file e premere un solo bottone.
- **Palette JAYL:** nero `#111111`, panna `#F5F0E8`, grigio `#8A8A85`, oro `#C4A35A` sotto il 10%. Font: Space Grotesk (UI), Cormorant Garamond (editoriale).
- **Il thread principale non esegue mai inferenza.** Se un task lo fa, è sbagliato.
- Comandi: `npm test` per i test Node, `npm run dev` per l'app.

---

## Struttura dei file

Nuovi:

```
src/engine/models.js         registro modelli: id, licenza, dimensione input, normalizzazione
src/engine/compose.js        funzioni pure: maschera → canale alfa (nessuna dipendenza dal DOM)
src/engine/capabilities.js   rilevamento WebGPU → livello (accelerato | compatibilità)
src/engine/worker.js         gira nel Worker: ospita ONNX Runtime, esegue l'inferenza
src/engine/client.js         API a promesse verso il worker, usata dal thread principale
src/i18n/index.js            funzione t(), lingua corrente, rilevamento da navigator
src/i18n/it.json             stringhe italiane
src/i18n/en.json             stringhe inglesi
src/components/EngineBanner.jsx  avviso onesto sul livello del motore
public/ort/                  asset wasm di onnxruntime-web (copiati da node_modules)
test/engine.test.js          test Node delle funzioni pure e del vincolo licenze
test/i18n.test.js            test Node: le due lingue hanno le stesse chiavi
```

Modificati:

```
src/App.jsx                  usa il motore browser invece della chiamata API
src/lib/api.js               resta per la modalità locale/premium
package.json                 dipendenza onnxruntime-web, script di copia asset ort
vite.config.js               esclude onnxruntime-web dall'ottimizzazione dipendenze
```

---

### Task 1: Registro modelli e vincolo di licenza

Il vincolo che può affondare il prodotto è commerciale, non tecnico. Va bloccato da un test prima di scrivere qualunque inferenza.

**Files:**
- Create: `src/engine/models.js`
- Test: `test/engine.test.js`

**Interfaces:**
- Produces: `MODELS` (array), `getModel(id)`, `BLOCKED_MODELS` (array), `TIERS` (oggetto). Ogni modello: `{ id, label, license, commercial, size, norm: {mean:[3], std:[3]}, tier, bytes }`.

- [ ] **Step 1: Scrivi il test che fallisce**

```js
// test/engine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, getModel, BLOCKED_MODELS } from '../src/engine/models.js';

test('nessun modello non commerciale può entrare nel registro', () => {
  for (const m of MODELS) {
    assert.equal(m.commercial, true, `${m.id} non è utilizzabile commercialmente`);
    assert.ok(
      /^(MIT|Apache-2\.0)$/.test(m.license),
      `${m.id} ha licenza "${m.license}", non consentita`,
    );
  }
});

test('i modelli vietati sono nominati esplicitamente e assenti', () => {
  // bria-rmbg è il DEFAULT della CLI di rembg: va escluso di proposito,
  // non per dimenticanza. u2net_portrait viene da un repo Apache-2.0 ma è
  // addestrato su APDrawing, che è non commerciale.
  assert.ok(BLOCKED_MODELS.includes('bria-rmbg'));
  assert.ok(BLOCKED_MODELS.includes('u2net_portrait'));
  for (const bad of BLOCKED_MODELS) {
    assert.equal(MODELS.find((m) => m.id === bad), undefined, `${bad} è nel registro`);
  }
});

test('isnet non usa la normalizzazione ImageNet', () => {
  // Sbagliarla produce una maschera completamente errata SENZA errori a runtime:
  // è già successo durante la sonda del 2026-08-25.
  const isnet = getModel('isnet-general-use');
  assert.deepEqual(isnet.norm.mean, [0.5, 0.5, 0.5]);
  assert.deepEqual(isnet.norm.std, [1, 1, 1]);
  assert.equal(isnet.size, 1024);

  const u2net = getModel('u2net');
  assert.deepEqual(u2net.norm.mean, [0.485, 0.456, 0.406]);
  assert.equal(u2net.size, 320);
});

test('ogni livello ha un modello', () => {
  assert.ok(MODELS.some((m) => m.tier === 'accelerato'));
  assert.ok(MODELS.some((m) => m.tier === 'compatibilita'));
});

test('getModel rifiuta un id sconosciuto', () => {
  assert.throws(() => getModel('inesistente'), /sconosciuto/);
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test -- --test-name-pattern="registro|vietati|isnet|livello|getModel"`
Expected: FAIL — `Cannot find module '../src/engine/models.js'`

- [ ] **Step 3: Scrivi l'implementazione minima**

```js
// src/engine/models.js

/**
 * Modelli mai ammessi, con la ragione. bria-rmbg è il default della CLI di
 * rembg: se un giorno qualcuno smette di passare -m esplicito, deve rompersi
 * un test, non arrivare in produzione un modello non vendibile.
 */
export const BLOCKED_MODELS = ['bria-rmbg', 'u2net_portrait'];

const IMAGENET = { mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] };
// isnet/DIS: preso da rembg dis_general_use.py. NON è ImageNet.
const HALF = { mean: [0.5, 0.5, 0.5], std: [1, 1, 1] };

export const TIERS = {
  accelerato: 'accelerato',
  compatibilita: 'compatibilita',
};

export const MODELS = [
  {
    id: 'u2net',
    label: 'Rapido',
    license: 'Apache-2.0',
    commercial: true,
    size: 320,
    norm: IMAGENET,
    tier: TIERS.compatibilita,
    bytes: 175_000_000,
    url: '/models/u2net.onnx',
  },
  {
    id: 'isnet-general-use',
    label: 'Qualità',
    license: 'Apache-2.0',
    commercial: true,
    size: 1024,
    norm: HALF,
    tier: TIERS.accelerato,
    bytes: 179_000_000,
    url: '/models/isnet-general-use.onnx',
  },
  {
    id: 'isnet-anime',
    label: 'Illustrazioni',
    license: 'Apache-2.0',
    commercial: true,
    size: 1024,
    norm: HALF,
    tier: TIERS.accelerato,
    bytes: 176_000_000,
    url: '/models/isnet-anime.onnx',
  },
];

export function getModel(id) {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error(`Modello sconosciuto: ${id}`);
  return m;
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npm test`
Expected: PASS, inclusi i 10 test già esistenti

- [ ] **Step 5: Commit**

```bash
git add src/engine/models.js test/engine.test.js
git commit -m "feat(engine): registro modelli con vincolo di licenza applicato dai test"
```

---

### Task 2: Compositing puro della maschera

La funzione che applica la maschera ai pixel originali. Pura, senza DOM, quindi testabile in Node — ed è già stata fonte di un bug silenzioso in `sharp.joinChannel`.

**Files:**
- Create: `src/engine/compose.js`
- Modify: `test/engine.test.js` (aggiungi in fondo)

**Interfaces:**
- Consumes: niente
- Produces: `normalizeMask(mask) -> Float32Array` (riscala 0..1), `applyMaskToRgba(rgba, maskU8, pixelCount) -> Uint8ClampedArray` (muta e restituisce lo stesso buffer), `maskToU8(mask) -> Uint8ClampedArray`

- [ ] **Step 1: Scrivi il test che fallisce**

```js
// in fondo a test/engine.test.js
import { normalizeMask, maskToU8, applyMaskToRgba } from '../src/engine/compose.js';

test('normalizeMask riscala su 0..1 usando min e max effettivi', () => {
  const out = normalizeMask(Float32Array.from([-2, 0, 2]));
  assert.equal(out[0], 0);
  assert.equal(out[1], 0.5);
  assert.equal(out[2], 1);
});

test('normalizeMask non divide per zero su una maschera piatta', () => {
  const out = normalizeMask(Float32Array.from([3, 3, 3]));
  assert.ok(Number.isFinite(out[0]), 'una maschera piatta non deve produrre NaN');
});

test('applyMaskToRgba scrive nel canale alfa e non tocca RGB', () => {
  // due pixel: bianco e nero, entrambi opachi
  const rgba = Uint8ClampedArray.from([255, 255, 255, 255, 0, 0, 0, 255]);
  const mask = Uint8ClampedArray.from([0, 200]);
  const out = applyMaskToRgba(rgba, mask, 2);

  assert.equal(out[3], 0, 'il primo pixel deve diventare trasparente');
  assert.equal(out[7], 200, 'il secondo pixel prende il valore della maschera');
  assert.equal(out[0], 255, 'il rosso del primo pixel non deve cambiare');
  assert.equal(out[4], 0, 'il rosso del secondo pixel non deve cambiare');
});

test('applyMaskToRgba rifiuta lunghezze incoerenti invece di corrompere', () => {
  const rgba = new Uint8ClampedArray(8);
  assert.throws(() => applyMaskToRgba(rgba, new Uint8ClampedArray(5), 2), /non combacia/);
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/engine/compose.js'`

- [ ] **Step 3: Scrivi l'implementazione minima**

```js
// src/engine/compose.js

/**
 * Le reti restituiscono valori non limitati. rembg riscala su min/max effettivi
 * prima di trasformarli in maschera: replicato qui, altrimenti il ritaglio esce
 * o tutto opaco o tutto trasparente.
 */
export function normalizeMask(mask) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1; // una maschera piatta non deve produrre NaN
  const out = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = (mask[i] - lo) / span;
  return out;
}

export function maskToU8(mask) {
  const norm = normalizeMask(mask);
  const out = new Uint8ClampedArray(norm.length);
  for (let i = 0; i < norm.length; i++) out[i] = Math.round(norm[i] * 255);
  return out;
}

/**
 * Applica la maschera come canale alfa sui pixel originali.
 * I canali RGB non vengono mai toccati: è la garanzia che un file di stampa
 * esca alla stessa risoluzione con cui è entrato.
 */
export function applyMaskToRgba(rgba, maskU8, pixelCount) {
  if (rgba.length !== pixelCount * 4 || maskU8.length !== pixelCount) {
    throw new Error(
      `Maschera e immagine: la dimensione non combacia (${maskU8.length} contro ${pixelCount})`,
    );
  }
  for (let i = 0; i < pixelCount; i++) rgba[i * 4 + 3] = maskU8[i];
  return rgba;
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/compose.js test/engine.test.js
git commit -m "feat(engine): compositing puro della maschera, testato in isolamento"
```

---

### Task 3: Lingua italiana e inglese

Va fatta ora perché ora costa poco. Il test impedisce la deriva fra le due lingue, che è il modo in cui l'i18n muore.

**Files:**
- Create: `src/i18n/index.js`, `src/i18n/it.json`, `src/i18n/en.json`
- Test: `test/i18n.test.js`

**Interfaces:**
- Produces: `t(key, vars?)`, `setLang(lang)`, `getLang()`, `LANGS = ['it','en']`, `detectLang(navigatorLanguages)`

- [ ] **Step 1: Scrivi il test che fallisce**

```js
// test/i18n.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import it from '../src/i18n/it.json' with { type: 'json' };
import en from '../src/i18n/en.json' with { type: 'json' };
import { t, setLang, detectLang } from '../src/i18n/index.js';

const keys = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  );

test('italiano e inglese hanno esattamente le stesse chiavi', () => {
  const a = keys(it).sort();
  const b = keys(en).sort();
  const soloIt = a.filter((k) => !b.includes(k));
  const soloEn = b.filter((k) => !a.includes(k));
  assert.deepEqual(soloIt, [], `chiavi senza traduzione inglese: ${soloIt.join(', ')}`);
  assert.deepEqual(soloEn, [], `chiavi senza traduzione italiana: ${soloEn.join(', ')}`);
});

test('nessuna stringa è vuota', () => {
  for (const [lang, dict] of [['it', it], ['en', en]]) {
    for (const k of keys(dict)) {
      const v = k.split('.').reduce((o, part) => o[part], dict);
      assert.ok(String(v).trim().length > 0, `${lang}.${k} è vuota`);
    }
  }
});

test('ogni controllo ha il suo testo di aiuto', () => {
  // Regola di progetto: un comando senza spiegazione non è finito.
  for (const k of keys(it).filter((k) => k.startsWith('control.') && k.endsWith('.label'))) {
    const help = k.replace(/\.label$/, '.help');
    assert.ok(keys(it).includes(help), `manca il testo di aiuto per ${k}`);
  }
});

test('t restituisce la lingua scelta e sostituisce le variabili', () => {
  setLang('it');
  assert.equal(t('engine.tier.fast.name'), 'Rapido');
  setLang('en');
  assert.equal(t('engine.tier.fast.name'), 'Fast');
  assert.match(t('engine.download.progress', { pct: 42 }), /42/);
});

test('t non esplode su una chiave mancante, la restituisce', () => {
  assert.equal(t('chiave.che.non.esiste'), 'chiave.che.non.esiste');
});

test('detectLang sceglie italiano solo se il browser lo chiede', () => {
  assert.equal(detectLang(['it-IT', 'en']), 'it');
  assert.equal(detectLang(['en-GB']), 'en');
  assert.equal(detectLang([]), 'en');
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL — modulo i18n non trovato

- [ ] **Step 3: Scrivi l'implementazione minima**

```json
// src/i18n/it.json
{
  "engine": {
    "tier": {
      "fast": { "name": "Rapido", "note": "meno preciso, va ovunque" },
      "quality": { "name": "Qualità", "note": "bordi più puliti" }
    },
    "download": {
      "title": "Preparo lo strumento",
      "body": "Sto scaricando il motore di ritaglio. Succede una volta sola: dalla prossima volta è immediato.",
      "progress": "{pct}%"
    },
    "slow": {
      "title": "Il tuo browser sta usando la modalità lenta",
      "body": "Non supporta l'accelerazione grafica, quindi ogni ritaglio richiede qualche secondo in più ed è meno preciso sui bordi fini. Con Chrome o Edge aggiornati sarebbe circa tre volte più veloce.",
      "action": "Va bene così"
    },
    "working": "Sto ritagliando…",
    "error": {
      "title": "Non sono riuscito a ritagliare questa immagine",
      "body": "Riprova, oppure prova con un'immagine diversa. Se continua, il file potrebbe essere danneggiato."
    }
  },
  "control": {
    "cutout": { "label": "Scontorna", "help": "Toglie lo sfondo e lascia solo il soggetto, su trasparenza." },
    "quality": { "label": "Qualità", "help": "Più alta significa bordi più precisi ma qualche secondo in più." },
    "language": { "label": "Lingua", "help": "Cambia la lingua dell'interfaccia." }
  }
}
```

```json
// src/i18n/en.json
{
  "engine": {
    "tier": {
      "fast": { "name": "Fast", "note": "less precise, runs anywhere" },
      "quality": { "name": "Quality", "note": "cleaner edges" }
    },
    "download": {
      "title": "Getting the tool ready",
      "body": "Downloading the cutout engine. This happens once — next time it is instant.",
      "progress": "{pct}%"
    },
    "slow": {
      "title": "Your browser is running in slow mode",
      "body": "It has no graphics acceleration, so each cutout takes a few seconds longer and is less precise on fine edges. An up-to-date Chrome or Edge would be about three times faster.",
      "action": "That's fine"
    },
    "working": "Cutting out…",
    "error": {
      "title": "I couldn't cut out this image",
      "body": "Try again, or try a different image. If it keeps happening, the file may be damaged."
    }
  },
  "control": {
    "cutout": { "label": "Remove background", "help": "Removes the background and keeps only the subject, on transparency." },
    "quality": { "label": "Quality", "help": "Higher means cleaner edges but a few seconds more." },
    "language": { "label": "Language", "help": "Changes the interface language." }
  }
}
```

```js
// src/i18n/index.js
import it from './it.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };

export const LANGS = ['it', 'en'];
const DICTS = { it, en };

let current = 'en';

export function detectLang(languages = []) {
  for (const l of languages) {
    const short = String(l).slice(0, 2).toLowerCase();
    if (LANGS.includes(short)) return short;
  }
  return 'en';
}

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : 'en';
  return current;
}

export function getLang() {
  return current;
}

/**
 * Una chiave mancante restituisce la chiave stessa invece di rompersi: in
 * un'interfaccia una traduzione assente è un difetto estetico, una schermata
 * bianca è un difetto grave.
 */
export function t(key, vars) {
  const raw = key.split('.').reduce((o, part) => (o == null ? undefined : o[part]), DICTS[current]);
  if (typeof raw !== 'string') return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n test/i18n.test.js
git commit -m "feat(i18n): italiano e inglese, con test che impedisce la deriva fra le due"
```

---

### Task 4: Rilevamento capacità

Decide quale livello usare. Separato dal worker perché l'interfaccia deve sapere cosa dire all'utente **prima** che il motore parta.

**Files:**
- Create: `src/engine/capabilities.js`
- Modify: `test/engine.test.js` (aggiungi in fondo)

**Interfaces:**
- Consumes: `TIERS`, `MODELS` da `src/engine/models.js`
- Produces: `pickTier(hasWebGpu) -> 'accelerato'|'compatibilita'`, `defaultModelFor(tier) -> model`, `async detectWebGpu(gpu) -> boolean`

- [ ] **Step 1: Scrivi il test che fallisce**

```js
// in fondo a test/engine.test.js
import { pickTier, defaultModelFor, detectWebGpu } from '../src/engine/capabilities.js';

test('senza WebGPU si scende al livello compatibilità', () => {
  assert.equal(pickTier(true), 'accelerato');
  assert.equal(pickTier(false), 'compatibilita');
});

test('ogni livello ha un modello predefinito coerente', () => {
  assert.equal(defaultModelFor('accelerato').id, 'isnet-general-use');
  assert.equal(defaultModelFor('compatibilita').id, 'u2net');
  // Il livello lento non deve mai proporre un modello a 1024px: durante la
  // sonda ha bloccato il tab per minuti.
  assert.ok(defaultModelFor('compatibilita').size <= 320);
});

test('detectWebGpu è falso se l’API non c’è o non dà un adapter', async () => {
  assert.equal(await detectWebGpu(undefined), false);
  assert.equal(await detectWebGpu({ requestAdapter: async () => null }), false);
  assert.equal(await detectWebGpu({ requestAdapter: async () => ({}) }), true);
});

test('detectWebGpu non propaga eccezioni', async () => {
  const gpu = { requestAdapter: async () => { throw new Error('boom'); } };
  assert.equal(await detectWebGpu(gpu), false);
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test`
Expected: FAIL — modulo capabilities non trovato

- [ ] **Step 3: Scrivi l'implementazione minima**

```js
// src/engine/capabilities.js
import { MODELS, TIERS, getModel } from './models.js';

export function pickTier(hasWebGpu) {
  return hasWebGpu ? TIERS.accelerato : TIERS.compatibilita;
}

export function defaultModelFor(tier) {
  return tier === TIERS.accelerato ? getModel('isnet-general-use') : getModel('u2net');
}

export function modelsFor(tier) {
  return tier === TIERS.accelerato ? MODELS : MODELS.filter((m) => m.size <= 320);
}

/**
 * `gpu` è iniettato per essere testabile. Non solleva mai: un browser che
 * risponde male alla richiesta di adapter deve degradare, non rompere l'app.
 */
export async function detectWebGpu(gpu) {
  if (!gpu || typeof gpu.requestAdapter !== 'function') return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/capabilities.js test/engine.test.js
git commit -m "feat(engine): rilevamento capacità e scelta del livello"
```

---

### Task 5: Asset di ONNX Runtime e configurazione Vite

Passaggio infrastrutturale già costato tempo durante la sonda. Va risolto una volta e documentato.

**Files:**
- Modify: `package.json`, `vite.config.js`, `.gitignore`
- Create: `scripts/stage-ort.js`

**Interfaces:**
- Produces: `public/ort/*` presente dopo `npm install`; `/ort/` servito staticamente.

- [ ] **Step 1: Installa la dipendenza**

```bash
npm install onnxruntime-web@^1.29.0 --no-audit --no-fund
```

- [ ] **Step 2: Scrivi lo script di copia**

```js
// scripts/stage-ort.js
// onnxruntime-web carica i suoi .wasm/.mjs a runtime da un percorso servito.
// Vanno copiati in public/ e NON versionati: sono artefatti di node_modules.
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const from = path.resolve('node_modules/onnxruntime-web/dist');
const to = path.resolve('public/ort');

await mkdir(to, { recursive: true });
const files = (await readdir(from)).filter((f) => /\.(wasm|mjs)$/.test(f));
for (const f of files) await cp(path.join(from, f), path.join(to, f));
console.log(`ort: copiati ${files.length} file in public/ort`);
```

- [ ] **Step 3: Aggancia lo script e configura Vite**

In `package.json`, aggiungi a `scripts`:

```json
"postinstall": "node scripts/stage-ort.js",
"prebuild": "node scripts/stage-ort.js"
```

In `vite.config.js`, dentro l'oggetto esportato:

```js
  // Vite pre-ottimizza onnxruntime-web e riscrive i suoi import dinamici con
  // `?import`, che poi restituisce 500 per i file in public/. Escluderlo
  // lascia quegli import come URL normali.
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  worker: { format: 'es' },
```

In `.gitignore`, aggiungi:

```
public/ort/
public/models/
```

- [ ] **Step 4: Verifica**

```bash
node scripts/stage-ort.js && ls public/ort | head -3
```
Expected: elenco di file `.mjs` e `.wasm`

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js .gitignore scripts/stage-ort.js
git commit -m "chore(engine): asset onnxruntime-web serviti da public/ort"
```

---

### Task 6: Il worker e il suo client

Il cuore. Verificato nel browser, non da test Node: qui vive l'inferenza.

**Files:**
- Create: `src/engine/worker.js`, `src/engine/client.js`

**Interfaces:**
- Consumes: `getModel`, `maskToU8`, `applyMaskToRgba`
- Produces: `createEngine() -> { init(tier), cutout(imageBitmap, modelId, onProgress) -> {rgba, width, height}, dispose() }`. Il worker riceve `{type:'init'|'cutout', ...}` e risponde `{type:'ready'|'progress'|'result'|'error', ...}`.

- [ ] **Step 1: Scrivi il worker**

```js
// src/engine/worker.js
// Gira nel Worker. Il thread principale non esegue MAI inferenza: durante la
// sonda del 2026-08-25 un giro a 1024px ha bloccato il tab per oltre tre minuti.
import * as ort from 'onnxruntime-web/webgpu';
import { getModel } from './models.js';
import { maskToU8, applyMaskToRgba } from './compose.js';

ort.env.wasm.wasmPaths = '/ort/';

let session = null;
let sessionModelId = null;
let provider = 'wasm';

const post = (msg, transfer) => self.postMessage(msg, transfer || []);

async function ensureSession(modelId) {
  if (session && sessionModelId === modelId) return;
  const model = getModel(modelId);
  await session?.release?.();
  session = await ort.InferenceSession.create(model.url, {
    executionProviders: [provider],
    graphOptimizationLevel: 'all',
  });
  sessionModelId = modelId;
}

function preprocess(bitmap, model) {
  const { size, norm } = model;
  const c = new OffscreenCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const plane = size * size;
  // rembg divide per il massimo effettivo dell'immagine, non per 255 fisso.
  let max = 1e-6;
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    if (data[p] > max) max = data[p];
    if (data[p + 1] > max) max = data[p + 1];
    if (data[p + 2] > max) max = data[p + 2];
  }
  const f = new Float32Array(3 * plane);
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    f[i] = (data[p] / max - norm.mean[0]) / norm.std[0];
    f[plane + i] = (data[p + 1] / max - norm.mean[1]) / norm.std[1];
    f[2 * plane + i] = (data[p + 2] / max - norm.mean[2]) / norm.std[2];
  }
  return new ort.Tensor('float32', f, [1, 3, size, size]);
}

/** Riporta la maschera a piena risoluzione e la applica ai pixel ORIGINALI. */
function compositeFullRes(bitmap, maskU8, mw, mh) {
  const w = bitmap.width;
  const h = bitmap.height;

  const mc = new OffscreenCanvas(mw, mh);
  const mctx = mc.getContext('2d');
  const md = mctx.createImageData(mw, mh);
  for (let i = 0; i < maskU8.length; i++) {
    md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = maskU8[i];
    md.data[i * 4 + 3] = 255;
  }
  mctx.putImageData(md, 0, 0);

  const up = new OffscreenCanvas(w, h);
  const uctx = up.getContext('2d');
  uctx.imageSmoothingQuality = 'high';
  uctx.drawImage(mc, 0, 0, w, h);
  const upMask = uctx.getImageData(0, 0, w, h).data;

  const oc = new OffscreenCanvas(w, h);
  const octx = oc.getContext('2d', { willReadFrequently: true });
  octx.drawImage(bitmap, 0, 0);
  const img = octx.getImageData(0, 0, w, h);

  const flat = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) flat[i] = upMask[i * 4];
  applyMaskToRgba(img.data, flat, w * h);

  return { rgba: img.data, width: w, height: h };
}

self.onmessage = async (e) => {
  const { type, id } = e.data;
  try {
    if (type === 'init') {
      provider = e.data.tier === 'accelerato' ? 'webgpu' : 'wasm';
      post({ type: 'ready', id, provider });
      return;
    }
    if (type === 'cutout') {
      const { bitmap, modelId } = e.data;
      post({ type: 'progress', id, phase: 'loading' });
      await ensureSession(modelId);

      post({ type: 'progress', id, phase: 'running' });
      const model = getModel(modelId);
      const feeds = { [session.inputNames[0]]: preprocess(bitmap, model) };
      const out = await session.run(feeds);

      const tensor = out[session.outputNames[0]];
      const dims = tensor.dims;
      const mh = dims[dims.length - 2];
      const mw = dims[dims.length - 1];

      post({ type: 'progress', id, phase: 'compositing' });
      const maskU8 = maskToU8(Float32Array.from(tensor.data));
      const result = compositeFullRes(bitmap, maskU8, mw, mh);

      post({ type: 'result', id, ...result }, [result.rgba.buffer]);
      bitmap.close?.();
    }
  } catch (err) {
    // Lo stack va in console, non all'utente.
    console.error(err);
    post({ type: 'error', id, message: String(err?.message || err) });
  }
};
```

- [ ] **Step 2: Scrivi il client**

```js
// src/engine/client.js

/**
 * API a promesse verso il worker. Il chiamante non sa che esiste un worker,
 * e non deve saperlo.
 */
export function createEngine() {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  let seq = 0;

  worker.onmessage = (e) => {
    const { type, id } = e.data;
    const entry = pending.get(id);
    if (!entry) return;
    if (type === 'progress') return entry.onProgress?.(e.data.phase);
    pending.delete(id);
    if (type === 'error') entry.reject(new Error(e.data.message));
    else entry.resolve(e.data);
  };

  const send = (msg, transfer, onProgress) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject, onProgress });
      worker.postMessage({ ...msg, id }, transfer || []);
    });

  return {
    init: (tier) => send({ type: 'init', tier }),
    cutout: (bitmap, modelId, onProgress) =>
      send({ type: 'cutout', bitmap, modelId }, [bitmap], onProgress),
    dispose: () => worker.terminate(),
  };
}
```

- [ ] **Step 3: Scarica i modelli in public/models**

```bash
mkdir -p public/models
cp ~/.rembg/models/u2net/u2net.onnx public/models/u2net.onnx
cp ~/.rembg/models/isnet-general-use/isnet-general-use.onnx public/models/isnet-general-use.onnx
cp ~/.rembg/models/isnet-anime/isnet-anime.onnx public/models/isnet-anime.onnx
ls -la public/models
```

- [ ] **Step 4: Verifica nel browser**

Avvia con `npm run dev`, apri l'app, e in console:

```js
const { createEngine } = await import('/src/engine/client.js');
const e = createEngine();
await e.init('accelerato');
const bmp = await createImageBitmap(await (await fetch('/models/../test.jpg')).blob());
const t = performance.now();
const r = await e.cutout(bmp, 'isnet-general-use', console.log);
console.log(r.width, r.height, ((performance.now()-t)/1000).toFixed(2)+'s');
```

Expected: dimensioni identiche alla sorgente, tempo intorno ai 2 secondi, nessun blocco del tab.

- [ ] **Step 5: Commit**

```bash
git add src/engine/worker.js src/engine/client.js
git commit -m "feat(engine): worker ONNX e client a promesse"
```

---

### Task 7: L'avviso onesto e l'attesa spiegata

Il pezzo di usabilità che lo spec chiama non negoziabile. Un utente in modalità lenta deve saperlo, e chi aspetta un download da 170 MB deve sapere perché.

**Files:**
- Create: `src/components/EngineBanner.jsx`
- Modify: `src/i18n/it.json`, `src/i18n/en.json`, `src/styles.css`

**Interfaces:**
- Consumes: `t` da `src/i18n/index.js`
- Produces: `<EngineBanner tier progress phase onDismiss />`

- [ ] **Step 1: Scrivi il componente**

```jsx
// src/components/EngineBanner.jsx
import { t } from '../i18n/index.js';

/**
 * Tre stati, tutti in parole normali:
 * - download in corso  → spiega che succede una volta sola
 * - modalità lenta     → dice cosa manca e cosa cambierebbe
 * - al lavoro          → dice cosa sta facendo, non "loading"
 */
export default function EngineBanner({ tier, phase, progress, onDismiss }) {
  if (phase === 'downloading') {
    return (
      <div className="banner">
        <strong>{t('engine.download.title')}</strong>
        <p>{t('engine.download.body')}</p>
        <div className="bar" role="progressbar" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>{t('engine.download.progress', { pct: Math.round(progress) })}</small>
      </div>
    );
  }

  if (tier === 'compatibilita') {
    return (
      <div className="banner warn">
        <strong>{t('engine.slow.title')}</strong>
        <p>{t('engine.slow.body')}</p>
        <button className="btn ghost small" onClick={onDismiss}>
          {t('engine.slow.action')}
        </button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Aggiungi lo stile**

In fondo a `src/styles.css`:

```css
/* ─── banner del motore ─────────────────────────────────────────────────── */

.banner {
  padding: 12px 14px;
  border: 1px solid var(--linea-viva);
  border-left: 3px solid var(--oro);
  background: var(--nero-2);
}

.banner strong {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--panna);
}

.banner p {
  margin: 0 0 8px;
  max-width: 62ch;
  font-size: 11px;
  line-height: 1.7;
  color: var(--grigio);
}

.banner .bar {
  height: 2px;
  background: var(--linea);
  overflow: hidden;
}

.banner .bar span {
  display: block;
  height: 100%;
  background: var(--oro);
  transition: width 0.25s ease;
}

.banner small {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  color: var(--grigio-scuro);
}
```

- [ ] **Step 3: Verifica nel browser**

Forza il livello lento da console (`localStorage.setItem('jayl.forceTier','compatibilita')`, poi ricarica una volta agganciato in Task 8) e controlla che il banner appaia, sia leggibile e che il bottone lo chiuda.

- [ ] **Step 4: Commit**

```bash
git add src/components/EngineBanner.jsx src/styles.css src/i18n
git commit -m "feat(ui): avviso onesto sul livello del motore e attesa spiegata"
```

---

### Task 8: Aggancio all'interfaccia

Il flusso completo: trascini, premi un bottone, ottieni il ritaglio — senza server.

**Files:**
- Modify: `src/App.jsx`
- Create: `src/hooks/useEngine.js`

**Interfaces:**
- Consumes: `createEngine`, `detectWebGpu`, `pickTier`, `defaultModelFor`, `t`
- Produces: `useEngine() -> { tier, ready, phase, cutout(file) -> Blob, error }`

- [ ] **Step 1: Scrivi l'hook**

```js
// src/hooks/useEngine.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { createEngine } from '../engine/client.js';
import { detectWebGpu, pickTier, defaultModelFor } from '../engine/capabilities.js';

export function useEngine() {
  const engineRef = useRef(null);
  const [tier, setTier] = useState(null);
  const [phase, setPhase] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const forced = localStorage.getItem('jayl.forceTier');
      const has = forced ? forced === 'accelerato' : await detectWebGpu(navigator.gpu);
      const chosen = pickTier(has);
      if (!alive) return;
      const engine = createEngine();
      await engine.init(chosen);
      engineRef.current = engine;
      setTier(chosen);
    })();
    return () => {
      alive = false;
      engineRef.current?.dispose();
    };
  }, []);

  const cutout = useCallback(
    async (file) => {
      setError(null);
      const engine = engineRef.current;
      if (!engine) throw new Error('not-ready');
      const bitmap = await createImageBitmap(file);
      const modelId = defaultModelFor(tier).id;
      const { rgba, width, height } = await engine.cutout(bitmap, modelId, setPhase);
      setPhase(null);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
      return new Promise((res) => canvas.toBlob(res, 'image/png'));
    },
    [tier],
  );

  return { tier, phase, error, setError, cutout, ready: Boolean(tier) };
}
```

- [ ] **Step 2: Aggancia in App.jsx**

In cima, accanto agli altri import:

```js
import { useEngine } from './hooks/useEngine.js';
import EngineBanner from './components/EngineBanner.jsx';
import { t, setLang, detectLang } from './i18n/index.js';
```

Dentro `App`, subito dopo gli altri `useState`:

```js
  const engine = useEngine();
  const [bannerOpen, setBannerOpen] = useState(true);
  useEffect(() => { setLang(detectLang(navigator.languages)); }, []);
```

Sostituisci il corpo di `run('remove')` con il percorso browser, tenendo il server solo come riserva:

```js
      if (kind === 'remove') {
        setBusy(t('engine.working'));
        setBusyNote(null);
        const blob = await engine.cutout(file);
        setResult({ url: own(blob), blob, kind: 'png', meta: { strategy: 'browser' } });
      } else {
```

E nello `stage`, sopra a `{error && …}`:

```jsx
          {bannerOpen && engine.ready && (
            <EngineBanner
              tier={engine.tier}
              phase={engine.phase}
              progress={0}
              onDismiss={() => setBannerOpen(false)}
            />
          )}
```

- [ ] **Step 3: Verifica nel browser**

`npm run dev`, trascina un'immagine, premi Scontorna. Controlla: il ritaglio appare, le dimensioni in uscita sono quelle della sorgente, il tab non si blocca, e in rete **non compare nessuna chiamata a `/api/remove-bg`**.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEngine.js src/App.jsx
git commit -m "feat(ui): lo scontorno passa dal motore nel browser"
```

---

### Task 9: Test di parità contro il backend

La rete di sicurezza: abbiamo già un backend che dà la risposta giusta, e va usato come riferimento.

**Files:**
- Create: `test/parity.test.js`

**Interfaces:**
- Consumes: `buildServer` da `server/index.js`, `getModel` da `src/engine/models.js`

- [ ] **Step 1: Scrivi il test**

```js
// test/parity.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { MODELS } from '../src/engine/models.js';
import { MODELS as SERVER_MODELS } from '../server/jobs/removeBg.js';

test('i modelli del browser esistono anche lato server', () => {
  // Se divergono, il test di parità confronta cose diverse e non protegge nulla.
  const serverIds = SERVER_MODELS.map((m) => m.id);
  for (const m of MODELS) {
    assert.ok(serverIds.includes(m.id), `${m.id} non esiste lato server`);
  }
});

test('nessun modello vietato è raggiungibile dal server', () => {
  const ids = SERVER_MODELS.map((m) => m.id);
  assert.equal(ids.includes('bria-rmbg'), false);
  assert.equal(ids.includes('u2net_portrait'), false);
});

test('la soglia di parità è dichiarata e verificabile', async () => {
  // IoU >= 0.98 e differenza alfa media <= 2/255 (spec, sezione 9).
  // Qui verifichiamo la funzione di confronto, non il browser: il confronto
  // vero si esegue a mano con due file, ma la metrica dev'essere codice.
  const { compareAlpha } = await import('../test/helpers/compareAlpha.js');
  const a = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  const r = await compareAlpha(a, a);
  assert.equal(r.iou, 1);
  assert.equal(r.meanDiff, 0);
  assert.ok(r.pass);
});
```

- [ ] **Step 2: Scrivi l'aiutante di confronto**

```js
// test/helpers/compareAlpha.js
import sharp from 'sharp';

const IOU_MIN = 0.98;
const MEAN_DIFF_MAX = 2;

/** Confronta due PNG sul solo canale alfa. Numeri, non impressioni. */
export async function compareAlpha(bufA, bufB) {
  const [a, b] = await Promise.all(
    [bufA, bufB].map((buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })),
  );
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    throw new Error('Dimensioni diverse: non confrontabili');
  }
  const n = a.info.width * a.info.height;
  let inter = 0;
  let union = 0;
  let diff = 0;
  for (let i = 0; i < n; i++) {
    const av = a.data[i * a.info.channels + 3];
    const bv = b.data[i * b.info.channels + 3];
    diff += Math.abs(av - bv);
    const ao = av > 127;
    const bo = bv > 127;
    if (ao && bo) inter++;
    if (ao || bo) union++;
  }
  const iou = union === 0 ? 1 : inter / union;
  const meanDiff = diff / n;
  return { iou, meanDiff, pass: iou >= IOU_MIN && meanDiff <= MEAN_DIFF_MAX };
}
```

- [ ] **Step 3: Esegui e verifica**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add test/parity.test.js test/helpers/compareAlpha.js
git commit -m "test: parità browser/server con soglie numeriche dichiarate"
```

---

## Self-review

**Copertura dello spec:**

| requisito | task |
|---|---|
| rilevamento capacità e due livelli | 4, 8 |
| avviso onesto in modalità lenta | 7 |
| Web Worker obbligatorio | 6 |
| normalizzazione per modello | 1, 6 |
| maschera su pixel originali | 2, 6 |
| vincolo licenze applicato dai test | 1, 9 |
| IT/EN dall'inizio | 3 |
| testo d'aiuto per ogni controllo | 3 (test), 7 |
| soglie di parità numeriche | 9 |

**Non coperto in questo piano, rimandato al piano successivo:**
- vettorializzazione WASM (richiede la misura fra i due candidati)
- quantizzazione dei modelli a fp16
- libreria, cartelle, moodboard (blocco 2)
- operazioni in blocco

**Coerenza dei nomi:** `tier` usa sempre `'accelerato' | 'compatibilita'`; `getModel` solleva; `cutout` restituisce `{rgba, width, height}` dal worker e `Blob` dall'hook.
