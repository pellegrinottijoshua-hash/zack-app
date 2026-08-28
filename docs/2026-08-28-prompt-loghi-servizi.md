# I sei loghi dei servizi — prompt

Sei insegne, una per servizio, in alto al centro di ogni schermata. Non sono
icone e non sono i personaggi che compaiono al tocco: sono **il marchio che
cambia mestiere**.

Vedi `docs/2026-08-28-contratto-ux.md` § 4 per la differenza fra le due
famiglie.

---

## 1. La regola: si parte dal marchio, non da Zack

Il riferimento è **il marchio senza scritta** — i due occhi e il becco,
`~/Desktop/Jayl brand/loghi/` e il file `zack the duck` senza wordmark. È già
un logo che funziona: forme piene, nessuna linea, contrasto netto, leggibile a
32 px.

**Quello che si modifica è pochissimo**, e sempre lo stesso: gli occhi, e **un
solo oggetto**. Tutto il resto — becco, proporzioni, spessori, distanza fra gli
occhi — non si tocca.

⚠️ **Il tranello.** Chiedere «Zack che vettorializza» produce un'illustrazione
di una papera che fa qualcosa. Non serve quella. Serve **lo stesso marchio con
una variazione minima**, altrimenti sei loghi diversi non si riconoscono come
famiglia — e una famiglia che non si riconosce non è un marchio, sono sei
disegni.

### Perché serve anche lo Zack 2D come secondo riferimento

Il marchio **non ha braccia**: sono solo occhi e becco. Nel momento in cui un
servizio ha bisogno di un braccio che tiene qualcosa — la piuma, un vettore, il
tasto play — il modello se lo inventa, e lo inventa umano.

Quindi si passano **due riferimenti**:

1. **il marchio senza scritta** → dice la forma, lo spessore, il taglio;
2. **Zack in 2D** (`~/Desktop/zack the duck/2d`) → dice **com'è fatto un
   braccio di Zack**: un moncone d'ala corto e arrotondato, senza gomito,
   senza dita.

---

## 2. Il blocco stile — identico per tutti e sei

> Redraw the referenced logo mark (the two eyes and the beak, no wordmark) as a
> flat vector app icon. **Keep the mark exactly as it is** — same eye shapes,
> same eyelid angles, same beak, same proportions, same spacing. This is the
> same logo doing a different job, not a new logo.
>
> Flat solid shapes only: no outlines, no gradients, no shading, no texture, no
> highlights. Two colours only: warm cream `#F5F0E8` shapes on a deep black
> `#111111` background. Antique gold `#C4A35A` is allowed **for one single
> element** and only where the prompt asks for it.
>
> Centred, generous margin, square frame, readable at 32 px.
>
> Where a wing is needed, it is a **short rounded nub with no elbow and no
> fingers**, as in the 2D reference — never a human arm or hand.

**Negativo, sempre:** `no wordmark, no text, no letters, no outline, no
gradient, no drop shadow, no extra characters, no human hands, no realistic
feathers, no background scenery.`

---

## 3. I sei

Ognuno dice **una variazione sola**. Se ne servono due, il logo è sbagliato.

### Scontorna — *lo sguardo che taglia*

> The eyes are **narrowed to sharp horizontal slits**, more closed than the
> reference, giving a precise focused stare. Nothing is added: the whole change
> is in the eyes.

Perché nulla in mano: è il servizio di punta e la sua insegna dev'essere la
più pulita delle sei. Ed è l'unico dove **l'assenza di oggetti è il messaggio**
— toglie, non aggiunge.

### Brain — *concentrato*

> The eyes are **turned inward and slightly down**, brows pulled together into
> a concentrated frown. Above and between the eyes, **three small cream dots in
> a triangle, connected by two thin cream lines** — a tiny constellation,
> flat, the same weight as the beak outline.

I tre punti collegati sono la tela di Brain ridotta a tre pixel. **Non** un
cervello: un cervello disegnato in due colori a 32 px diventa una macchia.

### Vettorializza — *il vettore*

> Below the beak, **one short rounded wing nub** holds nothing. Instead,
> **over the right eye**, a single **antique gold `#C4A35A` node point with two
> tiny gold handle bars** — the control point of a Bézier curve, exactly as it
> looks in a vector editor. Flat, small, precise.

Il punto di controllo è il segno che chiunque abbia toccato un editor vettoriale
riconosce in un decimo di secondo. **È l'unico oro dei sei.**

### Suono — *a bocca aperta*

> The beak is **open**, the two halves separated, as if letting out a single
> flat note. Both eyes stay as in the reference. To the right of the head,
> **two short concentric cream arcs** — the universal sound wave, thin, flat.

⚠️ Il becco aperto è l'unica modifica al becco ammessa in tutta la famiglia.
Vale perché è il gesto stesso del servizio.

### Filmato — *il play*

> The eyes are as in the reference. **Below and slightly right of the beak, one
> short rounded wing nub holds a small cream triangle pointing right** — a play
> button, flat, with no circle around it.

Il triangolo **senza cerchio**: il cerchio attorno al play aggiunge una forma
che compete con gli occhi e a 32 px chiude il disegno.

### Libreria — *quello che resta*

> The eyes are as in the reference, looking **slightly to the left**, as if
> checking a shelf. Below the beak, **three short horizontal cream bars of
> decreasing width, stacked** — a shelf, or a stack of files. Flat.

Tre barre e non delle cartelle: una cartella disegnata piena diventa un
rettangolo, e un rettangolo non dice niente.

---

## 4. L'ordine, e come si giudica

1. **Scontorna per primo.** È la variazione più piccola di tutte — solo gli
   occhi — quindi è quella che dimostra se la regola regge. Se lì il modello
   si mette a ridisegnare il marchio, non andrà bene su nessuno degli altri.
2. Poi **Filmato** e **Libreria**: un oggetto semplice, forma netta.
3. Poi **Suono** e **Brain**.
4. **Vettorializza per ultimo**, perché è l'unico con l'oro e va guardato
   accanto agli altri cinque per decidere se quell'oro sta bene o urla.

### La prova che sono riusciti

**Si mettono i sei in fila, tutti a 32 px.** Devono succedere due cose insieme:

- **si riconosce che sono la stessa cosa** — stesso marchio, sei mestieri;
- **si distinguono l'uno dall'altro** senza leggere niente.

Se manca la prima, sono sei disegni. Se manca la seconda, sono lo stesso
disegno sei volte. È l'unico controllo che conta, e si fa in due secondi.

⚠️ Guardarli a 512 px non serve: a quella misura funzionano tutti.

---

## 5. Dove finiscono

Stesso script degli altri asset:

```bash
node scripts/prepara-assets.mjs <cartella>
```

Serve però una regola nuova nel `PIANO` di `scripts/prepara-assets.mjs`: i
loghi vanno a **96 e 32 px**, non a 512, e **non si scontornano** — il fondo
nero *è* il logo.

Nomi da usare, o lo script non li riconosce:

`lscontorna.png` · `lbrain.png` · `lvettore.png` · `lsuono.png` ·
`lfilmato.png` · `llibreria.png`

⚠️ **Il fondo nero è un problema su una pagina panna.** Due strade, da decidere
guardandoli: o si tiene il quadrato nero come una piastrella (e allora è un
elemento grafico, non un'insegna), o si genera **la variante invertita** —
forme nere su fondo panna — che è quella che la pagina vuole davvero.

**Consiglio: generarli in nero su panna fin da subito.** Il marchio esiste già
in tutte e due le versioni (`jayl-video-nero-su-bianco.png` accanto a
`jayl-video-bianco-su-nero.png`), quindi la famiglia lo prevede già — e
convertire dopo significa rigenerare.
