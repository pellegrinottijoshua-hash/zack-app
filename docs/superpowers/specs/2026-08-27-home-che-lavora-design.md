# La home che lavora

**Data:** 27 agosto 2026
**Stato:** disegno approvato, da pianificare
**Sostituisce:** niente. La home attuale (`src/landing/`) non si butta, si sposta.

---

## 1. Cosa decide questo documento

Oggi `zack-app.com` è una pagina che **racconta**. Da qui in poi è una pagina
che **lavora**: chi arriva trascina fino a tre file e vede lo sfondo sparire,
gratis e senza account, prima di aver letto una riga.

Il criterio che ordina tutto: **cosa perde un utente che apre zack-app.com
adesso.** Non «cosa manca al prodotto».

---

## 2. Dove sta questo progetto fra gli altri

Il committente ha portato diciotto richieste il 2026-08-27. Sono **sei progetti
indipendenti**, non una lista:

| | progetto | stato |
|---|---|---|
| **A** | **La home che lavora** — ritaglio in primo piano, gratis, senza account | **questo documento** |
| **B** | **Il tasto Zack come marchio** — ovale, senza piuma, col cerchietto che spiega | **dentro A** |
| ~~C~~ | ~~Rifinire in blocco nella stessa tela~~ | **assorbito da A** (§ 7) |
| **D** | Meno tasti, più spazio negativo — studio e telefono | dopo A |
| **E** | L'archivio dei suoni — pacco royalty-free comprato una volta | dopo D |
| **F** | Account, pagamenti, Resend | **per ultimo** (§ 10) |

Il **giro di prova** su ogni strumento non è un progetto: è una sessione d'uso
vero che va infilata fra gli altri, ripetuta.

---

## 3. Il confine fra il gratis e i 3,99 €

Deciso dal committente il 2026-08-27. È la riga da cui discende tutto il resto.

**Gratis, illimitato, senza account, per sempre:**

- scontorno di **fino a tre file per volta**;
- **rifinitura a mano su tutti e tre**, nella stessa tela;
- scaricamento di ognuno.

**I 3,99 € comprano il resto:** quaranta file in blocco, vettoriale, editor
SVG, Brain, libreria, suono, filmato.

Il limite non è tecnico ed è bene che si veda: tre è **abbastanza per capire**
e **poco per lavorare**. Un limite che non serve a nulla se non a far provare
il prodotto va detto così com'è, non travestito da vincolo.

---

## 4. La pagina, dall'alto

```
┌─ zack-app.com ─────────────────────────────────┐
│  Zack App                          IT/EN   →   │  barra sottile
│                                                │
│         ╭──────────────────────╮               │  IL TASTO
│         │        ZACK          │  (i)          │  ovale, nero, Fredoka
│         ╰──────────────────────╯               │  cerchietto accanto
│                                                │
│    use Zack for free — remove the background   │
│              in just one click                 │
│                                                │
│      trascina qui, fino a tre per volta        │
│                                                │
│  ─────────────────────────────────────────     │
│  For €3.99: the bg remover and a lot more →    │
└────────────────────────────────────────────────┘
        ↓ sotto: il racconto in video, che c'è già
```

**Il primo schermo è quasi vuoto**, e non per gusto: il tasto è grosso perché
intorno non c'è nient'altro. È la stessa richiesta di «più spazio negativo»,
applicata dove pesa di più.

**La zona di rilascio è l'intera pagina**, non un rettangolo tratteggiato: si
trascina dove capita.

**Il racconto in video non muore e non si tocca.** Scende sotto la piega, dove
serve a chi ha già capito e vuole sapere il resto. Le cinque clip, i blocchi
che scorrono, il confronto dei prezzi, la chiusura: tutto invariato.

---

## 5. Il tasto (progetto B)

Ovale, nero, contorno, **scritta grossa centrata in Fredoka**, **senza piuma**.
Non dice «Rimuovi sfondo»: dice **`ZACK`**. È un logo che si preme.

Accanto, un **cerchietto piccolo `(i)`**. Premuto, si apre e dice due cose:

1. **cosa farà adesso** — la catena per esteso, la misura d'uscita, i secondi.
   `pianoZack()` in `src/engine/ricette.js` restituisce già tutti e tre;
2. **che è tuo** — «questo tasto lo puoi cambiare».

Si chiude cliccando fuori o con Esc, come già fa `ZackButton.jsx`.

### Il tasto segue l'utente nello studio, gratis

Lo studio salva la ricetta in `localStorage` sotto `jayl.zack.scontorna`
(`src/App.jsx:38`). La home sta sulla **stessa origine**. Quindi: uno
personalizza il tasto sulla home, entra in `/app/`, e il tasto **è già il suo**.

Non c'è niente da costruire. È la stessa chiave. Ed è il ponte di conversione
più economico che questo prodotto abbia.

---

## 6. L'attesa: la piuma che scrive in oro

Il modello pesa **175 MB** (`u2net`, l'unico caricato dalla home). Su una
connessione normale è più di un minuto in cui la pagina non fa niente di
visibile — ed è il numero che decide se il prodotto esiste per uno sconosciuto.

### Il difetto da cui si parte

`EngineBanner.jsx:16` disegna già `phase === 'downloading'` con barra e
percentuale. **Nessuno emette mai quella fase.** Il worker manda solo
`'loading'`. La barra è scritta, bella e **collegata a niente**: oggi, mentre
scarichi 175 MB, non vedi nulla.

### Cosa si fa

1. **Collegare la barra a un download vero**, con percentuale e megabyte. Non
   riduce i byte, elimina l'abbandono da incertezza, ed è la leva più
   economica delle tre note.
2. **Scaricare al primo gesto d'intenzione** — mouse sul tasto, tocco, focus —
   non all'apertura della pagina. Si guadagnano i secondi che uno impiega a
   scegliere il file nel finder, e **chi legge e se ne va non scarica un byte**.
3. **Un modello solo.** «Rapido / Qualità / Illustrazioni» sono tre scelte che
   un utente nuovo non sa fare. Sulla home non compaiono.

### L'animazione

**Un SVG scritto a mano, non un video.** Un `<path>` solo — la scia che la
piuma lascia — animato con `stroke-dashoffset` che si disegna e si cancella in
loop. Oro `#C4A35A`. **Circa 2 KB.**

Se serve Zack in scena: `public/hero/zack-1.webp` **esiste già e pesa 13,7 KB**
— fermo immagine, oro animato sopra. Zero asset da generare.

Sotto l'animazione, **il numero vero**: «41 MB di 175 — circa 50 secondi».
Dove non c'è una misura non c'è un avviso.

Sotto `prefers-reduced-motion` il tratto diventa una barra ferma, senza codice
in più.

---

## 7. La tela dei tre (ex progetto C)

Finito lo scaricamento: **tre risultati affiancati**, sfondo a scacchi sotto
ognuno, e **un pennello solo che lavora su tutti e tre** — si clicca su uno, si
corregge, si passa all'altro, la tela non cambia mai.

**Questa tela è la stessa che serve al Blocco per quaranta file.** Si
costruisce una volta: la home ne usa tre, il Blocco quaranta. È il motivo per
cui il progetto C sparisce dentro A invece di aspettare il suo turno.

Sotto ogni risultato, **un tastino scarica**. Niente parte da solo: *«un file
che parte da solo verso la cartella Download sorprende»*.

⚠️ **La trappola già pagata:** il pennello ha bisogno della **sorgente**, e se
la sorgente ha una misura diversa dal risultato va **riscalata**, o ridipinge
nero. Vale per tutte e tre le tele.

---

## 8. Le due notifiche, che sono due momenti

Il committente ne ha chieste due. Nello stesso istante una delle due si perde,
quindi sono due momenti diversi.

### Fine del primo lavoro → «fai tuo il tasto Zack»

Una striscia bassa con le pastiglie:

```
   [ ×4 ]  [ ×2 ]  [ :2 ]  [ :4 ]        [ + scarica ]
   └── una sola di queste ──┘             └ interruttore ┘
```

Nera → **oro** quando si sceglie. Da lì in poi quel tasto è suo, sulla home e
nello studio (§ 5).

**Due vincoli che non sono dettagli:**

- ⚠️ **`×2 ×4 :2 :4` sono una scelta sola, non quattro passi.** Se fossero
  quattro interruttori indipendenti, uno potrebbe accendere `×4` e `:4`
  insieme e aspettare trenta secondi per tornare da dove è partito. Vanno
  **radio, non caselle**: un passo `ridimensiona` con quattro valori. Tiene
  chiusa la lista dei passi — che è una regola scritta in `ricette.js` — e
  rende l'errore impossibile invece che segnalato;
- ⚠️ **il colore non è mai l'unico segnale.** La pastiglia accesa prende anche
  **il numero del suo posto nella catena** (`2.`), che è oro **e** informazione:
  dice in che ordine succederà.

`+ scarica` non è nuovo: `PASSI` in `ricette.js:31` contiene già `'scarica'`.

### Quando prova a trascinare il quarto file → «perché solo tre?»

Non a freddo alla fine del primo lavoro, ma **nel momento in cui il limite lo
tocca davvero**:

> «tre per volta qui. Nello studio quaranta — e tutto il resto.»

*(La frase definitiva conterà gli strumenti solo se il numero è vero al
momento di scriverla: oggi oltre allo scontorno sono Brain, Vettorializza,
Editor SVG, Filmato, Suono, il Blocco e la Libreria. Un numero sbagliato in
una promessa è peggio di nessun numero.)*

Un limite spiegato quando lo chiedi è un invito; spiegato prima è una scusa.

---

## 9. Le misure prese

Tutte del 2026-08-27, tutte rifacibili.

### Il modello

`u2net` 175 MB · `isnet-general-use` 179 MB · `isnet-anime` 176 MB. La home ne
carica **uno**.

### Video → SVG: perché non si fa

Chiesto dal committente come strumento («trasformare video grandi in svg
piccoli»). Misurato col vettorizzatore vero del prodotto (`wasm_vtracer`) su
`public/hero/zack-1.mp4` — 121 fotogrammi, 24 fps, 1280×720:

| misura | un fotogramma | ×121 | tempo |
|---|---|---|---|
| 1280×720 | 232,7 KB — 543 path | **27,5 MB** | 35 s |
| 640×360 | 91,9 KB — 219 path | 10,8 MB | 9 s |
| 320×180 | 45,3 KB — 117 path | 5,4 MB | 3 s |
| **l'mp4 intero** | | **229 KB** | — |

**Un solo fotogramma vettorializzato pesa più di tutto il video.** L'animazione
completa costerebbe **123 volte** l'mp4.

Non è un difetto di vtracer: è cosa **è** un formato vettoriale. Un codec video
codifica *la differenza fra un fotogramma e il precedente*, e l'80% dei pixel
non viene riscritto. Un SVG non ha nessuna nozione di «prima»: ogni fotogramma
ripaga tutto, curva per curva. Comprimere quella lista significa inventare un
codec video.

**Va nella tabella delle trappole già pagate di `RIPRENDI-QUI.md`.**

### La metà buona di quell'idea

**«Fotogramma → vettoriale» esiste già**, in due strumenti che non si parlano:
Filmato sa estrarre fotogrammi, Vettorializza sa fare curve. Fra i due, oggi,
c'è il mouse dell'utente.

Non è uno strumento nuovo: è **una catena del tasto Zack** —
`fotogramma → scontorna → vettorializza`. Va nel progetto **E** come voce
piccola, non come progetto.

---

## 10. Cosa NON entra, e costa dirlo

- **La home non carica ONNX all'apertura.** `createEngine()` è isolato dietro
  un worker: la home lo importa con `import()` al primo gesto sul tasto, e Vite
  lo mette in un chunk a parte. La regola *«chi non ha ancora deciso di restare
  non aspetta»* resta viva.
- **Niente account per il gratis.** Contare gli usi richiede un account,
  l'account è il progetto F, e F senza A è programmare al buio: finché non si
  guarda cosa la gente usa davvero, non esiste la risposta a **«cosa compra chi
  paga 3,99 €?»**. Vale anche la regola già scritta: *niente abbonamento prima
  di cento persone che usano lo studio gratis.*
- **Niente canzoni, niente sottotitoli.** Chiesti il 2026-08-27 insieme
  all'archivio suoni. Canzoni + sottotitoli + tagli **è** una timeline
  multi-traccia, cioè *«il problema più costoso del settore»*. L'archivio di
  sound effects invece sì: sta dentro Suono senza rompere niente (progetto E).
- **Niente `×2` come modello a sé.** Misurato il 2026-08-25: la variante
  dedicata produce la stessa uscita in quattro volte il tempo. `×2` si ottiene
  dal modello `×4` con `reductionFor()`.

---

## 11. Cosa tocca, nel codice

| file | cosa |
|---|---|
| `src/landing/Landing.jsx` | il primo schermo nuovo; il racconto scende |
| `src/landing/copy.js` | le frasi nuove, **it + en** (§ 12: oggi nessun test le confronta) |
| `src/landing/landing.css` | il primo schermo, lo spazio negativo |
| `src/components/ZackButton.jsx` | il cerchietto `(i)`, la piuma via — il tasto esiste già |
| **nuovo** — tela di rifinitura condivisa | tre sulla home, quaranta nel Blocco |
| **nuovo** — SVG dell'attesa | ~2 KB, `stroke-dashoffset` |
| `src/engine/worker.js` | emettere `downloading` con byte scaricati e totali |
| `src/components/EngineBanner.jsx` | riceve finalmente la fase che sa già disegnare |
| `src/engine/ricette.js` | il passo `ridimensiona` con quattro valori (radio) |
| `RIPRENDI-QUI.md` | la trappola video→SVG; la scaletta rifatta |

---

## 12. I test che devono esistere

Nella convenzione del repo: nomi in italiano che dicono la regola, e un
commento che spiega **perché** la regola esiste.

- `ricette.js` — **una catena non può contenere due ridimensionamenti.**
  È il test che rende impossibile `×4` e `:4` insieme;
- `ricette.js` — la ricetta di fabbrica della home è **solo** `scontorna`
  (+ `buchi`), non quella dello studio;
- la home non accetta **più di tre file**, e il quarto produce l'invito;
- **`copy.js` — parità it/en. Questo test NON esiste** (verificato il
  2026-08-27: `i18n.test.js` copre `src/i18n/`, non `src/landing/copy.js`).
  È l'unico posto del prodotto dove una frase presente in una lingua sola
  arriva online senza che niente si lamenti — e la home nuova ne aggiunge
  parecchie. Va scritto **prima** delle frasi nuove;
- «asset», mai «lavoro/work/piece» (test già esistente);
- l'SVG dell'attesa sta **sotto 5 KB**. Un numero è una difesa; un'intenzione no.

---

## 13. Quello che resta aperto dopo questo progetto

- **fp16**: dimezzerebbe i 175 MB a ~88. Va convertito e **misurato sulla
  qualità del bordo** prima di prometterlo. Non entra qui: ritarderebbe la home
  di un progetto intero.
- **Il cast come asset.** Piccione, Gabbiano, Falena, Gatto e Formica hanno
  canone e prompt pronti e **zero pixel**. La home nuova ne userebbe almeno uno.
- **La soglia di `holes.js`**, provvisoria e mai misurata: servono cinque loghi
  veri.
