# Piano asset Zack per JAYL Studio — prompt pronti da incollare

> Compagno di [2026-08-26-zack-e-brain.md](2026-08-26-zack-e-brain.md), che spiega
> *perché*. Qui c'è solo *cosa generare*, in che ordine, con che prompt e con che
> peso. **Le generazioni le lancia il committente.**
>
> Canone: `~/Desktop/dax the duck/zack-series-bible.md`. Tutte le regole di
> scrittura prompt (§4 della bibbia) valgono qui senza eccezioni. In particolare:
> **niente descrizione dei personaggi** (ci sono gli Element), **niente testo nel
> video**, occhi sempre a mezze palpebre, ombre di contatto sotto ogni cosa,
> una sola idea di camera per clip, max 4-5 azioni fisiche in 8s.

---

## 0. Le due deroghe alla bibbia, dichiarate

La bibbia è scritta per i social. Il sito ha due esigenze diverse, e le deroghe
vanno scritte una volta qui invece di essere reinventate a ogni prompt:

1. **Formato.** La serie è 9:16 verticale. Gli asset del sito sono **16:9** (hero
   della presentazione) o **1:1** (clip dentro lo studio). Nei prompt lo dichiaro
   al posto di «vertical 9:16»; tutto il resto dell'header standard resta identico.
2. **Durata.** Le clip dentro lo studio sono **3 secondi in loop**, non 8. Con la
   regola del budget azioni (§4.1) 3s significa **una sola azione fisica**, e va
   bene così: una clip-tutorial mostra un gesto, non una storia.

Non deroga nient'altro. In particolare: **zero testo generato** (vale doppio,
perché l'interfaccia ha già il suo testo in due lingue) e **niente sorrisi**.

---

## 1. Formati e pesi

I numeri sotto sono **obiettivi di budget, non misure**: vanno verificati con
`ffprobe`/`ls -l` sul file vero prima di metterlo in `public/`, e corretti qui.

| famiglia | formato | risoluzione | obiettivo peso | dove |
|---|---|---|---|---|
| **H-\*** hero scroll | WebM VP9, muto, no audio track | 1280×720 | ≤ 1,8 MB per scena, **≤ 8 MB in tutto** | `public/hero/` |
| poster hero | WebP | 1280×720 | ≤ 60 KB | primo fotogramma di H-1 |
| **T-\*** tutorial | WebM VP9 in loop, muto | 512×512 | ≤ 250 KB l'una | `public/zack/` |
| **S-\*** stati | WebM VP9 in loop, muto | 512×512 | ≤ 250 KB l'una | `public/zack/` |
| **E-\*** stati vuoti | WebP statico | 800×800 | ≤ 80 KB | `public/zack/` |
| **B-\*** marchio | PNG + SVG | 512, 192, 32 | — | `public/` |

**Il vincolo duro è l'hero.** La pagina di presentazione non carica ONNX apposta
(§4 RIPRENDI-QUI): se il video la fa pesare quanto lo studio, la separazione delle
due entrate non serve più a niente. Regole:

- il video hero si carica **dopo** il primo disegno della pagina e **solo** se la
  connessione non è `saveData`;
- fino ad allora c'è il poster WebP, che deve reggere da solo come immagine;
- con `prefers-reduced-motion` il video non parte mai: resta il poster.

Le clip dentro lo studio si caricano **su richiesta** — quando «Spiegami» è
acceso, o al passaggio del mouse. Mai tutte all'avvio.

---

## 2. Header standard, nelle due varianti

Da mettere in testa a ogni prompt video. Copiato dalla bibbia §2, cambiato solo il
formato.

**Variante 16:9 (hero):**
```
8-second dialogue-free 3D comedy shot, horizontal 16:9, premium animated feature-film quality: soft groomed feather textures, warm volumetric lighting, cinematic depth of field. SETTING: infinite clean cream void (#F5F0E8), soft studio lighting, contact shadows under every character and object. PALETTE: only black #111111, warm cream #F5F0E8, antique gold #C4A35A. ABSOLUTELY NO TEXT, NO LETTERS, NO LOGOS anywhere in the video.
```

**Variante 1:1 (clip nello studio):**
```
3-second dialogue-free 3D comedy shot, square 1:1, premium animated feature-film quality: soft groomed feather textures, warm volumetric lighting, shallow depth of field. SETTING: infinite clean cream void (#F5F0E8), soft studio lighting, contact shadows under every character and object. PALETTE: only black #111111, warm cream #F5F0E8, antique gold #C4A35A. Static locked-off camera, medium shot. ONE single physical action only. The clip must end on a frame that matches its opening frame so it loops seamlessly. ABSOLUTELY NO TEXT, NO LETTERS, NO LOGOS anywhere in the video.
```

---

## 3. H — la presentazione: cinque scene guidate dallo scorrimento

La pagina è già predisposta per un video guidato dallo scorrimento
(`src/landing/scrollVideo.js`, matematica testata). Cinque scene da 8s, montate in
un unico file: **40 secondi in tutto**, che è quanto dura uno scorrimento lento
della landing.

Le cinque scene rispondono, nell'ordine, alle cinque cose che chi arriva deve
capire (§7.4 RIPRENDI-QUI): *chi è JAYL → cosa fa lo studio → gli strumenti sono
pochi e semplici → sono gratis e girano da te → serve a rifinire lavori veri*.
Nessuna lo dice a parole: il testo è quello della landing, il video lo mostra.

### H-1 — «qualcosa nasce» (0-8s)

> ZACK stands alone in the center of the empty cream void. He takes his gold feather from his head and holds it firmly in his wing. He draws one single horizontal arc in the air with the narrow tapered tip end; the trail is a glowing antique-gold light-trail that forms only the outline of a simple round shape. The outline solidifies instantly into a solid black object resting on the ground, slightly lopsided. ZACK looks at it, then looks straight into camera and holds completely still. His eyes stay half-lidded and deadpan the entire time, they never open wider. Static locked-off camera, medium wide shot. Contact shadows under ZACK and under the object.

*Nota post: il primo fotogramma di questa scena è il poster WebP della pagina.*

### H-2 — «viene ripulito» (8-16s)

> ZACK stands beside one single black object. He holds his gold feather in his wing and traces the outline of the object once with the narrow tapered tip end; a thin glowing antique-gold light-trail follows the silhouette exactly. As the trail closes, everything around the object outside the traced line fades cleanly to empty cream void, leaving the object alone and crisp. ZACK looks into camera and holds still, eyes half-lidded and deadpan. Static locked-off camera, medium shot. ONLY ONE object exists in this clip. Contact shadow under the object.

### H-3 — «diventa grande» (16-24s)

> ZACK stands next to one single small black object that reaches his knee. He touches the object once with the narrow tapered tip end of his gold feather. The object grows smoothly to three times ZACK's height over two seconds, staying perfectly sharp and clean-edged as it grows. ZACK tilts his head back to follow it, then looks into camera and holds still, eyes half-lidded and deadpan. Slow push-in camera. The object is exactly ZACK's knee height at the start and three times his height at the end. Contact shadows under ZACK and the object.

### H-4 — «il piccione se lo prende» (24-32s)

> ZACK stands beside one finished black object. The PIGEON sits motionless on the ground nearby with his eyes fully closed. The PIGEON's eyes stay fully closed until ZACK turns away, then snap open into a hyper-focused sinister glare. The PIGEON launches in one instant, snatches the object, and settles calmly on top of it. ZACK turns back, sees the empty ground, and looks into camera, holding completely still, eyes half-lidded and deadpan. Static locked-off camera, wide shot. ONLY ONE object exists in this clip, no new object ever appears. Contact shadows under every character and object.

### H-5 — «e lui ne disegna un altro» (32-40s)

> ZACK stands alone in the empty cream void. He lifts his gold feather and draws one single new outline in the air with the narrow tapered tip end; the glowing antique-gold light-trail forms only the outline of the same simple round shape as before, and solidifies instantly into a solid black object, slightly lopsided in a different way. ZACK looks into camera and holds completely still, eyes half-lidded and deadpan. Static locked-off camera, medium wide shot, framed identically to the opening shot. Contact shadow under ZACK and under the object.

*Nota post: H-5 chiude sull'inquadratura di H-1 → il video si salda e si può
rimettere in loop se qualcuno risale la pagina.*

---

## 4. T — le clip dei comandi (tutorial e tasti)

Una clip per comando, 3s, 1:1, **una sola azione**. Header 1:1 di §2.

**Non si generano tutte.** Ordine: prima gli otto comandi che la gente sbaglia,
poi il resto quando qualcuno lo chiede.

| id | comando | corpo del prompt (dopo l'header) |
|---|---|---|
| **T-CUT** | Scontorna | ZACK traces once around a single black object with the narrow tapered tip end of his gold feather; the background around it drops away to empty cream void as the trail closes. Eyes half-lidded and deadpan throughout. |
| **T-BRU** | Pennello maschera | ZACK sweeps the narrow tapered tip end of his gold feather across one edge of a single black object; a small notch on that edge fills in and the silhouette becomes clean. Eyes half-lidded and deadpan throughout. |
| **T-UP** | Ingrandisci ×4 | ZACK taps a single small black object once with the narrow tapered tip end of his gold feather; the object grows to four times its size, staying perfectly sharp. Eyes half-lidded and deadpan throughout. |
| **T-VEC** | Vettorializza | ZACK touches a single black object with the narrow tapered tip end of his gold feather; the object's silhouette turns into a clean glowing antique-gold outline that holds its shape and stops. Eyes half-lidded and deadpan throughout. |
| **T-CRP** | Ritaglia | ZACK draws one single rectangle outline in the air with the narrow tapered tip end of his gold feather around a single black object; everything outside the rectangle fades to empty cream void. Eyes half-lidded and deadpan throughout. |
| **T-UND** | Annulla | ZACK flicks his gold feather backwards once; the single black object in front of him instantly reverts to a glowing antique-gold outline and vanishes. Eyes half-lidded and deadpan throughout. |
| **T-BAT** | Blocco | ZACK draws one single horizontal arc with the narrow tapered tip end of his gold feather; four identical small black objects solidify in a neat row at once. Eyes half-lidded and deadpan throughout. ONLY FOUR objects exist, no fifth object ever appears. |
| **T-EXP** | Esporta | ZACK picks up a single black object with both wings and calmly sets it down outside the frame at the right; the cream void is left empty. Eyes half-lidded and deadpan throughout. |

**T-ICN — le cinque icone di Brain.** Non sono clip: sono cinque SVG che si
disegnano con `stroke-dashoffset` (stella, punto interrogativo, spunta, croce,
fuoco). **Nessuna generazione**: si disegnano in codice, con il filo d'oro, e
sotto `prefers-reduced-motion` compaiono già finite.

---

## 5. S — gli stati del sistema (il cast al lavoro)

Il cast mappato sugli stati dello studio (§1 del documento compagno). 3s, 1:1,
loop. **Questi valgono più delle T**: un errore capita a tutti, un tutorial lo
apre chi vuole.

| id | stato | prompt (dopo l'header 1:1) |
|---|---|---|
| **S-ERR** | errore | The SEAGULL stands over a single black object, puffs his oversized cream chest up with confidence, swings one wing at the object and misses completely; his chest deflates visibly as he stands there. Contact shadows under the SEAGULL and the object. |
| **S-WAIT** | attesa | ZACK holds one single glowing antique-gold outline in the air with his gold feather. The MOTH flutters calmly to the outline and quietly eats a small piece of the glowing trail, her belly glowing gold from inside. ZACK's eyes stay half-lidded and deadpan, he does not react. |
| **S-SAVE** | salvato in libreria | ZACK stands looking into camera, completely still, eyes half-lidded and deadpan. Behind him, the ANT walks calmly into frame from the left, lifts a single small black object above its head, and carries it out of frame to the right without ever looking at ZACK. |
| **S-PRINT** | controllo di stampa | The CAT lies stretched out beside a single black object, eyes half-closed and judging. He raises one paw, pushes the object over with one elegant tap while maintaining eye contact with camera, and settles back down. |
| **S-DONE** | operazione lunga finita | The PIGEON sits motionless with eyes fully closed beside a single black object. His eyes snap open into a hyper-focused glare, he lunges in one instant, and settles calmly on top of the object, pleased. |

**S-WAIT non sostituisce la barra di avanzamento**: le sta accanto. La regola
«il colore non è mai l'unico segnale» vale anche per la mascotte — una clip non
dice quanto manca.

---

## 6. E — gli stati vuoti (immagini ferme, non video)

Sei WebP statici, 800×800, generati con **Nano Banana Pro** partendo dalla
character sheet come riferimento. Costano molto meno di un video e stanno su
schermate dove non succede niente, quindi il movimento non serve.

Header per le still (una volta, poi il corpo):
```
Premium 3D animated feature-film still, square 1:1, soft groomed feather textures, warm volumetric lighting, shallow depth of field. SETTING: infinite clean cream void (#F5F0E8), contact shadows under every character and object. PALETTE: only black #111111, warm cream #F5F0E8, antique gold #C4A35A. ABSOLUTELY NO TEXT, NO LETTERS, NO LOGOS.
```

| id | schermata | corpo |
|---|---|---|
| **E-BRAIN** | Brain vuoto | ZACK sits on the ground surrounded by five small black objects arranged in a loose circle around him, looking into camera, eyes half-lidded and deadpan. |
| **E-DROP** | nessun file caricato | ZACK stands alone in the empty cream void holding his gold feather in his wing, looking into camera, eyes half-lidded and deadpan. |
| **E-LIB** | libreria vuota | ZACK stands beside one completely empty black shelf, looking into camera, eyes half-lidded and deadpan. |
| **E-SND** | laboratorio suoni | ZACK stands with his beak slightly open, three small concentric antique-gold rings expanding in the air in front of him, eyes half-lidded and deadpan. |
| **E-IMG** | Immagine «presto» | ZACK sits patiently next to one single empty gold picture frame standing upright on the ground, looking into camera, eyes half-lidded and deadpan. |
| **E-VID** | Video «presto» | ZACK sits patiently beside a stack of three identical black objects, looking into camera, eyes half-lidded and deadpan. |

---

## 7. B — il marchio

| id | cosa | note |
|---|---|---|
| **B-ICO** | icona app / favicon | dal `logo.png` di `~/Desktop/zack the duck/`. Serve a 512, 192, 32 px. **A 32 px va guardato davvero**: la piuma d'oro rischia di sparire — se sparisce, la variante 32 è la testa sola, non il personaggio intero. |
| **B-OG** | immagine di anteprima social | 1200×630. Zack + il payoff *Art finds a way* — il testo si compone **in post**, non si genera. |
| **B-PWA** | `manifest.json` | nome, icone B-ICO, colore tema `#111111`, sfondo `#F5F0E8`. Nessuna generazione. |

---

## 8. Ordine di generazione

Ogni riga è utile da sola: se ci si ferma alla terza, quello che è stato generato
è già in produzione.

| | asset | perché prima | costo |
|---|---|---|---|
| 1 | **B-ICO**, **B-PWA** | chiude la richiesta «app Zack» in un pomeriggio | zero generazioni |
| 2 | **S-ERR**, **S-WAIT** | errore e attesa capitano a tutti, sempre | 2 clip |
| 3 | **E-DROP**, **E-BRAIN** | sono le due schermate che si vedono per prime | 2 still |
| 4 | **H-1** + poster | la landing guadagna subito, anche con una scena sola | 1 clip |
| 5 | **H-2 … H-5** | il video completo guidato dallo scorrimento | 4 clip |
| 6 | **T-CUT, T-UP, T-BRU, T-CRP** | i quattro comandi che si sbagliano di più | 4 clip |
| 7 | **S-SAVE, S-PRINT, S-DONE**, resto delle **E** e delle **T** | quando servono | a richiesta |

**Prima di generare la serie completa, generare H-1 e S-ERR e guardarle nel
browser dentro la pagina vera.** Una clip che funziona su Higgsfield e non
funziona in un riquadro da 512 px è una lezione che costa una generazione se la
si impara subito, e dodici se la si impara alla fine.
