import { t } from './index.js';

/**
 * "Spiegami": il tutorial vive dentro l'interfaccia.
 *
 * Un manuale a parte non lo apre nessuno, e un tooltip lo trova solo chi già
 * sospetta che ci sia qualcosa. Qui l'utente accende un interruttore e ogni
 * comando dice cosa fa, nella sua lingua, finché non lo spegne.
 *
 * La preferenza resta salvata: chi ha bisogno di spiegazioni ne ha bisogno
 * anche domani, e chi non ne ha bisogno non deve rispegnerle ogni volta.
 */

const KEY = 'jayl.helpMode';
const listeners = new Set();

let on = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Navigazione privata o storage negato: si parte spenti, senza rompere.
    return false;
  }
})();

export function isHelpOn() {
  return on;
}

export function toggleHelp() {
  on = !on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // La preferenza non si salva, ma la sessione corrente funziona lo stesso.
  }
  for (const fn of listeners) fn(on);
  return on;
}

export function onHelpChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Restituisce il testo d'aiuto solo se la modalità è accesa.
 * I componenti chiamano questa e non `t` direttamente, così la decisione di
 * mostrare o no sta in un posto solo.
 */
export function help(key) {
  return on ? t(key) : null;
}
