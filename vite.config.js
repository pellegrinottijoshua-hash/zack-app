import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// wasm_vtracer è una build wasm-bindgen "bundler": importa il .wasm come
// modulo ESM, cosa che Vite non gestisce da sola.
import wasm from 'vite-plugin-wasm';

/**
 * onnxruntime-web carica i suoi helper `.mjs` con un import dinamico calcolato a
 * runtime. Vite lo intercetta e ci appende `?import`, che per un file servito da
 * `public/` restituisce 500 — e l'errore che ne esce parla di "backend non
 * disponibile", che manda a cercare nel posto sbagliato.
 *
 * Qui togliamo la query prima che Vite provi a trattarli come moduli, così
 * vengono serviti per quello che sono: file statici.
 */
function serveOrtAssets() {
  return {
    name: 'serve-ort-assets',
    configureServer(server) {
      // Registrato direttamente (non in un hook di ritorno) per finire PRIMA
      // dei middleware interni di Vite.
      server.middlewares.use((req, _res, next) => {
        const [pathname] = req.url.split('?');
        if (pathname.startsWith('/ort/') && /\.(mjs|wasm)$/.test(pathname)) {
          req.url = pathname;
        }
        next();
      });
    },
  };
}

import { resolve } from 'node:path';

export default defineConfig({
  // Due entrate separate: la pagina di presentazione non deve caricare ONNX
  // Runtime e i modelli. Chi non ha ancora deciso di restare non aspetta.
  build: {
    // Top-level await nativo, senza vite-plugin-top-level-await.
    // Quel plugin riscriveva il TLA con swc e dal 2026 la sua coppia di
    // versioni non regge: `missing field type`, e la build di produzione non
    // usciva piu' — verificato il 2026-08-25. Tutti i browser che reggono
    // WebGPU o WebAssembly SIMD reggono anche il TLA nativo, quindi il plugin
    // proteggeva da browser che non potrebbero comunque far girare l'app.
    target: 'esnext',
    rollupOptions: {
      input: {
        landing: resolve(process.cwd(), 'index.html'),
        app: resolve(process.cwd(), 'app/index.html'),
      },
    },
  },
  plugins: [react(), serveOrtAssets(), wasm()],
  // Impedisce a Vite di pre-ottimizzare onnxruntime-web e riscriverne gli
  // import dinamici. Verificato il 2026-08-25: senza, il motore non parte.
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  worker: { format: 'es' },
  server: {
    port: 5173,
    proxy: {
      // 127.0.0.1, mai "localhost": l'API ascolta solo su IPv4, mentre
      // localhost risolve prima a ::1 — qualunque cosa occupi l'IPv6
      // risponderebbe al posto suo, e il guasto sembrerebbe un problema di
      // rotte che non esiste.
      '/api': 'http://127.0.0.1:5174',
    },
  },
});
