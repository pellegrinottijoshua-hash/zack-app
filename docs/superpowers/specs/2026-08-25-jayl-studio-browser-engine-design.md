# JAYL STUDIO — motore nel browser e libreria degli asset

**Data:** 2026-08-25
**Stato:** approvato, pronto per il piano di implementazione
**Copre:** blocco 1 (motore nel browser) + blocco 2 (libreria e moodboard)

---

## 1. Il problema

`jayl-craft` funziona bene ma gira solo in locale, su una macchina sola, e ogni
elaborazione passa da un processo Python. Per diventare un servizio venduto a
**3,99 €/mese** servono due cose che oggi non ha: girare nel browser di
chiunque, e non costare nulla per elaborazione.

Il vincolo economico determina l'architettura, non il contrario. A 3,99 € netti
restano circa **3,50 € di calcolo per cliente al mese**. Qualunque funzione con
un costo marginale per uso deve o stare fuori dal prezzo base, o non esistere.

## 2. Posizionamento

Non "un Canva più economico". **Lo strato di post-produzione per chi genera con
l'AI.**

Chi lavora con Higgsfield, Midjourney o Suno ha già i generatori. Non ha un
posto veloce ed economico dove *pulire, ritagliare, vettorializzare,
ridimensionare in blocco, organizzare ed esportare* la valanga di asset che
quegli strumenti producono. Oggi lo fa a mano tra Photoshop, Canva e cartelle
sul Desktop.

Quella parte è deterministica: costo marginale quasi zero, margine quasi pieno.
È l'opposto della trappola generativa.

Due clienti, entrambi già raggiungibili:

- **AI director** — deve mantenere un soggetto coerente su decine di shot
- **Venditore print-on-demand** — deve declinare un design su dodici prodotti

## 3. Cosa abbiamo verificato (non assunto)

Misurato il 2026-08-25 su MacBook Air M5, 16 GB, Chromium, immagine 2000×2000.
Codice della sonda: usa-e-getta, non conservato.

| modello | licenza | backend | a regime | esito |
|---|---|---|---|---|
| `isnet-general` 1024px | Apache-2.0 | WebGPU | **1,84 s** | ritaglio corretto |
| `u2net` 320px | Apache-2.0 | WebGPU | **0,40 s** | ritaglio corretto |
| `u2net` 320px | Apache-2.0 | WASM | **5,74 s** | corretto, lento |
| `birefnet-lite` fp16 1024px | MIT | WebGPU | — | **non eseguibile** |

**Conclusione: l'ipotesi regge.** Un ritaglio di qualità piena gira nel browser
del cliente in meno di due secondi, a costo marginale zero, con licenza
commercialmente pulita.

### Vincoli emersi dalla misura

1. **BiRefNet non gira in WebGPU.** Richiede 11 storage buffer per shader; Apple
   via Metal ne espone 10. Non aggirabile da configurazione. Diventa la
   differenza fra piano base e premium lato server: il limite tecnico disegna il
   listino.
2. **Il thread principale non è utilizzabile.** Durante il test l'inferenza WASM
   a 1024px ha bloccato il tab per oltre tre minuti. Il Web Worker è
   obbligatorio, non un'ottimizzazione.
3. **Senza WebGPU si crolla di 14×.** A 1024px in WASM il tempo è inaccettabile.
4. **`isnet` non usa la normalizzazione ImageNet** ma media 0,5 / dev 1,0, e
   rembg divide per il massimo effettivo dell'immagine, non per 255. Sbagliarlo
   produce una maschera completamente errata *senza errori a runtime*.

### Vincolo di licenza da difendere

`bria-rmbg` è **non commerciale** ed è il default della CLI di `rembg`. Non è
esposto e passiamo sempre `-m` esplicito, ma oggi è vero per caso. Va reso vero
per progetto, con un test che fallisce se un modello non commerciale entra
nell'elenco.

Modelli ammessi, tutti verificati il 2026-08-25:

| modello | licenza | fonte |
|---|---|---|
| `u2net` | Apache-2.0 | xuebinqin/U-2-Net |
| `isnet-general-use` | Apache-2.0 | xuebinqin/DIS |
| `isnet-anime` | Apache-2.0 | SkyTNT/anime-segmentation (dataset AniSeg anch'esso Apache-2.0) |
| `birefnet-*` | MIT | ZhengPeng7/BiRefNet |

Escluso esplicitamente: `bria-rmbg` (non commerciale). Escluso anche
`u2net_portrait`, che pur venendo dallo stesso repo Apache-2.0 è addestrato su
APDrawing, dataset con vincolo non commerciale.

## 4. Architettura

**Una SPA statica.** Il nucleo — motore, libreria, moodboard — gira interamente
nel browser. Nessun server, quindi nessun costo, quindi 3,99 € restano margine.

```
┌─ UI (React) ──────────────────────────────┐
│  i18n IT/EN · tutorial per controllo      │
└───────────┬───────────────────────────────┘
            │ postMessage
┌───────────▼─── Worker: motore ────────────┐
│  ONNX Runtime Web (WebGPU → WASM)         │
│  VTracer WASM                             │
│  compositing maschera a piena risoluzione │
└───────────┬───────────────────────────────┘
            │
┌───────────▼─── Persistenza (browser) ─────┐
│  OPFS      file (originali, ritagli…)     │
│  IndexedDB metadati, cartelle, moodboard  │
│  Cache API pesi dei modelli               │
└───────────────────────────────────────────┘
```

Il server comparirà nei blocchi 4 e 5 e solo per ciò che *deve* costare:
BiRefNet premium, generazione, account. Fuori da questo spec.

### Perché non riusiamo il backend Fastify esistente

Resta, ma cambia ruolo: diventa la modalità "desktop/locale" e la base del
futuro premium. Il prodotto venduto non ne dipende.

## 5. Blocco 1 — il motore

### 5.1 Rilevamento capacità

All'avvio, una volta, il worker determina il livello:

| condizione | livello | modello | atteso |
|---|---|---|---|
| WebGPU presente | `accelerato` | `isnet-general` 1024px | ~2 s |
| solo WASM | `compatibilità` | `u2net` 320px | ~6 s |

Nel livello `compatibilità` l'interfaccia mostra un avviso **esplicito e non
liquidabile**: che il browser non ha l'accelerazione, che l'elaborazione sarà
più lenta e meno precisa, e come rimediare. Non lo nascondiamo: un utente che
crede di avere la qualità piena e non ce l'ha diventa una recensione negativa.

### 5.2 Gestione dei modelli

I pesi si scaricano una volta e restano nella **Cache API**, con avanzamento
visibile: è il primo minuto di vita del cliente e deve essere spiegato, non
subito.

**I modelli vanno quantizzati a fp16 prima del lancio.** 170 MB per `isnet` è
troppo; l'obiettivo è ~85 MB. La quantizzazione è un'attività del piano, con
verifica che la qualità non degradi.

### 5.3 Pipeline di ritaglio

Identica per principio a quella già in produzione in locale, portata nel worker:

1. ridimensiona una copia alla dimensione d'ingresso del modello
2. normalizza **con i parametri del modello** (vedi vincolo 4)
3. inferenza
4. riporta la maschera a piena risoluzione
5. applica la maschera come canale alfa **sui pixel originali**

Il punto 5 è la garanzia di prodotto: la risoluzione della sorgente non viene
mai ricampionata, quindi un file di stampa 3661×4843 esce a 3661×4843.

**Nota implementativa che è già costata un bug:** in Node, `sharp.joinChannel`
scarta silenziosamente la maschera restituendo tre canali. Nel browser il
compositing va fatto per interleave esplicito su `ImageData`, e verificato da un
test che controlla i valori alfa, non solo che l'operazione non sollevi errori.

### 5.4 Vettorializzazione

VTracer in WebAssembly. Due candidati, entrambi MIT, da **misurare** nel piano:

- `@neplex/vectorizer-wasm32-wasi` — API identica a quella già usata in Node,
  10,8 MB
- `@visioncortex/vtracer` — build ufficiale, 0,7 MB, ma in alpha

Criterio di scelta: se la build alpha produce lo stesso risultato dei test
attuali, vince per il peso; altrimenti si prende la parità di API.

Va portato anche il comportamento già risolto in locale: **ritaglio del
trasparente e maschera alfa vettoriale come `clipPath`**, altrimenti un PNG
trasparente produce un quadrato bianco. E il rifiuto esplicito di un tracciato
vuoto invece di salvare un SVG che sembra riuscito.

## 6. Blocco 2 — libreria e moodboard

### 6.1 Il modello dati

Un **asset** non è un file: è l'originale, il suo ritaglio, e tutto ciò che ne
deriva.

```
Asset
  id, nome, creatoIl
  originale      → OPFS
  ritaglio       → OPFS (opzionale)
  derivati[]     → OPFS (export per formato)
  tag[], cartellaId, moodboardId[]
  provenienza    { operazione, modello, parametri }
```

`provenienza` non è telemetria: serve a rifare la stessa operazione su un altro
file, e nel blocco 5 a rendere coerenti le generazioni.

**Cartelle** organizzano. Una **moodboard** raggruppa asset con una palette e
delle note, e diventa il contesto che nel blocco 5 renderà coerenti le
generazioni successive. È la ragione per cui la libreria viene prima della
generazione e non dopo.

### 6.2 Persistenza

**OPFS** per i file, **IndexedDB** per i metadati. Zero storage a carico nostro.

Due obblighi non negoziabili, perché i dati stanno sul disco del cliente:

1. **Export completo sempre a un clic** — l'intera libreria in zip, senza
   passare da un server
2. **Avviso chiaro e permanente** che svuotare i dati del browser cancella tutto

Il primo cliente che perde il lavoro senza essere stato avvisato costa più di
quanto valga la funzione che gli abbiamo risparmiato.

### 6.3 Operazioni in blocco

Il batch è il prodotto, non un accessorio: "ritaglia questi 40 asset, esportali
in 6 formati". È la differenza fra due ore e due minuti, ed è ciò che Canva non
fa e Adobe fa pagare caro. Va progettato nel worker fin dall'inizio — aggiungere
il batch dopo significa riscrivere il motore.

## 7. Lingua e tutorial

**IT/EN dall'inizio.** L'internazionalizzazione innestata a posteriori richiede
di ripassare ogni stringa di ogni componente: si fa ora perché ora costa poco.

**Un tutorial per ogni controllo**, in entrambe le lingue, scritto insieme al
controllo e non alla fine. Regola pratica: un controllo senza il suo testo di
aiuto non è considerato finito.

## 8. Rinomina (fatta)

- `~/jayl-craft` → `~/jayl-studio`
- `~/jayl-studio` (portfolio) → `~/pellegrinotti-com`

Il repo GitHub del portfolio si chiamava già `pellegrinotti-com`: solo la
cartella locale era disallineata, quindi nessun remote toccato. Il venv Python
contiene percorsi assoluti ed è stato ricreato. Test: 10/10 dopo la rinomina.

## 9. Come si verifica

Il criterio non è "funziona sulla mia macchina":

1. **Test di licenza** — fallisce se un modello non commerciale entra nell'elenco
2. **Test del motore** — su un'immagine sintetica, la maschera deve produrre
   angoli trasparenti e soggetto opaco, e l'uscita deve avere le dimensioni della
   sorgente
3. **Test di parità** — lo stesso file, stesso modello, deve dare via browser e
   via backend locale una maschera con **IoU ≥ 0,98** e differenza media per
   pixel del canale alfa **≤ 2/255**. Numeri, non impressioni: senza una soglia
   dichiarata "sembra uguale" diventa il criterio, ed è come si accumulano
   regressioni invisibili.
4. **Test del livello di compatibilità** — forzando WASM, il flusso completa e
   l'avviso appare
5. **Test della persistenza** — un asset salvato sopravvive al ricaricamento; e
   l'export completo contiene tutto

Il punto 3 è quello che protegge davvero: abbiamo già un backend funzionante che
sa dare la risposta giusta, e va usato come riferimento.

## 10. Cosa NON entra

Account, pagamenti, generazione di immagini, musica, effetti sonori, video.
Nessuno serve per avere qualcosa di usabile e vendibile, e ognuno introduce
costi ricorrenti o dipendenze legali che non vogliamo nel primo blocco.

Per memoria, deciso ma rimandato:

- **Immagini** — FLUX.1 **schnell** (Apache-2.0). FLUX.1 dev è non commerciale
  senza licenza a pagamento.
- **Effetti sonori** — Stable Audio Open, commerciale gratuito sotto 1 M$ di
  fatturato.
- **Musica** — MusicGen è **CC-BY-NC**, vietato commercialmente anche
  self-hosted. Un "Suno gratuito" non esiste: serve un fornitore a pagamento o
  la chiave dell'utente.
- **Video** — solo BYOK. A 0,05–0,50 $/secondo, sette video bruciano un
  abbonamento da 3,99 €. Non ci sta in nessuno scenario.
- **ToS di fal** — da leggere prima di qualunque integrazione, non dopo. Non
  verificati.
