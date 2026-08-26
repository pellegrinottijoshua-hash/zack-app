/**
 * La matematica della home a scorrimento.
 *
 * Qui c'è solo il conto, puro e verificabile: quale blocco si sta leggendo e
 * quanto si è avanzati dentro. Il collegamento al DOM sta in `HomeVideo.jsx`.
 *
 * È esattamente il tipo di calcolo che sbaglia in silenzio — un blocco fuori
 * posto non solleva niente, fa solo vedere il gesto sbagliato accanto alla
 * frase giusta.
 */

/**
 * Quale blocco sta guardando chi scorre, e quanto è dentro.
 *
 * Prende i riquadri delle sezioni già misurati: chi chiama sa quali sono, e
 * misurarli qui costringerebbe questa funzione a toccare il DOM — cioè a
 * diventare non verificabile.
 *
 * @param {{top:number,height:number}[]} riquadri
 * @param {number} altezzaFinestra
 */
export function blockAt(riquadri, altezzaFinestra) {
  if (!riquadri?.length) return { indice: 0, progresso: 0 };

  // L'ultima sezione il cui bordo alto è già passato sopra la metà dello
  // schermo: è quella che si sta leggendo, non quella che sta arrivando.
  const meta = altezzaFinestra / 2;
  let indice = 0;
  for (let i = 0; i < riquadri.length; i++) {
    if (riquadri[i].top <= meta) indice = i;
  }
  const r = riquadri[indice];
  const percorso = r.height || 1;
  const progresso = Math.max(0, Math.min(1, (meta - r.top) / percorso));
  return { indice, progresso };
}

