# JAYL STUDIO — generazione a consumo

**Data:** 2026-08-25
**Stato:** in revisione
**Copre:** il blocco generazione (immagini, video, audio) con saldo prepagato in euro

---

## 1. Il modello di business, in una frase

**3,99 €/mese** danno gli strumenti che girano sul computer del cliente —
scontorno, vettoriale, export, editor, libreria — **illimitati, a costo
marginale zero**.

La **generazione** non è inclusa e non lo sarà mai: si paga a consumo, da un
saldo che il cliente ricarica, con il prezzo di ogni singola generazione scritto
prima di premere il pulsante.

Due opzioni per categoria, chiamate col loro nome.

## 2. Perché questo modello regge dove altri sono morti

Gli aggregatori AI muoiono in tre modi, e questo disegno chiude tutti e tre.

**Post-pagamento.** Carta rubata, 400 € di video in un'ora, storno dopo trenta
giorni: la GPU l'hai già pagata, e paghi anche 15-25 € di commissione. Nessun
margine ripaga un solo caso. → **Il saldo si ricarica prima. Sempre.**

**Costi che superano i ricavi.** Un abbonamento fisso con generazione inclusa
perde denaro sull'utente attivo, cioè sul migliore. → **La generazione non è mai
inclusa nell'abbonamento.**

**Nessuna ragione per passare da te.** Se rivendi token a margine, sei solo più
caro del diretto. → **Non vendiamo token: vendiamo che l'asset generato atterri
già nella libreria, dentro la moodboard, pronto da scontornare e mandare in
stampa.**

## 3. Il vincolo legale che decide la forma

I termini di fal (verificati il 2026-08-25) dicono:

> «Client will not expose any of the Services APIs directly to any End Users»

…ma permettono di far accedere gli utenti finali **attraverso la propria
"Client Solution"**.

**Conseguenza vincolante: JAYL STUDIO non può contenere una schermata che sia,
di fatto, la console di un fornitore.** Niente campo "modello" libero, niente
parametri grezzi passati così come sono, niente ritorno della risposta API
cruda. La generazione entra nel flusso del prodotto — sceglie un preset, produce
un asset che finisce in libreria — o siamo fuori dai termini.

Non è burocrazia: è ciò che separa un prodotto da un proxy, e il proxy è
vietato.

## 4. Diretto o aggregatore

Non è una scelta ideologica, è disponibilità reale:

| categoria | opzione A | opzione B | via |
|---|---|---|---|
| Immagini | **Nano Banana Pro** (Gemini 3 Pro Image) — 0,134 $/img, GA giugno 2026 | **GPT Image 2** — aprile 2026 | **diretta**: entrambi self-service |
| Video | **Seedance 2.5** — fino a 30s, audio nativo, fino a 30 riferimenti | **Kling 3.0** — fisica del movimento, 4K, il più economico | **aggregatore**: nessuno dei due ha una via diretta per chi non è enterprise |
| Audio | effetti sonori da testo | — | mista, secondo licenza |

Il risultato sarà **misto**, e va bene. Per questo il fornitore non è una scelta
architetturale: è un dato di configurazione.

**Regola:** si parte da un aggregatore per ampiezza; si passa diretti solo sul
modello che domina i consumi, quando il risparmio supera il costo di gestire un
contratto in più.

## 5. L'adattatore

Ogni modello è una scheda, non del codice sparso:

```
Adapter {
  id                 'nano-banana-pro', 'seedance-25', …
  category           'image' | 'video' | 'audio'
  modelName          'Seedance 2.5' — l'etichetta, da configurazione
  capabilityKey      il sottotitolo, tradotto
  provider           'fal' | 'openai' | 'google' | …
  maxReferences      quanti riferimenti accetta (0 = nessuno)
  estimateCost(params) → euro          quanto costerà, PRIMA
  run(params, signal) → { blob, meta }  esegue
  limits             durata max, risoluzioni, formati ammessi
}
```

**Il nome del modello È l'etichetta**, con la capacità come sottotitolo:

> **Seedance 2.5** · personaggi coerenti, fino a 30 riferimenti · 0,38 €
> **Kling 3.0** · movimento e fisica, 4K · 0,21 €

Il pubblico di questo prodotto sono AI director: sanno cosa significa "Kling
3.0", lo cercano per nome, e nascondere la marca dietro una perifrasi li
tratterebbe da principianti. Il nome è un'informazione, non rumore.

Il costo di questa scelta è che le versioni invecchiano — Seedance è passata da
2.0 a 2.5 in pochi mesi. Si paga così: **`modelName` è un campo di
configurazione, mai una stringa scritta nei componenti.** Aggiornare una
versione è una riga, e un test verifica che nessun nome di modello compaia nel
codice dell'interfaccia.

## 5bis. I riferimenti — il cuore del prodotto

**Questa è la funzione più importante del blocco, non un accessorio.**

Un AI director non genera immagini a caso: genera *lo stesso soggetto* in
quaranta situazioni diverse. Il riferimento è ciò che rende coerente quel
soggetto, ed è anche il punto in cui la libreria smette di essere un archivio e
diventa uno strumento.

Cosa lo rende possibile, verificato il 2026-08-25:

| modello | riferimenti |
|---|---|
| Nano Banana Pro | 8-14 immagini; tiene identità, vestiti, distanza di camera e stile mentre cambia posa e scena |
| Seedance 2.5 | fino a 30 riferimenti fra immagini, video e audio |

### Come si collega alla libreria

Il riferimento non si carica da capo ogni volta: **si sceglie dalla libreria.**

1. Scontorni un personaggio → diventa un asset
2. Lo metti in una moodboard → diventa contesto
3. Generi → **la moodboard è il set di riferimenti**, già pronto
4. Il risultato torna nella stessa moodboard

È il ciclo che nessun altro strumento chiude: Canva ha le cartelle ma gli asset
sono morti, i generatori hanno i riferimenti ma non ricordano niente fra una
sessione e l'altra.

**Conseguenza sul modello dati:** un asset deve poter essere marcato come
riferimento e portarsi dietro una nota su cosa rappresenta ("il personaggio,
tre quarti", "la palette"). Va aggiunto agli `Asset` esistenti, non inventato a
parte.

**Conseguenza sull'adattatore:** `maxReferences` è un dato del modello e
l'interfaccia deve impedire di superarlo *prima* di far pagare, non dopo.

## 5ter. L'audio dalla voce

L'obiettivo: imiti il suono con la voce, scrivi due parole («passi di un
gigante», «bus», «vento»), esce il suono vero.

**Nessuna API fa questo in un colpo solo, e non serve che lo faccia.** La voce
porta cinque informazioni separabili, e quattro si estraggono in locale:

| cosa porta la voce | dove | costo |
|---|---|---|
| ritmo e attacchi | locale (Web Audio, onset detection) | 0 € |
| dinamica di ogni evento | locale (inviluppo per attacco) | 0 € |
| durata di ogni evento | locale | 0 € |
| intonazione (il vento che sale) | locale (pitch tracking) | 0 € |
| **timbro** | **generato** | ~0,02-0,12 €, **una volta** |

### Il flusso

1. **Registri** «tum … tum … tum» — nel browser, niente lascia il computer
2. **L'app analizza**: tre attacchi a 0 / 0,8 / 1,6 s, ampiezze 0,9 / 0,7 / 1,0,
   durata ~250 ms
3. **Scrivi** «passi di un gigante»
4. **Si genera UN passo** dal testo — questo è l'unico pezzo a pagamento
5. **L'app lo risequenzia** sul tuo ritmo con la tua dinamica, in locale

Cambiare il ritmo, la dinamica o la lunghezza **non costa nulla e non richiede
di rigenerare**: il timbro è un ingrediente riusabile, non un risultato finito.

Per i suoni continui (bus, vento) vale lo stesso principio con l'inviluppo: si
genera un anello una volta e la tua «vvvVVVvvv» lo modula.

### La via gratuita, che va costruita per prima

**La tua voce trasformata con DSP locale**: intonazione due ottave sotto,
formanti spostate, saturazione, riverbero a convoluzione. È letteralmente il
mestiere dei fonici Foley, funziona sorprendentemente bene su percussioni
vocali, e costa **zero**.

Va costruita prima della generazione per una ragione pratica: condivide
l'intera catena — registrazione, analisi, sequenziamento — e permette di
verificare che quella catena funzioni senza spendere un centesimo. La
generazione si innesta poi come una sorgente di timbro in più.

### Perché non l'audio-condizionamento diretto

Stable Audio Open espone `init_audio`, ma la trasformazione guidata dal testo
non funziona in modo affidabile (difetto noto e documentato). La ricerca sul
Foley condizionato da imitazione vocale esiste ed è attiva, quindi vale
rivalutarla fra qualche mese — ma oggi non è una base su cui costruire.

## 6. Il saldo, in euro

**Niente gettoni.** I crediti astratti esistono quasi sempre per nascondere il
prezzo; qui il prezzo è il posizionamento. Il saldo è denominato in euro e ogni
riga dice quanto è costata.

### Prenota → conferma → rilascia

Una generazione fallita **non deve consumare nulla**. Il flusso:

1. **Prenota** l'importo stimato: il saldo disponibile scende subito, così due
   generazioni in parallelo non possono spendere lo stesso denaro due volte.
2. **Esegui.**
3. **Conferma** al costo reale (che può differire dalla stima) **oppure
   rilascia** tutto se fallisce.

Senza il passaggio di prenotazione, due schede aperte contemporaneamente
possono mandare il saldo sotto zero. È il difetto classico di ogni portafoglio
digitale.

### Trasparenza dichiarata

Ogni generazione mostra, prima:

> Questo video costa **0,39 €** — 0,35 € di calcolo, 0,04 € a noi.

Il margine è del **12%**, dichiarato, e serve a coprire commissioni di
pagamento e generazioni fallite che paghiamo comunque. È volutamente basso:
sotto questa soglia una singola generazione fallita mangia il guadagno di
diverse riuscite, sopra si smette di essere il più conveniente. Canva e Adobe nascondono
tutto: dirlo è il nostro posizionamento, non una concessione.

### Ricariche

Importi fissi (5 / 15 / 40 €). **Prima ricarica di un account nuovo limitata**,
e importi maggiori sbloccati dopo la prima andata a buon fine: è ciò che rende
il furto di carta poco redditizio, senza dare fastidio a chi è onesto.

Il saldo **non scade**. Un saldo che evapora è un modo per far pagare due volte
la stessa cosa.

## 7. Responsabilità dei contenuti

Le generazioni passano dal nostro account presso il fornitore. **Se un utente
genera contenuti vietati, sospendono noi, non lui.**

Minimo indispensabile prima di aprire a chiunque:

- termini d'uso che vietano esplicitamente ciò che i fornitori vietano
- un registro di chi ha generato cosa e quando (serve anche per i rimborsi)
- la possibilità di bloccare un account
- un canale di segnalazione

## 8. Cosa può andare storto, e cosa facciamo

| caso | risposta |
|---|---|
| generazione fallita | prenotazione rilasciata, saldo intatto, messaggio che dice cosa fare |
| costo reale > stima | si conferma al reale; se supera il saldo, si copre la differenza e si segnala. Mai bloccare un lavoro già fatto |
| fornitore giù | l'altra opzione della stessa categoria resta disponibile: è metà della ragione per averne due |
| l'utente chiude la scheda a metà | la prenotazione scade da sola dopo un tempo massimo |
| prezzi del fornitore cambiati | i prezzi sono configurazione, non codice; una stima non aggiornata non deve poter addebitare più del preventivato |

## 9. Come si verifica

1. **Registro saldo** — pura logica, testabile senza rete e senza spendere: il
   saldo non va mai sotto zero, una prenotazione scaduta si rilascia, una
   generazione fallita non consuma, due operazioni concorrenti non spendono lo
   stesso denaro.
2. **Adattatori** — ognuno risponde a `estimateCost` senza chiamare la rete.
3. **Trasparenza** — un test verifica che nessuna generazione possa partire
   senza aver mostrato un prezzo.
4. **Nomi dei modelli** — un test verifica che nessun nome di modello sia
   scritto dentro un componente: stanno tutti in configurazione, così
   aggiornare una versione è una riga sola.
5. **Riferimenti** — un test verifica che non si possa avviare una generazione
   con più riferimenti di quanti il modello ne accetti: superare il limite
   *dopo* aver fatto pagare è il modo peggiore di scoprirlo.
6. **Analisi della voce** — pura logica su un segnale sintetico: tre impulsi a
   distanze note devono produrre tre attacchi ai tempi giusti, e il silenzio
   non deve produrne nessuno.

## 10. Cosa NON entra

Account e autenticazione, pagamenti reali, moderazione automatica dei contenuti,
fatturazione fiscale.

L'audio entra **solo nella sua via gratuita** (registrazione, analisi, DSP): la
generazione del timbro arriva quando il registro del saldo esiste.

Due pezzi sono costruibili subito, entrambi senza spendere un centesimo e senza
dipendere da nessun fornitore:

1. **Il registro del saldo** — pura logica; tutto il resto vi si appoggia.
2. **La catena audio locale** — registrazione, rilevamento degli attacchi,
   trasformazione DSP, sequenziamento. Utile da sola, e diventa l'impianto su
   cui la generazione del timbro si innesta dopo.

Per memoria, già deciso altrove:

- **Immagini**: FLUX.1 schnell è Apache-2.0 e commerciale libero; FLUX.1 dev no.
- **Musica**: MusicGen è CC-BY-NC, vietato anche self-hosted. Stable Audio Open
  è commerciale sotto 1 M$ di fatturato.
- **Audio dalla voce**: il ritmo si estrae in locale e gratis, solo il timbro si
  genera. Disegno deciso, costruzione rimandata.
