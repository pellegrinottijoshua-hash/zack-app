import { getLang, setLang, LANGS, t } from '../i18n/index.js';

/**
 * Due lettere, sempre visibili. La lingua non va nascosta in un menu di
 * impostazioni: chi apre l'app nella lingua sbagliata deve poterla cambiare
 * prima ancora di capire cosa fa l'app.
 */
export default function LanguageSwitch({ onChange }) {
  const current = getLang();
  return (
    <div className="langswitch" title={t('control.language.help')}>
      {LANGS.map((l) => (
        <button
          key={l}
          aria-pressed={current === l}
          aria-label={`${t('control.language.label')}: ${l.toUpperCase()}`}
          onClick={() => {
            setLang(l);
            onChange?.(l);
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
