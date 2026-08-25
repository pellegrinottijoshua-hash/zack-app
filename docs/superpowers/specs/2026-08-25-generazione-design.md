# JAYL STUDIO — generazione a consumo

**Data:** 2026-08-25
**Stato:** in revisione
**Copre:** il blocco generazione (immagini, video, audio) con saldo prepagato in euro

---

## 1. Il modello di business, in una frase

**3,99 €/mese** danno gli strumenti che girano sul computer del cliente —
scontorno, vettoriale, export, editor, libreria — **illimitati, a costo
marginale zero**.

La **generazione** non è inclusa e non lo sarà mai: si paga a consumo, da un
saldo che il cliente ricarica, con il prezzo di ogni singola generazione scritto
prima di premere il pulsante.

Due opzioni per categoria, scelte per *cosa sanno fare*, non per marca.

## 2. Perché questo modello regge dove altri sono morti

Gli aggregatori AI muoiono in tre modi, e questo disegno chiude tutti e tre.

**Post-pagamento.** Carta rubata, 400 € di video in un'ora, storno dopo trenta
giorni: la GPU l'hai già pagata, e paghi anche 15-25 € di commissione. Nessun
margine ripaga un solo caso. → **Il saldo si ricarica prima. Sempre.**

**Costi che superano i ricavi.** Un abbonamento fisso con generazione inclusa
perde denaro sull'utente attivo, cioè sul migliore. → **La generazione non è mai
inclusa nell'abbonamento.**

**Nessuna ragione per passare da te.** Se rivendi token a margine, sei solo più
caro del diretto. → **Non vendiamo token: vendiamo che l'asset generato atterri
già nella libreria, dentro la moodboard, pronto da scontornare e mandare in
stampa.**

## 3. Il vincolo legale che decide la forma

I termini di fal (verificati il 2026-08-25) dicono:

> «Client will not expose any of the Services APIs directly to any End Users»

…ma permettono di far accedere gli utenti finali **attraverso la propria
"Client Solution"**.

**Conseguenza vincolante: JAYL STUDIO non può contenere una schermata che sia,
di fatto, la console di un fornitore.** Niente campo "modello" libero, niente
parametri grezzi passati così come sono, niente ritorno della risposta API
cruda. La generazione entra nel flusso del prodotto — sceglie un preset, produce
un asset che finisce in libreria — o siamo fuori dai termini.

Non è burocrazia: è ciò che separa un prodotto da un proxy, e il proxy è
vietato.

## 4. Diretto o aggregatore

Non è una scelta ideologica, è disponibilità reale:

| categoria | opzione A | opzione B | via |
|---|---|---|---|
| Immagini | qualità fotografica | resa illustrativa | **diretta** dove il fornitore è self-service |
| Video | personaggi coerenti | movimento e fisica | **aggregatore**: le API dirette dei modelli video migliori sono enterprise |
| Audio | effetti sonori | musica | mista, secondo licenza |

Il risultato sarà **misto**, e va bene. Per questo il fornitore non è una scelta
architetturale: è un dato di configurazione.

**Regola:** si parte da un aggregatore per ampiezza; si passa diretti solo sul
modello che domina i consumi, quando il risparmio supera il costo di gestire un
contratto in più.

## 5. L'adattatore

Ogni modello è una scheda, non del codice sparso:

```
Adapter {
  id                 'img-foto', 'video-personaggi', …
  category           'image' | 'video' | 'audio'
  labelKey           come lo chiamiamo NOI (per capacità, non per marca)
  modelName          'Seedance 2.5' — mostrato come sottotitolo
  provider           'fal' | 'openai' | …
  estimateCost(params) → euro          quanto costerà, PRIMA
  run(params, signal) → { blob, meta }  esegue
  limits             durata max, risoluzioni, formati ammessi
}
```

**Nell'interfaccia i modelli non si chiamano col loro nome.** Si chiamano per
cosa sanno fare:

> **Personaggi coerenti** · Seedance 2.5 · 0,38 €
> **Movimento e fisica** · Kling 3.0 · 0,21 €

Seedance è passata da 2.0 a 2.5 in pochi mesi. Se il nome del modello è
l'etichetta, ogni aggiornamento è un'etichetta bugiarda e utenti da riformare.
Con questo schema si cambia una riga di configurazione.

## 6. Il saldo, in euro

**Niente gettoni.** I crediti astratti esistono quasi sempre per nascondere il
prezzo; qui il prezzo è il posizionamento. Il saldo è denominato in euro e ogni
riga dice quanto è costata.

### Prenota → conferma → rilascia

Una generazione fallita **non deve consumare nulla**. Il flusso:

1. **Prenota** l'importo stimato: il saldo disponibile scende subito, così due
   generazioni in parallelo non possono spendere lo stesso denaro due volte.
2. **Esegui.**
3. **Conferma** al costo reale (che può differire dalla stima) **oppure
   rilascia** tutto se fallisce.

Senza il passaggio di prenotazione, due schede aperte contemporaneamente
possono mandare il saldo sotto zero. È il difetto classico di ogni portafoglio
digitale.

### Trasparenza dichiarata

Ogni generazione mostra, prima:

> Questo video costa **0,42 €** — 0,35 € di calcolo, 0,07 € a noi.

Il margine è del **15-20%**, dichiarato, e serve a coprire commissioni di
pagamento e generazioni fallite che paghiamo comunque. Canva e Adobe nascondono
tutto: dirlo è il nostro posizionamento, non una concessione.

### Ricariche

Importi fissi (5 / 15 / 40 €). **Prima ricarica di un account nuovo limitata**,
e importi maggiori sbloccati dopo la prima andata a buon fine: è ciò che rende
il furto di carta poco redditizio, senza dare fastidio a chi è onesto.

Il saldo **non scade**. Un saldo che evapora è un modo per far pagare due volte
la stessa cosa.

## 7. Responsabilità dei contenuti

Le generazioni passano dal nostro account presso il fornitore. **Se un utente
genera contenuti vietati, sospendono noi, non lui.**

Minimo indispensabile prima di aprire a chiunque:

- termini d'uso che vietano esplicitamente ciò che i fornitori vietano
- un registro di chi ha generato cosa e quando (serve anche per i rimborsi)
- la possibilità di bloccare un account
- un canale di segnalazione

## 8. Cosa può andare storto, e cosa facciamo

| caso | risposta |
|---|---|
| generazione fallita | prenotazione rilasciata, saldo intatto, messaggio che dice cosa fare |
| costo reale > stima | si conferma al reale; se supera il saldo, si copre la differenza e si segnala. Mai bloccare un lavoro già fatto |
| fornitore giù | l'altra opzione della stessa categoria resta disponibile: è metà della ragione per averne due |
| l'utente chiude la scheda a metà | la prenotazione scade da sola dopo un tempo massimo |
| prezzi del fornitore cambiati | i prezzi sono configurazione, non codice; una stima non aggiornata non deve poter addebitare più del preventivato |

## 9. Come si verifica

1. **Registro saldo** — pura logica, testabile senza rete e senza spendere: il
   saldo non va mai sotto zero, una prenotazione scaduta si rilascia, una
   generazione fallita non consuma, due operazioni concorrenti non spendono lo
   stesso denaro.
2. **Adattatori** — ognuno risponde a `estimateCost` senza chiamare la rete.
3. **Trasparenza** — un test verifica che nessuna generazione possa partire
   senza aver mostrato un prezzo.
4. **Nomi** — un test verifica che l'etichetta mostrata venga dalle traduzioni e
   non dal nome del modello, così un aggiornamento non può creare etichette
   bugiarde.

## 10. Cosa NON entra

Account e autenticazione, pagamenti reali, moderazione automatica dei contenuti,
generazione audio (rimandata: vedi sotto), fatturazione fiscale.

Il primo pezzo costruibile è il **registro del saldo**: è pura logica, si
verifica senza spendere un centesimo, e ogni altra cosa vi si appoggia.

Per memoria, già deciso altrove:

- **Immagini**: FLUX.1 schnell è Apache-2.0 e commerciale libero; FLUX.1 dev no.
- **Musica**: MusicGen è CC-BY-NC, vietato anche self-hosted. Stable Audio Open
  è commerciale sotto 1 M$ di fatturato.
- **Audio dalla voce**: il ritmo si estrae in locale e gratis, solo il timbro si
  genera. Disegno deciso, costruzione rimandata.
