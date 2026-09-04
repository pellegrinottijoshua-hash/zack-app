# Lo stesso impianto, sei schermate

**Data:** 4 settembre 2026
**Stato:** disegno approvato dal committente, da pianificare
**Sostituisce:** niente. Aggiorna il [contratto UX del 28 agosto](../../2026-08-28-contratto-ux.md) in quattro punti, elencati in § 11.

> **Una parola, e va tenuta.** *Impianto* è il termine del contratto UX § 1 —
> *«L'impianto: cosa sta dove, e non si sposta mai»*. Vuol dire **una mappa
> condivisa, non un contenitore**: ogni servizio resta il suo componente, con
> la sua funzione e i suoi test. Condividono **dove stanno le cose**, non cosa
> fanno. E non si dice «modello»: in questo codice `modello` è già il modello
> ONNX (`s.model`, «Modello sconosciuto»).

---

## 1. Cosa decide questo documento

Lo scontorno dello studio è stato rifatto sul disegno del committente il
2026-08-31, e funziona: piano vuoto, `+` al centro, tasto Zack in un angolo,
mascotte ferma, strumenti in cerchi che compaiono dopo. Gli altri quattro
servizi sono rimasti all'impianto vecchio.

Questo documento decide **come le altre sezioni ci arrivano** — e la risposta
non è «quattro lavori di impaginazione», è **un lavoro solo**: quella schermata
smette di essere «lo scontorno» e diventa l'**impianto** di ogni schermata.

Poi decide la stessa cosa per il desktop, dove oggi *«l'unica cosa che funziona
in modo pratico e semplice è la home»*.

E prima di tutto questo, chiude quattro bug misurati che rendono lo scontorno
dell'app più lento e meno capace di quello della home.

---

## 2. La diagnosi: due implementazioni della stessa schermata

Il contratto UX § 5 dice, testuale:

> **La home e lo strumento nell'app sono lo stesso componente**, con tre
> differenze dichiarate.

**Non lo sono.** Sono due basi di codice separate che fanno la stessa cosa:

| | home | app |
|---|---|---|
| | `landing/Ritaglio.jsx` (828 righe) + `landing/ritaglio.js` (119) | `components/Scontorna.jsx` (259) + `components/MaskBrush.jsx` (387) |

E tutto ciò che funziona è finito da una parte sola. I quattro difetti riferiti
dal committente il 2026-09-04 sono **lo stesso difetto visto da quattro lati**:

### 2.1 Lo scontorno rapido nell'app non esiste

`engine/keying.js` — il ritaglio di un fondo piatto in ~20 ms, senza modello —
è importato **solo** da `src/landing/ritaglio.js:10` e da `engine/filmato.js`.
`src/App.jsx` non lo importa mai.

Nell'app **ogni** scontorno scende al modello ONNX da 175 MB, anche un fondo
piatto che sulla home costa venti millisecondi. Non è che l'app sia lenta: è
che **la scorciatoia è stata costruita per la home e mai portata nello studio.**

### 2.2 «Il file potrebbe essere rovinato» non è vero

`i18n/it.json:111` è il messaggio generico per *qualunque* eccezione del
motore. È il § 2.1 visto dall'altro lato: si va sempre al modello, il modello a
volte non ce la fa — memoria, WebGPU, tempo — e l'app dà la colpa al file
dell'utente.

Un messaggio che accusa il materiale di chi lavora, quando il colpevole è lo
strumento, è peggio di nessun messaggio: manda a rifare un file che stava bene.

### 2.3 Il righello non si accende

La matematica è giusta e testata (`engine/righello.js`, 12 test). È il ponte
che non passa:

- `components/MaskBrush.jsx:96` fa `useState(modoIniziale || 'erase')`;
- `useState` legge il valore **solo al montaggio**;
- `App.jsx:1336` monta `MaskBrush` **senza `key`**, quindi non lo rimonta mai.

Premere il cerchio del righello mentre il pennello è già aperto **accende il
cerchio** (`aria-pressed` legge `modoPennello`) e **non cambia lo strumento**.
Il committente vede un comando che si illumina e non fa niente — la definizione
esatta di «rotto».

### 2.4 Il tasto Zack dell'app ha meno opzioni della home

La home offre `FATTORI = { x4, x2, d2, d4 }` e li mostra come `×4 ×2`
(`landing/Ritaglio.jsx:653`). Il punto oro dell'app mostra solo `PASSI` —
niente ×2, ×4, :2, :4.

`engine/ricette.js` **sa già** farlo: `fattoreDi()` legge `ridimensiona:x4`, e
`FATTORI` è esportato da lì. `Scontorna.jsx` semplicemente non lo offre.

### 2.5 E il difetto strutturale sotto tutti e quattro

`['brain','suono','filmato','scontorna'].includes(tool)` compare **tre volte**
in `App.jsx` (righe 1451, 1580, 1596). Più `FACCIA` a riga 69. Più
`tool === 'scontorna'` altre otto volte.

Ogni servizio nuovo è una caccia a queste liste, e ogni lista dimenticata è un
bug. È già successo, ed è scritto nel codice a `App.jsx:1445`:

> *«`filmato` era rimasto fuori dalla lista mentre veniva aggiunto dappertutto:
> chi apriva Filmato si trovava sopra il nome di un JPG e il tasto Zack, che
> avrebbe scontornato l'immagine mentre lui guardava una clip.»*

Finché il comportamento di un servizio è sparso in liste dentro un file da 1814
righe, questo si ripete.

---

## 3. I cinque pezzi, e il loro ordine

Deciso col committente il 2026-09-04. **Ogni pezzo ha la sua spec e il suo
piano**: questo documento li descrive tutti perché condividono l'impianto, ma
si costruiscono e si verificano uno alla volta.

| # | pezzo | perché in questa posizione |
|---|---|---|
| **1** | I sei tappi | Rifare l'impianto sopra un'app lenta lascia un'app lenta con un impianto nuovo — e poi non si sa più quale dei due lavori l'ha rallentata. |
| **2** | L'impianto + **Filmato** | Filmato è «uguale a scontorna»: entra nell'impianto senza inventare un gesto nuovo, quindi è la **prova** che l'impianto regge. |
| **3** | Brain e Vocale | I due che chiedono un `+` a scelta multipla e un tasto che fa una cosa nuova. |
| **4** | Vettoriale | Il tasto senza AI va inventato (§ 7.2). |
| **5** | Il desktop | Ultimo perché eredita: se l'impianto è giusto, il desktop è impaginazione. |

**Fuori da questo documento, rimandato:** l'AI nel tasto Zack. Il committente
l'aveva chiesta per Vettoriale («*visualizza l'img e commenta*») e per Vocale
(«*modifica i filtri in base alla descrizione*»); sarebbero state le prime due
cose nell'app a non girare nel browser del cliente, contro la regola *«tutto
gratis e in locale, è il motivo dei 3,99 €»*. Decisione del 2026-09-04:
**si rimanda, e si inventa qualcosa senza AI** (§ 7.2, § 7.3).

---

## 4. Pezzo 1 — I sei tappi

Sei commit, ognuno col perché nel corpo, `npm test && npm run build` verdi
prima di ognuno. **La home non si tocca in nessuno dei sei.**

| # | cosa | dove |
|---|---|---|
| 1 | `landing/ritaglio.js` → `engine/ritaglio.js`, importato da **tutt'e due**. L'app prova il fondo piatto prima di svegliare il modello. | § 2.1 |
| 2 | L'errore distingue «il motore non ce l'ha fatta» da «il file è illeggibile». Chiavi nuove in `it.json` **e** `en.json` — un test fallisce se una chiave esiste in una lingua sola. | § 2.2 |
| 3 | `key={modoPennello}` sul `MaskBrush`. | § 2.3 |
| 4 | `FATTORI` nel punto oro, come sulla home. | § 2.4 |
| 5 | `onScarica` scarica **il piano**, non `bundleAll()` della libreria. | § 4.1 |
| 6 | Il blob URL esce dal render. **Da misurare prima**, non supporre. | § 4.2 |

### 4.1 Il bug trovato leggendo, non riferito

`App.jsx:1552` passa `downloadAll` al tasto scarica, e `downloadAll`
(`App.jsx:1200`) chiama `bundleAll()` — che **zippa tutta la libreria**, non i
file sul piano. Con la libreria vuota risponde «libreria vuota» mentre sul
piano ci sono tre risultati pronti.

Il commento sopra dice *«scarica CIO' CHE C'E': i tre file della colonna se il
blocco e' finito»*. Non è vero. È un commento che descrive l'intenzione invece
del codice, ed è il tipo di commento che questo progetto non vuole.

### 4.2 La lentezza: cosa si misura prima di toccare

`App.jsx:1264` fa `URL.createObjectURL(f)` **dentro il render**: un blob URL
nuovo a ogni ridisegno, mai revocato. Stessa forma in `BatchPanel.jsx:159` e
`FilmLab.jsx:78`.

È un difetto vero, ma **non è la causa della lentezza riferita** — quella è
§ 2.1, il modello che parte sempre. Va corretto perché è una perdita di
memoria, non perché si suppone che sia il collo di bottiglia.

Prima di scrivere: si misura il tempo di uno scontorno su fondo piatto
nell'app e sulla home, con lo stesso file, e i due numeri vanno nel commit.

---

## 5. L'impianto

### 5.1 La mappa, e si impara una volta sola

`components/Scontorna.jsx` viene promosso a `components/Piano.jsx`, generico.

| dove | cosa | mobile | desktop |
|---|---|---|---|
| **striscia in alto** | libreria · faccia del servizio · scarica | identica | identica |
| **centro della tela** | il **`+`**, quando il piano è vuoto, e sotto la frase del servizio | identico | identico |
| **nella tela, in un angolo** | il **tasto Zack** e il **punto oro** | basso a destra | alto a destra, medio-grande |
| **attaccati al tasto** | gli **strumenti**, cerchi, che compaiono *dopo* | in colonna | in colonna |
| **basso a sinistra** | la **mascotte** — oggi ferma, domani clip (§ 5.3) | identica | identica |
| **i servizi** | i **cinque** cerchi | fila in basso | colonna a sinistra |

**Due sole differenze fra i due schermi:** dove sta la fila dei servizi, e in
quale angolo della tela sta Zack. Tutto il resto è lo stesso pixel.

⚠️ **La libreria non è uno dei cinque cerchi.** Si raggiunge dalla striscia in
alto, ed è la sesta schermata (§ 7.6). I due gruppi di comandi del contratto UX
§ 1 — *servizi* e *strumenti* — restano quelli, e la libreria non è né l'uno né
l'altro: è dove stanno i tuoi file.

⚠️ **Gli strumenti si spostano.** Oggi su Scontorna stanno in alto a destra
(`styles.css`, `.sc-strumenti { top: 60px; right: 0 }`), lontani dal tasto.
Nell'impianto stanno **attaccati al tasto Zack**, perché sono la stessa domanda —
«chi fa il lavoro, e con cosa lo si corregge» — e perché su desktop l'angolo in
alto a destra ospita già il tasto. È un cambiamento allo scontorno di oggi, ed
è l'unico.

### 5.2 Le regole che l'impianto fa rispettare da solo

Oggi sono regole scritte che ogni servizio può violare per distrazione. Nel
impianto diventano struttura:

- **gli strumenti non coprono la tela.** Unica eccezione dichiarata: l'ovale
  del punto oro, che è *un momento e non uno stato*;
- **i tasti sono cerchi**, e il nome sta nel `title`;
- **gli strumenti compaiono dopo**: prima non c'è niente da correggere;
- **il colore non è mai l'unico segnale**;
- **la zona premibile del punto oro è 44 px**, col pallino disegnato dentro a
  12-14 (contratto UX § 3).

### 5.3 La mascotte è un posto riservato, non un'immagine

Oggi è un `.webp` fermo. **Domani sarà una o più clip senza sfondo** —
decisione del committente del 2026-09-04 — come già succede sulla home.

Quindi l'impianto non le riserva *un'immagine*: le riserva **un riquadro con
un contratto**, ed è lo stesso contratto già scritto per la home in
`RIPRENDI-QUI` § 6.4:

> **riquadro fisso, allineato in basso.** Se le clip escono con proporzioni
> diverse, **Zack cambia taglia rispetto al tasto** — e il rapporto fra la
> mascotte e il tasto Zack è la cosa che si nota per prima.

Cosa vuol dire per il codice, e va fatto **ora** anche se le clip non ci sono:

- il riquadro ha una misura dichiarata e **non dipende dal contenuto**: né
  l'immagine ferma né la clip decidono quanto è grande;
- passare da `<img>` a `<video>` non deve toccare l'impaginazione di
  nient'altro. Se toccarla è necessario, il riquadro è sbagliato adesso;
- **la mascotte non è mai un segnale.** *«Zack non parla, non festeggia, non è
  mai l'unico segnale»* — una clip che parte non può essere l'unica conferma
  che qualcosa è successo. Vale la stessa regola delle facce del contratto
  UX § 4;
- `prefers-reduced-motion` ferma le clip. Chi ha chiesto meno movimento vede il
  fotogramma fermo, e non gli manca niente.

⚠️ **Queste clip non sono toccate dal problema di § 7.4.** Si producono
**offline** con `scripts/clip-alpha.mjs`, cioè con ffmpeg fuori dal browser,
dove l'alfa si scrive senza difficoltà. Il muro di `MediaRecorder` riguarda
solo ciò che **l'utente esporta** da Filmato.

### 5.4 Cosa sparisce, da tutte e sei le sezioni

`StageBar`, `aside.rail` coi suoi pannelli, i due bottoni `.cta` in fondo, la
`statusbar`. Sono l'impianto vecchio, e sopravvivono solo perché cinque servizi
su sei non sono ancora passate all'impianto.

Ordine di grandezza: ~600 righe di `App.jsx` e ~1500 di `styles.css`. Il numero
esatto lo dirà il piano, non questo documento.

⚠️ **Non spariscono le funzioni, sparisce il posto in cui stavano.** Ciò che
oggi vive in `Advanced.jsx` — blocco, ingrandimento, rifinitura, esportazione —
resta raggiungibile: § 7.2 dice dove.

---

## 6. Il descrittore

Un file per servizio, `src/servizi/<id>.js`, che dichiara **le tre cose che il
committente ha elencato parlando**:

```js
export default {
  id: 'brain',
  claim: 'brain.claim',        // la frase sotto il `+`, chiave i18n

  // COSA FA IL `+`. O dei tipi di file, o un menu di scelte — mai tutt'e due.
  accetta: { menu: ['nota', 'gruppo', 'file'] },
  // Vettoriale:  { file: ['image/*'], quanti: 1 }
  // Vocale:      { menu: ['registra', 'aggiungi'] }
  // Filmato:     { file: ['video/mp4', 'video/webm'], quanti: 1 }

  // COSA FA ZACK, e cosa c'è nel punto oro. `azione` è un id, non una
  // funzione: il descrittore è dati, e chi esegue sta in `engine/`.
  tasto: {
    azione: 'riordina',
    opzioni: ['gruppi', 'tipo', 'compatta', 'frecce'],  // le pastiglie
    predefinita: 'gruppi',
  },

  // QUALI CERCHI, E QUANDO. `quando` è un nome di stato, non una condizione:
  // 'sempre' | 'con-file' | 'con-risultato' | 'con-due'. Lista chiusa: se un
  // servizio chiede uno stato nuovo si aggiunge qui, non si scrive una
  // funzione dentro il descrittore.
  strumenti: [
    // La freccia ha bisogno di due oggetti sulla tela: e' uno strumento, non
    // una voce del `+`. Vedi § 7.1.
    { id: 'freccia', icon: 'freccia', label: 'brain.add.arrow', quando: 'con-due' },
    { id: 'annulla', icon: 'undo',    label: 'bar.undo',        quando: 'con-file' },
  ],
}
```

**Puro: nessun canvas, nessun React, nessun DOM.** Quindi testabile in Node,
come `ricette.js`, `holes.js`, `keying.js` — *«la matematica sta separata dal
disegno: la parte capace di sbagliare in silenzio sta dove i test la vedono»*.

`App.jsx` smette di conoscere i singoli servizi: legge il descrittore. Le liste
di § 2.5 spariscono tutte, `FACCIA` compresa.

**Il criterio che tiene il descrittore onesto:** è **dati**, non un programma.
Vale la stessa regola già scritta in `ricette.js` — *«niente rami
condizionali… se qualcuno chiede un "se… allora", non è il posto giusto: è
diventato un costruttore di flussi di lavoro»*. Se un descrittore comincia a
contenere logica, la logica va in un modulo `engine/` e il descrittore lo
chiama.

---

## 7. Le sei sezioni

### 7.1 Brain

**Quasi tutto quello che serve qui esiste già.** `engine/brain.js` ha
`TIPI = ['asset', 'nota', 'cerchio', 'freccia']` — lista chiusa, e va tenuta
chiusa.

- **il `+` apre un menu di tre voci:** *nota · gruppo · file*;
- **gli strumenti:** freccia, annulla;
- **il tasto Zack: riorganizza la tela.**

#### Perché tre voci e non quattro

**«Idea» non è una voce: è una nota.** `CATEGORIE` in `brain.js:49` è già
`idea · task · domanda · riferimento · fatto`, e il commento dice perché:
*«si sceglie il senso, non la tinta… una nota gialla è gialla; una nota Da fare
è una cosa da fare, e si può contare, cercare ed estrarre»*. È la regola «il
colore non è mai l'unico segnale», già applicata. Due tasti che creano lo
stesso oggetto avrebbero solo impedito di scoprire le altre quattro categorie.

**«Gruppo» è il `cerchio`** di `TIPI`, col nome che ha nell'interfaccia.

**La freccia non è nel `+`.** Ha bisogno di due oggetti già sulla tela —
`Brain.jsx:298` la disabilita sotto i due — quindi è uno **strumento**, e sta
nei cerchi accanto al tasto. Una voce del `+` che il più delle volte non si può
premere non è una voce del `+`.

#### «Un file, e gli dai un'icona» — richiesta del committente 2026-09-04

Anche questo è **costruito e chiuso a chiave**, non da inventare:

- `iconaDocumento(asset)` (`store/model.js:51`) legge `asset.meta.icona` e
  funziona per **qualunque** asset;
- il selettore delle icone esiste, in `Brain.jsx:563`;
- ma è dietro `KIND_TESTO.includes(assetScelto.kind)`, e `KIND_TESTO = ['md']`.

**Quindi: solo i `.md` possono avere un'icona.** Il lavoro è togliere quella
condizione, non scrivere una funzione. Regola che ne esce: **un'immagine si
vede, tutto il resto è un'icona con un nome** — e l'icona la scegli tu.

⚠️ Da verificare mentre si toglie la condizione: `ICONE_DOCUMENTO` è
`FOLDER_ICONS`, pensato per documenti. Se non c'è un'icona sensata per un
audio o un filmato, ne servono, e vanno disegnate — non lasciate cadere
sull'icona di ripiego, che è `ICONE_DOCUMENTO[0]` per tutti.

**La regola di riordino è personalizzabile, e sta nel punto oro** — che è già
«come deve comportarsi il tasto», esattamente come i modelli e la catena su
Scontorna. Quattro pastiglie, e la lista resta aperta:

| pastiglia | cosa fa |
|---|---|
| **per gruppi** | i raggruppamenti restano, ogni gruppo diventa un blocco ordinato, gli sciolti a griglia sotto |
| **per tipo** | note con note, idee con idee, icone con icone, documenti con documenti |
| **compatta** | non riordina: toglie buchi e sovrapposizioni mantenendo le posizioni relative |
| **segue le frecce** | le frecce sono la struttura: impagina come uno schema, dall'alto in basso |

⚠️ **Ogni regola deve essere deterministica.** Premere due volte deve dare lo
stesso risultato. Se no non è riorganizzare, è rimescolare — e un tasto che
rimescola non si preme mai una seconda volta. Va scritto come test.

Il calcolo sta in `engine/riordina.js`, puro, testato in Node. `Brain.jsx`
applica le posizioni che riceve.

E non parte da zero: `brain.js` ha già `riquadro(items)` (l'ingombro di ciò che
c'è), `prossimoPosto(items, { perFila, passo })` (la griglia) e `MISURE` (le
taglie di partenza). «Compatta» e «per tipo» si costruiscono quasi solo con
questi tre.

### 7.2 Vettoriale

- **il `+`** prende un'immagine;
- **comparsa quella:** gli strumenti sui **due fianchi**, cerchi da 44 px
  tenuti in sordina finché non li si tocca. **Avanzati è il cerchio più in
  basso della colonna destra** — «fra loro» nel senso di *in mezzo agli
  strumenti*, non sospeso al centro della tela, che è l'unica cosa che il
  impianto non permette a nessuno;
- **la tela resta grande:** 390 − 44 − 44 = **302 px**. Da verificare nel
  browser a 390 px prima di considerarla buona;
- **il tasto Zack:** vettorializza con la catena.

⚠️ **Il committente aveva chiesto che Zack «visualizzi l'img e consigli cosa
modificare». L'AI è rimandata (§ 3), quindi il consiglio non si finge.** Al
suo posto: **solo gli avvisi che il codice sa misurare** — quanti path, quanto
pesa, quanto ha risparmiato, e i controlli di stampa che esistono già in
`engine/ready.js`.

È la regola *«dove non c'è una misura non c'è un avviso»* applicata a un caso
dove sarebbe stato facile violarla: un modello linguistico che dice «prova ad
alzare il contrasto» sembra un consiglio ed è un'opinione senza misura sotto.

**Avanzati** è il posto dove va ciò che § 5.4 toglie dalla colonna: blocco,
ingrandimento, rifinitura, esportazione. Un solo posto nascosto per schermata,
e solo per ciò che il lavoro normale non usa — è la regola già scritta in
`Advanced.jsx`.

### 7.3 Vocale

- **il `+` dà due scelte:** *registra* oppure *aggiungi*;
- **il vocale aggiunto va in alto**;
- **gli strumenti** sui due fianchi;
- **in basso, un campo** per scrivere cosa vuoi ottenere;
- **il tasto Zack: imposta i filtri dalla descrizione.**

Senza AI: **un dizionario locale**, in `engine/dizionario-voce.js`, puro e
testato. «più calda» → curva sui bassi; «meno sibilanti» → de-esser; «da
radio» → compressione più stretta. Gratis, istantaneo, nessuna attesa.

⚠️ **I filtri restano tutti modificabili a mano dopo.** Il tasto imposta, non
decide: se il dizionario non conosce una parola, lo dice e non tocca niente —
non indovina.

⚠️ **Il confine dell'audio resta quello del contratto UX § 9.1:** *«la sessione
del suono non si salva come progetto. Si compone, si esporta, finita.»* Nel
momento in cui una sessione si riapre, abbiamo comprato un formato di
documento. Questo documento non lo compra.

### 7.4 Filmato

Il committente: *«uguale a scontorna, solo per i video»* — **uguale
l'impianto**, e i tre gesti che già esistono diventano i cerchi.

- **il `+`** prende un filmato;
- **gli strumenti:** taglia · estrai fotogrammi · togli sfondo;
- **il tasto Zack:** la catena decisa nel punto oro;
- **il confine resta** quello dichiarato in `engine/clip.js`: tre gesti su un
  file solo, niente montaggio, niente timeline.

⚠️ **Requisito esplicito del committente: il filmato deve uscire SENZA sfondo,
non con lo sfondo panna.**

### MISURATO il 2026-09-04 — e il sospetto scritto qui era sbagliato

Questo documento diceva: *«`MediaRecorder` non scrive l'alfa: VP9-con-alfa non
è una cosa che emetta»*, e proponeva un bivio a tre uscite (sequenza PNG,
WebP animato, encoder WASM). **Era falso, e l'ha smentito la misura.**

| misura | esito |
|---|---|
| canvas mezzo trasparente → `MediaRecorder` `video/webm;codecs=vp9` → riletto | metà trasparente `[0,0,0,0]`, metà rossa `[254,1,1,255]` |
| ripetuto su 320×240 a quattro istanti (0,05 · 0,3 · 0,6 · 0,9 s) | alfa 0 fuori, 255 dentro, **sempre** |
| `alphaFromCreamVoid` in Node su fondo panna `#F5F0E8` | → alfa **0** |
| idem su bianco puro, e su un panna leggermente diverso | → alfa **0** |

**Quindi la catena è già corretta**, e non c'è nessun bivio da scegliere:
niente encoder WASM, niente sequenza PNG di ripiego. Il valore del test era
distinguere il video che *ha* dipinto da uno che non ha dipinto affatto: senza
la metà rossa opaca, un canvas rimasto vuoto avrebbe dato «alfa 0» ovunque e
sarebbe sembrato un successo.

### Allora da dove viene il panna che il committente vede

**Dalla presentazione, non dal file.** `styles.css` dice
`.film-video { background: transparent }`: il video sta sul fondo panna
dell'app, e un filmato **correttamente trasparente** lì dentro ha l'aspetto
identico a uno col fondo panna.

Per i ritagli la stessa regola era già stata pagata e risolta — `.bg-tela` ha
gli scacchi, e il commento accanto dice perché: *«Lo sfondo a scacchi non è
decorazione: senza, un ritaglio con un buco nel mezzo sembra riuscito, e il
buco si scopre in stampa»*. **Al filmato quella regola non è mai arrivata.**

Quindi il lavoro qui è: **gli scacchi dietro al video**, la stessa forma già
usata per i ritagli. Non un encoder.

### Un secondo dato, che il piano deve tenere

`togliSfondo` fa **una ricerca e una passata di key per fotogramma**: una clip
di 18 s a 25 fps sono 457 fotogrammi, e nella misura è andata in timeout. Non è
un difetto da correggere qui — è un'attesa da **dichiarare prima**, che è già
la regola del prodotto (*«ogni attesa si dichiara prima»*, `FilmLab.jsx`).

### 7.5 Scontorna

**Non cambia.** Entra nell'impianto così com'è. È la prova che l'impianto non ha
rotto niente: se dopo il pezzo 2 lo scontorno si comporta diversamente da
prima, l'impianto è sbagliato.

### 7.6 Libreria

Decisione del committente del 2026-09-04: **la libreria è un tasto sempre
visibile nella striscia in alto**, e premerlo apre **una sezione a parte** — il
sesta schermata.

E porta con sé un'inversione che vale più della sua impaginazione:

> Non «apri il servizio, poi carica il file», ma **scegli il file, poi scegli
> il servizio**.

Cioè: dalla libreria selezioni i tuoi file e li mandi in uno dei cinque
servizi. È il gesto che oggi manca — la libreria attuale mostra il lavoro
fatto, non è un punto di partenza.

Il contratto UX la elencava fra i **sei servizi**, cioè fra i cerchi. Qui non
lo è: sta nella striscia, sempre visibile, in ogni servizio — e questo è
**meglio** di un cerchio, perché i tuoi file non sono un servizio fra gli
altri, sono ciò su cui gli altri lavorano. Un cerchio l'avrebbe resa una cosa
da visitare; nella striscia è una cosa che hai sempre addosso.

È il quarto punto da correggere nel contratto (§ 11).

---

## 8. Il desktop

Stesso impianto, e la mappa di § 5.1 vale identica. Le due differenze:

- **i servizi passano dalla fila in basso alla colonna a sinistra**
  (contratto UX § 1);
- **il tasto Zack sta nella tela in alto a destra, medio-grande**, sotto la
  striscia — non dentro la striscia, che resta di libreria, faccia e scarica.

Gli strumenti restano **attaccati al tasto**, in colonna sotto di lui: è la
stessa forma che hanno su mobile, ruotata dal basso al lato. Il bordo destro
diventa una cosa sola — *chi fa il lavoro, e con cosa lo si corregge*.

La mascotte resta in basso a sinistra della tela, accanto alla colonna dei
servizi.

---

## 9. Cosa si misura prima di scrivere

*«Si misura, non si suppone. Ogni numero viene da una misura, con la data.»*

| # | misura | serve a |
|---|---|---|
| 1 | scontorno su fondo piatto: app contro home, stesso file | § 4.2 — dire di quanto § 2.1 ha rallentato l'app |
| ~~2~~ | ~~`MediaRecorder` conserva l'alfa?~~ | **FATTA il 2026-09-04: sì, la conserva.** Il bivio a tre uscite è cancellato; il lavoro vero sono gli scacchi dietro al video (§ 7.4) |
| 3 | la tela a 390 px con due colonne di strumenti | § 7.2 — se 302 px bastano |
| 4 | la striscia in alto a 390 px: due cerchi da 44 px più la faccia da 58 | § 5.1 — se libreria, faccia e scarica ci stanno senza stringersi |
| 5 | quanto ridisegna `App.jsx` a ogni cambiamento | § 4.2 — se la lentezza ha anche una causa strutturale |

E le misure si prendono **nel browser, non nei test**: `npm test` non vede il
canvas. Prima di misurare: `resize_window` e controllare `innerWidth` — col
riquadro nascosto è **0** e ogni misura presa da lì è finta.

---

## 10. Come si verifica

- **i test sono documentazione:** nomi in italiano che dicono la regola, e un
  commento che spiega *perché* quella regola esiste;
- **il descrittore è dati**, quindi ogni servizio ha il suo test in Node: cosa
  accetta il `+`, cosa fa il tasto, quali strumenti compaiono e quando;
- **`engine/riordina.js` e `engine/dizionario-voce.js`** sono puri e testati
  prima di avere un'interfaccia;
- **il determinismo del riordino** (§ 7.1) è un test, non una promessa;
- **l'interfaccia è bilingue:** un test fallisce se una chiave esiste in una
  lingua sola, sia in `src/i18n/` sia in `src/landing/copy.js`;
- **«asset», non «lavoro/work/piece»:** un test fallisce se tornano;
- `npm test && npm run build` verdi prima di ogni commit.

---

## 11. Gli aggiornamenti al contratto UX

Il contratto del 28 agosto resta la fonte. Tre punti vanno riscritti, e vanno
riscritti **lì**, non qui:

1. **§ 1** — l'angolo in alto a destra non è più «lo scarica». La striscia in
   alto è `libreria · faccia · scarica`, identica su mobile e desktop.
2. **§ 1, strumenti su mobile** — diceva «a destra **o** a sinistra». Vettoriale
   e Vocale li hanno **su tutt'e due i fianchi**, in sordina, col tasto
   Avanzati in mezzo. Da confermare con la misura § 9.3.
3. **§ 5** — *«la home e lo strumento nell'app sono lo stesso componente»*: è
   scritto come se fosse vero e non lo è (§ 2). Va riscritto come **obiettivo
   con una data**, e il pezzo 1 è il primo passo verso di lì.
4. **§ 2** — la Libreria non è il sesto cerchio. I cerchi sono cinque, e la
   libreria sta nella striscia in alto, sempre visibile (§ 7.6).

---

## 12. Cosa questo documento NON fa

- **niente AI nel tasto Zack.** Rimandata (§ 3), e le due sostituzioni locali
  sono dichiarate (§ 7.2, § 7.3);
- **niente montaggio video, niente timeline** — né su Filmato né su Vocale;
- **niente formato di documento** per la sessione del suono;
- **niente sincronizzazione, niente abbonamento** prima di cento persone che
  usano lo studio gratis;
- **niente riscrittura di `App.jsx` per servizio.** È stata considerata e
  scartata: risolverebbe anche la lentezza strutturale, ma rischia i sei
  servizi in una volta sola. Se dopo il pezzo 5 la misura § 9.5 dice che serve,
  sarà il suo documento.
