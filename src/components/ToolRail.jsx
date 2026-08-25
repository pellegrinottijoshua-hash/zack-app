import { t } from '../i18n/index.js';
import { localServices, paidServices } from '../services.js';

/**
 * Icone disegnate a mano, non una libreria: sono sei, pesano nulla, e restano
 * coerenti col tratto sottile del resto dell'interfaccia.
 */
const ICONS = {
  scissors: 'M6 4l12 12M18 4L6 16M6 18.5a2 2 0 1 0 0 .01M18 18.5a2 2 0 1 0 0 .01',
  vector: 'M5 5h3v3H5zM16 16h3v3h-3zM8 6.5h5.5a4 4 0 0 1 4 4V16',
  pencil: 'M4 20l4-1 10-10-3-3L5 16zM14 6l3 3',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9.5a1 1 0 1 0 0 .01',
  film: 'M4 5h16v14H4zM9 5v14M15 5v14M4 9.5h5M15 9.5h5M4 14.5h5M15 14.5h5',
  wave: 'M3 12h2M7 7v10M11 4v16M15 8v8M19 11h2',
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONS[name]} />
    </svg>
  );
}

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
      <Icon name={service.icon} />
      {!collapsed && <span className="tool-name">{label}</span>}
      {!collapsed && service.price != null && (
        <span className="tool-price">{service.price.toFixed(2).replace('.', ',')} €</span>
      )}
      {!collapsed && !service.ready && <span className="tool-soon">{t('rail.soon')}</span>}
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
