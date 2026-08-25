# JAYL STUDIO

Prepara i tuoi asset. Sul tuo computer, senza mandare niente in giro.

```bash
npm run dev
```

`http://localhost:5173`.

## Cos'è

Lo strato di post-produzione per chi genera con l'AI. **Sei servizi in due
gruppi**, e la divisione non è cosmetica:

| sul tuo computer | a consumo |
|---|---|
| Scontorna · Vettorializza · Editor SVG | Immagine · Video · Suono |
| illimitati, inclusi nei 3,99 €/mese | si paga a generazione, prezzo scritto prima |

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

- **Cartelle** per organizzare. Eliminarne una **non cancella i lavori**: li
  riporta fuori dalle cartelle.
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
src/store/      libreria e contabilità
  ledger.js       saldo in centesimi, prenota/conferma/rilascia (testato in Node)
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

Novanta test. Coprono il vincolo di licenza, le funzioni pure del motore, la
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
- La sezione effetti sonori: registri la voce, l'app estrae il ritmo in locale e
  lo applica a un timbro. Disegno deciso, costruzione rimandata.
- Account e pagamenti, quando ci sarà qualcuno che paga.
