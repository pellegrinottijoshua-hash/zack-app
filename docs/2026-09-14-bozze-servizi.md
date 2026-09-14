# Bozze dei servizi — il quaderno

> Quaderno di lavoro, non una spec. Si riempie un servizio alla volta, dai
> disegni del committente. Quando un servizio è chiuso, diventa una spec sua.
>
> Ogni voce ha un numero (`H1`, `S3`, `T2`…) per poterla citare senza
> ridescriverla, e un'etichetta di quanto costa farla:
>
> - **pelle** — solo interfaccia, niente sotto.
> - **impianto** — tocca la mappa condivisa dei servizi (`src/servizi/`), quindi
>   vale per tutti e sei e va deciso una volta sola.
> - **nuovo** — oggi non esiste, va costruito da zero.
>
> Tre stati: **deciso** (il committente ha risposto), **aperto** (domanda mia
> senza risposta), **da misurare** (non si decide a parole, si prova).

---

## T — Le regole trasversali

Valgono per ogni servizio. Si decidono qui, non dentro i singoli servizi:
ridiscusse sei volte diventerebbero sei regole diverse.

### T1 — I tre livelli — *impianto* — **deciso**

| Livello | Cosa apre |
|---|---|
| **Gratis, per tutti** | La home e **scontorna**. |
| **Crediti**, di generazione in generazione | **Immagine**, **video** (e la voce, da confermare). |
| **Abbonamento** | **Vettoriale**, **effetti sonori**, e ogni servizio nuovo. |

Oggi il codice ha `SERVE = ['abbonamento', 'saldo']` e mette `abbonamento` su
tutti e cinque gli strumenti locali. Scontorna gratis vuol dire un terzo valore
nella lista chiusa. La lista è chiusa apposta per questo: aggiungerne uno costa
una riga, e il test rifiuta chi ne inventa uno fuori.

Scontorna può essere gratis perché **gira sul computer del cliente**: un
milione di scontorni non ci costano niente. Le altre due colonne sono l'esatto
contrario — ogni pressione è un fornitore che ci addebita.

### T2 — L'icona output — *impianto* — **deciso**

Sotto ogni file lavorato compare un cerchietto con dentro l'immagine del file:
è l'uscita, e si può prendere in mano. Vale per **l'uscita di ogni servizio**,
non solo scontorna. Una per file, **centrata alla destra** del file.

Si può **trascinare** su un altro servizio o nel pocket, **e in più** si può
toccare: il tocco apre le destinazioni. Deciso di fare tutt'e due: sul telefono
il trascinamento lungo fallisce spesso, e quando fallisce il cliente non sa se
ha sbagliato lui. Durante il trascinamento le destinazioni possibili si
accendono.

### T3 — Il pocket — *nuovo* — **deciso**

Cerchio in alto a destra, speculare a Brain. Fino a **10 file** a portata di
mano, **4 visibili**, il resto girando. È l'astuccio della giornata: la roba che
vuoi riusare come oggetto o riferimento dentro i servizi.

**Si svuota ogni giorno.** Il nome è `pocket` (in italiano «astuccio» diventa
*pencil case* in inglese: brutto).

Svuotarlo **non cancella niente**: i file vivono in Brain (T6), il pocket ne
tiene solo il richiamo. È una scorciatoia, non un magazzino — e questo è ciò che
rende innocuo lo svuotamento notturno.

### T4 — I due pool su Brain, e il cestino — *nuovo* — **deciso**

Dentro Brain, due pool: uno dei **file aggiunti**, uno degli **output**. Ordine
cronologico, **20 per pool**. Al ventunesimo: **avviso**, e il più vecchio esce
dal pool — **non nel cestino: resta in Brain, fra i file non organizzati.**

Il pool non è un magazzino, è **la posta in arrivo**: le ultime venti cose, a
portata. Uscire dal pool vuol dire smettere di essere recente, non sparire.
(Il cestino a 24 ore è caduto: senza un posto dove cadere non serve.)

### T5 — I gesti — *impianto* — **deciso**

**Due dita muovono e ingrandiscono, un dito lavora.** Uguale in tutti i
servizi. Senza questa regola la penna e lo zoom si contendono lo stesso dito e
uno dei due deve sparire.

### T6 — **Brain è la libreria** — *impianto* — **deciso**

Non c'è una libreria separata e non c'è una libreria cancellata: **Brain è il
posto dove vivono i file**, e riorganizzarli è ciò che Brain fa. I pool sono la
sua posta in arrivo; il pocket è la scorciatoia della giornata.

Chiude da solo tre problemi che erano aperti: un output pagato non può
evaporare (resta in Brain), svuotare il pocket è innocuo, e il cestino non
serve.

Nota di fatto, per non ridecidere su una premessa sbagliata: la libreria di oggi
**non sta su un nostro server** — vive in IndexedDB/OPFS, dentro il browser del
cliente, e non ci costa niente. Il costo di cui si parlava era mandare i file
*a un server*. Quindi il magazzino non sparisce: cambia la porta, e la porta
diventa Brain. Nel codice, `Library.jsx` diventa una vista di Brain.

⚠️ **Da guardare quando progettiamo Brain:** se Brain tiene tutto per sempre, il
browser prima o poi dice basta. Su iOS lo spazio dei siti **può essere
cancellato dal sistema** quando il telefono è pieno, e svuotare i dati del sito
cancella tutto. Un magazzino che perde roba senza avvisare è peggio di nessun
magazzino: va deciso cosa succede quando lo spazio finisce, e come si cancella
apposta.

---

## H — La home

**H1** — *pelle* — **deciso.** In basso tre cerchi: **scontorna** al centro e
più grande, **genera immagine** a sinistra, **genera video** a destra. Sopra:
mascotte a sinistra, tasto **Zack** a destra. Al centro il **+**.

**H2** — *pelle* — **deciso.** In alto: **Brain all'estrema sinistra**, il
**pocket all'estrema destra**, speculari. Brain c'è sempre.

**H3** — *pelle* — **deciso.** **I crediti non si vedono in home.** Chi scarica
un'app gratis non vuole leggere «0,00 €» appena apre: vuole scontornare. I
crediti compaiono quando entra in immagine o video, cioè quando non è più in
home.

**H4** — *pelle* — **deciso.** La home è di tutti: nessun muro davanti.

---

## S — Scontorna

**S1** — *pelle* — **deciso.** Appena entra un file: il **+ lascia il centro**,
la **mascotte sparisce**. La mascotte è lo stato vuoto.

**S2** — *pelle* — **deciso.** **Download e indietro non esistono prima di
Zack.** Dopo lo scontorno compaiono a destra: **download, righello, penna,
indietro, avanti**, e la mascotte sparisce.

- **righello** = cancellare e recuperare **con precisione**.
- **penna** = recuperare o togliere altro.
- **indietro / avanti** = annulla e rifai dei gesti di scontorno, cancellazione,
  ripristino.

**S3** — *pelle* — **deciso.** Spariscono: i **crediti** in alto a sinistra, la
barra orizzontale **«fatto»**, la scritta **«scontornato»**, la **mascotte** con
un file sul piano.

**S4** — *pelle* — **deciso.** Si deve poter **ingrandire il file** per lavorare
con gli strumenti. Vedi T5 per i gesti.

**S5** — *pelle* — **deciso.** Il tasto oro tiene solo: **rapido, qualità, x2 x4
:2 :4, togli sfondo, download**.

**S6** — *pelle* — **deciso.** Con più file aggiunti, **il + sparisce a tre**.
L'icona output è una per file (T2).

**S7** — *pelle* — **da decidere insieme.** Dove va il **+** quando c'è un file:
sopra il file, sotto, o a sinistra. Proposta mia: **a sinistra del file**, così
il piano si legge «entra da sinistra, esce a destra» (l'output è a destra per
T2) e i due non si contendono lo stesso bordo.

---

## Le risposte — 2026-09-14

**A1 — Brain è gratis.** Per tutti, come scontorna. (E infatti è il posto dove
finisce il lavoro di tutti: metterlo dietro un muro vorrebbe dire chiudere fuori
un cliente dai suoi stessi file.)

**A2 — La voce sta nei crediti**, gli effetti sonori nell'abbonamento.

**A3 — Per scontornare non serve un account.** Si apre e si lavora. L'account
compare solo quando uno compra. **Conseguenza grossa:** il primo ingresso via
email di B1 smette di bloccare il lancio — lo incontra solo chi ha già deciso di
pagare, cioè chi ha una ragione per insistere.

**A4, A5, A6 — chiuse da T6:** Brain è la libreria, quindi niente evapora,
svuotare il pocket è innocuo, il cestino non serve.

**A7 — I riferimenti della generazione immagine** vengono da tre posti: dal
**pocket**, dalla **galleria del cliente** (le foto del telefono), e da **Brain
trascinando un file sull'icona immagine** — e cambiando servizio il riferimento
è già lì. Oggi il selettore pesca solo dalla libreria: cambia.

**A9 — L'abbonamento va arricchito**, ed è già previsto: un pacchetto di effetti
sonori ben fornito, e il vettoriale reso davvero semplice da usare.

## Ancora aperte

**A8** — Un file che arriva dalla **galleria del telefono** dove atterra: entra
in Brain come i file aggiunti, o resta un ospite che serve solo per quella
generazione?

**A10** — Lo **spazio che finisce**: vedi l'avvertenza in T6. Si decide
progettando Brain.
