# Fase 4 — L'icona output e il pocket

> Spec, 2026-09-27. Da eseguire in una **sessione nuova**, una fetta per
> sessione (regole di RIPRENDI-QUI). Fonti: la scaletta (fase 4) e il quaderno
> `2026-09-14-bozze-servizi.md`, §T2, §T3, §T6, §A7, §B5–B7. Stima della
> scaletta: 1 g. **Non tocca i soldi.**

## 1. Cosa è già deciso (dal quaderno)

- **T2 — l'icona output.** Sotto/accanto a ogni file lavorato, **uno per
  file, centrato alla sua destra**, un cerchietto con dentro l'immagine del
  file: è l'uscita, e si prende in mano. Vale per **l'uscita di ogni servizio**
  (scontorna, vettoriale, immagine, video, voce, effetti).
- **Due gesti, tutti e due:** si **trascina** su un servizio o nel pocket, e si
  **tocca** — il tocco apre le destinazioni. Sul telefono il trascinamento
  lungo fallisce spesso: il tocco è la strada che non fallisce. Durante il
  trascinamento **le destinazioni si accendono**.
- **T3 — il pocket.** Cerchio **in alto a destra**, speculare a Brain (la
  pianta della fase 1 ha già il posto: `styles.css`, «il pocket, quando
  arriverà, va in alto a destra»). Fino a **10 file**, **4 visibili**, il resto
  girando. **Si svuota ogni giorno.**
- **T6 — il pocket non è un magazzino.** I file vivono in Brain (la
  libreria); il pocket ne tiene solo il **richiamo**. Svuotarlo non cancella
  niente — è ciò che rende innocuo lo svuotamento quotidiano.
- **B7 / A7 — un file posato su un servizio diventa il suo riferimento**, e
  cambiando servizio è già lì. I riferimenti di Immagine e Video si pescano
  anche dal pocket, non solo dalla libreria.

## 2. Il disegno

### 2.1 Il pocket è una lista di id, non di file

`localStorage['jayl.pocket'] = { giorno: 'AAAA-MM-GG', ids: [assetId, …] }`.
Al primo accesso di un giorno diverso (data **locale** del cliente) si svuota.
Un id che in libreria non c'è più si salta senza errori. Tetto 10: l'undicesimo
fa uscire il più vecchio (detto, non in silenzio). Tutta la logica in un modulo
puro, `src/engine/pocket.js`, provato in Node.

### 2.2 L'icona output

Un componente solo, `IconaOutput`, montato dove oggi compare il risultato di
ogni servizio. Se il risultato **non è ancora in libreria** (Immagine e Video
lo salvano solo col cerchio «salva»), **prenderlo in mano lo salva prima**:
un'uscita nel pocket deve avere un posto dove vivere (T6). Il salvataggio
automatico si dice («salvato in Brain»).

### 2.3 Le destinazioni

Tocco → un ovale con le destinazioni **possibili per quel tipo di file**:
- un'immagine: pocket, Scontorna, Vettoriale, Immagine (riferimento), Video
  (primo fotogramma / riferimento), Brain;
- un video: pocket, Brain (Filmato quando arriverà);
- un audio: pocket, Brain, Vocale/Effetti se hanno senso.
Una sola tabella `DESTINAZIONI[kind]`, pura, provata. Trascinare usa la stessa
tabella: le destinazioni accese sono esattamente quelle dell'ovale.

### 2.4 Posare su un servizio

Posare = aprire quel servizio con il file già dentro: sullo scontorno è il
file da lavorare; su Immagine/Video diventa un riferimento (il ruolo di
default: `oggetto` / `riferimento`; per Video il menu chiede primo fotogramma
o riferimento, con la regola `immaginiVideoStorte`).

## 3. Da decidere col committente (all'inizio della sessione)

1. **Lo svuotamento**: a mezzanotte **locale** (proposta) o 24 ore dopo
   l'inserimento?
2. **I 4 visibili e «il resto girando»**: un carosello che scorre al tocco
   (proposta) o che gira da solo?
3. **Il salvataggio automatico** all'afferrare un'uscita non salvata (§2.2):
   va bene (proposta), o prima si chiede?
4. **Il pocket sulla home?** Oggi la home non ha libreria: proposta **no**,
   il pocket è dello studio.

## 4. Le fette

**4a — il pocket e il tocco** (piccola, 3 compiti):
1. `engine/pocket.js` puro (giorno, tetto 10, id spariti) + prove;
2. il cerchio del pocket in alto a destra, i 4 visibili, il carosello;
3. `IconaOutput` + l'ovale delle destinazioni (tocco) + `DESTINAZIONI[kind]`.

**4b — il trascinamento** (piccola, 2-3 compiti):
1. il trascinamento con Pointer Events (topo e dito con lo stesso codice),
   le destinazioni che si accendono;
2. posare su un servizio = riferimento/file già lì (B7);
3. i riferimenti di Immagine e Video pescano anche dal pocket (A7).

Ogni fetta: lo script di raggiungibilità di 2a su tutta la matrice (il pocket
e l'ovale sono comandi nuovi: devono essere raggiungibili a 390/800/1280 e a
844×390), `npm test`, `npm run build`, commit per compito, fusa e pubblicata.

## 5. Cosa NON fa

Non fa Filmato (non esiste ancora). Non tocca Brain oltre al ricevere un file.
Non sincronizza il pocket fra dispositivi (vive nel browser, come la libreria).
