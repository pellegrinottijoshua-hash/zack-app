import { useState } from 'react';
import { t } from '../i18n/index.js';

/**
 * Come si usa il vettoriale, in quattro schermate.
 *
 * Richiesta del committente il 2026-09-09: *«facciamo in modo che ci sia un
 * tutorial ben visibile in alto a destra che indirizzi chiunque non sa usare
 * il vettoriale a saperlo utilizzare»*.
 *
 * **Non un video.** Un video va scaricato, non si cerca dentro, e invecchia
 * male: il giorno che un comando si sposta il video mente e nessuno se ne
 * accorge. Quattro frasi che nominano i comandi restano vere finché i comandi
 * si chiamano così — e le loro etichette vengono dallo stesso dizionario dei
 * cerchi, quindi si spostano insieme a loro.
 */
const PASSI = ['p1', 'p2', 'p3', 'p4'];

export default function Tutorial({ onChiudi }) {
  const [i, setI] = useState(0);
  const ultimo = i === PASSI.length - 1;

  return (
    <div className="tutorial" role="dialog" aria-label={t('tutorial.titolo')}>
      <h3>{t('tutorial.titolo')}</h3>
      <p className="tut-passo">{t('tutorial.passo', { n: i + 1, tot: PASSI.length })}</p>
      <p className="tut-testo">{t(`tutorial.${PASSI[i]}`)}</p>

      <div className="tut-azioni">
        <button className="btn ghost" disabled={i === 0} onClick={() => setI((v) => v - 1)}>
          {t('tutorial.indietro')}
        </button>
        {ultimo ? (
          <button className="btn" onClick={onChiudi}>
            {t('tutorial.chiudi')}
          </button>
        ) : (
          <button className="btn" onClick={() => setI((v) => v + 1)}>
            {t('tutorial.avanti')}
          </button>
        )}
      </div>

      {/* I pallini dicono quanto manca: quattro passi senza un'idea di dove
          si è sono quattro volte «e adesso?». */}
      <div className="tut-pallini" aria-hidden="true">
        {PASSI.map((p, n) => (
          <i key={p} data-qui={n === i || undefined} />
        ))}
      </div>
    </div>
  );
}
