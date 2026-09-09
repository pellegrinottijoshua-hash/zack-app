import { useState } from 'react';
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

export default function Muro({ stato, onEntra, onGoogle, onAbbona }) {
  // Chi deve solo ricollegarsi non deve vedersi chiedere dei soldi: ce li ha
  // già dati, e chiederglieli di nuovo è il modo più veloce di perderlo.
  const soloEntrare = stato === 'da-ricollegare' || stato === 'mai-entrato';
  const chiave = FRASE[stato] || FRASE['mai-entrato'];

  // Tre stati per il campo, e servono tutt'e tre: chi ha premuto vuole sapere
  // che sta succedendo qualcosa, e chi ha sbagliato vuole saperlo dal campo,
  // non dal silenzio.
  const [fase, setFase] = useState('fermo'); // 'fermo' | 'invio' | 'mandato'
  const [errore, setErrore] = useState('');

  async function manda(evento) {
    evento.preventDefault();
    const email = new FormData(evento.currentTarget).get('email');
    setFase('invio');
    setErrore('');
    try {
      await onEntra(email);
      setFase('mandato');
    } catch (e) {
      setFase('fermo');
      setErrore(e?.message || t('muro.nonMandato'));
    }
  }

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
        {!soloEntrare ? (
          <button className="btn" onClick={onAbbona}>
            {t('muro.abbonati')}
          </button>
        ) : fase === 'mandato' ? (
          /* Il link va aperto DA QUI: aprirlo dal telefono mentre si aspetta
             sul computer è l'errore che fa dire «non funziona», e costa una
             riga dirlo prima invece di un cliente dopo. */
          <p className="muro-mandato">{t('muro.linkMandato')}</p>
        ) : (
          <form className="muro-entra" onSubmit={manda}>
            <input
              type="email"
              name="email"
              required
              placeholder={t('muro.email')}
              autoComplete="email"
              aria-label={t('muro.email')}
            />
            <button className="btn" type="submit" disabled={fase === 'invio'}>
              {t(fase === 'invio' ? 'muro.mando' : 'muro.mandaLink')}
            </button>
            <button className="btn ghost" type="button" onClick={onGoogle}>
              {t('muro.conGoogle')}
            </button>
            {errore && <p className="muro-errore">{errore}</p>}
          </form>
        )}
      </div>

      {/* La riga che salva il rapporto: i tuoi file sono lì, e te li porti via
          quando vuoi. Si dice QUI, sul muro, non in una pagina di aiuto. */}
      <p className="muro-libreria">{t('muro.libreriaTua')}</p>
    </div>
  );
}
