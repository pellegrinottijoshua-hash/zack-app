# RIPRENDI QUI — ZACK APP

Documento di passaggio. Serve ad aprire una chat nuova e ripartire senza
ricostruire il contesto. Se leggi solo tre cose: la **sezione 2** (le regole),
la **sezione 6** (cosa manca) e la **sezione 5** (le trappole già pagate).

- **Repo:** `~/jayl-studio` — ramo `main`, **487 test verdi**
- **Online:** [zack-app.com](https://zack-app.com), modelli su R2 · push = deploy
- **Remoto:** `github.com/pellegrinottijoshua-hash/zack-app`
- **Ultimo aggiornamento:** 5 settembre 2026

```bash
cd ~/jayl-studio && npm run dev
```

`http://localhost:5173/` è la home, `/app/` è lo studio.

```bash
npm test && npm run build
```

Entrambi devono passare prima di qualunque commit.

---

## 1. Cos'è

Lo strato di **post-produzione per chi genera con l'AI**. Non un generatore:
il posto dove l'asset generato viene rifinito, organizzato e preparato.

**3,99 €/mese**, generazione a consumo separata. **Zack App** il prodotto,
**JAYL** il marchio di chi lo fa — sta in alto a sinistra e in fondo, firmato.

---

## 2. Le regole che non si negoziano

- **Tutto gratis e in locale.** Scontorno, vettoriale, export, editor, suono,
  filmato girano **nel browser del cliente**. È il motivo dei 3,99 €.
- **Palette: panna 60, nero 30, oro 10.** In `styles.css` le variabili portano
  il nome del **ruolo** (`--fondo`, `--inchiostro`), non del colore.
- **Gli strumenti non coprono la tela.** Unica eccezione dichiarata: l'ovale
  delle opzioni del tasto Zack, che è **un momento e non uno stato**.
- **I tasti sono cerchi.** I nomi rubano larghezza alla tela in ogni
  schermata; compaiono solo se si apre la barra.
- **Licenze dei pesi.** `bria-rmbg` e `u2net_portrait` vietati: un test fallisce.
- **La generazione non è mai inclusa** nell'abbonamento. Margine 14%.
- **Il nome del modello è l'etichetta.** *Seedance 2.5*, non «video cinematico».
- **Una parola sola: «asset».** Un test fallisce se «lavoro/work/piece» tornano.
- **Niente montaggio video.** Tre gesti su un file solo.
- **Il `.md` è l'unico formato di testo.**
- **Il ponte verso un modello è il pacco, non un server.**
- **Dove non c'è una misura non c'è un avviso.**
- **Il colore non è mai l'unico segnale.**
- **Mai generare al posto del committente.** Si consegnano prompt pronti.

---

## 3. Cosa è costruito

| servizio | stato |
|---|---|
| **Brain** — tela di idee, note, gruppi, frecce, documenti | fatto, **non ancora nell'impianto** |
| Scontorna (+ pennello, righello, buchi, ingrandimento) | fatto, **nell'impianto** |
| Vettorializza · Editor SVG | fatto, **non ancora nell'impianto** |
| **Filmato** | fatto, **nell'impianto** (pezzo 2) |
| **Suono** | fatto, mai usato sul serio, **non ancora nell'impianto** |
| Immagine / Video a consumo | **non costruiti**, marcati «presto» |

Più: il **tasto Zack** (catena personalizzabile, condivisa fra home e studio),
il **Blocco**, la **Libreria** in OPFS + IndexedDB, e la **home che lavora**.

### La home, in breve

Primo schermo panna: **tasto Zack** (immagine, ovale nero col filo d'oro) al
centro, **mascotte a destra immobile**, `+` e frase sotto. Trascini fino a
**tre file**, premi Zack, e lo sfondo sparisce — **gratis, senza account**.

**Prima si prova senza modello:** `keying.js` ritaglia un fondo piatto in ~20
ms. Il modello da 175 MB parte solo per i file che ne hanno bisogno, e parte
**quando entrano**, non quando premi.

---

## 4. Architettura, in dieci righe

- **Vite 6, due entrate**: `index.html` (home) e `app/index.html` (studio).
  La home **non carica ONNX**: entra con `import()` solo se serve.
- **React 19, nessun router.** Lo stato dello studio vive in `src/App.jsx`.
- **ONNX Runtime in un Web Worker**, WebGPU con ricaduta su WASM.
- **La matematica sta separata dal disegno.** `holes.js`, `keying.js`,
  `righello.js`, `synth.js`, `clip.js`, `brain.js`, `ricette.js`: la parte
  capace di sbagliare in silenzio sta dove i test la vedono, in Node.
- **Un pennello solo** (`engine/brush.js`), usato da studio e home.
- **Libreria**: file in OPFS, metadati in IndexedDB, zip con `fflate`.

---

## 5. Le trappole già pagate

| trappola | cosa succede |
|---|---|
| **BiRefNet nel browser** | non parte: 11 storage buffer contro i 10 di Metal. |
| **Upscale ×2 come modello a sé** | costa 4× per un risultato peggiore. Si fa ×4 e si riduce. |
| **Super-risoluzione e trasparenza** | la rete ha 3 canali: l'alfa va messa da parte. |
| **Canvas e alfa 0** | il canvas premoltiplica: recuperare l'alfa da un ritaglio ridipinge nero. Il pennello ha bisogno della **sorgente**. |
| **Key sul colore per le clip** | mezzo cast è panna. Si toglie il panna **raggiungibile dal bordo**. |
| **`--size` quadrato in clip-alpha** | schiacciava un 16:9 senza dirlo. |
| **Transizioni su `grid-template-rows`** | fra `0fr` e `minmax()` non c'è interpolazione. |
| **Tela oltre il limite del browser** | pixel vuoti in silenzio. Va misurata. |
| **`overflow-x: hidden`** | disattiva `position: sticky` nei discendenti. Si usa `clip`. |
| **`Math.max(...array)`** | esplode sopra ~100k elementi. |
| **`sharp.joinChannel`** | 3 canali in silenzio, la maschera sparisce. |
| **`npm test` e `library/`** | richiede `JAYL_CRAFT_LIBRARY`. |
| **Cambiare il fondo e non l'inchiostro** | `--inchiostro` porta il nome del RUOLO. **Chi cambia il fondo si prende anche l'inchiostro** — successo tre volte. |
| **`overflow` su un elemento flex** | vale per `auto` quanto per `hidden`: azzera la dimensione minima automatica. Serve `flex: none`. |
| **`git add <file>` non basta** | `git commit` committa **tutto l'indice**. Successo quattro volte in due giorni. |
| **File oltre 25 MiB su Cloudflare Pages** | rifiutati. Sono 5, e il quinto è il runtime WASM. |
| **Guardare la home in un'anteprima headless** | col riquadro nascosto `innerWidth` è **0** e l'intera pagina collassa: ogni misura presa da lì è finta, e un canvas largo 0 fa dividere per zero. Prima di misurare: `resize_window` e controllare `innerWidth`. |
| **Video → SVG** | non esiste. Un fotogramma vettorializzato pesa **più di tutto il video** (232 KB contro 229). 123× per l'animazione intera. |
| **Salvare due volte lo stesso risultato** | `saveAsset` non aveva idempotenza. Ora decide l'impronta SHA-256 + il nome. |
| **`defaultModelFor` restituisce il MODELLO, non l'id** | «Modello sconosciuto: [object Object]». |
| **Scaricare il modello al passaggio del mouse** | 175 MB anche per un'immagine che si ritaglia in 20 ms. |
| **Il lato della barriera ricalcolato a ogni timbro** | il righello falliva **proprio nel gesto per cui esiste**. Il lato lo decide l'**inizio** del tratto. |
| **Un elemento che deve stare FERMO in un contenitore centrato** | non sta fermo. Si ancora **in alto**, a un contenitore che non cambia misura. |
| **`border-radius: 999px` non è un'ellisse** | è uno stadio. Per un ovale vero serve `50%`. |
| **`behavior: 'smooth'` come parte di un comportamento** | se una cosa deve **succedere**, non può dipendere da un'animazione. La morbidezza sta nel CSS. |
| **`scrollIntoView` su una barra `position: fixed`** | scorre anche la pagina. |
| **`setPointerCapture` che solleva** | su un puntatore non riconosciuto interrompe il gesto prima di dipingere. Va in un `try`. |
| **Sovrascrivere un asset che esiste già** | `hero.png` → `insegna.webp` ha sovrascritto un altro file in silenzio. |
| **Il suffisso perso nel taglio a 60 caratteri** | `gelato-front` e `gelato-back` diventavano lo stesso nome. Si accorcia il nome, mai il suffisso. |
| **Una configurazione che vive SOLO nel pannello** | il comando di build su Cloudflare e' tornato da solo a `npm run build`, perdendo il `rm -rf dist/ort dist/models`, e **ogni deploy ha fallito per giorni** senza che un commit lo raccontasse. Ora il `rm -rf` e' un `postbuild` in `package.json`. Stessa ragione per cui la regola di cache su `assets.zack-app.com` sta scritta in `docs/2026-08-27-deploy-zack-app.md` §4-bis. |
| **Una correzione CSS che dipende da `:has()`** | `.main:has(> .rail[data-vuota])` curava la tela schiacciata su mobile — ma solo dove `:has()` esiste. Su Firefox < 121 e Samsung Internet < 20 il difetto tornava identico, mascotte e tasto a meta' schermo. La cura giusta non ha bisogno di `:has()`: traccia `auto` e minimo sull'ELEMENTO, cosi' la riga collassa da sola quando il pannello e' `display: none`. |
| **`vh` su un telefono** | e' il viewport GRANDE, quello senza la barra del browser. Con `.shell` a `overflow: hidden`, cio' che sfora non si puo' nemmeno raggiungere scorrendo. Si usa `dvh`, con la riga in `vh` prima come ricaduta. |
| **Una regola CSS piu' sotto che ne annulla una piu' sopra** | ho diagnosticato un guasto su `min-height: min(74vh, 640px)` di `.sc` senza accorgermi che 30 righe dopo c'era `.sc { min-height: 0 }`, che vince. **Prima di incolpare una regola, chiedere al browser cosa ha risolto davvero** (`getComputedStyle`). |
| **Un commento che attribuisce una cura a una riga inerte** | `.stage:has(.sc)` dichiarava tre proprieta' gia' tutte presenti nella regola base di `.stage` — non faceva niente — ma il suo commento diceva di curare la mascotte «che resta a mezzo schermo». Mi ha fatto perdere un giro intero. Un commento che indica il posto sbagliato e' peggio di nessun commento. |
| **La cache HTTP non e' protetta da `navigator.storage.persist()`** | in nessun browser. Un file da 176 MB nella cache HTTP viene sfrattato presto su un telefono, e `persist()` non lo salva. Va nella **Cache API** — che e' cio' che `persist()` protegge davvero. |
| **`canvas.toBlob` nell'anteprima** | e' bloccato a **~1004 ms fissi**, con varianza di 2 ms: una PNG da 10x10 costa quanto una da 4 megapixel. Non e' contesa, e' un timer. Qualunque cronometraggio che includa una codifica PNG preso da li' non misura niente. Il controllo che lo smaschera: cronometrare una PNG minuscola. |
| **`requestAnimationFrame` e `<video>` nell'anteprima nascosta** | rAF non scatta MAI, e gli elementi `<video>` non caricano i metadati (`readyState` resta 0). Una funzione che aspetta un giro di rAF per fotogramma — come `togliSfondo` — si pianta. Si sostituisce **solo** il pompa-fotogrammi, dichiarandolo, e il resto resta la funzione vera. |
| **Una barra di avanzamento che nessuno accende** | `EngineBanner` aveva da agosto un ramo `phase === 'downloading'` con la percentuale, e il worker non ha MAI emesso quella fase. Codice in attesa di un segnale che nessuno mandava, mentre 176 MB scendevano in silenzio. **Se un ramo dell'interfaccia non si vede mai, controllare chi dovrebbe accenderlo.** |

---

## 6. Cosa manca, in ordine

Dal 2026-09-04 il lavoro segue una spec e cinque pezzi:
[docs/superpowers/specs/2026-09-04-impianto-unico-design.md](docs/superpowers/specs/2026-09-04-impianto-unico-design.md).

### L'impianto — la cosa da capire per prima

Lo scontorno non era «una sezione fatta bene»: era **l'impianto** di ogni
servizio, cablato in `App.jsx` come caso speciale. Ora e' `Piano.jsx`, e ogni
servizio dichiara in `src/servizi/<id>.js` le tre cose che lo distinguono —
cosa accetta il `+`, cosa fa il tasto Zack, quali strumenti compaiono e
quando. **E' dati, non un programma**, quindi vive in Node dove i test lo
vedono.

La mappa, uguale in ogni schermata: `+` al centro · tasto Zack e strumenti in
un angolo · mascotte in basso a sinistra · scarica in alto a destra · i
servizi in fila (mobile) o in colonna (desktop).

### Fatto

- **Pezzo 1 — i sei tappi allo scontorno.** Lo scontorno rapido (`~96 ms di
  lavoro vero contro i 2 s del modello) ora c'e' anche nell'app; l'errore non
  accusa piu' il file dell'utente; il righello si accende davvero; i fattori
  ×4 ×2 :2 :4 sono nel punto oro; lo «scarica» scarica il piano.
- **Pezzo 2 — l'impianto, e Filmato dentro.** Filmato ha la stessa mappa dello
  scontorno, i suoi tre gesti sono cerchi, dietro al video ci sono gli
  scacchi, e l'attesa di «togli sfondo» si dichiara.
- **Il deploy**, che falliva da giorni in silenzio (vedi § 5).
- **Il modello si scarica una volta sola**, e mentre scarica dice quanto manca.

### Da fare

1. **Pezzo 3 — Brain e Vocale nell'impianto.** Quando entrano, spariscono
   anche le ultime due liste `['brain','suono']`.
   - **Brain**: il `+` da tre voci — *nota · gruppo · file*. «Idea» non e' una
     voce: e' una nota con la categoria «idea», che `brain.js` ha gia'. Il
     tasto Zack **riorganizza**, con la regola scelta nel punto oro
     (gruppi/tipo/compatta/frecce), e **deve essere deterministica**.
   - **Vocale**: il `+` da due scelte — *registra* o *aggiungi*. Il vocale va
     in alto, la descrizione in basso, e il tasto imposta i filtri da un
     **dizionario locale** (niente AI).
2. **Pezzo 4 — Vettoriale nell'impianto**, con gli strumenti sui due fianchi e
   «Avanzati» fra loro.
3. **Pezzo 5 — il desktop**: stesso impianto, servizi a sinistra, tasto Zack
   nella tela in alto a destra, medio-grande.
4. **La Libreria come schermata**, e allora la striscia in alto diventa
   `libreria · faccia · scarica` (misurato: a 375 px restano 229 px di
   margine).
5. **I sei loghi di servizio** — prompt pronti in
   [docs/2026-08-28-prompt-loghi-servizi.md](docs/2026-08-28-prompt-loghi-servizi.md).
   Da generare **nero su panna**, non su nero.
6. **Le facce 2D di Zack**: in `characters 2d` manca il suo foglio.
7. **Le clip della mascotte**, senza sfondo. Il riquadro e' gia' riservato e
   non dipende dal contenuto: mettercele dentro non deve muovere nient'altro.
8. **La home in HTML vero (pre-render).** L'HTML servito contiene **zero
   caratteri di testo**: per la SEO non e' difficile, e' impossibile.
9. **fp16** — dimezzerebbe i 176 MB. Va misurato sulla qualita' del bordo.

### Deciso, e non si rifa'

- **L'AI nel tasto Zack e' rimandata** (2026-09-04). Sarebbe stata la prima
  cosa a non girare nel browser del cliente. Vettoriale e Vocale fanno
  qualcosa di locale.
- **Niente encoder video nuovo**: misurato che `MediaRecorder` conserva
  l'alfa. Il filmato esce gia' senza sfondo.
- **Si dice «impianto»**, non «guscio» ne' «modello» — `modello` qui e' gia'
  il modello ONNX.

### Cosa NON farei

- Niente sincronizzazione. Niente timeline video. Niente abbonamento prima di
  cento persone che usano lo studio gratis. Niente altri modelli o formati.
- **Niente app su Play Store per risolvere la cache**: una TWA usa la stessa
  memoria del browser, quindi non cambia niente. Solo Capacitor porterebbe i
  176 MB dentro il pacchetto, e sono al limite dei 200 MB di Play.

---

## 7. I documenti che contano

- [docs/2026-08-28-contratto-ux.md](docs/2026-08-28-contratto-ux.md) — **la
  fonte per l'interfaccia**: se un pixel non è d'accordo, ha torto il pixel.
- [docs/2026-08-28-idee-organizzate.md](docs/2026-08-28-idee-organizzate.md) —
  le idee in ordine di quanto servono alla tesi.
- [docs/2026-08-28-prompt-2d-cast.md](docs/2026-08-28-prompt-2d-cast.md) —
  da 3D a 2D senza snaturare i personaggi.
- [docs/2026-08-28-prompt-loghi-servizi.md](docs/2026-08-28-prompt-loghi-servizi.md)
- [docs/superpowers/specs/2026-09-04-impianto-unico-design.md](docs/superpowers/specs/2026-09-04-impianto-unico-design.md)
  — **l'impianto**: la mappa condivisa, i descrittori, i cinque pezzi. Con
  dentro le misure, comprese quelle che hanno smentito una mia diagnosi.
- [docs/2026-08-27-deploy-zack-app.md](docs/2026-08-27-deploy-zack-app.md) —
  e in particolare il **§ 4-bis**: la regola di cache che vive nel pannello
  Cloudflare. Se i modelli tornano lenti, si guarda prima quella.
- [docs/superpowers/specs/2026-08-27-home-che-lavora-design.md](docs/superpowers/specs/2026-08-27-home-che-lavora-design.md)
- `~/Desktop/zack the duck/zack-series-bible.md` — **la bibbia.** Zack non
  parla, non festeggia, non è mai l'unico segnale.

---

## 8. Gli strumenti da riga di comando

```bash
# Dagli asset generati a quelli che il sito serve (misure e pesi dal doc)
node scripts/prepara-assets.mjs ~/Desktop/"zack the duck/zack assets app"

# Dai fogli di facce alle iconcine singole, trovando la griglia dai pixel
node scripts/ritaglia-iconcine.mjs ~/Desktop/"zack the duck/zack assets app/characters 2d"

# Le icone dell'app dal logo
node scripts/make-icons.mjs ~/Desktop/"zack the duck"/logo.png

# Da una clip sul vuoto panna a una con lo sfondo trasparente
node scripts/clip-alpha.mjs clip.mp4 --out public/hero/zack-2 --size 1280
```

Su `clip-alpha`, il numero da guardare è **`isole`**: `isole: 0` su una clip
col piccione o col becco di Zack significa che il key se l'è mangiato.

---

## 9. Come si lavora qui

- **Si misura, non si suppone.** Ogni numero viene da una misura, con la data.
- **I test sono documentazione.** Nomi in italiano che dicono la regola, e un
  commento che spiega *perché* quella regola esiste.
- **I commenti dicono il perché, non il cosa.**
- **Si verifica nel browser, non solo nei test.** `npm test` non vede il canvas.
  E prima di misurare: `resize_window`, o `innerWidth` è zero.
- **Interfaccia bilingue.** Un test fallisce se una chiave esiste in una lingua
  sola — sia in `src/i18n/` sia in `src/landing/copy.js`.
- **Marchio JAYL:** nero `#111111`, panna `#F5F0E8`, oro `#C4A35A`. Space
  Grotesk e Cormorant Garamond, Fredoka sui tasti. *Art finds a way.*
- **Un commit per decisione**, col perché nel corpo. E `git add <percorsi>`,
  mai `-A`: il commit si porta via tutto l'indice.
