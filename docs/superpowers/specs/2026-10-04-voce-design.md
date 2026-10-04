# Fase 6 — Voce (ElevenLabs, per intero)

> Spec, 2026-10-04. Fonti: la scaletta (fase 6, 2,5 g ≈ 25 M), il quaderno
> `2026-09-14-bozze-servizi.md` §E3 (bozza e risposta del committente), §C-d,
> «Trascrivi diventa un tasto», §E4 (stessa chiave per gli effetti).
> **Tocca i soldi**: ogni fetta che chiama ElevenLabs addebita crediti e deve
> rimborsare se fallisce, come Immagine e Video. Si fa in quattro fette, una
> per sessione. Le domande del §3 vanno fatte **prima** della 6a.

## 1. Cosa è già deciso

- **E3 — tutto ElevenLabs, non due servizietti.** Leggere un testo, creare
  voci, clonare la propria e quella di amici consenzienti, **sovrapporre la
  propria voce a un'altra dentro un video**, doppiare. Ciò che l'API non
  permette si cerca altrove.
- **Il consenso si chiede e si registra.** Clonare la voce di un amico va
  bene, ma *prima* della registrazione c'è una dichiarazione esplicita — «questa
  voce è mia, o ho il permesso di chi parla» — e la risposta resta scritta,
  perché un reclamo arriverebbe a noi.
- **La voce clonata non è un'uscita, è un asset che resta**: un'icona sua in
  Brain, da riusare.
- **«Trascrivi» è un tasto, non una regola**: su ogni singolo vocale, a
  pagamento, e solo quando lo premi. La stessa chiave serve alla cattura.
- **Il prezzo si vede prima di premere** (regola di Immagine e Video), e **il
  rimborso si dice**.
- **Il costo si misura prima di scrivere il prezzo** (lezione 3 di B2).
- Il servizio **`vocale`** esiste già: registra, aggiunge un file e lo
  trasforma con filtri locali (`dizionarioVoce`, le sei ricette). Quello
  resta, gratis nell'abbonamento: la fase 6 ci aggiunge sopra il lavoro a
  crediti, nella stessa stanza.

## 2. Il disegno

### 2.1 Un fornitore in più, la stessa strada di Video

`worker/fornitori/elevenlabs.js`, accanto a `google.js` e `seedance.js`. La
chiave sta nei segreti del Worker (`ELEVENLABS_API_KEY`), mai nel browser.
Senza chiave il Worker risponde **503 prima di addebitare**, come il video.

Due forme di lavoro:
- **sincrone** (lettura breve, voce da descrizione, trascrizione corta): il
  Worker chiama, salva, risponde;
- **asincrone** (doppiaggio, voce dentro un video): la tabella `lavori` e il
  ritiro che il video usa già (`worker/video.js`, `sbloccaAppesi`).

Addebito → chiamata → rimborso detto se fallisce: lo stesso giro di
`genera()`. Nessun secondo meccanismo di soldi.

### 2.2 Il listino si misura

`engine/listino.js` riceve le voci ElevenLabs **solo dopo** una misura vera:
caratteri letti, minuti trascritti, minuti doppiati, una clonazione. Le
cifre vanno sul conto dell'abbonamento ElevenLabs scelto (§3.1), con il cambio
dollaro→euro come per Seedance. Fino alla misura, la voce del listino non
esiste e il tasto è spento.

### 2.3 Le voci sono file

Una voce (clonata o disegnata) è un asset `kind: 'voce'`: un piccolo file JSON
con l'id della voce presso ElevenLabs, il nome, la nota, e il riferimento al
consenso. In Brain è un'icona (la faccia: l'onda, o una del cast), sta nelle
cartelle, si posa sul servizio Voce e lo sceglie — la stessa regola dei prompt
della 5d («un prompt è un file»). `DESTINAZIONI.voce = ['pocket', 'vocale-voce', 'brain']`.

Cancellare una voce dal cestino la cancella **anche** presso ElevenLabs
(svuotare è l'unico gesto senza ritorno; deve esserlo davvero).

### 2.4 Il consenso, registrato

Prima di ogni registrazione da clonare: la dichiarazione, con due scelte
(«è la mia voce» / «ho il permesso di chi parla», e allora il nome). Il Worker
scrive una riga in `consensi`: conto, ora, scelta, nome di chi parla,
l'impronta del campione, il testo della dichiarazione **com'era quel giorno**.
Senza la riga la clonazione non parte (lo controlla il Worker, non il
browser).

### 2.5 La stanza

Il servizio `vocale` resta uno: il `+` dà **registra · aggiungi · scrivi**
(«scrivi» = leggi questo). Il punto oro sceglie la voce (le voci in Brain, più
quelle pronte di ElevenLabs) e, per i gesti a crediti, cosa fa il tasto:
**trasforma** (filtri locali, gratis), **leggi**, **cambia voce**, **trascrivi**.
Il prezzo accanto al tasto cambia col gesto scelto.

## 3. Domande per il committente — **prima della 6a**

1. **Quale piano ElevenLabs?** Per quanto ne so (da verificare sulla loro
   pagina dei prezzi il giorno stesso) il gratuito non permette l'uso
   commerciale né la clonazione; servirebbe almeno un piano a pagamento. È una spesa fissa nuova
   (il budget dice «strumenti in più solo se gratuiti»): va decisa da te, con
   la cifra davanti. Senza, la fase 6 si ferma a 6a in sviluppo.
2. **Il ricarico**: Immagine e Video hanno il loro. Per la voce si usa lo
   stesso, o uno diverso (la lettura costa poco a carattere)?
3. **La dichiarazione di consenso**: va bene il testo che propongo nella 6b,
   o lo vuoi far guardare a qualcuno?
4. **Dove finisce la trascrizione**: un `.md` accanto al vocale in Brain
   (proposta), o la nota del vocale stesso?

### Risposte del committente, 2026-10-04

1. **Nessun piano per ora.** La 6a si fa in sviluppo col fornitore finto;
   `MISURA_VOCE = null`, il tasto «leggi» è spento e il Worker risponde 503
   `non-misurato` prima di addebitare. Il giorno del piano: chiave con
   `npx wrangler secret put ELEVENLABS_API_KEY`, una lettura vera, la misura in
   `src/engine/listinoVoce.js`, e gli id delle voci pronte riconfermati.
2. **Lo stesso ricarico** di Immagine e Video (`priceFor`).
3. **Il testo del consenso lo scrivo io** nella 6b, e si usa così.
4. **La trascrizione è un `.md` accanto al vocale** in Brain.

## 4. Le fette

**6a — leggi questo** (4 compiti):
1. `worker/fornitori/elevenlabs.js` (testo → audio) + prove col fornitore
   finto; 503 senza chiave;
2. la misura e il listino (`listino.js`), il prezzo accanto al tasto;
3. il servizio: «scrivi» nel `+`, il testo, le voci pronte nel punto oro,
   l'uscita audio nella pool con l'icona output; il rimborso detto;
4. lo script di raggiungibilità, prove, build, fusa.

**6b — le voci**: voce da descrizione; clonazione con il consenso del §2.4
(tabella `consensi`, SQL da lanciare a mano); la voce come asset `voce` in
Brain; posata sul servizio la sceglie; svuotare il cestino la cancella presso
ElevenLabs.

**6c — voce su voce**: cambiare la voce di una registrazione
(speech-to-speech); poi **la voce dentro un video**: si estrae l'audio, si
cambia la voce, si rimonta — nel browser se ce la fa, altrimenti come lavoro
asincrono. ⚠️ È la fetta col rischio più alto: va provata prima con un video
vero di 10 secondi.

**6d — doppiaggio e trascrizione**: il doppiaggio di un video (asincrono, la
strada del video); il tasto «trascrivi» su un vocale, a pagamento, che scrive
il `.md` del §3.4.

## 5. Cosa NON fa

Non registra a telefono bloccato (lo fa il registratore di Samsung, §C).
Non fa sincronia labiale né cori. Non clona senza la riga di consenso. Non
tiene la chiave nel browser. Non addebita prima di sapere che il fornitore
risponde. Non sceglie il piano ElevenLabs al posto del committente.
