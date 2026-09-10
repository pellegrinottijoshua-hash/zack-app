# I crediti, e la prima generazione (Fase B2)

> Deciso col committente il 2026-09-10. Segue **B1 — il conto**
> ([spec](2026-09-09-il-conto-design.md)), che è in produzione e provata.
> B3 (Seedance e ElevenLabs) avrà la sua spec e si appoggia a questa.

---

## 1. Cosa decide questo documento

Come si comprano i crediti, dove vive il saldo, come si addebita una
generazione e come tornano indietro i soldi quando fallisce. E **una
generazione vera**: le immagini con Nano Banana Pro.

La generazione sta qui e non in B3 per decisione del committente, ed è la
decisione più importante del documento: **un sistema di crediti senza niente da
comprare non si può provare**, e questo progetto ha già pagato cinque volte il
prezzo del «costruito e mai collegato» — il registro del saldo stesso
(`src/store/ledger.js`, 130 righe e 156 di test) sta lì dal 25 agosto senza che
un solo componente lo importi.

**Non** decide: Seedance, ElevenLabs, le fatture e l'IVA.

---

## 2. Il punto di partenza, misurato

**Cosa c'è già, e funziona** (verificato in produzione il 2026-09-10):

- account con link via email e Google, muro, prova di quattordici giorni;
- il Worker su `zack-app.com` con `/me`, `/checkout`, `/webhook`, la firma di
  Stripe verificata, e la tabella `conti` protetta da RLS;
- `/me` risponde già con un campo `crediti`, che vale **zero**. Esiste da
  prima apposta: aggiungerlo dopo avrebbe voluto dire cambiare una risposta a
  cui lo studio si era già abituato.

**Cosa c'è e non è collegato a niente:** `src/store/ledger.js`. Centesimi
interi (mai virgola mobile), margine al 14%, prenota → conferma o rilascia.
Scritto bene e mai importato. La § 5 dice cosa se ne salva e cosa si butta.

**Cosa la home promette già,** e che quindi non si negozia qui:

- *«Paghi la generazione. Al centesimo.»*
- *«Questo video costa 0,39 € — 0,34 € di calcolo, 0,05 € a noi.»*
- *«Il margine è dichiarato. Nessun altro lo fa.»*

---

## 3. Le cinque decisioni del committente

| | deciso |
|---|---|
| **Come si comprano** | Tre pacchetti fissi: **5 €, 10 €, 25 €.** Niente importo libero, niente ricarica automatica. |
| **Chi disdice** | **I crediti restano suoi e li può spendere.** Non scadono, non si rimborsano. |
| **Il confine di B2** | **La prima generazione entra qui** (Nano Banana Pro). Seedance ed ElevenLabs restano a B3. |
| **Quanti servizi a pagamento** | Tre, in quest'ordine: **immagini** (Nano Banana Pro), **video** (Seedance 2 / 2.5), **audio e voci** (ElevenLabs). |
| **Cosa accetta la generazione** | **Testo *e* immagini di riferimento**, non solo testo. Un generatore che fa solo testo→immagine non serve a questo prodotto. |

### 3.1 La conseguenza della seconda

Se i crediti si spendono senza abbonamento, il muro di B1 — che chiude **tutto**
lo studio — rende quella decisione irraggiungibile. La § 7 lo sposta.

### 3.2 La quinta è un requisito, non una rifinitura

*«Non posso far sì che possa creare solo un'immagine dal testo, ma anche testo
più immagini reference.»*

Nano Banana Pro accetta **fino a 14 immagini** per richiesta, e Google le
distingue già per ruolo (verificato il 2026-09-10): **6 oggetti** ad alta
fedeltà, **5 personaggi** per la coerenza del personaggio, **3 di stile**. Max
7 MB l'una; PNG, JPEG, WEBP, HEIC, HEIF.

Quei tre ruoli **sono gli «Elements»** di Higgsfield. Non c'è niente da
inventare: c'è da far scegliere un asset dalla libreria e dire se è un
personaggio, un oggetto o uno stile.

Ed è ciò che la home promette già e che oggi non fa nessuno dei sei servizi:
*«Ritagli un personaggio una volta e diventa un ingrediente: lo metti in una
moodboard, ci generi sopra, torna nella stessa moodboard.»* La libreria è
l'archivio degli Elements da prima che ne avessimo bisogno.

Il costo in più è trascurabile: l'immagine in ingresso vale ~$0,0011, cioè
**un millesimo di euro**. Le reference non cambiano il listino.

### 3.3 La conseguenza della quarta

I tre fornitori arrivano in tre momenti diversi, ma il giro è lo stesso:
preventivo, addebito, chiamata, esito. **Il listino e il giro della generazione
sono indifferenti al fornitore**, o il secondo e il terzo si attaccano a
martellate e ognuno porta il suo caso speciale.

Il banco di prova è scritto: aggiungere Seedance a B3 deve costare **una riga
di listino e un adattatore**, non una modifica al giro.

---

## 4. L'impianto

```
Browser                          Worker (zack-app.com)        Postgres
───────                          ─────────────────────        ────────
listino.js  ─┐                   /me        saldo             conti.crediti
ledger.js   ─┼─ il preventivo    /ricarica  apre Stripe        movimenti
             │                   /webhook   accredita          lavori
             └─ gli STESSI file ─┤ /genera  addebita, chiama, esita
                del Worker       └─ cron    sblocca i lavori appesi
```

**Postgres è la verità.** Il browser tiene uno specchio in sola lettura che
arriva da `/me`: chi lo riscrive dalla console mente a se stesso, perché il
Worker non lo guarda mai.

### 4.1 Le tre tabelle

Il saldo vive dove sta già: `conti.crediti` — ma **in millesimi di euro**, non
in centesimi. Le altre due tabelle sono nuove.

⚠️ **Perché millesimi.** Il margine è il 14% *del costo*, cioè il 12,3% del
prezzo. Ma arrotondato al centesimo su cifre piccole non lo è più: su un costo
di 12 centesimi il margine diventa 2, cioè il **14,3%** del prezzo invece del
12,3. Su un prodotto che si vende dicendo «il margine è dichiarato», il margine
dichiarato deve essere quello che incassi.

Al millesimo l'errore scende a 0,05 centesimi e la frase torna vera. E i due
fornitori che arrivano lo pretendono comunque: Seedance si paga **al secondo**,
ElevenLabs **al carattere**, e lì il centesimo è un'unità enorme.

La regola non cambia: **interi, mai virgola mobile.** Cambia solo quanto è
piccolo l'intero.

Il campo `crediti` esiste già e vale zero per tutti, quindi il cambio di unità
non tocca nessun saldo esistente. Da fare **prima** che il primo euro entri:
dopo, vorrebbe dire moltiplicare per mille dei soldi veri.

⚠️ **`lavori` si crea per prima**, perché `movimenti` la nomina: al contrario,
Postgres si ferma su «relation "lavori" does not exist».

```sql
-- Cosa e' stato chiesto, e quanto e' costato DAVVERO.
create table lavori (
  id            uuid primary key,
  utente        uuid not null references auth.users on delete cascade,
  servizio      text not null,             -- 'immagine-nbp'
  prezzo        integer not null,          -- millesimi addebitati al cliente
  costo_reale   integer,                   -- millesimi pagati al fornitore
  stato         text not null,             -- 'in-corso' | 'fatto' | 'fallito' | 'rimborsato'
  creato_il     timestamptz not null default now(),
  chiuso_il     timestamptz
);
alter table lavori enable row level security;

-- Lo storico. Si scrive e non si cancella: e' la prova di cosa e' successo.
create table movimenti (
  id            bigserial primary key,
  utente        uuid not null references auth.users on delete cascade,
  millesimi     integer not null,          -- positivo accredita, negativo addebita
  genere        text not null,             -- 'ricarica' | 'spesa' | 'rimborso'
  lavoro        uuid references lavori(id),
  stripe_evento text unique,               -- ⚠️ vedi § 6.2
  creato_il     timestamptz not null default now()
);
alter table movimenti enable row level security;
```

E vanno incollate **insieme, in quest'ordine, in una volta sola**: l'editor SQL
di Supabase si ferma alla prima frase che sbaglia e non esegue le successive —
è così che il 2026-09-09 l'`alter table … enable row level security` di `conti`
è rimasto indietro.

⚠️ **`enable row level security` su tutt'e due.** Senza, chiunque abbia la
chiave pubblica — che sta nel bundle, quindi tutti — si scrive un movimento da
mille euro. Il 2026-09-10 su `conti` è stato dimenticato una volta: qui sono due
tabelle, quindi due occasioni.

E la prova che la RLS è accesa **si fa con un `INSERT` anonimo, non con una
lettura**: a tabella chiusa e senza policy, `SELECT`, `UPDATE` e `DELETE`
rispondono tutte `200 []` esattamente come a tabella aperta e vuota. Solo
l'`INSERT` solleva `42501`. È la trappola pagata il 2026-09-10.

### 4.2 `costo_reale` non è un lusso

Senza quel numero, *«0,34 € di calcolo, 0,05 € a noi»* è una promessa che non
puoi provare — e una promessa che non puoi provare vale meno di zero, perché fa
mettere in dubbio anche quelle vere. È la § 3.3 di B1.

---

## 5. Il registro: cosa si salva e cosa si butta

`src/store/ledger.js` diventa `src/engine/ledger.js`, **importato dal browser e
dal Worker**, come `licenza.js`. È la § 3.1 di B1 — «il preventivo e l'addebito
leggono la stessa tabella» — resa impossibile da violare: è letteralmente la
stessa funzione.

**Si salva** ciò che è aritmetica pura e serve a tutt'e due:

| | |
|---|---|
| `MARGIN = 0.14` | il margine dichiarato |
| `priceFor(costo)` | costo del fornitore → `{ total, cost, margin }` in millesimi |
| `mils` / `toEuro` | millesimi interi, mai virgola mobile |
| `formatEuro` | il prezzo scritto prima di premere |

**Si cambia** l'arrotondamento del margine: `Math.ceil` diventa `Math.round`.
Al centesimo, `ceil` era prudenza sensata; al millesimo arrotonda per eccesso
0,1 centesimi ogni volta e gonfia di nuovo il margine dichiarato. Arrotondare
al più vicino sbaglia al massimo di 0,05 centesimi, e sbaglia in tutt'e due i
versi — che è ciò che rende vera la frase «12 centesimi per euro».

**Si butta** la macchina delle prenotazioni — `reserve`, `commit`, `release`,
`purge`, `available`, `HOLD_TTL_MS`, `topUp`, `emptyLedger`.

⚠️ **Questo cambia ciò che era stato presentato a voce**, dove avevo detto che
il registro non andava riscritto. Due ragioni, e la seconda è più importante
della prima:

1. **Su un server le prenotazioni non servono.** Ciò che impedisce a due schede
   di spendere lo stesso denaro non è un elenco di `holds` in un oggetto
   JavaScript: è un `UPDATE` atomico con la guardia (§ 6.3). Le prenotazioni
   sarebbero un secondo meccanismo sopra quello che fa già il lavoro.
2. **`commit` addebita più del preventivo.** Se il costo reale supera la stima,
   quel codice addebita comunque la differenza — e la home promette *«il prezzo
   scritto prima di premere»*. Tenerlo vorrebbe dire spedire, dentro il motore
   dei soldi, la contraddizione esatta della frase con cui il prodotto si vende.

**Il preventivo è il prezzo. Punto.** Se il fornitore costa più della stima, la
differenza è nostra: è il costo di aver promesso un numero. Si registra in
`costo_reale`, così si vede, e se capita spesso si cambia il listino — non il
conto del cliente.

Il codice buttato si **cancella**, non si lascia lì. Lasciarlo è precisamente
ciò che ha prodotto la situazione descritta al § 1.

---

## 6. Il giro

### 6.1 Il listino

Un file solo, `src/engine/listino.js`: id del servizio → costo del fornitore in
**centesimi di euro**, più il nome del fornitore e cosa produce.

```js
export const LISTINO = {
  'immagine-nbp': {
    fornitore: 'google',
    costo: 123,                 // millesimi di euro
    resa: 'png',
    etichetta: 'immagine',
    // Quanti riferimenti accetta, per ruolo. Il fornitore successivo porta i
    // suoi numeri qui dentro e non tocca niente altrove.
    riferimenti: { personaggio: 5, oggetto: 6, stile: 3, totale: 14 },
  },
};
```

**Nano Banana Pro, MISURATO il 2026-09-10** — sedici generazioni vere, non un
listino letto: [docs/2026-09-10-misura-nbp.md](../../2026-09-10-misura-nbp.md).

Il costo non è fisso: **126 millesimi** senza riferimenti, **130** con cinque,
**133** con quattordici. Un riferimento vale 258 token, cioè **mezzo
millesimo**.

```
costo(n)  = 127 + round(n × 0,5)
prezzo(n) = costo(n) + round(costo(n) × 0,14)
```

| riferimenti | prezzo | margine |
|---|---|---|
| 0 | **145** millesimi | 12,4 % |
| 5 | **148** | 12,2 % |
| 14 | **153** | 12,4 % |

⚠️ **Il prezzo deve salire coi riferimenti**, o il margine dichiarato è vero
solo per la richiesta media: a prezzo fisso sarebbe il 15,4% su una richiesta
nuda e il 10,7% su una piena, mentre la home ne dichiara 12. E il numero si sa
**prima di premere**, perché i riferimenti sono già stati scelti quando si
preme.

La base è 127 e non 126 perché i token di «pensiero» ballano di ±2: meglio
stimare un millesimo sopra che trovarsi sotto.

**Il 2K è gratis.** 2816×1536 e 1024×1024 consumano gli stessi 1120 token
d'immagine: quattro volte i pixel allo stesso prezzo, tre secondi in più. La
differenza di listino pubblicata riguarda solo il 4K, che non facciamo.
Deciso col committente: **sceglie il cliente**, due pastiglie sul punto oro.

Google risponde **JPEG**, sempre. E `thinkingLevel` **non esiste**: `400` a
ogni chiamata. `imageConfig` sì.

⚠️ **Il fornitore incassa in dollari, noi in euro.** Il listino è in millesimi
di euro fissi, quindi ogni movimento del cambio si mangia margine: al cliente
si addebitano 140 millesimi comunque, ma il costo si muove sotto. Un euro che
perde il 5% sul dollaro porta il guadagno per immagine **da 1,66 a 1,05
centesimi**: più di un terzo. Il numero va riguardato quando si aggiunge un fornitore,
e `costo_reale` serve anche a questo — dice quando il listino ha smesso di
essere vero.

Solo **1K–2K** in B2. Il 4K raddoppia il costo e si aggiunge quando c'è un
motivo, non perché il fornitore lo offre.

### 6.1-bis I riferimenti si ridimensionano a 768 px, nel browser

I 258 token per riferimento sono contati **a quella misura**. Google ne
accetta fino a 7 MB: con una foto da 12 megapixel i token salgono, e il prezzo
mostrato prima di premere diventa falso.

Ridurli risolve tre cose insieme: il prezzo resta quello annunciato, il
caricamento non si mangia i nove secondi che restano fra i 21 di Google e i 30
del limite, e il costo diventa prevedibile invece che scommesso.

### 6.2 La ricarica, e la riga che regala soldi

`POST /ricarica` con il pacchetto scelto apre uno Stripe Checkout in
`mode: 'payment'` (l'abbonamento è `mode: 'subscription'`: stesso codice, due
modi). Il `metadata` porta l'utente **e** i centesimi del pacchetto.

Al `checkout.session.completed`, il webhook accredita.

⚠️ **Stripe riprova i webhook.** Un rinvio — che capita, per un timeout o un
deploy a metà — accrediterebbe due volte. È l'equivalente della firma: una riga
che se manca non rompe niente e regala il prodotto.

La difesa è il vincolo `unique` su `movimenti.stripe_evento`: si scrive
l'`event.id` di Stripe insieme all'accredito, **nella stessa transazione**. Il
secondo tentativo viola il vincolo, non accredita niente, e risponde `200`
perché per Stripe è andata bene — l'aveva già fatta.

Il prezzo del pacchetto **non arriva dal browser**: arriva dal listino dei
pacchetti nel Worker, indicizzato dall'id. Un client che manda «pacchetto: 25 €»
pagandone 5 non deve poter esistere.

### 6.3 La generazione

`POST /genera` con `{ servizio, prompt, riferimenti }`, dove `riferimenti` è
un elenco di `{ ruolo, immagine }` — il ruolo è `personaggio`, `oggetto` o
`stile`, e l'immagine arriva come `data:` o come id di un asset caricato.

I limiti si controllano **contro il listino, non contro una costante scritta a
mano**: più riferimenti del consentito è `400`, e il numero viene da
`LISTINO[servizio].riferimenti`. Il fornitore successivo porta i suoi numeri lì
dentro e non tocca questo codice — è il banco di prova del § 3.3.

Il giro:

1. **chi sei** — come `/me`; senza token, `401`;
2. **il prezzo** — da `priceFor(LISTINO[servizio].costo)`. Un servizio che non
   è a listino è `400`, mai un prezzo inventato;
3. **l'addebito, atomico**:

   ```sql
   update conti set crediti = crediti - $prezzo
   where utente = $utente and crediti >= $prezzo
   returning crediti;
   ```

   Zero righe tornate vuol dire **saldo insufficiente**: `402`, e non è
   successo niente. Una riga vuol dire addebitato, e nessun'altra scheda può
   aver speso lo stesso denaro — è una frase sola, e Postgres non la spezza a
   metà. **È questa riga che rende impossibile lo scoperto**, non un controllo
   in JavaScript prima di chiamare;
4. **si scrive `lavori`** con `stato = 'in-corso'` e il movimento di spesa;
5. **si chiama il fornitore**;
6. **riuscito** → `stato = 'fatto'`, si registra `costo_reale`, si risponde con
   l'immagine;
7. **fallito** → **rimborso**: `crediti = crediti + prezzo`, movimento di
   `rimborso`, `stato = 'rimborsato'`. § 3.2 di B1, non negoziabile: hai
   incassato per una cosa che non è successa.

### 6.4 Gli Elements sono la libreria

Un riferimento non si carica ogni volta: **si sceglie dalla libreria**, che è
già l'archivio degli asset di chi lavora. Scegliendolo si dice che ruolo ha, e
quel ruolo si ricorda insieme all'asset.

È la promessa della home resa vera: *«Ritagli un personaggio una volta e
diventa un ingrediente.»* Fino a oggi era una frase; qui diventa il modo in cui
si generano le immagini.

⚠️ **Un riferimento esce dal computer.** È l'unica cosa in tutto il prodotto
che lo fa, ed è per forza: generare vuol dire mandare a un fornitore. Va detto
**prima** di premere, accanto al prezzo, e non in una pagina di aiuto — vedi
§ 11.

### 6.5 I lavori appesi

Se il Worker muore fra il punto 5 e il punto 6 — il fornitore ci mette troppo,
la richiesta scade — l'addebito resta e il rimborso non arriva mai. Nessuno se
ne accorge tranne il cliente.

Un **Cron Trigger di Cloudflare**, una volta all'ora: ogni `lavoro` in
`'in-corso'` da più di **trenta minuti** si rimborsa e passa a `'rimborsato'`.

Trenta minuti perché è molto più di qualunque generazione (le immagini sono
secondi, i video di B3 minuti) e molto meno della pazienza di chi ha pagato. Un
lavoro davvero lento che finisce dopo il rimborso trova il suo `lavoro` già
chiuso e **non riaddebita**: meglio regalare una generazione che addebitarne
una già rimborsata.

---

## 7. Il muro diventa per servizio

Oggi in `App.jsx`:

```js
const chiuso = muroAcceso && !puoiLavorare(statoConto);
```

Chiude **tutto** lo studio, e quindi anche la generazione — che il committente
ha deciso debba restare raggiungibile a chi ha crediti e non ha l'abbonamento.

La chiusura si sposta **nel descrittore**, che è già il posto dove ogni servizio
dichiara cosa fa. Nessun meccanismo nuovo:

```js
// src/servizi/scontorna.js e gli altri quattro
export const scontorna = { /* … */, serve: 'abbonamento' };

// src/servizi/immagine.js
export const immagine  = { /* … */, serve: 'saldo' };
```

e una funzione sola decide, con la stessa forma di `puoiLavorare`:

```js
/** Questo servizio si può usare adesso? */
export function servizioAperto(servizio, { stato, crediti, prezzoMinimo }) { … }
```

**Cosa vede chi non ha l'abbonamento ma ha crediti:** lo studio si apre, i
cinque strumenti locali sono chiusi col muro di B1, la generazione funziona, la
libreria è aperta come sempre.

**Cosa vede chi non ha né l'uno né gli altri:** il muro di B1, identico a oggi.

---

## 8. Il margine, in chiaro

A 14% su un costo di 12 centesimi il guadagno è **2 centesimi a immagine**.

Sulle commissioni di Stripe (~1,5% + 0,25 € a incasso in UE):

| pacchetto | commissione | margine su quella spesa | **netto** |
|---|---|---|---|
| 5 € | ~0,33 € | ~0,61 € | **~0,28 €** |
| 10 € | ~0,40 € | ~1,23 € | **~0,83 €** |
| 25 € | ~0,63 € | ~3,07 € | **~2,44 €** |

Il pacchetto da 5 € è **quasi in pari**. Non è un difetto di questo design: è
l'aritmetica di un margine al 14% contro una commissione fissa. Sta scritto qui
perché la home dichiara il margine, e quindi questo numero è già pubblico in
sostanza — chi sa fare le divisioni ci arriva.

Se un giorno il pacchetto da 5 € va tolto, sarà una decisione presa guardando
questa tabella, non una sorpresa.

### 8.1 Come si dice al cliente

I 12 centesimi per euro **non sono «a noi»**: vanno a Zack, cioè al progetto.
Il committente lo ha chiesto esplicitamente, e vuole che si dica in modo
simpatico invece che contabile.

Le sue parole (2026-09-10): *«every price for each generation is clear and
visible before clicking, every dollar you spend, zack invest 12 cents on its
brand»*. Due frasi, non una: **prima il prezzo, poi dove finisce.**

**Italiano**

> **Ogni generazione ti dice quanto costa prima che tu prema.**
> E di ogni euro che spendi, Zack ne rimette 12 centesimi su di sé.

**English**

> **Every generation shows you its price before you click.**
> And of every euro you spend, Zack puts 12 cents back into its own brand.

Perché funziona, e perché non è televendita: non promette niente, dice due
numeri. Il primo è una regola verificabile a ogni clic; il secondo è il
guadagno del progetto detto per intero, che è la cosa che nessun concorrente
scrive da nessuna parte.

⚠️ **Euro e non dollaro.** Il committente ha detto «dollar», ma il prodotto
prezza in euro in tutt'e due le lingue (`2,99 €` e `€2.99`) e Stripe incassa in
euro. Passare al dollaro sarebbe una decisione sulla valuta di Stripe, non sul
testo, e cambierebbe anche il § 8.

Il 12 è il 12,1% verificato al § 6.1, non una cifra tonda scelta a occhio — e il
§ 9 ha un test che fallisce il giorno che smette di essere vero. **Se il listino
cambia e il numero non torna, si cambia la frase**, non si lascia lì.

⚠️ La prima riga è una **promessa operativa**, non uno slogan: obbliga
l'interfaccia a mostrare il preventivo prima del tasto, in ogni servizio, per
sempre. Vale per Seedance e ElevenLabs quanto per le immagini.

---

## 9. Cosa si misura, e come si verifica

**In Node** (dove i test vedono le parti pure e il Worker intero, come in B1):

- il prezzo che il browser **mostra** e quello che il Worker **addebita**
  vengono dalla stessa funzione: un test li confronta per ogni voce di listino.
  Il giorno che divergono, hai mentito a un cliente che ti aveva creduto sulla
  parola;
- **saldo insufficiente non genera**: `402`, nessun movimento, nessun `lavoro`;
- **una generazione fallita non costa niente**: saldo prima = saldo dopo, e c'è
  un movimento di rimborso che lo dice;
- **lo stesso evento Stripe non accredita due volte**: il secondo tentativo non
  cambia il saldo e risponde `200`;
- **il prezzo del pacchetto non arriva dal client**: una richiesta che lo
  dichiara viene ignorata;
- **un lavoro appeso da più di trenta minuti si rimborsa**, e un lavoro che
  finisce dopo il rimborso non riaddebita;
- **niente virgola mobile**: il saldo è sempre un intero;
- **il margine dichiarato è quello incassato**: per ogni voce di listino,
  `margin / total` sta fra l'11,5% e il 12,8%. È il test che difende la frase
  sulla home, e che al centesimo sarebbe fallito (14,3%);
- **i riferimenti si contano contro il listino**: quindici immagini danno
  `400`, sei personaggi danno `400`, e il messaggio dice quale limite;
- **un servizio senza `riferimenti` a listino non ne accetta nessuno**, invece
  di mandarli a un fornitore che non sa cosa farsene.

**Contro Postgres** (perché l'atomicità non si prova in JavaScript):

- due `/genera` in parallelo con saldo per **una sola** generazione: una passa,
  l'altra riceve `402`, e il saldo finisce a zero — mai sotto.

**Nel browser:**

- il preventivo compare **prima** di premere, e combacia col centesimo con
  quello che si vede scalare;
- senza abbonamento e con crediti: la generazione si usa, i cinque strumenti
  locali no, la libreria si scarica;
- il giro intero in modalità di prova di Stripe: compro 5 €, genero, il saldo
  scende di 14 centesimi.

### 9.1 Il tempo di risposta, e cosa non ho potuto misurare

`/genera` è **una richiesta sola** — chiedi, aspetti, ricevi — e regge finché
il fornitore risponde in meno di trenta secondi. Oltre, servirebbe un giro in
due tempi (chiedi, poi ritira), che è un'altra forma.

**Quel che si sa** (fonti pubbliche, 2026-09-10): Nano Banana Pro sta fra i **5
e i 20 secondi**; i 15–20 sono il 4K, che non facciamo; a 2K con
`thinking_level: low` scende sotto gli 8. Il modello ha un passo di
«ragionamento» che su richieste semplici aggiunge attesa senza aggiungere
niente.

✅ **Misurato il 2026-09-10**, con cinque riferimenti veri:
[docs/2026-09-10-misura-nbp.md](../../2026-09-10-misura-nbp.md).

| | mediana | peggiore |
|---|---|---|
| 1K | **18,1 s** | 18,2 s |
| 2K | **21,2 s** | 26,9 s |

Sotto i trenta: **`/genera` resta una richiesta sola** e questo paragrafo
regge.

⚠️ **Ma con nove secondi di margine, non con venti.** Dentro quei nove ci
devono stare il caricamento dei riferimenti dal browser al Worker e dal Worker
a Google — che è il secondo motivo del § 6.1-bis.

E una conseguenza che il disegno non aveva previsto: **diciotto secondi davanti
a un tasto sono tantissimi**. Non è un problema tecnico, è che senza niente che
si muova l'utente preme una seconda volta — e la seconda volta si addebita di
nuovo. L'attesa va mostrata, e va detto **quanto** dura.

---

## 10. Cosa questo documento NON fa

- **Non fa Seedance né ElevenLabs.** È B3, e la § 3.2 dice cosa deve costare
  aggiungerli.
- **Non fa il 4K**, né i formati oltre 1K–2K.
- **Non fa importo libero né ricarica automatica.** Deciso: tre pacchetti.
- **Non fa scadenza dei crediti né rimborsi alla disdetta.** Deciso: restano e
  si spendono.
- **Non fa fatture né IVA.** Va guardato prima di incassare da clienti europei,
  ed è una questione da commercialista, non da codice. Resta aperta anche la
  domanda se `jayl.store` e Zack App fatturino come lo stesso soggetto.
- **Non accende il muro.** `VITE_MURO` resta spento finché non sono risolte le
  due condizioni di B1: il mittente delle email e il percorso del primo
  ingresso.

---

## 11. Tre conseguenze da non dimenticare

⚠️ **La frase sui file ridiventa falsa, e stavolta a metà.**

Il 2026-09-09 *«non c'è un server che li guarda, perché non c'è un server»* è
diventata *«i tuoi file non escono da questo computer: il server sa soltanto
chi sei e quanto ti resta»*. Con i riferimenti, **un file esce**: lo mandi a
Google.

Resta vera per tutto il resto — i sei strumenti locali non mandano niente da
nessuna parte — quindi la frase va **spaccata in due**, non cancellata:

> Gli strumenti girano nel tuo browser e i tuoi file non escono da qui.
> Quando *generi*, l'immagine che dai come riferimento va al fornitore: non si
> può generare senza mandare niente, e preferiamo dirtelo che scoprirtelo.

Riscriverla fa parte di B2, non è un lavoro dopo. È la seconda volta in due
giorni che una frase della home invecchia per via di qualcosa che costruiamo:
**quando una promessa e il codice divergono, si cambia la promessa prima di
spedire il codice.**

**La home dovrà dire che i crediti non scadono.** Oggi non lo dice, e chi compra
25 € ha diritto di saperlo prima. È una riga, e va scritta con la stessa onestà
del resto — è un vantaggio, non una postilla.

**Il primo ingresso di un cliente resta non provato.** B1 è in produzione ma
l'unico ingresso riuscito è stato un *magic link* a un indirizzo già esistente;
il *«Confirm your email address»* che riceve chi arriva la prima volta non ha
lasciato la sessione. Sospetto principale: i link di verifica di Supabase sono
usa e getta, e gli scanner della posta li aprono prima del destinatario.

Non blocca B2 — il muro è spento e la generazione si raggiunge — ma **blocca
l'accensione del muro**, e quindi il momento in cui questo prodotto incassa
qualcosa.
