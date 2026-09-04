/**
 * Il modello, scaricato una volta sola — e mentre scarica, detto.
 *
 * Due difetti che questo file chiude, misurati il 2026-09-04 sulla
 * segnalazione del committente («è lenta, non funziona, oppure fa "Zack sta
 * lavorando" all'infinito»):
 *
 * 1. **Si riscaricava.** I modelli stanno su R2 e arrivano **senza
 *    `Cache-Control`** (misurato: header assente, `cf-cache-status: DYNAMIC`).
 *    Finivano quindi solo nella cache HTTP, che è la prima a essere sfrattata
 *    quando una voce pesa 176 MB — e su un telefono succede presto. Qui il
 *    modello va nella **Cache API**, che è l'unica memoria che
 *    `navigator.storage.persist()` protegge davvero: la cache HTTP non fa
 *    parte dello spazio persistente in nessun browser.
 *
 * 2. **Non diceva niente.** `EngineBanner` ha da agosto una barra con la
 *    percentuale per la fase `downloading`, e **nessuno ha mai emesso quella
 *    fase** nello studio: il worker manda solo `loading`, `running`,
 *    `compositing`. Chi aspettava 176 MB su rete mobile leggeva «Zack sta
 *    lavorando…» per minuti, che è indistinguibile da un guasto. È la terza
 *    volta che si trova una cosa costruita per la home e mai collegata
 *    all'app — vedi `ritaglioIstantaneo`.
 *
 * Le dipendenze si iniettano (`cache`, `rete`, `storage`) perché così questa
 * parte vive dove i test la vedono, in Node: è la regola già scritta per
 * `ricette.js` e `keying.js`, e qui serve il doppio, perché un modello che
 * non si scarica non solleva niente — resta solo un'attesa che non finisce.
 */

/**
 * Il nome della cache porta una versione.
 *
 * Se un giorno cambiassero i file dei modelli a nome invariato, si alza
 * questo numero e le copie vecchie si buttano — senza, resterebbero lì a
 * occupare spazio e a servire pesi sbagliati.
 */
export const NOME_CACHE = 'jayl-modelli-v1';

/**
 * Chiede al browser di non sfrattare ciò che teniamo.
 *
 * Senza questa chiamata lo spazio è «best effort»: il browser può buttarlo
 * quando gli serve posto, ed è esattamente quello che succedeva. A un'app
 * **installata** i browser concedono quasi sempre il permesso senza chiedere
 * niente all'utente; a una scheda qualunque a volte no — e allora non si
 * insiste: si restituisce `false` e si va avanti, perché una cache non
 * protetta funziona lo stesso, dura solo di meno.
 */
export async function chiediSpazioPersistente(storage = globalThis.navigator?.storage) {
  try {
    if (!storage?.persist) return null;
    if (await storage.persisted?.()) return true;
    return await storage.persist();
  } catch {
    // Un permesso negato o un browser che non lo conosce non deve impedire
    // di lavorare: e' un'ottimizzazione, non un requisito.
    return null;
  }
}

/**
 * I byte di un modello: dalla cache se ci sono, dalla rete se no.
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {(d: {fatti: number, totale: number, frazione: number|null}) => void} [opts.onProgress]
 * @param {Cache} [opts.cache]   iniettabile per i test
 * @param {typeof fetch} [opts.rete]
 * @returns {Promise<Uint8Array>}
 */
export async function byteDelModello(url, { onProgress, cache, rete = globalThis.fetch } = {}) {
  const store = cache ?? (await apriCache());

  // Già in casa: nessuna rete, nessuna attesa, nessuna barra.
  const salvato = await store?.match?.(url);
  if (salvato) return new Uint8Array(await salvato.arrayBuffer());

  const res = await rete(url);
  if (!res.ok) {
    throw Object.assign(new Error(`modello non raggiungibile: ${res.status}`), {
      code: 'modello-irraggiungibile',
    });
  }

  const byte = await leggiConAvanzamento(res, onProgress);

  // Si mette in cache DOPO averlo letto tutto: `res.clone()` bufferizzerebbe
  // una seconda copia da 176 MB in memoria mentre la prima e' ancora viva.
  try {
    await store?.put?.(url, new Response(byte, { headers: { 'content-type': 'application/octet-stream' } }));
  } catch {
    // Spazio finito o cache negata: il modello e' comunque in mano, e questo
    // giro funziona. Si riscarichera' la prossima volta, che e' cio' che
    // succedeva sempre prima di questo file.
  }

  return byte;
}

/** La cache dei modelli, o `null` dove le cache non esistono (Node, test). */
async function apriCache() {
  try {
    return typeof caches !== 'undefined' ? await caches.open(NOME_CACHE) : null;
  } catch {
    return null;
  }
}

/**
 * Legge una risposta a pezzi, dicendo quanto manca.
 *
 * Senza `content-length` la frazione **non esiste** e si restituisce `null`,
 * non uno zero: una barra che finge di sapere quanto manca è peggio di
 * nessuna barra, perché la seconda volta non le si crede più. È la stessa
 * scelta già fatta in `scaricaModello` per la home.
 */
export async function leggiConAvanzamento(res, onProgress) {
  const totale = Number(res.headers.get('content-length')) || 0;

  if (!res.body?.getReader) {
    const byte = new Uint8Array(await res.arrayBuffer());
    onProgress?.({ fatti: byte.length, totale: totale || byte.length, frazione: 1 });
    return byte;
  }

  const reader = res.body.getReader();
  const pezzi = [];
  let fatti = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pezzi.push(value);
    fatti += value.length;
    onProgress?.({ fatti, totale, frazione: totale ? fatti / totale : null });
  }

  const byte = new Uint8Array(fatti);
  let i = 0;
  for (const p of pezzi) {
    byte.set(p, i);
    i += p.length;
  }
  return byte;
}
