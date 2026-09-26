import { useState } from 'react';
import { formatEuro } from '../engine/ledger.js';
import { PACCHETTI } from '../engine/pacchetti.js';
import { getLang, t } from '../i18n/index.js';
import { vaiAllaRicarica } from '../lib/conto.js';

/**
 * I tre pacchetti. Tre tasti e nessuna casella da riempire.
 *
 * Una casella vuota vende meno di tre tasti: chi non sa quanto costa una
 * generazione non sa cosa scriverci.
 *
 * Gli importi vengono da `PACCHETTI` (`src/engine/pacchetti.js`) — la STESSA
 * definizione che il Worker legge per decidere quanto far incassare a
 * Stripe, non una copia scritta qui: due copie degli stessi numeri divergono
 * al primo pacchetto nuovo, e il giorno che divergono si mostra un prezzo e
 * se ne addebita un altro — sulla schermata del pagamento.
 */
export default function Ricarica({ saldo, ospite = false, onErrore, onChiudi }) {
  const lang = getLang();
  const [inCorso, setInCorso] = useState(null);

  return (
    <div className="ricarica">
      <h3>{t('ricarica.titolo')}</h3>
      <p className="ricarica-saldo">{t('ricarica.hai', { saldo: formatEuro(saldo, lang) })}</p>

      <div className="ricarica-pacchetti">
        {Object.entries(PACCHETTI).map(([id, p]) => (
          <button
            key={id}
            className="btn"
            disabled={inCorso !== null}
            onClick={async () => {
              setInCorso(id);
              try {
                await vaiAllaRicarica(id);
              } catch {
                setInCorso(null);
                onErrore(t('ricarica.no'));
              }
            }}
          >
            {formatEuro(p.millesimi, lang)}
          </button>
        ))}
      </div>

      {/* La frase del committente (§ 6.1): «circa 12 centesimi» viene dal
          margine dichiarato in `ledger.js` (14% del costo), che sui riferimenti
          varia fra il 12 e il 13% del prezzo secondo quanti se ne passano —
          «circa», non un numero esatto scelto a occhio (Task 6 della revisione). */}
      <p className="ricarica-margine">{t('ricarica.dodici')}</p>
      <p className="ricarica-durata">{t('ricarica.nonScadono')}</p>
      {/* L'avviso onesto (fetta 2b). Si paga senza email, e il prezzo di
          questa comodita' va detto PRIMA di pagare, non scoperto dopo: il
          credito vive nella sessione di questo browser. Non si chiude, perche'
          non e' una notifica: e' un fatto, vero finche' si resta ospiti. */}
      {ospite && <p className="ricarica-ospite">{t('ricarica.ospite')}</p>}

      <button className="btn ghost" onClick={onChiudi}>{t('ricarica.chiudi')}</button>
    </div>
  );
}
