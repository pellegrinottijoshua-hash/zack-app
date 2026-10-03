# Fase 5 — Brain, la libreria

> Spec, 2026-10-03. Fonti: la scaletta (fase 5, 2 g ≈ 20 M) e il quaderno
> `2026-09-14-bozze-servizi.md`, §T4, §T6, §B1–B9, §P1–P2, §D-d. Il committente
> ha detto «parti da solo»: le decisioni che il quaderno lasciava aperte le ho
> prese io e stanno in §3, una riga ciascuna, da ribaltare se non vanno.
> **Non tocca i soldi.** Si fa in quattro fette, una per sessione.

## 1. Cosa è già deciso (dal quaderno)

- **T6 — Brain è la libreria.** I file vivono lì; la pool è la sua posta in
  arrivo, il pocket la scorciatoia del giorno. `Library.jsx` diventa una vista
  di Brain.
- **T4 + P1 — una pool sola, finestra sull'archivio.** Un archivio unico in
  ordine di data tiene tutto; la pool ne mostra i **20 più recenti** e si
  scorre indietro fino al primo file. Uscire dalla pool non è sparire.
- **B-d — il cestino restituisce.** Tiene finché non lo svuoti, e ci si
  rovista dentro. È l'unico modo di perdere qualcosa, quindi non è definitivo.
- **B-e — l'annulla resta in Brain.** (C'è già: `strumenti.annulla`.)
- **B1** — dalla tela di Brain spariscono crediti, colonna destra, mascotte,
  tasto Zack, schede-nota e menu del file: in Brain non si genera, si organizza.
- **B2 / B-g** — ogni file è un'**icona circolare** con l'immagine centrata
  (la forma dell'icona output). Video: il primo fotogramma. Audio: l'onda.
- **B4** — niente oggetti che non siano file. **Titolo e nota sull'icona**,
  ancorati al file.
- **B-b** — **tocco = apri** (nome e nota), **tenere premuto = prendi in mano**.
- **B-c** — si toglie un file dalla tela **senza cancellarlo**.
- **B3** — a destra: le **tre lineette** (freccia, gruppo, colore o icona) e la
  **pool**; in basso a destra il **cestino**.
- **B5 / B6 / B-f** — un'icona posata su un'altra fa una **cartella**, che
  tiene la faccia della madre, si rinomina e si annida. Un file in cartella
  resta nell'archivio per data.
- **P2** — cercare starà nell'archivio.
- **D-d** — un prompt salvato è **un file di testo** (`.md`): un'icona come
  le altre, che si posa su Immagine o Video.
- **T6 ⚠️** — lo spazio del browser finisce, e su iOS il sistema può
  svuotarlo. Va detto prima, con una misura.

## 2. Il disegno

### 2.1 Il cestino è un campo, non un posto

`asset.cestinatoIl = ISO | null`. Cestinare scrive il campo; rimettere lo
toglie; **svuotare il cestino** è l'unica cancellazione vera (record + file
OPFS). `useLibrary().assets` restituisce **solo i vivi**: così ogni lettore di
oggi — pocket, riferimenti, tela, scontorno — smette di vedere un file
cestinato senza toccarlo, e lo rivede se torna. Il cestino è
`useLibrary().cestino`.

⚠️ La trappola: `saveAsset` è idempotente (impronta + nome). Salvare di nuovo
un file identico a uno **cestinato** lo ritroverebbe e lo restituirebbe
**invisibile**. Regola: in quel caso lo si **rimette**, perché chi rifà un file
lo vuole.

### 2.2 La pool è una lente, non una scatola

Una funzione pura, `pool(assets, { cerca, quanti })`: i vivi dal più recente,
filtrati dalla ricerca (nome, nota, tag), i primi `quanti` (20, poi «altri 20»
al tocco). Sostituisce `ScegliAsset`: lo stesso pannello si apre dal cerchio
della pool e dalla voce «libreria» del `+`.

### 2.3 Lo spazio si misura

`navigator.storage.estimate()` (già in `snapshot().usage`) → `livelloSpazio`
puro: `ok` sotto l'80 %, `attento` fino al 95 %, `pieno` oltre. Il pannello del
cestino dice quanto occupa il cestino e quanto si libera svuotandolo; sopra
`attento` lo dice anche la pool. All'ingresso in Brain si chiede
`navigator.storage.persist()` una volta (è ciò che protegge OPFS dallo
sfratto, §5 di RIPRENDI-QUI).

## 3. Decisioni prese da me (2026-10-03), da ribaltare se non vanno

1. **Il cestino non si svuota da solo.** Mai: né a tempo né per spazio. Se lo
   spazio è `pieno` si **propone** di svuotarlo, con la cifra.
2. **Svuotare chiede conferma** con quanti file e quanti MB: è l'unico gesto
   senza ritorno di tutto il prodotto.
3. **Un file cestinato sparisce anche dalla tela e dal pocket**, e torna al
   suo posto se lo rimetti (la tela tiene il riferimento, il pocket l'id).
4. **La pool cerca** nel nome, nella nota e nei tag. Niente filtri per tipo in
   5a: con la ricerca bastano.
5. **Le note di oggi sulla tela diventano file `.md`** (5b), uno per nota, al
   loro posto: B4 toglie le schede, ma quello che uno ci ha scritto non si
   butta.
6. **I gruppi (`cerchio`) e le frecce restano** oggetti della tela: B3 li tiene
   fra gli strumenti di riordino, non sono «schede».
7. **Il tasto Zack esce da Brain** (B1) in 5b, e con lui il punto oro del
   riordino: le quattro regole di `riordina.js` passano nelle tre lineette.

## 4. Le fette

**5a — l'archivio e il cestino** (questa sessione, 4 compiti):
1. `engine/archivio.js` puro: cestina/rimetti, `pool`, `livelloSpazio` + prove;
2. libreria e `useLibrary`: `assets` = vivi, `cestino`, `cestina`, `rimetti`,
   `svuotaCestino`; «butta» e i doppioni cestinano; `saveAsset` rimette;
3. Brain: il cerchio della **pool** (sostituisce `ScegliAsset`, con ricerca e
   «altri 20») e il **cestino** in basso a destra (rimetti, svuota con
   conferma, lo spazio); `persist()` all'ingresso;
4. lo script di raggiungibilità apre i due pannelli; prove, build, fusa.

**5b — la tela di soli file**: icone circolari con le facce (onda, primo
fotogramma), titolo e nota sull'icona, tocco = apri; le note diventano `.md`;
tenere premuto = prendi (il trascinamento della 4b con l'attesa); posare sulla
pool = togli dalla tela; via Zack, crediti e mascotte da Brain.

**5c — cartelle e riordino**: icona su icona = cartella (faccia della madre,
nome, annidamento, entrare e uscire); le tre lineette: freccia, gruppo, colore
o icona (le facce del cast come icone pronte).

**5d — i prompt e la vista libreria**: il `.md` come prompt salvato, posato su
Immagine/Video riempie il prompt; l'icona «prompts»; la striscia della
libreria nello studio diventa una vista di Brain.

## 5. Cosa NON fa

Non sincronizza niente fra dispositivi. Non manda file a un server. Non fa
generare Brain (B1). Non cancella mai da solo.
