import { useCallback, useEffect, useState } from 'react';
import { CHIAVE, giornoLocale, leggiPocket, metti as mettiPuro, togli as togliPuro } from '../engine/pocket.js';

function leggi() {
  let testo = null;
  try {
    testo = localStorage.getItem(CHIAVE);
  } catch {
    /* archivio negato: il pocket vale per questa visita */
  }
  return leggiPocket(testo, giornoLocale());
}

function scrivi(p) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(p));
  } catch {
    /* archivio pieno o negato */
  }
}

/**
 * Il pocket visto da React. La regola sta in `engine/pocket.js`; qui solo la
 * chiave e il giorno: chi tiene la pagina aperta oltre mezzanotte trova il
 * pocket svuotato al primo ritorno sulla scheda, e due schede (studio e
 * home) si parlano con l'evento `storage`.
 */
export function usePocket() {
  const [pocket, setPocket] = useState(leggi);

  useEffect(() => {
    const rileggi = () => setPocket(leggi());
    const quando = () => document.visibilityState === 'visible' && rileggi();
    window.addEventListener('storage', rileggi);
    window.addEventListener('focus', rileggi);
    document.addEventListener('visibilitychange', quando);
    return () => {
      window.removeEventListener('storage', rileggi);
      window.removeEventListener('focus', rileggi);
      document.removeEventListener('visibilitychange', quando);
    };
  }, []);

  /** Mette un id; restituisce l'id uscito per il tetto, o `null`. */
  const metti = useCallback((id) => {
    const { pocket: nuovo, uscito } = mettiPuro(leggi(), id);
    scrivi(nuovo);
    setPocket(nuovo);
    return uscito;
  }, []);

  const togli = useCallback((id) => {
    const nuovo = togliPuro(leggi(), id);
    scrivi(nuovo);
    setPocket(nuovo);
  }, []);

  return { pocket, metti, togli };
}
