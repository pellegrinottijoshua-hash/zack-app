# Zack mascotte, Brain, e la questione «app Zack»

> Sessione 2026-08-26. Risponde ai punti aperti in [RIPRENDI-QUI.md](../RIPRENDI-QUI.md)
> §7 (mascotte) e apre un servizio nuovo richiesto dal committente (Brain).
> I prompt degli asset stanno in [zack-asset-plan.md](zack-asset-plan.md).
> Nessuna riga di codice scritta: questo è il disegno da approvare prima.

---

## 0. Il conflitto di palette non esiste

Prima cosa da verificare secondo §7, e si chiude subito.

| | nero | panna | oro | grigio |
|---|---|---|---|---|
| JAYL | `#111111` | `#F5F0E8` | `#C4A35A` | `#8A8A85` |
| Zack | `#111111` | `#F5F0E8` | `#C4A35A` | — |

Sono lo stesso set. Zack non ha il grigio, che nello studio serve solo al testo
secondario e agli stati spenti — cioè a cose che nel mondo di Zack non esistono.
Non c'è niente da riconciliare: **il mondo di Zack è già il mondo di JAYL con una
tinta in meno**. Il vincolo dell'oro (max un decimo della superficie) vale anche
per lui: Zack porta l'oro addosso, quindi in una schermata dove c'è Zack l'oro
dell'interfaccia va ridotto, non sommato.

Anche il payoff è lo stesso — *Art finds a way* — ed è nato nella bibbia della
serie. Questo, più del colore, è la ragione vera per cui i due si sposano: la
serie racconta uno che crea nonostante tutto, lo studio è lo strumento di uno che
crea nonostante tutto.

---

## 1. Che ruolo ha Zack nello studio

**Zack dimostra il gesto. Non spiega, non accoglie, non decora.**

L'ipotesi di §7 era giusta e la confermo, ma va stretta in una regola operativa,
perché «mascotte simpatica» è il modo in cui questi progetti si sfaldano:

> **Zack compare solo dove c'è un gesto da capire.** Se una clip di Zack non
> insegna cosa fa un comando, quella clip non si genera.

Ne discendono quattro divieti, che valgono quanto le regole di §2 del RIPRENDI-QUI:

1. **Zack non parla e non scrive.** La serie è muta. Il testo lo fa l'interfaccia,
   che ha già due lingue e un test che la protegge. Una nuvoletta di Zack sarebbe
   un canone rotto e un terzo posto dove tradurre.
2. **Zack non è mai l'unico segnale.** Vale la regola del colore, estesa: se una
   clip di Zack sparisce (rete lenta, `prefers-reduced-motion`, immagine bloccata)
   il comando deve restare comprensibile da solo. La clip **aggiunge**, non
   sostituisce.
3. **Zack non aspetta al posto tuo.** Un Zack che si agita durante un'attesa di
   quaranta secondi diventa insopportabile alla terza volta. Zack nell'attesa sì,
   ma fermo e con una barra vera accanto (vedi §4, stato *attesa*).
4. **Zack non festeggia.** È deadpan cronico. Un'animazione di successo esultante
   tradisce il personaggio e il tono del marchio. Il successo è: Zack guarda in
   camera, immobile. Che è più divertente e costa una generazione sola.

### Il cast è la mappa degli stati del sistema

Questa è l'idea con il rapporto valore/fatica più alto di tutta la sessione. Il
cast della serie **esiste già** e ogni personaggio ha una funzione comica precisa
che coincide con uno stato dell'interfaccia:

| personaggio | funzione nella serie | stato dello studio |
|---|---|---|
| **ZACK** | crea, subisce, guarda in camera | il gesto normale: ogni comando riuscito |
| **PICCIONE** | sta fermo, poi in un istante si prende tutto | l'operazione lunga che finisce di colpo (scontorno, ×4) |
| **FALENA** | mangia i tratti d'oro prima che si solidifichino | l'attesa: qualcosa sta consumando il lavoro, non è ancora tuo |
| **GABBIANO** | piani elaborati che falliscono sempre | l'errore: modello non caricato, file non valido, tela oltre il limite |
| **GATTO** | l'unico che capisce l'arte, giudica e boccia | il controllo di stampa: è lui che dice «su capo nero questo sparisce» |
| **FORMICA** | si porta via il premio all'ultimo secondo, senza annunciarsi | il salvataggio automatico in libreria, e il rischio di §8 (dati cancellati) |

Il valore: **niente da inventare**. Ogni stato ha già un carattere, un beat
firma e una regola di posa scritta nella bibbia. E l'utente impara un linguaggio:
quando compare il gabbiano sa che qualcosa non ha funzionato, prima di leggere.

Il costo da tenere d'occhio: cinque personaggi in più significa cinque Element e
più asset. Per questo l'ordine di generazione in [zack-asset-plan.md](zack-asset-plan.md)
mette **Zack e il gabbiano prima di tutti** (gesto + errore), e rimanda il resto.

---

## 2. Brain, primo servizio in alto

Richiesta del committente, testuale:

> *«voglio che primo servizio in alto sia brain, dove utente riorganizza idee
> tramite library note e icone e frecce e cerchi e moodboard»*

### Cos'è, in una riga

**Una tela infinita dove i lavori della libreria si spostano a mano, si cerchiano,
si collegano con frecce e si annotano.** Gratuito, locale, nessun modello,
nessuna attesa.

### Perché va davvero in cima, e non è un capriccio

Tre ragioni, in ordine di forza:

1. **Chiude il ciclo dei riferimenti, che è già dichiarato «il cuore».** §2 del
   RIPRENDI-QUI dice: *scontorni un personaggio → diventa asset → lo metti in una
   moodboard → la moodboard **è** il set di riferimenti → il risultato torna nella
   stessa moodboard*. Oggi quel ciclo non ha un posto dove accadere. Brain è quel
   posto. Quando Immagine e Video (a consumo) arriveranno, il pulsante «genera»
   più naturale sarà **dentro Brain**, con i riferimenti già scelti perché sono
   quelli che stanno lì intorno.
2. **È il primo schermo che ha senso vedere senza aver caricato niente.** Oggi
   l'app si apre su Scontorna, che senza un file è una tela vuota con una colonna
   di comandi spenti. Brain aperto è la tua libreria: c'è sempre qualcosa.
3. **Assorbe il punto 6.7** (cartelle a trascinamento). Trascinare i lavori in
   sottoinsiemi *è* Brain. Un lavoro in meno, non uno in più.

### Cosa NON è — il confine con 6.3

C'è un rischio reale di sovrapposizione con la «tela di composizione» chiesta al
punto 6.3, e va tagliato adesso, non quando saranno due schermate confuse:

| | **Brain** | **Componi** (6.3) |
|---|---|---|
| a cosa serve | pensare | produrre |
| cosa esce | una moodboard, un set di riferimenti | un file da stampare o pubblicare |
| precisione | nessuna: a mano, storto va bene | pixel, allineamento, formato |
| testo | note appiccicate, per te | testo come campo, va nel risultato |
| export | PNG della tela + zip dei riferimenti | PNG/SVG/PDF alla misura giusta |

Regola per ricordarlo: **in Brain niente ha una misura**. Se qualcuno chiede
«allinea a sinistra» o «esporta a 4000 px», sta chiedendo Componi.

**Le due tele però condividono il motore** — pan/zoom, selezione, trascinamento,
livelli. Va scritto una volta sola (`src/engine/canvas.js`, con la matematica
separata dal disegno come tutto il resto), o si finisce a mantenere due
implementazioni di zoom che si comportano diverso.

### Gli oggetti di Brain — la lista chiusa

Regola «tutto visibile senza scorrere» (§6.1): questa lista è chiusa apposta.
**Sei oggetti, sei tasti**, che stanno tutti in una fila.

| oggetto | cosa fa | perché c'è |
|---|---|---|
| **Lavoro** | un asset della libreria, trascinato dentro | è il motivo per cui la tela esiste |
| **Nota** | rettangolo di testo, si scrive dentro | «questo va sul retro», «chiedere a lei» |
| **Freccia** | collega due cose | «da questo viene quello» — è la provenienza disegnata |
| **Cerchio** | racchiude un gruppo, ha un titolo | è la cartella, ma vista |
| **Icona** | un bollino da un set piccolo | stella, punto interrogativo, spunta, croce, fuoco |
| **Colore** | tinta di uno degli oggetti sopra | l'unico attributo che si cambia |

E tre gesti, non comandi: trascina per spostare, doppio clic per scrivere,
trascina da un bordo per collegare.

Quello che **non** entra, e va detto no adesso: font, opacità, allineamento,
griglia, livelli con nome, commenti multiutente. Sono Figma. Non li facciamo.

### Il set di icone

Cinque bollini, non venti: **stella** (buono), **punto interrogativo** (da
decidere), **spunta** (fatto), **croce** (scartato), **fuoco** (urgente). Sono
disegnati nella palette e possono avere ciascuno una micro-animazione di Zack che
lo *disegna* comparendo (vedi asset **T-ICN** nel piano). Cinque significati
distinti coprono il 90% dell'uso; il ventunesimo bollino non lo trova più nessuno.

### Cosa serve prima di scrivere codice

1. Contare i comandi (fatto qui: 6 oggetti + colore + i 3 gesti = **una fila**).
2. Decidere se Brain è per-cartella o unico. **Proposta: uno per cartella**, più
   una tela «tutto». Una sola tela infinita per tutta la libreria diventa
   illeggibile al centesimo asset, e la cartella è il contenitore che esiste già.
3. Dove vivono i dati. **Proposta: IndexedDB accanto ai metadati**, e nello zip di
   `downloadAll()` un `brain.json` per cartella. Coerente con l'esistente e non
   apre la questione §8.
4. Prestazioni: cento miniature su una tela con zoom vanno misurate prima
   (`<canvas>` unico vs. nodi DOM). Non decido a naso — è una misura, non
   un'opinione, e la trappola della tela oltre il limite del browser è già in §5.

---

## 3. I tasti: grandi, semplici, con Zack sopra

Richiesta: *«i tasti devono essere semplici grandi intuitivi e simpatici»*, con
*«tanti tasti importanti [che] avranno una sua animazione o icona che spunterà»*.

Non è in conflitto con §6.1 — è la stessa cosa vista dall'altro lato. Tasti
grandi ne stanno pochi in una schermata, e pochi comandi è esattamente ciò che
§6.1 chiede. **La dimensione dei tasti è il vincolo che tiene onesta la lista.**

### La regola dimensionale

- **Comando primario** (fa la cosa dello strumento): almeno 56 px di lato, icona
  grande, etichetta sotto, sempre visibile. Massimo **uno o due per strumento**.
- **Comando secondario**: 40 px, in fila, etichetta accanto.
- **Regolazione** (una manopola, una scelta): non è un tasto, è un controllo, e
  vive in fondo alla colonna.
- **Regola di conteggio**: se i comandi primari + secondari di uno strumento non
  stanno in una colonna alta 720 px senza scorrere, la lista è sbagliata. Da
  misurare nel browser, non nei test — il numero qui sopra è un punto di partenza
  da verificare, non una misura fatta.

### Dove entra Zack — tre modi, in ordine di costo

1. **L'icona che si disegna** (economico, ovunque). L'icona del tasto è la stessa
   di oggi, ma alla prima comparsa si traccia con un filo d'oro, come se la piuma
   la stesse disegnando. Nessun video: è un `stroke-dashoffset` su un SVG, pesa
   zero e vale sotto `prefers-reduced-motion` (si mostra già finita). **Questo si
   può fare senza generare nemmeno un asset.**
2. **Zack che spunta** (medio, solo sui primari). Al passaggio del mouse su un
   comando primario, Zack entra dal bordo del tasto, fa il gesto, esce. Clip corta,
   in loop, muta. Sono gli asset **T-\*** del piano.
3. **La dimostrazione a schermo** (costoso, solo in «Spiegami»). Vedi §4.

Il modo 1 va costruito per primo perché non dipende da nessuna generazione: si
può fare mentre le clip non esistono ancora, e se le clip non arrivano mai
l'interfaccia è comunque più viva di oggi.

---

## 4. «Spiegami», con Zack — la risposta a 6.4

Oggi «Spiegami» mostra una riga sotto ogni comando. Serve profondità, non un
meccanismo nuovo. La forma proposta, per ogni comando:

```
[ clip di Zack, 3s, in loop, muta ]     ← cosa succede
Cosa fa        una frase                ← esiste già (help.js)
Quando serve   una frase                ← nuovo
Se sbagli      una frase                ← nuovo, ed è la più utile
```

Le tre righe sono testo dell'interfaccia, bilingui, sotto il test esistente che
vieta di ripetere l'etichetta. **La clip è l'unica parte nuova che costa una
generazione**, e non è obbligatoria: un comando senza clip mostra le tre righe e
funziona.

Ordine di riempimento: prima i comandi che la gente sbaglia (scontorno con il
modello sbagliato, ingrandimento su un file già grande, controllo di stampa su un
vettore — che non si fa, §5), poi il resto.

---

## 5. Ha senso un'app a pagamento chiamata Zack?

Risposta breve: **no, non come secondo prodotto. Sì, come nome della cosa che
Zack fa già dentro lo studio.**

### Perché no, come app separata

Il ragionamento del committente — stesso logo, stessa palette, stesso concept — è
giusto sul *design* e proprio per questo si ritorce sul *prodotto*: se i due
sono già la stessa cosa, separarli non aggiunge niente e sottrae parecchio.

- **Divide il pubblico.** Chi paga 3,99 € a JAYL Studio e vede «Zack — 2,99 €»
  non capisce se ha comprato metà prodotto. Due abbonamenti sul quaranta per cento
  della stessa base fanno meno di uno sul cento.
- **Divide il lavoro.** Due entrate Vite oggi sono già due; una terza app è un
  altro build, un altro dominio, un altro flusso di pagamento, un altro supporto.
  A §6 ci sono già quattro punti urgenti non fatti.
- **Brucia l'IP nel momento sbagliato.** Zack è a **Gate 0**: il nome pubblico non
  è nemmeno bloccato (INDEX.md lo dà 🔴 BLOCCANTE, e «Dax» è occupato da
  DuckDuckGo). Il piano DUCO è *audience-first*: prima il personaggio funziona sui
  social, poi si vende. Mettere il personaggio dentro un'app a pagamento prima che
  qualcuno lo conosca inverte il piano che il committente stesso ha scritto.
- **Il valore che cerchi lo ottieni gratis.** Quello che rende attraente «un'app
  Zack» è l'icona sul dock e il carattere dell'interfaccia. Entrambi si prendono
  **senza** creare un prodotto nuovo: vedi qui sotto.

### Cosa fare invece, subito e a costo zero

1. **Il logo di Zack diventa l'icona di JAYL Studio.** Favicon, icona PWA,
   immagine OG. È il punto giusto del ragionamento del committente, e non richiede
   nessun prodotto nuovo. Asset **B-ICO** nel piano.
2. **«Zack» è il nome della modalità Spiegami.** L'interruttore non dice più
   «Spiegami» ma mostra Zack: attivarlo è chiamarlo. Il personaggio acquista una
   funzione dentro il prodotto invece di stare appeso ai bordi — ed è vera, non
   decorativa: è lui che dimostra.
3. **Lo studio si può installare** (PWA, un `manifest.json`). Sul dock ci finisce
   l'icona di Zack. È «l'app Zack» senza esserlo, e costa un pomeriggio.

### La versione che invece funzionerebbe — ma dopo

C'è un prodotto Zack sensato, e non è questo: **un'app gratuita e piccolissima,
una cosa sola fatta bene** — scontorna col dito su telefono, o disegna e trasforma
per bambini — con il marchio Zack, che non si paga e che porta gente a JAYL
Studio. Gratis perché la sua ragione d'essere è far conoscere il personaggio
(Gate 1 del piano DUCO), non incassare.

Condizioni per riparlarne, non prima:

- nome pubblico bloccato (Gate 0);
- il personaggio ha un pubblico misurabile sui social (Gate 1);
- i quattro punti urgenti di §6 sono chiusi.

Finché queste tre cose non sono vere, «app Zack» costa attenzione a un progetto
che ne ha già poca.

---

## 6. Cosa cambia in `services.js`

Non lo cambio adesso — è §5 di questo documento che deve essere approvata prima.
Ma la forma sarebbe:

```js
// primo della lista: è il servizio che si apre quando non c'è nessun file
{ id: 'brain', group: GROUP_LOCAL, key: 'tool.brain', icon: 'brain', ready: false },
```

Con due conseguenze da guardare:

- `firstReady()` oggi apre il primo servizio **utilizzabile**. Finché Brain è
  `ready: false` l'app continua ad aprirsi su Scontorna, che è giusto: il commento
  esistente («non si apre mai l'app su una funzione spenta») regge senza modifiche.
- il gruppo resta `local`: Brain non genera niente e non costa niente. Se un
  giorno da Brain si lancia una generazione, il costo è del servizio a consumo che
  viene invocato, non di Brain.

---

## 7. Il tasto Zack — la ricetta che ogni servizio ricorda

Richiesta del committente, ed è la cosa più forte uscita finora:

> *«Se premi Zack succede qualcosa di figo/default preimpostato e memorizzato a
> seconda e scelta dell'utente in ogni servizio. Ad esempio in bg remover il mio
> Zack è file in 4000×4000 circa, bg tolto e gomma che ha già ririempito dentro il
> logo dove in caso ha sbavato… oltre che magari anche il download inglobato»*

**Ogni servizio ha un tasto Zack: una catena di passi che l'utente ha scelto una
volta, premuta poi con un clic solo.**

Non è una funzione nuova: è **«Ricette salvabili»** (RIPRENDI-QUI §9, idea tenuta
da parte) che finalmente trova la sua forma e la sua faccia. E il precedente
funzionante c'è già: «Pronto per la stampa» è esattamente questo — scontorno +
ingrandimento a 4000 px in un tasto — solo che è uno solo, fisso, e non porta il
nome di nessuno. Il tasto Zack è quel tasto reso **tuo**.

### Come si comporta

1. **Al primo avvio ha già una ricetta di fabbrica sensata**, diversa per ogni
   servizio. Un tasto che al primo clic non fa niente è un tasto morto.
2. **Prima di premere dice cosa farà.** Regola non negoziabile, la stessa di
   «Pronto per la stampa»: passaggio del mouse o pressione lunga → la catena si
   legge come un elenco, con la misura e l'attesa scritte. *Dove non c'è una
   misura non c'è un avviso.*
3. **Impara da quello che fai.** Quando l'utente esegue a mano la stessa sequenza
   una seconda volta, compare una riga: *«Zack può ricordarlo»*. Sì → la catena
   diventa la sua. Mai automatico, mai senza chiedere.
4. **Si modifica in una schermata sola**: la catena come lista di passi, ogni
   passo con il suo interruttore e il suo unico parametro. Trascina per riordinare.
   **Non è un costruttore di flussi di lavoro**: se serve un ramo condizionale,
   siamo fuori strada.
5. **Vive con l'account, non con il browser.** È la prima cosa che l'utente si
   incazzerebbe di perdere (§8 RIPRENDI-QUI) ed è leggerissima: poche righe di
   JSON. Anche se l'account restasse solo licenza+saldo, **le ricette ci stanno
   dentro senza contraddire la promessa** — non sono i suoi file, sono le sue
   preferenze.
6. **A ogni pressione parte un'animazione di Zack**, presa da una libreria che
   cresce nel tempo (A-ZACK-1…n in
   [zack-animazioni-cast.md](zack-animazioni-cast.md)). Con una regola: **mai la
   stessa due volte di fila**, o alla terza pressione diventa un ostacolo.

### Le ricette di fabbrica, servizio per servizio

Punto di partenza da correggere sull'uso, non verità:

| servizio | ricetta di fabbrica |
|---|---|
| **Scontorna** | scontorno → chiusura dei buchi interni → ingrandimento al lato lungo di 4000 px → export PNG. *Download automatico: spento di fabbrica, si accende.* |
| **Vettorializza** | vettorializzazione → semplificazione tracciati → export SVG |
| **Suono** | preimpostato usato l'ultima volta → export WAV |
| **Brain** | disponi in griglia i lavori selezionati e cerchiali con un gruppo nuovo |
| **Componi** (6.3) | — nessuna finché il servizio non esiste |

### La chiusura dei buchi va costruita, e non è banale

L'esempio del committente contiene un problema tecnico vero, non un'opzione:

> *«gomma che ha già ririempito dentro il logo dove in caso ha sbavato, classico
> dei loghi che per strani motivi al bg remover sembrano aperti»*

È un difetto reale e riconoscibile: il modello di scontorno rende trasparenti le
**controforme** di un logo — l'interno di una «o», il vuoto dentro un anello — e
il risultato è un logo bucato. La correzione è un riempimento dei fori sulla
maschera alfa: si prendono le regioni trasparenti **non connesse al bordo**
dell'immagine e si riempiono, sotto una soglia di area.

Due cose da tenere ferme prima di scriverlo:

- **è matematica, quindi sta separata dal disegno** e testata in Node
  (`src/engine/holes.js` accanto a `crop.js` e `print.js`, come tutto il resto);
- **la soglia va misurata su loghi veri**, non scelta a naso: riempire tutto
  rovina le grafiche che hanno buchi voluti. Serve una manciata di file di prova
  prima della prima riga di codice, e il numero scritto in cima al file con la
  data, come le altre costanti.

Va costruita comunque, tasto Zack o no: è un difetto che oggi l'utente si
corregge a mano col pennello.

### Gerarchia dei tasti — e come si concilia con «tutto visibile»

Richiesta: *«ogni servizio ha il suo Zack tasto o altri pochi tasti grandi e
alcuni più piccoli e altri nascosti (avanzati)»*.

| livello | dimensione | quanti | esempio |
|---|---|---|---|
| **Zack** | il più grande della schermata | **1** | la ricetta del servizio |
| **primari** | 56 px | **2-3** | scontorna, ingrandisci |
| **secondari** | 40 px | fino a 6 | pennello, ritaglia, annulla |
| **avanzati** | nascosti dietro un solo «Avanzati» | quanti servono | scelta del modello, soglie, formato |

Questo introduce **una modifica alla regola §6.1**, e va detta chiaramente invece
di farla di nascosto. La regola dice *tutto visibile, niente scorrimento*. Nascondere
gli avanzati la piega, e si tiene solo a queste tre condizioni:

1. **il servizio si porta a termine senza aprire mai gli avanzati** — se un comando
   serve al lavoro normale, non è avanzato, è primario messo nel posto sbagliato;
2. **si aprono in un clic, sul posto, senza scorrere**: la colonna deve stare in
   una schermata anche con gli avanzati aperti. Se non ci sta, la lista è sbagliata
   — che è la regola §6.1 nella sua forma vera;
3. **restano aperti se li lasci aperti.** Chi li usa li usa sempre.

Le sezioni richiudibili di oggi (`Section.jsx`) non rispettano nessuna delle tre e
vanno via: sono richiudibili tutte, ricordano niente, e nascondono comandi normali.

---

## 8. Scaletta

L'ordine è pensato perché **ogni riga sia utile da sola**: se ci si ferma alla
quarta, quello che è stato fatto è già in produzione e non è un cantiere aperto.
Si incastra con §6 del RIPRENDI-QUI senza spostarne le priorità.

| | cosa | dipende da | costo |
|---|---|---|---|
| 1 | **Icone che si disegnano** col filo d'oro (§3 modo 1) | niente | codice, zero generazioni |
| 2 | **Logo Zack come icona/favicon/OG + PWA installabile** (§5) | asset B-\* | un pomeriggio |
| 3 | **`holes.js`** — chiusura dei buchi, con la soglia misurata su loghi veri | file di prova | mezza giornata + misura |
| 4 | **§6.1 comandi visibili** con la gerarchia di §7 e via `Section.jsx` | 3 | il pezzo grosso |
| 5 | **Tasto Zack** — ricette di fabbrica, anteprima della catena, salvataggio | 3, 4 | il pezzo grosso |
| 6 | **A-ZACK-1 + A-DEL** generate e guardate tagliate a 2s nel riquadro vero | committente | 2 generazioni |
| 7 | **Aggancio delle animazioni** agli eventi (elimina, gomma, sostituisci, scarica) | 6 | piccolo, una volta fatto l'aggancio |
| 8 | **«Zack può ricordarlo»** — la ricetta imparata dall'uso | 5 | medio |
| 9 | **Brain**, motore tela + 6 oggetti + 5 icone | 1 | il pezzo grosso |
| 10 | **A-ANT** sulla tela di Brain | 9, generazione | piccolo |
| 11 | **Spiegami profondo** (§4): prima le tre righe di testo, poi le clip T-\* | — | testo subito, clip a richiesta |
| 12 | **Hero della presentazione** H-1, poi H-2…H-5 | generazioni | a richiesta |

Tre cose che questa scaletta **non** contiene di proposito, e vanno decise a
parte perché non dipendono da Zack: il rifacimento del laboratorio suoni (§6.2),
la tela Componi (§6.3) e la questione dell'account (§8 RIPRENDI-QUI). Il tasto
Zack le tocca tutte e tre di striscio, ma nessuna delle tre lo blocca.

I prompt da incollare stanno in [zack-asset-plan.md](zack-asset-plan.md) (landing,
tutorial, stati vuoti, marchio) e in
[zack-animazioni-cast.md](zack-animazioni-cast.md) (il cast che reagisce alle
azioni). **Le generazioni le lancia il committente.**
