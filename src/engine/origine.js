/**
 * Da dove vengono i file pesanti: modelli `.onnx` e runtime ONNX Runtime Web.
 *
 * In locale sono file statici sotto `/models/` e `/ort/`. In produzione
 * Cloudflare Pages rifiuta un file sopra 25 MiB — quattro modelli e il wasm
 * threaded del backend WebGPU lo sfondano (misurato il 2026-08-27) — quindi
 * finiscono su Cloudflare R2, dove l'egress è gratuito. La base cambia,
 * l'app no: sa solo che i file stanno "da qualche parte" dietro un prefisso.
 *
 * Comporre quel prefisso a mano (stringa + nome file) è il tipo di bug che
 * non si vede in dev: una barra di troppo o di meno produce un URL che
 * sembra giusto e restituisce 404 solo quando il prefisso è quello vero di
 * produzione — cioè la prima volta che qualcuno lo prova sul serio. Da qui
 * una funzione pura, testata qui, invece che righe sparse in models.js,
 * upscale.js e worker.js.
 */

/** Aggiunge la barra finale se manca. Non la raddoppia se c'è già. */
function conBarraFinale(base) {
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * La base da usare per una risorsa configurabile via variabile d'ambiente
 * Vite, con un percorso locale come predefinito.
 *
 * `env` è `import.meta.env` (o un oggetto finto nei test): Vite sostituisce
 * le `VITE_*` a build time, quindi la stessa build non può "leggere" la
 * variabile a runtime — va passata dentro, non letta qui.
 *
 * Una variabile impostata ma vuota o fatta di soli spazi conta come non
 * impostata: `VITE_MODELS_BASE=` in un pannello di Cloudflare lasciato in
 * bianco non deve silenziosamente puntare alla radice del sito.
 */
export function origine(env, chiave, predefinita) {
  const valore = env && env[chiave];
  const scelta = valore && valore.trim() ? valore.trim() : predefinita;
  return conBarraFinale(scelta);
}

/**
 * Compone base + nome file senza doppie barre né barre mancanti.
 *
 * `nome` non deve mai portare una barra iniziale propria: con
 * `base = 'https://cdn.esempio.com/modelli'` e `nome = '/u2net.onnx'` una
 * concatenazione ingenua (`base + nome`) perde il percorso e chiede
 * `https://cdn.esempio.com/u2net.onnx` — file inesistente, errore che sembra
 * un guasto del motore e non un URL composto male.
 */
export function risolviUrl(base, nome) {
  const b = conBarraFinale(base);
  const n = nome.startsWith('/') ? nome.slice(1) : nome;
  return `${b}${n}`;
}
