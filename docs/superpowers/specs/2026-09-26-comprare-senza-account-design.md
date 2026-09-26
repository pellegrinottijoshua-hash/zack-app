# Comprare senza account — fetta 2b

> Spec + piano, 2026-09-26. Punto di partenza: `docs/2026-09-18-riprendi-qui.md`
> (fetta 2b) e la scaletta, fase 2. **Tocca i soldi**: prima di fondere,
> `/code-review ultra` la lancia il committente.

## 1. Cosa vuole la fetta

Oggi l'unica porta verso i soldi è l'ingresso via email, ed è rotto. Si aggira:
**si paga e si genera senza ricevere nessuna email.** Quattro pezzi:

1. il **gettone minimo da 1 €**;
2. il **pagamento da ospite**, senza email;
3. il **prezzo accanto al tasto prima di premere**, anche a muro acceso e
   saldo zero (è il cancello duro dello script di 2a, oggi rosso);
4. il **credito che sopravvive nel browser**, con l'avviso onesto che vive lì.

## 2. ⛔ Prima del codice: il gettone da 1 € perde soldi (misurato)

Lezione B2 n.3: il costo si misura prima di scrivere il prezzo. Misurato oggi
con `prezzoDi('immagine-nbp')`:

| | millesimi |
|---|---|
| prezzo di un'immagine | **146** |
| costo al fornitore | 128 |
| margine | 18 (≈ 12% del prezzo) |

Con 1 € di credito tutto speso, al fornitore vanno 1000 × 128/146 ≈ **877**.
La commissione Stripe per una carta europea standard è **1,5% + 0,25 €**
(⚠️ da verificare sul contratto: non ho aperto il pannello Stripe e non lo
farò), cioè **265** su 1 €.

**Un gettone da 1 € perde circa 14 centesimi**, senza contare l'IVA.
Il pareggio arriva a circa **2,31 €** (0,108·X = 0,25). Il pacchetto da 5 €
di oggi guadagna circa 29 centesimi.

### 2.1 ⛔ L'IVA può rendere in perdita ogni generazione, non solo il gettone

Se i prezzi mostrati sono IVA inclusa e l'IVA al 22% si applica alla vendita
del credito, per ogni euro ne restano 0,82. Il fornitore però ne prende 0,877.
Il margine del listino (14% del costo) **è più piccolo dell'IVA**. In quel
caso ogni immagine venduta perde soldi, a qualunque taglio. Serve la risposta
del commercialista **prima** di pubblicare qualunque prezzo nuovo. Il listino
è già in produzione con questi numeri.

### 2.2 Le strade per il gettone (decide il committente)

- **A. 1 € dà meno di 1 € di credito**: «1 € → 5 immagini» (730 millesimi).
  Onesto, perché lo si dice prima, e in pari. Consigliata.
- **B. Il minimo sale a 3 €**: niente perdita, ma non è più «1 €».
- **C. Si accetta la perdita** come costo per acquisire il cliente, con un
  tetto (un gettone per browser).

Finché non si decide, il piano usa **A** dietro una sola costante
(`PACCHETTI.p1`), che si cambia in una riga.

## 3. Il disegno

### 3.1 L'ospite è un utente anonimo di Supabase

`supabase.auth.signInAnonymously()` crea un utente vero, con un id e un token,
senza email. **Il Worker non cambia modo di riconoscere chi chiede:**
`chiEsegue` interroga `/auth/v1/user`, che risponde anche per gli anonimi
(`email` vuota, `is_anonymous: true`). Webhook, `accredita`, `/genera` e il
rimborso restano come sono: lavorano sull'id, non sull'email.

L'utente anonimo nasce **al primo clic su un pacchetto**, mai all'apertura:
chi non paga non crea righe.

Cosa cambia nel Worker:
- `/ricarica`: `customer_email` si manda **solo se c'è**. Stripe raccoglie da
  sé l'email per la ricevuta, e **non** la usiamo per riconoscere nessuno.
- `contoOCrealo`: un ospite **non riceve i 14 giorni di prova** (`prova_fino`
  nullo). Altrimenti basta svuotare il browser per avere una prova nuova
  all'infinito. La prova resta di chi entra con email o Google.

### 3.2 Il muro non si alza sui servizi a saldo

Oggi, a muro acceso e saldo zero, Immagine monta `<Muro>` con «Entra per usare
lo studio». Il cancello duro vuole il contrario: **si vede lo strumento, col
prezzo**, e il tasto dice cosa manca. Il pezzo esiste già: `Preventivo` ha
`preventivo-manca` («Non hai abbastanza credito.»), che apre la ricarica.

Regola nuova, in un posto solo (`App.jsx`, dove si calcola `chiuso`): **un
servizio con `serve === 'saldo'` non è mai murato**. Il saldo lo giudica il
preventivo nello strumento, e il Worker resta il giudice ultimo. Se ne va anche
`chiusoPerSaldo`, che esisteva solo per rattoppare il muro sbagliato.
I servizi locali (`serve` ≠ `'saldo'`) restano murati come oggi.

### 3.3 La ricarica da ospite

`Ricarica` oggi chiama `vaiAllaRicarica(id)`, che senza sessione fallisce. Ora:
se non c'è sessione → `entraComeOspite()` → poi `vaiAllaRicarica(id)`.
Il gettone da 1 € si aggiunge a `PACCHETTI` come primo pacchetto, con il numero
di immagini scritto sul tasto («1 € · 5 immagini»): con la strada A, «1 €»
da solo sarebbe una mezza verità.

### 3.4 L'avviso onesto

Un ospite col saldo sopra zero vede, vicino al saldo, una riga fissa:
**«Il tuo credito vive in questo browser. Se ne cancelli i dati, lo perdi.»**
Non si chiude per sempre: è un fatto, non una notifica. Collegare un'email
all'ospite (`updateUser({ email })`) passa dall'email, che è rotta: **non sta
in 2b**, va nei minori.

### 3.5 Cosa NON fa questa fetta

- Non ripara l'ingresso via email.
- Non tocca l'abbonamento né `/checkout`.
- Non accende `VITE_MURO` in produzione. Si accende dopo, a cancello verde e
  a IVA chiarita.

## 4. Cosa deve fare il committente (io non posso)

1. **Supabase → Authentication → Sign In / Providers → «Allow anonymous
   sign-ins»: acceso.** Senza, `signInAnonymously` risponde errore.
2. Consigliato: il **captcha** (Turnstile) sugli ingressi anonimi, e un'occhiata
   al limite di Supabase sugli anonimi per IP. Un utente anonimo non costa
   niente finché non paga, ma una riga di `conti` nasce solo a `/ricarica`.
3. Decidere la **strada del gettone** (§2.2) e chiedere l'**IVA** (§2.1).
4. Lanciare **`/code-review ultra`** prima di fondere.

## 5. Il piano — 4 compiti, un commit ciascuno

Ogni prova parte da uno stato dichiarato: saldo zero, nessuna sessione,
nessuna licenza (lezione B2 n.2).

1. **Il muro non si alza sui servizi a saldo** (§3.2). Si toglie la condizione
   in `App.jsx` e si toglie `chiusoPerSaldo`; si aggiorna la prova pura di
   `servizioAperto`/`pelle`. Verifica: lo script di 2a con
   `"cancello": ""` in `raggiungibilita-noti.json` → **cancello verde**.
2. **L'ospite nel Worker** (§3.1): `customer_email` solo se c'è; niente prova
   agli anonimi (`is_anonymous` da `/auth/v1/user`). Prove pure sul corpo
   mandato a Stripe (con email / senza email) e sulla riga di `conti`.
3. **Il gettone e la ricarica da ospite** (§3.3): `PACCHETTI.p1`,
   `entraComeOspite()` in `src/lib/conto.js`, `Ricarica` che la chiama se
   manca la sessione. Prova: il pacchetto p1 passa per `ricaricaDa` (tetto,
   interi) come gli altri.
4. **L'avviso onesto** (§3.4) + testi it/en. Lo script di 2a gira su tutta la
   matrice: nessun difetto nuovo.

Dopo il 4: `npm test`, `npm run build`, script di 2a verde → il committente
lancia `ultra` → si fonde e si pubblica.
