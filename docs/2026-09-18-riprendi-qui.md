# RIPRENDI QUI — stato della fase 1 e regole per le fasi successive

> Scritto il 2026-09-18, alla fine di una sessione lunga. **Questo è il primo file
> da leggere in una sessione nuova**, prima del piano e prima del codice.
> Il resto della memoria sta nel [quaderno](2026-09-14-bozze-servizi.md), nella
> [scaletta](2026-09-15-scaletta.md) e nel ledger
> `.superpowers/sdd/2026-09-15-la-pelle/progress.md` (ignorato da git, vive solo
> su questa macchina).

---

## 1. Dove siamo, in una tabella

| | |
|---|---|
| Ramo | `fase-1-la-pelle`, HEAD `3020a10` — **non fuso, non spinto** |
| Lavoro | 29 commit, 38 file, **+3.831 / −482 righe** |
| Prove | **734 verdi, 0 rosse** (`npm test`), 62 file di prova |
| Compiti | **9 chiusi su 11.** Il 10 è a metà, l'11 non è cominciato |
| Giri di correzione | 13 |
| Decisioni prese da me e messe a verbale | 40 |

### I compiti

| # | Compito | Stato |
|---|---|---|
| 1 | Il terzo livello — `niente` | ✅ |
| 2 | Le scelte del punto oro diventano gruppi | ✅ |
| 3 | Immagine — 1K, 2K e tutti i formati | ✅ |
| 4 | Il rimborso si dice | ✅ |
| 5 | Le decisioni della pelle, pure | ✅ |
| 6 | Lo scontorno ridichiarato | ✅ |
| 7 | Scontorna ripulito a schermo | ✅ |
| 8 | La home — Brain esce dalla barra | ✅ |
| 9 | La pianta dello studio sul desktop | ✅ (4 giri di correzione) |
| 10 | I gesti — due dita muovono, un dito lavora | 🔶 **2 giri fatti, 1 Critico aperto** |
| 11 | Gli stessi gesti su Brain e sulla home libera | ⬜ non cominciato |

**Poi mancano:** la revisione finale su tutto il ramo (col modello più capace),
`superpowers:finishing-a-development-branch`, e la lista delle 40 decisioni
consegnata al committente.

### Il Critico aperto del compito 10

Una panoramica **pura** a due dita, a `1×`, finisce a **`1,8×`**: `bandaGrezza`
riscrive l'accumulatore quando scende sotto `min/2`, e il fattore compensativo
moltiplica il valore riscritto. Al limite arriva a `8×`.

**La decisione è già presa e scritta nel ledger:** `z` si deriva dal **rapporto
assoluto** fra la distanza attuale delle dita e quella d'inizio gesto, per la `z`
d'inizio gesto. Così `bandaGrezza` si cancella e il recupero esatto è vero per
costruzione. Restano attaccati: lo sfarfallio (limitare lo spostamento con la `z`
d'inizio gesto, e provare la continuità **anche su x**, non solo su y), il palco
catturato che sopravvive al proprio stage, e tre minori.

---

## 2. Cosa è costato, e perché

La fase è riuscita — 13 porte chiuse trovate e riaperte, nessuna sfuggita. Ma è
costata **il doppio del previsto** (stimata 1,5 giornate). Ecco dove sono finiti
i token, in ordine di peso.

### 2.1 Il compito 9 da solo: 4 giri di correzione e 5 revisioni

Un compito **di solo CSS** ha richiesto quattro giri. Non per il CSS: il CSS era
giusto dal secondo giro. I giri 2, 3 e 4 sono serviti a rendere oneste **le
prove**.

La causa è strutturale: **il progetto non ha un DOM nelle prove** (niente jsdom,
scelta deliberata), quindi il comportamento del CSS si sorveglia leggendo
`src/styles.css` come testo. E per sapere se una regola vince davvero, alla fine
abbiamo dovuto **scrivere un risolutore di cascata CSS a mano dentro un file di
prova**: `test/home.test.js` è passato da zero a **903 righe**, con calcolo della
specificità, espansione delle scorciatoie e risoluzione per dichiarazione.

Tre volte di fila una prova è rimasta **verde sopra il proprio difetto acceso**,
perché chiedeva «una regola dice la cosa giusta?» invece di «la regola che
**vince** dice la cosa giusta?».

### 2.2 Cinque limiti di sessione

Ognuno ha ucciso un dispaccio a metà. Tre volte hanno lasciato lavoro **non
committato**, e ogni volta è servito un agente fresco solo per **verificare cosa
fosse stato fatto** prima di continuare. Una volta il lavoro ereditato era **di
soli commenti** che dichiaravano una garanzia mai scritta: committarlo avrebbe
messo a verbale una bugia.

### 2.3 Sette rapporti con affermazioni inesatte

Gli attuatori hanno riferito numeri misurati in uno stato come se fossero di un
altro, e ci hanno tirato sopra una conclusione. Due esempi veri: «le due altezze
sono identiche» (erano 98px e 112px); «l'iniezione non produce sovrapposizione»
(erano i numeri **post-correzione** riportati come post-iniezione, e la
conclusione era che una prova fosse impossibile — non lo era).

Ogni affermazione inesatta ha costretto il revisore a **rimisurare tutto**, cioè
a raddoppiare il costo della revisione.

### 2.4 Le porte chiuse si trovavano solo col browser

Delle 13 porte chiuse, la maggioranza viveva nel JSX o nel CSS e **nessuna prova
pura poteva vederle**: un componente montato correttamente ma **sotto** una barra
fissa e non cliccabile; sei nomi **panna su panna**, invisibili; un pannello a
`display:none` in ogni stato raggiungibile. Le ha trovate un revisore che ha
**aperto un browser** — sempre *dopo* che l'attuatore aveva detto «fatto».

---

## 3. Le sette regole per le fasi successive

In ordine di quanto fanno risparmiare.

### 3.1 ⭐ Una prova di raggiungibilità nel browser, una volta sola

**È il cambiamento singolo che vale più di tutti gli altri messi insieme.**

Mantieni il divieto di jsdom — è una scelta giusta e non va toccata. Ma aggiungi
**uno script solo** che apre l'app nel browser vero e, per ogni comando, a
**390 / 800 / 1280 px**, afferma tre cose:

1. `document.elementFromPoint` al centro del comando restituisce **quel** comando;
2. il rettangolo del comando sta dentro la finestra;
3. il colore del testo contro lo **sfondo davvero dipinto** supera 4,5:1.

Queste tre righe avrebbero preso **tutte e 13 le porte chiuse** in un passaggio
solo, e avrebbero reso inutili le 903 righe di risolutore di cascata: non serve
sapere quale regola vince, se guardi il pixel.

⚠️ **Da fare prima della fase 2**, non durante.

### 3.2 L'attuatore apre il browser *prima* della revisione, non dopo

Il dispaccio deve chiedere le misure come **prova allegata**, non come racconto.
Se il compito tocca qualcosa che si vede, il rapporto arriva con i numeri dentro
o il compito non è finito. Oggi il browser lo apriva il revisore, un giro dopo.

### 3.3 Nei rapporti si incolla l'output, non la prosa

Regola secca: **un numero senza il comando che l'ha prodotto non è un numero.**
Gli attuatori incollano l'output grezzo; la prosa sta accanto, non al posto.
Questo da solo toglie la causa di §2.3 e dimezza il costo delle revisioni.

### 3.4 Tetto a **due** giri di correzione, poi decido io

La regola di serie ne prevede cinque. **Cinque sono troppi**: dal terzo in poi il
compito 9 non stava più correggendo il prodotto, stava correggendo le proprie
prove. Nuovo tetto: **due giri**; al terzo il controllore o decide (e mette a
verbale un minore rimandato) o riscrive il compito. Un difetto che sopravvive a
due giri è un problema di *disegno*, non di esecuzione.

### 3.5 I compiti che toccano gli stessi file si uniscono

I compiti 8 e 9 toccavano tutti e due `toolrail` e `styles.css`. Separati, il 9 ha
dovuto **disfare** decisioni del 7 e riscrivere prove dell'8. Un compito solo
avrebbe evitato due revisioni intere. Nella prossima pianificazione: **una
passata di conflitti sui file prima di tagliare i compiti**, non dopo.

### 3.6 Salvare la sessione dai limiti

I cinque limiti sono costati più di qualunque scelta di modello. Cose concrete:

- **Un commit alla fine di ogni passo**, non alla fine del compito. Un albero
  sporco al limite di sessione costa un agente intero di verifica.
- **Il ledger è già la rete** e ha funzionato ogni volta: tienilo così.
- **Non incollare mai artefatti nei dispacci** — si passano **percorsi di file**.
  Un dispaccio che incolla la storia dei compiti precedenti la fa rileggere a
  ogni turno, per tutto il resto della sessione.

### 3.7 I modelli: la scelta era giusta, il numero di giri no

Non cambiare i modelli. Le revisioni su **Opus** hanno trovato tutto — compreso
il difetto che due revisioni più economiche avevano lasciato passare — e gli
attuatori su **Sonnet** hanno lavorato bene (l'ultimo ha prodotto tabelle di
rottura-apposta corrette **su ogni riga, due volte di fila**). Lo spreco non era
il prezzo per dispaccio: era **quanti dispacci**.

---

## 4. La prossima fase è quella dei soldi

La **fase 2 — comprare senza account** è la più importante della scaletta: oggi
l'unica porta verso i soldi è l'ingresso via email, ed è rotta.

Tre cose da fare diversamente, perché tocca il denaro:

1. **La prova di raggiungibilità (§3.1) esiste già prima di cominciare.** Il
   Critical di B2 era un tasto per pagare che spariva a saldo zero: esattamente
   ciò che quello script prende.
2. **`/code-review ultra` va lanciata da te** prima di fondere — è a consumo, ed
   è riservata da sempre alle fasi che toccano i soldi. Io non posso lanciarla.
3. **Ogni prova parte da uno stato dichiarato** — mai da un saldo già carico, mai
   da una licenza già valida. È la lezione B2 n.2 e in questa fase ha pagato ogni
   volta.

---

## 5. Le regole che restano in vigore, invariate

- **Le chiavi segrete non entrano** in chat, in un file del progetto o in un
  commit. Solo `npx wrangler secret put NOME` dal tuo terminale.
- **I subagent non si collegano** a Supabase, Stripe o Google, e non cercano
  chiavi. Va scritto in **ogni** dispaccio.
- **Autorizzazione permanente a spingere e pubblicare** — ma **mai su un
  controllo CI rosso**.
- La suite si lancia con **`npm test`**, mai con `node --test test/*.test.js` a
  mano: quest'ultimo fa scattare una protezione in `test/api.test.js` che si
  rifiuta di ripulire senza `JAYL_CRAFT_LIBRARY`, e sembra un guasto senza
  esserlo. (Un rapporto ci è già cascato.)
- **«Nessuna porta si chiude»** resta il vincolo più duro del progetto. In questa
  fase ha preso 13 difetti, **tutti sotto una suite verde**.

---

## ⚠️ AGGIORNAMENTO 2026-09-24 — dove si è fermata la sessione

**Leggi questo per primo.** Gli 11 compiti sono **tutti chiusi e approvati**.
La revisione finale di ramo ha trovato due bloccanti, **corretti e committati**:

- `9eb9be8` — annulla/rifai: risultato, storia e futuro in un solo `useReducer`
  col riduttore puro `riduciStoria` (`src/engine/storia.js`). Verificato con clic veri.
- `d0016eb` — la libreria sul telefono si chiude di nuovo.
- `f81592b` — tolto il `border-right` morto della barra dei servizi.

**Resta UNA cosa sola:** `d0016eb` ha aperto tre porte nuove — telefono in
orizzontale (testata della libreria fuori schermo), portatili 1280×800 e
1366×768 a libreria aperta («Rifai» e 5 strumenti del Vettoriale nascosti),
390×844 (colonna di Scontorna ridotta a 21px). **Regola già decisa:** cede il
**corpo** della libreria, mai la **testata** e mai la **colonna degli
strumenti**. Un agente la stava applicando: controlla `git log` (commit
`wip: la libreria cede il corpo…`) e il rapporto
`.superpowers/sdd/2026-09-15-la-pelle/final-fix-report.md`.

**Come chiudere, senza altre revisioni Opus** (decisione del committente,
budget token):
1. Se ci sono file modificati non committati → committali come `wip`.
2. Finisci la correzione, poi **controlla tu** che nella matrice
   390×844, 390×664, 375×548, 667×375, 844×390, 932×430, 844×340, 800×700,
   1280×800, 1366×768 — libreria aperta e chiusa — **niente di raggiungibile su
   `main` sia diventato irraggiungibile** (`elementFromPoint` al centro di ogni
   comando, confronto col foglio di stile di `main`).
3. `npm test` e `npm run build` verdi → chiedi al committente se fondere e
   pubblicare. Tutto il resto va nei minori, non in altri giri.
