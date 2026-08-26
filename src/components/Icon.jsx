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

  return (
    <svg viewBox="0 0 24 24" className={classi || undefined} aria-hidden="true" focusable="false">
      {tracciati.map((d, i) => (
        // La chiave è l'indice perché una lista di tracciati non si riordina
        // mai: è una costante, non dati.
        // Il ritardo scala l'uno dopo l'altro: l'icona si scrive, non appare.
        <path key={i} d={d} pathLength="1" style={draw ? { animationDelay: `${i * 90}ms` } : undefined} />
      ))}
    </svg>
  );
}
