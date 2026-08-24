# JAYL CRAFT

Canva e Adobe in locale. Tutto gira su questa macchina: nessuna API esterna,
nessun abbonamento, nessun file che lascia il disco. Licenze MIT/Apache.

```bash
npm run dev
```

`http://localhost:5173`. Un comando, due processi: API Fastify su `:5174`,
Vite su `:5173`.

## I tre strumenti

**Scontorna** — rimozione sfondo con reti neurali locali (`rembg`). Cinque
modelli, da `u2net` (veloce) a `birefnet-general` (massima qualità).

**Vettorializza** — da pixel a SVG (VTracer). Tre modalità: Poster, Foto,
Bianco e nero.

**Editor SVG** — selezione, penna, matita, forme, testo, livelli, raggruppa,
z-order, annulla/ripeti. Costruito su `@svgedit/svgcanvas`, il core headless di
SVG-Edit.

## File grandi

Un file di stampa 3661×4843 **non viene rimpicciolito**. La rete analizza una
copia ridotta (1024/1536/2048 px a scelta), la maschera risultante viene
riportata a piena risoluzione con Lanczos e applicata come canale alfa
all'originale, i cui pixel non vengono mai ricampionati.

In pratica: **~9 secondi per un 3661×4843**, lo stesso costo di un 1536 px.

## Trasparenza e vettoriale

Vettorializzare un PNG trasparente è il caso in cui quasi tutti i tool
sbagliano: appiattiscono su bianco e restituiscono un quadrato bianco attorno
al disegno. Qui l'immagine viene prima ritagliata sul contenuto, poi il canale
alfa viene tracciato a parte e applicato come `clipPath` vettoriale. La
trasparenza sopravvive.

Se un tracciato non trova nessuna forma (tipico di "Bianco e nero" su un
soggetto chiaro su fondo chiaro) l'operazione **fallisce con un messaggio**
invece di salvare un SVG vuoto che sembra un successo.

## I lavori

Ogni risultato finisce nella striscia in basso **e in `library/` sul disco**,
con un nome leggibile. Nessun database: è una cartella, apribile dal Finder.

- **Scarica** — il singolo file
- **Scarica tutto (zip)** — l'intera libreria
- **Apri** — rimanda un SVG dentro l'editor

## Export

`gelato-front` 3661×4843 e A4 300 dpi per la stampa; 1:1, 4:5, 9:16, 16:9 per i
social; 1200×630 e 512×512 per il web. Sfondo trasparente, nero, panna o bianco.

**Il raster non viene mai ingrandito** oltre la risoluzione della sorgente: se
la grafica è troppo piccola viene centrata e segnalata, non sgranata. I
**vettori invece sì**, perché possono: un SVG viene rasterizzato a una densità
calcolata sul formato di destinazione.

## Design

Palette e type system presi da `~/Desktop/Jayl brand/brand identity/`: nero
`#111111` dominante, panna `#F5F0E8`, grigio `#8A8A85`, oro `#C4A35A` sotto il
10%. Space Grotesk per la UI, Cormorant Garamond per l'editoriale.

Unica deroga consapevole: la scacchiera della trasparenza è **grigia**, non
nera. Il nero è il colore dominante del brand, e su una scacchiera scura
un'opera nera sarebbe invisibile — cioè il contrario del lavoro di questo tool.

## Struttura

```
src/            frontend React (Vite)
server/
  index.js      rotte
  jobs/         removeBg, vectorize, export
  lib/          library (i lavori su disco), paths
py/             ambiente Python gestito da uv (rembg + onnxruntime)
library/        i tuoi lavori — gitignorata
test/           smoke test sugli endpoint reali
```

`rembg` gira come **sottoprocesso** lanciato da Node via `uv`, non come terzo
server: un pezzo mobile in meno da tenere vivo.

## Test

```bash
npm test
```

Dieci test sugli endpoint veri, incluso uno scontorno reale su un'immagine
3000×2000 che verifica la strategia a maschera e la risoluzione in uscita. Il
primo giro scarica i modelli.

## Note operative

- Il primo uso di ogni modello scarica i pesi (qualche centinaio di MB). Poi è
  tutto offline.
- L'API usa `API_PORT`, mai `PORT`: con due processi in un solo comando un
  `PORT` d'ambiente collide con Vite.
- Il proxy di Vite punta a `127.0.0.1`, mai a `localhost`: l'API ascolta su
  IPv4 e `localhost` risolve prima a `::1`.
