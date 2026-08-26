import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { PASSI } from '../engine/ricette.js';
import Icon from './Icon.jsx';

/**
 * Il tasto Zack.
 *
 * È «Pronto per la stampa» reso tuo: la stessa idea — un pulsante che porta a
 * termine un lavoro intero — ma con la catena che l'utente decide una volta e
 * il servizio si ricorda.
 *
 * Due cose che non sono dettagli:
 *
 * - **dice cosa farà prima di premere.** Sotto l'etichetta ci sono la misura
 *   d'uscita e l'attesa, e aprendo «Cosa farà» c'è la catena per esteso. Un
 *   tasto che fa quattro cose senza dirlo è una scatola nera, e la prima volta
 *   che sbaglia l'utente non lo preme più;
 * - **è il più grande della schermata.** Non per gusto: la dimensione è ciò
 *   che tiene onesta la lista dei comandi. Se accanto a questo ce ne stanno
 *   altri dieci grandi uguale, la lista è sbagliata.
 */
export default function ZackButton({ ricetta, piano, disabled, busy, lampo, onRun, onChange }) {
  const [aperto, setAperto] = useState(false);
  const box = useRef(null);

  // Un pannello che resta aperto mentre lavori altrove copre la tela: si
  // chiude da solo quando si clicca fuori o si preme Esc.
  useEffect(() => {
    if (!aperto) return undefined;
    const fuori = (e) => {
      if (box.current && !box.current.contains(e.target)) setAperto(false);
    };
    const esc = (e) => {
      if (e.key === 'Escape') setAperto(false);
    };
    document.addEventListener('pointerdown', fuori);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fuori);
      document.removeEventListener('keydown', esc);
    };
  }, [aperto]);

  const vuota = !piano || piano.passi.length === 0;

  function commuta(passo) {
    const acceso = ricetta.includes(passo);
    // L'ordine è quello della lista dei passi, non quello dei clic: una
    // catena che si riordina da sola a ogni spunta sarebbe imprevedibile.
    onChange(
      acceso ? ricetta.filter((p) => p !== passo) : PASSI.filter((p) => p === passo || ricetta.includes(p)),
    );
  }

  return (
    <div className="zack" ref={box}>
      <button
        className="zack-go"
        /* Un lampo solo, quando il file di prova arriva da solo all'apertura:
           dice da dove si comincia. Non si ripete e non sostituisce nulla —
           sotto l'etichetta resta scritto cosa farà e quanto ci mette. */
        data-lampo={lampo || undefined}
        disabled={disabled || busy || vuota}
        onClick={onRun}
        title={vuota ? t('zack.empty') : t('zack.title')}
      >
        <Icon name="feather" draw />
        <span className="zack-testo">
          <b>{t('zack.label')}</b>
          {/* La misura e l'attesa, scritte prima di premere: è la stessa
              promessa di «Pronto per la stampa». Senza un piano non si
              scrive niente, invece di scrivere un numero inventato. */}
          {piano && !vuota && (
            <small>
              {t('zack.note', {
                size: `${piano.out.w}×${piano.out.h}`,
                wait: `${piano.secondi}s`,
              })}
            </small>
          )}
        </span>
      </button>

      <button
        className="zack-cosa"
        aria-expanded={aperto}
        onClick={() => setAperto((v) => !v)}
      >
        {t('zack.what')}
      </button>

      {aperto && (
        <div className="zack-catena" role="group" aria-label={t('zack.title')}>
          {PASSI.map((passo) => {
            const acceso = ricetta.includes(passo);
            // Un passo acceso che il piano non esegue non è un errore: è
            // "questa volta non serve" — l'ingrandimento su un file già
            // grande. Dirlo è più utile che nasconderlo.
            const salta = acceso && piano && !piano.passi.includes(passo);
            return (
              <label key={passo} className="zack-passo" data-salta={salta || undefined}>
                <input type="checkbox" checked={acceso} onChange={() => commuta(passo)} />
                <span>
                  <b>{t(`zack.step.${passo}`)}</b>
                  <small>{t(`zack.stepHelp.${passo}`)}</small>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
