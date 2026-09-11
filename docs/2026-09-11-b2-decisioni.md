# B2 — le decisioni prese durante l'esecuzione

> Il piano di B2 è stato eseguito da agenti, uno per task, con una revisione fra
> uno e l'altro. Trentanove volte il piano diceva una cosa e la cosa era
> sbagliata: qui c'è ognuna, col perché e con **cosa costa se ho deciso male**.
>
> Non è un diario di lavoro. È l'elenco di ciò che ho deciso **al posto tuo**,
> perché tu possa disfare quello che non ti torna.
>
> Ramo: `fase-b2-crediti`, 15 commit da `e3dcda8` a `21d2534`. 637 test verdi.

---

## Le sei che riguardano il denaro

Queste sei, se le avessi lasciate stare, avrebbero perso o regalato soldi veri.

### 1. Chiunque avesse la chiave pubblica poteva regalarsi crediti

Il piano creava `addebita` e `accredita` come `security definer` nello schema
`public`, con un commento che diceva «le chiama solo il Worker». **Niente lo
imponeva.** PostgREST espone ogni funzione di `public` come `/rest/v1/rpc/<nome>`,
Postgres concede `EXECUTE` a `PUBLIC` per default, e la chiave pubblicabile sta
nel bundle del browser: ce l'hanno tutti. Una `POST` a `/rest/v1/rpc/accredita`
con `p_millesimi: 999999`, e `security definer` scavalca anche la RLS.

**Deciso:** il file revoca `execute` da `public, anon, authenticated` e lo concede
solo a `service_role`, dopo ogni `create function`.

*Se ho sbagliato:* il Worker perde il permesso e `/genera` risponde errore.
Rumoroso, visibile alla prima prova.

### 2. `accredita` poteva incassare senza accreditare, e senza ritorno

Trovata solo dalla revisione finale, perché nessuna revisione per-task poteva
vederla. L'`insert` in `movimenti` stava **prima** dell'`update conti`. Se
l'utente non ha una riga in `conti`, l'update non trova niente, la funzione **non
solleva**, e la transazione **commette**: il movimento è scritto, il vincolo
`unique` ha **consumato l'id dell'evento Stripe**, il saldo non si è mosso.
Stripe riceve `200` e non riprova mai più.

Il cammino esiste: `/me` è l'unico posto che crea la riga, e ha un ramo che
fallisce apposta; `vaiAllaRicarica` chiede solo `sessione()`, mai `/me`.

**Deciso:** si chiude da tutt'e due i capi — `accredita` solleva se l'update non
trova la riga (la transazione torna indietro, la chiave non è consumata, Stripe
riprova tre giorni), e `/ricarica` si assicura che la riga esista **prima** di
mandare il cliente a pagare.

*Se ho sbagliato:* una ricarica legittima fallisce e Stripe riprova. È il verso
giusto in cui sbagliare.

### 3. Lo spazzino rimborsava lo stesso lavoro ogni ora, per sempre

`sbloccaAppesi` chiamava `rimborsa` e poi `chiudiLavoro` senza guardare nessuno
dei due esiti. Se il rimborso prendeva ma `chiudiLavoro` falliva, il lavoro
restava `in-corso` e **il giro dell'ora dopo lo rimborsava di nuovo.** Perdita
illimitata, un lavoro alla volta.

**Deciso:** si riusa il vincolo che esiste già. `rimborsa` passa
`p_stripe: 'rimborso:<id-lavoro>'`: il secondo tentativo viola l'`unique` e la
transazione non muove il saldo — la stessa difesa che il webhook usa contro il
rinvio di Stripe. La colonna si chiama `stripe_evento` ma contiene una **chiave
di idempotenza**: commentata, non rinominata.

*Se ho sbagliato:* un rimborso legittimo verrebbe respinto come duplicato e il
cliente non riavrebbe i soldi. È il rischio serio di questa correzione, ed è per
questo che i test provano tutt'e due i versi.

### 4. Il Worker addebitava N riferimenti e ne mandava M

`riferimenti.map(pezzo).filter(Boolean)`: tutto ciò che il regex non riconosceva
veniva scartato **dopo** l'addebito. Misurato: 5 riferimenti → **addebitati 148
millesimi, mandata 1 immagine su 5, risposta 200.**

**Deciso:** la validazione si sposta prima dell'addebito, con lo stesso criterio
che `pezzo()` usa per riconoscere un `data:`. Storto = 400 senza addebitare.

### 5. Una generazione riuscita poteva farsi rimborsare

`chiudiLavoro` buttava via `res.ok`. Se la PATCH `stato: 'fatto'` non prendeva, si
rispondeva 200 col JPEG e il lavoro restava `in-corso`: **un'ora dopo lo spazzino
lo rimborsava.** Il cliente teneva l'immagine e riprendeva i soldi, e Google era
già stato pagato da noi.

**Deciso:** `chiudiLavoro` torna il suo esito, e la chiusura riprova.

### 6. Un rimborso fallito era denaro del cliente perso in silenzio

Nel `catch` di `/genera` si chiamava `rimborsa` senza guardarne l'esito, poi si
marcava il lavoro `'rimborsato'` e si rispondeva «saldo ripristinato». Se la
chiamata falliva, il cliente **leggeva** che i soldi erano tornati, il lavoro
risultava chiuso, e **lo spazzino non lo raccoglieva più**.

**Deciso:** si guarda l'esito. Se non prende, il lavoro resta `in-corso` — così lo
spazzino ci riprova, che è il mestiere per cui esiste — e la risposta non
dichiara un saldo che non è stato ripristinato.

---

## La peggiore, che non riguardava il denaro ma il darcelo

### 7. A saldo zero non esisteva un modo di pagarci

Il tasto del saldo stava dentro `{crediti > 0 && ...}`, ed era **l'unico ingresso
al pannello della ricarica in tutta l'applicazione**. A crediti zero — cioè **ogni
cliente nuovo**, il momento d'acquisto per cui la fase esiste — il tasto non
c'era, e non c'era alternativa: la nota «saldo corto» era testo fermo, il saldo in
barra un `<b>`.

**Il motivo per cui nessuno l'aveva vista conta più del difetto:** tutte le
verifiche a schermo erano partite da una licenza con cinquemila millesimi già in
`localStorage`, avanzata da una sessione precedente. **Il cammino a saldo vuoto —
l'unico che ogni cliente percorre — non era mai stato provato.**

*Una prova che parte da uno stato comodo non è una prova.*

**Deciso:** il tasto si mostra sempre («0,00 €» è onesto, ed è la porta), e la nota
del preventivo diventa un'azione.

### 8. Il muro diceva la cosa sbagliata a chi paga già

Da quando ogni servizio può chiudersi sul proprio saldo, un abbonato senza crediti
faceva scattare il muro; ma `Muro.jsx` non ha una frase per `aperto`/`prova` e
ricadeva su «mai-entrato»: **«Entra per usare lo studio»**, con un tasto che apre
un **secondo abbonamento Stripe** a chi ne ha già uno.

**Deciso:** chi mostra il muro deve sapere **perché** è chiuso. Se il descrittore
chiede il saldo e l'abbonamento è a posto, si mostra la ricarica.

### 9. Il pannello del pagamento stava dietro il muro

Col muro alzato, cliccare il saldo non apriva niente. **Il muro esiste per
vendere:** chi lo vede è esattamente la persona a cui serve un modo di pagare.

**Deciso:** la ricarica si disegna comunque, come la libreria che non si chiude
mai.

---

## Le quattro sui numeri pubblicati

### 10. Il listino stava sotto il costo vero

Il piano stimava 127 millesimi di base. Ma `costoVero` sui token **misurati** a 5
riferimenti dà **131**, mentre la stima ne diceva 130: l'invariante «la stima non
sta mai sotto il costo misurato» era **violata di un millesimo**. E due file dello
stesso ramo dicevano due numeri diversi per la stessa chiamata misurata.

**Deciso:** la base sale a **128**. Stima 128/131/135 contro misurati 126/131/133:
mai sotto. Margini 12,33% / 12,08% / 12,34%.

### 11. «12 centesimi» era scritto come cifra esatta

La banda vera sta fra 12 e 14 centesimi per euro, a seconda dei riferimenti e
della variabilità dei token di «pensiero».

**Deciso:** «**circa** 12 centesimi» / «about 12 cents», e il test ricalcola su
tutti e tre i casi (0, 5, 14 riferimenti) invece che sul solo caso nudo.

> ⚠️ **Una cosa che devi decidere tu, e che non ho deciso io.** La frase si legge
> come un **netto**. Ma su un pacchetto da 5 € le commissioni Stripe (~1,5% +
> 0,25 €) se ne prendono circa 0,33 €, cioè **più della metà** del margine
> dichiarato. Se «12 centesimi» vuol dire «quello che resta a Zack», è sbagliata;
> se vuol dire «il margine sulla generazione», va detto. Non l'ho cambiata perché
> è una scelta commerciale, non tecnica.

### 12. Il servizio mostrava due prezzi diversi insieme

`services.js` teneva `price: 0.13` per la barra mentre il preventivo calcolava
0,15 €. Finché il servizio era spento nessuno li vedeva insieme; accendendolo
stavano uno accanto all'altro.

**Deciso:** via il letterale, il prezzo viene da `prezzoDi`. E poiché la barra
mostra un prezzo **prima** che i riferimenti esistano, adesso dice «**da** 0,15 €».

### 13. La home prometteva più di quanto il prodotto facesse

Due frasi, non una. `privacy.body` diceva «i tuoi file non escono da questo
computer» — falsa a metà coi riferimenti. E `hero.note`, sulla riga più letta
della pagina, diceva **«Nessun file lascia il tuo computer»**: più assoluta della
prima, e falsa nel momento esatto in cui il ramo comincia a incassare. Il test
nuovo vietava «escono» e «leave», e **lasciava passare** «lascia» e «leaves»: la
rete era stata tesa accanto al buco.

**Deciso:** corrette tutt'e due, e il regex allargato. E il conteggio degli
strumenti locali — il piano diceva «i sei strumenti», sono **cinque** — adesso lo
**conta un test** dai descrittori, così non invecchia di nuovo a B3.

---

## Le altre, in breve

| cosa | deciso |
|---|---|
| `thinkingLevel` non esiste: 400 su ogni chiamata | tolto (Task 0, misurato) |
| Google risponde **JPEG**, non PNG | `resa: 'jpeg'`, e la finzione dei test corretta |
| `costo_reale` registrava la **stima** come costo vero | si calcola da `usageMetadata` |
| il test del costo reale **non poteva fallire** (usageMetadata finto senza i campi che la funzione legge) | `usageMetadata` vero misurato, e la cifra esatta 131 |
| `formatEuro(140,'it')` non torna `'0,14 €'`: Intl usa U+00A0 | il test scrive ` ` esplicito, con un commento |
| la prima frase del file SQL poteva far fallire tutto il resto | il file comincia con `add column if not exists` ed è autosufficiente |
| `security definer` senza `search_path` fisso | `set search_path = public, pg_temp` |
| `addebita` non scriveva il movimento di spesa, `accredita` sì | `addebita` lo scrive nella stessa transazione; il Worker smette |
| `r?.ruolo in conta` accetta `'toString'` ed eredita da Object | `Object.hasOwn`, in due posti |
| il 409 era l'unica difesa contro un rinvio infinito | si accetta anche un corpo con `23505` |
| `Boolean(DESCRITTORI[tool]) &&` apriva il muro su mezzo studio | guardia tolta |
| il descrittore riscriveva i limiti che il suo commento vieta di riscrivere | un test lega descrittore e listino |
| `Ricarica.jsx` dichiarava una **seconda** copia dei pacchetti | `src/engine/pacchetti.js`, una fonte sola |
| i tre tasti del `+` aprivano tutti sulla scheda «Personaggio» | il ruolo scelto arriva al pannello |
| «il tuo abbonamento è attivo» detto a chi è in **prova** | «Non ti manca l'abbonamento: ti serve solo credito» |
| la misura predefinita era `rapida`, la decisione era `grande` | `grande` |

---

## Le sette prove che non provavano niente

È la trappola ricorrente di questo progetto — *una prova che dà lo stesso esito
nei due mondi non prova niente* — e in questa fase si è presentata **sette volte**.
Sei trovate dalle revisioni, una da un esecutore prima ancora della revisione.

1. il costo reale verificato con `typeof === 'number'`: zero è un numero
2. il caso `'toString'` verificato solo sullo status: **entrambi i mondi danno 400**
3. nessun test difendeva il prezzo che sale coi riferimenti
4. nessun test difendeva il tasto disabilitato durante l'attesa
5. nessun test difendeva la regola del movimento unico
6. il mock simulava l'`unique` su `p_lavoro` invece che su `p_stripe`
7. nessun test difendeva la nota del preventivo come azione

Tutte e sette adesso mordono, verificate rompendo il codice sotto ciascuna.

**La regola che ne esce:** un test si scrive e poi si rompe il codice sotto, o non
si sa cosa protegge.

---

## Rinviato, e scritto perché non si perda

Nessuno di questi blocca la fusione. Il primo è quello da tenere a vista.

- **`vaiAlPagamento()` non ha una guardia contro chi riabbona.** Col muro acceso e
  un rinnovo in ritardo, un cliente potrebbe aprire un **secondo** abbonamento
  Stripe. Viene da B1, non da questa fase, ma adesso è raggiungibile.
- `CAMBIO = 0.92` è fisso in `worker/fornitori/google.js`, e `costo_reale` — il
  numero che deve **provare** il margine — è calcolato con la stessa ipotesi che
  dovrebbe controllare. A €/$ alla pari il margine crolla al 5% e nessun numero in
  archivio lo direbbe.
- `ricaricaDa` legge l'importo con `Number()`, che accetta `' 5000'`, `'0x10'`,
  `'1e4'`. Non accredita mai più del dovuto e il canale non è popolabile da fuori;
  un `/^\d+$/` costa una riga.
- Il 502 non distingue «rimborso riuscito» da «rimborso fallito». Il campo `saldo`
  già li distingue: manca una riga i18n che dica «i soldi tornano entro un'ora».
- `formatEuro` arrotonda al centesimo mentre il prezzo vive in millesimi: si mostra
  «0,15 €» e si addebitano 0,146 €. Sbaglia in favore del cliente, ma la home dice
  «al centesimo» e i centesimi non sono l'unità vera.
- Manca il test della catena `ruoloIniziale` sui tre tasti del `+`.
- Le percentuali controfattuali «15,4% / 10,7%» in `listino.js` non sono state
  ricalcolate sulla base 128. Sono prosa, non asserzioni.
- La chiave i18n `abbonatoSenzaSaldo` ha un nome che presuppone un abbonato, anche
  se il testo non lo fa più.
- `src/store/ledger.js` → `src/engine/ledger.js` non è rilevato come rename da git
  (il contenuto nuovo condivide troppo poco col vecchio): `git log --follow` perde
  la continuità. Inevitabile.
