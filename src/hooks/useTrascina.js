import { useEffect, useRef, useState } from 'react';
import { bersagliAccesi, eTrascinamento } from '../engine/pocket.js';

/** I cerchi su cui si posa: `data-bersaglio` sull'elemento (servizi, Brain, pocket). */
const BERSAGLIO = '[data-bersaglio]';

function accendi(accesi) {
  document.documentElement.setAttribute('data-trascina', '');
  for (const el of document.querySelectorAll(BERSAGLIO)) {
    if (accesi.includes(el.dataset.bersaglio)) el.setAttribute('data-acceso', '');
  }
}

function spegni() {
  document.documentElement.removeAttribute('data-trascina');
  for (const el of document.querySelectorAll('[data-acceso], [data-sopra]')) {
    el.removeAttribute('data-acceso');
    el.removeAttribute('data-sopra');
  }
}

/** Il bersaglio ACCESO sotto il dito, attraverso il fantasma e ciò che lo copre. */
function sotto(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    const b = el.closest(`${BERSAGLIO}[data-acceso]`);
    if (b) return b;
  }
  return null;
}

/**
 * Il trascinamento di un file verso un servizio, Brain o il pocket (4b).
 *
 * Pointer Events: topo e dito con lo stesso codice. Sotto `SOGLIA` il gesto
 * resta un tocco e il `click` apre l'ovale — sul telefono il trascinamento
 * lungo fallisce spesso, e il tocco è la strada che non deve fallire. Oltre
 * la soglia si accendono i bersagli di `bersagliAccesi`: gli stessi
 * dell'ovale, da una tabella sola.
 *
 * Restituisce i gestori da spargere sull'elemento, il fantasma da disegnare
 * e `taci(e)`, che il `click` chiama per non riaprire l'ovale subito dopo un
 * trascinamento finito sullo stesso elemento.
 */
export function useTrascina(onPosa) {
  const [fantasma, setFantasma] = useState(null);
  const gesto = useRef(null);
  const finito = useRef(0);

  function chiudi() {
    gesto.current = null;
    spegni();
    setFantasma(null);
  }

  // Un elemento che sparisce a metà gesto (il risultato cambia, il vassoio
  // si chiude) non deve lasciare la pagina coi cerchi accesi.
  useEffect(() => () => gesto.current && spegni(), []);

  const gestori = (carico) => ({
    onPointerDown(e) {
      if (!onPosa || e.button !== 0) return;
      gesto.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, vivo: false, sopra: null, carico };
      // In un `try`: su un puntatore non riconosciuto `setPointerCapture`
      // solleva, e interromperebbe il gesto prima di cominciare (§5).
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* senza cattura il gesto vale lo stesso finché il dito resta sopra */
      }
    },
    onPointerMove(e) {
      const g = gesto.current;
      if (!g || g.id !== e.pointerId) return;
      if (!g.vivo) {
        if (!eTrascinamento(e.clientX - g.x0, e.clientY - g.y0)) return;
        g.vivo = true;
        accendi(bersagliAccesi(carico.kind, carico.da));
      }
      const b = sotto(e.clientX, e.clientY);
      if (b !== g.sopra) {
        g.sopra?.removeAttribute('data-sopra');
        b?.setAttribute('data-sopra', '');
        g.sopra = b;
      }
      setFantasma({ x: e.clientX, y: e.clientY, carico });
    },
    onPointerUp(e) {
      const g = gesto.current;
      if (!g || g.id !== e.pointerId) return;
      const b = g.vivo ? sotto(e.clientX, e.clientY) : null;
      const vivo = g.vivo;
      chiudi();
      if (!vivo) return; // un tocco: ci pensa il `click`
      finito.current = performance.now();
      if (b) onPosa(b.dataset.bersaglio, g.carico);
    },
    onPointerCancel(e) {
      if (gesto.current?.id === e.pointerId) chiudi();
    },
  });

  /**
   * Vero se questo `click` è la coda di un trascinamento appena finito. Una
   * finestra di tempo e non un segnale da consumare: dopo un trascinamento
   * col dito il `click` spesso non arriva, e un segnale rimasto acceso
   * mangerebbe il tocco vero successivo.
   */
  function taci() {
    return performance.now() - finito.current < 400;
  }

  return { gestori, fantasma, taci };
}
