# Il conto — account, abbonamento e il muro (Fase B1)

> Deciso col committente il 2026-09-09. È la prima delle tre parti della Fase B.
> B2 (i crediti) e B3 (le tre generazioni) avranno la loro spec.

---

## 1. Cosa decide questo documento

Chi è l'utente, se ha pagato, e cosa vede se non ha pagato.

**Non** decide come si comprano i crediti (B2) né come si generano immagini,
video e voci (B3). Quelle due si appoggiano a questa, e senza questa non hanno
a chi vendere.

---

## 2. Il punto di partenza, misurato

**La home vende già il modello,** con numeri veri (`src/landing/copy.js`):

- *«Zack App — **3,99 €/mese** — strumenti illimitati, generazione a consumo»*;
- *«Questo video costa 0,39 € — **0,34 € di calcolo, 0,05 € a noi**. Il margine
  è dichiarato. Nessun altro lo fa.»*
- *«Non c'è un server che li guarda, **perché non c'è un server**.»*

Quei 0,34 € combaciano con Seedance 2.0 ($0,067–0,10 al secondo, verificato il
2026-09-09): la home è stata scritta coi prezzi giusti.

**E oggi non paga nessuno.** Lo studio è aperto, l'abbonamento non esiste, e i
due servizi a pagamento sono `ready: false` in `services.js`. In produzione non
c'è nessun server: `wrangler.jsonc` dice *«è un sito di soli file statici»*, e
il Fastify in `server/index.js` gira solo sul computer di chi sviluppa.

**Cosa resta gratis, per decisione del committente:** *«unico strumento gratis
è bg remover nella home»*. Lo scontorno della home non cambia — niente account,
niente server. Tutto lo studio va dietro l'abbonamento.

---

## 3. Le cinque decisioni che valgono per tutta la Fase B

Stanno qui perché B2 e B3 le ereditano.

### 3.1 Il preventivo e l'addebito leggono la stessa tabella

La home promette il prezzo scritto **prima** di premere. Se il preventivo e il
conto vengono da due posti diversi, prima o poi divergono — e il giorno che
divergono hai mentito a un cliente che ti aveva creduto sulla parola.

Un posto solo, e un test che li confronta.

### 3.2 Se la generazione fallisce, i crediti tornano

Non è negoziabile: hai incassato per una cosa che non è successa. Ogni lavoro
**riserva**, poi conferma o rimborsa. (Il meccanismo è B2; la regola sta qui
perché è una promessa, non un dettaglio.)

### 3.3 Il costo vero si registra

Ogni lavoro salva quanto ha addebitato **davvero** il fornitore. Senza quel
numero, *«0,34 € di calcolo, 0,05 € a noi»* è una promessa che non puoi provare
— e una promessa che non puoi provare è peggio di una che non hai fatto.

### 3.4 Il muro non si chiude quando il server ha il raffreddore

⚠️ **È la decisione più importante del documento.**

Gli strumenti girano sul computer del cliente. Se lo studio interroga il server
a ogni apertura, il giorno che l'API è giù **chi ha pagato resta chiuso fuori
dai propri strumenti locali**, che per questo prodotto è il guasto peggiore
possibile: paghi per una cosa che gira da te, e non parte per colpa di un
server che non dovrebbe nemmeno servirti.

Quindi lo stato dell'abbonamento **si tiene in locale** e vale da solo per un
periodo di grazia. Offline si lavora.

### 3.5 La libreria non si tiene mai in ostaggio

Chi usa lo studio oggi ha file suoi sul proprio disco. Quando arriva il muro,
**la libreria si apre e «scarica tutto» funziona anche senza abbonamento.**

Si chiudono gli strumenti. Mai la roba di chi l'ha fatta. Un prodotto che tiene
i tuoi file dietro un pagamento non è un prodotto, è un ricatto — e questo
progetto ha scritto *«sul tuo computer. Punto.»* sulla propria home.

---

## 4. L'impianto

```
Browser (zack-app.com)              Worker (api.zack-app.com)
─────────────────────               ─────────────────────────
lo studio, tutto locale             /me         chi sei, abbonamento, crediti
la libreria sul tuo disco           /checkout   apre Stripe
il token di sessione                /webhook    Stripe → aggiorna
la licenza in cache                      │
                                         └── Supabase: utenti, abbonamenti
```

**Cloudflare Worker**, perché il progetto è già lì: stesso deploy, stessa
bolletta, nessun fornitore nuovo per l'infrastruttura. `wrangler.jsonc` oggi non
ha `main` — il Worker di soli asset diventa un Worker con codice, e questa è
l'unica modifica alla pubblicazione.

**Supabase** per account e archivio: dà l'autenticazione **e** il database,
quindi è un fornitore solo invece di due.

### 4.1 Cosa il server NON sa

Vincolo, non preferenza. Il server conosce:

- chi sei (email);
- se l'abbonamento è attivo, e fino a quando;
- quanti crediti ti restano, e i movimenti — il campo esiste da subito in
  `/me` e vale **zero** finché B2 non lo riempie: aggiungerlo dopo vorrebbe dire
  cambiare la risposta a cui lo studio si è già abituato;
- cosa hai chiesto di generare, e quanto è costato (B3).

Il server **non** vede: i tuoi file, la tua libreria, le tue tele di Brain, le
tue registrazioni. Quelli non escono dal browser, come adesso.

---

## 5. Come si entra

**Link magico via email, più Google.** Niente password.

Una password è una cosa da custodire, da reimpostare, da limitare nei tentativi
e da non farsi rubare. Non averla toglie tutto quel lavoro e tutta quella
superficie: la scelta migliore è quella che non c'è.

Google c'è per chi non ha voglia di aprire la posta.

---

## 6. L'abbonamento

**Stripe Checkout**, 3,99 €/mese. Il prezzo è già pubblicato: non si inventa qui.

Il flusso: `/checkout` apre Stripe → l'utente paga da Stripe → Stripe manda un
**webhook** → il Worker aggiorna `abbonamento_stato` e `valido_fino`.

⚠️ **La firma del webhook si verifica sempre.** Un webhook non verificato è un
abbonamento gratis per chiunque sappia fare una POST. È la riga di codice che,
se manca, non rompe niente e regala il prodotto.

Stripe resta la fonte di verità sui pagamenti: il nostro archivio ne tiene una
copia per poter rispondere a `/me` senza chiamare Stripe a ogni apertura.

---

## 7. Il muro

### 7.1 Come funziona

1. Lo studio, all'apertura, chiede `/me`.
2. La risposta si salva in locale, con **due date**.
3. Se il server non risponde, vale l'ultima risposta salvata.

⚠️ **Le due date sono due, e confonderle è il bug che questo paragrafo
esiste per impedire:**

| | cosa dice | chi la decide |
|---|---|---|
| `valido_fino` | fino a quando è pagato l'abbonamento | Stripe |
| `chiesto_il` | quando il server ha risposto l'ultima volta | il browser |

**Il muro si apre solo se valgono tutt'e due**: l'abbonamento non è scaduto
(`adesso < valido_fino`) **e** l'ultima risposta non è più vecchia della grazia
(`adesso − chiesto_il < 7 giorni`).

Guardare una sola data sbaglia in tutt'e due i versi: solo `valido_fino` tiene
aperto per un mese intero a chi ha disdetto e non è più tornato online; solo
`chiesto_il` tiene aperto a chi non ha mai pagato, purché stacchi la rete.

### 7.2 Il periodo di grazia: **7 giorni**

Scelto, non indovinato, e la ragione va scritta perché il numero si cambierà:

- copre un guasto del server, un viaggio, una settimana senza rete;
- non si può abusare in modo utile: per allungarlo dovresti restare **offline**,
  e uno studio offline non genera niente (le generazioni sono l'unica cosa che
  costa denaro a chi lo offre);
- è più corto del mese pagato, quindi non regala mai un ciclo intero.

### 7.3 Cosa resta aperto senza abbonamento

| | |
|---|---|
| **La libreria** | si apre, si guarda, si scarica — § 3.5 |
| **Scarica tutto** | funziona |
| **Lo scontorno della home** | non cambia: niente account, niente server |
| **I cinque servizi** | chiusi |

### 7.4 Chi c'è già

Chi usa lo studio oggi lo usa gratis, e non gliel'ha promesso nessuno per
sempre — ma nemmeno gli è stato detto che finiva. **Quattordici giorni** dal
primo avvio dopo l'accensione del muro, detti chiaramente, con la libreria
intatta.

Non è generosità: è che chiudere una porta in faccia a chi era entrato quando
era aperta è il modo più veloce di non rivederlo.

---

## 8. Cosa si misura, e come si verifica

**In Node** (le parti pure, dove i test le vedono):

- il muro apre e chiude nei casi giusti, **con tutt'e due le date** (§ 7.1):
  abbonamento valido e risposta fresca; valido e risposta di 8 giorni fa;
  scaduto e risposta fresca; scaduto e risposta vecchia; nessuna licenza. La
  tabella dei casi va scritta per intera, perché è la parte che decide chi
  lavora e chi no;
- la libreria **non** è mai chiusa, per nessuno stato della licenza. È il test
  che difende § 3.5, e va scritto per primo;
- la firma del webhook: una firma sbagliata non concede niente.

**Nel browser:**

- senza abbonamento, i cinque servizi sono chiusi e la libreria si scarica;
- staccata la rete, uno studio pagato continua a lavorare;
- il giro completo: entra, paga in Stripe di prova, torna, lo studio si apre.

**Da misurare prima di scrivere:** quanto ci mette `/me` da un browser italiano.
Se supera i 200 ms va chiamato **dopo** aver disegnato lo studio, non prima —
un muro che rallenta l'apertura si fa odiare anche da chi ha pagato.

---

## 9. Cosa questo documento NON fa

- **Non compra i crediti.** È B2.
- **Non genera niente.** È B3.
- **Non tocca la libreria locale**, che resta su IndexedDB/OPFS.
- **Non fa fatture né gestisce l'IVA.** Va guardato prima di incassare da
  clienti europei, ed è una questione da commercialista, non da codice.
- **Non fa piani squadra, sconti, codici promozionali.** Uno solo, 3,99 €.

---

## 10. Una conseguenza da non dimenticare

Il giorno che B1 va in produzione, questa frase sulla home diventa **falsa alla
lettera**:

> «Non c'è un server che li guarda, perché non c'è un server.»

Va riscritta con la stessa onestà con cui è scritta ora — qualcosa come *«i tuoi
file non escono dal tuo computer: il server sa solo chi sei e quanto ti resta»*,
che è vero e regge lo stesso confronto con Canva e Adobe.

**Riscriverla fa parte di B1, non è un lavoro dopo.** Una promessa smentita dal
prodotto vale meno di zero: la trova un cliente, non noi.
