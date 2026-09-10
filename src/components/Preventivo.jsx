import { prezzoDi } from '../engine/listino.js';
import { formatEuro } from '../engine/ledger.js';
import { getLang, t } from '../i18n/index.js';

/**
 * Il prezzo, prima del tasto.
 *
 * *«Ogni generazione ti dice quanto costa prima che tu prema»* è pubblicato
 * sulla home: non è una preferenza dell'interfaccia, è una promessa operativa.
 *
 * ⚠️ **Nessuna cifra qui dentro.** Il numero viene da `prezzoDi`, la stessa
 * funzione che usa il Worker per addebitare. Scriverlo a mano sarebbe una
 * seconda fonte del prezzo, e il giorno che il listino cambia mostreresti un
 * numero addebitandone un altro.
 */
export default function Preventivo({ servizio, saldo, riferimenti = 0 }) {
  // Il prezzo sale coi riferimenti, e qui si sanno gia': e' il motivo per cui
  // «prima che tu prema» resta letterale invece che approssimativo.
  const { total } = prezzoDi(servizio, { riferimenti });
  const lang = getLang();
  const basta = saldo >= total;

  return (
    <p className={`preventivo${basta ? '' : ' preventivo-corto'}`}>
      <strong>{formatEuro(total, lang)}</strong>
      <span>{t('immagine.prezzoNota')}</span>
      {!basta && <span className="preventivo-manca">{t('immagine.saldoCorto')}</span>}
    </p>
  );
}
