import { t } from '../i18n/index.js';

const KEY = 'jayl.seenOnboarding';

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Storage negato: meglio mostrarlo di nuovo che non mostrarlo mai.
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* la sessione corrente funziona lo stesso */
  }
}

/**
 * Tre passi, una volta sola.
 *
 * Non è un tour a tappe con dodici schermate: chi apre uno strumento vuole
 * usarlo, non leggerlo. Dice solo dove si trascina, cosa premere e dove
 * finisce il risultato — e indica dove trovare il resto se serve.
 */
export default function Onboarding({ onClose }) {
  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label={t('onboarding.title')}>
      <div className="onboarding-card">
        <span className="rule" />
        <h2>{t('onboarding.title')}</h2>
        <ol>
          <li>{t('onboarding.step1')}</li>
          <li>{t('onboarding.step2')}</li>
          <li>{t('onboarding.step3')}</li>
        </ol>
        <p className="hint">{t('onboarding.hint')}</p>
        <button
          className="btn"
          autoFocus
          onClick={() => {
            markSeen();
            onClose();
          }}
        >
          {t('onboarding.action')}
        </button>
      </div>
    </div>
  );
}
