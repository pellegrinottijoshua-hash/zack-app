import { t } from '../i18n/index.js';
import { localServices, paidServices } from '../services.js';
import Icon from './Icon.jsx';

function Item({ service, active, collapsed, onPick }) {
  const label = t(`${service.key}.label`);
  return (
    <button
      className="tool-item"
      aria-pressed={active}
      aria-label={label}
      title={collapsed ? `${label} — ${t(`${service.key}.help`)}` : t(`${service.key}.help`)}
      onClick={() => onPick(service)}
    >
      <Icon name={service.icon} draw />
      {!collapsed && <span className="tool-name">{label}</span>}
      {/* Prezzo OPPURE 'presto', mai entrambi: a 190px si contendono lo
          spazio e vince la troncatura del nome, che è l'unica cosa
          davvero necessaria. */}
      {!collapsed &&
        (service.ready ? (
          service.price != null && (
            <span className="tool-price">{service.price.toFixed(2).replace('.', ',')} €</span>
          )
        ) : (
          <span className="tool-soon" title={`~${service.price?.toFixed(2).replace('.', ',')} €`}>
            {t('rail.soon')}
          </span>
        ))}
    </button>
  );
}

/**
 * La barra dei servizi.
 *
 * Il divisorio fra i due gruppi comunica la differenza fra gratis e a consumo
 * senza una parola di spiegazione, e il saldo resta in vista così la domanda
 * "quanto mi resta?" non si ripresenta a ogni generazione.
 *
 * Si riduce a sole icone mentre si lavora: nell'editor 130 px di tela contano
 * più dei nomi, che restano raggiungibili col passaggio del mouse.
 */
export default function ToolRail({ current, collapsed, balance, onPick }) {
  return (
    <nav className="toolrail" data-collapsed={collapsed} aria-label={t('rail.title')}>
      <p className="group-label">{collapsed ? '·' : t('rail.local')}</p>
      {localServices().map((s) => (
        <Item key={s.id} service={s} active={current === s.id} collapsed={collapsed} onPick={onPick} />
      ))}

      <p className="group-label">{collapsed ? '·' : t('rail.paid')}</p>
      {paidServices().map((s) => (
        <Item key={s.id} service={s} active={current === s.id} collapsed={collapsed} onPick={onPick} />
      ))}

      <div className="rail-foot">
        {collapsed ? (
          <span title={t('rail.balance')}>€</span>
        ) : (
          <>
            <span>{t('rail.balance')}</span>
            <b>{balance != null ? `${balance.toFixed(2).replace('.', ',')} €` : '—'}</b>
          </>
        )}
      </div>
    </nav>
  );
}
