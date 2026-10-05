# Fase 7 — Effetti sonori (il pacchetto, e «inventane uno»)

> Spec, 2026-10-05. Fonti: la scaletta (fase 7, 1 g ≈ 10 M), il quaderno
> `2026-09-14-bozze-servizi.md` §E4 e A9. Decisioni del committente prese
> il 2026-10-05, prima di cominciare (§3).

## 1. Cosa è già deciso

- **Due cose sotto lo stesso tasto** (E4): il **pacchetto** — effetti pronti,
  per famiglia, **nell'abbonamento** — e **«inventane uno»**, lo descrivi e
  viene generato, **a crediti**.
- **La licenza prima del prezzo**: il pacchetto deve permettere la
  ridistribuzione dentro un prodotto a pagamento, perché i clienti si portano
  gli effetti nei loro lavori. CC0 va bene; molte raccolte «free» no.
- Il servizio **`effetti`** esiste già: «costruisci» (il sintetizzatore,
  `engine/synth.js`, sei famiglie) e «ritmo». Resta, gratis. La fase 7 ci
  aggiunge il pacchetto e «inventane uno», nella stessa stanza.

## 2. Il disegno

### 2.1 Il pacchetto è nostro, e statico

~150 effetti da raccolte **CC0** (Kenney: Impact, Interface, RPG, Sci-fi,
Digital, UI, Casino — licenza letta su ogni pagina e nei `License.txt`).
Convertiti in **MP3 mono 96 kbps** (Safari non legge tutti gli Ogg), serviti
dal sito come file statici in `public/effetti/`, con un **catalogo**
(`src/engine/pacchetto.json`, generato): id, famiglia, nome in italiano e in
inglese, durata, file, fonte. Nessun fornitore, nessun costo a consumo, nessun
dato del cliente che esce.

Lo script `scripts/prepara-effetti.mjs` rifà tutto dalla cartella scaricata
(`tmp/kenney/`, fuori da git): la scelta sta scritta nello script, non nella
testa di chi l'ha fatta. `public/effetti/CREDITI.txt` dice da dove viene
ogni file (non obbligatorio con CC0, ma onesto).

### 2.2 Le famiglie

Colpi · Passi · Interfaccia · Oggetti · Carte e dadi · Arcade · Fantascienza ·
Esplosioni. Fruscii e vento restano a «costruisci», che li fa meglio di un file.

### 2.3 Nello studio

Il `+` degli Effetti dà **dal pacchetto · costruisci · ritmo**. «Dal
pacchetto» apre il pannello: le famiglie come chip, la ricerca per nome, ogni
effetto si ascolta con un tocco; **prendi** lo mette sul piano come risultato
(l'icona output lo porta in Brain o nel pocket, `kind: 'mp3'`).

### 2.4 «Inventane uno» (a crediti, spento fino alla misura)

ElevenLabs Sound Effects (`/v1/sound-generation`): una descrizione e una
durata → un MP3. La stessa strada della voce (`worker/voce.js`,
`conAddebito`): 503 senza chiave, 503 senza misura, il rimborso detto. Il
listino in `listinoVoce.js` con `MISURA_EFFETTO = null` — si accende con la
voce, col piano a pagamento (il gratuito non ha licenza commerciale).

## 3. Decisioni del committente, 2026-10-05

1. **Raccolte CC0** (non un pacchetto a pagamento, non solo sintetizzati).
2. **Circa 150 effetti** per cominciare.
3. **«Inventane uno» si costruisce ora, spento**, come la fase 6.
4. Download dei 7 zip Kenney autorizzato (≈ 10 MB, in `tmp/`).

## 4. Le fette

- **7a — il pacchetto**: lo script che sceglie e converte, i file in
  `public/effetti/`, il catalogo, `engine/pacchetto.js` puro (famiglie,
  ricerca), le prove.
- **7b — il pacchetto nello studio**: «dal pacchetto» nel `+`, il pannello,
  ascolta e prendi, l'icona output; lo script di raggiungibilità.
- **7c — inventane uno**: fornitore, Worker, listino senza misura, la scheda
  nel pannello; prove; fusa.

## 5. Cosa NON fa

Non mescola né monta (lo fa CapCut). Non tiene effetti con licenze diverse
da CC0. Non genera senza misura e senza piano a pagamento.
