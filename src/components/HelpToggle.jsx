import { t } from '../i18n/index.js';
import { isHelpOn, toggleHelp } from '../i18n/help.js';

/**
 * L'interruttore delle spiegazioni, sempre visibile accanto alla lingua.
 *
 * Sta nella barra in alto e non dentro un menu: chi non capisce un comando non
 * va a cercare nelle impostazioni, si blocca e chiude la scheda.
 */
export default function HelpToggle({ onChange }) {
  const on = isHelpOn();
  return (
    <button
      className="helptoggle"
      aria-pressed={on}
      title={t('control.help.help')}
      onClick={() => {
        toggleHelp();
        onChange?.();
      }}
    >
      <span aria-hidden="true">?</span>
      {t('control.help.label')}
    </button>
  );
}
