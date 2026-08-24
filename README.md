# studio.lab

Editor immagini locale. Tutto gira su questa macchina: nessuna API esterna,
nessun abbonamento, nessun file che lascia il disco.

Questa è la **fetta verticale**: apri → scontorna → esporta. L'editor
vettoriale non c'è ancora — arriva dopo, se questa base convince.

## Avvio

```bash
npm run dev
```

Apre `http://localhost:5173`. Un solo comando lancia due processi: l'API
Fastify su `:5174` e Vite su `:5173`.

Il primo scontorno con un dato modello è lento (30–60s) perché scarica i pesi
della rete neurale. Dalle volte successive sono pochi secondi: il modello resta
nella cache di `rembg` (`~/.u2net/`).

## Come è fatto

```
src/          frontend React (Vite)
server/       API Fastify
  jobs/removeBg.js   lancia rembg come sottoprocesso via uv
  jobs/export.js     resize e composizione con sharp
py/           ambiente Python gestito da uv (rembg + onnxruntime)
test/         smoke test sugli endpoint
```

Non c'è un terzo processo Python: l'API invoca `uv run rembg` sul file
temporaneo e legge il risultato. Un pezzo mobile in meno.

## Modelli di scontorno

| modello | quando |
|---|---|
| `u2net` | default, veloce, download più leggero |
| `isnet-general-use` | equilibrato |
| `isnet-anime` | grafiche illustrate e line art |
| `birefnet-general-lite` | bordi fini, capelli |
| `birefnet-general` | massima qualità, più lento |

## Preset di export

`gelato-front` (3661×4843, l'unico che conta per la stampa), più 1:1, 4:5, 9:16.

L'export **non ingrandisce mai** oltre la risoluzione della sorgente: se la
grafica è troppo piccola per l'area di stampa, la centra e lo segnala invece di
sgranarla.

## Test

```bash
npm test
```

Quattro smoke test sugli endpoint reali, incluso uno scontorno vero che
verifica che gli angoli diventino trasparenti e il soggetto sopravviva. Il test
dello scontorno scarica il modello la prima volta.

## Licenze

Tutto MIT/Apache-2.0. Niente GPL (`potrace` è escluso di proposito) e niente
dipendenze commerciali.
