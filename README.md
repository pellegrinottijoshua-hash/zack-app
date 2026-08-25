# JAYL STUDIO

Prepara i tuoi asset. Sul tuo computer, senza mandare niente in giro.

```bash
npm run dev
```

- **`http://localhost:5173/`** — la pagina di presentazione
- **`http://localhost:5173/app/`** — lo studio

Due entrate separate di proposito: la pagina che deve convincere non può
caricare ONNX Runtime e 28 MB di modelli.

Se stai riprendendo il progetto da zero — chat nuova, contesto perso —
parti da **[RIPRENDI-QUI.md](RIPRENDI-QUI.md)**.

## Cos'è

Lo strato di post-produzione per chi genera con l'AI. **Sei servizi in due
gruppi**, e la divisione non è cosmetica:

| sul tuo computer | a consumo |
|---|---|
| Scontorna · Vettorializza · Editor SVG · **Suono** | Immagine · Video |
| illimitati, inclusi nei 3,99 €/mese | si paga a generazione, prezzo scritto prima |

Lo scontorno include la **correzione a mano col pennello** — l'automatico
sbaglia sempre in qualche punto — e un **ingrandimento con super-risoluzione**
che ricostruisce il dettaglio invece di interpolare.

Il pennello ha bisogno del **file di partenza**, non solo del ritaglio: il
canvas premoltiplica i colori per l'opacità, quindi un pixel portato a
trasparente perde il colore sul posto e recuperarlo dal solo ritaglio
ridipingerebbe nero. I colori vivi stanno soltanto nella sorgente.

I tre a consumo non ci sono ancora: la barra li mostra marcati «presto», perché
nascondere metà del prodotto non aiuta nessuno a capire cosa sia.

Il pezzo che conta: **scontorno, vettorializzazione ed export girano nel
browser**, non su un server. Sulla macchina di chi lo usa, senza che nessun file
esca dal suo computer e senza costo di elaborazione per chi lo offre. È la
ragione per cui il prodotto può stare a 3,99 €/mese senza erodersi i margini.

**Il backend può restare spento.** Serve solo alla libreria su disco: senza di
lui l'app si avvia lo stesso e il flusso principale funziona per intero.

| operazione | dove | tempo |
|---|---|---|
| scontorno 2000×2000 | browser, WebGPU | ~1,0 s |
| export a 3661×4843 | browser, canvas | ~1,2 s |
| vettorializzazione a colori | browser, WASM 140 KB | ~0,4 s |

## Come funziona il motore

Un Web Worker ospita ONNX Runtime. All'avvio l'app guarda cosa sa fare il
browser e sceglie di conseguenza:

| browser | modello | tempo su 2000×2000 |
|---|---|---|
| con WebGPU | `isnet-general` 1024px | **~1,0 s** |
| senza WebGPU | `u2net` 320px, WASM | ~6 s |

Chi finisce nel secondo caso **lo legge scritto**: un avviso dice che il browser
non ha l'accelerazione, cosa comporta e come rimediare. Non lo nascondiamo.

La maschera prodotta dalla rete viene riportata a piena risoluzione e applicata
come canale alfa **sui pixel originali**, che non vengono mai ricampionati: un
file di stampa 3661×4843 esce 3661×4843.

### Perché non BiRefNet

È il modello migliore, ma **nel browser non parte**: chiede 11 storage buffer per
shader e le implementazioni WebGPU su Metal ne espongono 10. Misurato, non
supposto. Resta disponibile lato server, come qualità premium.

### Perché il thread principale non tocca niente

Un giro di inferenza a 1024px sul thread principale blocca la scheda per minuti.
Il worker non è un'ottimizzazione, è un requisito.

## Licenze dei modelli

Il codice MIT non basta: contano anche i pesi. Vendere un servizio con un modello
non commerciale è un problema legale, e un test fallisce se ne entra uno.

| ammessi | licenza |
|---|---|
| `u2net`, `isnet-general-use`, `isnet-anime` | Apache-2.0 |
| `birefnet-*` (solo lato server) | MIT |

**Vietati:** `bria-rmbg` — non commerciale, ed è il *default* della CLI di
`rembg` — e `u2net_portrait`, addestrato su un dataset con vincolo non
commerciale malgrado il repo sia Apache-2.0.

## Lingua e spiegazioni

Tutto esiste in **italiano e inglese**, scelti automaticamente dal browser e
cambiabili in un clic. Un test fallisce se una chiave manca in una delle due, se
una stringa è vuota, o se un testo d'aiuto si limita a ripetere l'etichetta.

**«Spiegami»**, in alto a destra, accende la spiegazione sotto ogni comando: il
tutorial vive dentro l'interfaccia invece che in un manuale che nessuno apre. Al
primo avvio compaiono tre passi, una volta sola.

## L'editor vettoriale

Nodi e maniglie Bézier, campi numerici X/Y/L/A e rotazione, allineamento fra
elementi, duplica, spostamento di un pixel per volta, spessore e opacità.

**Scorciatoie**: `V` seleziona, `A` nodi, `P` penna, `N` matita, `L` linea,
`R` rettangolo, `E` ellisse, `T` testo. `Cmd+Z` / `Cmd+Shift+Z` annulla e
ripete, `Cmd+D` duplica, `Cmd+G` raggruppa, le frecce spostano (con `Shift` di
dieci pixel).

La modifica dei nodi si abilita **solo con un tracciato selezionato**: entrarci
senza mandava in crash il modulo interno della libreria e bloccava l'editor per
sempre.

Regola di progetto: **un controllo senza testo d'aiuto non è finito.**

## Operazioni in blocco

Non è uno strumento nuovo: è il moltiplicatore che rende utili gli altri.
«Scontorna questi 40, esportali in 6 formati.» Si finisce un file prima di
passare al successivo, così ci si può fermare a metà portandosi a casa
qualcosa di finito, e **un file rotto non ferma gli altri trentanove**.

La stima del tempo viene dai lavori già conclusi in questa sessione, non da
una costante: la stessa operazione dura diversamente su macchine diverse.

A fine corsa i ritagli restano in fila, con la scacchiera sotto: quello che ha
perso il soggetto si vede a colpo d'occhio, e un clic ci apre sopra il
pennello. Il blocco conserva **anche i file di partenza**, perché senza
originale «Recupera» non ha colori da riportare.

## Il laboratorio dei suoni

**Non genera niente.** Registri la voce e la trasformi con dei filtri: è il
mestiere dei fonici Foley da cinquant'anni, ed è per questo che sta fra i
servizi gratuiti.

| fai con la bocca | esce |
|---|---|
| «tum tum» | passi di gigante |
| «uuuuu» | vento |
| «brrrrr» | motore |
| «tin» | metallo |
| «grrr» | mostro |

L'app estrae anche il **ritmo** dalla registrazione — quanti colpi e a che
velocità — perché è quello che la tua voce comunica meglio di una descrizione.

Il cambio di intonazione avviene per variazione di velocità, che sposta
insieme altezza e timbro: è il vecchio trucco del nastro rallentato. Abbassare
la sola altezza darebbe un giradischi guasto, non un gigante.

## Ingrandimento

RealPLKSR (darktable-org, MIT, 28 MB), convoluzionale: i transformer sforano il
limite di storage buffer di WebGPU su Metal.

**Misurato, non stimato:** x4 su 300×300 impiega ~31 s a caldo. La variante x2
è stata **tolta** perché produce la stessa uscita in quattro volte il tempo —
tenerla sarebbe offrire un'opzione peggiore sotto ogni aspetto.

Il limite è il tempo, non la memoria: **ingresso massimo 512 px di lato**,
perché l'ingrandimento serve su asset piccoli, non su un file di stampa che è
già grande. L'attesa stimata si dice prima.

## Ingrandire per la stampa

Il modello ingrandisce **quattro volte**; il **×2** si ottiene riducendo a metà
un'immagine già ricostruita, che è meglio che interpolarla dal piccolo. Un
solo modello da scaricare, due fattori da offrire — e sui file già grandi il
×4 sfora la tela, il ×2 no.

Due cose che non si vedono ma decidono il risultato:

- **la trasparenza non passa dal modello.** La rete ha tre canali: l'alfa va
  messa da parte e ringrandita per conto suo. Senza, un ritaglio ingrandito
  torna un rettangolo nero;
- **il colore del bordo cola nel vuoto** prima di dare i pixel al modello.
  Fuori dal soggetto il canvas ha lasciato nero, e il modello lo
  ricostruirebbe come un contorno vero, che ricompare come alone appena si
  riapplica l'alfa.

Il tetto non è il tempo ma la **tela**: oltre il massimo del browser una tela
si crea lo stesso e restituisce pixel vuoti, in silenzio. Si misura invece di
indovinare, e l'attesa è scritta prima di premere.

## Prima della stampa

Tre rifiniture in un pannello solo, perché sono la stessa domanda in tre
momenti: **il file è pronto per finire su qualcosa di fisico?**

**Ritaglio.** Taglia attorno al soggetto, non attorno al centro della tela — è
il motivo per cui non taglia le teste. La finestra parte dal baricentro pesato
sull'opacità e poi scivola quanto serve a contenere tutto il soggetto. Non esce
mai dall'immagine: se il formato non ci sta si perde margine, non si aggiunge
tela finta. E se il soggetto verrà comunque tagliato, lo dice prima.

**Controllo di stampa.** Il controllo che nessuno offre e che serve a tutti: un
file può essere perfetto sullo schermo e sbagliato sulla maglietta, e te ne
accorgi col campione in mano — cioè quando hai già pagato.

| controllo | cosa misura |
|---|---|
| dimensione | quanti centimetri verrà davvero, sull'area del capo |
| sfondo | se manca la trasparenza, stampa un rettangolo di inchiostro |
| bordi | quanti pixel mezzo trasparenti diventeranno aloni |
| contrasto | grafica contro **colore del capo**: nero su nero è un file perfetto e una maglietta vuota |
| bordo immagine | se la grafica è già tagliata |

Sono misure, non pareri: **dove non c'è una misura non c'è un avviso.** Sui
formati social il controllo tace, e sui vettori salta il conto dei bordi
sfumati, perché misurerebbe l'antialiasing della nostra rasterizzazione invece
del file.

**Mockup.** La grafica sul capo — t-shirt davanti e dietro, felpa, borsa. Non è
una fotografia e non prova a sembrarlo: una finta foto si riconosce subito. Le
proporzioni vengono da una taglia M stesa, 52 cm di torace su 72 di lunghezza.
Si posiziona il **soggetto**, non il file: un PNG con mezzo metro di margine
trasparente finirebbe stampato grande come un francobollo.

## Mobile

Non tre colonne rimpicciolite: su un telefono non ci stanno. La tela prende lo
schermo, le proprietà scorrono sotto, gli strumenti stanno in fondo a icone —
dove arriva il pollice. L'azione principale è fissa sopra la barra. Bersagli da
44 px, e le azioni sull'asset restano visibili invece di comparire al passaggio
del mouse, che su un telefono non esiste.

## La pagina di presentazione

Struttura a **scene**: ogni sezione è alta più di uno schermo e tiene fermo un
livello mentre si scorre. Il posto per il video AI è già dentro `Scene` —
quando i video ci saranno si passano come attributo e la pagina non cambia.

Rispetta `prefers-reduced-motion`: niente scene appiccicose per chi ha chiesto
meno movimento.

## Come si usa

**Le azioni vanno all'asset, non viceversa.** Passi il mouse su un lavoro e
vedi cosa puoi farci; quelle che non hanno senso non compaiono — un PNG offre
*scontorna* e *vettorializza*, un SVG offre *modifica*. Un bottone spento è una
domanda senza risposta.

*Usa come riferimento* mette il lavoro fra i riferimenti della prossima
generazione: è la scorciatoia che chiude il ciclo libreria → generazione.

La barra dei servizi si riduce a sole icone nell'editor: la tela passa da 950 a
1084 px.

## I lavori

Tutto vive **nel browser**: i file in OPFS, i metadati in IndexedDB. Nessun
server, nessun account.

- **Cartelle** con colore e icona, da un insieme chiuso — le etichette libere
  diventano ingestibili. Eliminarne una **non cancella i lavori**: li riporta
  fuori dalle cartelle.
- **Provenienza**: ogni lavoro sa da quale deriva, e la catena si vede.
- **Preferiti** e **raccolte pronte** (ultimi 7 giorni, preferiti, usati come
  riferimento), che compaiono solo quando hanno qualcosa dentro.
- **Moodboard** per raggruppare per intenzione, con una palette.
- **Tag** e **ricerca** per ritrovare.
- **Scarica tutto** costruisce lo zip in locale (fflate), con dentro un
  `indice.json` leggibile: senza, un archivio di nomi-con-codice è
  indecifrabile fra sei mesi.

Il rovescio di vivere nel browser è che **svuotare i dati del sito cancella
l'archivio**. L'avviso sta sopra la striscia e fuori dallo scorrimento, non in
un menu: un avviso che si perde scorrendo è un avviso che nessuno legge.

`repair()` riallinea record fantasma e file orfani — li produce davvero una
scheda chiusa a metà scrittura.

## Struttura

```
src/engine/     motore nel browser
  models.js       registro modelli e vincolo di licenza
  compose.js      funzioni pure maschera → alfa (testate in Node)
  capabilities.js rilevamento WebGPU e scelta del livello
  worker.js       ONNX Runtime, gira nel Worker
  client.js       API a promesse verso il worker
  export.js       matematica del posizionamento (testata in Node)
  render.js       disegno dell'export su canvas
  trace.js        VTracer in WebAssembly
  pixels.js       una passata sui pixel → riquadro, baricentro, colore, bordi
  crop.js         il ritaglio attorno al soggetto (testato in Node)
  print.js        i cinque controlli di stampa (testati in Node)
  mockup.js       sagome dei capi e posizionamento (testato in Node)
  finish.js       il lato canvas delle tre rifiniture
  batch.js        pianificazione delle operazioni in blocco
  sound.js        ricette e matematica del laboratorio audio
src/store/      libreria e contabilità
  ledger.js       saldo in centesimi, prenota/conferma/rilascia (testato in Node)
src/landing/    la pagina di presentazione, entrata separata
  scrollVideo.js  la matematica del video guidato dallo scorrimento
  copy.js         i testi, separati dai componenti
  model.js        modello puro: nomi, cartelle, tag, query (testato in Node)
  files.js        i file in OPFS
  db.js           i metadati in IndexedDB
  library.js      l'API unica per l'interfaccia
  bundle.js       lo zip di tutto, costruito in locale
src/i18n/       italiano, inglese, e la modalità «Spiegami»
server/         backend Fastify: modalità locale e futura qualità premium
py/             ambiente Python (rembg) usato dal backend
library/        i tuoi lavori — gitignorata
docs/superpowers/  spec e piani
```

## Test

```bash
npm test
```

Duecentotrentaquattro test. Coprono il vincolo di licenza, le funzioni pure del motore, la
parità con il backend (IoU ≥ 0,98, differenza alfa media ≤ 2/255) e la
completezza delle due lingue.

**`npm test` scrive in `tmp/test-library`, mai in `library/`**: il teardown fa
pulizia, e cancellare i lavori veri sarebbe imperdonabile. Il test si rifiuta di
partire se la variabile non è impostata.

## Note operative

- I modelli stanno in `public/models/` e sono gitignorati: copiali da
  `~/.rembg/models/` o lasciali scaricare a `rembg` al primo uso del backend.
- L'API usa `API_PORT`, mai `PORT`: con due processi in un solo comando un
  `PORT` d'ambiente collide con Vite.
- Il proxy di Vite punta a `127.0.0.1`, mai a `localhost`: l'API ascolta su IPv4
  e `localhost` risolve prima a `::1`.
- Il plugin `serveOrtAssets` in `vite.config.js` serve i file di ONNX Runtime
  come statici. Senza, il motore non parte e l'errore parla di "backend non
  disponibile", mandando a cercare nel posto sbagliato.

## Da fare

- Quantizzare i modelli a fp16 per dimezzare i 170 MB del primo scaricamento.
- Account e pagamenti, quando ci sarà qualcuno che paga.
- Estrazione fotogrammi da un video e palette dai colori di un'immagine: gli
  ultimi due servizi gratuiti disegnati e non costruiti.
- Rileggere il tono di tutti i testi dell'interfaccia. Li ho scritti io; la
  voce del marchio la conosci tu.
