# JAYL STUDIO

Prepara i tuoi asset. Sul tuo computer, senza mandare niente in giro.

```bash
npm run dev
```

`http://localhost:5173`.

## Cos'è

Lo strato di post-produzione per chi genera con l'AI: scontorno,
vettorializzazione, ridimensionamento, editor SVG e una libreria dei lavori.

Il pezzo che conta: **lo scontorno gira nel browser**, non su un server. Sulla
macchina di chi lo usa, in circa un secondo, senza che nessun file esca dal suo
computer e senza costo di elaborazione per chi lo offre. È la ragione per cui il
prodotto può stare a 3,99 €/mese senza erodersi i margini.

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

Regola di progetto: **un controllo senza testo d'aiuto non è finito.**

## I lavori

Ogni risultato finisce nella striscia in basso e in `library/` sul disco, con un
nome leggibile. Nessun database: è una cartella, apribile dal Finder. *Scarica*
per il singolo file, *Scarica tutto* per uno zip dell'intera libreria.

## Struttura

```
src/engine/     motore nel browser
  models.js       registro modelli e vincolo di licenza
  compose.js      funzioni pure maschera → alfa (testate in Node)
  capabilities.js rilevamento WebGPU e scelta del livello
  worker.js       ONNX Runtime, gira nel Worker
  client.js       API a promesse verso il worker
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

Quaranta test. Coprono il vincolo di licenza, le funzioni pure del motore, la
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

Il piano successivo (blocco 2) copre la libreria nel browser con cartelle e
moodboard, la vettorializzazione in WASM e la quantizzazione dei modelli a fp16
per dimezzare il primo scaricamento.
