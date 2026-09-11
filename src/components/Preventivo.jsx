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
export default function Preventivo({ servizio, saldo, riferimenti = 0, onRicarica }) {
  // Il prezzo sale coi riferimenti, e qui si sanno gia': e' il motivo per cui
  // «prima che tu prema» resta letterale invece che approssimativo.
  const { total } = prezzoDi(servizio, { riferimenti });
  const lang = getLang();
  const basta = saldo >= total;

  return (
    <p className={`preventivo${basta ? '' : ' preventivo-corto'}`}>
      <strong>{formatEuro(total, lang)}</strong>
      <span>{t('immagine.prezzoNota')}</span>
      {/*
       * Critical del giro di correzioni: era uno `<span>`, una frase che si
       * legge e basta. Ma e' proprio QUI che uno scopre di aver bisogno di
       * crediti — nel momento in cui il preventivo dice che non bastano — e
       * lasciarlo a leggere una frase senza uscita era il difetto in piccolo,
       * ripetuto nello stesso punto in cui il vicolo cieco si vedeva intero.
       * Un tasto, non un'etichetta: apre lo stesso pannello del saldo in
       * striscia.
       */}
      {!basta && (
        <button type="button" className="preventivo-manca" onClick={onRicarica}>
          {t('immagine.saldoCorto')}
        </button>
      )}
    </p>
  );
}
