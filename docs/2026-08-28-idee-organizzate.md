# Le idee del 28 agosto, organizzate

Dodici idee portate il 2026-08-28, messe in ordine. Non in ordine di arrivo:
in ordine di **quanto servono alla tesi**, che è l'idea numero 5 e non è
un'idea — è il perché di tutto il resto.

---

## 0. La tesi, che ordina tutto

> *«Tutti i bg remover online fanno schifo o sono impraticabili. Zack deve
> essere intuitivo e immediato: deve essere chiaro che la home fa quello bene
> e subito, e poi, quando hai il risultato e lo scarichi, devi capire che sa
> fare anche altro, a pochi soldi, nell'app.»*

Da qui in poi ogni idea si giudica con una domanda sola: **serve a far
funzionare bene e subito lo scontorno, o serve dopo?** Quello che serve subito
viene prima. Il resto aspetta, anche se è più divertente.

---

## 1. Il primo minuto — quello che decide se il prodotto esiste

### 1.1 Il tasto Zack centrale, tagliato dal logo

Il tasto oggi è un ovale nero con `ZACK` in Fredoka. L'idea è di **ritagliarlo
dal logo `zack the duck`**, stesso carattere, così il tasto e il marchio sono
la stessa cosa.

Il modo giusto è quello che stiamo già usando: si genera il tasto come
immagine, poi lo si scontorna col nostro stesso «Fondo piatto» e diventa un
`.webp` con l'alfa. Se serve un prompt, la tavola è già in
[docs/prompt-tasti-nbp.md](prompt-tasti-nbp.md).

⚠️ **Un tasto che è un'immagine perde tre cose:** non si legge con la voce,
non si ridimensiona col testo del browser, e non si traduce. Vanno rimesse a
mano — `aria-label`, misura in `em`, e la scritta vera sotto l'immagine per
chi legge con la voce.

### 1.2 Il `+` per aggiungere file

Un `+` visibile sul canvas o sotto il tasto: **«add up to 4 files»**.

⚠️ **Contraddizione da sciogliere:** la home online dice **tre**, in due punti
(`orDrop` e `onlyThree`), ed è la cifra su cui è costruito l'invito allo
studio. Passare a quattro è una riga di codice — `MAX_FILE` sta in un posto
solo — ma va cambiata anche la frase, e va deciso **perché** quattro. Tre ha
una ragione: sta in fila su uno schermo stretto senza rimpicciolire le
miniature. Quattro no.

Sulla scritta: **sì, scritta.** Un `+` da solo è un simbolo che ognuno legge
come vuole; con «fino a 4 file» accanto dice anche il limite prima di
scoprirlo sbagliando.

### 1.3 I risultati grandi, e correggerli a mano deve essere facile

*«Si devono vedere su quasi tutto il desktop.»* Oggi sono tre riquadri da
260 px in fila sotto il tasto. Con quattro file e la correzione a mano
diventano il **luogo di lavoro**, non l'anteprima — quindi il primo schermo
cambia forma quando i file arrivano: il tasto si ritira in alto, le tele si
prendono lo spazio.

È lo stesso principio già scritto per lo studio: *«gli strumenti non coprono
la tela»*.

---

## 2. Gli strumenti di precisione — servono quando il modello sbaglia

Questa famiglia serve la tesi **direttamente**: un bg remover si giudica su
come si comporta quando sbaglia, non quando indovina.

### 2.1 Il righello ⭐ — l'idea più forte del gruppo

> *«Righello da usare per ripristinare con precisione il bg cancellato male o
> per cancellare/rifinire con precisione. Preso in centro si sposta; presi gli
> estremi si può curvare, allungare, ruotare.»*

È un **pennello vincolato a una guida**: dipingi lungo il righello e il tratto
resta sulla linea, invece di seguire il tremore della mano. È esattamente
quello che manca quando lo scontorno taglia dritto dove doveva curvare.

Si costruisce sopra quello che c'è già: `pennella()` è puro e prende un punto;
il righello decide **quali punti**, e li dà in pasto alla stessa funzione. La
matematica (proiezione di un punto su un segmento o su una curva di Bézier)
sta in un file puro, testabile in Node.

Va insieme allo zoom a 8× e alla matita da 3 px già fatti il 2026-08-27: senza
zoom un righello non serve, con lo zoom diventa uno strumento vero.

### 2.2 Più zoom nel vettoriale

Stessa lamentela dell'immagine, stesso rimedio: `SvgEditor.jsx`. Piccola, e
misurabile come è stata misurata quella del pennello.

### 2.3 I due tutorial

Uno per principianti, uno per esperti. **Va scritto dopo il righello**, non
prima: un tutorial su strumenti che stanno per cambiare si riscrive due volte.

---

## 3. Il movimento — serve a convincere, non a lavorare

Qui ci sono due idee **alternative**, e vanno scelte, non sommate.

### 3.1 Opzione A: Zack che fa cose

Home panna, tasto grande al centro, Zack a fianco che agisce — premi ZACK e
lui disegna. Scorrendo, cade nella sezione successiva o fa altro. Tutte clip
Seedance su fondo panna, **che iniziano e finiscono nella stessa posa** così
si incatenano senza stacco.

È coerente col canone (muto, deadpan) e riusa la macchina che c'è: il video a
schermo intero con le parole che scorrono esiste già in `HomeVideo.jsx`.

### 3.2 Opzione B: la tipografia

`ZACK` grande, a rotazione con caratteri sempre diversi, e accanto frasi tipo
*«ZACK my ass / me daddy / me bitch / my butt / my draw / me food / for me»*.

⚠️ **Va detto, poi decidi tu:** quel registro confligge con la bibbia della
serie — Zack **non parla**, la serie è muta e deadpan. Frasi in prima persona,
e in quel tono, lo fanno diventare un altro personaggio. Non è un problema
tecnico: è che il cast, le clip e i prompt già fatti presuppongono l'altro
Zack, e cambiarlo qui vuol dire cambiarlo ovunque.

**Se piace il gesto ma non il tono:** la rotazione dei caratteri su `ZACK`
funziona da sola, senza le frasi, ed è a costo zero (nessun asset, solo CSS).

### 3.3 «Video interattivo come i siti più belli»: come si fa davvero

Quattro tecniche, dalla più adatta a voi alla meno:

| tecnica | cos'è | quando |
|---|---|---|
| **Video legato allo scorrimento** | un video solo, e la posizione della pagina decide il fotogramma | **è già quello che avete.** `scrollVideo.js` fa esattamente questo |
| **Sequenza di fotogrammi** | PNG/WebP numerati, cambiati a mano | quando servono trasparenza perfetta e salti; costa MB |
| **Lottie** | animazione vettoriale da After Effects, JSON | per grafica piatta e forme, **non** per un personaggio renderizzato |
| **CSS/SVG** | disegnato a mano, come la piuma che scrive | dettagli, attese, micro-gesti. 2 KB |

**La cosa che manca alle vostre clip non è la tecnica: sono le clip.** In
`Landing.jsx` la lista `CLIP` ne contiene **una** e i blocchi sono cinque.
Aggiungerne una alla volta funziona già senza toccare codice.

### 3.4 «GIF invece?» — no, e c'è il numero

Misurato il 2026-08-28 sulla stessa clip:

| formato | misura | peso |
|---|---|---|
| `zack-1.mp4` | 1280×720, 24 fps | **224 KB** |
| `zack-1a.webm` VP9 **con alfa** | 1280×720, 24 fps | 754 KB |
| **GIF** | 640×360, 15 fps | **2.576 KB** |

Undici volte l'mp4 e tre volte e mezzo il webm con trasparenza, **già a metà
risoluzione e metà fotogrammi**. In più la GIF ha 256 colori e trasparenza a
un bit: i bordi sfumati di Zack sul panna verrebbero seghettati, che è
esattamente il difetto che questo prodotto vende di saper evitare.

*(WebP animato non misurato: l'ffmpeg di questa macchina non ha `libwebp`.)*

---

## 4. Il tasto Zack ovunque

> *«Personalizza il tuo tasto Zack in ogni servizio. Nella versione free
> impari a usarlo.»*

È già l'architettura: `ricette.js` tiene una catena **per servizio**, e
`RICETTE_DI_FABBRICA` ne ha già tre. Manca il ponte fra home e studio.

⚠️ **Il ponte ha una decisione dentro, e non l'ho presa da solo.** La home
ragiona per **fattori** (`×4`, `×2`, `:2`, `:4`); lo studio per **passi**
(`ingrandisci`, che punta da solo ai 4000 px di stampa). Sono due intenzioni
diverse:

- `ingrandisci` = «portalo alla misura di stampa», e il fattore lo decide il file;
- `×4` = «moltiplica per quattro», e il fattore lo decidi tu.

Tre strade, e va scelta:

1. **La home parla la lingua dello studio**: `×4`/`×2` diventano `ingrandisci`,
   e `:2`/`:4` spariscono dalla home finché lo studio non sa ridurre. Piccola,
   onesta, e toglie due pastiglie che hai chiesto tu;
2. **Lo studio impara i fattori**: nasce un passo `ridimensiona:x4` — la catena
   resta una lista di stringhe, `normalizza` valida il fattore. Più lavoro, ma
   è la versione che mantiene la promessa per intero;
3. **Restano separati**, e la home non promette niente sullo studio.

Oggi ho fatto la 3 **solo sulla copy**: la frase online diceva *«resta tuo
anche dentro lo studio»* e non era vero. Adesso dice *«da adesso fa quello che
scegli tu»*, che è vero. Il ponte resta da fare.

### L'AI su Brain

> *«Su Brain sarebbe opportuno si potesse usare l'AI per riorganizzare i file.»*

Attenzione: **è l'unica idea di tutta la lista che richiede un server.** Tutto
il resto gira nel browser. Un modello che riorganizza una tela vuole leggere i
nomi e i contenuti, e quello vuole una chiamata a pagamento — cioè il progetto
F (account e pagamenti), che avevamo messo per ultimo.

**La versione locale e gratuita esiste ed è quasi buona uguale:** raggruppare
per data, per tipo, per provenienza, per tag. Non è «intelligenza», ma
riordina davvero una tela da ottanta elementi.

---

## 5. Il linguaggio visivo

### 5.1 Le icone dei servizi con le facce

> *«Icone brain, crop, vettore, suono. Premute, appare provvisoriamente una
> faccia di Zack o degli altri che ricorda l'icona — 3-4 per ognuna, a
> rotazione.»*

Buona, e a costo quasi zero adesso che i sei ritratti esistono: pesano **da 1
a 11 KB** l'uno. Il rimbalzo faccia-icona è la cosa che rende un'app
memorabile senza dire niente.

**2D**, non 3D: le icone stanno a 24-32 px, e a quella misura un rendering 3D
diventa una macchia. Il cast in 3D resta dov'è utile — ritratti, stati vuoti,
clip.

⚠️ Regola già scritta: *«il colore non è mai l'unico segnale»*. Vale anche per
le facce — una faccia che appare non può essere l'**unica** conferma che il
comando ha funzionato.

### 5.2 Un compito per ogni personaggio

Rimandata dal committente stesso, e giustamente: ha senso **dopo** che le
icone hanno stabilito chi è chi.

---

## 6. Acquisizione: la SEO su «bg remover»

Domanda: *«come la costruiamo? Soprattutto se vogliamo ci sia molto spazio.»*

### Il muro, misurato

**L'HTML servito da `zack-app.com` contiene zero caratteri di testo.**
Verificato il 2026-08-28 sul `dist` di produzione: dentro `<body>` c'è
`<div id="root"></div>` e nient'altro. Nessun `<h1>`, nessuna frase, nessun
contenuto.

Google esegue il JavaScript, ma lo fa **dopo**, in una seconda passata e senza
garanzie. **I crawler dei modelli — quelli che decidono se Zack viene citato
quando qualcuno chiede a un'AI «come tolgo lo sfondo» — in gran parte non lo
eseguono affatto.** Per un prodotto la cui acquisizione è la SEO, questo viene
prima di ogni parola chiave.

Tre modi, dal più economico:

1. **Pre-renderizzare la home in fase di build.** La pagina diventa HTML vero
   con dentro il testo, e React lo riprende al caricamento. Non cambia niente
   per chi guarda; cambia tutto per chi legge senza occhi;
2. **Scrivere il testo chiave direttamente in `index.html`** e lasciare che
   React lo sostituisca. Sporco ma immediato;
3. **Un framework che renderizza sul server.** Sproporzionato: si comprano un
   server e una complessità che questo prodotto ha scelto di non avere.

### E «molto spazio» sulla pagina non è in conflitto

Il timore è che una home vuota non abbia contenuto da indicizzare. Non è così:
il contenuto **c'è già** — Brain, il cast, il confronto dei prezzi, il
racconto — sta sotto la piega, ed è esattamente dove deve stare. Google legge
tutta la pagina, non il primo schermo.

Quello che serve in più:

- **un `<h1>` che dica la cosa**, non il marchio. «Remove image backgrounds,
  free» batte «Zack App» di parecchio;
- **il prima/dopo come immagine esportabile** (era già la voce 4 di
  RIPRENDI-QUI): ogni designer che pubblica il suo confronto porta un link;
- **le directory** — è il modo più economico che esista per i primi link;
- **una pagina per intento**, non quaranta pagine generate: «remove background
  from a logo», «prepare a PNG for print». Poche e vere.

---

## 7. Domani: disegnare app e desktop

> *«Domani disegnare l'app e il desktop per rifinire UX/UI.»*

**Questo assorbe il progetto D** (meno tasti, più spazio negativo). Non ha
senso ripulire lo studio oggi per ridisegnarlo domani: D si fa **dentro** quel
disegno, non prima.

---

## L'ordine che propongo

| | cosa | perché adesso |
|---|---|---|
| 1 | **Il righello** | serve la tesi in pieno: il bg remover si giudica su come si comporta quando sbaglia. E lo zoom, che gli serve, è appena stato fatto |
| 2 | **La home HTML vera (pre-render)** | oggi la SEO è impossibile, non difficile. È il muro prima di ogni parola chiave |
| 3 | **Il primo schermo: tasto dal logo, il `+`, tele grandi** | è la tesi tradotta in pixel, e va fatto insieme al disegno di domani |
| 4 | **Le icone con le facce** | costo quasi zero, gli asset ci sono |
| 5 | **Il ponte del tasto Zack** | dopo che il disegno ha deciso che forma ha il tasto |
| 6 | **Più zoom nel vettoriale** | piccola |
| 7 | **I tutorial** | dopo il righello, o si riscrivono |
| 8 | **Le clip della home** | una alla volta, senza toccare codice |
| — | **L'AI su Brain** | vive nel progetto F: serve un server |
| — | **Un compito per personaggio** | dopo le icone |

## Le decisioni che aspettano te

1. **Tre file o quattro?** Oggi la home dice tre, in due punti.
2. **Il tono della tipografia** — «ZACK my ass» contro il canone muto e deadpan.
3. **Il ponte del tasto**: la home impara la lingua dello studio, o lo studio
   impara i fattori?
