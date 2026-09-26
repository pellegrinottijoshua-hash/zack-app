# La home del desktop che lavora — fetta 2c

> Spec + piano, 2026-09-27. Viene dal quaderno (`2026-09-14-bozze-servizi.md`,
> §D «la vetrina che lavora»), **non** dalla spec del 2026-08-27, che parla di
> un abbonamento da 3,99 € e di una piuma che non ci sono più. Si impila sul
> ramo `fetta-2b`: la corsia Immagine paga da ospite, e quel codice è lì.

## 1. Le decisioni del committente (2026-09-27)

| | decisione |
|---|---|
| base | ramo `fetta-2b`; si fonde dopo di lei, con la stessa `ultra` |
| corsia destra | **Immagine** che genera davvero + **Video «presto»**, spento |
| prompt salvati (D-d) | **no**, fase 5 (il prompt come file di Brain) |
| il racconto (D-a) | **scende sotto il banco**, invariato |
| D-b, lo «0,00 €» a chi arriva | non si mostra: al suo posto il **prezzo** di ciò che sta per fare |
| D-c, Zack senza credito | il prezzo sta **accanto al tasto prima di premere**; se non basta, la ricarica da ospite |

## 2. Il banco

```
desktop (≥ 1100 px)
┌──────────────┬──────────────┬──────────────┐
│ SCONTORNA    │   mascotte   │ IMMAGINE     │
│ FREE         │   (video)    │ prompt       │
│ (Ritaglio,   │              │ ●●● +        │
│  com'è oggi) │              │ 0,15 € [ZACK]│
│              │              ├──────────────┤
│              │              │ VIDEO presto │
└──────────────┴──────────────┴──────────────┘
         ↓ il racconto, invariato

telefono e finestre strette: una colonna — Scontorna, poi Immagine, poi Video.
La mascotte al centro sparisce (Ritaglio ha già la sua).
```

- **Scontorna** è `Ritaglio.jsx` così com'è: non si tocca.
- **Immagine** è un componente nuovo, `CorsiaImmagine.jsx`: prompt, `+` per i
  riferimenti (file dal computer, non dalla libreria: sulla home non c'è),
  pallini tondi con la croce, prezzo col conto dei riferimenti accanto al tasto,
  risultato con «scarica».
- I riferimenti della home valgono tutti **`oggetto`** (tetto 6). Il ruolo
  serve solo ai limiti e al preventivo: il fornitore non lo riceve.
- Il saldo si legge **solo se c'è già una sessione**: aprire la home non crea
  un ospite (regola della 2b).

## 3. Il ritorno dal pagamento

Oggi `/ricarica` rimanda sempre a `/app/?ricaricato=1`: chi paga dalla home
finirebbe nello studio e perderebbe il prompt. Due cose:

- `/ricarica` accetta `ritorno: 'home'` (chiave chiusa, come i pacchetti:
  nessun URL dal client) → `success_url` e `cancel_url` sulla home;
- prima di partire la corsia salva prompt e riferimenti in `sessionStorage`,
  e al ritorno li rimette. I riferimenti sono immagini ridotte a 768 px
  (la stessa riduzione del preventivo), quindi ci stanno.

## 4. Il piano — 4 compiti, un commit ciascuno

1. **Il ritorno**: `ritorno: 'home'` nel Worker e in `vaiAllaRicarica`;
   prove sul corpo mandato a Stripe (home / studio / valore inventato → studio).
2. **`CorsiaImmagine`**: il componente, le frasi it+en in `copy.js` (la prova
   di parità c'è già: `test/copyLanding.test.js`), `generaImmagine` con un
   `leggiAsset` sopra i file scelti. Prove pure su: tetto dei riferimenti,
   prezzo col conto giusto, prompt vuoto → tasto spento.
3. **Il banco**: la griglia a tre corsie, la mascotte al centro, Video
   «presto», il racconto sotto; niente «0,00 €» a chi non ha sessione.
4. **Lo script di 2a misura anche la home** (`/`), alle stesse misure. Tutto
   verde, poi `npm test`, `npm run build`.

## 5. Cosa NON fa

Non salva prompt. Non genera video. Non tocca `Ritaglio.jsx` né il racconto.
Non accende il muro.
