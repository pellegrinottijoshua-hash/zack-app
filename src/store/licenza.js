/**
 * La licenza, ricordata.
 *
 * Serve alla grazia dei sette giorni (spec § 3.4): senza memoria si
 * ripartirebbe da «mai entrato» a ogni apertura, e uno studio pagato non si
 * aprirebbe la prima volta che il server ha il raffreddore.
 *
 * `localStorage` e non la Cache API: sono poche centinaia di byte, e devono
 * poter essere letti **prima** di disegnare qualunque cosa.
 */

export const CHIAVE = 'jayl.licenza';

const archivioDiCasa = () => globalThis.localStorage;

/** La licenza salvata, o `null`. Un archivio negato o rovinato vale `null`. */
export function leggiLicenza(archivio = archivioDiCasa()) {
  try {
    const grezzo = archivio?.getItem(CHIAVE);
    if (!grezzo) return null;
    const l = JSON.parse(grezzo);
    return l && typeof l === 'object' ? l : null;
  } catch {
    // Illeggibile o negato: vale «niente». `statoLicenza(null)` dirà
    // «mai-entrato», che è la risposta prudente.
    return null;
  }
}

/** Salva, e dice se c'è riuscita. Un «no» non è un errore: è una sessione sola. */
export function salvaLicenza(licenza, archivio = archivioDiCasa()) {
  try {
    archivio?.setItem(CHIAVE, JSON.stringify(licenza));
    return true;
  } catch {
    return false;
  }
}
