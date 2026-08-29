# RIPRENDI QUI — ZACK APP

Documento di passaggio. Serve ad aprire una chat nuova e ripartire senza
ricostruire il contesto. Se leggi solo tre cose: la **sezione 2** (le regole),
la **sezione 6** (cosa manca) e la **sezione 5** (le trappole già pagate).

- **Repo:** `~/jayl-studio` — ramo `main`, **440 test verdi**
- **Online:** [zack-app.com](https://zack-app.com), modelli su R2 · push = deploy
- **Remoto:** `github.com/pellegrinottijoshua-hash/zack-app`
- **Ultimo aggiornamento:** 28 agosto 2026

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
| **Brain** — tela di idee, note, gruppi, frecce, documenti | fatto |
| Scontorna (+ pennello, righello, buchi, ingrandimento) | fatto |
| Vettorializza · Editor SVG | fatto |
| **Filmato** · **Suono** | fatti, mai usati sul serio |
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

---

## 6. Cosa manca, in ordine

### Deciso e in attesa di risposta

- **I tre modelli nel pannello dello studio** (Rapido / Qualità /
  Illustrazioni): spariscono sotto «Avanzati» o restano tre cerchi? **Chiesto
  tre volte, mai risposto.** Blocca il rifacimento del pannello di destra.

### Da fare

1. **Il pannello di destra dello studio** → bottoni circolari con icone
   semplici, che si estendono a tendina e solo allora mostrano la parola.
   Il meccanismo esiste già nella barra dei servizi.
2. **I sei loghi di servizio** — prompt pronti in
   [docs/2026-08-28-prompt-loghi-servizi.md](docs/2026-08-28-prompt-loghi-servizi.md).
   Da generare **nero su panna**, non su nero.
3. **Le facce 2D di Zack**: in `characters 2d` manca il suo foglio. Il suo
   cerchio resta sull'icona finché non arriva.
4. **Le dieci clip della home** — riquadro **460×460 px, margine destro,
   allineate in basso**. È un contratto: se escono con proporzioni diverse,
   Zack cambia taglia rispetto al tasto.
5. **La home in HTML vero (pre-render).** L'HTML servito contiene **zero
   caratteri di testo**: per la SEO non è difficile, è impossibile.
6. **Il cast come asset** e il **prima/dopo esportabile**.
7. **fp16** — dimezzerebbe i 175 MB. Va misurato sulla qualità del bordo.

### Cosa NON farei

- Niente sincronizzazione. Niente timeline video. Niente abbonamento prima di
  cento persone che usano lo studio gratis. Niente altri modelli o formati.

---

## 7. I documenti che contano

- [docs/2026-08-28-contratto-ux.md](docs/2026-08-28-contratto-ux.md) — **la
  fonte per l'interfaccia**: se un pixel non è d'accordo, ha torto il pixel.
- [docs/2026-08-28-idee-organizzate.md](docs/2026-08-28-idee-organizzate.md) —
  le idee in ordine di quanto servono alla tesi.
- [docs/2026-08-28-prompt-2d-cast.md](docs/2026-08-28-prompt-2d-cast.md) —
  da 3D a 2D senza snaturare i personaggi.
- [docs/2026-08-28-prompt-loghi-servizi.md](docs/2026-08-28-prompt-loghi-servizi.md)
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
