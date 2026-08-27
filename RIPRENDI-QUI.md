# RIPRENDI QUI — ZACK APP

Documento di passaggio. Serve ad aprire una chat nuova e ripartire senza
ricostruire il contesto. Se leggi solo tre cose: la **sezione 2** (le regole),
la **sezione 6** (cosa manca) e
[docs/2026-08-26-dove-siamo.md](docs/2026-08-26-dove-siamo.md) (dove sta il
progetto fra gli altri, e la critica onesta di cosa non va).

- **Repo:** `~/jayl-studio` — ramo `main`, **382 test verdi**
- **Online:** [zack-app.com](https://zack-app.com) dal 2026-08-27, modelli su R2
- **Remoto:** `github.com/pellegrinottijoshua-hash/zack-app` (push = deploy)
- **Ultimo aggiornamento:** 27 agosto 2026
- **Il resto:** [README.md](README.md) descrive il prodotto;
  `docs/` contiene i disegni approvati e le analisi.

```bash
cd ~/jayl-studio && npm run dev
```

`http://localhost:5173/` è la presentazione, `http://localhost:5173/app/` è lo
studio. Il backend può restare spento: serve solo alla copia su disco.

```bash
npm test && npm run build
```

Entrambi devono passare prima di qualunque commit.

---

## 1. Cos'è

Lo strato di **post-produzione per chi genera con l'AI**. Non un altro
generatore: il posto dove l'asset generato viene rifinito, organizzato e
preparato per finire su qualcosa di fisico.

**3,99 €/mese**, la generazione a consumo separata. Il cliente: designer, movie
maker, AI director. L'alternativa cheap a Canva e Adobe.

**Dominio: `zack-app.com`**, comprato su Cloudflare il 2026-08-27. Il prodotto
si chiama **Zack App**, come la mascotte: «Zack» da solo è impossibile da
cercare, «zack app» no — quindi il trattino nell'indirizzo non è un ripiego, è
il nome. **JAYL non sparisce, cambia mestiere:** resta il marchio del negozio
(jayl.store, i capi, «Art finds a way») e l'etichetta della palette nell'editor
vettoriale. Il **personaggio** resta Zack, e con lui il tasto: le chiavi
`zack.*` sono lui che fa il lavoro, non il prodotto.

Il deploy: [docs/2026-08-27-deploy-zack-app.md](docs/2026-08-27-deploy-zack-app.md).
**Cloudflare Pages rifiuta i file oltre 25 MiB e i modelli ne pesano 176-179
l'uno**: vanno su R2, che ha egress gratuito — non è infrastruttura, è il
margine.

---

## 2. Le regole che non si negoziano

Decisioni prese, non preferenze. Cambiarne una richiede una ragione esplicita.

**Tutto gratis e in locale, per i servizi gratuiti.** *«Se devo usare api
estranee tipo canva a pagamento piuttosto uso canva»*. Scontorno, vettoriale,
export, editor, suono, filmato, rifiniture girano **nel browser del cliente**.
È il motivo per cui il prodotto sta a 3,99 € senza erodersi i margini, ed è il
suo unico vantaggio strutturale contro chi paga le GPU.

**Palette: panna 60, nero 30, oro 10.** Invertita il 2026-08-26. In
`styles.css` le variabili portano il nome del **ruolo** (`--fondo`,
`--inchiostro`) e non del colore: `--nero: #f5f0e8` sarebbe una bugia scritta
nel codice. `--nero` e `--panna` restano come colori letterali dove il colore
è il punto — i tasti, che sono neri.

**Gli strumenti non coprono la tela.** Pannelli trasparenti con bordo nero: la
tela è lo sfondo, sempre, in ogni sezione. Un pannello opaco è un pezzo di
schermo tolto al lavoro.

**Tutto si nasconde per intero.** Ogni sezione è una tendina, aperta di
default, che ricorda come l'hai lasciata. Si chiude **per dare spazio alla
tela**, non per far stare una lista troppo lunga.

**I tasti: ovali, neri, contorno, scritta grossa centrata in Fredoka.** Tre
misure — grande per l'azione dello strumento, media per gli avanzati, iconcine
tonde per i gesti continui. La misura è l'informazione.

**Licenze dei pesi, non solo del codice.** `bria-rmbg` e `u2net_portrait` sono
vietati: non commerciali. Un test fallisce se rientrano.

**La generazione non è mai inclusa nell'abbonamento.** Si paga a consumo da un
saldo ricaricato prima. Margine dichiarato: **14%**, in centesimi interi.

**Il nome del modello è l'etichetta.** *Seedance 2.5*, non «video cinematico».

**Una parola sola: «asset».** La cosa che sta in libreria si chiama così, in
italiano e in inglese (scelta del committente, 2026-08-27). «File» nomina ciò
che sta sul computer dell'utente, ed è l'unica altra parola ammessa. Un test
fallisce se «lavoro», «work» o «piece» tornano dentro.

**Modificare non è generare.** Il laboratorio audio e i tre gesti sul filmato
stanno fra i servizi **gratuiti**.

**Niente montaggio video.** Tre gesti su un file solo: taglia, estrai
fotogrammi, togli lo sfondo. Alla prima timeline multi-traccia abbiamo comprato
il problema più costoso del settore.

**Il `.md` è l'unico formato di testo.** Non txt, non rtf, non docx: il
markdown è l'unico che un umano legge in chiaro, un modello capisce senza
conversioni e un editor apre fra dieci anni. Allungare quella lista significa
comprarsi le conversioni, che è un altro prodotto.

**Il ponte verso un modello è il pacco, non un server.** I documenti escono in
`nome.brain.zip`, si scompatta, si legge `IDEE.md`. Nessuna sincronizzazione,
nessuna banda, nessuna responsabilità legale sui contenuti. Vedi
[docs/2026-08-27-brain-come-ponte.md](docs/2026-08-27-brain-come-ponte.md).

**I riferimenti sono il cuore.** Scontorni → l'asset entra in una tela di Brain
→ la tela **è** il set di riferimenti → il risultato torna lì.

**Dove non c'è una misura non c'è un avviso.**

**Mai generare al posto del committente.** Si consegnano prompt pronti da
incollare; le generazioni le lancia lui.

---

## 3. Cosa è costruito

| servizio | gruppo | stato |
|---|---|---|
| **Brain** — tela di idee, note, gruppi, frecce, **documenti** | locale | **fatto** |
| Scontorna (+ pennello, buchi, ingrandimento) | locale | **fatto** |
| Vettorializza | locale | **fatto** |
| Editor SVG | locale | **fatto** |
| **Filmato** — taglia, fotogrammi, togli sfondo | locale | **fatto, mai usato sul serio** |
| **Suono** — sei famiglie sintetizzate + ritmo | locale | **fatto, mai usato sul serio** |
| Immagine / Video | a consumo | **non costruito**, marcato «presto» |

Più:

- **Il tasto Zack** — la catena di passi che ogni servizio ricorda. Dice cosa
  farà prima di premere. In Brain scarica il **pacco `.brain.zip`** (idea.json,
  IDEE.md, mappa.png, i file) che si rimette dentro.
- **Blocco** con la griglia dei risultati sulla tela: nome modificabile,
  correggi a mano, scarica singolo.
- **Libreria** in OPFS + IndexedDB, con porta d'ingresso per immagini, audio e
  video, e la **potatura**: selezione multipla e «scegli i doppioni».
- **Presentazione** su `/`: un video a schermo intero che avanza a blocchi
  mentre scorrono solo le parole, con lo sfondo tolto.

---

## 4. Architettura, in dieci righe

- **Vite 6, due entrate**: `index.html` (presentazione) e `app/index.html`
  (studio). Separate perché la pagina che deve convincere non può caricare ONNX.
- **React 19, nessun router.** Lo stato dello studio vive in `src/App.jsx`.
- **ONNX Runtime in un Web Worker**, WebGPU con ricaduta su WASM.
- **La matematica sta separata dal disegno.** `holes.js`/`finish.js`,
  `keying.js`/`clip-alpha.mjs`, `synth.js`/`SoundLab.jsx`, `clip.js`/`filmato.js`,
  `brain.js`/`Brain.jsx`, `ricette.js`/`ZackButton.jsx`. La parte capace di
  sbagliare in silenzio sta dove i test la vedono, in Node, senza browser.
- **Libreria**: file in OPFS, metadati in IndexedDB, zip con `fflate`.

---

## 5. Le trappole già pagate

| trappola | cosa succede |
|---|---|
| **BiRefNet nel browser** | non parte: 11 storage buffer contro i 10 di Metal. |
| **Upscale ×2 come modello a sé** | il ×2 dedicato costa 4× per un risultato peggiore. Si fa ×4 e si riduce. |
| **Super-risoluzione e trasparenza** | la rete ha 3 canali: l'alfa va messa da parte e ringrandita a parte. |
| **Canvas e alfa 0** | il canvas premoltiplica: recuperare l'alfa da un ritaglio ridipinge nero. Il pennello ha bisogno della sorgente — **e se la sorgente ha un'altra misura va riscalata**, o si ridipinge nero lo stesso (2026-08-26). |
| **Key sul colore per le clip** | mezzo cast è panna: piccione, petto del gabbiano, falena, becco di Zack. Si toglie il panna **raggiungibile dal bordo**, non il panna. |
| **`--size` quadrato in clip-alpha** | schiacciava un 16:9 senza dirlo. È il lato lungo, e la misura la dichiara ffprobe. |
| **Transizioni su `grid-template-rows`** | fra `0fr` e un `minmax()` non c'è interpolazione. |
| **Tela oltre il limite del browser** | pixel vuoti in silenzio. Va misurata (`probeCanvasPixels`). |
| **`overflow-x: hidden`** | disattiva `position: sticky` in tutti i discendenti. Si usa `clip`. |
| **`position: fixed` per il video della home** | copriva anche l'apertura. È `sticky` con margine negativo. |
| **Il velo dietro il video** | messo fuori finiva sotto: testo illeggibile. Sta dentro, sopra le immagini. |
| **`Math.max(...array)`** | esplode lo stack sopra ~100k elementi. Nei suoni sono 132.300 campioni. |
| **`sharp.joinChannel`** | 3 canali in silenzio, la maschera sparisce. Si interlaccia a mano. |
| **`npm test` e `library/`** | richiede `JAYL_CRAFT_LIBRARY` o si rifiuta di partire. |
| **Rasterizzare un SVG piccolo** | minimo 1200px, e sui vettori il controllo bordi non si fa. |
| **Cambiare il fondo e non l'inchiostro** | due difetti in una sessione. `--inchiostro` porta il nome del RUOLO: usarlo dove il colore è fisso *perché il fondo è fisso* dà nero su nero (il velo dell'attesa, contrasto 1.00) o panna su panna («Avanzati»). **Chi cambia il fondo si prende anche l'inchiostro.** |
| **`overflow: hidden` su un elemento flex** | azzera la dimensione minima automatica. In colonna l'etichetta si restringe a **0 px**, col testo dentro e invisibile. Serve `flex: none`. |
| **Una pillola che può restringersi** | si stringe sull'icona e il testo esce da entrambi i lati del nero. In una barra che scorre, `flex: none`. |
| **`git add <file>` non basta** | `git commit` committa **tutto l'indice**, non solo ciò che hai appena aggiunto. Con una sessione parallela che ha già i suoi file in staging, il commit se li porta dietro e il messaggio non li nomina (successo il 2026-08-27, riparato spaccando il commit). |
| **File oltre 25 MiB su Cloudflare Pages** | rifiutati. Sono **5**, e il quinto — il runtime WASM in `public/ort/` — è quello che ci si dimentica di contare perché non sta fra i modelli. |
| **`.btn.ghost:hover`** | diceva `color: var(--inchiostro)`, scritto quando i tasti secondari erano scuri su panna. Con la palette invertita il fondo è nero: **nero su nero su ogni tasto secondario**, a ogni passaggio del mouse (2026-08-27). Una regola scritta per una palette vecchia non fallisce: peggiora in silenzio. |
| **Guardare la home in un'anteprima headless** | appena la pagina è scorsa dipinge solo il fondo del `body`: schermata nera, e la zona sticky non si compone mai. Alzare la finestra la annulla del tutto. La home si guarda **in un browser vero** (2026-08-27). |

---

## 6. Cosa manca, in ordine

> Rifatta il 2026-08-27, **dopo che il sito è andato online**. La domanda che
> ordina questa lista non è più «cosa manca al prodotto»: è **«cosa perde un
> utente che apre zack-app.com adesso»**. È un criterio diverso e cambia le
> priorità: quello che nessuno vede può aspettare.

### Fatto, e non si riapre

- **Il deploy.** `zack-app.com` risponde, i modelli stanno su R2 con egress
  gratuito, il CORS è impostato, il dominio è dichiarato in `wrangler.jsonc`
  invece che cliccato a mano. Verificato con uno scontorno vero sul sito
  pubblico: modello da 176 MB scaricato da `assets.zack-app.com`, risultato a
  schermo. Vedi [docs/2026-08-27-deploy-zack-app.md](docs/2026-08-27-deploy-zack-app.md).
- **Il nome.** Zack App ovunque sulle superfici che l'utente vede.
- **Le cinque criticità «subito»** di dove-siamo: il primo minuto, le tendine,
  le attese dichiarate, la potatura della libreria, una parola sola.
- **I documenti in Brain**, e il pacco come ponte verso un modello.
- **Sei difetti trovati usando l'app** (contrasto 1.00, la catena che
  raccontava meno del suo passo, la famiglia di suono invisibile, la barra di
  Filmato, «Avanzati» panna su panna, la barra strumenti muta sul telefono).

### 1. Adesso conta questo: il primo caricamento

**235 MB prima di vedere qualcosa.** È il numero che decide se il prodotto
esiste per qualcuno che non sei tu: un modello di scontorno (176 MB), il
modello di ingrandimento (30 MB) e il runtime (27 MB). Su una connessione
normale è più di un minuto in cui la pagina non fa niente di visibile.

Tre leve, in ordine di quanto rendono:

1. **Dire quanto manca mentre scarica.** Non riduce i megabyte, elimina
   l'abbandono da incertezza — ed è la lezione già pagata con l'attesa di
   Zack. È anche la più economica delle tre.
2. **Un modello solo invece di tre.** «Rapido / Qualità / Illustrazioni» sono
   tre scelte che l'utente nuovo non sa fare. Toglierne due dal primo
   caricamento (restano negli avanzati, scaricati su richiesta) dimezza
   l'attesa e semplifica la schermata.
3. **fp16.** Dimezza i pesi. È la più lenta da fare e va misurata sulla
   qualità del bordo prima di prometterla.

### 2. Il cast non esiste come asset

In `public/zack/` ci sono sette file e sono **tutti Zack**. Piccione, Gabbiano,
Falena, Gatto e Formica hanno canone e prompt di animazione pronti, e zero
pixel. Tutta la tesi di marketing — «Zack è la campagna, non la mascotte» —
poggia su un cast che nel prodotto non si è mai visto.

Prompt pronti in [docs/2026-08-27-iconcine-cast.md](docs/2026-08-27-iconcine-cast.md):
sei ritratti, sette fermi immagine (che oggi mancano del tutto sotto
`prefers-reduced-motion`) e i due stati vuoti rimasti.

### 3. Lo strumento gratuito senza account

Una pagina sola che fa **una** cosa: togli lo sfondo, gratis, illimitato. È già
metà costruita, il costo d'esercizio è zero ora che i modelli stanno su R2, e
chi la usa due volte capisce da solo cosa gli manca. È il canale d'acquisizione
più economico che esista per questo prodotto.

### 4. Il «prima e dopo» come immagine sola

Si costruisce una volta e fa marketing per sempre: i designer pubblicano da
soli i propri prima-dopo, e ogni immagine porta il marchio. Il confronto a
tendina esiste già in `Compare.jsx` — manca solo esportarlo.

### 5. Da guardare con occhi propri (i test non li vedono)

- **La home**, ancora **non verificata con gli occhi**. Il limite è dello
  strumento, non della pagina: l'anteprima non compone la zona sticky. **Va
  aperta in un browser vero, adesso che è online.** L'unica cosa vista in un
  colpo: fra l'apertura e il primo blocco c'è una fascia panna vuota di quasi
  uno schermo, e nel primo blocco il testo passa sopra la piuma di Zack.
- **La soglia di `holes.js`**: provvisoria e non misurata. Servono cinque loghi
  veri, due con controforme aperte e due con buchi voluti.
- **Suoni e Filmato**: venti minuti d'uso hanno trovato tre difetti su sei.
  Un episodio intero prodotto con quei due servizi ne troverà altri dieci, e
  sono i dieci che vedrebbe il primo cliente.
- **Il telefono**: l'impaginazione a 375 px regge e la navigazione adesso si
  legge. Resta ignoto se la memoria di un telefono regga 235 MB di modelli.

### 6. Le cose grosse, quando le prime cinque sono chiuse

- **Le altre quattro clip della home.** Si aggiungono a `CLIP` in
  `Landing.jsx` una alla volta; i blocchi senza clip restano sull'ultima.
- **Ricerca e storico in Brain**, adesso che i documenti ci vivono dentro:
  «trovami dove ho scritto preventivo» è la funzione che tiene vivo l'archivio.
  Piccola, locale, gratis.
- **«Zack può ricordarlo»** — la ricetta imparata guardando cosa rifai a mano.
- **Immagine e Video a consumo.** Due voci spente che promettono da settimane
  sono peggio di due voci assenti: o si fanno, o si tolgono dalla vista.
  Architettura in `docs/superpowers/specs/2026-08-25-generazione-design.md`.
- **La tela di composizione** (immagine + testo + posizione + colore).
- **La cartella vera su disco** (Chrome/Edge). Vedi
  [docs/2026-08-26-brain-ai-e-cervello.md](docs/2026-08-26-brain-ai-e-cervello.md).

### 7. Cosa NON farei, e costa dirlo

- **Niente sincronizzazione.** «I tuoi file ovunque» significa pagare banda e
  prendersi responsabilità legale su contenuti che non controlli.
- **Niente timeline video.** Il confine dei tre gesti è ciò che tiene in piedi
  il progetto.
- **Niente abbonamento prima di cento persone che usano lo studio gratis.**
  Misurerebbe quanto sei convincente, non quanto è buono il prodotto.
- **Niente altri modelli, altri formati, altri preimpostati.** Allungano la
  lista senza cambiare cosa il prodotto *è*.

---

## 6-bis. Brain come ponte

I `.md` dei progetti entrano nella libreria come asset, stanno sulla tela dentro
il cerchio del loro progetto, si aprono e si modificano nello studio, e escono
nel pacco. `IDEE.md` guadagna la sezione **Documenti** — titolo scritto dentro
il file, progetto, percorso — che è quella da cui un modello parte per sapere
cosa aprire.

Il giro completo sta in
[docs/2026-08-27-brain-come-ponte.md](docs/2026-08-27-brain-come-ponte.md).
Il consiglio che conta: **un gruppo per progetto, e dentro solo i documenti che
qualcuno leggerebbe davvero.** Se `IDEE.md` ne elenca quaranta non è più una
panoramica, è di nuovo la cartella di partenza.

Nuovo anche il tasto **«Immagine della tela»**: `nome-tela.png` con note,
gruppi, frecce, miniature e schede dei documenti. Era già disegnata, ma sepolta
dentro lo zip.

---

## 7. Zack, e i documenti che lo riguardano

Il materiale è stato letto e le decisioni sono scritte. **Non riaprire il
canone: leggerlo.**

- `~/Desktop/dax the duck/zack-series-bible.md` — LA BIBBIA. Palette a 4
  colori, fondo panna, le 5 regole non negoziabili del potere di Zack, le 11
  regole di scrittura dei prompt.
- [docs/2026-08-26-zack-e-brain.md](docs/2026-08-26-zack-e-brain.md) — ruolo di
  Zack, il cast come mappa degli stati, Brain, il tasto Zack, la risposta
  sull'«app Zack» (no come prodotto separato), la scaletta.
- [docs/zack-asset-plan.md](docs/zack-asset-plan.md) — prompt per landing,
  tutorial, stati vuoti, marchio.
- [docs/zack-animazioni-cast.md](docs/zack-animazioni-cast.md) — prompt Seedance
  del cast che reagisce alle azioni (4s, tagliate a 2/3s).
- [docs/2026-08-27-iconcine-cast.md](docs/2026-08-27-iconcine-cast.md) — le
  **immagini ferme piccole**: sei ritratti del cast, i sette fermi che mancano
  sotto `prefers-reduced-motion`, e i due stati vuoti rimasti. È la famiglia da
  cui esce il cast come asset, che oggi non esiste.
- [docs/prompt-tasti-nbp.md](docs/prompt-tasti-nbp.md) — la tavola dei tasti, e
  perché non entrano nell'app.

**Vincoli:** Zack non parla (la serie è muta e deadpan), non festeggia, non è
mai l'unico segnale. Palette e regole di posa vengono dalla bibbia.

---

## 8. Gli strumenti da riga di comando

```bash
# Le icone dell'app dal logo (usa la faccia sola: il nome a 32 px è illeggibile)
node scripts/make-icons.mjs ~/Desktop/"zack the duck"/logo.png

# Da una clip sul vuoto panna a una clip con lo sfondo trasparente
node scripts/clip-alpha.mjs clip.mp4 --out public/hero/zack-2 --size 1280
```

Su `clip-alpha`, il numero da guardare è **`isole`**: quante regioni panna
circondate dal personaggio sono state salvate. **`isole: 0` su una clip col
piccione o col becco di Zack in campo significa che il key se l'è mangiato.**

---

## 9. Come si lavora qui

- **Si misura, non si suppone.** Ogni numero viene da una misura, con la data.
- **I test sono documentazione.** Nomi in italiano che dicono la regola, e un
  commento che spiega *perché* quella regola esiste.
- **I commenti dicono il perché, non il cosa.**
- **Si verifica nel browser, non solo nei test.** Ogni difetto di queste
  sessioni è stato trovato guardando i pixel veri. `npm test` non vede il canvas.
- **Interfaccia bilingue**, con la modalità «Spiegami». Un test fallisce se una
  chiave esiste in una lingua sola.
- **Marchio JAYL:** nero `#111111`, panna `#F5F0E8`, oro `#C4A35A`. Space
  Grotesk e Cormorant Garamond, Fredoka sui soli tasti. Payoff: *Art finds a way.*
- **Il colore non è mai l'unico segnale.**
- **Un commit per decisione**, con il perché nel corpo del messaggio.
