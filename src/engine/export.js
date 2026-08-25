/**
 * Calcolo del posizionamento per l'export, e i formati disponibili.
 *
 * La matematica sta qui, separata dal disegno su canvas, perché è la parte che
 * può sbagliare in silenzio: una grafica deformata o mezza fuori dalla tela non
 * solleva errori, arriva in stampa.
 */

/**
 * `dpi` c'è solo sui formati di stampa: è ciò che trasforma i pixel in
 * centimetri, e senza di lui il controllo di stampa non ha niente da dire.
 */
export const PRESETS = [
  { id: 'gelato-front', w: 3661, h: 4843, safeArea: 0.9, dpi: 300, label: 'Gelato · 300 dpi', group: 'stampa' },
  // Stessa area fisica del formato sopra — 31 × 41 cm — alla densita' che
  // Gelato chiede sui prodotti piu' esigenti: 3661 × 350/300 = 4271.
  { id: 'gelato-front-350', w: 4271, h: 5650, safeArea: 0.9, dpi: 350, label: 'Gelato · 350 dpi', group: 'stampa' },
  { id: 'print-a4-300', w: 2480, h: 3508, safeArea: 0.9, dpi: 300, label: 'A4 · 300 dpi', group: 'stampa' },
  { id: 'square', w: 2048, h: 2048, safeArea: 0.85, label: '1:1', group: 'social' },
  { id: 'portrait', w: 1638, h: 2048, safeArea: 0.85, label: '4:5', group: 'social' },
  { id: 'story', w: 1152, h: 2048, safeArea: 0.8, label: '9:16', group: 'social' },
  { id: 'wide', w: 2048, h: 1152, safeArea: 0.85, label: '16:9', group: 'social' },
  { id: 'og', w: 1200, h: 630, safeArea: 0.85, label: '1200×630', group: 'web' },
  { id: 'favicon', w: 512, h: 512, safeArea: 1, label: '512×512', group: 'web' },
];

/** Solo colori della palette JAYL: il brand vieta esplicitamente il resto. */
export const BACKGROUNDS = {
  transparent: null,
  nero: '#111111',
  panna: '#F5F0E8',
  bianco: '#FFFFFF',
};

export function getPreset(id) {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Formato sconosciuto: ${id}`);
  return p;
}

/**
 * Dove va disegnata la grafica dentro la tela.
 *
 * `safeArea` è la frazione di tela che la grafica può occupare: la stampa ha
 * bisogno di margine, o il disegno finisce nella cucitura o sotto il taglio.
 *
 * Un raster non viene **mai** ingrandito oltre la sua risoluzione: su tessuto
 * si vedrebbe sgranato, e vale di più dirlo che nasconderlo. Un vettore invece
 * può crescere quanto serve, perché non ha una risoluzione da tradire.
 */
export function computePlacement(srcW, srcH, preset, { isVector = false } = {}) {
  const boxW = Math.round(preset.w * preset.safeArea);
  const boxH = Math.round(preset.h * preset.safeArea);

  const scaleToFit = Math.min(boxW / srcW, boxH / srcH);
  const scale = isVector ? scaleToFit : Math.min(1, scaleToFit);

  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));

  return {
    canvas: { w: preset.w, h: preset.h },
    draw: { w: drawW, h: drawH },
    x: Math.round((preset.w - drawW) / 2),
    y: Math.round((preset.h - drawH) / 2),
    source: { w: srcW, h: srcH },
    // Vero quando la sorgente era troppo piccola per riempire l'area di
    // sicurezza e abbiamo scelto di non ingrandirla.
    upscaleLimited: !isVector && scaleToFit > 1,
  };
}
