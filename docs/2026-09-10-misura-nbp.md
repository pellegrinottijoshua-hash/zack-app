# Nano Banana Pro, misurato

> Task 0 del piano di B2. Misurato il 2026-09-10 da un portatile in Italia,
> con la chiave vera. Sedici generazioni, circa 2 €.
>
> Serviva a rispondere a una domanda sola — *`/genera` può essere una richiesta
> sola?* — e ne ha rovesciate altre quattro, tutte cose che avrebbero rotto il
> Task 4 in produzione.

---

## Il verdetto

**Sì, una richiesta sola.** Mediana **18,1 s** a 1K, **21,2 s** a 2K, con un
peggiore di 26,9 s. Il limite della spec è trenta secondi; il cancello del
piano era venti, e il 2K lo supera — ma di tre secondi, su un caso peggiore che
resta sotto il limite vero.

Il § 6.3 della spec **regge**. Non serve il giro in due tempi.

⚠️ **Con poco margine, però.** Fra 21,2 e 30 ci sono nove secondi, e dentro
quei nove secondi devono starci: il caricamento dei riferimenti dal browser al
Worker, e dal Worker a Google. È il motivo della decisione sul
ridimensionamento, più sotto.

---

## Quattro cose che avrebbero rotto il Task 4

### 1. `thinkingLevel` non esiste

```
400  Invalid JSON payload received. Unknown name "thinkingLevel"
```

Tre volte su tre, in 0,1 secondi. Il piano lo metteva in `generationConfig`
citando una guida di ottimizzazione: **ogni singola generazione sarebbe
fallita.** Nessuno avrebbe perso denaro — il rimborso del § 6.3 avrebbe fatto
il suo lavoro — ma il servizio non avrebbe funzionato una volta sola, e il
difetto si sarebbe visto solo col primo cliente.

`imageConfig` invece funziona. Era solo l'altro campo a essere inventato.

### 2. L'immagine torna in JPEG

Il listino dichiarava `resa: 'png'`. Google risponde `image/jpeg`, sempre, in
tutte e sedici le chiamate.

### 3. `costo_reale` era un giro a vuoto

Il piano scriveva `costoReale: voce.costo`: registrava **la stima come se
fosse il costo vero**. Un numero che non prova niente — e il § 4.2 della spec
esiste apposta perché *«di ogni euro, Zack ne rimette 12 centesimi»* sia una
promessa dimostrabile.

La risposta di Google porta tutto il necessario:

```json
{"promptTokenCount":1314,"candidatesTokenCount":1286,"totalTokenCount":2879,
 "promptTokensDetails":[{"modality":"TEXT","tokenCount":24},{"modality":"IMAGE","tokenCount":1290}],
 "candidatesTokensDetails":[{"modality":"IMAGE","tokenCount":1120}],
 "thoughtsTokenCount":279,"serviceTier":"standard"}
```

Il costo **si calcola**, non si copia:

```
entrata        × $2,00/M
uscita testo   × $12,00/M   (candidatesTokenCount − immagine, più thoughts)
uscita immagine × $120,00/M
```

### 4. Il listino era sotto il vero del 6%

Diceva 123 millesimi. Il costo misurato sta fra **126 e 133**.

A prezzo 140 il margine sarebbe stato 9 millesimi: il **6,4%**, contro il 12,1
che la home avrebbe dichiarato. **Metà.**

---

## Il 2K è gratis

| | mediana | peggiore | pixel | token immagine | costo |
|---|---|---|---|---|---|
| default | 18,1 s | 18,2 s | 1024×1024 | 1120 | 126–131 |
| `imageSize: '1K'` | — | 20,5 s | 1024×1024 | 1120 | 131 |
| `imageSize: '2K'` | **21,2 s** | 26,9 s | **2816×1536** | **1120** | 128–130 |

**Gli stessi 1120 token in tutti i casi.** Google fa pagare uguale 1K e 2K: la
differenza di prezzo pubblicata ($0,134 contro $0,24) riguarda solo il 4K.
Quattro volte i pixel, stesso prezzo, tre secondi in più.

**Decisione del committente (2026-09-10): sceglie il cliente**, con due
pastiglie sul punto oro — «rapida» e «grande» — come i fattori dello scontorno.
Stesso prezzo, e chi ha fretta lo dice.

---

## Quanto costa un riferimento

| riferimenti | token in entrata | costo reale | tempo |
|---|---|---|---|
| 0 | 22 | 126 | 16,1 s |
| 5 | 1 312 | 131 | 18,2 s |
| 14 | 3 634 | 133 | 16,2 s |

**258 token per riferimento** — mezzo millesimo l'uno — su immagini 768×768.

Sette millesimi fra il caso più leggero e il più pesante. Sembra poco, e su un
margine di 18 non lo è: a **prezzo fisso** il margine dichiarato sarebbe il
**15,4%** su una richiesta senza riferimenti e il **10,7%** su una con
quattordici, mentre la home ne dichiara 12.

Quindi il prezzo **sale coi riferimenti**:

```
costo(n)  = 128 + round(n × 0,5)      millesimi
prezzo(n) = costo(n) + round(costo(n) × 0,14)
```

| n | costo stimato | costo misurato | prezzo | margine |
|---|---|---|---|---|
| 0 | 128 | 126 | **146** | 12,3 % |
| 5 | 131 | 131 | **149** | 12,1 % |
| 14 | 135 | 133 | **154** | 12,3 % |

La base è 128 e non 126 perché i token di «pensiero» ballano di ±2 millesimi
fra una chiamata e l'altra: a 127 la stima a cinque riferimenti (130) sarebbe
scesa SOTTO il 131 misurato quella volta — un millesimo che basta a rompere
«non si sottostima mai» (revisione, Task 6). A 128 il margine resta sopra il
costo misurato in ciascun caso, e la sua quota resta vicina — non più esatta —
al 12% che la home dichiara: per questo la home dice «circa 12 centesimi».

E il numero si sa **prima di premere**, perché i riferimenti sono già stati
scelti. La promessa resta letterale.

### ⚠️ I riferimenti si ridimensionano a 768 px nel browser

I 258 token sono misurati **a quella misura**. Google accetta fino a 7 MB per
immagine: se qualcuno manda una foto da 12 megapixel, i token salgono, e il
prezzo che gli abbiamo mostrato prima di premere diventa falso.

Ridimensionare risolve tre cose insieme: il prezzo resta quello annunciato, il
caricamento non si mangia i nove secondi di margine, e il costo diventa
prevedibile invece che scommesso.

---

## Il modello

`gemini-3-pro-image` e `gemini-3-pro-image-preview` rispondono tutti e due,
`200`. Si usa **quello stabile**.

---

## Un inciampo che vale la pena aver scritto

Il primo tentativo usava PNG **8×8** come riferimenti. File validi — `sharp` li
legge senza storcere il naso — e Google li ha rifiutati:

```
400  Unable to process input image
```

Sotto una misura minima non li guarda nemmeno. **Un'immagine giocattolo non è
un caso di prova: è un caso che non somiglia a niente di quel che succederà.**
Con riferimenti veri a 768×768 è passato tutto al primo colpo.

E quell'errore è stato utile lo stesso: diceva che la chiave era buona e il
modello esisteva, perché Google era arrivato fino a *guardare il contenuto*.

---

## Cosa cambia, in una riga per punto

- `worker/fornitori/google.js`: via `thinkingLevel`, dentro `imageConfig` con
  la misura scelta dal cliente;
- `src/engine/listino.js`: costo **128 + 0,5 × riferimenti**, non 123 fisso;
  `resa: 'jpeg'`, non `png`;
- `prezzoDi(servizio, { riferimenti })` invece di `prezzoDi(servizio)`;
- `costo_reale` si **calcola** da `usageMetadata`;
- i riferimenti si ridimensionano a 768 px **prima** di lasciare il browser;
- il descrittore `immagine` ha due pastiglie: «rapida» e «grande»;
- **diciotto secondi davanti a un tasto sono tanti**: l'interfaccia deve
  mostrare che sta lavorando, o l'utente preme due volte.
