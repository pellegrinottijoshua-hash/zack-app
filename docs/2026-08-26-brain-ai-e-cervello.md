# Brain: l'AI, e il cervello locale

> Sessione 2026-08-26. Risponde a due domande del committente: **come userei
> l'AI dentro Brain**, e **se Brain debba diventare «un cervello locale per
> ogni utente»**. Il pacco (esporta/reimporta) è già costruito — vedi il commit
> «il tasto Zack di Brain».

---

## 1. Cosa c'è già, e perché conta per il resto

Il tasto Zack di Brain scarica `nome.brain.zip`:

```
idea.json    la tela: posizioni, note, colori, legami
IDEE.md      la stessa idea scritta a parole
mappa.png    com'era disposta
file/…       i lavori veri
```

**`IDEE.md` non è un di più: è il pezzo che rende possibile tutto il resto di
questo documento.** È l'idea ridotta a testo — gruppi come titoli, note come
righe, legami come frecce scritte. Un modello può leggerla senza vedere un
solo pixel, e quindi:

- si può chiedere un'analisi **mandando via poche migliaia di caratteri invece
  che duecento megabyte di file**;
- e l'utente può leggere **esattamente** ciò che uscirebbe dal suo computer,
  prima che esca. Non una promessa: un file che apre e controlla.

Questa è la ragione per cui l'AI in Brain è affrontabile senza tradire la
promessa del prodotto. Senza `IDEE.md` sarebbe «carica il tuo archivio da
qualche parte», che è esattamente ciò che non facciamo.

---

## 2. Come userei l'AI qui

### La regola, prima delle funzioni

> **L'AI propone, l'utente accetta. Non riscrive mai la tela da sola.**

Ogni risposta arriva come **proposta visibile**: i gruppi suggeriti compaiono
tratteggiati, le note nuove sono marcate, e ci sono due tasti — *tieni* e
*lascia stare*. Un'AI che riordina la lavagna mentre non guardi è il modo più
veloce di far disinstallare il prodotto: quella tela è il pensiero di qualcuno,
e il disordine può essere voluto.

### I cinque usi, dal più utile al più vistoso

**1. Le cose da fare, estratte dalle note.** *(il più utile, e il più noioso)*
Le note contengono compiti nascosti: «il bordo va rifatto», «chiedere
preventivo», «sentire lei». Nessuno li ha scritti come lista perché li ha
scritti mentre pensava ad altro. L'AI li tira fuori e li mette in colonna, con
accanto l'idea da cui vengono. Costa poco, si capisce subito, e nessuno lo fa
a mano.

**2. Cosa manca.** Confronta le idee fra loro e dice dove sono sbilanciate:
*«The Rug ha dodici immagini e nessuna nota sul prezzo. Funghissimi ha nove
note e nessun file: è un'idea che non hai ancora provato a fare.»* Questo è il
consiglio vero — non «bel lavoro», ma **il buco che si vede solo dall'alto**.

**3. I gruppi che mancano.** Sulla tela ci sono quaranta oggetti sciolti. L'AI
propone di cerchiarne otto insieme e dà un nome al gruppo. Arriva tratteggiato:
accetti o no. È la funzione che si vede di più, ed è per questo che la metto
terza — la più vistosa non è la più utile.

**4. Il report del giorno.** Un `REPORT.md` dentro il pacco: cos'è cambiato da
ieri, quali idee si sono mosse, quali sono ferme da tre settimane. Ha senso
solo quando esiste lo storico — vedi §3.

**5. Descrivere i lavori senza tag.** *«Kadabra, occhiali, sfondo blu.»* Questo
è l'unico dei cinque che **può girare in locale** con un modello di visione
piccolo, e rende la ricerca utile senza che nessuno abbia taggato niente. Era
già nella coda delle idee (RIPRENDI-QUI §9.2): Brain gli dà finalmente un
posto dove servire.

### Le condizioni, che non sono negoziabili

Un'analisi con un modello vero **non può girare in locale**: serve un server, e
questo rompe la promessa fondativa del prodotto. Quindi non si fa di nascosto e
non si fa gratis:

1. **Spenta di default.** Brain funziona intero senza mai accenderla.
2. **Si vede cosa esce, prima.** Il pulsante mostra `IDEE.md` e dice: *questo
   testo esce dal tuo computer, i tuoi file no.* Le immagini si mandano solo se
   l'utente chiede l'uso 5 e lo conferma a parte.
3. **A consumo, col prezzo scritto prima.** È generazione: si paga dal saldo,
   costo del fornitore + 14%, come tutto il resto. Un'analisi inclusa
   nell'abbonamento perde denaro sull'utente migliore — quello con quaranta
   idee.
4. **Il risultato è un file, non un fatto compiuto.** `PROPOSTA.md` accanto a
   `IDEE.md`, e le modifiche alla tela sempre da accettare.

### Cosa NON farei

- **Un chatbot dentro Brain.** «Chiedi qualcosa alla tua tela» sembra potente e
  produce conversazioni che non lasciano niente sulla lavagna. Le cinque cose
  sopra lasciano un file o una modifica: è la differenza fra uno strumento e un
  giocattolo.
- **L'analisi automatica a ogni salvataggio.** Costerebbe denaro a ogni gesto e
  addestrerebbe l'utente a ignorare gli avvisi.
- **Generare immagini dentro Brain.** Quello è il servizio Immagine, e mescolare
  «riordina» con «crea» rende Brain un posto dove può succedere qualunque cosa.

---

## 3. «E se Brain creasse un cervello locale per ogni utente?»

### La risposta corta: **c'è già, e gli mancano due cose.**

Il cervello locale esiste: i file in OPFS, i metadati in IndexedDB, le tele
dentro le raccolte. Tutto sul computer dell'utente, niente su un server. Quello
che manca non è il cervello — è la **memoria nel tempo** e la **capacità di
ritrovare**:

| manca | cos'è | quanto costa |
|---|---|---|
| **lo storico** | ogni pacco fatto resta, con la data: si può tornare a com'era martedì | piccolo — i pacchi esistono già |
| **la ricerca** | un indice del testo di tutte le note e dei nomi, per trovare «preventivo» in quaranta idee | piccolo, e locale |

Con queste due, «il cervello che ricorda tutto» è fatto. Sono entrambe locali,
entrambe gratuite, ed entrambe piccole.

### La risposta lunga: **il posto dove vive è la domanda vera**

L'immagine del committente — *«come se ognuno avesse il proprio sito brain
dentro Zack»* — è giusta, ma il rischio è costruire un CMS: pagine, sezioni,
navigazione, e in sei mesi un prodotto che non è più uno strumento di
post-produzione.

La versione di quell'idea che **regge** è più semplice e più radicale:

> **Il cervello dell'utente è una cartella vera sul suo disco.**

Con la File System Access API l'utente sceglie una cartella una volta, e da
quel momento le idee ci vivono dentro — una cartella per idea, con dentro
esattamente ciò che c'è già nel pacco: `idea.json`, `IDEE.md`, `mappa.png`,
`file/`. Cosa cambia:

- **si vede nel Finder.** Il cervello smette di essere una cosa dentro il
  browser di cui fidarsi, e diventa una cartella che si apre;
- **va su iCloud o Dropbox da solo**, senza che noi facciamo sincronizzazione,
  senza banda, senza responsabilità legale sui contenuti;
- **svuotare i dati del sito non cancella più niente** — che era il pericolo di
  §8 del documento di passaggio;
- **il formato è già quello del pacco**, quindi non c'è niente di nuovo da
  inventare: esportare diventa «copia una cartella».

Il costo vero, dichiarato: **solo Chrome ed Edge.** Safari e Firefox restano
sulla versione di oggi (tutto dentro il browser, più il pacco come rete di
sicurezza). Per il pubblico di riferimento — designer e AI director, quasi tutti
su Chrome — è un compromesso accettabile; per un prodotto che si vende a
chiunque, no. È una decisione da prendere guardando chi paga, non i grafici di
compatibilità.

### Quindi, la mia raccomandazione in una riga

**Storico e ricerca subito** (piccoli, locali, gratis). **Cartella vera su
disco** come passo successivo, e con quello la questione §8 dell'account si
chiude da sola: l'account resta solo licenza e saldo, perché i file non hanno
più bisogno di noi.

---

## 4. Ordine

| | cosa | dipende da | dove sta |
|---|---|---|---|
| 1 | **Ricerca nelle note** | niente | locale, gratis |
| 2 | **Storico dei pacchi** | niente | locale, gratis |
| 3 | **Cose da fare** (uso 1) e **Cosa manca** (uso 2) | saldo + adattatore | a consumo |
| 4 | **Cartella vera su disco** | decisione sul pubblico | locale, gratis |
| 5 | **Gruppi proposti** (uso 3) | 3 | a consumo |
| 6 | **Descrizioni automatiche** (uso 5) | modello di visione locale | locale, gratis |
| 7 | **Report del giorno** (uso 4) | 2 | a consumo |

I primi due si possono fare subito e non chiedono niente a nessuno.
