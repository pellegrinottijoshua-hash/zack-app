import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { localServices, paidServices } from '../services.js';
import Icon from './Icon.jsx';

/**
 * Un personaggio per servizio.
 *
 * Compare per un attimo quando si sceglie un servizio, e se ne va: e' il modo
 * in cui il cast entra nel prodotto senza occupare spazio in permanenza.
 *
 * ⚠️ Punta ai ritratti 3D che esistono oggi. I 2D in lavorazione andranno agli
 * STESSI percorsi, quindi sostituire i file non tocca una riga di codice.
 * E se un file manca l'immagine non compare: la scelta del servizio funziona
 * lo stesso, perche' una faccia non e' mai l'unico segnale.
 */
const PERSONAGGIO = {
  brain: 'imoth',
  scontorna: 'izack',
  vettorializza: 'iseagull',
  editor: 'iant',
  filmato: 'icat',
  suono: 'ipigeon',
};

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
  const nav = useRef(null);
  const [lampo, setLampo] = useState(null);

  /**
   * Il servizio scelto va al CENTRO della barra, e gli altri scorrono.
   *
   * L'ordine non cambia mai — e' la barra che si sposta. L'alternativa era far
   * scambiare di posto il premuto e il centrale: movimento piu' corto, ma
   * l'ordine cambierebbe a ogni scelta, e una barra che si rimescola non si
   * impara piu’.
   *
   * Vale solo dove la barra scorre davvero, cioe’ sul telefono: su desktop e’
   * una colonna e `scrollIntoView` non farebbe niente di utile.
   */
  useEffect(() => {
    const barra = nav.current;
    const el = barra?.querySelector('[aria-pressed="true"]');
    if (!el || !barra || barra.scrollWidth <= barra.clientWidth) return;

    /*
     * Si calcola lo scorrimento e si muove LA BARRA, invece di chiedere
     * `scrollIntoView` all'elemento. Due ragioni, tutte e due misurate il
     * 2026-08-28:
     *
     * - `scrollIntoView` puo' scorrere anche la PAGINA, e questa barra e'
     *   `position: fixed` — trascinerebbe con se' tutto il resto;
     * - **`behavior: 'smooth'` non si passa da qui.** Misurato: con quella
     *   opzione lo `scrollLeft` restava 0, senza arrivava al bersaglio esatto.
     *   La morbidezza sta nel CSS (`scroll-behavior`), che e' un abbellimento
     *   e rispetta da solo chi ha chiesto meno animazioni. Il centramento
     *   invece e' il comportamento: **una cosa che serve non puo' dipendere
     *   dal fatto che un'animazione parta.**
     */
    const meta = barra.clientWidth / 2;
    const centroEl = el.offsetLeft + el.offsetWidth / 2;
    barra.scrollTo({ left: centroEl - meta });
  }, [current]);

  const scegli = (s) => {
    setLampo(PERSONAGGIO[s.id] || null);
    onPick(s);
  };

  return (
    <nav ref={nav} className="toolrail" data-collapsed={collapsed} aria-label={t('rail.title')}>
      {lampo && (
        <img
          className="rail-lampo"
          key={`${lampo}-${current}`}
          src={`/zack/cast/${lampo}-96.webp`}
          alt=""
          aria-hidden="true"
          width="96"
          height="96"
          onAnimationEnd={() => setLampo(null)}
          onError={() => setLampo(null)}
        />
      )}
      <p className="group-label">{collapsed ? '·' : t('rail.local')}</p>
      {localServices().map((s) => (
        <Item key={s.id} service={s} active={current === s.id} collapsed={collapsed} onPick={scegli} />
      ))}

      <p className="group-label">{collapsed ? '·' : t('rail.paid')}</p>
      {paidServices().map((s) => (
        <Item key={s.id} service={s} active={current === s.id} collapsed={collapsed} onPick={scegli} />
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
