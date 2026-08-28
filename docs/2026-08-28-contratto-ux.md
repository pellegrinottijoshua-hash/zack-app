# Il contratto UX — mobile e desktop

**Data:** 28 agosto 2026
**Da:** i quattordici disegni in `~/Desktop/zack ux ui/` e le risposte alle
diciotto domande.
**Stato:** deciso, salvo i due punti in fondo.

Questo documento è la fonte: se un pixel non è d'accordo con quello che c'è
scritto qui, ha torto il pixel.

---

## 1. L'impianto — cosa sta dove, e non si sposta mai

Due famiglie di comandi, e **non stanno mai nello stesso posto**. È la regola
che rende l'app imparabile: dopo due minuti sai dove guardare senza pensarci.

| | **servizi** (cambiano app) | **strumenti** (cambiano servizio) |
|---|---|---|
| **mobile** | **sempre in basso** | sempre a destra o a sinistra |
| **desktop** | **sempre a sinistra** | in alto o a destra |

Sempre presenti, in ogni servizio:

- **in alto al centro:** il logo di Zack **riadattato al servizio** (§ 4);
- **in alto a destra:** lo **scarica**;
- **il `+`**, sulla tela (§ 5);
- **il tasto ZACK** col **punto oro** (§ 3);
- **la mascotte**, che sulla home fa cose e nell'app no.

---

## 2. I servizi: sei

I tondi numerati nei disegni erano segnaposto. Sono **sei**.

### Desktop — colonna a sinistra

Ordine fissato: **Brain per primo, il bg remover secondo.**

### Mobile — barra in basso, e il centro è il posto d'onore

Il tondo **centrale è più grande**: è il servizio aperto. Si comincia col bg
remover al centro.

Premendo un altro tondo succedono **due cose in quest'ordine**:

1. compare **l'iconcina 2D del personaggio** di quel servizio, per un attimo;
2. **quel tondo diventa il centrale**, e cresce.

⚠️ Vuol dire che la barra **si riordina a ogni scelta**. Da decidere quando lo
costruiamo: gli altri scorrono di una posizione (l'ordine resta stabile e si
impara) oppure il premuto e il centrale si scambiano di posto (movimento più
corto ma l'ordine cambia ogni volta). **La prima**, direi: una barra che si
rimescola non si impara più.

---

## 3. Il tasto Zack, e il punto oro

### Dove sta

| | |
|---|---|
| **mobile, ovunque** | **in basso a destra**, dove sta il pollice |
| **home desktop, tela vuota** | grande, **al centro** |
| **home desktop, con file** | si sposta **in alto a destra, sopra il video di Zack** |
| **app desktop** | **in alto a destra da subito**, più piccolo |

### Il punto oro

Un cerchietto d'oro **in alto a destra del tasto**. Premuto **si espande** e
rivela le impostazioni della catena, che si segnano come predefinite.

⚠️ **Il bersaglio va più grande di quanto sembri.** Su un telefono, sotto i
**44×44 px** un comando si sbaglia — è la misura minima che tutti usano perché
è la larghezza media di un polpastrello. Quindi: il **pallino disegnato resta
piccolo** (12-14 px, altrimenti compete col tasto), ma la **zona premibile**
attorno è 44. Si fa senza che si veda: area trasparente, pallino dentro.

### Il pannello che copre la tela

Si apre **sopra la tela**, ed è un'eccezione dichiarata alla regola *«gli
strumenti non coprono la tela»*. È ammessa perché è **un momento e non uno
stato**: si apre, si sceglie, si chiude. La differenza col resto degli
strumenti è che quelli restano aperti mentre lavori.

---

## 4. Le facce: due famiglie diverse

Erano una cosa sola nella mia testa. Sono due.

### A — Il logo del servizio, fisso, in alto al centro

Zack riadattato a ciò che il servizio fa. **Uno per servizio, sei in tutto:**

| servizio | Zack |
|---|---|
| Brain | concentrato |
| Vettorializza | con un vettore |
| Suono | a bocca aperta |
| Filmato | col tasto play |
| Scontorna | *(da definire)* |
| Libreria | *(da definire)* |

Sta lì sempre, non si muove, non reagisce. **È l'insegna del negozio.**

### B — I personaggi 2D, che compaiono e se ne vanno

Da `~/Desktop/zack the duck/2d`, in lavorazione. **Un personaggio per
servizio**, più **una emoji per quasi ogni filtro**.

Compaiono **brevemente al tocco** di un servizio o di un filtro, su mobile e su
desktop, e spariscono.

⚠️ **Il colore non è mai l'unico segnale** — e nemmeno una faccia che passa.
Una faccia che compare per mezzo secondo non può essere **l'unica** conferma
che il comando ha funzionato: sotto ci vuole comunque lo stato che cambia (il
tondo che diventa centrale, il filtro che si accende).

---

## 5. I file, il `+`, lo scarica

| | quanti file | il `+` |
|---|---|---|
| **home** (gratis) | **3** | si vede con 1 o 2, **sparisce al terzo** |
| **app desktop** | **fino a 20** | resta finché c'è posto |

- **lo scarica in alto a destra** porta via **tutti** i file;
- **l'iconcina dentro ogni riquadro** porta via **quello solo**.

**La home e lo strumento nell'app sono lo stesso componente**, con tre
differenze dichiarate: nell'app il tasto Zack è più piccolo, non c'è il video
della mascotte ma un caricamento semplice, e ci sono gli altri strumenti.

---

## 6. Gli strumenti di correzione

**Tre, e i nomi sono questi:** `RIGHELLO`, `RIPRISTINA`, `CANCELLA`.

- **compaiono dopo il risultato**, non prima: prima non c'è niente da correggere;
- **si usano direttamente** — si toccano e si disegna;
- **selezionandone uno compaiono i tastini della misura del tratto.** Le misure
  esistono già e sono misurate: 4, 10, 25, 60, 120 px dello schermo.

### Lo zoom

Nei disegni non c'era, e senza non si corregge un bordo: misurato il
2026-08-27, a 8× la matita più fine passa da 24 pixel veri a **3**.

- **desktop:** una **barra verticale `+` / `−` accanto a ogni file**. E si può
  **ingrandire un file solo, lavorarci, e tornare indietro**;
- **mobile:** le due dita, più la stessa barra `+`/`−` — perché il pinch non si
  scopre da solo e non tutti lo usano.

Il righello è già costruito nella sua parte matematica
(`src/engine/righello.js`, 12 test). Manca solo la mano.

---

## 7. Lo scorrimento della home: **coda con salto all'ultima**

Scelta: **B**. La pagina scorre libera, Zack finisce il gesto in corso, e poi
**salta direttamente all'azione della sezione dove ti sei fermato** — non
esegue quelle saltate.

Le tre situazioni, esplicitamente:

### 1. L'utente usa il bg remover
**3-5 mini clip** di Zack che fa cose, mentre si aspetta. Girano a rotazione
finché il lavoro non è finito.

### 2. L'utente scorre cinque volte
Una clip per sezione. Se scorre più veloce di quanto Zack finisca, le clip
saltate **non si accodano**: si esegue quella d'arrivo. Chi scorre veloce vede
**un gesto solo**, non cinque accelerati.

### 3. L'utente torna in cima
**Una clip dedicata: Zack fa un salto impegnandosi tantissimo e atterra nella
posizione iniziale.** È l'unica clip che non è legata a una sezione ma a un
gesto — e chiude il giro riportandolo esattamente da dove è partito.

### La richiesta tecnica per chi gira le clip

Perché un gesto interrotto non si veda:

> **L'azione sta nella parte centrale della clip, e gli ultimi ~15 fotogrammi
> sono il ritorno alla posa comune.**

Se l'azione finisce sull'ultimo fotogramma, troncarla si vede. Con la coda di
ritorno, invece, interrompere costa mezzo secondo e nessuno se ne accorge.

---

## 8. L'app e il sito sono già due cose

`public/manifest.webmanifest` dice `"start_url": "/app/"`. **Chi installa
l'app apre direttamente lo studio e la home non la vede mai.** Era già così:
non c'è niente da costruire.

⚠️ **Un difetto da riparare lì dentro:** `background_color` e `theme_color`
sono `#111111`, scritti prima che la palette venisse invertita il 2026-08-26.
Se il primo schermo adesso è panna, all'apertura dell'app si vede **un lampo
nero**. Vanno portati a `#f5f0e8`.

Resta da decidere **dove sta l'abbonamento** dentro l'app.

---

## 9. I due punti che restano aperti

### 9.1 Il suono con le tracce — dove si mette il confine

Alla domanda «quante tracce, si trascinano, si tagliano?» la risposta è stata
*«più funzioni riusciamo a mettere meglio è»*. Va detto una volta, poi decidi
tu: **è il criterio contro cui questo progetto è stato scritto.** «Niente
timeline» sta fra le regole non negoziabili, e la ragione era una sola — è il
problema più costoso del settore.

Per l'audio costa meno che per il video, ed è per questo che si può fare. Ma
la differenza fra le due versioni è enorme:

| | costo | cosa dà |
|---|---|---|
| **Mettere N suoni in fila**, ognuno con inizio e durata | piccolo: è programmazione di `AudioContext` e una resa finale | il 90% di quello che serve |
| **+ taglio sull'onda, volume per clip, dissolvenze, annulla su più tracce** | grande | il 10% che usano i professionisti, che hanno già altri strumenti |

**La riga che propongo, e che tiene il resto in piedi:**

> **La sessione del suono non si salva come progetto.** Si compone, si esporta,
> finita.

Nel momento in cui una sessione si salva e si riapre, abbiamo comprato un
**formato di documento**: versioni, compatibilità all'indietro, file rotti da
riaprire fra sei mesi. È lì che il costo esplode, non nelle tracce.

**Con quella riga si possono aggiungere quante funzioni si vuole**, e nessuna
di esse diventa un debito permanente.

### 9.2 La barra dei servizi che si riordina

Vedi § 2: gli altri scorrono di una posizione, o il premuto scambia col
centrale? Consiglio la prima.

---

## 10. Cosa si può costruire subito, senza aspettare

Ordinato per «quanto è già pronto sotto»:

1. **Il lampo nero del manifest** — due valori;
2. **Il punto oro con l'area premibile a 44 px** — è un dettaglio che si
   sbaglia una volta sola e poi non si guarda più;
3. **L'interfaccia del righello** — la matematica c'è, testata;
4. **La barra `+`/`−` dello zoom accanto a ogni file** — il meccanismo c'è già
   nel pennello (misurato fino a 8×);
5. **La barra dei servizi nelle due posizioni** (basso su mobile, sinistra su
   desktop) — è impaginazione, e non dipende da nessun asset;
6. **I sei loghi di servizio** — appena arrivano i prompt e i file.
