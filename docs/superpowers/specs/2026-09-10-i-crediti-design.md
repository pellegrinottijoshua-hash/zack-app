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

## 3. Le quattro decisioni del committente

| | deciso |
|---|---|
| **Come si comprano** | Tre pacchetti fissi: **5 €, 10 €, 25 €.** Niente importo libero, niente ricarica automatica. |
| **Chi disdice** | **I crediti restano suoi e li può spendere.** Non scadono, non si rimborsano. |
| **Il confine di B2** | **La prima generazione entra qui** (Nano Banana Pro). Seedance ed ElevenLabs restano a B3. |
| **Quanti servizi a pagamento** | Tre, in quest'ordine: **immagini** (Nano Banana Pro), **video** (Seedance 2 / 2.5), **audio e voci** (ElevenLabs). |

### 3.1 La conseguenza della seconda decisione

Se i crediti si spendono senza abbonamento, il muro di B1 — che chiude **tutto**
lo studio — rende quella decisione irraggiungibile. La § 7 lo sposta.

### 3.2 La conseguenza della quarta

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

Il saldo vive dove sta già: `conti.crediti`, in centesimi interi. Le altre due
tabelle sono nuove.

⚠️ **`lavori` si crea per prima**, perché `movimenti` la nomina: al contrario,
Postgres si ferma su «relation "lavori" does not exist».

```sql
-- Cosa e' stato chiesto, e quanto e' costato DAVVERO.
create table lavori (
  id            uuid primary key,
  utente        uuid not null references auth.users on delete cascade,
  servizio      text not null,             -- 'immagine-nbp'
  prezzo        integer not null,          -- centesimi addebitati al cliente
  costo_reale   integer,                   -- centesimi pagati al fornitore
  stato         text not null,             -- 'in-corso' | 'fatto' | 'fallito' | 'rimborsato'
  creato_il     timestamptz not null default now(),
  chiuso_il     timestamptz
);
alter table lavori enable row level security;

-- Lo storico. Si scrive e non si cancella: e' la prova di cosa e' successo.
create table movimenti (
  id            bigserial primary key,
  utente        uuid not null references auth.users on delete cascade,
  centesimi     integer not null,          -- positivo accredita, negativo addebita
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
| `priceFor(costo)` | costo del fornitore → `{ total, cost, margin }` in centesimi |
| `cents` / `toEuro` | centesimi interi, mai virgola mobile |
| `formatEuro` | il prezzo scritto prima di premere |

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
  'immagine-nbp': { fornitore: 'google', costo: 12, resa: 'png', etichetta: 'immagine' },
};
```

**Nano Banana Pro (Gemini 3 Pro Image), verificato il 2026-09-10:** $0,134 a
immagine a 1K–2K sull'API ufficiale, $0,24 a 4K. A 0,92 €/$ fanno **12
centesimi**; col margine, **14 centesimi al cliente**.

⚠️ **Il fornitore incassa in dollari, noi in euro.** Il listino è in centesimi
di euro fissi, quindi ogni movimento del cambio si mangia margine: a 14% su 12
centesimi, un euro che perde il 5% sul dollaro si porta via **più di un terzo**
del guadagno per immagine (da 1,67 a 1,06 centesimi). Il numero va riguardato quando si aggiunge un fornitore,
e `costo_reale` serve anche a questo — dice quando il listino ha smesso di
essere vero.

Solo **1K–2K** in B2. Il 4K raddoppia il costo e si aggiunge quando c'è un
motivo, non perché il fornitore lo offre.

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

`POST /genera` con `{ servizio, richiesta }`:

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

### 6.4 I lavori appesi

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
- **niente virgola mobile**: il saldo è sempre un intero.

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

**Da misurare prima di scrivere:** quanto ci mette Nano Banana Pro a rispondere.
Se supera i trenta secondi, `/genera` non può essere una richiesta sola e serve
un giro in due tempi (chiedi, poi ritira) — che cambierebbe il § 6.3 e va saputo
prima, non a metà.

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

## 11. Due conseguenze da non dimenticare

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
