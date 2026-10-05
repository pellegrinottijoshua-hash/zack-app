import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pulisciTracciato, quasiBianco, traslazione } from '../src/engine/tracciato.js';

/* Il tracciato pulito (fase 8a): come esce da VTracer, e come lo vuole l'editor. */

const SVG = (paths, w = 100, h = 100) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">\n${paths.join('\n')}\n</svg>`;
const FONDO = (fill) =>
  `<path d="M0 0 C33 0 66 0 100 0 C100 33 100 66 100 100 C66 100 33 100 0 100 C0 66 0 33 0 0 Z " fill="${fill}" transform="translate(0,0)"/>`;
const LOGO = '<path d="M0 0 C3.33 0 6.67 0 10 0 L10 10 C5 15 5 15 0 10 Z " fill="#C4A35A" transform="translate(40,30)"/>';

test('⚠️ il fondo quasi bianco che copre la tela si toglie; il logo resta', () => {
  const { svg, tolti, puliti } = pulisciTracciato(SVG([FONDO('#FEFEFE'), LOGO]));
  assert.equal(tolti, 1);
  assert.equal(puliti, 1);
  assert.equal((svg.match(/<path/g) || []).length, 1);
  assert.ok(svg.includes('fill="#C4A35A"'));
});

test('⚠️ un fondo colorato è parte del disegno, e resta', () => {
  const { svg, tolti } = pulisciTracciato(SVG([FONDO('#111111'), LOGO]));
  assert.equal(tolti, 0);
  assert.equal((svg.match(/<path/g) || []).length, 2);
});

test('⚠️ la traslazione entra nelle coordinate, e nessun transform resta', () => {
  const { svg } = pulisciTracciato(SVG([LOGO]));
  assert.ok(!svg.includes('transform='), svg);
  const d = /d="([^"]*)"/.exec(svg)[1];
  // Il lato in alto (curva sulla retta) torna dritto, spostato di (40,30).
  assert.ok(d.startsWith('M 40 30 L 50 30 L 50 40 C 45 45 45 45 40 40'), d);
});

test('quello che non sa leggere lo lascia com’è', () => {
  const arco = '<path d="M0 0 A5 5 0 0 1 10 0" fill="#000" transform="translate(1,1)"/>';
  const ruotato = '<path d="M0 0 L10 0" fill="#000" transform="rotate(45)"/>';
  const { svg, puliti } = pulisciTracciato(SVG([arco, ruotato]));
  assert.equal(puliti, 0);
  assert.ok(svg.includes(arco) && svg.includes(ruotato));
});

test('una sagoma quasi bianca che NON copre la tela resta (un dettaglio bianco del logo)', () => {
  const dettaglio = '<path d="M10 10 L20 10 L20 20 Z" fill="#FFFFFF" transform="translate(0,0)"/>';
  assert.equal(pulisciTracciato(SVG([dettaglio])).tolti, 0);
});

test('i colori quasi bianchi e le traslazioni', () => {
  assert.equal(quasiBianco('#ffffff'), true);
  assert.equal(quasiBianco('#F0F0F0'), true);
  assert.equal(quasiBianco('#fff'), true);
  assert.equal(quasiBianco('#EFFFFF'), false);
  assert.equal(quasiBianco('#C4A35A'), false);
  assert.deepEqual(traslazione('translate(3,4)'), { x: 3, y: 4 });
  assert.deepEqual(traslazione('translate(3 -4.5)'), { x: 3, y: -4.5 });
  assert.deepEqual(traslazione('translate(7)'), { x: 7, y: 0 });
  assert.equal(traslazione('scale(2)'), null);
});

test('⚠️ il fondo ritagliato sul logo ha dei buchi, e si toglie lo stesso', () => {
  const conBuchi =
    '<path d="M0 0 L100 0 L100 100 L0 100 Z M40 40 L60 40 L60 60 L40 60 Z" fill="#FDFDFD" transform="translate(0,0)"/>';
  assert.equal(pulisciTracciato(SVG([conBuchi, LOGO])).tolti, 1);
});

test('⚠️ il «bianco e nero» di VTracer (fill none, nessun contorno) diventa nero; un contorno vero resta', () => {
  const bw = '<path d="M10 10 L20 10 L20 20 Z" fill="none" transform="translate(5,5)"/>';
  assert.ok(pulisciTracciato(SVG([bw])).svg.includes('fill="#000000"'));
  const contorno = '<path d="M10 10 L20 10" fill="none" stroke="#000" transform="translate(0,0)"/>';
  assert.ok(pulisciTracciato(SVG([contorno])).svg.includes('fill="none"'));
});

test('⚠️ col colore chiave, ogni tracciato di quel colore se ne va (anche a pezzi, anche arrotondato)', () => {
  const pezzo = (fill, x) => `<path d="M${x} 0 L${x + 10} 0 L${x + 10} 100 Z" fill="${fill}" transform="translate(0,0)"/>`;
  const { svg, tolti } = pulisciTracciato(SVG([pezzo('#FF00FF', 0), pezzo('#FC03FA', 50), LOGO]), { fondo: '#ff00ff' });
  assert.equal(tolti, 2);
  assert.equal((svg.match(/<path/g) || []).length, 1);
});

test('il colore chiave è il più lontano dai colori del disegno', async () => {
  const { coloreChiave, haTrasparenza } = await import('../src/engine/tracciato.js');
  const px = (colori) => Uint8ClampedArray.from(colori.flatMap((c) => Array(7).fill([...c, 255]).flat()));
  assert.equal(coloreChiave(px([[0, 0, 0]])), '#ff00ff');
  // Un logo magenta: la chiave non può essere il magenta.
  assert.notEqual(coloreChiave(px([[250, 5, 250], [0, 0, 0]])), '#ff00ff');
  assert.equal(haTrasparenza(Uint8ClampedArray.from([1, 2, 3, 255])), false);
  assert.equal(haTrasparenza(Uint8ClampedArray.from([1, 2, 3, 254])), true);
});
