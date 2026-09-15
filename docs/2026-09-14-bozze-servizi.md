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

**H1-bis — la fila cambia con l'abbonamento** — *impianto* — **deciso il
2026-09-15.** In basso sull'app, in alto sulla webapp: è la stessa fila.

- **Senza abbonamento** si vedono **tre** cerchi: immagine · **scontorna** ·
  video. Sono i tre che non richiedono abbonamento (i primi due livelli di T1),
  ed è esattamente il disegno di H1.
- **Con l'abbonamento** diventano sette, in quest'ordine: **1** vettoriale,
  **2** editor di testo, **3** immagine, **4** **scontorna**, **5** video,
  **6** vocale, **7** effetti sonori. Scontorna resta **al centro** anche da
  sette, ed è il motivo per cui l'ordine è questo.

Due cose che ne conseguono, e che non vanno lasciate scivolare:

1. **L'«editor di testo» non esiste ancora** come servizio: oggi si scrivono
   note e documenti **dentro Brain**. Il posto nella fila è prenotato, ma il
   cerchio si accende il giorno che il servizio c'è — un cerchio dichiarato che
   non fa niente è il difetto del righello del 2026-09-04.
2. **La fila si accorcia con la stessa regola del muro, non con una regola
   sua.** Finché il muro è spento, i cinque strumenti locali funzionano per
   tutti: nasconderli sarebbe toglierli a chiunque, compreso chi paga, senza
   che nessuno possa abbonarsi (il primo ingresso via email è ancora rotto).
   Quindi la fila corta arriva **quando si accende il muro**, e si accorcia da
   sola. Una regola, non due che possono divergere.

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

## D — La home del desktop: la vetrina che lavora — *nuovo* — **da rifinire**

Idea del committente, 2026-09-15. Oggi la home del desktop è un tasto Zack e la
mascotte: una vetrina. Dopo, diventa **un banco di lavoro con tre corsie**,
subito usabili senza entrare da nessuna parte:

- **a sinistra, scontorna — con scritto FREE.**
- **al centro, la mascotte** (in video).
- **a destra, immagine e video**, una sotto l'altra.

Ognuna delle tre ha le stesse quattro cose: il **tasto Zack personalizzabile**,
il **+ per i riferimenti** (che diventano pallini), lo **spazio del prompt**, e
il tasto Zack che permette di **salvare i prompt** — prompt 1, 2, 3, 4.

I **crediti** stanno in alto a sinistra, sotto «entra nello studio». La frase
cardine: **«Zack only the best models»** (o simile).

**Perché regge:** la cosa gratuita e la cosa a pagamento stanno **sullo stesso
schermo**. Chi arriva non deve credere a una promessa: scontorna un file, vede
che funziona, e le altre due corsie sono lì accanto già pronte. È il prodotto che
si vende da solo, senza una riga di persuasione.

**Come si tiene insieme col telefono:** sull'app si apre **scontorna**, e sotto
ci sono immagine e video (poi voce, vettoriale, pacchetti sonori). Sono le stesse
tre cose, disposte diversamente. Una testa sola, due corpi.

### Le domande della home desktop

**D-a — Dove va a finire quello che la home dice oggi?** La riservatezza, i
cinque strumenti, i dodici centesimi, il prezzo. Scende sotto il banco di lavoro,
o sparisce? Quel testo è ciò che spiega **perché** fidarsi.

**D-b — I crediti a chi non è ancora entrato.** Sul telefono abbiamo deciso di
**non** mostrare «0,00 €» a chi apre per la prima volta, perché deprime prima
ancora di aver provato (H3). Sul desktop varrebbe lo stesso: a uno sconosciuto
mostriamo zero? Proposta: al posto del saldo, **il prezzo di ciò che sta per
fare** — che è la stessa informazione, ma detta al contrario.

**D-c — Cosa succede premendo Zack senza crediti e senza account?** Se uno scrive
un prompt, preme, e solo lì scopre che serve entrare e pagare, è il momento
peggiore per dirglielo. Il preventivo esiste già: **il prezzo va accanto al tasto
prima di premere**, come dentro lo studio.

**D-d — I prompt salvati** — **deciso.** Sono **la personalizzazione del tasto
Zack** di immagine e video. Si costruiscono nei due servizi direttamente, oppure
in Brain, da qualche parte, **tramite un'icona**.

Proposta per non rompere la regola «in Brain solo file»: **un prompt è un file di
testo.** Così è un'icona come tutte le altre, sta nelle cartelle, ha una nota, si
trascina su un servizio — e non serve inventare un secondo tipo di oggetto.

### D-h — Comprare senza account — *nuovo* — **idea forte, con un vincolo duro**

Idea del committente: premi Zack senza essere nessuno, metti la carta (se vuoi
la salvi), e generi. E **costa un po' di più** proprio perché non hai un account:
immagine 18 centesimi invece di 15, video poco di più. Chi si fa l'account paga
meno.

**La strategia è giusta, e risolve il nostro problema peggiore.** L'ingresso via
email è il pezzo rotto di B1 ed è l'unica porta verso i soldi: così **la porta
sparisce**. Uno paga e genera senza ricevere nessuna email. E far pagare di più
chi non si registra non è un trucco: è **il vero costo** di quel cliente (vedi
sotto), quindi la differenza di prezzo è onesta e si può anche spiegare.

⚠️ **Ma un pagamento da 18 centesimi non esiste.** Le commissioni della carta
sono una percentuale **più una parte fissa** (~0,25 € a transazione, carte
europee). Quindi:

| Importo singolo | Commissione | Ci resta |
|---|---|---|
| **0,18 €** | ~0,25 € | **−0,07 € — ci rimettiamo** |
| 1,00 € | ~0,27 € | 0,73 € (26% se ne va) |
| 2,00 € | ~0,28 € | 1,72 € (14%) |
| 5,00 € | ~0,33 € | 4,67 € (6,5%) |

Sotto l'euro, **la commissione costa più della vendita**. Non è un problema di
Stripe: è come funzionano le carte, ovunque.

**Quindi la forma che regge non è «compra una generazione»: è «compra un
gettone minimo».** Premi Zack, paghi **un euro** — che vale una generazione
video o cinque immagini a 18 centesimi — generi subito, e l'avanzo resta lì per
la prossima. Il preventivo davanti al tasto resta identico; cambia solo che il
taglio minimo esiste.

**Due cose da risolvere prima di farlo:**

1. **L'avanzo di chi non ha un account dove vive?** In un gettone dentro il
   browser. Se il cliente svuota i dati del sito, **ha perso i suoi soldi**. Va
   detto in faccia, e va offerto un modo di salvarli (un'email, quando vuole
   lui).
2. **L'IVA su un cliente di cui non sappiamo niente.** Vendere a consumatori
   europei senza sapere dove sono è esattamente la domanda aperta del
   commercialista. Stripe sa raccogliere le prove del paese, ma la decisione non
   è tecnica.

**D-e — I riferimenti sulla home da dove si pescano?** Pocket e Brain esistono
solo per chi è entrato. Per uno sconosciuto restano il computer e basta.

**D-f — «Only the best models» è una promessa che poi va mantenuta.** Vuol dire
che quando esce un modello migliore **si cambia**, e il prezzo si muove con lui.
Per fortuna il listino è costruito proprio così — un servizio, una riga — quindi
è mantenibile. Ma va mantenuta, e il giorno che non lo facciamo la frase diventa
una bugia sulla prima schermata.

**D-g — La mascotte in video al centro** è un asset da produrre, non da
programmare. Va messo in conto a parte. **E le va lasciato spazio per muoversi**,
anche poco, sia nella home sia sotto il banco di lavoro: non è un'immagine
incastrata fra due colonne, è qualcuno che sta lì.

**D-a — risposta:** le spiegazioni ci sono tutte, **sotto il banco di lavoro**.

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

**C-b — Gratuito, a spese del committente**, con un budget dichiarato: **fino a
~50 € al mese** persi volentieri, nella fascia dei primi 100-1000 clienti.
Quando la cosa starà dentro un abbonamento da 2,99/3,99 €, si riparla.

Quel budget si traduce in un tetto preciso (listino, da misurare: ~0,0055 € al
minuto):

| Tetto gratuito | Costo per cliente | 100 clienti | 1.000 clienti |
|---|---|---|---|
| 3 minuti al giorno | ~0,50 €/mese | **~50 €** ✅ | ~500 € ❌ |
| 10 minuti al giorno | ~1,65 €/mese | ~165 € | ~1.650 € |

Quindi: **circa 3 minuti al giorno** è il tetto che sta dentro i 50 €, e regge
fino a cento clienti. Da lì in poi serve una delle due: la trascrizione gratuita
del browser, oppure che sia l'abbonamento a pagarla.

⚠️ E un numero da tenere per dopo: **dentro un abbonamento da 2,99 €**, dieci
minuti al giorno di trascrizione si mangiano **più della metà** dell'incasso;
tre minuti se ne mangiano un sesto. Il tetto non serve solo ai regali.

**C-c — Si parte da Android** (tasto volume su Samsung; sul lato Apple, tasto
dietro).

**C-d** — Le idee stanno nel quaderno, l'ordine si decide dopo. **ElevenLabs è
importante** e va integrato.

### Il tasto: risolto su Samsung — 2026-09-15

**Provato sul telefono del committente.** «Due tocchi» sul tasto laterale si può
legare a due cose che ci servono:

- **Registratore vocale → Avvia registrazione.** Registra l'app di Samsung.
  A noi il file arriva **condividendolo** verso Zack installato come app: Android
  sa mandare un file a un'app installata, e una pagina web installata **può
  ricevere** (da verificare sul nostro impianto). Più tocchi, zero codice di
  cattura.
- **Applicazioni → Zack.** Un tocco solo, e Zack si apre. Perché parta anche la
  registrazione, l'app deve aprirsi già dentro la schermata di cattura e
  registrare da sola — **fattibile se il permesso del microfono è già dato**, ed è
  da provare.

**Provato — e il risultato è una brutta notizia.** Il registratore parte **a
telefono bloccato**. Zack **pretende lo sblocco**, poi si apre.

⚠️ **Questa differenza non la possiamo colmare, e non dipende da come è fatto
Zack.** È Android che permette solo alle app di sistema di comparire sopra il
blocco; un'app di terze parti — tanto più una pagina web installata — non ha il
modo di chiederlo. Non c'è codice né accordo con Samsung che ci arrivi: quel
permesso lo dà il sistema a sé stesso.

**Quindi la cattura passa dal registratore di Samsung**, che quel privilegio ce
l'ha. E la cosa regge, perché il problema si spacca in due:

- **catturare** deve essere senza attrito, e lo è: doppio tocco, parli, fine.
- **archiviare** non ha fretta: i vocali si mandano a Zack **dopo**, anche
  cinque insieme, con la condivisione di Android — quando riapri l'app con
  calma.

L'attrito, insomma, si sposta dove non fa danno: l'idea è già salva.

**La terza strada — e va corretto quello che avevo scritto prima.** Il divieto
di comparire sopra il blocco vale per **la pagina web**. Un'**app Android vera**
invece può: esiste un permesso apposta (`showWhenLocked`), quello che usano le
sveglie e le chiamate. Quindi una piccola app nativa **può fare esattamente
quello che fa il registratore di Samsung**: doppio tocco → Applicazioni → si apre
sopra il blocco → registra.

Sarebbe **Zack per il cliente**: stesso nome, stessa icona, stesso conto. Ma
sarebbe **un secondo programma**, non la stessa cosa: altro linguaggio, account
sul Play Store, revisione di Google, aggiornamenti a parte. Deve fare una cosa
sola — registra e manda — e per questo è piccola davvero.

**Quello che invece non si può fare in nessun caso:** che Zack **vada a prendersi
da solo** i vocali dalla cartella del registratore di Samsung. Le app non si
frugano nelle cartelle a vicenda; il modo previsto da Android perché due app si
parlino è **la condivisione**, e la deve avviare una persona. Anche un'app nativa
nostra potrebbe leggere quella cartella solo chiedendo al cliente un permesso
sui file, e solo dopo che lui l'ha concesso.

### Crypto al posto delle carte? — **valutato, e no (per ora)**

Domanda del committente: un portafoglio Solana integrato, ci metti 5-10 € una
volta, poi paghi 18 centesimi a immagine senza commissioni.

**È vero che le commissioni sparirebbero** — su Solana un pagamento costa
frazioni di centesimo, e il problema del taglio minimo non esisterebbe.

**Ma il conto vero non è quello.** Per pagarci in crypto, il cliente deve prima
*avere* crypto: iscriversi a un exchange, farsi identificare, comprare con una
carta — pagando lì le commissioni che volevamo evitare — e installare un
portafoglio. Per il pubblico che vogliamo prendere («voglio un'immagine adesso»)
è **più attrito, non meno**: scambiamo 25 centesimi di commissione con venti
minuti di iscrizioni.

E due cose più serie: **tenere i soldi degli altri dentro un portafoglio nostro
ci rende custodi**, che in Europa è un'attività con licenza, non una funzione da
programmare; e **l'IVA resta dovuta in euro**, con ogni incasso da valorizzare al
cambio del momento — cioè esattamente il contrario di semplificare i conti.

**Il problema che risolveva ce lo siamo già risolto**: il taglio minimo da 1 €
porta le commissioni sotto il 30%, e da 5 € sotto il 7%.

**Quando avrebbe senso:** come binario *in più*, non al posto delle carte, il
giorno che il pubblico crypto fosse una fetta vera dei clienti. Allora si
riapre — e senza portafoglio nostro, ma collegando il loro.

Sull'iPhone non esiste il doppio tocco laterale: là sono il tasto Azione (dai 15
Pro) o il tocco sul retro, tramite una Scorciatoia.

### «Trascrivi» diventa un tasto, non una regola — **deciso**

Risposta del committente alla contraddizione C-3, ed è migliore della domanda:
**la trascrizione è un'opzione, su ogni singolo pensiero, e si paga a parte.**

Il vocale resta sul telefono, cieco e tuo. Se vuoi che diventi una nota scritta e
riassunta, **premi**, e in quel momento il testo esce. Nessuna regola generale da
spiegare, nessuna promessa da rompere: la scelta è di volta in volta, di chi
parla.

È lo stesso principio del preventivo («ogni generazione ti dice quanto costa
prima che tu prema»), applicato alla riservatezza invece che ai soldi. Due volte
la stessa forma: **niente succede alle tue spalle.**

### Come entra un pensiero

Tre strade, tutte e tre valide:

1. **A mano**, come icona.
2. **Ancorato** a un'icona o a una cartella che già esiste.
3. **Camminando**, col tasto — e finisce nella pool.

E una cosa che il committente vorrebbe: **che sia l'AI a capire dove metterlo**,
da quello che si dice nel vocale. Risolto dal tasto «trascrivi»: chi preme
accetta che il testo esca, e allora la classificazione arriva insieme.

---

## E — Lo studio nuovo, e le bozze dei servizi

> ⚠️ **Da qui in avanti sono proposte mie, non decisioni del committente.**
> Servono da bozza scritta su cui discutere, servizio per servizio. Ogni
> paragrafo è una cosa che si può buttare.

### E0 — La pianta dello studio — **richiesta del committente**

**I servizi in alto. Brain a sinistra.**

Come l'ho capita: una **fila di servizi in alto** (scontorna, immagine, video,
voce, effetti, vettoriale) — sempre visibile, si cambia stanza con un colpo
d'occhio invece che da una barra in basso. E **Brain sulla sinistra**, permanente,
perché è la libreria e ci si pesca dentro mentre si lavora.

Quello che ne consegue, e che va deciso:

- **Gli strumenti del servizio** (penna, righello, indietro…) oggi stanno a
  destra. Se i servizi salgono in alto, la destra resta libera per loro: la
  proposta è **servizi sopra, strumenti a destra, Brain a sinistra, il tasto
  Zack in basso al centro**. Quattro bordi, quattro mestieri, nessuna
  sovrapposizione.
- **Il pocket** in alto a destra, com'era: è il solo che non appartiene a una
  stanza.
- **Brain a sinistra è una colonna aperta o un tasto che la apre?** Aperta mangia
  larghezza alla tela; chiusa costa un clic. Proposta: **una striscia stretta di
  icone**, che si allarga quando ci trascini sopra qualcosa.

### E1 — Immagine (Nano Banana Pro) — *esiste a metà*

**Cosa fa:** scrivi cosa vuoi, aggiungi riferimenti, esce un'immagine.
**Chi può:** chiunque abbia crediti. Nessun abbonamento.

**La schermata:** in alto il prompt. Sotto, i riferimenti come pallini, col **+**
che li aggiunge da pocket, galleria o Brain. Due pastiglie: **rapida** e
**grande**. In basso il tasto Zack, **col prezzo accanto**.

**Il prezzo:** oggi **0,146 €** senza riferimenti, **0,154 €** con quattordici —
misurati, non stimati. Si vede prima di premere, sempre.

**L'uscita:** l'immagine sul piano, l'icona output alla sua destra, e la copia
nella pool di Brain. **In più: lo storico del servizio** — scorrendo dentro
«immagine» trovi tutte le immagini che hai fatto, in ordine di tempo.

**Cosa non fa:** niente 4K, niente modifica dell'immagine uscita (quella è
un'altra generazione), niente code di dieci immagini insieme.

**Domande:** il prompt si salva come icona (D-d) — dove si vedono i prompt
salvati, in una pastiglia accanto al tasto? E se una generazione fallisce, il
rimborso lo diciamo o lo facciamo in silenzio? (Oggi lo facciamo e lo diciamo.)

### E2 — Video (Seedance) — *da costruire*

**Cosa fa:** da una frase e da un'immagine di partenza, esce un video corto.
**Chi può:** chiunque abbia crediti.

**La schermata:** come immagine, con due cose in più: **la durata** (4 o 8
secondi) e **il formato** (verticale o orizzontale). Il primo riferimento ha un
ruolo speciale: è **il primo fotogramma**, non un'ispirazione.

**Il prezzo:** **da misurare prima di scrivere una riga di codice**, come abbiamo
fatto per l'immagine. Ordine di grandezza atteso: fra venti e sessanta centesimi
a video. Finché non è misurato, non si pubblica.

**La cosa nuova e scomoda: il tempo.** Un video non arriva in otto secondi come
un'immagine: arriva in minuti. Quindi il lavoro deve **restare aperto anche se
chiudi la pagina**, e ritrovarsi finito quando torni. La tabella dei lavori e lo
spazzino che li chiude esistono già da B2: è il pezzo che ci ripaga.

⚠️ **Va detto quanto dura, prima di premere.** Senza quel numero la gente preme
due volte, e la seconda volta si paga di nuovo.

**Cosa non fa:** niente montaggio, niente audio, niente video più lunghi di otto
secondi.

**Domande:** avvisiamo quando è pronto? Una pagina web può mandare una notifica
solo se il cliente l'ha installata e ha detto di sì. Vale la pena chiederglielo
proprio lì, dove il motivo è evidente.

### E3 — Voce (ElevenLabs) — *da costruire*

**Cosa fa due cose diverse**, e vanno tenute separate anche se stanno nella
stessa stanza:

1. **Leggi questo** — un testo, una voce, esce l'audio.
2. **La mia voce** — registri un po' di te, e poi quella voce legge.

**Chi può:** crediti.
**Il prezzo:** a caratteri per la lettura, a parte per la clonazione. Da misurare.

**L'uscita:** un file audio, icona a onda, nella pool. La **voce clonata** invece
non è un'uscita: è **un asset che resta**, e va in Brain come icona sua, da
riusare.

⚠️ **Il consenso.** Clonare la propria voce è un conto; clonare quella di un
altro è un problema legale vero, e ci arriva addosso a noi. Ci vuole una spunta
esplicita — *questa voce è mia, o ho il permesso di chi parla* — prima della
registrazione, non dopo.

**Cosa non fa:** doppiaggio di un video, sincronia labiale, cori. Dopo.

### E4 — Effetti sonori — *da costruire, metà materiale metà servizio*

**Due cose sotto lo stesso tasto:**

1. **Il pacchetto** — effetti già pronti, ordinati per famiglia (colpi, passi,
   vento, interfaccia). **Sta nell'abbonamento**, non costa a consumo, e non
   dipende da nessun fornitore: sono file nostri.
2. **Inventane uno** — lo descrivi e viene generato. **A crediti.**

Il pacchetto è ciò che rende l'abbonamento meno magro, e si costruisce una volta
sola. La generazione arriva dopo, con la stessa chiave della voce.

**Domanda:** quanti effetti fanno «ben fornito»? Sotto i cento sembra una
demo; oltre i cinquecento diventa un problema di ricerca, non di scelta.

### E5 — Vettoriale, reso semplice — *esiste, ma è ostico*

**Il problema di oggi:** chiede al cliente parametri che nessuno sa tarare.

**La bozza:** **un tasto, tre pastiglie** — poster, foto, bianco e nero — e
**l'anteprima affiancata**, l'originale a sinistra e il tracciato a destra, che
si aggiorna cambiando pastiglia. Tutto il resto (soglie, curve, numero di colori)
sotto **«avanzati»**, chiuso, per chi lo cerca.

**Chi può:** abbonamento. Gira sul computer del cliente, non ci costa niente.

**Cosa non fa:** modifica dei tracciati a mano. C'è già un editor: resta dov'è.

**Perché conta:** insieme al pacchetto di effetti, è metà di quello che
l'abbonamento vende oggi. Se resta ostico, l'abbonamento vende una cosa sola.

---

## Le risposte alle bozze — 2026-09-15

**E0 — Brain è un'icona**, e premuta apre **il suo canva a parte**, la sezione
come l'abbiamo progettata. Non una colonna aperta. Servizi in alto, strumenti a
destra, Zack in basso: confermato.

**E1 — Immagine.** I **riferimenti stanno in alto, sotto il prompt**, come
pallini. Le due pastiglie rapida/grande **spariscono**: misura e formato vanno
**dentro il bottoncino oro** del tasto Zack — **1K, 2K** e **tutti i formati**
(9:16, 16:9, 1:1 e gli altri). Buona notizia: **il formato non cambia il prezzo**,
e neanche 1K contro 2K. Quindi si possono dare tutti senza toccare il listino.
I **prompt salvati** si vedono in un'icona apposta dentro Brain, chiamata
**«prompts»**, e nel bottoncino oro come prompt 1, 2, 3, 4. **Il rimborso si
dice**, non si fa in silenzio.

**E2 — Video.** Seedance 2.5 deve fare **le stesse cose che fa dentro Higgsfield
o Dreamina, senza eccezioni**: stesso numero massimo di riferimenti, stesse
opzioni nel bottoncino oro.

⚠️ **Il vincolo che non dipende da noi:** Higgsfield e Dreamina sono interfacce
costruite *sopra* il modello, e una parte di quello che mostrano potrebbero
farla loro, non l'API. **Primo passo obbligatorio:** leggere la documentazione
del fornitore e fare la tabella di ciò che l'API espone davvero, accanto a ciò
che Higgsfield mostra. Dove manca qualcosa, si decide se costruirla noi o
lasciarla fuori — ma si scopre **prima**, non a metà.

**E3 — Voce: tutto ElevenLabs, non due servizietti.** Creare voci, clonare la
propria e quella di amici consenzienti, **sovrapporre la propria voce a
un'altra dentro un video**. Si integra tutto ciò che l'API permette; ciò che non
permette si cerca altrove.

Resta il consenso: clonare la voce di un amico consenziente **va bene**, ma il
consenso va **chiesto e registrato**, perché se un domani qualcuno si lamenta
la richiesta arriva a noi.

**E4 — Effetti.** Il committente comprerà un pacchetto e lo integreremo.
⚠️ **Attenzione alla licenza, non al prezzo:** un pacchetto «gratis» non basta —
serve una licenza che permetta di **ridistribuirlo** dentro un prodotto a
pagamento. Le raccolte CC0 vanno bene; molte «free» no.
**Alternativa da valutare:** generarci il pacchetto da soli con ElevenLabs, una
volta, e possederlo. Costa pochi euro e risolve la licenza alla radice.

**E5 — Vettoriale.** La cosa più importante non sono le pastiglie: è che
**modificare i nodi di un logo oggi è impraticabile**. È quello il lavoro.

**Play Store — si comincia a ragionarci.** Vedi la scaletta.

**Il portafoglio Zack.** Idea: crearlo in due clic, non custodire noi i soldi,
comprare 5 € di SOL con la carta dentro Zack.
⚠️ **Il numero che smonta il risparmio:** comprare crypto con carta costa **più**
di Stripe, non meno — chi vende crypto al dettaglio prende commissioni ben più
alte di 25 centesimi su 5 €, spesso minimi fissi da 3-4 €. Le commissioni
scompaiono **dopo**, dentro la catena: quindi il vantaggio esiste solo per chi
**ha già** crypto.
**La versione buona dell'idea:** non creare portafogli, ma **accettare crypto
come modo di ricaricare** per chi ce l'ha già. Noi riceviamo e accreditiamo nel
nostro listino in millesimi, che esiste ed è collaudato. Niente custodia, niente
licenze, e il giro dei rimborsi resta quello di adesso.
