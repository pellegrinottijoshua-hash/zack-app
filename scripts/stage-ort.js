// onnxruntime-web carica i suoi .wasm/.mjs a runtime da un percorso servito,
// non attraverso il bundler. Vanno copiati in public/ e NON versionati: sono
// artefatti di node_modules, e finirebbero per divergere dalla versione
// installata senza che nessuno se ne accorga.
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const from = path.resolve('node_modules/onnxruntime-web/dist');
const to = path.resolve('public/ort');

try {
  await mkdir(to, { recursive: true });
  const files = (await readdir(from)).filter((f) => /\.(wasm|mjs)$/.test(f));
  await Promise.all(files.map((f) => cp(path.join(from, f), path.join(to, f))));
  console.log(`ort: copiati ${files.length} file in public/ort`);
} catch (err) {
  // In un checkout senza node_modules questo script gira prima di npm install:
  // non deve far fallire l'installazione.
  console.warn(`ort: copia saltata (${err.message})`);
}
