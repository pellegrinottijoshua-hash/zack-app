# Fase 3 — Video con Seedance 2.5

> Spec + piano, 2026-09-27. Ramo `fetta-3-video`, sopra `fetta-2c`.
> Decisione del committente: **Seedance 2.5 dal canale ufficiale** (BytePlus
> ModelArk), con **Higgsfield in opzione**, pronta per le promozioni e per i
> modelli nuovi. La promozione di settembre non guida il disegno.

## 1. I due canali, misurati sulle pagine ufficiali (2026-09-27)

| | BytePlus ModelArk (ufficiale) | Higgsfield |
|---|---|---|
| modello | `dreamina-seedance-2-5-260628` | `bytedance/seedance-2.5/text-to-video` |
| creare | `POST https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks` | `POST https://api.higgsfield.ai/bytedance/seedance-2.5/text-to-video` |
| leggere | `GET …/tasks/{id}` → `status`, `content.video_url` | `GET https://api.higgsfield.ai/requests/{id}/status` → `status`, `video.url` |
| chiave | `Authorization: Bearer <ARK_API_KEY>` | `Authorization: Key <id>:<segreto>` |
| prezzo | **10,70 $ / milione di token** | **21,40 $ / milione di token** (0,0214 $ / 1.000) |
| 720p 16:9 | ~0,23 $/s | ~0,46 $/s |
| stati finali | `succeeded`, `failed`, `cancelled`, `expired` | `completed`, `failed`, `nsfw` |

Token fatturati, stessa formula per tutti e due: `ceil(larghezza × altezza ×
secondi × 24 / 1024)`. **Higgsfield costa il doppio del canale ufficiale**:
per questo è un'opzione, non il default.

L'URL del video **scade dopo 24 ore** (BytePlus) e si scarica al massimo
100 volte: il browser lo scarica subito nella libreria.

## 2. Il prezzo: la stima non sta mai sotto il costo

- Il costo per secondo si calcola sul formato **più grande** della
  risoluzione (720p: 927.408 pixel, il 4:3; 480p: 424.000, il 21:9). Tutti
  gli altri formati costano meno: la stima resta sopra il costo vero.
- Dollari → euro con `CAMBIO_USD_EUR = 0,95`, una fotografia prudente (il
  dollaro contato più caro di com'è). **Da riguardare**, come dice già il
  listino; `lavori.costo_reale` registra il costo vero.
- Prezzo al cliente = `priceFor(costo del canale UFFICIALE)`, il 14% di
  margine come l'immagine. Stesso prezzo qualunque canale sia acceso.
- **Il cancello del canale**: se il canale acceso costa più del prezzo
  (Higgsfield oggi), il Worker **non addebita e non genera**, a meno che il
  committente non lo accenda apposta con `VIDEO_ACCETTA_PERDITA=1`. È così
  che si usa una promozione: consapevolmente, con un interruttore, mai per
  sbaglio.

Scelte al cliente: **durata 5 / 10 / 15 s**, **480p / 720p**, formati
16:9, 9:16, 1:1, 4:3, 3:4, 21:9. Audio incluso (non cambia il prezzo).

## 3. L'attesa

Un'immagine torna in 20 secondi dentro la stessa richiesta; un video no.

1. `POST /genera` con `servizio: 'video-seedance25'`: valida, **addebita**,
   apre il lavoro (`in-corso`), crea il task dal fornitore, scrive sul lavoro
   `fornitore` e `fornitore_rif`, risponde **202** `{ lavoro, prezzo, saldo }`.
   Se il fornitore rifiuta subito → rimborso e `rimborsato`.
2. `GET /lavoro?id=…`: solo il padrone del lavoro. Chiede al fornitore:
   - finito → chiude `fatto` col costo vero, risponde `{ stato: 'fatto', url }`;
   - fallito / moderato / annullato / scaduto → **rimborso** (una volta sola:
     `rimborso:<lavoro>` è unico) e `{ stato: 'rimborsato' }`;
   - altrimenti `{ stato: 'in-corso' }`.
3. Il giro orario (`sbloccaAppesi`) per un video **chiede prima al
   fornitore**: rimborsare un video che sta ancora girando lo regalerebbe.
   BytePlus riceve `execution_expires_after: 3600`, quindi dopo un'ora il task
   è morto per davvero; Higgsfield non ha una scadenza: dopo 2 ore lo si
   chiude come rimborsato (minore noto, §6).

## 4. Serve dal committente

1. **SQL** (`docs/2026-09-27-schema-video.sql`): due colonne su `lavori`,
   `fornitore` e `fornitore_rif`.
2. **Le chiavi**, solo dal suo terminale:
   `npx wrangler secret put ARK_API_KEY` e, per l'opzione,
   `npx wrangler secret put HF_CREDENTIALS`.
3. Il canale: variabile `VIDEO_FORNITORE` = `byteplus` (default) o `higgsfield`.

## 5. Il piano — tre fette

**3a — il motore (questa sessione)**, tutto provabile in Node:
1. `listino`: la voce video, prezzo per durata × risoluzione, costo per canale;
2. `worker/fornitori/seedance.js`: i due adattatori REST + la traduzione degli stati;
3. `/genera` video (202) e `/lavoro`, col cancello del canale;
4. il giro orario che chiede al fornitore prima di rimborsare; SQL.

**3b — lo studio**: il servizio Video acceso (`ready: true`, `serve: 'saldo'`),
prompt, durata/risoluzione/formato nel punto oro, prezzo accanto al tasto,
l'attesa con la domanda a `/lavoro`, il video scaricato nella libreria.

**3c — la home**: la corsia Video accesa, come la corsia Immagine.

## 6. Cosa NON fa, e i minori

- Niente riferimenti (image-to-video, first frame): arrivano dopo 3c.
- Niente 1080p (lo ha solo Higgsfield, e il doppio del prezzo).
- Higgsfield non ha una scadenza del task: un video che finisse dopo il
  rimborso delle 2 ore lo pagheremmo noi. Raro; si chiude con la loro
  `cancel` quando l'adattatore la userà.
