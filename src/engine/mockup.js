import { GARMENTS, getGarment } from './print.js';

/**
 * Il mockup: la grafica appoggiata sul capo.
 *
 * Non è una foto e non finge di esserlo. È una sagoma piatta nello stesso
 * tratto del resto dell'app — perché una finta foto di maglietta si riconosce
 * subito, e una sagoma onesta risponde comunque all'unica domanda che conta
 * prima di mandare in stampa: **quanto è grande, e dove finisce.**
 *
 * Le sagome sono disegnate su una tela di 1200×1500 e riscalate: le proporzioni
 * restano quelle a qualunque dimensione si esporti.
 */

export const CANVAS = { w: 1200, h: 1500 };

/**
 * `area` è la zona di stampa, in frazioni della tela. Sono le proporzioni
 * reali dell'area stampabile di una t-shirt taglia M: 30 cm su 40 circa,
 * collocata sotto il collo — non un rettangolo scelto a occhio.
 */
export const GARMENT_SHAPES = [
  {
    id: 'tee-front',
    labelKey: 'mockup.teeFront',
    // Proporzioni di una taglia M stesa: 52 cm di torace su 72 di lunghezza.
    // A occhio si disegna sempre troppo lunga, e viene fuori un vestito.
    area: { x: 0.346, y: 0.253, w: 0.3075, h: 0.373 },
    path:
      'M 455 180 C 455 180 420 162 385 172 L 90 300 C 72 310 66 334 76 356 ' +
      'L 176 566 C 186 588 212 596 232 582 L 280 516 L 280 1150 ' +
      'C 280 1172 296 1188 318 1188 L 882 1188 C 904 1188 920 1172 920 1150 ' +
      'L 920 516 L 968 582 C 988 596 1014 588 1024 566 L 1124 356 ' +
      'C 1134 334 1128 310 1110 300 L 815 172 C 780 162 745 180 745 180 ' +
      'C 728 268 676 306 600 306 C 524 306 472 268 455 180 Z',
  },
  {
    id: 'tee-back',
    labelKey: 'mockup.teeBack',
    // Dietro il collo è alto e la stampa può salire: l'area è più grande.
    area: { x: 0.333, y: 0.227, w: 0.333, h: 0.4 },
    path:
      'M 455 180 C 455 180 420 162 385 172 L 90 300 C 72 310 66 334 76 356 ' +
      'L 176 566 C 186 588 212 596 232 582 L 280 516 L 280 1150 ' +
      'C 280 1172 296 1188 318 1188 L 882 1188 C 904 1188 920 1172 920 1150 ' +
      'L 920 516 L 968 582 C 988 596 1014 588 1024 566 L 1124 356 ' +
      'C 1134 334 1128 310 1110 300 L 815 172 C 780 162 745 180 745 180 ' +
      'C 740 246 680 270 600 270 C 520 270 460 246 455 180 Z',
  },
  {
    id: 'hoodie',
    labelKey: 'mockup.hoodie',
    // Cappuccio sopra, tasca sotto: la stampa sta in mezzo, ed è più piccola
    // di quella di una t-shirt. Ignorarlo significa stampare sulla tasca.
    area: { x: 0.358, y: 0.307, w: 0.283, h: 0.28 },
    path:
      'M 455 220 C 455 220 420 202 385 212 L 80 344 C 62 354 56 378 66 400 ' +
      'L 170 620 C 180 642 206 650 226 636 L 268 580 L 268 1230 ' +
      'C 268 1252 284 1268 306 1268 L 894 1268 C 916 1268 932 1252 932 1230 ' +
      'L 932 580 L 974 636 C 994 650 1020 642 1030 620 L 1134 400 ' +
      'C 1144 378 1138 354 1120 344 L 815 212 C 780 202 745 220 745 220 ' +
      'C 728 308 676 346 600 346 C 524 346 472 308 455 220 Z',
    details: [
      { d: 'M 455 220 C 496 96 704 96 745 220 C 704 286 496 286 455 220 Z', fill: true },
      { d: 'M 350 940 L 850 940 L 826 1120 L 374 1120 Z', width: 9 },
      { d: 'M 552 330 L 552 424 M 648 330 L 648 424', width: 11 },
    ],
  },
  {
    id: 'tote',
    labelKey: 'mockup.tote',
    area: { x: 0.35, y: 0.453, w: 0.3, h: 0.267 },
    // Lati dritti: la svasatura in basso la fa leggere come una busta di
    // carta invece che come una borsa di tela.
    path: 'M 296 520 L 904 520 L 904 1236 L 296 1236 Z',
    details: [{ d: 'M 430 526 C 430 316 770 316 770 526', width: 26 }],
  },
];

export function getShape(id) {
  const s = GARMENT_SHAPES.find((x) => x.id === id);
  if (!s) throw new Error(`Sagoma sconosciuta: ${id}`);
  return s;
}

export { GARMENTS, getGarment };

/**
 * Dove finisce la grafica sul capo.
 *
 * Si centra nell'area di stampa e **non la si supera mai**: un mockup che mostra
 * la grafica più grande di quanto la stampa consenta è peggio di nessun mockup.
 * Verticalmente si centra nell'area, non si appende in alto: l'area è già messa
 * dove va la stampa, e un disegno largo e basso appeso al bordo superiore
 * sembrerebbe sbagliato pur essendo corretto.
 */
export function placeOnGarment(artW, artH, shape, canvas = CANVAS) {
  if (!artW || !artH) throw new Error('Grafica senza dimensioni.');
  const area = {
    x: shape.area.x * canvas.w,
    y: shape.area.y * canvas.h,
    w: shape.area.w * canvas.w,
    h: shape.area.h * canvas.h,
  };
  const scale = Math.min(area.w / artW, area.h / artH);
  const w = Math.max(1, Math.round(artW * scale));
  const h = Math.max(1, Math.round(artH * scale));
  return {
    x: Math.round(area.x + (area.w - w) / 2),
    y: Math.round(area.y + (area.h - h) / 2),
    w,
    h,
    area,
    // Quanto dell'area stampabile viene usato: sotto un terzo, la grafica
    // sulla maglietta vera sembrerà un francobollo.
    fill: (w * h) / (area.w * area.h),
  };
}

/** Il capo scuro vuole una sagoma con un bordo chiaro, o sparisce sul fondo. */
export function outlineFor(garmentId) {
  const g = getGarment(garmentId);
  const light = g.rgb.reduce((a, b) => a + b, 0) / 3 > 140;
  return light ? 'rgba(17,17,17,0.28)' : 'rgba(245,240,232,0.22)';
}
