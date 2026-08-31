import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { localServices, servizioDelloStrumento } from '../services.js';
import Icon from './Icon.jsx';

/**
 * Un personaggio per servizio.
 *
 * Compare per un attimo quando si sceglie un servizio, e se ne va: e' il modo
 * in cui il cast entra nel prodotto senza occupare spazio in permanenza.
 *
 * Le facce sono i 2D ritagliati dai fogli in `characters 2d`, e girano a
 * rotazione.
 *
 * Se un file manca l'immagine non compare e l'icona resta quella vera: la
 * scelta del servizio funziona lo stesso, perche' una faccia che passa non e'
 * mai l'unico segnale che il comando ha funzionato.
 */
const FACCE = 5;
const PERSONAGGIO = {
  brain: 'imoth',
  scontorna: 'izack',
  vettorializza: 'iseagull',
  filmato: 'icat',
  suono: 'ipigeon',
};

function Item({ service, active, collapsed, lampo, onPick }) {
  const label = t(`${service.key}.label`);
  return (
    <button
      className="tool-item"
      aria-pressed={active}
      aria-label={label}
      title={collapsed ? `${label} — ${t(`${service.key}.help`)}` : t(`${service.key}.help`)}
      onClick={() => onPick(service)}
    >
      {/* Il personaggio SOSTITUISCE l'icona per un secondo, non compare
          altrove: e' il cerchio stesso che cambia faccia. */}
      {lampo ? (
        <img className="tool-pg" src={lampo} alt="" aria-hidden="true" width="40" height="40" />
      ) : (
        <Icon name={service.icon} draw />
      )}
      {/* Il nome si scrive SEMPRE: e' il CSS a nasconderlo dove la barra e'
          una colonna di cerchi. Sul telefono, dove la barra sta in fondo e non
          esiste il passaggio del mouse, cinque segni senza nome non si
          distinguono — ed e' li' che il committente li ha chiesti. */}
      <span className="tool-name">{label}</span>
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
export default function ToolRail({ current: strumento, collapsed: forzata, balance, onPick }) {
  // Dentro «Vettoriale» si ritocca con l'editor: e' lo stesso cerchio, e deve
  // restare acceso anche mentre si modificano i tracciati.
  const current = servizioDelloStrumento(strumento);
  /**
   * La barra e' fatta di CERCHI, e la parola compare solo se la si apre.
   *
   * Prima era il contrario: pillole con dentro il nome, che si stringevano a
   * cerchio solo dentro l'editor. Ma i nomi rubano larghezza alla tela in ogni
   * schermata, e la tela e' il lavoro — «non voglio rubare spazio al canva».
   *
   * Aperta o chiusa si ricorda: e' una preferenza, non uno stato del momento.
   */
  const [aperta, setAperta] = useState(() => {
    try {
      return localStorage.getItem('jayl.rail') === 'aperta';
    } catch {
      return false;
    }
  });
  const collapsed = forzata || !aperta;
  const nav = useRef(null);
  const [lampo, setLampo] = useState(null);
  const giro = useRef(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

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

  /**
   * Il lampo dura un secondo, poi l'icona torna quella vera.
   *
   * A rotazione fra le facce di quel personaggio: la stessa faccia ogni volta
   * smette di essere una sorpresa dopo tre tocchi.
   */
  const scegli = (s) => {
    const pg = PERSONAGGIO[s.id];
    if (pg) {
      const n = giro.current++;
      setLampo({ id: s.id, src: `/zack/pg/${pg}-${(n % FACCE) + 1}.webp` });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setLampo(null), 1000);
    }
    onPick(s);
  };

  return (
    <nav ref={nav} className="toolrail" data-collapsed={collapsed} aria-label={t('rail.title')}>
      {!forzata && (
        <button
          className="rail-apri"
          aria-expanded={aperta}
          aria-label={t(aperta ? 'rail.close' : 'rail.open')}
          title={t(aperta ? 'rail.close' : 'rail.open')}
          onClick={() => {
            const v = !aperta;
            setAperta(v);
            try {
              localStorage.setItem('jayl.rail', v ? 'aperta' : 'chiusa');
            } catch {
              /* la preferenza vale per questa visita */
            }
          }}
        >
          {aperta ? '‹' : '›'}
        </button>
      )}
      <p className="group-label">{collapsed ? '·' : t('rail.local')}</p>
      {localServices().map((s) => (
        <Item key={s.id} service={s} active={current === s.id} collapsed={collapsed} lampo={lampo?.id === s.id ? lampo.src : null} onPick={scegli} />
      ))}

      {/* I due a consumo — immagine e video — sono usciti dalla barra il
          2026-08-31: erano due cerchi spenti che dicevano «presto» in mezzo a
          cinque che funzionano. Torneranno quando ci sara' cosa premere.
          `paidServices()` resta in `services.js`, e con lei il gruppo. */}

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
