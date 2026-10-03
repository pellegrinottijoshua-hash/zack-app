import { t } from '../i18n/index.js';
import { livelloSpazio, pesoLeggibile, pesoCestino } from '../engine/archivio.js';

/**
 * Il cestino di Brain (fase 5a, B-d): restituisce. Tiene finché non lo
 * svuoti, e ci si rovista dentro. Svuotarlo è l'unico gesto senza ritorno di
 * tutto il prodotto, quindi chiede conferma dicendo quanto e cosa.
 *
 * Qui si dice anche lo spazio del browser: è dove si va quando manca, ed è
 * l'unico posto da cui se ne può liberare (T6 ⚠️).
 */
export default function Cestino({ cestino, usage, onRimetti, onSvuota, onChiudi }) {
  const spazio = livelloSpazio(usage);
  const peso = pesoLeggibile(pesoCestino(cestino));

  return (
    <div className="scegli-asset cestino">
      <div className="scegli-testa">
        <h3>{t('brain.cestino.title')}</h3>
        <button className="btn ghost small" onClick={onChiudi} aria-label={t('bar.clear')}>
          ×
        </button>
      </div>

      {cestino.length === 0 ? (
        <p className="brain-vuoto">{t('brain.cestino.vuoto')}</p>
      ) : (
        <ul className="cestino-elenco">
          {cestino.map((a) => (
            <li key={a.id}>
              <span className="cestino-nome" title={a.name}>
                {a.name}
              </span>
              <button className="btn ghost small" onClick={() => onRimetti(a.id)}>
                {t('brain.cestino.rimetti')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {spazio !== 'ignoto' && (
        <p className="cestino-spazio" data-livello={spazio} role={spazio === 'ok' ? undefined : 'status'}>
          {t('brain.spazio.misura', { usato: pesoLeggibile(usage.used), quota: pesoLeggibile(usage.quota) })}
          {spazio === 'pieno' && cestino.length > 0 && ` ${t('brain.spazio.proponi', { peso })}`}
        </p>
      )}

      {cestino.length > 0 && (
        <button
          className="btn"
          onClick={() => {
            if (window.confirm(t('brain.cestino.conferma', { n: cestino.length, peso }))) onSvuota();
          }}
        >
          {t('brain.cestino.svuota', { n: cestino.length, peso })}
        </button>
      )}
    </div>
  );
}
