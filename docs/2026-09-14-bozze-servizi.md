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

**Pool unica** (deciso il 2026-09-15: le due si sono fuse). Dentro Brain, una
sola posta in arrivo, in ordine di data, importati e generati insieme.

In più, **ogni servizio a pagamento tiene il suo storico**: in immagine, video e
voce i file generati restano nella sezione del servizio, in ordine di tempo,
scorrendo. Chi cerca «l'ultima immagine che ho fatto» la trova dov'era quando
l'ha fatta, senza passare da Brain.

Ordine cronologico, **20 visibili**. Al ventunesimo: **avviso**, e il più vecchio
esce dalla pool — **non nel cestino: resta in Brain, fra i file non
organizzati** (vedi P1: la pool è la finestra sull'archivio, non una scatola).

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

---

## B — Brain, la libreria

### Cosa sparisce

**B1** — *pelle* — **deciso.** Dalle due schermate di oggi resta **il canva e il
+ in alto a sinistra**. Via tutto il resto: i **crediti**, la **colonna destra**
(download, righello, indietro, tag), la **mascotte**, il **tasto Zack**, le
**schede-nota** sul canva, e il **menu del file** (scontorna / vettorializza /
riprendi / togli dalla tela) con la sua fila di iconcine.

Zack se ne va perché in Brain non si genera niente: qui si organizza. Il gesto
che fa partire il lavoro diventa **trascinare un file su un servizio** (B7).

### Come si presenta un file

**B2** — *impianto* — **deciso.** Si aggiungono **file di qualsiasi tipo**, e
appena entrano diventano un'**icona circolare con l'immagine del file
centrata**. È la stessa forma dell'icona output (T2): una sola forma per «un
file», in tutta l'app.

**B4** — *pelle* — **deciso.** **Niente più oggetti che non siano file**: le
note come schede spariscono. Il **titolo e la nota si scrivono sull'icona**, e
sono **ancorate al file** — viaggiano con lui, non con la tela.

### Gli strumenti, a destra

**B3** — *nuovo* — **deciso a metà.** Tre pallini sulla destra:

1. **le tre lineette** — se premuto si aprono tre mini pallini per
   riorganizzare: **freccia**, **gruppo**, **colore o icona**. Il terzo dà a un
   file un colore *oppure un'icona sua*: ne prepareremo un po' con le facce di
   Zack e degli altri personaggi, e si potranno creare icone personalizzate.
   (Vale anche come faccia dei file che non hanno un'immagine — B-g.)
2. **la pool** — una sola.

In **basso a destra**, l'ultima icona: il **cestino**.

### I gesti

**B5** — *impianto* — **deciso.** **Tenere premuta un'icona la prende in mano**,
e la si posa: sul **pocket**, sul **canva**, **dentro un'altra icona** (che così
diventa cartella), o su un **servizio in basso**.

**B6** — *nuovo* — **deciso.** Un'icona che ne contiene altre **è una cartella**.
Si fa trascinandoci dentro un file. Si può **rinominare**. L'**icona madre resta
sé stessa**: la cartella tiene la faccia che aveva.

**B7** — *impianto* — **deciso.** Un file **trascinato su un servizio diventa il
riferimento** di quel servizio, e cambiando servizio **è già lì**, senza doverlo
ricaricare.

**B8** — *impianto* — **deciso.** Un file preso dalla **galleria del telefono**
entra **nella pool degli importati** (risposta ad A8). Non è un ospite: è un
file di Brain come gli altri.

### Le domande di Brain

**B-a — Dove stanno i file non organizzati?** (domanda del committente.)
Proposta mia, vedi **P1** qui sotto.

**B-b — Il tocco semplice cosa fa?** Il disegno dice che tenere premuto **3
secondi sposta**, e più sotto che tenere premuto più di 3 secondi **scrive la
nota**. Due gesti uguali per due cose diverse. E manca il terzo: **guardare un
file**. Un cerchietto con un'immagine minuscola dentro non si vede.
Proposta: **tocco = apri** (e lì dentro ci sono nome e nota), **tenere premuto =
prendi in mano**.

**B-c — Come si toglie un file dal canva senza cancellarlo?** «Togli dalla tela»
è stato crociato insieme al resto del menu. Se l'unico posto dove posare un file
è il cestino, la tela diventa una stanza in cui si entra e non si esce.

**B-d — Il cestino restituisce?** Con Brain che è la libreria, **il cestino è
l'unico modo di perdere qualcosa**. Un dito storto su un'icona che vale 15
centesimi non deve essere definitivo. Proposta: il cestino tiene finché non lo
svuoti, e si può rovistare dentro.

**B-e — E l'annulla?** L'abbiamo tolto (B1) proprio nell'unico posto dove i file
vivono davvero. Un gruppo sbagliato, trenta file finiti dentro una cartella per
sbaglio: in Brain non c'è modo di tornare indietro.

**B-f — Le cartelle:** una cartella può stare dentro un'altra cartella? Un file
si può tirare fuori? E un file dentro una cartella **resta anche nell'archivio**
per data (dico di sì: la cartella è una scelta, la data è un fatto).

**B-g — La faccia dei file che non sono immagini.** Un'icona circolare con
l'immagine centrata funziona per le foto. Un audio cos'ha in mezzo — l'onda? Un
video il primo fotogramma con un segno di riproduzione? Un SVG?

**B-h — Il terzo mini pallino.** Il colore regge: è l'unico modo di raggruppare
a colpo d'occhio senza leggere. Ma il buco vero non è quello — vedi **P2**.

### Le risposte di Brain — 2026-09-15

**B-a** → **P1 accettata**: pool unica, finestra sull'archivio.
**B-b** → **tocco = apri, tenere premuto = prendi in mano.**
**B-c**, **B-d**, **B-e** → **accettate**: si toglie dal canva senza cancellare,
il cestino restituisce, l'annulla torna in Brain.
**B-f** → **le cartelle si annidano.**
**B-g** → audio: **l'onda**, o un'icona personalizzata. Video: **il primo
fotogramma**.
**B-h** → il colore va bene; **cercare** resta da fare, e starà nell'archivio.

**B9 — Brain sul desktop** — *pelle* — **deciso nella forma.** Come la schermata
di riferimento del committente (*Supercomputer's memory*): fondo scuro, i file
come nodi collegati da fili, le schede di testo aperte lì dove stanno, una barra
in basso per aggiungere. **Ma coi nostri pallini**, non con le schede.

⚠️ Una differenza da decidere: in quella schermata **è la macchina che dispone**
i nodi e traccia i collegamenti. Il nostro Brain è il posto dove **dispone il
cliente**. Sono due prodotti diversi sotto la stessa faccia. Terza via
possibile: dispone il cliente, e la macchina *propone*.

### Le proposte in attesa di risposta

**P1 — Le due pool non sono scatole: sono lenti su un archivio solo.**

Il problema della domanda B-a è che se il canva è dove vivono i file, il canva
diventa una discarica; e se vivono nelle pool, oltre il ventesimo spariscono.

Proposta: **esiste un archivio unico, in ordine di data, che tiene tutto.** Le
due pool sono due modi di guardarlo — *quelli che ho importato*, *quelli che ho
generato* — e le ultime venti sono solo ciò che si vede senza scorrere. **Si
scorre e si continua indietro nel tempo**, fino al primo file.

Il canva allora non è il magazzino: è **solo ciò che hai scelto di organizzare**.
Un file non organizzato non sta «da nessuna parte» — sta nell'archivio, dove è
sempre stato, e la pool è la sua porta.

Così «il ventunesimo resta in Brain non organizzato» (T4) smette di essere una
regola a parte: è solo un file che non è più fra i venti recenti.

**P2 — Manca cercare, non ordinare.** Con quaranta file il colore basta. Con
quattrocento, l'unica domanda che conta è *dov'è quella cosa di tre settimane
fa*, e nessun colore ci arriva. Non dico di disegnarlo adesso: dico che
l'archivio di P1 è il posto dove dovrà stare, e conviene saperlo mentre
decidiamo la sua forma.

---

## C — La cattura del pensiero — *nuovo* — **da decidere**

Idea del committente, 2026-09-15: un pensiero si cattura a voce **senza aprire
niente** — un tasto fisico, si parla, fine — e diventa da solo trascrizione,
titolo, categoria, riassunto, archivio interrogabile. Non un registratore: un
ingresso universale per quello che passa per la testa.

### Perché Brain è davvero il posto giusto

Un pensiero catturato è **un file audio con una nota attaccata**. È esattamente
l'oggetto che Brain ha appena finito di definire (B2, B4): icona circolare,
faccia a onda, titolo e nota ancorati al file. **Non serve inventare un tipo
nuovo**: la cattura riempie la struttura che c'è già, e la pool è la sua posta
in arrivo.

### Il muro tecnico, e come si aggira

Zack è **una pagina web**. Una pagina web **non vede i tasti del volume**, non
gira a telefono bloccato, non registra a schermo spento. Nessuna quantità di
codice cambia questo: è il browser che non lo concede.

Ma il tasto non deve essere nostro. **A noi serve la casella, non il pulsante.**
Chi cattura può essere l'automazione del telefono, che quel permesso ce l'ha già:

- **iPhone**: tasto Azione → Scorciatoia → registra → manda l'audio a un nostro
  indirizzo. Il tasto Azione fa partire una Scorciatoia **da schermo bloccato**.
  *Da verificare davvero, non a memoria:* quali passi di registrazione audio
  esistono oggi nelle Scorciatoie e se funzionano a schermo bloccato.
- **Android**: un'app che intercetta i tasti volume ha bisogno del **servizio di
  accessibilità**, e lì il rischio non è tecnico ma di **distribuzione**: Google
  tratta quel permesso con severità e rifiuta chi lo usa per scopi non di
  accessibilità. È il motivo per cui l'app che GPT ha trovato (Recko) gira come
  APK fuori dal Play Store. Da non scoprire dopo aver costruito.

### Cosa rompe, e va deciso prima

1. **La libreria locale.** Se catturo dal telefono e organizzo dal desktop, i
   pensieri devono passare da un server. Oggi **nulla di tutto ciò esiste**: la
   libreria vive nel browser. Questa è la conseguenza più pesante dell'idea, e
   non si aggira.
2. **La frase sulla home.** «Quando generi è l'unica volta che qualcosa esce.»
   Con la cattura esce anche il pensiero, e il pensiero è più intimo di un file.
3. **La regola dei tre livelli (T1).** Gratis = gira sul computer del cliente.
   La cattura è la prima cosa **gratuita che ci costa**: la trascrizione si paga
   a minuto.

### Il costo, in ordine di grandezza

La trascrizione costa **frazioni di centesimo al minuto**, e la
classificazione con un modello piccolo ancora meno: cento minuti al mese stanno
**sotto l'euro**. Ordine di grandezza da libro, **non una misura**: va misurato
come abbiamo misurato Nano Banana Pro, prima di prometterlo.

Se regge, questa è la risposta migliore alla domanda «cosa ci mettiamo
nell'abbonamento»: un costo piccolo, **ricorrente**, che cresce col valore per
il cliente invece che col nostro conto.

### Il vero punto di forza, secondo me

Il pulsante non è difendibile: esiste già, e brevettarlo è una strada che non
consiglierei. Quello che nessuno ha è che **il pensiero e la cosa che è
diventato vivono nello stesso posto**. Un'idea detta camminando, e tre settimane
dopo, sulla stessa tela, l'immagine che ne è nata. Voicenotes ha i pensieri.
Nessuno ha i pensieri accanto agli asset.

### Le risposte — 2026-09-15

**C-a — I pensieri vivono sul telefono.** Niente server. Sul desktop si dirà
apertamente che non si vedono, **finché un server non c'è**.

**C-b — Gratuito, a spese del committente**, finché l'app non viene usata. In
perdita volentieri, e consapevolmente. ⚠️ Vedi la criticità del quadro generale:
va bene a dieci clienti, non a mille. **Il tetto va messo il primo giorno**, non
quando fa male.

**C-c — Si parte da Android** (tasto volume su Samsung; sul lato Apple, tasto
dietro).

**C-d** — Le idee stanno nel quaderno, l'ordine si decide dopo. **ElevenLabs è
importante** e va integrato.

### Come entra un pensiero

Tre strade, tutte e tre valide:

1. **A mano**, come icona.
2. **Ancorato** a un'icona o a una cartella che già esiste.
3. **Camminando**, col tasto — e finisce nella pool.

E una cosa che il committente vorrebbe: **che sia l'AI a capire dove metterlo**,
da quello che si dice nel vocale. Questo però **contraddice C-a**: capire cosa
hai detto vuol dire mandare fuori il testo, o far girare un modello sul telefono.
Vedi il quadro generale, § criticità.
