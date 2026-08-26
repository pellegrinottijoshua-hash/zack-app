/**
 * Richiudere i buchi che lo scontorno apre dentro un logo.
 *
 * Il difetto è riconoscibile e capita sempre sugli stessi file: il modello di
 * scontorno rende trasparenti le **controforme** — l'interno di una "o", il
 * vuoto dentro un anello, lo spazio fra due lettere unite — perché non sa
 * distinguere "sfondo" da "buco voluto dal disegno". Il risultato è un logo
 * bucherellato che su una maglietta si vede subito.
 *
 * La correzione è geometrica, non estetica: una regione trasparente che **non
 * tocca il bordo dell'immagine** non può essere sfondo, perché lo sfondo di una
 * foto arriva sempre fino al bordo. Quindi è un buco, e si richiude.
 *
 * Il limite di questo ragionamento, che è anche il motivo per cui esiste una
 * soglia: certe grafiche hanno buchi **voluti** e grandi — una cornice, una
 * ciambella, una lettera cava. Riempire tutto le rovina. Si riempie solo ciò
 * che è piccolo rispetto al soggetto.
 *
 * Tutto puro, su un array di byte: si verifica senza browser, ed è esattamente
 * il tipo di codice che sbaglia in silenzio e restituisce un'immagine corrotta
 * senza sollevare niente.
 */

/**
 * Sopra questo valore un pixel è considerato pieno.
 *
 * Non è 255 perché i bordi antialiasati stanno a 251-254 e trattarli come
 * "vuoti" spaccherebbe ogni contorno in mille regioni minuscole. È lo stesso
 * `softMax` di `analyzePixels`, e deve restare lo stesso: due soglie diverse
 * per la stessa domanda ("questo pixel è pieno?") producono due risposte
 * diverse sulla stessa immagine.
 */
export const PIENO = 250;

/**
 * Quanto può essere grande un buco perché valga la pena richiuderlo, come
 * frazione dell'area totale dell'immagine.
 *
 * VALORE PROVVISORIO, NON MISURATO (2026-08-26). Va corretto dopo la prova su
 * una manciata di loghi veri — quelli con le controforme aperte e quelli con i
 * buchi voluti — e la misura va scritta qui con la sua data. Finché resta
 * questo numero, è una supposizione dichiarata, non un risultato.
 */
export const AREA_MAX = 0.02;

/**
 * Trova le regioni trasparenti che non toccano il bordo.
 *
 * Due passate. La prima marca tutto ciò che è raggiungibile dal bordo passando
 * per pixel non pieni: quello è sfondo vero, e non si tocca mai. La seconda
 * raccoglie ciò che è rimasto, una regione alla volta.
 *
 * Connettività a 4, non a 8: in diagonale due pixel si "toccano" solo per un
 * vertice, e ammettere il passaggio in diagonale fa colare lo sfondo dentro le
 * controforme attraverso i contorni antialiasati, che è precisamente il buco
 * che stiamo cercando di chiudere.
 *
 * @param {Uint8ClampedArray|number[]} mask  un byte per pixel: il canale alfa
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]
 * @param {number} [opts.pieno]  sopra questo valore il pixel è pieno
 * @returns {{area: number, left: number, right: number, top: number, bottom: number, pixels: Int32Array}[]}
 */
export function findHoles(mask, w, h, { pieno = PIENO } = {}) {
  const total = w * h;
  if (!mask || !w || !h || mask.length < total) {
    throw new Error('Maschera non leggibile: dimensioni e byte non coincidono.');
  }

  // 0 = non visto, 1 = sfondo vero (raggiunto dal bordo), 2 = già assegnato a un buco
  const visto = new Uint8Array(total);
  // La pila tiene indici di pixel. Int32Array perché su un file da dodici
  // milioni di pixel un array normale di numeri costa quattro volte tanto, e
  // `Math.max(...array)` insegna che qui gli spread non si usano.
  const pila = new Int32Array(total);

  const vuoto = (i) => mask[i] <= pieno;

  // Prima passata: dal bordo verso l'interno.
  let cima = 0;
  const semina = (i) => {
    if (!visto[i] && vuoto(i)) {
      visto[i] = 1;
      pila[cima++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    semina(x);
    semina((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    semina(y * w);
    semina(y * w + w - 1);
  }
  while (cima > 0) {
    const i = pila[--cima];
    const x = i % w;
    if (x > 0 && !visto[i - 1] && vuoto(i - 1)) { visto[i - 1] = 1; pila[cima++] = i - 1; }
    if (x < w - 1 && !visto[i + 1] && vuoto(i + 1)) { visto[i + 1] = 1; pila[cima++] = i + 1; }
    if (i >= w && !visto[i - w] && vuoto(i - w)) { visto[i - w] = 1; pila[cima++] = i - w; }
    if (i < total - w && !visto[i + w] && vuoto(i + w)) { visto[i + w] = 1; pila[cima++] = i + w; }
  }

  // Seconda passata: ciò che è vuoto e non è stato raggiunto è un buco.
  const buchi = [];
  for (let s = 0; s < total; s++) {
    if (visto[s] || !vuoto(s)) continue;

    visto[s] = 2;
    cima = 0;
    pila[cima++] = s;
    let letti = 0;
    let left = w, right = -1, top = h, bottom = -1;
    const regione = [];

    while (cima > 0) {
      const i = pila[--cima];
      regione.push(i);
      letti++;
      const x = i % w;
      const y = (i - x) / w;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;

      if (x > 0 && !visto[i - 1] && vuoto(i - 1)) { visto[i - 1] = 2; pila[cima++] = i - 1; }
      if (x < w - 1 && !visto[i + 1] && vuoto(i + 1)) { visto[i + 1] = 2; pila[cima++] = i + 1; }
      if (i >= w && !visto[i - w] && vuoto(i - w)) { visto[i - w] = 2; pila[cima++] = i - w; }
      if (i < total - w && !visto[i + w] && vuoto(i + w)) { visto[i + w] = 2; pila[cima++] = i + w; }
    }

    buchi.push({ area: letti, left, right, top, bottom, pixels: Int32Array.from(regione) });
  }

  return buchi;
}

/**
 * Richiude i buchi piccoli e lascia stare quelli grandi.
 *
 * Modifica la maschera sul posto e restituisce il resoconto, perché il
 * chiamante deve poter **dire a parole** cosa è successo: "richiusi tre buchi"
 * è un'informazione, un'immagine cambiata in silenzio è una sorpresa.
 *
 * @param {Uint8ClampedArray} mask  un byte per pixel, modificata sul posto
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]
 * @param {number} [opts.areaMax]  frazione dell'area totale oltre la quale un buco si lascia
 * @param {number} [opts.pieno]
 * @returns {{richiusi: number, lasciati: number, pixels: number}}
 */
export function fillHoles(mask, w, h, { areaMax = AREA_MAX, pieno = PIENO } = {}) {
  const limite = w * h * areaMax;
  const buchi = findHoles(mask, w, h, { pieno });

  let richiusi = 0;
  let lasciati = 0;
  let pixels = 0;

  for (const buco of buchi) {
    if (buco.area > limite) {
      lasciati++;
      continue;
    }
    for (let k = 0; k < buco.pixels.length; k++) mask[buco.pixels[k]] = 255;
    richiusi++;
    pixels += buco.area;
  }

  return { richiusi, lasciati, pixels };
}
