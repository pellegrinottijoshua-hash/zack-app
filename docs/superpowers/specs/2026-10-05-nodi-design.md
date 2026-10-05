# Fase 8 — Vettoriale, i nodi

> Spec, 2026-10-05. Fonti: la scaletta (fase 8, 1,5 g ≈ 15 M, rischio alto) e il
> quaderno §E5 («modificare i nodi di un logo oggi è impraticabile. È quello
> il lavoro»). Il committente ha detto «inizia 8a» senza domande aperte: le
> decisioni del §3 le ho prese io, da ribaltare se non vanno.

## 1. Perché oggi è impraticabile — misurato

Un logo di 512 px tracciato col motore dell'app (VTracer), il 2026-10-05:

| | poster | bianco e nero |
|---|---|---|
| tracciati | 8 | 1 |
| nodi | 192 (max 67 in uno) | 77 |
| sottopercorsi nello stesso tracciato | 1 | 4 |
| tracciati con `transform` | **8 su 8** | **1 su 1** |

E quattro difetti di forma, ognuno da solo basta a rendere i nodi
inservibili:
1. **ogni tracciato ha un `translate(…)`**: l'editor di nodi di svgedit lavora
   nelle coordinate del tracciato e mette le maniglie dove il tracciato non è;
2. **il fondo diventa una forma**: VTracer impila i colori, e il primo
   strato copre tutta la tela — dove clicchi, prendi lo sfondo;
3. **i tratti dritti sono curve**: i lati di un quadrato escono come `C` con
   le maniglie sulla retta, cioè il doppio delle maniglie, tutte inutili;
4. **un tracciato composto** (il «bianco e nero») è un solo elemento con dentro
   più sagome: svgedit ne mostra una alla volta e non si capisce quale.

Più l'interfaccia: i punti di svgedit sono di 5 px, e al dito non si prendono.

## 2. Il disegno

### 2.1 Il tracciato pulito (8a)

`engine/tracciato.js`, puro, applicato a ciò che esce da `traceToSvg`:
- le traslazioni **entrano nelle coordinate** (nessun `transform` resta);
- un **fondo** — una sagoma quasi bianca che copre tutta la tela — **si toglie**
  (era il bianco che mettiamo noi sotto la trasparenza);
- un segmento curvo con le maniglie sulla retta **torna dritto** (`L`).

### 2.2 Il modello dei nodi (8a)

`engine/nodi.js`, puro: un `d` diventa sottopercorsi di nodi
`{ x, y, dentro, fuori }` (le due maniglie, o `null`), e torna `d`. Le
operazioni sono funzioni che danno un modello nuovo: muovi un nodo (le
maniglie lo seguono), muovi una maniglia (simmetrica se il nodo è liscio),
aggiungi un nodo su un segmento (de Casteljau: la forma non cambia), togli un
nodo, segmento curvo ↔ dritto, apri ↔ chiudi, nodo angolo ↔ liscio.
Comandi letti: `M L H V C S Q T Z`, assoluti e relativi. Gli archi (`A`) no:
un tracciato con archi si dichiara non modificabile invece di rovinarlo.

### 2.3 L'editor dei nodi (8b, desktop)

Un livello nostro sopra la tela di svgedit, che usa la stessa trasformazione
dello schermo (`getScreenCTM`): punti grandi (12 px, bersaglio 24 px),
maniglie visibili solo sul nodo scelto, trascinamento con l'anteprima viva
(si riscrive `d` a ogni movimento), frecce da tastiera, Canc toglie, doppio
clic su un segmento aggiunge. Il rilascio entra nella cronologia di svgedit
(annulla funziona). La barra dei nodi (aggiungi, togli, curva/dritto,
apri/chiudi, angolo/liscio) è quella che il pannello avanzato ha già.

### 2.4 Il telefono (8c)

Il minimo che serve: tocca un nodo per sceglierlo, trascinalo, toglilo. Niente
maniglie sotto i 768 px (non si prendono). Lo zoom resta quello dell'editor.

## 3. Decisioni prese da me

1. **Un editor dei nodi nostro**, non quello di svgedit: si rompe sulle
   trasformazioni e sui composti, e non si può ingrandire per il dito.
   svgedit resta per tutto il resto (selezione, forme, testo, livelli).
2. **Il tracciato si pulisce all'uscita di VTracer**, sempre: nessuno vuole
   un `translate` o un fondo bianco cliccabile.
3. **Il fondo si toglie solo se è quasi bianco** (≥ 240 su tre canali): un
   fondo colorato è parte del disegno (un'icona su fondo scuro).
4. **Desktop prima** (scaletta): il telefono ha il minimo.
5. **I composti restano composti**: dividerli romperebbe i buchi delle lettere
   (la «O»). L'editor mostra tutti i sottopercorsi del tracciato scelto.

## 4. Le fette

- **8a — puro**: `tracciato.js` (pulizia) agganciato a `traceToSvg`; `nodi.js`
  (modello e operazioni); prove con rottura apposta.
- **8b — l'editor dei nodi sul desktop**: il livello sopra la tela, il
  trascinamento, la tastiera, la cronologia; misure nel browser.
- **8c — il telefono e la chiusura**: il minimo al dito, lo script di
  raggiungibilità, il tutorial; fusa.

## 5. Cosa NON fa

Non rifà svgedit. Non converte gli archi. Non divide i composti. Non fa
operazioni booleane (unisci, sottrai) — sarebbero una fase a sé.
