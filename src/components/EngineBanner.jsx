import { t } from '../i18n/index.js';

/**
 * Dice all'utente cosa sta succedendo, in parole normali.
 *
 * Tre stati, e nessuno di essi è "caricamento":
 * - scaricamento → spiega che succede una volta sola, così l'attesa ha un senso
 * - modalità lenta → dice cosa manca e cosa cambierebbe, senza colpevolizzare
 * - al lavoro → dice cosa sta facendo in questo momento
 *
 * Un utente che crede di avere la qualità piena e non ce l'ha diventa una
 * recensione negativa: per questo l'avviso della modalità lenta si può
 * chiudere, ma non si nasconde da solo.
 */
export default function EngineBanner({ tier, phase, progress, onDismiss }) {
  if (phase === 'downloading') {
    const pct = Math.round(progress ?? 0);
    return (
      <div className="banner">
        <strong>{t('engine.download.title')}</strong>
        <p>{t('engine.download.body')}</p>
        <div
          className="bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <small>{t('engine.download.progress', { pct })}</small>
      </div>
    );
  }

  if (tier === 'compatibilita') {
    return (
      <div className="banner warn">
        <strong>{t('engine.slow.title')}</strong>
        <p>{t('engine.slow.body')}</p>
        <button className="btn ghost small" onClick={onDismiss}>
          {t('engine.slow.action')}
        </button>
      </div>
    );
  }

  return null;
}
