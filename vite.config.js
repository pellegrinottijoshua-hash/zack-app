import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// wasm_vtracer è una build wasm-bindgen "bundler": importa il .wasm come
// modulo ESM, cosa che Vite non gestisce da sola.
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

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

export default defineConfig({
  plugins: [react(), serveOrtAssets(), wasm(), topLevelAwait()],
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
