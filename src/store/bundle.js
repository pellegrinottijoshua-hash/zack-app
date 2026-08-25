import { zip } from 'fflate';
import * as lib from './library.js';

/**
 * "Scarica tutto" senza server.
 *
 * È l'unica via di uscita da un archivio che vive dentro il browser: se
 * l'utente non può portarsi via i suoi file con un clic, quell'archivio è una
 * trappola. Per questo lo zip si costruisce in locale e non richiede nulla di
 * acceso da nessuna parte.
 */
export async function bundleAll(onProgress) {
  const { assets, folders, moodboards } = await lib.snapshot();
  if (!assets.length) throw Object.assign(new Error('library-empty'), { code: 'library-empty' });

  const files = {};
  const pathFor = (a) => {
    const folder = folders.find((f) => f.id === a.folderId);
    return folder ? `${folder.name}/${a.file}` : a.file;
  };

  let done = 0;
  for (const a of assets) {
    try {
      const { file } = await lib.readAsset(a.id);
      files[pathFor(a)] = new Uint8Array(await file.arrayBuffer());
    } catch {
      // Un file mancante non deve far fallire l'intero export: meglio
      // consegnare tutto il resto e lasciare che repair() lo segnali.
    }
    onProgress?.(++done, assets.length);
  }

  // Un indice leggibile: senza, uno zip di nomi-con-codice è indecifrabile
  // fra sei mesi.
  files['indice.json'] = new TextEncoder().encode(
    JSON.stringify(
      {
        esportatoIl: new Date().toISOString(),
        lavori: assets.map((a) => ({ file: pathFor(a), nome: a.name, tag: a.tags, creato: a.createdAt })),
        cartelle: folders.map((f) => f.name),
        moodboard: moodboards.map((m) => ({ nome: m.name, palette: m.palette, nota: m.note })),
      },
      null,
      2,
    ),
  );

  const data = await new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)));
  });

  return new Blob([data], { type: 'application/zip' });
}
