# Da 3D a 2D senza snaturarli — i prompt del cast

Il cast esiste in 3D: `~/Desktop/zack the duck/characters/`. Serve in 2D per
le iconcine, le grafiche da stampa e tutto ciò che a 32 px in 3D diventa una
macchia.

**Il problema non è descrivere i personaggi.** Il prompt che ha creato Zack in
2D partiva da zero e funzionava perché Zack in 2D *non esisteva ancora*. Ora
esistono in 3D, e un prompt che riparte da zero produce un cugino: stessa
descrizione, altro personaggio.

---

## 1. La regola: cosa sopravvive e cosa si traduce

Un cambio di medium non è una copia. Va deciso, per ogni tratto, se è
**identità** (sopravvive intatto) o **resa** (si traduce).

| | 3D | 2D |
|---|---|---|
| **IDENTITÀ — non si tocca** | | |
| proporzioni | testa ~45% dell'altezza, niente collo | identiche |
| sagoma | la silhouette riconoscibile a controluce | identica |
| segni | piuma d'oro, piede panna, becco | identici, stesso posto |
| sguardo | palpebre pesanti, pupille disallineate | identico |
| palette | nero #111111, panna #F5F0E8, oro #C4A35A | identica |
| **RESA — si traduce, non si copia** | | |
| materiale | feltro infeltrito, peluria vera | grana acquerellata dentro il colore |
| luce | tre luci da studio, ombre morbide | **una** luce calda in alto a sinistra |
| volume | resa fisica | cel shading: una tinta base, **una** ombra |
| bordo | sfocatura della peluria | lineart pulita a spessore variabile |
| fondo | fondo cinematografico | panna piatto, molto spazio negativo |

**La prova che è riuscito:** metti il 2D accanto al 3D e li riconosci come lo
stesso personaggio in due mestieri diversi, non come due personaggi simili. Se
devi guardare due volte per capire chi è, il prompt ha fallito.

⚠️ **Il tranello del feltro.** Tutti questi personaggi in 3D sono infeltriti:
è il tratto che li rende teneri. Chiedere «felted wool texture» in 2D produce
puntini, e i puntini a 32 px diventano sporco. Si chiede **la morbidezza del
BORDO**, non la trama della superficie: `soft slightly irregular outline as if
drawn around something plush`.

---

## 2. Come si usa

**Sempre con l'immagine 3D come riferimento**, mai a parole soltanto. Le parole
qui sotto servono a dire al modello *cosa cambiare*, non *cosa disegnare* —
il cosa ce l'ha già davanti.

```
[immagine di riferimento: characters/<file>.png]
+ BLOCCO STILE (§3, identico per tutti)
+ BLOCCO IDENTITÀ del personaggio (§4)
```

---

## 3. Il blocco stile — identico per tutti e sei

> Redraw the referenced 3D character as official 2D collectible-creature
> artwork. Keep the character's exact proportions, silhouette, markings and
> expression from the reference — this is the same character in a different
> medium, not a reinterpretation.
>
> Confident clean lineart with variable line weight, slightly softened outline
> as if drawn around something plush. Crisp cel shading: one base tone plus a
> single darker shadow tone per colour, with soft watercolour-like gradients
> inside each shape. One warm light source from the upper left; a single soft
> highlight on the head and on the belly. No cast shadow on the ground.
>
> Plain warm cream background (#F5F0E8), generous negative space, character
> centred and fully inside frame. Palette strictly limited to deep black
> #111111 and its tonal shades, warm cream #F5F0E8, and antique gold #C4A35A.
> No other hues, no saturated colours, no gradient background, no text, no
> ground line.

**Negativo, da tenere sempre:** `no felted fibre texture, no photographic
detail, no studio lighting, no drop shadow, no outline glow, no extra
accessories, no additional characters.`

---

## 4. I sei blocchi di identità

Ognuno nomina **solo ciò che il modello sbaglia se non glielo dici**. Il resto
lo legge dal riferimento.

### Zack — `characters/zack.png`

> A small chubby black duckling. Oversized head merging into the body with no
> neck. Wide flat cream beak, slightly downturned at rest. Large oval cream
> eyes with heavy half-closed eyelids and small dot pupils slightly
> misaligned — an unimpressed deadpan stare, never friendly, never angry.
> **One single antique-gold quill feather standing up on top of his head,
> always tilted to his left.** Right foot warm cream as if dipped in paint,
> left foot black — this asymmetry is deliberate and must be kept.

⚠️ I tre errori che fa sempre: due piume invece di una, la piuma dritta invece
che inclinata, e i due piedi dello stesso colore.

### Piccione — `characters/pigeon.png`

> A very round cream-white pigeon, almost spherical, tiny head, no visible
> neck. Small dark beak, small round black eyes with no visible eyelid. Short
> black legs and feet. Layered feather scallops on the wings, suggested with a
> few curved lines only, not drawn feather by feather.

⚠️ **È panna su panna.** In 2D il contorno deve reggere da solo: se sparisce,
sparisce il personaggio. Chiedere `outline clearly darker than the body fill`.

### Gabbiano — `characters/seagull.png`

> A plump cream-grey seagull with a heavy rounded body and a small head.
> **Strong black hooked beak** — the beak is the character's signature and is
> much darker than the body. Black legs and webbed feet. Permanently
> disapproving expression, brow low over the eye.

⚠️ Diverso dal piccione **per il becco e per il cipiglio**, non per la
corporatura. Se il becco si schiarisce, diventa un piccione grosso.

### Falena — `characters/falena.png`

> A fuzzy cream-and-tan moth with a round plush body. **Large feathery
> antennae, drawn as two soft combed plumes**, the single most recognisable
> feature. Big round dark eyes, gentle and wide open — the only member of the
> cast whose eyes are not half-closed. Broad rounded wings with soft darker
> mottling suggested by two or three tonal patches, never by many small marks.

⚠️ Le macchie delle ali vanno **semplificate a tre chiazze**: molte macchioline
a 32 px diventano rumore.

### Formica — `characters/ant.png`

> A small glossy black ant standing upright on thin legs. Three clear body
> segments, two thin antennae. **Always carrying something far too big for
> her** — bread, a croissant, a golden cup — held overhead with both front
> legs. The load is part of the character.

⚠️ È l'unica **lucida** del cast: unico riflesso netto sul torace, non peluria.

### Gatto — `zack assets app/icat.png`

> A very long low black cat, dachshund-proportioned: short legs, extremely
> elongated body, long thin tail. Small triangular ears, thin white whiskers,
> narrow half-closed eyes. Drawn in profile, because the length is the joke and
> from the front it disappears.

⚠️ **Il formato è orizzontale.** Costringerlo in un quadrato lo accorcia e gli
toglie l'unica battuta che ha.

---

## 5. Il blocco per le grafiche da stampa

Quello già in uso dal committente, con l'aggiunta che serve ora: il 2D del
personaggio va **passato come riferimento**, non ridescritto.

> [reference: the 2D character sheet produced above]
>
> Hand-drawn watercolour-and-cel illustration, clean lineart with variable
> weight, crisp cel shading, soft watercolour tonal gradients. Centred
> composition isolated on a plain warm cream background with generous negative
> space. Premium t-shirt print graphic. No background scenery.

---

## 6. L'ordine in cui li farei

1. **Zack**, e non si va avanti finché non è giusto. È il metro: gli altri
   cinque devono sembrare disegnati dalla stessa mano il giorno dopo;
2. **Formica** e **Gatto** — i più semplici, silhouette forte, poche tinte.
   Confermano che lo stile regge;
3. **Falena** — la più complessa (antenne, ali);
4. **Piccione** e **Gabbiano** per ultimi, **insieme**: si somigliano, e vanno
   giudicati affiancati o si scopre solo dopo che sono lo stesso uccello.

**Una posa sola per personaggio, di fronte, neutra.** Le espressioni e le pose
vengono dopo, dal 2D approvato — mai dal 3D, o si riparte da capo ogni volta.

---

## 7. Dove finiscono

Stesse regole di [2026-08-27-iconcine-cast.md](2026-08-27-iconcine-cast.md), e
si preparano con lo script che c'è già:

```bash
node scripts/prepara-assets.mjs <cartella>
```

I nomi contano: `izack.png`, `ipigeon.png`, `iseagull.png`, `imoth.png`,
`icat.png`, `iant.png` — lo script li riconosce da quelli e li porta a 512 e
96 px in `public/zack/cast/`.

⚠️ Per il 2D, però, **si può scontornare**: una tinta piatta dà `uniformita`
alta anche sui personaggi panna, che in 3D era il problema (il piccione stava a
0.64). Vale la pena rimisurarlo quando ci sono i file: se sale sopra 0.90, il
cast in 2D può stare sulla pagina **senza il cerchio**.
