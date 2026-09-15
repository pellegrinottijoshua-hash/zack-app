# Quadro generale — dove siamo, dove andiamo, quanto costa

> Scritto il 2026-09-15, su richiesta del committente. Non è una spec e non è un
> piano: è la mappa da cui si decide **cosa prima e cosa dopo**.
>
> Le cifre di costo sono di due tipi e non vanno confuse: **misurate** (le
> abbiamo provate) e **da listino** (ordine di grandezza, ancora da provare).
> Le seconde non si promettono a nessuno finché non diventano le prime.

---

## 1. Dove siamo davvero

**Online e che incassa.** Zack App è pubblicata, i test sono 637 e verdi, e da
ieri il ramo dei crediti è su `main`.

| Cosa | Stato |
|---|---|
| I cinque strumenti locali (scontorna, brain, vocale, effetti, vettoriale) | costruiti |
| L'impianto — la mappa condivisa dei servizi | costruito, e regge |
| Il conto: entrare, abbonarsi, il muro | costruito, **muro spento** |
| I crediti: pacchetti, preventivo, addebito, rimborso | costruito e online |
| La prima generazione (Nano Banana Pro) | costruita, **costo misurato** |
| Video, voce clonata | **non esistono** |
| Brain come libreria, pocket, icona output | **disegnati, non costruiti** |
| La cattura del pensiero | **idea, da decidere** |

Il lavoro di sette giorni (8–15 settembre): **60 commit, 272 file toccati,
+15.769 righe**. Oggi il progetto è **166 file, ~24.000 righe, 56 file di test**.

---

## 2. Quanto costa costruire — in token e in giornate

Il committente ha chiesto i token. Rispondo col metodo, perché il numero da solo
non vuol dire niente.

**Il metodo:** il trascritto delle nostre conversazioni su questo progetto pesa
oggi **201 MB**. La sola fase dei crediti (B2, una giornata) pesa **53 MB**, cioè
**grosso modo 10–13 milioni di token di contenuto**. I token davvero consumati
sono parecchi di più, perché a ogni turno rileggo il contesto — ed è esattamente
il motivo per cui in quella giornata **il limite di sessione è scattato tre
volte**.

**L'unità che conviene usare, quindi, non è il token: è la giornata.** Una fase
come B2 = **una giornata piena, due o tre limiti di sessione, ~10 M di token di
conversazione**.

Con quel metro, quello che abbiamo deciso finora:

| Pezzo | Giornate | Perché |
|---|---|---|
| **La pelle di home e scontorna** | ½ | Togliere roba, i tre livelli, il + spostato, il tasto oro ridotto. Quasi tutto interfaccia. |
| **L'icona output + il pocket** | 1 | Tocca tutti i servizi: è impianto, non pelle. |
| **Brain libreria (telefono)** | 2 | Archivio, pool, cartelle annidate, note sull'icona, cestino, annulla, colori. **Il pezzo più grosso di tutti.** |
| **Brain sul desktop** | 1 | Dipende dal precedente. |
| **Video (Seedance)** | 1 | L'impianto è già pronto: il banco di prova dice «una riga di listino e un fornitore». |
| **Voce (ElevenLabs)** | 1 | Come sopra, più le prove di ascolto. |
| **La cattura del pensiero** | 2 | Il tasto, l'ingresso, la trascrizione, la classificazione. |
| **Muro acceso + primo ingresso** | ½ | Dipende da un mittente email vero, che non è codice. |

**Totale: circa 9 giornate**, cioè **~90–100 milioni di token** e una ventina di
limiti di sessione. Non è un preventivo: è un ordine di grandezza, e le sorprese
sono sempre in aumento, mai in diminuzione.

Una cosa che fa risparmiare davvero: **il quaderno**. Ogni decisione che è
scritta è una decisione che non ri-discutiamo e non ri-spiego. Le sette giornate
passate hanno bruciato parecchi token proprio in ri-spiegazioni.

---

## 3. Fattibilità, pezzo per pezzo

| Pezzo | Fattibilità | Il punto |
|---|---|---|
| Pelle di home e scontorna | **alta** | Solo lavoro, nessuna incognita. |
| Icona output, pocket | **alta** | Trascinare sul telefono è il solo punto delicato: per questo ci sarà anche il tocco. |
| Brain libreria | **media** | Non la logica: **la quantità**. Cartelle annidate + archivio + note + cestino + annulla sono cinque cose che si incrociano. |
| Brain desktop | **alta** | Una volta che il telefono funziona, è una disposizione diversa della stessa roba. |
| Video Seedance | **alta** | L'impianto è stato costruito apposta. Serve misurare il costo vero prima di fissare il prezzo. |
| Voce ElevenLabs | **alta** | Stessa strada. In più: ElevenLabs dà **anche la trascrizione**, cioè serve due volte (§ 5). |
| Cattura — l'ingresso e l'archivio | **alta** | È una casella che riceve audio. |
| Cattura — **il tasto su Android** | **bassa, per ora** | Una pagina web **non vede i tasti del volume**. Serve un'app vera con il permesso di accessibilità, che Google tratta con severità. **Da provare prima:** sul Samsung, il **doppio click sul tasto laterale** apre un'app scelta. Se apre anche Zack installato come app, il problema è risolto senza scrivere niente. È un esperimento da cinque minuti, sul tuo telefono. |
| Cattura — «l'AI capisce dove metterlo» | **media, e in conflitto** | Vedi § 4. |
| Muro + primo ingresso | **media** | Non è codice: è un mittente email che funzioni. |

---

## 4. Le criticità — in ordine di quanto fanno male

### 4.1 La trascrizione gratis è gratis solo finché nessuno la usa

Il committente ha detto: gratuito, a mie spese, in perdita volentieri. Giusto
come spirito. Ma i conti vanno visti adesso:

| Clienti che catturano 10 minuti al giorno | Costo al mese, per noi |
|---|---|
| 10 | ~17 € |
| 100 | ~170 € |
| 1.000 | ~1.700 € |

(Da listino: frazioni di centesimo al minuto. **Da misurare.**)

A dieci clienti è un caffè. A mille è un affitto. E il momento in cui fa male è
esattamente il momento in cui l'app sta andando bene — cioè il momento peggiore
per toglierla.

**Quindi: il tetto si mette il primo giorno**, non dopo. Un tetto onesto
(«trenta minuti al giorno») non lo nota nessuno oggi e ci salva domani.

**E c'è una via da zero euro da verificare:** il browser di Android sa già
trascrivere da solo, gratis per noi. La qualità è più bassa di un modello vero,
ma per un pensiero detto camminando potrebbe bastare — e il modello buono si
tiene per chi paga.

### 4.2 I pensieri sul telefono non hanno una copia da nessuna parte

Hai deciso che restano sul telefono, e va bene. Ma dopo sei mesi lì dentro ci
sono ottocento pensieri che **esistono in un posto solo**. Telefono perso,
telefono rotto, dati del sito svuotati per fare spazio: spariscono tutti insieme
e non c'è niente da fare.

Vale già oggi per Brain, che è la libreria. **Su iPhone il sistema può cancellare
i dati di un sito quando lo spazio finisce**, senza chiedere niente.

Non serve un server per rimediare: serve **un'esportazione** — un file che il
cliente si porta via quando vuole, e che può rimettere dentro. È poco lavoro e
toglie l'unico rischio davvero irreparabile.

### 4.3 «L'AI capisce dove metterlo» contraddice «i pensieri restano sul telefono»

Sono due cose che vuoi tutte e due, e insieme non stanno: per capire cosa hai
detto, il testo deve uscire — verso un modello — oppure il modello deve girare
dentro il telefono, e i modelli che ci stanno capiscono poco.

Non è un problema da risolvere oggi. È una scelta da fare consapevolmente:
o il pensiero resta cieco e tuo, o diventa ordinato e passa da fuori.
Una via di mezzo onesta: **il pensiero resta dov'è, e ne esce solo il testo**,
dicendolo chiaramente.

### 4.4 Il primo ingresso via email

Resta rotto da B1: il link nella mail viene probabilmente aperto dai controlli
di Gmail prima che lo apra il cliente. Adesso **fa meno male** — chi scontorna
non entra nemmeno — ma è ancora l'unica porta per chi vuole pagarci. Chi paga è
motivato; chi è motivato non se ne va subito. Ma è ancora un buco in una tubatura
di soldi.

### 4.5 Ogni modifica alla home tocca soldi veri

Da ieri l'app incassa. Da qui in avanti ogni cambio alla home e ai crediti va
provato prima con Stripe di prova, e non «visto bene sullo schermo».

---

## 5. Altri servizi da esplorare

Ordinati per quanto valgono rispetto a quanto costano.

| Servizio | Perché sta bene qui | Costo per noi | Nota |
|---|---|---|---|
| **Sottotitoli automatici** | **Regalo**: la trascrizione ci serve già per la cattura. Stessa chiave, due prodotti. | quasi zero | Il primo da fare dopo la voce. |
| **Rimuovi un oggetto** (non lo sfondo) | Sta accanto a scontorna: è lo stesso gesto, altro scopo. | a generazione | Nano Banana Pro lo fa già. |
| **Ingrandisci** (upscale) | Chi scontorna vuole il file grande. Si vende da solo. | a generazione | Da confrontare fra fornitori. |
| **Doppiaggio e sincronia labiale** | Per la serie di Zack, e per chiunque voglia un video in due lingue. | a minuto | ElevenLabs. |
| **Musica** | I video generati sono muti. | a generazione | Dopo il video. |
| **Da 16:9 a 9:16** | I social vogliono verticale, i video nascono orizzontali. | a generazione | Piccolo e molto usato. |
| **Pacchetto effetti sonori** | Già promesso all'abbonamento. | una volta sola | Non è un servizio: è materiale. |
| **3D, montaggio video** | No. | — | Fuori portata, e fuori dalla tesi. |

**Una cosa da notare:** ElevenLabs copre **voce clonata + effetti + doppiaggio +
trascrizione**. Una chiave sola apre quattro cose di questa lista. È la ragione
migliore per farlo presto.

---

## 6. L'ordine che consiglierei

1. **La pelle di home e scontorna** — mezza giornata, e l'app diventa quella che
   hai disegnato. È anche la cosa che fa vedere subito il cambio.
2. **Voce ElevenLabs** — apre quattro servizi futuri con una chiave, e riempie
   l'abbonamento che oggi è magro.
3. **Icona output + pocket** — il collante fra i servizi. Prima di Brain, perché
   Brain lo dà per scontato.
4. **Brain libreria** — due giornate, il cuore.
5. **Video Seedance**.
6. **La cattura** — dopo l'esperimento del tasto laterale, che si fa in cinque
   minuti e può cambiare tutto il resto.

**Il bivio che è tuo, non mio:** se la cattura è davvero il cuore
dell'abbonamento, salta al secondo posto e il pacchetto effetti scende. Da fuori
sembra la cosa più originale che abbiamo; da dentro è anche la più incerta,
perché dipende da un tasto che non controlliamo.

---

## 7. Le decisioni che restano tue

- **La frase dei 12 centesimi**: al netto delle commissioni Stripe o no.
- **Fatture e IVA**, e se `jayl.store` e Zack App fatturano come lo stesso
  soggetto. Da commercialista, prima di incassare da clienti europei.
- **Il tetto sui minuti** della cattura.
- **Se il pensiero può uscire dal telefono** per essere capito.
- **L'ordine qui sopra.**
