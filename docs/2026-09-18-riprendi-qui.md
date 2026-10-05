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

## ✅ 2026-10-03 — FASE 4 (icona output e pocket) FATTA: 4a e 4b

Decisioni del committente (2026-09-27, §3 della spec): il pocket si svuota a
**mezzanotte locale**; dei 10 se ne vedono **4** e gli altri scorrono **al
tocco**; c'è **anche sulla home** (ogni destinazione è un collegamento allo
studio con `?asset=&dest=`); l'uscita non salvata si salva da sola e lo dice.

- `22f4672` 4a/1 — `engine/pocket.js` puro: giorno locale, tetto 10, id spariti.
- `2a5c683` 4a/2+3 — il cerchio del pocket (studio e home), `IconaOutput`
  accanto al risultato di Scontorna/Vettoriale/Immagine/Video, l'ovale delle
  destinazioni da `destinazioniDi(kind)`.
- `3b32f5a` 4b/1+2 — il trascinamento (`hooks/useTrascina.js`, Pointer
  Events): sotto 8 px resta un tocco; i cerchi che accettano prendono un anello
  oro, gli altri si spengono; posare = scegliere nell'ovale; su Video chiede
  primo fotogramma o riferimento. Una prova tiene «accese = ovale» per ogni tipo.
- `37e8bbb` 4b/3 — i riferimenti di Immagine e Video: «Dal pocket» in cima.
- `0c54287` lo script: tetto di 60 s per espressione e un secondo tentativo
  per pagina. La prima corsa si è **piantata alla pagina 415** di 780 (la
  preparazione dei file di prova del pocket, una volta sola) e restava appesa
  per sempre.
- `d7c3612` correzioni trovate dallo script: il pannello sopra la tela usciva
  dalla tela a 800×700 coi riferimenti più lunghi; tre contrasti della
  libreria (oro su panna, «◈» grigio chiaro).
- 861 prove verdi, build ok, script di 2a **verde**: 780 pagine, 16.018 comandi.

⚠️ **Lezione dello script**: fino al 2026-10-03 misurava sempre una
**libreria vuota**, quindi i tasti delle schede dei file non li aveva mai
visti — tre contrasti sbagliati stavano su `main` da settimane. I file di
prova del pocket li hanno fatti comparire. Uno stato dichiarato vuoto non
misura i comandi che esistono solo quando c'è qualcosa.

**Provato nel browser** (1280×800): scontorno → icona output → «Nel pocket»;
trascinamento col topo vero dal pocket a Video → domanda → Video col file
dentro; drop su Immagine → riferimento aggiunto, e il click di coda non
riapre l'ovale. **Non provato col dito vero**: l'anteprima non genera tocchi.
Va provato una volta sul telefono (`touch-action: none` sui file).

Minori: il vassoio aperto copre l'icona output (sul desktop) e un angolo della
tela — è un momento come l'ovale, ma la regola «gli strumenti non coprono la
tela» ha una sola eccezione dichiarata; l'avviso dopo «Video, primo
fotogramma» dice «Aggiunto ai riferimenti»; sulla home il pocket è solo a
tocco (lì non ci sono cerchi di servizio su cui posare).

**Fase 4 pubblicata** (`8edaf7f` su `main`).

## ▶️ 2026-10-03 — FASE 5 (Brain, la libreria): tagliata, 5a FATTA

Spec: [`superpowers/specs/2026-10-03-brain-libreria-design.md`](superpowers/specs/2026-10-03-brain-libreria-design.md).
Quattro fette: **5a** archivio e cestino · **5b** la tela di soli file ·
**5c** cartelle e riordino · **5d** i prompt e la vista libreria.
Il committente ha detto «parti da solo»: le decisioni che il quaderno
lasciava aperte sono nel **§3 della spec**, da ribaltare se non vanno.

- `57354bf` 5a/1 — `engine/archivio.js` puro: il cestino è un campo
  (`cestinatoIl`), la pool è una lente, lo spazio senza misura è `ignoto`.
- `5349d2b` 5a/2 — `useLibrary().assets` = solo i vivi; «butta» e la potatura
  cestinano; `svuotaCestino` è l'unica cancellazione vera; risalvare un file
  cestinato lo rimette (era la trappola: tornava invisibile).
- `46bb073` 5a/3 — in Brain il cerchio della **pool** (al posto di
  `ScegliAsset`: dal più recente, 20 + «altri», ricerca) e il **cestino**
  (rimetti, svuota con conferma, lo spazio); il file cestinato si nasconde
  dalla tela ma resta nei dati; `persist()` all'ingresso in Brain.
- `f107b06` 5a/4 — lo script apre pool e cestino (con un file cestinato).
- `e7eb157` lo script: anche la navigazione ha un tetto, e al secondo
  tentativo **Chrome si riapre** (un renderer bloccato non si riprende
  ricaricando). Provato con un `for(;;)` iniettato: «↻» e avanti.
- 872 prove verdi, build ok, script di 2a **verde**: 876 pagine, 15.460 comandi (un blocco di Chrome recuperato da solo).

**5a pubblicata** (`a2b639f` su `main`).

## ▶️ 2026-10-03 — 5b FATTA: la tela di soli file

- `2472f6b` 5b/1 — puro: `ICONA` (112), le tele vecchie si normalizzano
  tenendo il centro; `daNota`/`noteInFile`.
- `3881a1f` 5b/2 — aprendo una tela le note diventano `.md` al loro posto
  (frecce attaccate); «nota» nel `+` crea un `.md` e lo apre.
- `76e7082` 5b/3 — ogni file è un cerchio con la faccia, titolo e nota sotto;
  il tocco apre la scheda (file, nome, nota, icona). Via il menu del file e
  la mascotte della tela vuota (B1).
- `dd99411` 5b/4 — un file della tela si prende e si posa: su un servizio o
  sul pocket fa quello che fa l'ovale, sulla pool esce dalla tela.
- `9a761e3` 5b/5 — il tasto Zack esce da Brain; il riordino negli avanzati.
- `b06a54c` lo spazio del tasto torna alla tela (438 → 553 px a 390×844).
- 875 prove verdi, build ok, script di 2a **verde**: 924 pagine, 17.220 comandi.

Decisioni prese da me: §3 della spec, punti 8–10.

⚠️ **Trappola nuova**: un nodo che React **sposta** nel DOM (riordino della
lista, come `davanti`) perde la cattura del puntatore. Il trascinamento
dentro la tela funzionava lo stesso, perché i movimenti arrivavano alla tela
per bolla; fuori dalla tela il rilascio non arrivava mai. La cattura va su un
elemento che non si muove.

Minori: l'onda dell'audio è il segno, non la forma vera del file; il
riordino «compatta» non conosce l'altezza di titolo e nota sotto l'icona;
sul telefono la scheda sta fra le due colonne di cerchi ed è stretta; il `+`
di Brain non è in alto a sinistra a tela vuota (B1).

**Prossima sessione: la 5c** (cartelle e riordino).

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 5c.
```

## ▶️ 2026-10-04 — 5c FATTA: cartelle e riordino

- `55c3f47` 5c/1 — puro: `engine/cartelle.js` (`posaSu`, `livello`,
  `percorso`, `mettiIn`, `togliTutto`, `suLivello`, `iconaSotto`); le
  facce del cast (`FACCE_CAST`); `normalizzaTela` rimette fuori chi sta in
  una cartella persa o in un giro.
- `939a055` 5c/2 — icona su icona fa una cartella (faccia e nome della
  madre, bordo doppio, «N dentro»); tocco = entra; la strada riporta su e
  ci si posa un file per farlo salire. Il posto libero guarda dove stanno
  le cose. `davanti` solo quando si muove: il primo tocco apre davvero.
- `eec9233` 5c/3 — le tre lineette sostituiscono il cerchio della freccia:
  freccia, gruppo, colore o icona (le facce del cast), riordino sul livello
  aperto (via dagli avanzati). Con un gesto aperto il tocco non apre la
  scheda.
- 5c/4 — lo script apre le lineette e una cartella. 888 prove verdi, build
  ok. Script: `--rapido` a 390×844 **verde** (90 pagine, 881 comandi); il
  giro completo è stato fermato dal tetto di tempo della sessione dopo ~520
  pagine, **nessun difetto** fino lì. Va rifatto intero una volta.

Decisioni prese da me: §3 della spec, punti 11–15.

«Immagine della tela» fotografa il livello aperto. Le cartelle nella foto
sono ancora assenti (`fotografaTela` non le disegna).

Minori: il tasto Zack di Brain (nascosto) riordinerebbe
tutta la tela; dentro una cartella l'inquadratura si rifà a ogni ingresso
(anche se avevi zoomato a mano).

**Prossima sessione: la 5d** (i prompt e la vista libreria).

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 5d.
```

## ▶️ 2026-10-04 — 5d FATTA: i prompt e la vista libreria (fase 5 chiusa)

- `294fe07` 5d/1 — puro: `engine/prompt.js` (`testoPrompt`, `nomePrompt`,
  `promptSalvati`, `cartelleDellaTela`); un `.md` si posa su Immagine e
  Video come prompt (`immagine-prompt`, `video-prompt` in `DESTINAZIONI`).
- `1e254fc` 5d/2 — il `.md` posato riempie il prompt; nel punto oro
  «Prompt 1–4» e «Salva il prompt»; l'icona «prompts» in Brain.
- `5fdd9c0` 5d/3 — la striscia della libreria è una vista di Brain
  (`vistaLibreria`): ordine e ricerca della pool, «altri 20», filtri tutto ·
  prompts · cartelle della tela.
- 5d/4 — lo script apre l'icona «prompts». 895 prove verdi, build ok;
  script `--rapido` **verde** a 390×844 e a 1280×800 (94 pagine, 893
  comandi ciascuno). Il giro completo — anche quello della 5c — va rifatto
  una volta fuori da una sessione (non ci sta nel tetto di tempo).

Decisioni prese da me: §3 della spec, punti 16–19.

Minori: le cartelle compaiono nella striscia solo dopo che Brain è stato
aperto una volta (la tela si legge entrando in Brain); il nome del prompt
salvato passa da `safeName` e diventa «un-gabbiano-al-neon…»; le cartelle e
le moodboard della libreria vecchia restano nei dati senza una porta.

**La fase 5 è chiusa.** Prossima: la 6 (Voce) della
[scaletta](2026-09-15-scaletta.md), da tagliare in fette come la 5.

## ▶️ PROSSIMA SESSIONE — fase 6, la Voce (ElevenLabs)

Stato al 2026-10-04: `main` = tutto pubblicato fino alla 5d (`2912579`). La
fase 5 (Brain, la libreria) è chiusa.

Spec pronta: [`superpowers/specs/2026-10-04-voce-design.md`](superpowers/specs/2026-10-04-voce-design.md).
Quattro fette: **6a** leggi questo · **6b** le voci (con il consenso
registrato) · **6c** voce su voce, e dentro un video · **6d** doppiaggio e
trascrivi.

**Si comincia chiedendo le 4 domande del §3 della spec** — la prima è il
piano ElevenLabs, una spesa fissa nuova che decide il committente. Poi la
fetta **6a**. Nessuna chiamata vera a ElevenLabs senza il suo ok (costa).

Lasciato indietro dalla fase 5, da fare quando c'è tempo: lo script di
raggiungibilità **completo** (in sessione è stato fatto solo `--rapido` a
390×844 e 1280×800; il giro intero supera il tetto di tempo — va lanciato a
mano, coi due server accesi, vedi l'intestazione dello script).

Frase da incollare in una sessione nuova:

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 6a.
```

## ▶️ 2026-10-04 — 6a FATTA: leggi questo (in sviluppo, senza piano)

Le 4 domande del §3 della spec, con le risposte, sono scritte nella spec.
**Niente piano ElevenLabs per ora**: tutto è costruito e provato col fornitore
finto, ma il tasto «leggi» è spento finché non c'è la misura.

- `e013b05` 6a/1 — `src/engine/listinoVoce.js` puro (a carattere,
  `MISURA_VOCE = null`, `VOCI_PRONTE` chiuse, tetto 2500 caratteri);
  `worker/fornitori/elevenlabs.js` (testo → MP3); `worker/voce.js` con lo
  stesso giro di soldi di `genera()`. Senza chiave 503 `non-configurato`,
  senza misura 503 `non-misurato`, tutti e due **prima** dell'addebito.
- `78c2b5a` 6a/3 — «scrivi» nel `+` del Vocale; nel punto oro il gesto
  (trasforma · leggi) e le voci pronte; il pannello col testo, il contatore,
  il prezzo (o «arriva presto»); l'MP3 va all'icona output; il rimborso detto.
- 6a/4 — lo script apre il `+` del Vocale e il pannello «leggi». 914 prove
  verdi, build ok; script `--rapido` **verde** a 390×844 e 1280×800 (98
  pagine, 925 comandi ciascuno).

**Per accendere «leggi»** (quando c'è un piano): `npx wrangler secret put
ELEVENLABS_API_KEY`; una lettura vera di 1000 caratteri; il costo in millesimi
per 1000 caratteri in `MISURA_VOCE`; riconfermare gli id delle voci pronte
(`GET /v1/voices`). La prova `listinoVoce.test.js` si rompe apposta quel giorno.

Minori: a muro acceso il Vocale sta dietro il muro (`serve: 'abbonamento'`),
quindi chi ha solo crediti non arriva a «leggi» — da decidere prima di
accenderlo; nel punto oro le ricette dei filtri restano visibili anche su
«leggi»; i nomi delle voci pronte sono quelli inglesi di ElevenLabs.

**Prossima sessione: la 6b** (le voci, col consenso) — ha senso solo dopo la
scelta del piano: la clonazione non si prova col fornitore finto e basta.

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 6b.
```

## ▶️ 2026-10-05 — 6b e 6c FATTE (in sviluppo, spente fino alla misura)

Il committente pensa al **piano gratuito**. ⚠️ Secondo le fonti del
2026-10-04 il gratuito **non ha licenza commerciale e non clona**:
- la clonazione (6b) non si accende;
- nessun gesto si può rivendere a crediti.

Va bene solo per le prove in sviluppo; per accendere serve almeno lo Starter.

- `cdcae74` 6b/1 — puro:
  - `engine/voci.js`: la voce è un file `kind: 'voce'`, `CONSENSO` col testo datato;
  - listini di disegno, clonazione e cambio, tutti `null`;
  - `durataWav`.
- `76081bc` 6b/2 — Worker:
  - disegna (a crediti) e `/voce/tieni`;
  - clona: il consenso si scrive in `consensi` **prima** dell'addebito;
  - `/voce/cancella`, solo voci del conto;
  - tetto di 3 voci per conto;
  - SQL in `docs/2026-10-04-schema-voce.sql`, **da lanciare a mano**.
- `756ce97` 6b/3 — studio:
  - lo strumento «una voce nuova» (descrivila · clonala);
  - la voce diventa un file in Brain e sceglie chi legge, e le proprie compaiono nel punto oro;
  - posata sul Vocale lo sceglie;
  - svuotare il cestino la cancella presso ElevenLabs, o la trattiene.
- `87e8622` 6c — cambia voce:
  - WAV 16 kHz al Worker, che ne legge la durata e fa pagare quella;
  - se la registrazione veniva da un video, la voce ci torna dentro **nel browser** (WebM, `engine/rimonta.js`);
  - provato su un mp4 vero di 10 s: 640×360, audio nuovo a 880 Hz dentro, 10,1 s di lavoro.
- 6c/2 — lo script apre «una voce nuova» (tutte e due le schede).
  - 961 prove verdi, build ok;
  - script `--rapido` verde a 390×844 e 1280×800: 102 pagine, 954 comandi.

**Per accendere** (con un piano a pagamento):
1. Lanciare `docs/2026-10-04-schema-voce.sql`.
2. `npx wrangler secret put ELEVENLABS_API_KEY`.
3. Misurare lettura, disegno, clonazione e cambio, e scrivere le quattro `MISURA_*` in `listinoVoce.js`.
4. Riconfermare gli indirizzi dell'API e gli id delle voci pronte.

Minori e rischi:
- Le voci clonate stanno tutte nel conto ElevenLabs del committente, che ne tiene un numero limitato per piano (tetto 3 per cliente): con molti clienti finiscono gli slot.
- Il testo del consenso è solo in italiano.
- A muro acceso il Vocale resta dietro il muro.
- La croce del piano copre l'angolo del video in «cambia».
- Safari non rimonta il video: consegna la sola voce e lo dice.
- Lo speech-to-speech cambia anche musica e rumori del video.

**Prossima: la 6d** (doppiaggio e trascrivi).

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 6d.
```

## ✅ 2026-10-05 — FASE 7 (effetti sonori) FATTA: 7a, 7b, 7c

La **fase 6 resta da completare**: la 6d, più l'accensione col piano a
pagamento (vedi sopra). Il committente è passato alla 7.

Spec: [`superpowers/specs/2026-10-05-effetti-design.md`](superpowers/specs/2026-10-05-effetti-design.md).

Decisioni del committente: raccolte **CC0**, **circa 150** effetti,
«inventane uno» **costruito ora, spento**; download dei 7 zip Kenney
autorizzato.

- `7d11d86` 7a — il pacchetto:
  - **153 effetti CC0** (Kenney) in 8 famiglie;
  - MP3 mono a 96 kbps, picco a −1,5 dB misurato sull'MP3 vero (due passate, `astats`);
  - niente varianti sotto i 50 ms;
  - 1,7 MB in `public/effetti/`, `CREDITI.txt`, catalogo `src/engine/pacchetto.json`;
  - `scripts/prepara-effetti.mjs` lo rifà da `tmp/kenney/`.
- `efc90ba` 7b — il pacchetto nello studio:
  - «dal pacchetto» nel `+` degli Effetti e uno strumento;
  - famiglie, ricerca in due lingue, ascolta, prendi;
  - l'icona output porta l'effetto in Brain col suo nome;
  - corretto: `analyze` girava anche su risultati audio e video (errore in console da 6a e dalla 3).
- 7c — «inventane uno»:
  - `effetto-inventa` (ElevenLabs Sound Effects), a durata (1, 2, 5, 10 s);
  - `MISURA_EFFETTO = null`, 503 prima di addebitare;
  - la seconda scheda del pannello.
- Prove e verifiche:
  - 974 prove verdi, build ok;
  - script `--rapido` **verde** a 390×844 e 1280×800;
  - nessun errore in console sui pannelli nuovi.

Minori:
- Fruscii, vento e natura non sono nel pacchetto: li fa «costruisci».
- A muro acceso gli Effetti stanno dietro il muro (abbonamento), come il Vocale.

**Prossima: la 8** (vettoriale, i nodi) — oppure la 6d.

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fase 8.
```

## ▶️ 2026-10-05 — FASE 8 (vettoriale, i nodi): tagliata, 8a FATTA

Spec: [`superpowers/specs/2026-10-05-nodi-design.md`](superpowers/specs/2026-10-05-nodi-design.md).
Tre fette:
- **8a**, puro: il tracciato pulito e il modello dei nodi;
- **8b**, l'editor dei nodi sul desktop;
- **8c**, il telefono e la chiusura.

Il committente ha detto «inizia 8a»: le decisioni sono nel §3 della spec
(editor dei nodi nostro, non quello di svgedit; desktop prima; i composti
restano composti), da ribaltare se non vanno.

Perché i nodi erano impraticabili (misurato, §1 della spec):
- ogni tracciato con `translate`;
- il fondo come forma cliccabile;
- i lati dritti scritti come curve;
- in più, i punti di 5 px.

8a:
- `engine/nodi.js`:
  - il modello `{ x, y, dentro, fuori, liscio }`, legge `M L H V C S Q T Z`, rifiuta gli archi;
  - muovi nodo e maniglia (simmetrica sul liscio);
  - aggiungi (de Casteljau, la forma non cambia), togli, curvo↔dritto, apri↔chiudi, angolo↔liscio;
  - raddrizza, nodo e segmento vicini al tocco.
- `engine/tracciato.js`, applicato a ogni `traceToSvg`:
  - le traslazioni entrano nelle coordinate;
  - si tolgono i fondi;
  - i lati tornano dritti.
- Il vuoto nei preset a colori:
  - si dipinge con un **colore chiave** assente dal disegno, e i tracciati di quel colore si tolgono;
  - VTracer gira in modo **ritagliato** (impilato, togliere il vuoto scopriva una base che copriva tutto: 65.000 pixel su 65.000).
- **Corretto un difetto vecchio:** il «bianco e nero» usciva con `fill="none"`, cioè invisibile (0 pixel). Ora è nero.

Misure nel browser:
- marchio JAYL su fondo trasparente → poster: 1 tracciato, 45 nodi, nessun `transform`, 33.828 pixel contro i 33.239 dell'originale;
- icona opaca → identica a occhio, nodi da 192 a 176.

1000 prove verdi, build ok. Due prove rotte apposta per vedere che mordono; de Casteljau mordeva solo con `t ≠ 0,5`, aggiunto.

**Prossima: la 8b** (l'editor dei nodi sul desktop).

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 8b.
```

## ▶️ 2026-10-05 — 8b FATTA: l'editor dei nodi sul desktop

- `components/EditorNodi.jsx`: un livello nostro sopra la tela di svgedit, con la stessa `getScreenCTM`.
  - **Al dito e al mouse:** punti di 12 px con bersagli di 24; maniglie solo sul nodo scelto e sui vicini.
  - **Trascinare:** riscrive `d` dal vivo.
  - **Annulla:** il rilascio entra nella cronologia di svgedit (`changeSelectedAttribute('d')`, con il `d` vecchio rimesso prima).
  - **Tastiera e doppio clic:**
    - il doppio clic ovunque sul livello aggiunge un nodo (sul pallino di un nodo no);
    - frecce (Maiusc di 10) e Canc lavorano sul nodo, Esc esce;
    - questi tasti sono presi in cattura, altrimenti le scorciatoie dell'editor spostavano o cancellavano la forma INTERA.
- La barra (aggiungi, togli, curva/dritto, liscio, apri/chiudi, fine) e l'aiuto stanno in una **striscia sopra la tela**: sopra la tela coprivano i nodi in alto (misurato: il primo nodo del logo stava sotto «Aggiungi»).
- `SvgEditor`:
  - il modo `pathedit` apre il nostro livello, non quello di svgedit;
  - un altro tracciato cliccato lo prende, un clic nel vuoto chiude;
  - un tracciato con archi lo dice.
- **Corretto un difetto vecchio:** Cmd+Z dell'editor chiamava `canvas.undo()`, che non esiste (la cronologia è in `undoMgr`). L'annulla da tastiera del vettoriale non aveva mai funzionato. Ora annulla e rifai tengono aperti i nodi sul tracciato.
- **Provato nel browser sul marchio JAYL tracciato:**
  - trascina → `d` cambia;
  - Cmd+Z → torna identico, nodi allineati;
  - Maiusc+Cmd+Z → rifatto;
  - Maiusc+→ sposta solo quel nodo di 10;
  - Canc → un nodo in meno, la forma resta;
  - doppio clic → un nodo in più;
  - i sei bottoni della barra, Esc.

1000 prove verdi, build ok.

Minori:
- Il cerchio «annulla» del vettoriale disfa il **risultato** (il tracciamento), non i disegni: col disegno aperto svuota la tela. C'era già; da decidere se il cerchio debba chiamare l'annulla dell'editor.
- Entrando nei nodi la tela scende di ~60 px (la striscia).
- Il riquadro di selezione di svgedit non segue la forma mentre si trascinano i nodi.

**Prossima: la 8c** (il telefono e la chiusura: il minimo al dito, lo script di raggiungibilità, il tutorial).

```
Leggi docs/2026-09-18-riprendi-qui.md e fai la fetta 8c.
```

## ▶️ 2026-10-05 — 8c FATTA: il telefono e la chiusura. FASE 8 CHIUSA

- **Telefono (misurato a 375 px):**
  - tocca un punto, trascinalo, «Togli» lo toglie;
  - niente maniglie e niente «Liscio» sotto i 768 px.
- **Trovati provando e corretti:**
  - il livello dei nodi ora sta esattamente sopra la tela (`ospite`) e taglia ciò che ne esce. Prima la linea finiva sopra i cerchi accanto;
  - coi nodi aperti il riquadro di svgedit si nasconde (`.con-nodi #selectorParentGroup`). Le sue maniglie, che ridimensionano la forma intera, stavano sotto il dito, e sul desktop non seguiva il trascinamento: un minore della 8b chiuso;
  - un SVG mandato al Vettoriale dal pocket si apre nell'editor. Prima la tela restava vuota.
- **Tutorial:** cinque passi, il quarto sono i nodi (dito e tastiera).
- **Script di raggiungibilità:**
  - giro dei nodi: un SVG di prova, un clic vero via CDP (`tocca`), il cerchio dei nodi, misura della striscia;
  - giro del tutorial;
  - entrambi solo a muro spento, perché a muro acceso, senza entrare, il Vettoriale non c'è;
  - due blocchi di fila ora dicono quale pagina.
- **Misure:** `--rapido` verde a 390×844 (112 pagine, 1617 comandi) e a 1280×800 (112 pagine, 1622 comandi). 1000 prove verdi, build ok.

Minori:
- Sul telefono la tela (1200 px) si vede in parte e va scorsa col dito fuori dai punti. Lo zoom resta quello dell'editor (spec §2.4).
- Il cerchio «annulla» del vettoriale disfa il tracciamento, non i disegni: da decidere (vedi 8b).
- Entrando nei nodi la tela scende (la striscia): ~60 px sul desktop, ~150 sul telefono.

**Prossima:** la fase 6 resta da completare (6d e l'accensione col piano a pagamento), oppure la fase 9 della scaletta.
