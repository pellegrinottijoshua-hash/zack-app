import { t } from '../i18n/index.js';
import { COLORI, FACCE_CAST, facciaCast } from '../engine/brain.js';
import Icon from './Icon.jsx';

/**
 * Le tre lineette di Brain (fase 5c, B3): gli strumenti per mettere in
 * ordine, in un cerchio solo.
 *
 * - **Freccia** e **gruppo**: come prima, da qui.
 * - **Colore o icona**: si sceglie qui, poi si toccano gli oggetti sulla
 *   tela — lo stesso gesto della freccia (scegli lo strumento, tocca le
 *   cose), invece di un pannello che deve sapere cosa hai scelto prima. Le
 *   facce del cast sono le icone pronte.
 * - **Riordina**: le quattro regole del riordino, sul livello che si guarda.
 *
 * Ogni voce chiude il pannello: il lavoro si fa sulla tela, e il pannello
 * la coprirebbe.
 */
export default function Lineette({ tinta, quanti, onFreccia, onGruppo, onTinta, regole, onRiordina, onChiudi }) {
  return (
    <div className="scegli-asset lineette">
      <div className="scegli-testa">
        <h3>{t('brain.lineette.title')}</h3>
        <button className="btn ghost small" onClick={onChiudi} aria-label={t('bar.clear')}>
          ×
        </button>
      </div>

      <div className="lineette-fila">
        <button className="btn ghost" disabled={quanti < 2} onClick={onFreccia}>
          <Icon name="freccia" />
          {t('brain.add.arrow')}
        </button>
        <button className="btn ghost" onClick={onGruppo}>
          <Icon name="gruppo" />
          {t('brain.add.group')}
        </button>
      </div>

      <p className="lineette-titolo">{t('brain.lineette.tinta')}</p>
      <div className="lineette-tinte">
        {COLORI.map((c) => (
          <button
            key={c}
            className="brain-colore"
            style={{ background: c }}
            aria-pressed={tinta?.colore === c}
            aria-label={t('brain.lineette.colore', { c })}
            onClick={() => onTinta({ colore: c })}
          />
        ))}
        {FACCE_CAST.map((id) => (
          <button
            key={id}
            className="lineette-cast"
            aria-pressed={tinta?.icona === id}
            aria-label={t('brain.lineette.cast', { nome: id })}
            onClick={() => onTinta({ icona: id })}
          >
            <img src={facciaCast(id)} alt="" />
          </button>
        ))}
        <button
          className="btn ghost small"
          aria-pressed={tinta?.icona === null}
          onClick={() => onTinta({ icona: null })}
        >
          {t('brain.lineette.facciaSua')}
        </button>
      </div>

      <p className="lineette-titolo">{t('brain.riordina.title')}</p>
      <div className="lineette-fila">
        {regole.map((r) => (
          <button key={r.id} className="btn ghost" disabled={quanti < 2} onClick={() => onRiordina(r.id)}>
            {t(r.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
