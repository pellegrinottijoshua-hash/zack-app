# Animazioni del cast — prompt Seedance pronti

> Le animazioni che compaiono **dentro** lo studio quando succede qualcosa.
> Compagno di [zack-asset-plan.md](zack-asset-plan.md), che copre landing,
> tutorial e stati vuoti. Qui c'è solo il cast che reagisce alle azioni.
>
> Canone: `~/Desktop/dax the duck/zack-series-bible.md`. Le generazioni le
> lancia il committente.

---

## 0. Regole di questa famiglia

**Durata: 4 secondi generati, tagliati a 2 o 3 in montaggio.** Si genera a 4s
perché il modello ha bisogno di respiro sull'attacco e sulla chiusura; si taglia
perché nell'interfaccia un'animazione di 4 secondi vista trenta volte al giorno
diventa un ostacolo. Ogni prompt sotto è costruito con **il beat utile fra 0,5s e
2,5s**, così il taglio cade su fotogrammi morti e non tronca l'azione.

**Una sola azione fisica per clip.** Regola §4.1 della bibbia. A 4 secondi il
budget è due eventi al massimo, e questi ne usano uno più lo sguardo finale.

**Niente testo generato, mai.** Vale doppio: sopra queste clip ci va
l'interfaccia, in due lingue.

**Il fondo resta panna.** Le clip generate non hanno canale alfa, e ritagliare
un personaggio nero da un fondo panna uniforme è possibile ma costa lavoro a ogni
asset. La scelta economica e canonica è la stessa: **le clip si mostrano dentro un
riquadro panna** (`#F5F0E8`), che è già il colore delle superfici dello studio. Se
un giorno serve davvero il personaggio ritagliato sopra una foto, si fa il key
allora, su una clip sola, non su tutte.

**Sono avvisi, non spettacolo.** Regola già scritta: il personaggio non è mai
l'unico segnale. Se il gabbiano compare quando cancelli, accanto c'è comunque la
scritta che dice cosa è stato cancellato e il tasto per annullare. La clip
**aggiunge**, non informa da sola. E sotto `prefers-reduced-motion` non parte
nessuna di queste: resta un fermo immagine.

**Frequenza.** Ogni clip parte al massimo una volta per azione, e mai due clip
insieme. Se due eventi si accavallano, vince quello che l'utente ha causato per
ultimo.

---

## 1. La mappa — chi compare quando

Due voci della tua lista dicevano entrambe «cancellare». Le ho divise così, ed è
la divisione che rende leggibile il linguaggio: **il gabbiano si prende il
lavoro intero, la falena mangia i pezzi.**

| clip | quando parte | personaggio | perché lui |
|---|---|---|---|
| **A-DEL** | elimini un lavoro dalla libreria | GABBIANO | ruba con la forza, e i suoi colpi sono definitivi |
| **A-ERASE** | gomma, annulla, svuoti la tela | FALENA | mangia i tratti prima che si solidifichino: sparisce un pezzo, non l'opera |
| **A-SWAP** | sostituisci il file aperto con un altro | PICCIONE | in un istante si prende il posto, senza sforzo |
| **A-REGRET** | elimini un lavoro su cui hai lavorato a lungo | GATTO | è l'unico che capisce l'arte, ed è l'unico che può dispiacersene |
| **A-WOW** | scarichi un lavoro finito | GATTO | la sua meraviglia è la sua espressione più rara: sta dove serve di più |
| **A-ANT** | ogni tanto, sulla tela di Brain | FORMICA | passa e non fa niente. È l'unica clip senza funzione, ed è il punto |
| **A-ZACK-1…n** | premi il tasto Zack | ZACK | la libreria che cresce nel tempo |

Sulla soglia di **A-REGRET**: «dopo x tempo che ci lavori» va scelto come numero
vero. Proposta: **dieci minuti di lavoro attivo sul file, o cinque passi di
modifica**, presi da dati che l'app ha già. Da misurare sull'uso reale e correggere
qui, non da fissare a naso una volta per sempre.

Sulla frequenza di **A-ANT**: rara o non è più un regalo. Proposta di partenza:
**una volta ogni venti minuti di tela aperta, al massimo tre volte per sessione**,
e mai due volte di fila nello stesso punto.

---

## 2. Formato tecnico

| | valore |
|---|---|
| generazione | 4s, quadrato 1:1 |
| consegna | WebM VP9 muto, 512×512, tagliato a 2s o 3s |
| obiettivo peso | ≤ 300 KB l'una (**da verificare sul file vero**) |
| dove | `public/zack/` |
| caricamento | su richiesta, mai all'avvio |

I tag `@zack @seagull @pigeon @moth @cat @ant` sono gli Element già caricati su
Higgsfield: **portano loro l'aspetto**, i prompt non lo ridescrivono mai.

---

## 3. I prompt

### A-DEL — elimini un lavoro (gabbiano)

```
SCENE CONTEXT
A single black artwork panel stands upright on the ground in an empty cream void. The seagull walks in from the right, smashes the panel, and stands over the pieces.

ACTIVE REFERENCES
@seagull — 100% matches the reference. His oversized cream chest and hooked black beak stay exactly as in the reference.

LOCATION MAP
Infinite clean cream void #F5F0E8, no walls and no horizon line. Foreground: bare cream ground with a soft contact shadow under the panel. Midground: one single upright black rectangular panel, exactly the seagull's chest height, centred. Background: empty cream depth. Light comes from the upper left.

FIRST FRAME / BLOCKING
Frame opens on the black panel standing alone, centred, already settled and still. The seagull is fully out of frame on the right at 0.0s and enters at 0.5s.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
MS, 47° FOV, neutral human perspective, no drift for the whole shot.

CAMERA
Locked off at the panel's mid height, two panel-widths back, static the entire time, focus fixed on the panel.

ACTION
0.0s to 0.5s — the panel stands alone and completely still. 0.5s to 1.2s — the seagull strides in from the right and plants both feet beside the panel. 1.2s to 1.6s — he swings one wing across the panel in a single hard sweep and it breaks into four large black pieces that scatter across the ground. 1.6s to 4.0s — he stands over the pieces, chest puffed, holding still.

PERFORMANCE
The seagull moves with blunt certainty, no hesitation before the swing. His fixed brow stays set the whole time. Groomed feather detail visible at the chest edge.

PHYSICS
The panel has real mass: the pieces fall with weight, skid a short distance and stop. Contact shadows under the seagull and under every piece.

LIGHTING
Soft warm studio key from the upper left, gentle fill from the right, white balance 4000K, no hard specular hits.

STYLE
Premium animated feature-film quality, soft groomed feather textures, warm volumetric lighting, shallow depth of field. Palette strictly black #111111, warm cream #F5F0E8 and antique gold #C4A35A.

OUTPUT SETTINGS
Square 1:1, real-time speed throughout.

POSITIVE LOCKS
Only one panel exists in this clip and it breaks exactly once. The cream void stays completely empty apart from the seagull, the panel and its pieces. Every character and object keeps a contact shadow. The image stays free of any text, letters or logos.
```

*Taglio: 0,5s → 2,5s per la versione da 2s; 0,5s → 3,5s per quella da 3s.*

---

### A-ERASE — gomma, annulla, svuota la tela (falena)

```
SCENE CONTEXT
A single glowing gold outline floats in an empty cream void. The moth flies to it and quietly eats a section of it away.

ACTIVE REFERENCES
@moth — 100% matches the reference. Her cream pom-pom body and gold feathered antennae stay exactly as in the reference.

LOCATION MAP
Infinite clean cream void #F5F0E8, no walls and no horizon line. Midground: one single glowing antique-gold outline of a simple closed shape, floating at frame centre, roughly twenty moth-lengths across. Background: empty cream depth. Light comes from the upper left; the outline itself glows faintly onto the air around it.

FIRST FRAME / BLOCKING
Frame opens on the complete gold outline floating still at centre. The moth is out of frame at the top left at 0.0s and enters at 0.6s.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
MCU, 29° FOV, portrait compression, no drift for the whole shot.

CAMERA
Locked off, level with the floating outline, static the entire time, focus fixed on the outline.

ACTION
0.0s to 0.6s — the gold outline floats still and complete. 0.6s to 1.3s — the moth flutters in from the top left and settles on one segment of the outline. 1.3s to 2.2s — she calmly eats that segment away and the outline is left with a clean gap. 2.2s to 4.0s — she drifts a short way off and hovers, her belly glowing gold from inside.

PERFORMANCE
Total placidity: the moth never hurries and never reacts, as if this were the most ordinary thing in the world. Her black dot eyes stay calm and unchanged throughout.

PHYSICS
Wing beats move the air visibly around her. The eaten segment does not fall — it stops glowing and is simply gone. The remaining outline holds its position without sagging.

LIGHTING
Soft warm studio key from the upper left, white balance 4000K. The gold outline is the only emissive source and casts a faint warm bloom on the moth as she feeds.

STYLE
Premium animated feature-film quality, soft groomed textures, warm volumetric lighting, shallow depth of field. Palette strictly black #111111, warm cream #F5F0E8 and antique gold #C4A35A.

OUTPUT SETTINGS
Square 1:1, real-time speed throughout.

POSITIVE LOCKS
Only one outline exists in this clip and only one segment of it is eaten. The moth's belly glows gold from inside only after she has fed. The cream void stays completely empty apart from the moth and the outline. The image stays free of any text, letters or logos.
```

*Taglio: 0,6s → 2,6s (2s) o 0,6s → 3,6s (3s).*

---

### A-SWAP — sostituisci il file aperto (piccione)

```
SCENE CONTEXT
Two identical black objects sit side by side in an empty cream void. The pigeon, motionless, snaps awake and takes the place of the left one in a single instant.

ACTIVE REFERENCES
@pigeon — 100% matches the reference. His round cream body and heavy sleepy eyelids stay exactly as in the reference.

LOCATION MAP
Infinite clean cream void #F5F0E8, no walls and no horizon line. Midground: two identical upright black objects, each exactly the pigeon's height, standing a body-width apart at frame centre. The pigeon sits on the ground to the right of them. Light comes from the upper left.

FIRST FRAME / BLOCKING
Frame opens on both objects standing still and the pigeon already sitting to the right, eyes fully closed, body settled.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
MS, 47° FOV, neutral human perspective, no drift for the whole shot.

CAMERA
Locked off at object mid height, static the entire time, focus fixed across both objects.

ACTION
0.0s to 0.8s — everything holds completely still and the pigeon's eyes stay fully closed. 0.8s to 1.0s — his eyes snap open into a hyper-focused stare fixed on the left object. 1.0s to 1.4s — he launches in one instant, knocks the left object clean out of frame to the left and lands in its exact place. 1.4s to 4.0s — he settles, eyelids lowering back to sleepy, the right object untouched beside him.

PERFORMANCE
Ninety percent stillness, then one instant of total commitment. The stare between 0.8s and 1.0s is held hard and unblinking. The return to sleepy is slow and pleased.

PHYSICS
Real mass on the launch: the displaced object tips and travels with weight. The pigeon lands solidly and his body settles once. Contact shadows under the pigeon and both objects.

LIGHTING
Soft warm studio key from the upper left, gentle fill from the right, white balance 4000K.

STYLE
Premium animated feature-film quality, soft groomed feather textures, warm volumetric lighting, shallow depth of field. Palette strictly black #111111, warm cream #F5F0E8 and antique gold #C4A35A.

OUTPUT SETTINGS
Square 1:1, real-time speed throughout.

POSITIVE LOCKS
Exactly two objects exist at the start and one remains in frame at the end. The pigeon's eyes stay fully closed until 0.8s. The cream void stays completely empty apart from the pigeon and the objects. The image stays free of any text, letters or logos.
```

*Taglio: 0,4s → 2,4s (2s) o 0,4s → 3,4s (3s). Il beat dello sguardo deve
restare dentro il taglio: è la firma del personaggio.*

---

### A-REGRET — elimini un lavoro su cui hai lavorato a lungo (gatto)

```
SCENE CONTEXT
A single black artwork panel stands in an empty cream void. The cat is lying beside it. The panel vanishes and the cat watches the empty space where it stood.

ACTIVE REFERENCES
@cat — 100% matches the reference. His absurdly long low black body, cream paw tips and thin gold collar stay exactly as in the reference.

LOCATION MAP
Infinite clean cream void #F5F0E8, no walls and no horizon line. Foreground: bare cream ground. Midground: the cat lying stretched out full length across the lower frame, one single upright black artwork panel standing behind him at the left, exactly twice his lying height. Light comes from the upper left.

FIRST FRAME / BLOCKING
Frame opens on the cat already lying stretched out, head raised, eyes half-closed and directed at the panel behind him on the left.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
MS, 47° FOV, neutral human perspective, low angle close to ground level, no drift for the whole shot.

CAMERA
Locked off at the cat's eye height, static the entire time, focus fixed on the cat with the panel readable behind him.

ACTION
0.0s to 0.9s — the cat lies still, looking at the panel. 0.9s to 1.3s — the panel fades away cleanly and completely, leaving bare cream ground. 1.3s to 2.4s — the cat's eyes open a little wider as he looks at the empty space, then his head lowers slowly onto his front paws. 2.4s to 4.0s — he holds there, eyes on the empty ground, unmoving.

PERFORMANCE
Disappointment carried entirely in the eyes and the slow head lower — no exaggerated reaction, no sound, no turn to camera. The eyelids stay heavy and judging. Whisker and fur detail visible at the muzzle.

PHYSICS
The head lower has real weight and settles once. The cat's body stays flat and long against the ground. Contact shadow along the full length of his body.

LIGHTING
Soft warm studio key from the upper left, white balance 4000K, the empty ground where the panel stood evenly lit.

STYLE
Premium animated feature-film quality, soft fur and feather textures, warm volumetric lighting, shallow depth of field. Palette strictly black #111111, warm cream #F5F0E8 and antique gold #C4A35A.

OUTPUT SETTINGS
Square 1:1, real-time speed throughout.

POSITIVE LOCKS
Only one panel exists and it disappears exactly once. The cat stays lying down for the entire clip. The cream void stays completely empty apart from the cat and the panel. The image stays free of any text, letters or logos.
```

*Taglio: 0,7s → 3,7s. Questa è l'unica che vale sempre 3s: la delusione ha
bisogno del tempo di posarsi, a 2s sembra indifferenza.*

---

### A-WOW — scarichi un lavoro finito (gatto)

```
SCENE CONTEXT
A single black artwork panel stands in an empty cream void. The cat is lying beside it. A thin gold light passes across the panel and the cat's eyes open fully in genuine astonishment.

ACTIVE REFERENCES
@cat — 100% matches the reference. His absurdly long low black body, cream paw tips and thin gold collar stay exactly as in the reference.

LOCATION MAP
Infinite clean cream void #F5F0E8, no walls and no horizon line. Midground: the cat lying stretched out full length across the lower frame, one single upright black artwork panel standing behind him at the left, exactly twice his lying height. Light comes from the upper left.

FIRST FRAME / BLOCKING
Frame opens on the cat lying stretched out, head raised, eyes half-closed and directed at the panel behind him on the left.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
MCU, 29° FOV, portrait compression on the cat's head with the panel readable behind, no drift for the whole shot.

CAMERA
Locked off at the cat's eye height, static the entire time, focus fixed on the cat's face.

ACTION
0.0s to 0.8s — the cat lies still, eyes half-closed on the panel. 0.8s to 1.4s — a thin antique-gold light sweeps once across the face of the panel from left to right. 1.4s to 2.0s — the cat's eyes open completely wide, fully round, held. 2.0s to 4.0s — he stays exactly like that, wide-eyed and motionless, ears lifted.

PERFORMANCE
This is the one moment the judging expression breaks: the eyes go from heavy-lidded to fully round and stay there. No smile, no movement of the body, no turn to camera — the astonishment is entirely in the eyes and the lifted ears. Bright catch-lights land in both fully open eyes at 1.4s and hold.

PHYSICS
The gold sweep is a light pass only: the panel is not moved, marked or changed by it. Contact shadow along the full length of the cat's body.

LIGHTING
Soft warm studio key from the upper left, white balance 4000K. The gold sweep briefly adds a warm rim along the cat's muzzle as it passes.

STYLE
Premium animated feature-film quality, soft fur textures, warm volumetric lighting, shallow depth of field. Palette strictly black #111111, warm cream #F5F0E8 and antique gold #C4A35A.

OUTPUT SETTINGS
Square 1:1, real-time speed throughout.

POSITIVE LOCKS
The cat's eyes stay half-closed until 1.4s, then stay fully open for the rest of the clip. Only one panel exists and one single gold sweep passes across it. The cream void stays completely empty apart from the cat and the panel. The image stays free of any text, letters or logos.
```

*Taglio: 0,6s → 2,6s. Lo sguardo spalancato deve essere l'ultimo fotogramma: è
lì che il taglio deve fermarsi, non dopo.*

---

### A-ANT — passa e se ne va (formica)

```
SCENE CONTEXT
An empty cream void. The ant walks in from the left, crosses the frame at an even pace and walks out on the right without stopping.

ACTIVE REFERENCES
@ant — 100% matches the reference. Her tiny black body and butler posture stay exactly as in the reference.

LOCATION MAP
Infinite clean cream void #F5F0E8, no walls and no horizon line. Foreground: bare cream ground filling the lower third. Midground and background: empty cream depth. Light comes from the upper left.

FIRST FRAME / BLOCKING
Frame opens on completely empty cream ground. The ant is out of frame on the left at 0.0s and enters at 0.4s.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
WS, 84° wide FOV, low angle right down at ground level so the ant reads clearly against the empty depth, no drift for the whole shot.

CAMERA
Locked off at ground level, static the entire time, focus fixed on the ground plane.

ACTION
0.0s to 0.4s — empty cream ground, nothing moves. 0.4s to 3.2s — the ant walks in from the left and crosses the frame at a steady unhurried pace, carrying nothing, looking straight ahead the whole way, and exits on the right. 3.2s to 4.0s — empty cream ground again, nothing moves.

PERFORMANCE
Perfect composure and zero facial expression, exactly as in the reference. She never looks at camera, never pauses, never changes speed. The walk is even from the first step to the last.

PHYSICS
Each leg makes real contact with the ground and the body carries a small natural bob. Contact shadow travels with her across the whole crossing.

LIGHTING
Soft warm studio key from the upper left, white balance 4000K, even exposure across the ground plane.

STYLE
Premium animated feature-film quality, warm volumetric lighting, shallow depth of field. Palette strictly black #111111, warm cream #F5F0E8 and antique gold #C4A35A.

OUTPUT SETTINGS
Square 1:1, real-time speed throughout.

POSITIVE LOCKS
The ant carries nothing and stays empty-handed for the entire crossing. The clip opens and closes on the same empty cream ground so it loops seamlessly. The cream void stays completely empty apart from the ant. The image stays free of any text, letters or logos.
```

*Taglio: nessuno — questa vale intera, e i fotogrammi vuoti all'inizio e alla
fine servono a farla entrare e uscire senza stacco.*

---

### A-ZACK-1 — premi il tasto Zack: «lo faccio io»

```
SCENE CONTEXT
Zack stands alone in an empty cream void. He takes the gold feather from his head, draws one arc in the air, and a finished black object solidifies on the ground.

ACTIVE REFERENCES
@zack — 100% matches the reference. His half-lidded deadpan eyes, flat cream beak and gold head feather stay exactly as in the reference.

LOCATION MAP
Infinite clean cream void #F5F0E8, no walls and no horizon line. Foreground: bare cream ground. Midground: Zack standing centred, facing camera. Background: empty cream depth. Light comes from the upper left.

FIRST FRAME / BLOCKING
Frame opens on Zack already standing centred and still, facing camera, the gold feather on his head, the ground in front of him empty.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
MS, 47° FOV, neutral human perspective, no drift for the whole shot.

CAMERA
Locked off at Zack's chest height, static the entire time, focus fixed on Zack.

ACTION
0.0s to 0.5s — Zack stands still, facing camera. 0.5s to 1.0s — he takes the gold feather off his head and grips it firmly in his wing. 1.0s to 2.0s — he draws one single arc in the air in front of him with the narrow tapered tip end; a glowing antique-gold light-trail follows the tip and forms only the outline of one simple object, which solidifies instantly into a solid black object resting on the ground, slightly lopsided. 2.0s to 4.0s — he looks straight into camera and holds completely still, the feather still in his wing.

PERFORMANCE
His eyes stay half-lidded and deadpan the entire time, they never open wider and he never smiles. One slow blink between 2.5s and 3.0s. The draw is unhurried, almost bored. Groomed feather detail on the body, soft catch-lights in both eyes.

PHYSICS
The feather stays gripped in the wing for the whole draw and never floats free. The solidified object lands with real weight and settles once. Contact shadows under Zack and under the object.

LIGHTING
Soft warm studio key from the upper left, gentle fill from the right, white balance 4000K. The gold light-trail briefly adds a warm rim along the drawing wing.

STYLE
Premium animated feature-film quality, soft groomed feather textures, warm volumetric lighting, shallow depth of field. Palette strictly black #111111, warm cream #F5F0E8 and antique gold #C4A35A.

OUTPUT SETTINGS
Square 1:1, real-time speed throughout.

POSITIVE LOCKS
Only one gold feather exists and it stays gripped in Zack's wing from 1.0s to the end. The trail forms only the outline of the object being drawn. Only one object is created. The cream void stays completely empty apart from Zack and that object. The image stays free of any text, letters or logos.
```

*Taglio: 0,3s → 3,3s. È la clip più lunga della famiglia perché contiene due
azioni: se serve la versione da 2s, si taglia 0,8s → 2,8s e si perde la presa
della piuma, che è comunque implicita.*

**A-ZACK-2 e seguenti**: stessa struttura, cambia solo il blocco ACTION. Tre
varianti già pensate, da generare quando servono — una premuta ripetuta che mostra
sempre la stessa clip stanca prima delle altre:

- **A-ZACK-2 «ne fa quattro»** — un solo arco, e quattro oggetti identici si
  solidificano in fila. Regola: `Exactly four objects appear, no fifth object ever
  appears.`
- **A-ZACK-3 «sbaglia e tiene»** — disegna, l'oggetto esce chiaramente storto, lui
  lo guarda, poi guarda in camera e non lo corregge.
- **A-ZACK-4 «già fatto»** — l'oggetto è già finito a terra quando la clip si apre;
  Zack rimette la piuma in testa e guarda in camera. È quella per quando il tasto
  Zack non ha niente da fare.

---

## 4. Ordine di generazione

Ogni riga è utile da sola. Se ci si ferma alla seconda, quello che è stato
generato è già in produzione.

| | clip | perché prima |
|---|---|---|
| 1 | **A-ZACK-1** | è il tasto che stiamo costruendo: senza questa il tasto Zack è muto |
| 2 | **A-DEL**, **A-ERASE** | cancellare è l'azione che spaventa: è lì che un avviso vale |
| 3 | **A-WOW** | premia il download, cioè il momento in cui l'utente ha finito |
| 4 | **A-SWAP**, **A-REGRET** | completano il linguaggio |
| 5 | **A-ANT** | è un regalo, non una funzione: arriva quando il resto funziona |
| 6 | **A-ZACK-2…4** | la libreria che cresce nel tempo |

**Generare A-ZACK-1 e A-DEL per prime e guardarle nel riquadro vero, tagliate a
2s.** Una clip che convince a 4 secondi su Higgsfield e non funziona a 2 in un
riquadro da 512 px è una lezione che costa due generazioni se la si impara subito.
