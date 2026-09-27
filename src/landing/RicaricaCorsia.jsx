import { useState } from 'react';
import { formatEuro } from '../engine/ledger.js';
import { PACCHETTI } from '../engine/pacchetti.js';
import { vaiAllaRicarica } from '../lib/conto.js';

/**
 * La ricarica dentro una corsia della home (Immagine, Video).
 *
 * Una sola, per due corsie: i pacchetti, l'avviso onesto dell'ospite, il
 * ritorno sulla home. `salvaBozza` la passa la corsia: prima di andare su
 * Stripe ognuna mette da parte il SUO prompt, e al ritorno lo ritrova.
 */
export default function RicaricaCorsia({ t, lang, ospite, salvaBozza, onChiudi, onErrore }) {
  const [pagando, setPagando] = useState(null);

  async function paga(id) {
    setPagando(id);
    try {
      salvaBozza?.();
    } catch {
      /* troppo grande o negato: si paga lo stesso, il prompt si riscrive */
    }
    try {
      await vaiAllaRicarica(id, { ritorno: 'home' });
    } catch {
      setPagando(null);
      onErrore?.(t.pagamentoNo);
    }
  }

  return (
    <div className="corsia-ricarica">
      <div className="corsia-pacchetti">
        {Object.entries(PACCHETTI).map(([id, p]) => (
          <button key={id} type="button" className="lp-cta small" disabled={pagando !== null} onClick={() => paga(id)}>
            {formatEuro(p.millesimi, lang)}
          </button>
        ))}
      </div>
      {ospite && <p className="corsia-ospite">{t.ospite}</p>}
      <button type="button" className="comelink" onClick={onChiudi}>
        {t.chiudi}
      </button>
    </div>
  );
}
