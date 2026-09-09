import { t } from '../i18n/index.js';

/**
 * Cosa si vede quando non si può lavorare.
 *
 * Prende il posto del **piano di lavoro**, non della schermata: la striscia in
 * cima e la libreria restano, perché la libreria non si chiude mai (spec
 * § 3.5). Chi non ha pagato deve poter guardare e scaricare i propri file — un
 * prodotto che li tiene in ostaggio non è un prodotto, è un ricatto.
 *
 * Tre frasi diverse per tre stati. Un muro che dice sempre la stessa cosa
 * manda chi ha un problema di rete a comprare un abbonamento che ha già.
 */
const FRASE = {
  scaduto: 'muro.scaduto',
  'da-ricollegare': 'muro.daRicollegare',
  'mai-entrato': 'muro.maiEntrato',
};

export default function Muro({ stato, onEntra, onAbbona }) {
  // Chi deve solo ricollegarsi non deve vedersi chiedere dei soldi: ce li ha
  // già dati, e chiederglieli di nuovo è il modo più veloce di perderlo.
  const soloEntrare = stato === 'da-ricollegare' || stato === 'mai-entrato';
  const chiave = FRASE[stato] || FRASE['mai-entrato'];

  return (
    <div className="muro">
      <img
        className="muro-zack"
        src="/zack/zack-disegna.webp"
        alt=""
        aria-hidden="true"
        width="720"
        height="720"
      />
      <h2>{t(`${chiave}.titolo`)}</h2>
      <p className="muro-corpo">{t(`${chiave}.corpo`)}</p>

      <div className="muro-azioni">
        {soloEntrare ? (
          <button className="btn" onClick={onEntra}>
            {t('muro.entra')}
          </button>
        ) : (
          <button className="btn" onClick={onAbbona}>
            {t('muro.abbonati')}
          </button>
        )}
      </div>

      {/* La riga che salva il rapporto: i tuoi file sono lì, e te li porti via
          quando vuoi. Si dice QUI, sul muro, non in una pagina di aiuto. */}
      <p className="muro-libreria">{t('muro.libreriaTua')}</p>
    </div>
  );
}
