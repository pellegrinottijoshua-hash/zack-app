/**
 * Il disegno delle icone. I tracciati stanno in `src/lib/icons.js`, dove i
 * test li leggono in Node senza browser: qui resta solo il come si mostrano.
 */

import { ICONS } from '../lib/icons.js';

/**
 * @param {object} props
 * @param {string} props.name
 * @param {boolean} [props.draw]  traccia l'icona col filo d'oro alla comparsa
 * @param {string} [props.className]
 */
export default function Icon({ name, draw = false, className = '' }) {
  const tracciati = ICONS[name] || ICONS.cartella;
  const classi = [draw ? 'icon-draw' : '', className].filter(Boolean).join(' ');

  /*
   * I tracciati di `icons.js` sono CONTORNI, sempre — anche `punto()`, che è
   * un cerchio da 0,9 di raggio e vive del suo filo. Quindi il come si
   * disegnano lo dichiara il componente, non una regola CSS accanto a ogni
   * posto che lo usa.
   *
   * Il difetto (2026-09-05, riferito dal committente: «le icone degli
   * strumenti sono fuorvianti e non si riconoscono»): solo `.tool-item svg`
   * dichiarava `fill: none; stroke: currentColor`, quindi i cerchi degli
   * strumenti prendevano il default del browser — **riempimento nero, nessun
   * contorno**. Una gomma riempita e' una macchia; e `M13.8 7.2l3 3`, che e'
   * una linea, riempita non si vede affatto. Non erano icone disegnate male:
   * erano disegnate al contrario.
   *
   * Messo qui, vale per ogni uso presente e futuro. Chi lo mette in un CSS
   * accanto deve ricordarsene ogni volta, e la volta che se ne dimentica
   * l'icona torna una macchia senza che niente si lamenti.
   */
  return (
    <svg
      viewBox="0 0 24 24"
      className={classi || undefined}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {tracciati.map((d, i) => (
        // La chiave è l'indice perché una lista di tracciati non si riordina
        // mai: è una costante, non dati.
        // Il ritardo scala l'uno dopo l'altro: l'icona si scrive, non appare.
        <path key={i} d={d} pathLength="1" style={draw ? { animationDelay: `${i * 90}ms` } : undefined} />
      ))}
    </svg>
  );
}
