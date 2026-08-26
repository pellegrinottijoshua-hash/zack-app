# Prompt NBP per la tavola dei tasti — e perché non li useremo nell'app

> Richiesto il 2026-08-26. Il prompt c'è, in fondo. Prima la ragione per cui
> **lo stile è già stato fatto in CSS** e i ritagli non entreranno
> nell'interfaccia.

## Perché non ritagliamo i tasti

Lo stile che hai descritto — nero, contorno bianco, scritta in grassetto,
sopra il bianco diventa oro — è già in produzione (`styles.css`, sezione «IL
TASTO JAYL»), scritto una volta e valido su **tutti** i tasti insieme. Un tasto
ritagliato da un'immagine, invece:

- **non si traduce.** L'interfaccia è in italiano e inglese, con un test che
  fallisce se una chiave esiste in una lingua sola. «SCONTORNA» e «CUT OUT»
  sarebbero due immagini, e ogni testo nuovo una generazione;
- **non si adatta.** Un'etichetta più lunga esce dal riquadro o si rimpicciolisce;
- **non ha stati.** Disabilitato, acceso, in attesa, fuoco da tastiera: sono
  quattro immagini in più per ogni tasto, o quattro cose che non funzionano;
- **pesa.** Un PNG di un tasto sta sui 15-40 KB; la regola CSS che li fa tutti
  sta in poche centinaia di byte. Su quaranta tasti è la differenza fra una
  pagina che apre subito e una che aspetta;
- **sfoca.** Ritagliato per uno schermo, su un altro è morbido. Il vettore no.

**Il marchio non sta nei pixel del tasto: sta nel nero, nel bordo panna, nel
grassetto spaziato e nell'oro che arriva al passaggio.** Quelli ci sono già, e
si cambiano tutti insieme cambiando una riga.

## Dove invece una tavola generata serve davvero

Non nell'app: **nella pagina di presentazione e nei social**. Lì un'immagine di
tasti che non fa niente è esattamente ciò che serve — un pezzo di grafica che
mostra com'è fatto lo studio senza doverlo aprire. Il prompt qui sotto è
scritto per quello.

---

## Il prompt

Modello: **Nano Banana Pro**. Formato 16:9. Da incollare così com'è.

```
A flat 2D UI component sheet on a solid near-black background (#111111), presented as a clean design-system specification board, no perspective, no 3D, no mockup device, straight-on orthographic view.

LAYOUT: a neat grid of rectangular user-interface buttons, 4 columns by 3 rows, evenly spaced with generous even gutters, all buttons exactly the same height, each button width fitted to its own label.

BUTTON STYLE — identical for every button: solid near-black fill (#111111), a crisp 1px warm off-white outline (#F5F0E8), sharp square corners with no rounding, and a centred label in a bold geometric grotesque sans-serif, warm off-white (#F5F0E8), uppercase, generously letter-spaced.

THE LABELS, one per button, spelled exactly: BRAIN, SCONTORNA, VETTORIALIZZA, EDITOR SVG, SUONO, NOTA, GRUPPO, FRECCIA, CENTRA TUTTO, ZACK, ESPORTA, AVANZATI.

THE HOVER STATE: the three buttons labelled ZACK, BRAIN and NOTA are shown in their hover state instead — same near-black fill, but the outline and the label are antique gold (#C4A35A), and a very faint gold glow sits just inside the outline.

PALETTE: strictly near-black #111111, warm off-white #F5F0E8 and antique gold #C4A35A. Nothing else.

Even, flat, shadowless studio lighting. Crisp edges, pixel-sharp text, high resolution, no noise, no grain, no gradients on the background.
```

### Note su come leggerlo

- **I testi vanno controllati uno per uno.** I modelli sbagliano le parole
  lunghe: «VETTORIALIZZA» è quella a rischio. Se esce storta, si rigenera solo
  quella riga con un prompt più corto.
- **Se serve la versione inglese**, sostituire le etichette: BRAIN, CUT OUT,
  VECTORISE, SVG EDITOR, SOUND, NOTE, GROUP, ARROW, CENTRE ALL, ZACK, EXPORT,
  ADVANCED.
- **Per una tavola sola con Zack accanto**, aggiungere in coda: *«ZACK the
  black duck character stands at the right edge of the board, one wing resting
  on the frame, looking straight at camera, eyes half-lidded and deadpan»* — e
  usare l'Element del personaggio, senza descriverlo oltre.

Se dopo averla vista la vuoi comunque dentro l'app, dimmelo: si può fare, e la
prima cosa da decidere sarà quale delle due lingue perdiamo.
