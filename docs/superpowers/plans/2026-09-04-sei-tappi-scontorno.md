# I sei tappi allo scontorno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lo scontorno dello studio diventa veloce e capace quanto quello della home — senza toccare la home.

**Architecture:** La decisione «istantaneo o modello?» vive oggi solo in `src/landing/`. Si sposta in `src/engine/`, dove i test la vedono e dove tutt'e due le entrate possono importarla. Da lì discendono cinque correzioni che erano bloccate da quella separazione: l'errore può finalmente dire *chi* ha sbagliato (perché i pixel si leggono prima del modello), e i tre difetti di cablaggio React — il righello, lo «scarica», i blob URL — si chiudono con test che leggono i sorgenti, come già fa `test/sovrapposizioni.test.js`.

**Tech Stack:** React 19 (nessun router), Vite 6 a due entrate, ONNX Runtime in un Web Worker, `fflate` per gli zip. Test: `node --test` (runner nativo di Node), **non** vitest.

**Spec:** [docs/superpowers/specs/2026-09-04-impianto-unico-design.md](../specs/2026-09-04-impianto-unico-design.md) — pezzo 1, § 4.

---

## Global Constraints

Valgono per **ogni** task. Sono le regole del progetto, copiate dalla spec e da `RIPRENDI-QUI.md`.

- **`npm test && npm run build` verdi prima di ogni commit.** Sono due comandi, e passano tutt'e due.
- **`npm test` richiede `JAYL_CRAFT_LIBRARY`** — è già dentro lo script in `package.json`, si lancia `npm test` e basta.
- **`git add <percorsi>`, mai `git add -A`.** `git commit` committa **tutto l'indice**: è successo quattro volte in due giorni.
- **Un commit per decisione**, col *perché* nel corpo, non solo il *cosa*.
- **Interfaccia bilingue:** ogni chiave nuova va in `src/i18n/it.json` **e** `src/i18n/en.json`. `test/i18n.test.js` fallisce se una chiave esiste in una lingua sola.
- **«asset», mai «lavoro/work/piece»** nelle stringhe dell'interfaccia: `test/i18n.test.js` le bandisce. Eccezioni ammesse: «piano di lavoro» e «work surface».
- **I commenti dicono il perché, non il cosa.** I test hanno nomi in italiano che dicono la regola.
- **Si misura, non si suppone.** Ogni numero scritto nel codice o in un commit viene da una misura, con la data.
- **`--fondo` e `--inchiostro` portano il nome del RUOLO**, non del colore. Chi cambia il fondo si prende anche l'inchiostro.
- **La home non cambia comportamento in nessuno dei sei task.** Le cambia solo una riga di `import` (Task 1). Se un test della home diventa rosso, il task è sbagliato.
- Palette JAYL: nero `#111111`, panna `#F5F0E8`, oro `#C4A35A`.

---

## File Structure

| file | responsabilità | task |
|---|---|---|
| **Create** `src/engine/ritaglio.js` | La decisione «istantaneo o modello?» e i pixel. Spostato da `src/landing/`, contenuto invariato salvo un import. | 1 |
| **Delete** `src/landing/ritaglio.js` | — (diventa il file sopra) | 1 |
| **Modify** `src/landing/Ritaglio.jsx:2` | Solo il percorso dell'import. | 1 |
| **Modify** `test/ritaglio.test.js:3` | Solo il percorso dell'import. | 1 |
| **Create** `test/scontornoCondiviso.test.js` | Che l'app e la home usino lo **stesso** modulo, e che il pennello si rimonti. Test strutturali sui sorgenti. | 2, 4 |
| **Modify** `src/App.jsx` `run()` | Prova il fondo piatto prima del modello; distingue il file illeggibile. | 2, 3 |
| **Modify** `src/i18n/it.json`, `src/i18n/en.json` | `engine.error.body` non accusa più il file; nasce `engine.unreadable`; le pastiglie dei fattori hanno le loro spiegazioni. | 3, 5 |
| **Modify** `test/i18n.test.js` | Due test nuovi sui messaggi d'errore. | 3 |
| **Modify** `src/App.jsx:1336` | `key={modoPennello}` sul `MaskBrush`. | 4 |
| **Modify** `src/engine/ricette.js` | `commutaFattore`, il gemello di `commutaPasso` per i fattori. | 5 |
| **Modify** `test/ricette.test.js` | I cinque test di `commutaFattore`. | 5 |
| **Modify** `src/components/Scontorna.jsx` | Le quattro pastiglie ×4 ×2 :2 :4 nel punto oro. | 5 |
| **Modify** `src/styles.css` | `.sc-fattori`. | 5 |
| **Modify** `src/store/bundle.js` | `bundleBlobs`: uno zip di ciò che sta sul piano, senza passare dalla libreria. | 6 |
| **Create** `test/bundleBlobs.test.js` | Che lo zip contenga i file giusti e non ne perda per nome uguale. | 6 |
| **Modify** `src/App.jsx` `scaricaIlPiano` | Lo «scarica» scarica il piano, non `bundleAll()`. | 6 |
| **Modify** `src/App.jsx`, `src/components/BatchPanel.jsx`, `src/components/FilmLab.jsx` | I blob URL escono dal render. | 7 |
| **Create** `test/blobUrl.test.js` | Che nessun URL di blob nasca dentro il JSX. | 7 |

---

## Task 1: `engine/ritaglio.js` — il modulo condiviso

Uno spostamento puro, senza cambio di comportamento. Sta da solo perché tocca la home: se qualcosa si rompe, si vuole vedere in un commit che non fa nient'altro.

**Files:**
- Create: `src/engine/ritaglio.js` (da `src/landing/ritaglio.js`, via `git mv`)
- Delete: `src/landing/ritaglio.js`
- Modify: `src/landing/Ritaglio.jsx:2`
- Modify: `test/ritaglio.test.js:3`

**Interfaces:**
- Consumes: niente (primo task)
- Produces: `src/engine/ritaglio.js` esporta, invariati:
  - `UNIFORMITA_MIN: number` (0.9)
  - `MAX_FILE: number` (3)
  - `pixelDaFile(file: File|Blob) => Promise<{rgba: Uint8ClampedArray, w: number, h: number}>`
  - `ritaglioIstantaneo({rgba, w, h}) => {alpha: Uint8ClampedArray, uniformita: number, isole: number} | null`
  - `applicaAlfa({rgba, w, h}, alpha: Uint8ClampedArray) => ImageData`
  - `aPng(imageData: ImageData) => Promise<Blob>`
  - `scaricaModello(url, onProgress, signal) => Promise<void>`
  - `mb(bytes: number) => string`

- [ ] **Step 1: Verificare che gli importatori siano solo due**

```bash
grep -rn "landing/ritaglio\|from './ritaglio.js'" src/ test/ scripts/ server/
```

Atteso — esattamente queste due righe, nient'altro:
```
src/landing/Ritaglio.jsx:2:import { MAX_FILE, aPng, applicaAlfa, mb, pixelDaFile, ritaglioIstantaneo, scaricaModello } from './ritaglio.js';
test/ritaglio.test.js:3:import { ritaglioIstantaneo, UNIFORMITA_MIN, MAX_FILE } from '../src/landing/ritaglio.js';
```

Se ne compare una terza, **fermarsi e dirlo**: il piano l'ha mancata e va aggiornata anche quella.

- [ ] **Step 2: Spostare il file**

```bash
git mv src/landing/ritaglio.js src/engine/ritaglio.js
```

- [ ] **Step 3: Correggere l'import interno del file spostato**

In `src/engine/ritaglio.js`, riga 10. Da:

```js
import { alphaDaFondoPiatto } from '../engine/keying.js';
```

a:

```js
import { alphaDaFondoPiatto } from './keying.js';
```

- [ ] **Step 4: Aggiornare la testata del file spostato**

Il commento in cima dice ancora «lo strumento gratuito della home». Non è più vero: da qui in poi lo usano tutt'e due. Sostituire il blocco di apertura (righe 1-8) con:

```js
/**
 * Il ritaglio **senza modello**, e la decisione se basta.
 *
 * Sta in `engine/` e non accanto a un componente per la ragione di sempre: è
 * la parte capace di sbagliare in silenzio — un alfa premoltiplicato, un
 * modello scaricato a metà, una misura che non torna — e va dove i test la
 * vedono, in Node.
 *
 * **Lo usano tutt'e due le entrate.** È nato per la home il 2026-08-27 ed è
 * rimasto lì fino al 2026-09-04: nel frattempo lo studio scendeva ai 175 MB
 * del modello anche per un fondo piatto che qui costa venti millisecondi.
 * Un pezzo di prodotto in una cartella sola diventa un pezzo di prodotto per
 * metà utenti.
 *
 * `MAX_FILE`, `scaricaModello` e `mb` viaggiano con lui: sono della home, ma
 * spezzare il file in due per tre esportazioni costerebbe più di quanto rende.
 */
```

- [ ] **Step 5: Aggiornare i due importatori**

In `src/landing/Ritaglio.jsx`, riga 2:

```js
import { MAX_FILE, aPng, applicaAlfa, mb, pixelDaFile, ritaglioIstantaneo, scaricaModello } from '../engine/ritaglio.js';
```

In `test/ritaglio.test.js`, riga 3:

```js
import { ritaglioIstantaneo, UNIFORMITA_MIN, MAX_FILE } from '../src/engine/ritaglio.js';
```

- [ ] **Step 6: Far girare i test — devono restare verdi, tutti**

```bash
npm test
```

Atteso: PASS. Nessun test nuovo, nessuno rotto. Se `test/ritaglio.test.js` non trova il modulo, lo Step 5 è incompleto.

- [ ] **Step 7: Costruire — la home deve compilare col percorso nuovo**

```bash
npm run build
```

Atteso: build completata. Un `Rollup failed to resolve import` qui vuol dire che `Ritaglio.jsx` punta ancora a `./ritaglio.js`.

- [ ] **Step 8: Commit**

```bash
git add src/engine/ritaglio.js src/landing/Ritaglio.jsx test/ritaglio.test.js
git commit -m "$(cat <<'EOF'
refactor: il ritaglio senza modello esce dalla home ed entra nel motore

Era in `src/landing/`, quindi lo vedeva solo la home. Lo studio non lo ha mai
importato: ogni scontorno nell'app scendeva ai 175 MB del modello, anche un
fondo piatto che qui costa venti millisecondi.

Spostamento puro: nessun comportamento cambia, cambiano tre righe di import.
Il file usa ancora la soglia misurata il 2026-08-27 (UNIFORMITA_MIN = 0.9).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: L'app prova senza modello

**Files:**
- Create: `test/scontornoCondiviso.test.js`
- Modify: `src/App.jsx` — l'import in cima, `STRATEGIE` a riga 71, il ramo `kind === 'remove'` di `run()` (righe 438-465)

**Interfaces:**
- Consumes: da Task 1 — `pixelDaFile`, `ritaglioIstantaneo`, `applicaAlfa`, `aPng` da `src/engine/ritaglio.js`
- Produces:
  - `result.meta.strategy` può ora valere `'istantaneo'` oltre a `'browser'`
  - un errore con `e.code === 'file-illeggibile'` quando i pixel non si leggono — **Task 3 lo intercetta**

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `test/scontornoCondiviso.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * L'app e la home devono decidere allo STESSO MODO se serve il modello.
 *
 * Il difetto che questo test impedisce di ripetere (2026-09-04): il contratto
 * UX §5 dichiarava «la home e lo strumento nell'app sono lo stesso
 * componente», e non lo erano. `ritaglio.js` viveva in `src/landing/`, quindi
 * la scorciatoia da venti millisecondi esisteva solo per chi arrivava dalla
 * home. Nello studio ogni scontorno scendeva ai 175 MB del modello — e il
 * committente lo ha riferito come «l'app e' lenta», che e' il sintomo giusto
 * di una causa che nessun test guardava.
 *
 * Si legge il sorgente perche' il difetto NON e' in una funzione: e' in chi la
 * chiama. Stessa ragione, e stesso metodo, di `test/sovrapposizioni.test.js`.
 */
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const HOME = readFileSync(new URL('../src/landing/Ritaglio.jsx', import.meta.url), 'utf8');

test('lo studio importa il ritaglio senza modello dal motore', () => {
  assert.match(
    APP,
    /import\s*\{[^}]*\britaglioIstantaneo\b[^}]*\}\s*from\s*'\.\/engine\/ritaglio\.js'/,
    "App.jsx non importa `ritaglioIstantaneo`: lo scontorno dell'app scende sempre al modello",
  );
  assert.match(
    APP,
    /import\s*\{[^}]*\bpixelDaFile\b[^}]*\}\s*from\s*'\.\/engine\/ritaglio\.js'/,
    'App.jsx non legge i pixel prima di chiamare il modello',
  );
});

test('la home importa lo stesso modulo, dallo stesso posto', () => {
  assert.match(
    HOME,
    /from\s*'\.\.\/engine\/ritaglio\.js'/,
    'la home ha una sua copia della decisione: e’ il difetto di partenza',
  );
});

test('nessuno importa piu’ il modulo dalla vecchia cartella', () => {
  for (const [nome, sorgente] of [['App.jsx', APP], ['Ritaglio.jsx', HOME]]) {
    assert.doesNotMatch(
      sorgente,
      /landing\/ritaglio\.js/,
      `${nome} punta ancora a src/landing/ritaglio.js, che non esiste piu’`,
    );
  }
});

test('lo studio prova il fondo piatto PRIMA di svegliare il modello', () => {
  // L'ordine e' il punto: chiamare `ritaglioIstantaneo` dopo `engine.cutout`
  // farebbe passare i due test qui sopra senza far guadagnare un millisecondo.
  const iIstante = APP.indexOf('ritaglioIstantaneo(');
  const iModello = APP.indexOf('engine.cutout(');
  assert.notEqual(iIstante, -1, '`ritaglioIstantaneo` non viene mai chiamato in App.jsx');
  assert.notEqual(iModello, -1, '`engine.cutout` non viene mai chiamato in App.jsx');
  assert.ok(
    iIstante < iModello,
    'il modello viene chiamato prima della prova senza modello: la scorciatoia non serve a niente',
  );
});
```

- [ ] **Step 2: Far girare il test — deve fallire**

```bash
npm test 2>&1 | grep -A 4 "scontornoCondiviso\|lo studio importa"
```

Atteso: FAIL su «lo studio importa il ritaglio senza modello dal motore» — `App.jsx` non importa ancora niente da `engine/ritaglio.js`.

- [ ] **Step 3: Aggiungere l'import in `src/App.jsx`**

Accanto agli altri import di `./engine/`, in cima al file:

```js
import { aPng, applicaAlfa, pixelDaFile, ritaglioIstantaneo } from './engine/ritaglio.js';
```

- [ ] **Step 4: Dare un nome alla strategia nuova**

`src/App.jsx` riga 71. Da:

```js
const STRATEGIE = { mask: 'maschera', crop: 'ritaglio', upscale: 'ingrandimento', browser: 'diretta' };
```

a:

```js
const STRATEGIE = {
  mask: 'maschera',
  crop: 'ritaglio',
  upscale: 'ingrandimento',
  browser: 'diretta',
  // Il fondo era piatto: nessun modello, nessuno scaricamento, ~20 ms. Va
  // detto nel pannello del risultato, perche' spiega da solo perche' quella
  // volta non c'e' stata attesa.
  istantaneo: 'senza modello',
};
```

- [ ] **Step 5: Riscrivere il ramo `remove` di `run()`**

In `src/App.jsx`, sostituire **tutto** il blocco `if (kind === 'remove') { … }` (oggi righe 438-465) con:

```js
      if (kind === 'remove') {
        // Gira nel browser: nessuna chiamata di rete, nessun costo per noi.
        setBusy(t('engine.working'));
        setBusyNote(null);
        const started = Date.now();
        // Sul lavoro in corso, non sull'originale: chi ha appena ingrandito e
        // preme Scontorna si vedeva tornare il file piccolo, con
        // l'ingrandimento buttato via senza un avviso.
        const sorgente = result?.blob || file;

        /*
         * I pixel PRIMA del modello, e sono due cose in una.
         *
         * 1. Venti millisecondi per sapere se il modello servira'. Si paga
         *    qui, una volta, invece di far scendere 175 MB anche a un fondo
         *    piatto. E' esattamente cio' che la home fa dal 2026-08-27 e che
         *    lo studio non ha mai fatto.
         * 2. Da qui in poi sappiamo CHI ha sbagliato. Se il file non si
         *    decodifica, il colpevole e' il file; se si decodifica e poi il
         *    modello cade, il colpevole e' lo strumento — e non si manda
         *    l'utente a rifare un file che stava bene.
         */
        let src;
        try {
          src = await pixelDaFile(sorgente);
        } catch (e) {
          console.error(e);
          throw Object.assign(e, { code: 'file-illeggibile' });
        }

        const istante = ritaglioIstantaneo(src);
        const blob = istante
          ? await aPng(applicaAlfa(src, istante.alpha))
          : await engine.cutout(sorgente, s.model);

        pushResult({
          url: own(blob),
          blob,
          kind: 'png',
          // Lo scontorno non ricampiona: entra e esce alla stessa misura. Dirlo
          // serve a chi sta controllando di non aver perso risoluzione per strada.
          meta: {
            strategy: istante ? 'istantaneo' : 'browser',
            // Senza modello non c'e' un modello da nominare, e scrivere
            // `u2net` accanto a un ritaglio che non l'ha usato sarebbe una
            // riga falsa nel pannello del risultato.
            model: istante ? null : s.model,
            uniformita: istante ? istante.uniformita : null,
            source: stats?.image,
            output: stats?.image,
            ms: Date.now() - started,
          },
        });
        await library.save(blob, {
          name: `${file.name.replace(/\.[^.]+$/, '')}-scontornato`,
          kind: 'png',
          meta: {
            fromId: sourceAssetId,
            op: 'remove-bg',
            model: istante ? null : s.model,
            via: istante ? 'istantaneo' : 'modello',
          },
        });
      } else {
```

- [ ] **Step 6: Far girare i test — devono passare**

```bash
npm test
```

Atteso: PASS, compresi i quattro test di `scontornoCondiviso`.

- [ ] **Step 7: Misurare nel browser — è il numero che va nel commit**

La regola del progetto è «si misura, non si suppone», e questo task esiste per un numero.

1. Avviare il server di sviluppo con lo strumento del riquadro (**mai** `npm run dev` in Bash).
2. **Prima di qualunque misura**, portare la finestra a una misura vera e controllare che `innerWidth` non sia 0 — col riquadro nascosto l'intera pagina collassa e ogni numero preso da lì è finto.
3. Aprire `/app/`, portare sul piano un file **a fondo piatto** (`public/test.jpg` va bene se il suo fondo è uniforme; altrimenti uno sticker), premere il tasto Zack.
4. Leggere `tempo` nel pannello del risultato — è `result.meta.ms`, già stampato da `MetaBlock`.
5. Ripetere lo stesso file su `/` (la home).
6. Controllare che `strategia` dica **«senza modello»**. Se dice «diretta», il fondo non era abbastanza piatto: prendere un file più netto, o il numero non misura ciò che deve.

Annotare i due numeri: servono al corpo del commit.

- [ ] **Step 8: Costruire**

```bash
npm run build
```

- [ ] **Step 9: Commit**

Sostituire `APP_MS` e `HOME_MS` coi numeri misurati allo Step 7. **Non inventarli.**

```bash
git add src/App.jsx test/scontornoCondiviso.test.js
git commit -m "$(cat <<'EOF'
fix: nell'app il fondo piatto non sveglia piu' il modello da 175 MB

Il committente: «in home lo scontorno fila liscio, sull'app dura troppo,
persino lo scontorno rapido che su home ci mette mezzo secondo». Aveva
ragione, e la causa non era la lentezza dell'app: era che `ritaglioIstantaneo`
non veniva mai chiamato fuori dalla home.

Ora `run('remove')` legge i pixel, prova il fondo piatto, e scende al modello
solo se la prova dice di no — la stessa sequenza della home dal 2026-08-27.

Misurato oggi sullo stesso file a fondo piatto:
  app  prima APP_MS ms  →  ora quanto la home
  home              HOME_MS ms

E leggere i pixel per primo da in regalo la diagnosi che serve al prossimo
commit: se il file non si decodifica il colpevole e' il file, se si decodifica
e poi cade il modello il colpevole e' lo strumento. Da qui esce il codice
`file-illeggibile`.

Il test legge i sorgenti perche' il difetto non era in una funzione, era in chi
la chiamava: nessun test unitario avrebbe potuto vederlo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: L'errore dice chi ha sbagliato

**Files:**
- Modify: `src/i18n/it.json`, `src/i18n/en.json` — `engine.error.body`, e il nuovo `engine.unreadable`
- Modify: `test/i18n.test.js` — due test in fondo
- Modify: `src/App.jsx:484` — il `catch` di `run()`

**Interfaces:**
- Consumes: da Task 2 — l'errore con `e.code === 'file-illeggibile'`
- Produces: chiavi `engine.unreadable.title` e `engine.unreadable.body` in tutt'e due le lingue

- [ ] **Step 1: Scrivere i test che falliscono**

In fondo a `test/i18n.test.js`:

```js
test("l’errore del motore non accusa il file dell’utente", () => {
  /*
   * Il difetto (2026-09-04): `engine.error.body` diceva «il file potrebbe
   * essere rovinato» per QUALUNQUE eccezione del motore, e la causa vera era
   * che l'app scendeva sempre al modello (vedi Task 2). Un messaggio che
   * accusa il materiale di chi lavora, quando il colpevole e' lo strumento,
   * e' peggio di nessun messaggio: manda a rifare un file che stava bene.
   *
   * Ora l'accusa esiste ancora, ma solo in `engine.unreadable`, che si dice
   * unicamente quando i pixel NON si sono decodificati — cioe' quando e'
   * vera.
   */
  for (const [lang, dict] of [
    ['it', it],
    ['en', en],
  ]) {
    const body = dict.engine.error.body.toLowerCase();
    for (const parola of ['rovinat', 'danneggiat', 'damaged', 'corrupt']) {
      assert.ok(
        !body.includes(parola),
        `${lang}.engine.error.body accusa il file con «${parola}», e non puo' saperlo`,
      );
    }
  }
});

test('esiste un messaggio per il file che davvero non si apre', () => {
  for (const [lang, dict] of [
    ['it', it],
    ['en', en],
  ]) {
    assert.ok(dict.engine.unreadable?.title?.trim(), `manca ${lang}.engine.unreadable.title`);
    assert.ok(dict.engine.unreadable?.body?.trim(), `manca ${lang}.engine.unreadable.body`);
  }
});
```

- [ ] **Step 2: Far girare i test — devono fallire**

```bash
npm test 2>&1 | grep -B 2 -A 6 "accusa il file\|davvero non si apre"
```

Atteso: FAIL su tutt'e due — `it.engine.error.body` contiene «rovinato», e `engine.unreadable` non esiste.

- [ ] **Step 3: Correggere `src/i18n/it.json`**

Sostituire il blocco `"error"` dentro `"engine"` (righe 109-112) con:

```json
    "error": {
      "title": "Non sono riuscito a portare a termine",
      "body": "Lo strumento non ce l'ha fatta. Riprova; se succede ancora, cambia modello nel punto oro o prova con un'immagine più piccola."
    },
    "unreadable": {
      "title": "Non riesco ad aprire questo file",
      "body": "Il browser non lo legge come immagine: potrebbe essere incompleto, oppure non essere un'immagine."
    },
```

- [ ] **Step 4: Correggere `src/i18n/en.json`**

Stesse chiavi, stesso posto dentro `"engine"`:

```json
    "error": {
      "title": "I couldn't finish",
      "body": "The tool didn't make it. Try again; if it keeps happening, switch model in the gold dot or try a smaller image."
    },
    "unreadable": {
      "title": "I can't open this file",
      "body": "The browser doesn't read it as an image: it may be incomplete, or not an image at all."
    },
```

- [ ] **Step 5: Usare il messaggio nuovo dove ora si sa**

In `src/App.jsx`, nel `catch` di `run()` (oggi righe 479-486), sostituire il corpo con:

```js
    } catch (e) {
      // Un codice interno non è un messaggio: lo traduciamo in una frase che
      // dice cosa è successo e cosa fare. Lo stack resta in console.
      console.error(e);
      if (e.code === 'trace-empty') setError(`${t('trace.empty.title')} — ${t('trace.empty.body')}`);
      // Questo lo sappiamo per davvero: i pixel non si sono decodificati, e
      // il colpevole e' il file. E' l'unico posto dove si puo' dire.
      else if (e.code === 'file-illeggibile')
        setError(`${t('engine.unreadable.title')} — ${t('engine.unreadable.body')}`);
      else if (e.code) setError(`${t('engine.error.title')} — ${t('engine.error.body')}`);
      else setError(e.message);
    } finally {
```

- [ ] **Step 6: Far girare i test — devono passare**

```bash
npm test
```

Atteso: PASS. In particolare «italiano e inglese hanno esattamente le stesse chiavi» e «nessuna stringa è vuota» devono restare verdi: le quattro chiavi nuove ci sono in tutt'e due le lingue.

- [ ] **Step 7: Costruire**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/i18n/it.json src/i18n/en.json src/App.jsx test/i18n.test.js
git commit -m "$(cat <<'EOF'
fix: l'errore smette di dare la colpa al file di chi lavora

Il committente: «a volte neanche va, dicendo che l'img potrebbe essere rotta».
Era `engine.error.body`, il messaggio generico per QUALUNQUE eccezione del
motore — e la causa vera era che l'app scendeva sempre al modello, che a volte
non ce la fa per memoria o per WebGPU.

Un messaggio che accusa il materiale di chi lavora, quando il colpevole e' lo
strumento, e' peggio di nessun messaggio: manda a rifare un file che stava
bene.

Ora sono due messaggi. `engine.unreadable` dice «non riesco ad aprire questo
file» e si dice SOLO quando i pixel non si sono decodificati davvero — lo
sappiamo perche' dal commit precedente li leggiamo prima di chiamare il
modello. `engine.error` dice che lo strumento non ce l'ha fatta, e suggerisce
cosa provare.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Il righello si accende

**Files:**
- Modify: `test/scontornoCondiviso.test.js` — un test in fondo
- Modify: `src/App.jsx:1336` — la riga `<MaskBrush`

**Interfaces:**
- Consumes: niente da altri task
- Produces: niente per altri task

- [ ] **Step 1: Scrivere il test che fallisce**

In fondo a `test/scontornoCondiviso.test.js`:

```js
test('il pennello si rimonta quando cambia strumento', () => {
  /*
   * Il difetto (2026-09-04, riferito dal committente come «il righello non
   * funziona»): `MaskBrush` legge lo strumento d'ingresso con
   * `useState(modoIniziale || 'erase')`, e `useState` guarda il valore SOLO
   * al montaggio. `App.jsx` montava `<MaskBrush>` senza `key`, quindi non lo
   * rimontava mai.
   *
   * Risultato: premere il cerchio del righello mentre il pennello e' gia'
   * aperto ACCENDEVA il cerchio — `aria-pressed` legge `modoPennello` — e non
   * cambiava lo strumento. Un comando che si illumina e non fa niente e' la
   * definizione esatta di «rotto», e la matematica del righello era giusta e
   * testata da dodici test: il ponte non passava.
   *
   * La `key` e' la cura giusta e non un rattoppo: cambiare strumento vuol dire
   * ricominciare il gesto, e lo stato interno del pennello precedente non ha
   * niente da dire al nuovo.
   */
  const i = APP.indexOf('<MaskBrush');
  assert.notEqual(i, -1, '<MaskBrush> non si trova piu’ in App.jsx');
  assert.match(
    APP.slice(i, i + 200),
    /key=\{modoPennello\}/,
    'senza `key={modoPennello}` il pennello resta sullo strumento con cui e’ stato aperto',
  );
});
```

- [ ] **Step 2: Far girare il test — deve fallire**

```bash
npm test 2>&1 | grep -A 6 "il pennello si rimonta"
```

Atteso: FAIL — `key={modoPennello}` non c'è.

- [ ] **Step 3: Mettere la `key`**

In `src/App.jsx`, riga 1337. Da:

```jsx
            <MaskBrush
              source={file}
```

a:

```jsx
            <MaskBrush
              /* Cambiare strumento vuol dire ricominciare il gesto: il
                 pennello si rimonta, e rilegge `modoIniziale`. Senza questa
                 riga premere il righello accendeva il cerchio e lasciava la
                 gomma — `useState` guarda il valore solo al montaggio. */
              key={modoPennello}
              source={file}
```

- [ ] **Step 4: Far girare il test — deve passare**

```bash
npm test
```

Atteso: PASS.

- [ ] **Step 5: Verificare nel browser — `npm test` non vede il canvas**

Con il riquadro già aperto da Task 2 (e `innerWidth` controllato):

1. Aprire `/app/`, portare un'immagine sul piano, premere Zack e aspettare il risultato — i cerchi degli strumenti compaiono solo dopo.
2. Premere **gomma**: il pennello si apre sulla gomma.
3. Senza chiudere, premere **righello**: deve comparire la guida trascinabile, non la gomma.
4. Premere **ripristina**: deve dipingere in ripristino.

Se al punto 3 si continua a cancellare, la `key` non sta dove deve.

- [ ] **Step 6: Costruire**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx test/scontornoCondiviso.test.js
git commit -m "$(cat <<'EOF'
fix: il righello si accende davvero, non solo il suo cerchio

Il committente: «il righello non funziona». La matematica era giusta e coperta
da dodici test in `engine/righello.js`: non passava il ponte.

`MaskBrush` legge lo strumento d'ingresso con `useState(modoIniziale)`, e
`useState` guarda il valore SOLO al montaggio. `App.jsx` montava il pennello
senza `key`, quindi non lo rimontava mai: premere il cerchio del righello
accendeva `aria-pressed` e lasciava la gomma. Un comando che si illumina e non
fa niente e' la definizione esatta di «rotto».

`key={modoPennello}` e' la cura giusta e non un rattoppo: cambiare strumento
vuol dire ricominciare il gesto, e lo stato interno del pennello di prima non
ha niente da dire a quello nuovo.

Il test legge il sorgente perche' il difetto e' nel montaggio, non in una
funzione — stesso metodo di `test/sovrapposizioni.test.js`.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: I fattori nel punto oro

Il vero TDD del piano: la funzione è pura e vive in `engine/`.

**Files:**
- Modify: `src/engine/ricette.js` — `commutaFattore`, dopo `commutaPasso`
- Modify: `test/ricette.test.js` — cinque test
- Modify: `src/i18n/it.json`, `src/i18n/en.json` — `zack.resize` e quattro `zack.stepHelp.ridimensiona:*`
- Modify: `src/components/Scontorna.jsx` — le pastiglie
- Modify: `src/styles.css` — `.sc-fattori`

**Interfaces:**
- Consumes: da `ricette.js`, già esistenti — `FATTORI: {x4:4, x2:2, d2:0.5, d4:0.25}`, `fattoreDi(passo) => number|null`
- Produces: `commutaFattore(ricetta: string[], chiave: string) => string[]`

> **Nota:** l'esecuzione c'è già. `pianoZack` calcola `ridimensiona:*` e `runZack` (`src/App.jsx:812-855`) lo esegue, sia ingrandendo col modello sia rimpicciolendo col canvas. Qui manca **solo** il modo di accenderlo.

- [ ] **Step 1: Scrivere i test che falliscono**

In fondo a `test/ricette.test.js` (aggiungere `commutaFattore` all'import da `../src/engine/ricette.js`):

```js
test('accendere un fattore lo mette nella catena', () => {
  assert.deepEqual(commutaFattore(['scontorna'], 'x4'), ['scontorna', 'ridimensiona:x4']);
});

test('ripremere lo stesso fattore lo spegne', () => {
  assert.deepEqual(commutaFattore(['scontorna', 'ridimensiona:x4'], 'x4'), ['scontorna']);
});

test('un secondo fattore sostituisce il primo, non si somma', () => {
  // Un solo ridimensionamento per catena: e' gia' la regola di `normalizza`.
  // «×4» e «:4» insieme farebbero aspettare mezzo minuto per tornare
  // esattamente da dove si e' partiti.
  assert.deepEqual(commutaFattore(['scontorna', 'ridimensiona:x4'], 'd2'), [
    'scontorna',
    'ridimensiona:d2',
  ]);
});

test('accendere un fattore spegne «ingrandisci»', () => {
  /*
   * Rispondono alla stessa domanda — «quanto grande?» — e `normalizza` fa
   * gia' vincere il fattore. Toglierlo QUI serve all'occhio: se restasse
   * acceso sarebbe una pastiglia premuta che non fa niente. «Il colore non e'
   * mai l'unico segnale» vale anche al contrario — un segnale acceso deve
   * corrispondere a un effetto.
   */
  assert.deepEqual(commutaFattore(['scontorna', 'ingrandisci'], 'x2'), [
    'scontorna',
    'ridimensiona:x2',
  ]);
});

test('un fattore che non esiste non tocca la catena', () => {
  // Una chiave puo' arrivare da un archivio vecchio o scritta a mano: non
  // deve produrre un passo che nessuno sa eseguire.
  assert.deepEqual(commutaFattore(['scontorna'], 'x8'), ['scontorna']);
});
```

- [ ] **Step 2: Far girare i test — devono fallire**

```bash
npm test 2>&1 | grep -A 4 "commutaFattore\|accendere un fattore"
```

Atteso: FAIL con «commutaFattore is not a function» o un errore di import.

- [ ] **Step 3: Scrivere `commutaFattore`**

In `src/engine/ricette.js`, subito dopo `commutaPasso` (dopo la riga 159):

```js
/**
 * Accende o spegne un fattore di ridimensionamento.
 *
 * Il gemello di `commutaPasso` per l'altra meta' della catena. Serve perche'
 * `PASSI` e' una lista **chiusa** e non contiene `ridimensiona:x4`: passare un
 * fattore a `commutaPasso` non lo accenderebbe, lo ignorerebbe in silenzio.
 *
 * Tre regole, e tutt'e tre sono gia' scritte in `normalizza`. Qui vengono
 * applicate un momento prima, perche' `normalizza` corregge la catena quando
 * si esegue, e **l'utente guarda le pastiglie prima**: una pastiglia accesa
 * che poi non produce niente e' una bugia dell'interfaccia.
 *
 * 1. Un fattore solo per catena.
 * 2. Ripremerlo lo spegne.
 * 3. Un fattore e `ingrandisci` non convivono: rispondono alla stessa domanda.
 */
export function commutaFattore(ricetta, chiave) {
  if (!Object.hasOwn(FATTORI, chiave)) return ricetta;
  const passo = `ridimensiona:${chiave}`;
  const senzaFattori = ricetta.filter((p) => fattoreDi(p) === null);
  if (ricetta.includes(passo)) return senzaFattori;
  return [...senzaFattori.filter((p) => p !== 'ingrandisci'), passo];
}
```

- [ ] **Step 4: Far girare i test — devono passare**

```bash
npm test
```

Atteso: PASS, cinque test nuovi verdi.

- [ ] **Step 5: Le stringhe, in tutt'e due le lingue**

`src/i18n/it.json`, dentro `"zack"`: aggiungere `"resize"` accanto a `"what"`, e quattro voci dentro `"stepHelp"`:

```json
    "resize": "Quanto grande",
```

```json
      "ridimensiona:x4": "Quattro volte più grande, col modello. È il passo più lento della catena.",
      "ridimensiona:x2": "Il doppio, col modello. Circa un quarto dell'attesa di ×4.",
      "ridimensiona:d2": "Metà. È una riscrittura di pixel: non costa nessuna attesa.",
      "ridimensiona:d4": "Un quarto. È una riscrittura di pixel: non costa nessuna attesa."
```

`src/i18n/en.json`, stesse posizioni:

```json
    "resize": "How big",
```

```json
      "ridimensiona:x4": "Four times bigger, through the model. It's the slowest step in the chain.",
      "ridimensiona:x2": "Twice as big, through the model. About a quarter of the ×4 wait.",
      "ridimensiona:d2": "Half. It's a pixel rewrite: no waiting at all.",
      "ridimensiona:d4": "A quarter. It's a pixel rewrite: no waiting at all."
```

> Le etichette `zack.step.ridimensiona:*` **esistono già** in tutt'e due le lingue. Mancavano solo le spiegazioni: senza, `t()` restituisce la chiave, e nel `title` sarebbe comparso `zack.stepHelp.ridimensiona:x4`.

- [ ] **Step 6: Le pastiglie in `Scontorna.jsx`**

Cambiare l'import in cima (riga 3):

```js
import { FATTORI, PASSI, commutaFattore, commutaPasso } from '../engine/ricette.js';
```

Aggiungere accanto a `DUE_MODELLI` (dopo riga 26):

```js
/**
 * I simboli dei fattori, gli stessi della home.
 *
 * Il committente il 2026-09-04: «il tasto zack non ha le stesse opzioni della
 * home (x2 X4 ecc)». Erano gia' esposti da `ricette.js` ed eseguiti da
 * `runZack`: mancava solo il modo di accenderli. Restano simboli e non parole
 * perche' sono quattro e devono stare su una riga sola.
 */
const SIMBOLO = { x4: '×4', x2: '×2', d2: ':2', d4: ':4' };
```

E dentro `{aperto && (<div className="sc-tuo">…)}`, **fra** `.sc-modelli` e `.sc-catena`:

```jsx
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
```

- [ ] **Step 7: Lo stile**

In fondo a `src/styles.css`:

```css
/* I quattro fattori nel punto oro: una riga sola, simboli e non parole.
   Stessa forma delle altre pastiglie — questa e' solo la fila che le tiene. */
.sc-fattori {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
```

- [ ] **Step 8: Far girare i test e costruire**

```bash
npm test && npm run build
```

Atteso: PASS + build completata. In particolare «italiano e inglese hanno esattamente le stesse chiavi» resta verde.

- [ ] **Step 9: Verificare nel browser**

1. Aprire `/app/`, portare un'immagine sul piano.
2. Premere il **punto oro**: sotto i due modelli deve comparire la riga `×4 ×2 :2 :4`.
3. Premere `×4`: si accende. Premere `:2`: `×4` si spegne e `:2` si accende — uno solo per volta.
4. Accendere «Porta alla misura di stampa», poi premere `×2`: «Porta alla misura di stampa» deve **spegnersi da solo**.
5. Passare il mouse su `:2`: il suggerimento dice «È una riscrittura di pixel…», non `zack.stepHelp.ridimensiona:d2`.

- [ ] **Step 10: Commit**

```bash
git add src/engine/ricette.js test/ricette.test.js src/i18n/it.json src/i18n/en.json src/components/Scontorna.jsx src/styles.css
git commit -m "$(cat <<'EOF'
feat: i quattro fattori del tasto Zack arrivano anche nell'app

Il committente: «il tasto zack non ha le stesse opzioni della home (x2 X4
ecc)». Erano gia' esposti da `ricette.js` come FATTORI, gia' pianificati da
`pianoZack` e gia' eseguiti da `runZack` — sia ingrandendo col modello sia
rimpicciolendo col canvas. Mancava solo il modo di accenderli: il punto oro
mostrava PASSI, che e' una lista chiusa e non li contiene.

`commutaFattore` e' il gemello di `commutaPasso` per l'altra meta' della
catena, e applica un momento prima le tre regole che `normalizza` applica
all'esecuzione: un fattore solo, ripremerlo lo spegne, e non convive con
«ingrandisci». Il momento conta: l'utente guarda le pastiglie PRIMA di
premere, e una pastiglia accesa che poi non produce niente e' una bugia
dell'interfaccia.

Le etichette c'erano gia' in tutt'e due le lingue. Mancavano le spiegazioni,
e senza `t()` restituiva la chiave: nel suggerimento sarebbe comparso
`zack.stepHelp.ridimensiona:x4`.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Lo «scarica» scarica il piano

**Files:**
- Modify: `src/store/bundle.js` — `bundleBlobs`
- Create: `test/bundleBlobs.test.js`
- Modify: `src/App.jsx` — l'import da `./store/bundle.js`, la nuova `scaricaIlPiano`, e `onScarica` a riga 1552

**Interfaces:**
- Consumes: `zip` e `unzip` da `fflate` (già dipendenza)
- Produces: `bundleBlobs(voci: {nome: string, blob: Blob}[]) => Promise<Blob>` — solleva un errore con `code === 'piano-vuoto'` se `voci` è vuoto

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `test/bundleBlobs.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzip } from 'fflate';
import { bundleBlobs } from '../src/store/bundle.js';

/*
 * Lo zip di cio' che sta SUL PIANO, non della libreria.
 *
 * Il difetto (2026-09-04): il tasto «scarica» in alto a destra passava
 * `downloadAll`, che zippa l'intera libreria. Con la libreria vuota rispondeva
 * «libreria vuota» mentre sul piano c'erano tre risultati pronti — e il
 * commento sopra la riga diceva gia' la cosa giusta, «scarica CIO' CHE C'E'»,
 * mentre il codice ne faceva un'altra.
 */

/** I nomi dentro uno zip, per controllare che non se ne sia perso nessuno. */
async function nomiNelloZip(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  return new Promise((ok, ko) =>
    unzip(buf, (err, out) => (err ? ko(err) : ok(Object.keys(out)))),
  );
}

test('lo zip contiene tutti i file del piano', async () => {
  const z = await bundleBlobs([
    { nome: 'gatto.png', blob: new Blob(['uno']) },
    { nome: 'cane.png', blob: new Blob(['due']) },
  ]);
  assert.deepEqual((await nomiNelloZip(z)).sort(), ['cane.png', 'gatto.png']);
});

test('due file con lo stesso nome non si sovrascrivono', async () => {
  /*
   * La trappola gia' pagata il 2026-08-28: `hero.png` → `insegna.webp` ha
   * sovrascritto un altro file in silenzio. Tre scatti dallo stesso originale
   * arrivano qui con lo stesso nome, e perderne uno senza dirlo e' il modo
   * piu' rapido di far perdere fiducia a un tasto che serve a portarsi via il
   * proprio lavoro.
   */
  const z = await bundleBlobs([
    { nome: 'gatto.png', blob: new Blob(['uno']) },
    { nome: 'gatto.png', blob: new Blob(['due']) },
    { nome: 'gatto.png', blob: new Blob(['tre']) },
  ]);
  assert.deepEqual((await nomiNelloZip(z)).sort(), ['gatto-2.png', 'gatto-3.png', 'gatto.png']);
});

test('il suffisso non si perde: il numero va prima del punto', async () => {
  // `gatto.png-2` non si apre con un doppio clic. Il nome si accorcia, mai
  // l'estensione — stessa regola gia' scritta per i suffissi degli asset.
  const z = await bundleBlobs([
    { nome: 'a.png', blob: new Blob(['x']) },
    { nome: 'a.png', blob: new Blob(['y']) },
  ]);
  assert.ok((await nomiNelloZip(z)).includes('a-2.png'));
});

test('un piano vuoto lo dice, non consegna uno zip vuoto', async () => {
  await assert.rejects(() => bundleBlobs([]), (e) => e.code === 'piano-vuoto');
});
```

- [ ] **Step 2: Far girare i test — devono fallire**

```bash
npm test 2>&1 | grep -A 4 "bundleBlobs\|lo zip contiene"
```

Atteso: FAIL con «bundleBlobs is not a function».

- [ ] **Step 3: Scrivere `bundleBlobs`**

In fondo a `src/store/bundle.js`:

```js
/**
 * Uno zip di cio' che sta sul piano di lavoro, senza passare dalla libreria.
 *
 * `bundleAll` risponde a un'altra domanda — «portami via tutto l'archivio» —
 * e usarlo per il tasto in alto a destra dava «libreria vuota» a chi aveva
 * tre risultati davanti agli occhi.
 */
export async function bundleBlobs(voci) {
  if (!voci?.length) {
    throw Object.assign(new Error('piano-vuoto'), { code: 'piano-vuoto' });
  }

  const files = {};
  const usati = new Set();
  for (const { nome, blob } of voci) {
    // Il numero va PRIMA del punto: `gatto.png-2` non si apre con un doppio
    // clic. Si accorcia il nome, mai il suffisso — la stessa regola gia'
    // pagata il 2026-08-28 con `gelato-front` e `gelato-back`.
    let n = nome;
    for (let i = 2; usati.has(n); i++) n = nome.replace(/(\.[^.]+)?$/, `-${i}$1`);
    usati.add(n);
    files[n] = new Uint8Array(await blob.arrayBuffer());
  }

  const data = await new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)));
  });

  return new Blob([data], { type: 'application/zip' });
}
```

- [ ] **Step 4: Far girare i test — devono passare**

```bash
npm test
```

Atteso: PASS, quattro test nuovi verdi.

- [ ] **Step 5: Collegarlo al tasto**

In `src/App.jsx`, riga 48, cambiare l'import:

```js
import { bundleAll, bundleBlobs } from './store/bundle.js';
```

Subito dopo `downloadAll` (dopo la riga 1212), aggiungere:

```js
  /**
   * Scarica CIO' CHE C'E' SUL PIANO.
   *
   * Qui c'era `downloadAll`, che zippa la LIBRERIA: con la libreria vuota
   * rispondeva «libreria vuota» mentre sul piano c'erano tre risultati
   * pronti. Il commento sopra la riga diceva gia' la cosa giusta; il codice
   * ne faceva un'altra, ed e' il tipo di commento che questo progetto non
   * vuole.
   *
   * Uno zip e non N scaricamenti: il browser blocca il secondo `a.click()` di
   * fila, quindi «scarica tutti» ne avrebbe consegnato uno.
   */
  async function scaricaIlPiano() {
    setError(null);
    // Un file solo passa dall'esportazione di sempre, che rispetta il formato
    // scelto: incartarlo in uno zip da solo sarebbe un passaggio in piu' per
    // niente.
    if (batch.results.length === 0) return runExport();

    setBusy(t('action.preparing'));
    try {
      const blob = await bundleBlobs(
        batch.results.map((r) => ({
          nome: `${r.file.name.replace(/\.[^.]+$/, '')}.png`,
          blob: r.blob,
        })),
      );
      api.download(own(blob), `zack-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (e) {
      console.error(e);
      setError(t('engine.error.body'));
    } finally {
      setBusy(null);
    }
  }
```

E a riga 1552, nel `<Scontorna>`, sostituire:

```jsx
              onScarica={batch.results.length > 0 ? downloadAll : runExport}
```

con:

```jsx
              onScarica={scaricaIlPiano}
```

- [ ] **Step 6: Far girare i test e costruire**

```bash
npm test && npm run build
```

Atteso: PASS + build completata.

> `downloadAll` resta usata dalla `Library` (`onDownloadAll={downloadAll}`) e non va tolta: lì «scarica tutto» vuol dire davvero tutto l'archivio, ed è la cosa giusta.

- [ ] **Step 7: Verificare nel browser**

1. Aprire `/app/` con la libreria **vuota**.
2. Portare tre file sul piano, premere Zack, aspettare i tre risultati.
3. Premere l'icona **scarica** in alto a destra.
4. Deve arrivare `zack-AAAA-MM-GG.zip` con **tre PNG dentro**, non «libreria vuota» e non uno zip dell'archivio.
5. Ripetere con **un solo** file sul piano: deve partire il PNG singolo, non uno zip.

- [ ] **Step 8: Commit**

```bash
git add src/store/bundle.js test/bundleBlobs.test.js src/App.jsx
git commit -m "$(cat <<'EOF'
fix: lo «scarica» in alto a destra scarica il piano, non la libreria

Trovato leggendo, non riferito. `onScarica` passava `downloadAll`, che chiama
`bundleAll()` e zippa l'intera libreria: con la libreria vuota rispondeva
«libreria vuota» mentre sul piano c'erano tre risultati pronti.

Il commento sopra la riga diceva gia' la cosa giusta — «scarica CIO' CHE C'E':
i tre file della colonna se il blocco e' finito» — e il codice ne faceva
un'altra. E' un commento che descrive l'intenzione invece del codice, ed e' il
tipo di commento che questo progetto non vuole.

`bundleBlobs` zippa cio' che gli si da', senza passare dall'archivio. Uno zip e
non N scaricamenti perche' il browser blocca il secondo `a.click()` di fila. E
i nomi doppi prendono un numero PRIMA del punto: `gatto.png-2` non si apre con
un doppio clic, e perdere un file in silenzio e' la trappola gia' pagata il
2026-08-28.

`downloadAll` resta dov'e' giusta: nella Libreria, dove «tutto» vuol dire
davvero tutto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: I blob URL escono dal render

**Files:**
- Create: `test/blobUrl.test.js`
- Modify: `src/App.jsx` — la colonna dei file scelti (righe 1246-1268)
- Modify: `src/components/BatchPanel.jsx:159`
- Modify: `src/components/FilmLab.jsx:78`

**Interfaces:**
- Consumes: niente da altri task
- Produces: niente per altri task

> **Ordine di importanza:** questo è l'ultimo perché **non è la causa della lentezza riferita** — quella era il Task 2. È una perdita di memoria vera, e si corregge perché è vera, non perché si suppone sia il collo di bottiglia.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `test/blobUrl.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * Un URL di blob non nasce dentro il render.
 *
 * Il difetto (2026-09-04): `<img src={URL.createObjectURL(f)} />` dentro una
 * `.map()` crea un URL NUOVO a ogni ridisegno e non ne revoca mai nessuno.
 * Ogni URL tiene in vita il blob a cui punta, quindi tre file e una manciata
 * di ridisegni bastano a tenere in memoria decine di copie della stessa
 * immagine — e in un'app che lavora su file di stampa le copie non sono
 * piccole.
 *
 * Non e' la causa della lentezza riferita dal committente (quella era il
 * modello che partiva sempre): e' un difetto a se', e si corregge perche' e'
 * vero.
 *
 * La cura e' sempre la stessa: l'URL si fa una volta in un `useMemo` legato
 * alla sorgente, e si revoca quando quella sorgente se ne va.
 */
const FILES = [
  ['src/App.jsx', '../src/App.jsx'],
  ['src/components/BatchPanel.jsx', '../src/components/BatchPanel.jsx'],
  ['src/components/FilmLab.jsx', '../src/components/FilmLab.jsx'],
];

for (const [nome, percorso] of FILES) {
  test(`${nome}: nessun URL di blob nasce dentro un attributo JSX`, () => {
    const sorgente = readFileSync(new URL(percorso, import.meta.url), 'utf8');
    assert.doesNotMatch(
      sorgente,
      /(?:src|href|poster)=\{URL\.createObjectURL\(/,
      `${nome} crea un blob URL dentro il render: uno nuovo a ogni ridisegno, nessuno revocato`,
    );
  });
}
```

- [ ] **Step 2: Far girare il test — deve fallire su tutti e tre**

```bash
npm test 2>&1 | grep -A 4 "nessun URL di blob"
```

Atteso: FAIL su tutt'e tre i file.

> ⚠️ **Dove vanno gli hook, in tutti e tre i file.** Ognuno di questi componenti ha un `return` anticipato — `App.jsx:1217` (`if (!engine.ready)`), `FilmLab.jsx:34` (`if (!file)`). Un `useMemo` o un `useEffect` messo **dopo** quel `return` viene eseguito in alcuni render e non in altri, e React si ferma con «Rendered fewer hooks than expected». **Gli hook nuovi vanno sopra il `return` anticipato**, insieme agli altri.

- [ ] **Step 3: Correggere `src/App.jsx`**

Aggiungere, **sopra `if (!engine.ready)` a riga 1217** — non accanto a `suPiano`, che sta dopo quel `return`:

```js
  /**
   * Le anteprime dei file scelti, fatte UNA VOLTA.
   *
   * Prima l'URL nasceva dentro la `.map()` del render: uno nuovo a ogni
   * ridisegno, nessuno revocato, e ogni URL tiene in vita il blob a cui
   * punta. Tre file di stampa e una manciata di ridisegni sono decine di
   * copie in memoria.
   */
  const anteprime = useMemo(
    () => batchFiles.map((f) => ({ f, url: URL.createObjectURL(f) })),
    [batchFiles],
  );
  useEffect(
    () => () => anteprime.forEach((a) => URL.revokeObjectURL(a.url)),
    [anteprime],
  );
```

Poi, nella colonna dei file scelti, sostituire il `.map` (oggi righe 1250-1268) con:

```jsx
      <ul className="sc-colonna">
        {anteprime.map(({ f, url }) => (
          <li key={`${f.name}-${f.size}`}>
            {/* Togliere un file dalla colonna: prima si poteva solo
                ricominciare da capo, e con lui se ne andavano anche gli
                altri due. */}
            <button
              className="sc-togli"
              aria-label={t('bar.clear')}
              onClick={() => setBatchFiles((v) => v.filter((x) => x !== f))}
            >
              ×
            </button>
            <img src={url} alt="" aria-hidden="true" />
            <span>{f.name.replace(/\.[^.]+$/, '')}</span>
          </li>
        ))}
      </ul>
```

Verificare che `useMemo` sia nell'import di React in cima al file; se manca, aggiungerlo.

- [ ] **Step 4: Correggere `src/components/BatchPanel.jsx`**

Un hook non può stare dentro una `.map()`, quindi la riga diventa un componente suo — che è **esattamente la forma già scritta in `BatchGrid.jsx:26-33`**, dove lo stesso difetto era stato evitato.

Riga 1, l'import di React. Da:

```js
import { useState } from 'react';
```

a:

```js
import { useEffect, useMemo, useState } from 'react';
```

Poi, **sopra** `export default function BatchPanel(`, aggiungere il componente:

```jsx
/**
 * Un risultato del blocco, con la sua anteprima.
 *
 * Sta in un componente suo per una ragione sola: l'URL del blob deve nascere
 * UNA VOLTA e morire con lui, e un hook non puo' stare dentro una `.map()`.
 * Dentro il render ne nasceva uno a ogni ridisegno e non ne moriva nessuno.
 * E' la stessa forma di `Riquadro` in `BatchGrid.jsx`, dove il difetto era
 * gia' stato evitato.
 */
function Scatto({ r, onFix }) {
  const url = useMemo(() => URL.createObjectURL(r.blob), [r.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <li>
      <button onClick={() => onFix(r)} title={t('batch.fix')}>
        <img src={url} alt="" loading="lazy" />
        <span>{r.file.name}</span>
      </button>
    </li>
  );
}
```

E sostituire il `.map` (righe 156-164) con:

```jsx
                {batch.results.map((r, i) => (
                  <Scatto key={`${r.file.name}-${i}`} r={r} onFix={onFix} />
                ))}
```

- [ ] **Step 5: Correggere `src/components/FilmLab.jsx`**

Riga 1, l'import di React. Da:

```js
import { useEffect, useRef, useState } from 'react';
```

a:

```js
import { useEffect, useMemo, useRef, useState } from 'react';
```

Poi, subito **dopo** il `useEffect` che azzera i tempi (righe 28-32) e **prima** di `if (!file)` a riga 34 — l'ordine conta, vedi l'avviso qui sopra:

```js
  /*
   * L'URL della clip si fa una volta per file.
   *
   * Dentro il render ne nasceva uno a ogni ridisegno, e nessuno veniva
   * revocato: qui non e' una miniatura, e' un filmato intero che resta in
   * memoria a ogni copia. Sta sopra il `return` anticipato perche' un hook
   * dopo un `return` condizionale gira in alcuni render e non in altri.
   */
  const urlClip = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => urlClip && URL.revokeObjectURL(urlClip), [urlClip]);
```

E a riga 78, nel `<video>`:

```jsx
        src={urlClip}
```

- [ ] **Step 6: Far girare i test — devono passare**

```bash
npm test
```

Atteso: PASS, i tre test di `blobUrl` verdi.

- [ ] **Step 7: Costruire**

```bash
npm run build
```

- [ ] **Step 8: Verificare nel browser — le anteprime devono ancora vedersi**

Una revoca troppo presta si vede subito: l'immagine sparisce.

1. `/app/`, portare tre file sul piano: le tre anteprime in colonna si vedono.
2. Togliere un file con la `×`: le altre due **restano visibili**. Se sbiancano, il `useEffect` di pulizia sta revocando anche gli URL che servono ancora.
3. Aprire **Filmato**, portare una clip: il video si vede e si riproduce.

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx src/components/BatchPanel.jsx src/components/FilmLab.jsx test/blobUrl.test.js
git commit -m "$(cat <<'EOF'
fix: gli URL dei blob non nascono piu' dentro il render

`<img src={URL.createObjectURL(f)} />` dentro una `.map()` crea un URL nuovo a
ogni ridisegno e non ne revoca mai nessuno. Ogni URL tiene in vita il blob a
cui punta: tre file di stampa e una manciata di ridisegni sono decine di copie
in memoria. In FilmLab era un filmato intero.

Non e' la causa della lentezza che il committente ha riferito — quella era il
modello che partiva sempre, chiusa due commit fa. Questo si corregge perche' e'
un difetto vero, non perche' si suppone che fosse il collo di bottiglia.

La cura era gia' scritta nel progetto, in `BatchGrid.jsx`: l'URL in un
`useMemo` legato alla sorgente, e revocato quando la sorgente se ne va.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Al termine

Il pezzo 1 è finito quando:

- `npm test && npm run build` sono verdi;
- lo scontorno su fondo piatto nell'app impiega **quanto la home** (numeri nel commit del Task 2);
- il righello si accende e traccia la guida;
- il punto oro mostra `×4 ×2 :2 :4`;
- lo «scarica» consegna i file del piano;
- **la home non è cambiata** — `git log --oneline -- src/landing/` deve mostrare, per questi sei commit, solo il Task 1, e solo per la riga dell'import.

Il pezzo 2 (l'impianto + Filmato) ha la sua spec in § 5-7 del design, e comincia dalle misure di § 9 — la prima è se `MediaRecorder` conserva l'alfa.
