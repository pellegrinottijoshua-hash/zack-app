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

---

## ✅ 2026-09-24 — FASE 1 CHIUSA, FUSA E PUBBLICATA

L'aggiornamento qui sopra è **superato**. La correzione dei residui è in
`1e09c3f`/`a98f43b`: nessun comando raggiungibile su `main` è diventato
irraggiungibile, sulle 10 misure di schermo. La fase è fusa in `main` con
`4c468d4` (783 prove verdi, build ok sul risultato della fusione), e **Workers
Builds: zack-app → success**. Il ramo `fase-1-la-pelle` è stato cancellato.

**La prossima sessione comincia dalla fase 2** (comprare senza account). Prima
di cominciarla c'è una sola cosa da fare: la regola §3.1 qui sopra, la prova di
raggiungibilità nel browser. I minori rimandati, numerati da 1 a 28, stanno nel
ledger `.superpowers/sdd/2026-09-15-la-pelle/progress.md`, e c'è un cancello
duro prima di accendere il muro: a `VITE_MURO=1` Immagine deve mostrare il
prezzo, non «Entra per usare lo studio».

---

## ▶️ 2026-09-26 — LA FASE 2 È SPEZZATA IN TRE FETTE: 2a, 2b, 2c

La fase 1 era della grandezza giusta ma è costata molte volte la stima (1,5 g ≈
15 M), e si è bloccata sui limiti delle 5 ore più di cinque volte. Da qui in
avanti vale **una sessione = una fetta**.

### Le regole di ogni fetta

1. **Al massimo 4-5 compiti**, dentro una finestra di 5 ore.
2. **Finisce fusa e pubblicata** (salvo 2b, che aspetta la `ultra` del
   committente). Niente rami che restano aperti fra una sessione e l'altra.
3. **Un giro di correzione per compito**, poi decido io; i minori vanno in lista.
   I criteri meccanici (prove, build, lo script di 2a) li controllo io con Bash,
   senza ri-revisioni col modello capace.
4. **Dopo ogni compito**: commit + una riga in questo file. Un blocco deve
   costare al massimo un compito.
5. **Sessione nuova per ogni fetta.** Una sessione lunga rilegge tutta la sua
   storia a ogni turno: è lì che se ne vanno i token.
6. Le fasi successive della [scaletta](2026-09-15-scaletta.md) si tagliano allo
   stesso modo quando ci si arriva (le più lunghe: 5 Brain, 6 Voce).

### 2a — La prova di raggiungibilità nel browser  ← **si comincia da qui**

È la regola §3.1, finalmente fatta. Uno script solo, nel browser vero, che per
ogni comando visibile, a **390 / 800 / 1280 px** (più 760/761), dice:

1. `document.elementFromPoint` al centro del comando restituisce **quel** comando;
2. il rettangolo del comando sta dentro la finestra;
3. il testo contro lo sfondo davvero dipinto supera **4,5:1**.

- **Stati di partenza dichiarati**: localStorage vuoto; a muro spento e a muro
  acceso (`VITE_MURO=1`); saldo zero e saldo carico.
- **Prova che morde**: si rompe apposta una porta già chiusa nella fase 1 (per
  esempio la testata della libreria fuori schermo) e lo script deve diventare
  rosso.
- **Il cancello duro**: a `VITE_MURO=1` Immagine deve mostrare il prezzo, non
  «Entra per usare lo studio». Lo script lo verifica.
- Niente jsdom: il divieto resta. Lo script gira nel browser, non in `npm test`.
- **Taglia**: piccola, 2-3 compiti, niente soldi. Spec breve + piano nella
  stessa sessione.

### 2b — I soldi: comprare senza account

Il gettone minimo da **1 €**, il pagamento da ospite (senza email), il **prezzo
accanto al tasto prima di premere**, il credito che sopravvive nel browser con
l'avviso onesto.

- Parte **solo dopo 2a**: lo script deve già esistere (il Critical di B2 era un
  tasto per pagare che spariva a saldo zero).
- **Spec e piano col modello capace** — è il passo costoso: circa mezza sessione
  prima del codice. Probabilmente spec in una sessione, esecuzione nella
  successiva.
- Ogni prova parte da uno stato dichiarato; il costo si misura prima di scrivere
  il prezzo (lezioni B2 n.2 e n.3).
- **Prima di fondere: `/code-review ultra` la lancia il committente.** Io non
  posso.
- Aperto per il committente: l'IVA, da chiarire col commercialista.
- Le regole di sicurezza del §5 valgono per intero: niente chiavi, niente
  cruscotti Stripe, i subagent non si collegano a niente.

### 2c — La home del desktop che lavora

Tre corsie, il prompt, i riferimenti a pallini. Non tocca i soldi e può andare
anche prima di 2b se serve. Punto di partenza: la spec già scritta
[`superpowers/specs/2026-08-27-home-che-lavora-design.md`](superpowers/specs/2026-08-27-home-che-lavora-design.md)
— da rileggere contro la pianta nuova della fase 1 prima di pianificare.

### Frase da incollare in una sessione nuova

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 2a.
```

---

## ✅ 2026-09-26 — FETTA 2a CHIUSA

`scripts/raggiungibilita.mjs` esiste. Node puro, senza dipendenze nuove: comanda
Chrome headless via DevTools Protocol. Si lancia con i due server di
`.claude/launch.json` accesi (5173 muro spento, 5174 muro acceso):

    node scripts/raggiungibilita.mjs                     # completo, ~5 min
    node scripts/raggiungibilita.mjs --rapido            # 390/800/1280, libreria chiusa
    node scripts/raggiungibilita.mjs --finestra 844x390  # una misura sola

- **Matrice**: muro spento/acceso × saldo zero/carico × libreria chiusa/aperta ×
  390, 760, 761, 800, 1280 e **844×390** (aggiunta: senza uno schermo basso la
  porta della fase 1 non si vede) × i 6 servizi, più il benvenuto al primo
  ingresso. Oggi: 300 pagine, 4.068 comandi, **verde**.
- **Stato dichiarato**: localStorage svuotato a ogni pagina; benvenuto e file
  di prova segnati come visti (il file di prova arriva a tempo variabile e
  rendeva la prova instabile).
- **Lo sfondo si legge dal pixel** (`elementsFromPoint`), non dal DOM: una
  etichetta assoluta fuori dal suo bottone misurava 1:1 contro il colore
  sbagliato.
- **Morde**: rimesso `overflow: hidden` su `.shell` (il guasto della fase 1),
  a 844×390 → 20 difetti nuovi, uscita 1. Ripristinato.
- **Cancello duro: ROSSO, noto.** A muro acceso e saldo zero Immagine dice
  «Entra per usare lo studio». Si chiude in **2b**.
- **Tre minori già su `main`**, a verbale in `scripts/raggiungibilita-noti.json`:
  nome «Video» a 3,24:1; chip della libreria a 3,02:1; «Ho capito, cominciamo»
  che sborda di 16 px a 844×390.
- ⚠️ Una prima versione era **verde perché misurava la landing** (`/` e non
  `/app/`). Ora, se la pagina non è lo studio, lo script si ferma con un errore.

**Prossima sessione:** «Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 2b».

## ▶️ 2026-09-26 — 2b: spec e piano scritti, codice FERMO su una decisione

[`superpowers/specs/2026-09-26-comprare-senza-account-design.md`](superpowers/specs/2026-09-26-comprare-senza-account-design.md).
**Il gettone da 1 € perde ~14 centesimi** (Stripe 0,25 € + 1,5% su un margine
del 12%; il pareggio è a ~2,31 €). E se l'IVA al 22% si applica, **ogni**
generazione è in perdita (margine 14% < IVA). Servono dal committente:
strada del gettone (§2.2), IVA, anonimi accesi su Supabase (§4). Poi i 4 compiti.

## 🔶 2026-09-26 — 2b: i 4 compiti fatti, sul ramo `fetta-2b` (NON su main)

- `fda2c06` 2b/1 — un servizio a saldo non si mura mai: **cancello duro verde**.
- `cfb1a0b` 2b/2 — ospite nel Worker: niente `customer_email` se manca, niente prova agli anonimi.
- `a63e0ec` 2b/3 — gettone **2 €** (decisione del committente) e ricarica da ospite (`signInAnonymously` al clic).
- 2b/4 — l'avviso onesto nella ricarica, prima di pagare.
- 792 prove verdi, build ok, script di 2a verde (300 pagine, 4.092 comandi).

**Manca, e tocca al committente:** `/code-review ultra` sul ramo, la query
RLS qui sotto sul progetto Supabase, l'IVA (spec §2.1). Poi si fonde e si
pubblica. Anonimi su Supabase: **accesi** (2026-09-26).

Minori nuovi: lo script non apre il pannello della ricarica (i suoi comandi
non li misura); su telefono il tasto Brain si sovrappone al titolo di
Immagine (testo, non comando: lo script non lo vede).

La query RLS (editor SQL di Supabase). Ci si aspetta `rowsecurity = true` su
tutte e tre, e nessuna policy che dia `insert`/`update` ad `authenticated`:

```sql
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' and tablename in ('conti','movimenti','lavori');
select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public';
```

## 🔶 2026-09-27 — 2c: fatta, sul ramo `fetta-2c` (impilato su `fetta-2b`)

Spec: [`superpowers/specs/2026-09-27-home-tre-corsie-design.md`](superpowers/specs/2026-09-27-home-tre-corsie-design.md).
La spec del 2026-08-27 era superata; la 2c viene dal quaderno §D.

- `f8fba73` 2c/1 — `/ricarica` torna sulla home (`ritorno`, chiave chiusa).
- `2624e5e` 2c/2 — `CorsiaImmagine`: prompt, pallini, prezzo accanto al tasto, ricarica da ospite con bozza salvata.
- `8197728` 2c/3+4 — il banco a tre corsie; lo script di 2a misura anche `/` (324 pagine, verde; morde).
- 803 prove verdi, build ok.

**Si fonde così:** prima 2b, poi 2c, con **una** `ultra` sul ramo `fetta-2c`
(contiene tutte e due). Restano le cose del committente elencate per 2b.

Minori nuovi: la mascotte al centro è un'immagine, non un video (la clip del
racconto va con lo scorrimento e da ferma ha il fondo: serve una clip in loop
con l'alfa); nella corsia di sinistra resta il vuoto della mascotte di
Ritaglio nascosta; nessuna generazione vera provata dalla home (costa soldi
veri: va fatta dal committente, una volta, prima di fondere); il sovrapprezzo
dell'ospite del quaderno (D-h: 18 cent invece di 15) non è stato fatto.

## 🔶 2026-09-27 — correzioni 2a/2b/2c e FASE 3 (video) fatte, sul ramo `fetta-3-video`

I rami sono impilati: `fetta-2b` ← `fetta-2c` ← `fetta-3-video`. Si fondono
**in quest'ordine**, con **una** `/code-review ultra` su `fetta-3-video`, che
li contiene tutti.

- **Correzioni** (`ed9eadd`, su `fetta-2c`): l'avviso dell'ospite
  (`eOspite`), tre contrasti, la card del benvenuto che scorre, Brain sopra il
  claim, il vuoto della corsia sinistra. Lo script apre anche la ricarica.
  **Lista dei difetti noti: vuota.**
- **Fase 3** — spec [`superpowers/specs/2026-09-27-video-seedance-design.md`](superpowers/specs/2026-09-27-video-seedance-design.md):
  Seedance 2.5 dal canale ufficiale **BytePlus** (default) e da **Higgsfield**
  in opzione (`VIDEO_FORNITORE`), col cancello che blocca un canale in
  perdita salvo `VIDEO_ACCETTA_PERDITA=1`. Motore nel Worker (`/genera` 202,
  `/lavoro`, `/lavoro/video`, giro orario che chiede al fornitore prima di
  rimborsare), il servizio nello studio, la corsia nella home.
- 835 prove verdi, build ok, script di 2a verde (420 pagine, 5.520 comandi).
- `scripts/higgsfield-seedance.mjs` + `npm run seedance:prova`: la prova
  dell'SDK ufficiale. **Non ancora eseguita**: manca la chiave in `.env.local`.

**Tocca al committente, prima di fondere:**
1. Revocare la chiave Higgsfield incollata in chat il 2026-09-27 e crearne una nuova.
2. SQL: `docs/2026-09-27-schema-video.sql` (tre colonne su `lavori`) + la query RLS della 2b.
3. Chiavi, dal terminale: `npx wrangler secret put ARK_API_KEY` (BytePlus,
   attivare Seedance 2.5 su ModelArk) e, per l'opzione, `npx wrangler secret put HF_CREDENTIALS`.
4. Un video vero, una volta, prima di fondere (costa ~1,10 € al canale ufficiale).
5. L'IVA (margine 14% < 22%: vale anche per il video).
6. `/code-review ultra` sul ramo `fetta-3-video`.

Minori: niente riferimenti per il video (image-to-video) né 1080p; su
Higgsfield un task che finisse dopo il rimborso delle 2 ore lo pagheremmo noi;
il cambio dollaro→euro è una fotografia (0,95) da riguardare.

## ✅ 2026-09-27 — TUTTO FUSO E PUBBLICATO: 2b, 2c, 3 e 3d su `main`

`f41f2ba`, Workers Builds → success. Il committente ha scelto di fondere
**senza** la `/code-review ultra`. Lo SQL della fase 3 è stato lanciato
(tre colonne su `lavori`, verificate).

- **3d** (spec §7): 1080p e immagini (primo/ultimo fotogramma, fino a 9
  riferimenti) dal canale ufficiale; `canalePer` manda all'ufficiale ciò che
  il canale acceso non sa fare. 844 prove, script di 2a verde (420 pagine).
- In produzione **il video non parte finché mancano le chiavi**: il Worker
  risponde 503 PRIMA di addebitare.

**Resta al committente:** `npx wrangler secret put ARK_API_KEY` (e
`HF_CREDENTIALS` per l'opzione), un video vero di prova, l'IVA, la query RLS
della 2b.

## ▶️ PROSSIMA SESSIONE — fase 4, l'icona output e il pocket

Stato al 2026-09-27: `main` = tutto pubblicato (2b, 2c, 3, 3d). Il video in
produzione aspetta solo il **resource pack di Seedance 2.5** su BytePlus (il
committente lo compra: attivazione a consumo puro non disponibile per il 2.5;
il Savings Plan da 30 € è per 2.0 Mini/Fast e NON va comprato). Poi un video
vero di prova.

Spec pronta: [`superpowers/specs/2026-09-27-output-pocket-design.md`](superpowers/specs/2026-09-27-output-pocket-design.md).
Si comincia chiedendo le **4 decisioni del §3**, poi la fetta **4a**.

Frase da incollare in una sessione nuova:

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 4a.
```
