# Le iconcine del cast — prompt pronti da incollare

> Terzo compagno di [zack-asset-plan.md](zack-asset-plan.md) (landing, tutorial,
> stati vuoti) e [zack-animazioni-cast.md](zack-animazioni-cast.md) (le clip che
> reagiscono alle azioni). Qui ci sono solo **immagini ferme piccole**.
>
> Canone: `~/Desktop/dax the duck/zack-series-bible.md`. Valgono tutte le regole
> di scrittura §4 senza eccezioni. **Le generazioni le lancia il committente.**

---

## 0. Perché questa famiglia esiste, e perché adesso

Tre buchi misurati oggi, 2026-08-27:

1. **Il cast non esiste come asset.** In `public/zack/` ci sono sette file e sono
   **tutti Zack**. Piccione, Gabbiano, Falena, Gatto e Formica hanno un canone
   scritto, prompt di animazione pronti — e zero pixel. Tutta la tesi di
   marketing («Zack è la campagna, non la mascotte») poggia su un cast che nel
   prodotto non si è mai visto.
2. **Le clip del cast non hanno un fermo immagine.** `zack-animazioni-cast.md` §0
   dice: *«sotto `prefers-reduced-motion` non parte nessuna di queste: resta un
   fermo immagine»*. Quel fermo immagine non è mai stato prodotto. Oggi chi
   spegne le animazioni non vede un'alternativa: non vede niente.
3. **Le otto icone delle cartelle sono astratte** — `cartella`, `maglietta`,
   `personaggio`, `stella`, `fuoco`, `occhio`, `tag`, `cerchio`: tratti a filo
   d'oro, giusti come sistema ma anonimi. Sono anche le icone dei **documenti**
   in Brain, cioè la cosa che distingue venti `.md` a colpo d'occhio.

Una famiglia sola risolve tutti e tre, perché è **lo stesso asset a tre misure**.

---

## 1. La regola che tiene insieme tutto: un'icona non è una scena

La differenza rispetto alle altre due famiglie non è la durata, è **la distanza
di lettura**. Un hero si guarda a schermo intero; un'icona si legge a 24 px in
una colonna di otto.

Da cui tre vincoli che valgono per ogni prompt qui sotto:

- **Un personaggio solo, mai due.** A questa misura due sagome nere diventano una
  macchia sola.
- **Silhouette prima del dettaglio.** Il personaggio va riconosciuto dal
  contorno: la piuma di Zack, il petto del Gabbiano, la lunghezza del Gatto.
  Se serve guardare gli occhi per capire chi è, il prompt è sbagliato.
- **Nessun oggetto di scena, salvo uno.** E quando c'è, è **alto quanto il
  personaggio**: a 24 px un oggetto piccolo sparisce e basta.

E una regola di prodotto che non è negoziabile, già scritta altrove ma qui vale
doppio: **il personaggio non è mai l'unico segnale.** Queste icone stanno
*accanto* a una parola, mai al posto suo. È la ragione per cui la barra degli
strumenti sul telefono ha riavuto i nomi sotto le icone (2026-08-27).

---

## 2. Header standard per le still

Da mettere in testa a ogni prompt di questa famiglia. È l'header still di
`zack-asset-plan.md` §6 con due aggiunte: la posa centrata e il vuoto attorno.

```
Premium 3D animated feature-film still, square 1:1, soft groomed feather textures, warm volumetric lighting, shallow depth of field. SETTING: infinite clean cream void (#F5F0E8), contact shadows under every character and object. PALETTE: only black #111111, warm cream #F5F0E8, antique gold #C4A35A. The character is centered in frame, shot straight-on at eye level, full body inside the frame with generous empty cream margin on all four sides. Simple readable silhouette, no props unless stated. ABSOLUTELY NO TEXT, NO LETTERS, NO LOGOS.
```

**Il margine generoso non è estetica, è ritaglio.** Lo stesso file viene poi
ridotto a 24 px: se il personaggio tocca i bordi, a quella misura tocca anche il
bordo del pulsante, e sembra un errore di impaginazione.

---

## 3. I — il cast, sei ritratti

La famiglia base. Da questi sei escono tutti gli altri usi.

| id | personaggio | corpo del prompt |
|---|---|---|
| **I-ZACK** | Zack | ZACK stands facing camera, his gold feather still on his head, both wings relaxed at his sides, eyes half-lidded and deadpan. |
| **I-PIGEON** | Piccione | The PIGEON stands facing camera, completely still, eyes fully closed, settled low on its feet like it has been there for hours. |
| **I-SEAGULL** | Gabbiano | The SEAGULL stands facing camera at full height, chest puffed out to its maximum, looking down slightly toward the lens. |
| **I-MOTH** | Falena | The MOTH hovers in the center of the frame with its wings mid-beat, its belly glowing faintly gold from within, tiny black dot eyes calm. |
| **I-CAT** | Gatto | The CAT stands in full profile facing left, its whole absurdly long low body inside the frame, head turned to look straight into camera, eyes half-closed and judging. |
| **I-ANT** | Formica | The ANT stands facing camera in perfect butler posture, holding nothing, completely expressionless. |

**Sul Gatto, e vale la pena dirlo:** è l'unico in profilo. Non è un capriccio —
un gatto lungo cinque e alto uno, visto di fronte, è un punto nero. La sua
silhouette *è* la lunghezza, e la lunghezza si vede solo di lato.

**Sulla Falena:** è grande quanto l'occhio di Zack. In un ritratto suo, da sola,
riempie il quadro come gli altri: la scala è relativa alla scena, e qui la scena
è lei. Non chiedere «tiny» nel prompt o esce un puntino dentro un campo panna.

---

## 4. R — i fermi immagine delle clip

Il fotogramma che resta quando `prefers-reduced-motion` è acceso. **Non è il
ritratto:** è il momento dell'azione, congelato — deve dire cosa è successo, non
chi c'è.

Stessa mappa di [zack-animazioni-cast.md](zack-animazioni-cast.md) §1, un fermo
per clip.

| id | sostituisce | corpo del prompt |
|---|---|---|
| **R-DEL** | A-DEL, elimini un lavoro | The SEAGULL faces camera at full height, one wing raised and closed around a single flat black rectangle exactly the height of ZACK, holding it away from the lens. |
| **R-ERASE** | A-ERASE, gomma o annulla | The MOTH hovers in the center, wings mid-beat, one short broken antique-gold light-trail floating in the air beside her with a clean bite missing from its middle. |
| **R-SWAP** | A-SWAP, cambi file | The PIGEON stands facing camera, eyes fully open in a fixed hyper-focused stare, standing on top of a single flat black rectangle exactly the height of ZACK. |
| **R-REGRET** | A-REGRET, cancelli lavoro lungo | The CAT stands in full profile facing left, head lowered toward one single flat black rectangle lying flat on the ground, eyes half-closed. |
| **R-WOW** | A-WOW, scarichi un lavoro | The CAT stands in full profile facing left, head turned to camera, eyes COMPLETELY OPEN and wide in genuine wonder — this is the only image in the entire set where any character's eyes are fully open. |
| **R-ANT** | A-ANT, il regalo raro su Brain | The ANT walks calmly across the frame from left to right in perfect butler posture, carrying one single flat black rectangle above its head, not looking at the camera. |
| **R-ZACK** | A-ZACK, premi il tasto Zack | ZACK stands facing camera holding his gold feather in his wing with the narrow tapered tip pointing forward, one short antique-gold light-trail already glowing in the air in front of the tip, eyes half-lidded and deadpan. |

**R-WOW è l'eccezione, e va protetta.** Gli occhi completamente aperti sono
l'espressione più rara della serie: se compaiono anche altrove, non significano
più niente. È scritto nel prompt in maiuscolo apposta.

**Su R-ZACK e la piuma:** regola 2 del potere. «*his gold feather*», tenuta
stretta nell'ala, punta appuntita in avanti. Mai «quill», mai «pen», mai «nib»,
mai fluttuante.

---

## 5. F — le icone delle cartelle e dei documenti

Le otto astratte restano: **queste si aggiungono, non sostituiscono.** Un utente
che ha già etichettato quaranta cartelle con la stella non deve ritrovarsi il
Gabbiano al suo posto.

Sono **le stesse sei di §3**, esportate a misura di icona (vedi §7). L'unico
lavoro in più è il ritaglio quadrato stretto: per `I-CAT` il quadrato va preso
sulla testa, non sul corpo intero, o a 24 px resta una riga orizzontale.

Cosa significano, se qualcuno lo chiede — ed è una proposta, non una regola:

| icona | senso naturale |
|---|---|
| Zack | il lavoro tuo, quello che stai facendo |
| Piccione | roba che aspetta, ferma da un po' |
| Gabbiano | roba grossa, importante, o da consegnare |
| Falena | bozze, cose ancora in movimento |
| Gatto | il portfolio, la roba buona |
| Formica | archivio, cose finite e messe via |

Non scrivere questi significati nell'interfaccia. Se hanno senso, l'utente ce li
mette da solo; se glieli spieghi, hai aggiunto una tassonomia da imparare.

---

## 6. E — i due stati vuoti che mancano

Chiudono la famiglia `E-*` di [zack-asset-plan.md](zack-asset-plan.md) §6. Ne
mancano due su sei: verificato in `public/zack/`, 2026-08-27.

| id | schermata | corpo del prompt |
|---|---|---|
| **E-BRAIN** | tela di Brain vuota | ZACK sits on the ground surrounded by five small flat black rectangles arranged in a loose circle around him, looking into camera, eyes half-lidded and deadpan. |
| **E-VID** | Video «presto» | ZACK sits patiently beside a stack of three identical flat black rectangles, looking into camera, eyes half-lidded and deadpan. |

Ho cambiato «objects» in «flat black rectangles» rispetto al piano originale: su
«objects» il modello inventa forme diverse a ogni generazione, e sei stati vuoti
con sei geometrie diverse non sembrano una famiglia.

---

## 7. Formati, pesi e dove finiscono

Stessa disciplina di `zack-asset-plan.md` §1: **obiettivi di budget, non misure.**
Vanno verificati con `ls -l` sul file vero e corretti qui.

| famiglia | formato | risoluzione | obiettivo | dove |
|---|---|---|---|---|
| **I-\*** ritratti | WebP | 512×512 | ≤ 40 KB | `public/zack/cast/` |
| **I-\*** icone | WebP | 96×96 | ≤ 6 KB | `public/zack/cast/` |
| **R-\*** fermi | WebP | 512×512 | ≤ 45 KB | `public/zack/fermi/` |
| **E-\*** stati vuoti | WebP | 800×800 | ≤ 80 KB | `public/zack/` |

**Due misure per lo stesso ritratto, e non è pigrizia**: a 512 px ridotto a 24
dal browser il filtro impasta le piume e il personaggio diventa una macchia. La
copia a 96 px va rigenerata dall'originale con un ridimensionamento controllato,
non lasciata fare al `width` del CSS.

Generatore consigliato: **Nano Banana Pro**, partendo dalla character sheet come
riferimento — sono still, non serve un modello video.

---

## 8. Ordine di generazione

Non tutti insieme: ogni blocco va provato *nel prodotto* prima di pagare il
successivo. È la stessa lezione dei suoni e del filmato — quello che non è stato
usato non è finito, è solo generato.

1. **I-ZACK e I-CAT.** I due estremi della difficoltà: uno è il protagonista già
   collaudato, l'altro è la silhouette più difficile della serie. Se reggono
   entrambi a 24 px, il resto della famiglia regge.
2. **R-ZACK e R-WOW.** I due fermi che si vedranno di più: uno a ogni pressione
   del tasto Zack, l'altro a ogni scaricamento.
3. **E-BRAIN e E-VID**, che chiudono una famiglia già mezza costruita.
4. **Gli altri quattro ritratti**, e solo dopo i fermi restanti.

---

## 9. Cosa NON farei con questa famiglia

- **Non animarle.** Esistono perché le animazioni non sempre si possono mostrare.
  Un'icona che si muove è una clip, e le clip hanno già la loro famiglia.
- **Non metterle nel favicon.** L'icona dell'app è il marchio (`B-*`), e cambiarla
  in base al personaggio significa che l'utente non ritrova più la scheda.
- **Non generare pose nuove per ogni schermata.** Sei ritratti e sette fermi sono
  tredici immagini: bastano. La tentazione di farne una apposta per ogni caso è
  il modo in cui una libreria di asset diventa ingestibile in tre mesi.
- **Non farli parlare, non farli sorridere.** Regola 5 della bibbia. Vale anche
  a 24 px, dove peraltro non si vedrebbe — ma un asset fuori canone prima o poi
  finisce in un posto dove si vede.
