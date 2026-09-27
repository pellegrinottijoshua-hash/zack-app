/**
 * La corsia Immagine della home — le regole, senza il disegno (fetta 2c).
 *
 * Sta a parte da `CorsiaImmagine.jsx` per la stessa ragione di `pelle.js`: il
 * progetto non monta componenti nelle prove (niente jsdom), quindi ciò che
 * decide va in funzioni pure, e il componente si limita a chiederlo.
 */

import { prezzoDi, limitiDi } from '../engine/listino.js';

export const VOCE = 'immagine-nbp';

/**
 * Il ruolo dei riferimenti scelti dalla home. Uno solo, apposta: il ruolo
 * serve ai limiti e al preventivo, il fornitore non lo riceve, e un menu per
 * sceglierlo sarebbe una domanda in più a chi non è ancora entrato.
 */
export const RUOLO_HOME = 'oggetto';

/** Quanti riferimenti accetta la home: il tetto del listino per quel ruolo. */
export const TETTO = limitiDi(VOCE)[RUOLO_HOME];

/**
 * Aggiunge i nuovi riferimenti fino al tetto, e dice quanti ne ha lasciati
 * fuori — che si dicono, non si scartano in silenzio.
 */
export function aggiungiRiferimenti(lista, nuovi, tetto = TETTO) {
  const posto = Math.max(0, tetto - lista.length);
  return { lista: [...lista, ...nuovi.slice(0, posto)], fuori: Math.max(0, nuovi.length - posto) };
}

/** Il prezzo di QUESTA richiesta, coi riferimenti contati: quello che si addebita. */
export function prezzoCorsia(riferimenti) {
  return prezzoDi(VOCE, { riferimenti: riferimenti.length }).total;
}

/**
 * Cosa fa il tasto Zack, adesso.
 *
 * - `spento`: niente prompt, o un lavoro già in corso;
 * - `ricarica`: il saldo non basta (o non si sa, perché non c'è sessione) —
 *   il tasto apre la ricarica, e il prezzo è scritto accanto PRIMA di premere;
 * - `genera`: si parte.
 *
 * ⚠️ Senza sessione il saldo è zero, non «sconosciuto»: aprire la home non
 * crea un ospite (regola della 2b), quindi chi non ha mai pagato non ha
 * credito, ed è giusto che il primo clic apra la ricarica.
 */
export function statoTasto({ prompt, saldo, prezzo, inCorso = false }) {
  if (inCorso || !prompt || !prompt.trim()) return 'spento';
  if (!(saldo >= prezzo)) return 'ricarica';
  return 'genera';
}
