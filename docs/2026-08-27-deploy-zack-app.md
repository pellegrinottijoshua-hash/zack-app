# Deploy su zack-app.com: Cloudflare Pages + R2, e il cambio di nome

> Scritto il 2026-08-27. Prepara la configurazione e i passi; non esegue
> nessun deploy vero — non ho le credenziali dell'account Cloudflare del
> committente e non devo cercarle.

---

## 1. Il fatto che decide tutto

**Cloudflare Pages rifiuta un file sopra 25 MiB.** Misurato oggi:

```
$ du -sh public/models/*.onnx public/ort/*.wasm
168M  public/models/isnet-anime.onnx
170M  public/models/isnet-general-use.onnx
168M  public/models/u2net.onnx
 28M  public/models/upscale-x4.onnx
 25M  public/ort/ort-wasm-simd-threaded.asyncify.wasm
 27M  public/ort/ort-wasm-simd-threaded.jsep.wasm
 16M  public/ort/ort-wasm-simd-threaded.jspi.wasm
 14M  public/ort/ort-wasm-simd-threaded.wasm

$ du -sh public/models public/ort dist
534M  public/models
101M  public/ort
691M  dist
```

`find public -type f -size +25M` ne trova **cinque**, non quattro:

| file | peso | perché sfonda |
|---|---|---|
| `public/models/isnet-general-use.onnx` | 178.648.008 B — 170,4 MiB | modello di scontorno, tier «accelerato» |
| `public/models/isnet-anime.onnx` | 176.069.933 B — 167,9 MiB | modello di scontorno, illustrazioni |
| `public/models/u2net.onnx` | 175.997.641 B — 167,8 MiB | modello di scontorno, tier «compatibilità» |
| `public/models/upscale-x4.onnx` | 29.711.010 B — 28,3 MiB | super-risoluzione |
| `public/ort/ort-wasm-simd-threaded.jsep.wasm` | 27.797.172 B — 26,5 MiB | runtime WASM di ONNX Runtime Web, backend WebGPU |

Il quinto file **non è un modello**: è il runtime di ONNX Runtime Web che fa
girare i modelli nel browser. Non era nell'elenco che mi è stato dato — l'ho
trovato tracciando il codice, sezione 5. `ort-wasm-simd-threaded.asyncify.wasm`
è appena sotto il tetto (24,6 MiB): **da tenere d'occhio**, un aggiornamento di
`onnxruntime-web` lo farebbe sforare senza preavviso.

La risposta resta **Cloudflare R2**: nessun limite di dimensione per oggetto, ed
egress **gratuito** — a differenza di uno storage generico (S3standard: 0,09
$/GB, sezione 3), dove ogni scaricamento di un utente nuovo è un costo diretto
contro un margine di 3,99 €/mese.

---

## 2. Cosa ho preparato nel codice

### 2.1 L'origine dei modelli è configurabile

`src/engine/origine.js` (nuovo, con test in `test/origine.test.js`, 9 casi):
due funzioni pure, `origine(env, chiave, predefinita)` e
`risolviUrl(base, nome)`. Senza variabile d'ambiente restituiscono
esattamente gli URL di oggi (`/models/…`, `/ort/…`): lo sviluppo locale non
cambia comportamento.

`src/engine/models.js` e `src/engine/upscale.js` ora compongono gli URL dei
quattro `.onnx` con `VITE_MODELS_BASE` (predefinita `/models/`).

**In più, non richiesto ma necessario**: `src/engine/worker.js` (riga ~18,
`ort.env.wasm.wasmPaths`) puntava anch'esso a un percorso fisso, `/ort/`. È lì
che vive il quinto file sopra i 25 MiB. Senza toccarlo, la build avrebbe
continuato a spingere `ort-wasm-simd-threaded.jsep.wasm` dentro `dist/` a ogni
deploy — che Cloudflare Pages avrebbe rifiutato lo stesso, con
`VITE_MODELS_BASE` impostata o no. Ho aggiunto una seconda variabile,
`VITE_ORT_BASE` (predefinita `/ort/`), stessa funzione `origine()`. Vedi la
sezione 5 per il dettaglio di questa scoperta.

Verificato che la base personalizzata arrivi davvero nel bundle:

```bash
$ VITE_MODELS_BASE="https://modelli.finto-esempio.test/robaccia" \
  VITE_ORT_BASE="https://runtime.finto-esempio.test/wasm-qui" \
  npm run build
$ grep -o "https://modelli.finto-esempio.test[^\"'\\]*" dist/assets/*.js
dist/assets/app-*.js:https://modelli.finto-esempio.test/robaccia
dist/assets/worker-*.js:https://modelli.finto-esempio.test/robaccia
$ grep -o "https://runtime.finto-esempio.test[^\"'\\]*" dist/assets/*.js
dist/assets/app-*.js:https://runtime.finto-esempio.test/wasm-qui
dist/assets/worker-*.js:https://runtime.finto-esempio.test/wasm-qui
```

Entrambe le basi finiscono nel bundle. Il join esatto (niente barre doppie o
mancanti) è testato a parte in `test/origine.test.js`, non dentro il bundle
minificato — lì la composizione avviene a runtime nel browser, non a build
time, quindi non è una stringa statica da cercare col `grep`.

### 2.2 File di configurazione Cloudflare

- **`wrangler.jsonc`** — JSONC e non TOML: permette i commenti, e qui si
  commenta il perché. Contiene solo `name`, `compatibility_date` e
  `pages_build_output_dir: "dist"`. Non crea il progetto Pages da solo — quello
  è un passo a mano, sezione 4.
- **`public/_headers`** — cache lunga e immutabile su `/assets/*` (hash nel
  nome, Vite li rigenera solo se cambiano) e su `*.onnx`/`*.wasm`, più
  `Content-Type: application/wasm` esplicito sui `.wasm` (ONNX Runtime Web usa
  `instantiateStreaming`, che pretende quel content-type). **Niente
  `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy`** — motivato
  dentro il file stesso e ripreso nella sezione 5.
- **Nessun `public/_redirects`.** Verificato: `src/App.jsx` non usa un router
  (RIPRENDI-QUI.md, sezione 4), e la build produce `dist/index.html` e
  `dist/app/index.html` come pagine separate — il servizio statico di Pages
  risolve `/app/` da solo. Aggiungerne uno senza una necessità misurata
  sarebbe una regola scritta per un problema che non c'è.
- **`dist/` era già in `.gitignore`** (verificato con
  `git check-ignore -v dist` → `.gitignore:2:dist/`). Non ho aggiunto nulla.

### 2.3 Il nome: da «JAYL STUDIO» a «Zack»

Toccato, con lo stesso significato di prodotto in ogni punto:

- `index.html` — `<title>`, meta description (invariata: non nominava già il
  prodotto), `og:title`, `og:description`, più `og:url`
  (`https://zack-app.com/`) e `og:image`, nuovi.
- `app/index.html` — stesso trattamento, `og:url` su
  `https://zack-app.com/app/`. Non aveva meta description né tag `og:` prima:
  aggiunti, non solo rinominati.
- `public/manifest.webmanifest` — `name` e `short_name` diventano `Zack`.
  `description` non nominava il prodotto: lasciata.
- `src/i18n/it.json` e `en.json` — `app.name`.
- `src/landing/copy.js` — la riga di confronto prezzi (`Canva Pro / Adobe /
  JAYL STUDIO`) nella tabella «Il conto» della presentazione: è il prodotto
  stesso messo a confronto, non un riferimento al marchio JAYL.
- `src/engine/models.js` — il commento che spiega il vincolo di licenza
  nominava «JAYL STUDIO» come motivo commerciale; aggiornato per coerenza,
  visto che stavo già editando quel file per il punto 2.1.

**`og:image`**: `public/zack/insegna.webp` (720×538, il logo Zack the Duck su
fondo scuro) è l'unico asset in `public/zack/` pensato per essere un'immagine
sola e riconoscibile fuori contesto — gli altri sono foto di scena. L'ho
convertito in `public/zack/insegna-og.png` (stesso contenuto, solo formato):
alcuni crawler social non leggono ancora WebP negli `og:image` in modo
affidabile, e un tag che non si apre su una piattaforma è peggio di uno che
manca. **Non è 1200×630** (il rapporto "standard" dei social card): è quello
che c'è, va bene per il lancio, non ho generato un'immagine nuova che nessuno
ha approvato.

**Cosa NON ho toccato, e perché:**

- **`src/App.jsx`, righe 1086 e 1105** — l'intestazione vera dello studio,
  quella che si vede aprendo l'app, scrive `JAYL <em>STUDIO</em>` come JSX
  letterale, non legge `app.name` da i18n. È per questo che dopo aver
  cambiato l'i18n il titolo della scheda del browser è diventato «Zack» (l'ho
  visto nel browser) ma l'intestazione in pagina no. **File fuori dal mio
  perimetro**: la scritta resta com'era, e la scelta di come diventerà
  «Zack» in quel punto specifico (con o senza un secondo elemento tipografico
  come `<em>STUDIO</em>`) tocca a chi ci sta lavorando.
- **`src/components/VectorTools.jsx`, riga 213** — un badge `"JAYL"` su una
  sezione dell'editor SVG. Non è chiaro se indichi il marchio (asset da
  jayl.store, da lasciare) o sia un residuo del vecchio nome prodotto: non
  l'ho toccato perché indovinare qui costa più che chiedere.
- **Payoff, palette, font** — non toccati, per istruzione esplicita: *Art
  finds a way* e i colori JAYL restano, è il nome del software a cambiare.
- **`docs/`, `README.md`, `RIPRENDI-QUI.md`** — nominano «JAYL STUDIO»
  decine di volte come documentazione interna del progetto, non superficie
  vista dal cliente finale. Riscriverli tutti non era nel perimetro del
  compito e avrebbe reso enorme un cambiamento che doveva restare piccolo e
  verificabile.
- **`package.json` → `"name": "jayl-studio"`** — identificativo interno npm,
  non una superficie utente; e la cartella del repo non va rinominata per
  istruzione esplicita.
- **Icone e logo** (`icona-192.png`, `favicon-*.png`, `apple-touch-icon.png`)
  — restano quelli attuali: cambiare l'artwork dell'icona è una decisione
  visiva, non un rename, e non mi è stata chiesta.

---

## 3. Il conto

**Peso del primo avvio — non tutti i modelli, solo quello che serve davvero.**
`src/engine/capabilities.js` sceglie il modello di default in base al livello:
`isnet-general-use` se il browser ha WebGPU (tier «accelerato», il caso comune
su desktop moderno), altrimenti `u2net` (tier «compatibilità»). `worker.js`
sceglie di conseguenza il runtime ONNX: backend `webgpu` → il `.wasm` con JSEP,
backend `wasm` → quello semplice.

| tier | modello | runtime ORT | totale |
|---|---|---|---|
| accelerato (WebGPU) | isnet-general-use — 170,4 MiB | jsep.wasm + jsep.mjs — 26,5 MiB | **≈ 197 MiB (≈ 206 MB)** |
| compatibilità | u2net — 167,8 MiB | wasm + mjs — 13,3 MiB | **≈ 181 MiB (≈ 190 MB)** |

**Nota sul metodo**: questi numeri vengono dalla dimensione dei file misurata
oggi e dal percorso di codice tracciato a mano (`defaultModelFor`, la scelta
di `provider` in `worker.js`), non da una cattura di rete reale — ho provato
ad aprire `/app/`, lanciare uno scontorno vero nel browser (screenshot
confermato: la maglietta di prova si scontorna correttamente con
`origine.js` in mezzo) e leggere le richieste HTTP, ma lo strumento di
ispezione rete non vede le richieste fatte dentro il Web Worker — sono
davvero invisibili a quello strumento, non "probabilmente" assenti. Il metodo
via codice resta valido; segnalo il limite invece di presentare una misura
che non ho fatto.

**Costo egress se NON fosse su R2.** Tariffa pubblica AWS S3 standard 2026:
0,09 $/GB in uscita (dopo i primi 100 GB/mese gratuiti). Un nuovo utente che
prova lo scontorno una volta (tier accelerato, ≈ 0,197 GB) costerebbe **≈
0,018 $** di solo egress — pochi centesimi, che sembrano nulla finché non si
guarda la scala:

- **10.000 prove gratuite in un mese** (numero illustrativo, non misurato: è
  l'ordine di grandezza plausibile per uno strumento pensato apposta per
  attirare chi non si è ancora abbonato — RIPRENDI-QUI.md, sezione 2) → 1.970
  GB → **≈ 177 $ (≈ 163 €)** di egress, se venisse da uno storage a
  pagamento.
- 163 € è l'incasso di **circa 41 abbonati** in un mese — e chi prova lo
  strumento gratis non ha ancora pagato niente. È esattamente il meccanismo
  descritto nel compito: il margine di un prodotto a 3,99 €/mese può sparire
  prima che qualcuno si sia abbonato.
- **Su R2**: 0 $, a qualunque volume.

**Costo di R2 stesso** (per completezza, non per confronto): storage
Standard 0,015 $/GB-mese. L'intera libreria di modelli + runtime pesa ≈ 0,62
GB → **meno di un centesimo al mese** — e sotto il livello gratuito di R2 (10
GB-mese) è letteralmente zero.

Fonti consultate il 2026-08-27: pricing pubblico Cloudflare R2
(cloudflare.com/products/r2) e AWS S3 (pagine di pricing citate dalla ricerca
web di questa sessione) — non dall'account del committente, non richiede
login.

---

## 4. I passi a mano — quelli che richiedono il tuo login Cloudflare

Nell'ordine. Sostituisci `zack-assets` col nome bucket che preferisci: è
usato coerentemente sotto.

1. **Crea il progetto Pages.** Dashboard Cloudflare → Workers & Pages →
   Create → Pages → Connect to Git → scegli il repo `jayl-studio`.
   (In alternativa, da terminale: `wrangler pages project create zack-app`.)
2. **Comando di build**: `npm run build && rm -rf dist/ort dist/models`.
   Il `rm -rf` in coda non è pulizia estetica: `scripts/stage-ort.js` gira in
   automatico a ogni `npm install`/`npm run build` (hook `postinstall` e
   `prebuild` in `package.json`) e rigenera `public/ort/` da
   `node_modules/onnxruntime-web/dist` **a ogni build**, quindi anche in CI —
   portando con sé di nuovo il file da 26,5 MiB. Senza toglierlo da `dist/`
   prima dell'upload, Pages rifiuta il deploy anche con `VITE_ORT_BASE`
   impostata: la variabile decide da dove l'app *legge* a runtime, non cosa
   finisce nella cartella pubblicata. `public/models/` invece è già escluso
   da git (vedi `.gitignore`) e in una build pulita di Cloudflare non esiste
   proprio: quel `rm -rf` è difensivo, per chi facesse mai un deploy manuale
   da una macchina che li ha scaricati in locale.
3. **Cartella di output**: `dist` (già impostata anche in `wrangler.jsonc`
   come `pages_build_output_dir`, ma il pannello Pages con l'integrazione
   Git la vuole comunque compilata a mano nel form).
4. **Variabili d'ambiente di build** (pannello Pages → Settings →
   Environment variables — vanno impostate PRIMA del deploy che deve
   usarle, un rebuild successivo non basta a farle leggere se il primo era
   partito senza):
   - `VITE_MODELS_BASE` = `https://assets.zack-app.com/models/`
   - `VITE_ORT_BASE` = `https://assets.zack-app.com/ort/`
5. **Crea il bucket R2** (una volta sola): dashboard → R2 → Create bucket →
   nome `zack-assets`. Oppure `wrangler r2 bucket create zack-assets`.
6. **Collega il bucket a un dominio pubblico**: R2 → bucket `zack-assets` →
   Settings → Custom Domains → Connect Domain → `assets.zack-app.com`. Serve
   perché l'URL "r2.dev" di sviluppo non è pensato per produzione (rate limit
   più basso, nessuna garanzia di stabilità) — lo dice Cloudflare stessa nella
   sua UI.
7. **Collega il dominio `zack-app.com`** al progetto Pages: progetto Pages →
   Custom domains → Set up a custom domain → `zack-app.com`. Ripeti per
   `www.zack-app.com`: Cloudflare propone da solo il redirect verso quello
   primario, non serve una regola scritta a mano in `_redirects`.
8. **DNS**: se il dominio è già su Cloudflare (lo è: comprato lì), i passi 6 e
   7 creano da soli i record CNAME necessari — non c'è un record da scrivere
   a mano a parte confermare quello che il pannello propone. Se in futuro il
   dominio dovesse gestire DNS altrove, servirebbe un CNAME `zack-app.com` →
   il target `*.pages.dev` mostrato dal passo 7, e uno per
   `assets.zack-app.com` → il target R2 mostrato dal passo 6.
9. **Primo deploy**: salva, lancia il build dal pannello (o
   `git push` sul branch collegato). Il primo tentativo fallirà se i passi
   5-6 non sono ancora fatti — le URL di `VITE_MODELS_BASE`/`VITE_ORT_BASE`
   punterebbero a un dominio che non esiste ancora, e l'app si aprirebbe con
   scontorno e ingrandimento rotti (404 silenziosi, non un crash: è
   esattamente il rischio per cui esiste `src/engine/origine.js`, non basta
   evitarlo lì, va evitato anche nell'ordine dei passi).

---

## 5. Caricare i modelli su R2

Dalla cartella del progetto, con `wrangler` autenticato (`wrangler login`,
passo che fai tu):

```bash
# I quattro modelli di scontorno/ingrandimento
wrangler r2 object put zack-assets/models/u2net.onnx \
  --file=public/models/u2net.onnx --content-type=application/octet-stream --remote
wrangler r2 object put zack-assets/models/isnet-general-use.onnx \
  --file=public/models/isnet-general-use.onnx --content-type=application/octet-stream --remote
wrangler r2 object put zack-assets/models/isnet-anime.onnx \
  --file=public/models/isnet-anime.onnx --content-type=application/octet-stream --remote
wrangler r2 object put zack-assets/models/upscale-x4.onnx \
  --file=public/models/upscale-x4.onnx --content-type=application/octet-stream --remote

# Tutto il runtime ONNX Runtime Web (26 file fra .wasm e .mjs): più semplice
# e più sicuro caricarli tutti che indovinare quali il browser sceglierà —
# la scelta dipende da feature detection (SIMD, thread, JSPI) che cambia da
# browser a browser.
for f in public/ort/*.wasm; do
  wrangler r2 object put "zack-assets/ort/$(basename "$f")" \
    --file="$f" --content-type=application/wasm --remote
done
for f in public/ort/*.mjs; do
  wrangler r2 object put "zack-assets/ort/$(basename "$f")" \
    --file="$f" --content-type=text/javascript --remote
done
```

`--remote` è necessario nelle versioni recenti di `wrangler` per scrivere sul
bucket vero invece che sulla simulazione locale di R2 usata per lo sviluppo
dei Workers — se la tua versione lo rifiuta come opzione sconosciuta,
toglilo, significa che nella tua versione è già il comportamento predefinito.

**Ripetere dopo ogni aggiornamento dei modelli.** Non c'è sincronizzazione
automatica: se un modello cambia in locale, il bucket resta con la versione
vecchia finché non rilanci il comando per quel file. È lo stesso compromesso
già scelto per Brain-come-ponte (docs/2026-08-27-brain-come-ponte.md): un
gesto esplicito invece di una sincronizzazione che nessuno ha chiesto.

**CORS sul bucket** — senza, il browser scarica l'HTML dell'errore CORS al
posto del modello, e ONNX Runtime lo prova a interpretare come un file
`.onnx`: un errore di parsing binario che non dice niente sulla vera causa.

```bash
wrangler r2 bucket cors put zack-assets --rules '[
  {
    "AllowedOrigins": ["https://zack-app.com", "https://www.zack-app.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]'
```

Aggiungi `"http://localhost:5173"` alla lista di `AllowedOrigins` solo se vuoi
testare in locale contro il bucket vero impostando `VITE_MODELS_BASE`/
`VITE_ORT_BASE` in un `.env` locale — per lo sviluppo normale non serve, i
valori predefiniti (`/models/`, `/ort/`) restano quelli di sempre.

---

## 6. La scoperta non prevista: il runtime ORT ha lo stesso problema dei modelli

Il compito mi chiedeva di rendere configurabile l'origine dei **modelli**
(`models.js`, `upscale.js`). Tracciando `worker.js` per capire se serve
l'isolamento cross-origin (punto richiesto separatamente) ho trovato che
`ort.env.wasm.wasmPaths = '/ort/'` ha **esattamente lo stesso problema**: uno
dei file che serve (`ort-wasm-simd-threaded.jsep.wasm`, 26,5 MiB) sfonda il
tetto di Cloudflare Pages da solo, e quel percorso non era nell'elenco che mi
è stato dato. Senza intervenire lì, tutto il resto di questo documento
avrebbe descritto un deploy che fallisce comunque al primo `wrangler pages
deploy` — non per i modelli, per il runtime che li fa girare.

Ho esteso lo stesso meccanismo (`src/engine/origine.js`, variabile
`VITE_ORT_BASE`) invece di lasciare il problema scritto solo in questo
documento, perché **worker.js non è fra i file che mi è stato detto di non
toccare** e la correzione è minima: tre righe, stesso pattern già rivisto e
testato per i modelli. Se preferisci che questa parte fosse rimasta fuori
dalla mia consegna, è la riga `ort.env.wasm.wasmPaths` in
`src/engine/worker.js` da rivedere — il resto del deploy funziona lo stesso a
prescindere da questa scelta, cambia solo se il file da 26,5 MiB resta un
problema aperto o no.

Sull'isolamento cross-origin che ha fatto scoprire questo: **non l'ho
attivato**. `node_modules/onnxruntime-web/dist/ort.webgpu.mjs` controlla da
solo `crossOriginIsolated` e, se manca, riporta `numThreads` a 1 invece di
rompersi — l'ho letto nel sorgente, riga con
`"env.wasm.numThreads is set to " + numThreads + ", but this will not work
unless you enable crossOriginIsolated mode"`. Il tier «accelerato» (WebGPU,
quello di default su un browser moderno) non passa comunque da lì. Il
guadagno di `COOP: same-origin` + `COEP: require-corp` è solo il
multi-thread WASM per il tier «compatibilità»; il costo è che `COEP:
require-corp` blocca ogni risorsa cross-origin priva di
`Cross-Origin-Resource-Policy` — inclusi, da subito, i modelli su R2 (che a
quel punto avrebbero bisogno anche loro di un header in più) e, da
verificare, i font di Google Fonts caricati in `index.html`/`app/index.html`.
Il rapporto costo/guadagno non regge; il ragionamento completo sta nel
commento in cima a `public/_headers`.

---

## 7. Cosa resta aperto, con la mia raccomandazione

**Modelli a fp16.** Dimezzerebbero il peso di tutti e quattro i file (isnet
passerebbe da ~170 MiB a ~85 MiB). **Raccomando di farlo**, dopo questo
deploy e non prima: è lavoro di conversione dei pesi (quantizzazione,
riverifica della qualità della maschera), non configurazione, e tocca la
soglia di `holes.js` che RIPRENDI-QUI.md segnala già come «provvisoria e non
misurata» — le due cose vanno misurate insieme, non una alla cieca prima
dell'altra. Col deploy su R2 il costo economico di 170 MiB contro 85 non
cambia (egress gratuito comunque): il guadagno di fp16 è tutto per
l'utente, nel tempo di attesa al primo avvio, non per il conto.

**Un solo modello di scontorno invece di tre.** **Raccomando di NON farlo.**
`u2net` (320px) esiste perché i modelli a 1024px hanno bloccato il tab per
oltre tre minuti nel tier senza WebGPU — non è ridondanza, è l'unico modello
che quel livello di hardware regge (RIPRENDI-QUI.md, sezione 5).
`isnet-anime` è addestrato per le illustrazioni, un contenuto diverso da
quello generico. Toglierne due per risparmiare peso taglierebbe una
capacità del prodotto per un risparmio che l'egress gratuito di R2 ha già
azzerato in termini di costo — il fp16 sopra ottiene lo stesso guadagno di
peso senza perdere niente.

---

## 8. Cosa NON fa questo documento

- **Non esegue nessun deploy.** Ogni comando `wrangler` va lanciato da chi ha
  accesso all'account: non ho credenziali e non le ho cercate.
- **Non crea il bucket, il progetto Pages o i domini.** Li descrive con il
  nome esatto da usare, perché i comandi degli altri passi restino coerenti.
- **Non genera un'immagine `og:image` nuova.** Riusa un asset esistente,
  solo convertito di formato.
- **Non tocca `App.jsx` (l'intestazione «JAYL STUDIO» in pagina) né
  `VectorTools.jsx` (il badge «JAYL»)** — segnalati in sezione 2.3, non
  decisi al posto di chi ci lavora.
- **Non fa la conversione fp16 né la riduzione a un modello solo** — sono
  raccomandazioni con la ragione scritta, non lavoro svolto.
