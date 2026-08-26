# RIPRENDI QUI — JAYL STUDIO

Documento di passaggio. Serve ad aprire una chat nuova e ripartire senza
ricostruire il contesto. Se leggi solo due cose, leggi la **sezione 2** (le
regole) e la **sezione 6** (cosa manca, in ordine di priorità del committente).

- **Repo:** `~/jayl-studio` — ramo `main`, 67 commit, **248 test verdi**
- **Ultimo aggiornamento:** 25 agosto 2026
- **Il resto:** [README.md](README.md) descrive il prodotto per intero;
  `docs/superpowers/specs/` contiene i due disegni approvati.

```bash
cd ~/jayl-studio && npm run dev
```

`http://localhost:5173/` è la pagina di presentazione, `http://localhost:5173/app/`
è lo studio. Il backend può restare spento: serve solo alla libreria su disco.

```bash
npm test && npm run build
```

Entrambi devono passare prima di qualunque commit.

---

## 1. Cos'è

Lo strato di **post-produzione per chi genera con l'AI**. Non un altro
generatore: il posto dove l'asset generato viene rifinito, organizzato e
preparato per finire su qualcosa di fisico.

Nasce da `jayl-craft`, uno strumento locale, ed è diventato un servizio:
**3,99 €/mese**, e la generazione a consumo separata.

Il cliente: designer, movie maker, AI director. L'alternativa cheap a Canva e
Adobe, e in parte a Higgsfield e Suno.

**Dominio previsto:** `jaylstudio` — `.io`, `.ai` o `.com`, non ancora scelto.

---

## 2. Le regole che non si negoziano

Sono decisioni prese, non preferenze. Cambiarne una richiede una ragione
esplicita, non una svista.

**Tutto gratis e in locale, per i servizi gratuiti.** È il vincolo che il
committente ha posto per primo e da cui discende l'architettura intera: *«se devo
usare api estranee tipo canva a pagamento piuttosto uso canva»*. Scontorno,
vettoriale, export, editor, suono, rifiniture girano **nel browser del cliente**.
Nessun file esce dal suo computer, nessun costo di elaborazione per noi. È il
motivo per cui il prodotto può stare a 3,99 € senza erodersi i margini.

**Tutto visibile, senza scorrere.** Regola d'interfaccia posta esplicitamente il
2026-08-25: *«i tasti devono essere tutti visibili subito e non scorrere verso il
basso, così come tutte le altre… deve essere tutto visibile per ogni strumento a
destra e non deve essere in alcun modo da uscire dalla visuale default di ogni
schermata di ogni servizio»*. Se un comando di uno strumento richiede di
scorrere, lo strumento è progettato male. **Oggi questa regola è violata**: vedi
6.1.

**Licenze dei pesi, non solo del codice.** `bria-rmbg` e `u2net_portrait` sono
vietati: non commerciali. Un test fallisce se rientrano. `bria-rmbg` è per
giunta il default della CLI di rembg — è entrato da solo una volta.

**La generazione non è mai inclusa nell'abbonamento.** Si paga a consumo da un
saldo ricaricato **prima**. Un abbonamento con generazione inclusa perde denaro
sull'utente migliore, e il post-pagamento muore al primo storno.

**Il nome del modello è l'etichetta.** Non «cosa sa fare»: *Seedance 2.5*, non
«video cinematico». Deciso dal committente contro la mia proposta iniziale, e
aveva ragione: un AI director sceglie per nome.

**Margine dichiarato: 14%.** Costo del fornitore + 14%, scritto prima di premere.
In `src/store/ledger.js`, in centesimi interi — mai float, mai euro decimali.

**Modificare non è generare.** Il laboratorio audio filtra la voce registrata e
sta fra i servizi **gratuiti**. Anche questa è una correzione del committente che
si è rivelata giusta.

**I riferimenti sono il cuore.** *«l'utilizzo di reference per img e video è
importantissimo»*. Il ciclo che nessun altro chiude: scontorni un personaggio →
diventa asset → lo metti in una moodboard → la moodboard **è** il set di
riferimenti → il risultato torna nella stessa moodboard.

**Dove non c'è una misura non c'è un avviso.** Vale per il controllo di stampa e
in generale: non si dichiarano numeri stimati come se fossero misurati.

---

## 3. Cosa è costruito

| servizio | gruppo | stato |
|---|---|---|
| Scontorna (+ pennello, + ingrandimento ×2 e ×4) | locale | **fatto** |
| Vettorializza | locale | **fatto** |
| Editor SVG | locale | **fatto** |
| Suono (dalla voce) | locale | **fatto, ma da rifare** — vedi 6.2 |
| Immagine | a consumo | **non costruito**, marcato «presto» |
| Video | a consumo | **non costruito**, marcato «presto» |

Più, non come servizi ma come rifiniture su un file aperto:

- **«Pronto per la stampa»** — un pulsante in alto a destra: scontorno +
  ingrandimento al lato lungo di 4000 px, con misura e attesa scritte prima di
  premere. Anche in blocco.
- **Barra sopra la tela** — annulla (otto passi veri), gomma, ritaglia, cambia
  file, togli.
- **Operazioni in blocco** — le stesse operazioni su quaranta file, con i
  risultati in fila e un clic per correggerne uno a mano.
- **Libreria organizzata** — griglia predefinita, cartelle con colore e icona,
  note, preferiti, provenienza, raccolte pronte, «Riprendi» su ogni lavoro.
- **Prima della stampa** — ritaglio intelligente, controllo di stampa, mockup.

Fuori dall'app: **pagina di presentazione** su `/`, predisposta per un video AI
guidato dallo scorrimento (la matematica è testata; l'effetto va guardato con
occhi umani, nel riquadro di anteprima `requestAnimationFrame` non parte).

---

## 4. Architettura, in dieci righe

- **Vite 6, due entrate**: `index.html` (presentazione) e `app/index.html`
  (studio). Separate perché la pagina che deve convincere non può caricare
  ONNX Runtime e 28 MB di modelli.
- **React 19, nessun router.** Lo stato dello studio vive in `src/App.jsx`.
- **ONNX Runtime in un Web Worker**, WebGPU con ricaduta su WASM. Sul thread
  principale un giro a 1024px blocca la scheda per minuti: il worker è un
  requisito, non un'ottimizzazione.
- **La matematica sta separata dal disegno.** `export.js` / `render.js`,
  `crop.js`+`print.js`+`mockup.js` / `finish.js`, `ready.js` / `App.jsx`,
  `sound.js` / `useSound.js`. La parte capace di sbagliare in silenzio sta dove
  i test la vedono, in Node, senza browser.
- **Libreria**: file in OPFS, metadati in IndexedDB, zip con `fflate`. Il
  backend Fastify serve solo alla copia su disco.

---

## 5. Le trappole già pagate

Ognuna è costata tempo. Non ripercorrerle.

| trappola | cosa succede |
|---|---|
| **BiRefNet nel browser** | non parte: 11 storage buffer per shader contro i 10 di Metal. Misurato, non supposto. |
| **Upscale ×2 come modello a sé** | il modello ×2 dedicato costa quattro volte il tempo per un risultato peggiore. Il ×2 si ottiene ingrandendo ×4 e riducendo a metà. La dimensione dell'ingresso è **del modello**, non una costante globale. |
| **Super-risoluzione e trasparenza** | la rete ha tre canali: l'alfa non la vede e non la restituisce. Va messa da parte e ringrandita a parte, e il colore del bordo va fatto colare nel vuoto prima, o il modello ricostruisce il nero come un contorno vero. |
| **Canvas e alfa 0** | il canvas premoltiplica: un pixel portato a trasparente perde il colore **sul posto**, prima ancora del PNG. Recuperare l'alfa da un ritaglio, da solo, ridipinge nero. Il pennello ha bisogno della sorgente. |
| **Transizioni su `grid-template-rows`/`-columns`** | fra `0fr` e un `minmax()` non c'è interpolazione: la traccia resta congelata al valore vecchio, senza errori. La libreria si apriva alta zero pixel. Stessa cosa quando la larghezza viene da una variabile CSS. |
| **Tela oltre il limite del browser** | si crea lo stesso e restituisce pixel vuoti, in silenzio. Va misurata (`probeCanvasPixels`), non indovinata: su Chrome 16384×16384, e 16385 fallisce. |
| **`vite-plugin-top-level-await`** | rompeva la build di produzione (`missing field type` da swc). Tolto: TLA nativo con `target: 'esnext'`. |
| **`?import` di Vite su ONNX** | 500 sui `.mjs` di `public/`. Lo risolve il plugin `serveOrtAssets`. |
| **`PORT` d'ambiente** | collide fra Vite e l'API. Si usa `API_PORT`. |
| **`localhost` nel proxy** | risolve prima a `::1`, l'API ascolta su IPv4. Si usa `127.0.0.1`. |
| **`overflow-x: hidden`** | disattiva `position: sticky` in tutti i discendenti. Si usa `clip`. |
| **`pathedit` senza tracciato selezionato** | manda in crash svgedit e blocca l'editor per sempre. Va guardato prima. |
| **`sharp.joinChannel`** | restituisce 3 canali in silenzio e la maschera sparisce. Si interlaccia RGBA a mano. |
| **`npm test` e `library/`** | il teardown cancellava i lavori veri. Ora richiede `JAYL_CRAFT_LIBRARY` e si rifiuta di partire senza. |
| **`Math.max(...array)`** | esplode lo stack sopra ~100k elementi. |
| **Rasterizzare un SVG piccolo** | l'antialiasing diventa «bordi sfumati» e genera avvisi inventati. Minimo 1200px, e sui vettori il controllo dei bordi non si fa. |

---

## 6. Cosa manca, in ordine

L'ordine è quello del committente, non il mio. I primi quattro punti vengono
dalla sessione del 2026-08-25 e sono **le sue parole**, non una mia lettura.

### 6.1 Tutti i comandi visibili, senza scorrere ← *la più urgente*

> *«nella sezione scontorna i tasti devono essere tutti visibili subito e non
> scorrere verso il basso (così come tutte le altre)… deve essere tutto visibile
> per ogni strumento a destra e non deve essere in alcun modo da uscire dalla
> visuale default di ogni schermata di ogni servizio»*

**Stato attuale: violato.** La colonna di destra (`.rail`) accumula, per lo
scontorno: qualità, pennello, blocco, ingrandimento, ritaglio, controllo di
stampa, mockup, formato, sfondo, più la barra azioni appiccicata in fondo. Le
sezioni sono richiudibili (`Section.jsx`), il che peggiora le cose: un comando
chiuso è un comando che non esiste.

Il lavoro non è «rimpicciolire i pulsanti». È **decidere cosa appartiene a
quale strumento** e togliere il resto:

- ogni servizio mostra **solo** i suoi comandi, tutti in una schermata;
- ciò che vale per il file (formato, sfondo, export) non è un comando dello
  scontorno: va altrove — probabilmente nella barra sopra la tela, che già
  esiste (`StageBar.jsx`);
- «Prima della stampa» (ritaglio, controllo, mockup) è un **momento**, non tre
  sezioni: forse un passo a sé, dopo il lavoro, non in colonna;
- il blocco è un'altra modalità, non un pannello dentro lo scontorno.

Prima di scrivere codice: contare i comandi di ogni servizio e disegnare la
schermata. Se non ci stanno, il problema è la lista, non il layout.

### 6.2 Il laboratorio suoni va **rifatto**

> *«la sound non va bene, non è ciò che immaginavo. L'utente deve uploadare o
> registrare, e con descrizione o selezione di diversi effetti e filtri modifica
> poi esporta, deve essere facile. Dico tum tum tum, scrivo cosa voglio che
> diventi a quel ritmo, seleziono tra una svariata serie di preimpostati e
> modifico»*

Cosa **tenere** di quello che c'è (`src/engine/sound.js`, `useSound.js`,
`SoundLab.jsx`):

- il rilevamento degli attacchi e del ritmo (`detectOnsets`, `describeRhythm`)
  funziona ed è la parte buona: la voce comunica il *ritmo* meglio di qualunque
  descrizione;
- la catena Web Audio (velocità, filtro, distorsione, riverbero) è corretta e
  verificata;
- la scelta di fondo — **modificare non è generare**, quindi resta gratuito.

Cosa **rifare**:

1. **Caricare un file, non solo registrare.** Oggi c'è solo il microfono.
2. **Descrivere a parole** cosa deve diventare. Questa è la parte nuova e va
   progettata: una descrizione libera («passi su ghiaia», «vento fra i palazzi»)
   deve arrivare a una catena di filtri. Due strade, da valutare misurando:
   - *senza AI*: la descrizione cerca fra i preimpostati per parole chiave e
     sinonimi — onesto, immediato, zero dipendenze, ma limitato;
   - *con AI*: un modello piccolo traduce la descrizione in parametri della
     catena. Attenzione: violerebbe «tutto gratis e in locale» se sta su un
     server. Se si fa, va fatto in locale o dichiarato a consumo.
3. **Molti più preimpostati.** Sei ricette sono poche: ne servono decine,
   organizzate per famiglia (passi, vento, motori, impatti, creature, ambienti,
   interfacce). Ognuna resta una scheda di parametri, come oggi.
4. **Regolare dopo aver scelto.** Il preimpostato è un punto di partenza, non un
   risultato: servono manopole (intonazione, corpo, riverbero, sporco) con
   ascolto immediato.
5. **Esportare** — già c'è (WAV a 16 bit scritto a mano).

Il gesto completo da rendere possibile in quattro mosse:
**registro «tum tum tum» → scrivo «passi di gigante nella neve» → scelgo fra i
preimpostati proposti → ritocco ed esporto.**

### 6.3 Un secondo strumento di creazione, oltre al vettoriale

> *«Oltre al vettoriale mi serve un altro strumento di creazione dove si possono
> aggiungere più immagini, fare cose, scrivere testi come campo, e Adobe
> ovviamente. Però l'esperienza utente deve essere molto più semplice e
> intuitiva e immediata»*

Una **tela di composizione**: più immagini, testo come campo modificabile,
livelli, allineamento, esportazione nei formati che ci sono già.

Non è l'editor SVG (che è un editor di *tracciati*). È il posto dove metti
insieme le cose: il ritaglio, il testo, uno sfondo, e ne esce una grafica.

Vincoli dal committente, che valgono più delle funzioni:

- **molto più semplice di Canva**, non «come Canva»;
- tutti i comandi visibili (regola 6.1);
- deve girare in locale come tutto il resto.

Suggerimento di percorso: partire da ciò che serve davvero a una grafica da
stampa — immagine + testo + posizione + colore — e fermarsi lì. Il resto si
aggiunge quando qualcuno lo chiede.

### 6.4 Tutorial per ogni tasto, molto più dettagliati

> *«Tutorial per ogni tasto devono essere molto più dettagliati»*

Esiste già la modalità **«Spiegami»** (`src/i18n/help.js`): un interruttore che
fa comparire una riga di spiegazione sotto ogni comando, in due lingue, con un
test che fallisce se una spiegazione si limita a ripetere l'etichetta.

Quello che manca non è il meccanismo, è la **profondità**: oggi è una riga.
Serve, per ogni comando: cosa fa, quando serve, cosa succede se sbagli, e —
qui entra Zack — **una dimostrazione visiva**. Vedi sezione 7.

---

Il resto della coda, invariato:

5. **Immagine e Video a consumo.** Architettura disegnata per intero in
   `docs/superpowers/specs/2026-08-25-generazione-design.md`: adattatori come
   schede di configurazione, saldo prenota→conferma→rilascia già costruito e
   testato, riferimenti presi dalla libreria. Modelli scelti: **Nano Banana Pro**
   e **GPT Image 2** per le immagini, **Seedance 2.5** e **Kling 3.0** per il
   video. Manca il codice degli adattatori e il collegamento al saldo.
6. **Testo sopra un'immagine.** Chiesto due volte come «tasto Testo». Oggi il
   testo esiste solo nell'editor vettoriale. Confluisce in 6.3.
7. **Cartelle a trascinamento.** *«creando sottoinsiemi spostando su un ipotetico
   canvas delle librerie»*: trascinare i lavori dentro le cartelle invece di
   sceglierle da un menu. Le cartelle con colore e icona esistono già.
8. **Estrazione fotogrammi da video** e **palette dai colori**: gli ultimi due
   servizi gratuiti disegnati e non costruiti.
9. **Modelli a fp16**, per dimezzare i 170 MB del primo scaricamento.
10. **Rileggere il tono di tutti i testi dell'interfaccia.** Li ho scritti io, in
    italiano e inglese. La voce del marchio la conosce il committente: è una
    revisione che spetta a lui, non un compito da delegare.
11. **Guardare con occhi propri** due cose che non si verificano in un riquadro
    di anteprima: il video guidato dallo scorrimento sulla presentazione, e il
    suono «gigante» partendo da un «tum tum» vero al microfono.

---

## 7. Zack the Duck come mascotte

Richiesta del 2026-08-25. **La prossima chat deve leggere il materiale che
esiste già prima di proporre qualunque cosa.**

> **Fatto il 2026-08-26.** Il materiale è stato letto e le decisioni stanno in
> tre file, che sostituiscono le domande qui sotto:
> - [docs/2026-08-26-zack-e-brain.md](docs/2026-08-26-zack-e-brain.md) — ruolo di
>   Zack, il cast come mappa degli stati, il servizio **Brain**, il **tasto
>   Zack**, la risposta sull'«app Zack» (no come prodotto separato), e la
>   **scaletta** in dodici passi;
> - [docs/zack-asset-plan.md](docs/zack-asset-plan.md) — prompt per landing,
>   tutorial, stati vuoti, marchio;
> - [docs/zack-animazioni-cast.md](docs/zack-animazioni-cast.md) — prompt Seedance
>   delle animazioni del cast (4s, tagliate a 2/3s).
>
> Costruito il 2026-08-26, nell'ordine della scaletta:
> 1. `src/lib/icons.js` + `Icon.jsx` — un solo insieme di icone, tratto 1,75,
>    con il **filo d'oro** (`draw`) che le traccia invece di farle comparire.
>    Nuove: `brain`, `feather`, gli oggetti di Brain, i cinque bollini.
> 2. `scripts/make-icons.mjs` + `manifest.webmanifest` — icona dell'app dalla
>    faccia di Zack (il nome scritto sotto, a 32 px, è illeggibile) e studio
>    installabile.
> 3. `src/engine/holes.js` — chiusura dei buchi nei loghi. **Soglia
>    provvisoria: va misurata su loghi veri.**
> 4. `src/engine/ricette.js` + `ZackButton.jsx` + `runZack` in `App.jsx` — il
>    **tasto Zack**, che ha sostituito «Pronto per la stampa».
> 5. `src/engine/keying.js` + `scripts/clip-alpha.mjs` — fondo panna →
>    trasparente, senza bucare i personaggi panna.
>
 6. `Section.jsx` non è più richiudibile e c'è un solo `Advanced.jsx`. §6.1 è
>    **fatto a metà, con la misura**: ad avanzati chiusi la colonna è 580 px in
>    580 px di visuale e non scorre; ad avanzati aperti sono 2556 px. Restano
>    due decisioni di prodotto — «Prima della stampa» come *momento* dopo il
>    lavoro invece di tre sezioni, e il blocco come *modalità*.
>
> **Non fatto**: il servizio **Brain**, «Zack può ricordarlo», Spiegami
> profondo, l'aggancio delle animazioni del cast agli eventi, l'hero della
> presentazione. La scaletta completa è nel documento, §8.

### Dove sta il materiale

```
~/Desktop/zack the duck/
  PROJECT.md, INDEX.md          il progetto e l'indice
  characters/                   zack.png, zacksheet.png, zackexpressions.png,
                                sheetzack.png, più il cast (gabbiano, gatto,
                                falena, formica, piccione)
  2d/                           render 2D già prodotti
  episodes/                     video .mp4 e prompt degli episodi
  print/, metrics/, logo.png
~/Desktop/dax the duck/
  zack-series-bible.md          LA BIBBIA: premessa, struttura in 4 battute,
                                palette a 4 colori, fondo panna, regole di
                                posa, le 5 regole non negoziabili del potere
                                di Zack, 11 regole di scrittura dei prompt
  characters/element-descriptions-e-zack-action-sheet.md
```

La bibbia è già scritta come **prompt di sistema autosufficiente**: va letta per
intera, non riassunta. Contiene vincoli visivi rigidi (palette a 4 colori, fondo
panna, ombre di contatto obbligatorie) che **non vanno reinventati**.

### Cosa deve produrre la prossima chat

Non le immagini: **l'elenco ragionato di quali servono e perché**. Il
committente genera gli asset per conto suo (regola già stabilita: *mai lanciare
generazioni al posto suo, consegnare prompt pronti da incollare*).

Le domande a cui rispondere, in quest'ordine:

1. **Che ruolo ha Zack nello studio?** Guida che dimostra, o presenza
   decorativa? La risposta cambia tutto il resto. Ipotesi da vagliare: Zack è
   quello che **fa vedere il gesto** — prende la piuma d'oro e scontorna, e tu
   capisci cosa fa il pulsante senza leggere.
2. **Quali asset per la pagina di presentazione** (`/`), che è già predisposta
   per un video guidato dallo scorrimento: quante scene, quale gesto per scena,
   che formato, che peso massimo. Il vincolo tecnico è reale — la landing non
   deve caricare ONNX, quindi il video deve essere leggero.
3. **Quali asset dentro lo studio** (`/app/`): un'illustrazione per ogni
   strumento? Una clip corta per ogni tutorial (6.4)? Uno stato vuoto quando non
   c'è nessun file aperto? Un Zack che compare quando un'operazione lunga è in
   corso, invece della barra di attesa?
4. **Cosa deve capire chi arriva**, nell'ordine: chi è JAYL, cosa fa lo studio,
   che gli strumenti sono **pochi, gratuiti, semplici**, e che servono a
   rifinire lavori importanti — arte, effetti sonori, musica, immaginazione.
   Zack è il modo di dirlo senza scriverlo.
5. **Che formati e che pesi**, misurati contro il budget della pagina.

### Vincoli da rispettare

- palette e regole di posa vengono dalla bibbia, non dal gusto di chi progetta;
- il marchio JAYL ha la sua palette (nero, panna, grigio, oro): va verificato
  che le due convivano — è il primo conflitto da risolvere, non l'ultimo;
- Zack non parla: la serie è muta e deadpan. Una mascotte che spiega a parole
  tradirebbe il personaggio. Deve **mostrare**.

---

## 8. Dove finiscono i file, e l'account — *questione aperta*

Il committente l'ha posta così:

> *«tutto viene salvato nel computer, tutto viene utilizzato dall'utente e
> scaricato sempre dall'utente, non c'è un server… c'è un account dove i lavori
> vengono salvati ma dobbiamo capire come farli salvare in modo che il cliente
> non si perda tutto»*

**La tensione è reale e va risolta con una decisione, non con un compromesso
tiepido.** Oggi i file stanno in **OPFS** e i metadati in **IndexedDB**: sul
computer dell'utente, dentro il browser. Il che significa che *svuotare i dati
del sito cancella l'archivio* — l'app lo dice già, ma dirlo non basta.

Le strade, con il loro costo vero:

| strada | cosa comporta |
|---|---|
| **Solo browser (oggi)** | zero costi, zero rischi di privacy, ma un clic sbagliato nelle impostazioni del browser e sono spariti tre mesi di lavoro. |
| **Cartella vera sul disco** (File System Access API) | l'utente sceglie una cartella una volta, l'app ci scrive dentro. I file sopravvivono al browser, si vedono nel Finder, si mettono su Dropbox/iCloud da soli. **Solo Chrome/Edge**, non Safari né Firefox. Probabilmente la risposta giusta per il pubblico di riferimento. |
| **Backup su nostro server** | contraddice la promessa fondativa, costa banda e responsabilità legale sui contenuti. Da evitare, o al massimo come opzione dichiarata e spenta di default. |
| **Account senza file** | l'account serve solo a licenza e saldo; i lavori restano locali. Coerente con la promessa, ma non risolve «non perdersi tutto». |

Nota: `downloadAll()` (zip di tutto) esiste già ed è la rete di sicurezza
minima. Non basta come risposta, ma va tenuta comunque.

**Da decidere prima di scrivere codice**: se l'account è solo licenza+saldo, o
anche sincronizzazione. Le due cose hanno architetture diverse e prezzi diversi.

---

## 9. Spunti per le prossime sessioni

Idee non richieste ma sensate, in ordine di rapporto valore/fatica. Nessuna è
approvata: sono da proporre, non da costruire di slancio.

**L'AI dentro il sito** — la domanda era *«come posso farmi aiutare dall'AI on
site per rendere il servizio migliore?»*. Le tre risposte utili, dalla più
piccola:

1. **Scegliere il modello di scontorno al posto dell'utente.** Line art o
   fotografia? È una decisione che si prende a occhio quaranta volte al giorno e
   un classificatore minuscolo la prende meglio. Piccola, locale, si vede subito.
2. **Descrivere i lavori in archivio.** Un modello di visione locale guarda ogni
   asset e ne scrive due parole («Kadabra, occhiali, sfondo blu»): la ricerca
   funziona senza che nessuno abbia taggato niente, e alimenta le cartelle
   automatiche del punto 6.7.
3. **Il controllo di stampa che spiega invece di misurare.** Non «contrasto
   1,1:1» ma «su capo nero questa grafica sparisce, provala su panna».

**Altre idee tenute da parte:**

- **Preimpostati di stampa per fornitore**, non solo Gelato: Printful, Printify.
  Ognuno ha area e densità sue, e sbagliarle è il costo di un campione.
- **Un «prima e dopo» condivisibile** come immagine singola: è il materiale che
  i designer pubblicano da soli, ed è marketing che si costruisce una volta.
- **Ricette salvabili**: la sequenza scontorna→ingrandisci→esporta con i propri
  parametri, salvata con un nome e richiamabile su qualunque file. È il passo
  successivo naturale di «Pronto per la stampa».
- **Storico per file**, non solo otto passi in memoria: la provenienza già
  esiste nei metadati (`fromId`), manca solo mostrarla come una linea del tempo.

---

## 10. Come si lavora qui

- **Si misura, non si suppone.** Ogni numero nel codice e nei commenti viene da
  una misura, con la data. Le costanti magiche stanno dichiarate in cima con il
  motivo.
- **I test sono documentazione.** Nomi in italiano, che dicono la regola
  (`'un fallimento non ferma il blocco'`), e un commento che spiega *perché*
  quella regola esiste. Un test che ripete l'implementazione non serve.
- **I commenti dicono il perché, non il cosa.** Il cosa si legge nel codice.
- **Si verifica nel browser, non solo nei test.** Ogni difetto di questa
  sessione è stato confermato guardando i pixel veri prima di toccare il codice,
  e riconfermato dopo. `npm test` non vede il canvas.
- **Interfaccia bilingue, italiano e inglese**, con la modalità «Spiegami»:
  ogni comando spiega se stesso dentro l'app. Un test fallisce se una chiave
  esiste in una lingua sola o se un aiuto si limita a ripetere l'etichetta.
- **Marchio JAYL:** nero `#111111`, panna `#F5F0E8`, grigio `#8A8A85`, oro
  `#C4A35A` al massimo per un decimo della superficie. Space Grotesk e Cormorant
  Garamond. Payoff: *Art finds a way.*
- **Il colore non è mai l'unico segnale.** Ogni avviso dice a parole cosa
  succede.
- **Mai generare al posto del committente.** Si consegnano prompt pronti da
  incollare; le generazioni le lancia lui.
- **Un commit per decisione**, con il perché nel corpo del messaggio.
