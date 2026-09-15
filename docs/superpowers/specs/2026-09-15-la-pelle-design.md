# Fase 1 — La pelle: l'app diventa quella disegnata

> Spec. Le decisioni vengono dal [quaderno delle bozze](../../2026-09-14-bozze-servizi.md)
> (sezioni T, H, S, E0, E1) e non si ridiscutono qui: qui si scrive **cosa
> costruire e cosa no**.
>
> Le fasi successive stanno nella [scaletta](../../2026-09-15-scaletta.md).

**L'obiettivo in una riga:** scontorna diventa gratis per tutti, la home e lo
studio prendono la forma disegnata, e sparisce tutto quello che il committente ha
crociato.

---

## 1. I tre livelli

La lista chiusa `SERVE` passa da due valori a tre: **`niente`**, `abbonamento`,
`saldo`.

| Servizio | Serve | Perché |
|---|---|---|
| scontorna | **niente** | Gira sul computer del cliente: regalarlo non ci costa. |
| brain | **niente** | È la libreria: chiudere fuori qualcuno dai suoi file non ha senso. |
| vettoriale, effetti | abbonamento | Girano in locale, e sono ciò che l'abbonamento vende. |
| vocale | abbonamento *(per ora)* | Oggi gira in locale. Passerà a `saldo` nella fase della voce, non qui. |
| immagine | saldo | Chiama un fornitore che ci addebita. |

**Conseguenza da verificare esplicitamente:** con `niente`, il muro non compare
**mai** per scontorna e brain, nemmeno a muro acceso (`VITE_MURO=1`), nemmeno a
chi non è mai entrato.

## 2. La home dell'app

- In basso tre cerchi: **scontorna al centro e più grande**, **immagine a
  sinistra**, **video a destra**. Video è ancora spento: il cerchio c'è e dice
  che arriva, non finge di funzionare.
- Sopra: **mascotte in basso a sinistra**, **tasto Zack in basso a destra**.
- Al centro **il +**.
- In alto: **Brain a sinistra**. A destra resta la libreria di oggi, finché la
  fase del pocket non la sostituisce.
- **I crediti non si vedono.** Né in home né in scontorna. Si vedono dentro
  immagine (e, quando ci sarà, video).

## 3. Scontorna, ripulito

**Spariscono:** i crediti in alto a sinistra, la barra «fatto», la scritta
«scontornato», la mascotte appena c'è un file sul piano.

**Il +**: quando entra un file si sposta **a sinistra del file** (l'uscita starà
a destra, nella fase dell'icona output: il piano si legge «entra da sinistra,
esce a destra»). **Con tre file il + sparisce.**

**La colonna destra non esiste prima di Zack.** Dopo lo scontorno compaiono:
**download, righello, penna, indietro, avanti**.

**Il tasto oro** tiene solo: **rapido, qualità, x2, x4, :2, :4, togli sfondo,
download**.

## 4. La pianta dello studio

- **I servizi in alto**, in fila, sempre visibili.
- **Brain a sinistra**: un'icona che, premuta, apre **il suo canva a parte**.
- **Gli strumenti del servizio a destra**, dove sono adesso.
- **Il tasto Zack in basso al centro.**
- Il pocket, quando arriverà, sta in alto a destra.

## 5. I gesti

**Due dita muovono e ingrandiscono, un dito lavora.** In tutti i servizi, con la
stessa regola — è la condizione perché la penna e lo zoom possano convivere.

## 6. Immagine: i riferimenti e il bottoncino oro

- I **riferimenti** stanno **in alto, sotto il prompt**, come pallini.
- **Le due pastiglie rapida/grande spariscono.** Misura e formato passano nel
  **bottoncino oro** del tasto Zack: **1K, 2K**, e i formati **9:16, 16:9, 1:1**
  e gli altri.
- **Da verificare prima di prometterli:** che l'API accetti il formato e che
  **il prezzo non cambi** fra una misura e l'altra. Se il prezzo cambia, il
  listino deve cambiare con lui — il preventivo e l'addebito leggono la stessa
  riga, e devono continuare a farlo.
- **Il rimborso si dice**, quando una generazione fallisce. Non si fa in
  silenzio.

---

## 7. Cosa questa fase NON fa

- **Non fa il pocket** né **l'icona output**: sono la fase 4.
- **Non tocca Brain dentro**: cambia solo dove sta il suo tasto. Brain libreria è
  la fase 5.
- **Non fa i prompt salvati**, che vivono in Brain.
- **Non fa la home del desktop che lavora**, né comprare senza account: fase 2.
- **Non accende il muro.**
- **Non tocca il listino**, a meno che la verifica del punto 6 non lo imponga.

## 8. Le prove che contano

1. **A muro acceso, senza essere mai entrato:** scontorna si apre e funziona;
   immagine mostra il prezzo e chiede crediti.
2. **Con un file sul piano:** niente mascotte, niente «fatto», niente
   «scontornato», niente crediti; il + è a sinistra.
3. **Prima di premere Zack:** nessun download, nessun indietro.
4. **Con tre file:** il + non c'è.
5. **Ogni prova parte da uno stato dichiarato** — mai da un saldo già carico,
   mai da una licenza già valida: è così che in B2 è passato inosservato il
   difetto peggiore dell'interfaccia.
6. **Ogni prova va rotta apposta** per vederla diventare rossa. Una prova che dà
   lo stesso esito nei due mondi non prova niente.
