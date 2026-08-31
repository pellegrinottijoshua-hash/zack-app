import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { PASSI, commutaPasso } from '../engine/ricette.js';
import Icon from './Icon.jsx';

/**
 * Lo scontorno nello studio, rifatto sul disegno del committente (2026-08-31).
 *
 * È la stessa schermata della home, con lo studio dietro. Il principio è che
 * **il piano di lavoro è vuoto**: niente barra dei comandi sopra la tela,
 * niente pannello della qualità di fianco, niente due pulsanti in fondo. Ci
 * sono cinque cose sole, e stanno agli angoli:
 *
 * - il `+` grande in mezzo, che è il gesto con cui si comincia;
 * - il **tasto Zack** in basso a destra, sopra la fila dei servizi: è lui che
 *   fa il lavoro, e la catena la decide il punto oro;
 * - la **mascotte** in basso a sinistra, ferma, accanto al tasto;
 * - **scarica** in alto a destra, che è il gesto che chiude;
 * - gli **strumenti a destra**, cerchi in colonna, che compaiono *dopo* —
 *   quando c'è qualcosa da correggere. Prima non ci sarebbe niente da fare.
 *
 * La scelta del modello è finita dentro il punto oro insieme alla catena: sono
 * tutt'e due «come deve comportarsi il tasto», e in mezzo allo schermo erano
 * un pannello da leggere prima di poter premere qualcosa. Qui sono due: rapido
 * e qualità. Il terzo (illustrazioni) resta nel motore, non nella scelta.
 */

/** I due modelli offerti qui. Il nome del modello resta nel `title`. */
const DUE_MODELLI = ['u2net', 'isnet-general-use'];

export default function Scontorna({
  vuoto,
  ricetta,
  piano,
  busy,
  models,
  modello,
  strumenti,
  onPick,
  onFile,
  onZack,
  onRicetta,
  onModello,
  onScarica,
  puoiScaricare,
  children,
}) {
  const [aperto, setAperto] = useState(false);
  const [sopra, setSopra] = useState(false);
  const box = useRef(null);

  // Un pannello aperto mentre si lavora altrove copre la tela: si chiude da
  // solo cliccando fuori o con Esc. È la stessa regola del tasto di prima.
  useEffect(() => {
    if (!aperto) return undefined;
    const fuori = (e) => {
      if (box.current && !box.current.contains(e.target)) setAperto(false);
    };
    const esc = (e) => e.key === 'Escape' && setAperto(false);
    document.addEventListener('pointerdown', fuori);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fuori);
      document.removeEventListener('keydown', esc);
    };
  }, [aperto]);

  const vuota = !piano || piano.passi.length === 0;
  const offerti = models.filter((m) => DUE_MODELLI.includes(m.id));

  return (
    <div
      className="sc"
      /* Il piano resta una zona di rilascio: prima lo era il riquadro
         tratteggiato, che il disegno del committente ha tolto. Toglierlo
         SENZA rimettere il rilascio qui significherebbe che nell'app non si
         puo' piu' trascinare un file dentro. */
      onDragOver={(e) => {
        e.preventDefault();
        setSopra(true);
      }}
      onDragLeave={() => setSopra(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSopra(false);
        const f = [...e.dataTransfer.files].find((x) => /^image\//.test(x.type));
        if (f) onFile(f);
      }}
      data-sopra={sopra || undefined}
    >
      {/* Scarica, in alto a destra: il gesto che chiude il lavoro, e non
          appartiene a nessuno dei file in particolare. */}
      <button
        className="sc-scarica"
        disabled={!puoiScaricare || busy}
        onClick={onScarica}
        title={t('action.export.label')}
        aria-label={t('action.export.label')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
          <path
            d="M12 3v11m0 0 4-4m-4 4-4-4M4 19h16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* La tela. Vuota c'è il `+` e basta: è il gesto con cui si comincia, ed
          è grande perché intorno non c'è nient'altro. */}
      <div className="sc-tela">
        {vuoto ? (
          <button className="sc-piu" onClick={onPick} aria-label={t('drop.title')}>
            +
          </button>
        ) : (
          children
        )}
      </div>

      {/* Gli strumenti compaiono DOPO il risultato, in colonna a destra, e
          sono cerchi: il nome ruba larghezza alla tela in ogni schermata, e
          qui la tela è il lavoro. Il nome resta nel `title`. */}
      {strumenti.length > 0 && (
        <div className="sc-strumenti">
          {strumenti.map((s) => (
            <button
              key={s.id}
              className="sc-strumento"
              aria-pressed={s.active || undefined}
              aria-label={s.label}
              title={s.label}
              disabled={s.disabled}
              onClick={s.onClick}
            >
              <Icon name={s.icon} />
            </button>
          ))}
        </div>
      )}

      {/* In basso: la mascotte a sinistra, il tasto a destra. Sopra la fila
          dei servizi, che sta sotto di loro. */}
      <img
        className="sc-zack"
        src="/zack/zack-disegna.webp"
        srcSet="/zack/zack-disegna-360.webp 360w, /zack/zack-disegna.webp 720w"
        sizes="150px"
        alt=""
        aria-hidden="true"
        width="720"
        height="720"
      />

      <div className="sc-tasto" ref={box}>
        <button
          className="zack-oval"
          aria-label={t('zack.label')}
          title={vuota ? t('zack.empty') : t('zack.title')}
          /* Col piano vuoto il tasto NON e' spento: e' il secondo modo di
             cominciare, insieme al `+`. Si spegne solo quando c'e' un file e
             la catena e' vuota — li' non c'e' niente da fare. */
          disabled={busy || (!vuoto && vuota)}
          onClick={vuoto ? onPick : onZack}
        >
          <img
            src="/zack/tasto-zack.webp"
            srcSet="/zack/tasto-zack-600.webp 600w, /zack/tasto-zack.webp 1200w"
            sizes="300px"
            alt=""
            width="1200"
            height="670"
          />
        </button>

        {/* Il punto oro: alla destra dell'ovale e in alto, senza toccarlo —
            la stessa posizione della home, misurata sull'immagine. */}
        <button
          className="punto-oro"
          aria-expanded={aperto}
          aria-label={t('zack.what')}
          onClick={() => setAperto((v) => !v)}
        >
          <i />
        </button>

        {aperto && (
          <div className="sc-tuo">
            <p>{t('zack.title')}</p>

            <div className="sc-modelli" role="group" aria-label={t('control.quality.label')}>
              {offerti.map((m) => (
                <button
                  key={m.id}
                  className="pastiglia"
                  aria-pressed={modello === m.id}
                  title={m.id}
                  onClick={() => onModello(m.id)}
                >
                  {t(m.labelKey)}
                </button>
              ))}
            </div>

            <div className="sc-catena">
              {PASSI.map((passo) => {
                const acceso = ricetta.includes(passo);
                return (
                  <button
                    key={passo}
                    className="pastiglia"
                    aria-pressed={acceso}
                    title={t(`zack.stepHelp.${passo}`)}
                    onClick={() => onRicetta(commutaPasso(ricetta, passo))}
                  >
                    {t(`zack.step.${passo}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
