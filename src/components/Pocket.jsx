import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { t } from '../i18n/index.js';
import { destinazioniDi, finestra, vivi, VISIBILI } from '../engine/pocket.js';

/**
 * Il pocket, l'icona output e l'ovale delle destinazioni (fase 4a, §T2-T3).
 *
 * Tutto il gesto è il TOCCO: si tocca un file e si sceglie dove va. Il
 * trascinamento arriverà in 4b e accenderà le stesse destinazioni, perché
 * la lista viene da una tabella sola (`destinazioniDi`).
 */

/** L'immagine di un file della libreria, letta quando serve. */
function Miniatura({ asset, leggi }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let vivo = true;
    let u = null;
    leggi(asset.id)
      .then(({ file }) => {
        if (!vivo) return;
        u = URL.createObjectURL(file);
        setUrl(u);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [asset.id, leggi]);
  return <Anteprima url={url} kind={asset.kind} />;
}

function Anteprima({ url, kind }) {
  if (!url) return <span className="pocket-segno" aria-hidden="true">{kind}</span>;
  if (kind === 'mp4') return <video src={url} muted playsInline preload="metadata" aria-hidden="true" />;
  if (kind === 'wav') return <span className="pocket-segno" aria-hidden="true">♪</span>;
  return <img src={url} alt="" aria-hidden="true" />;
}

/**
 * L'ovale: le destinazioni possibili per quel file. Con `hrefDi` (la home)
 * ogni destinazione è un collegamento allo studio; senza, è un tasto.
 */
export function Destinazioni({ nome, voci, onScegli, hrefDi, onChiudi, className = '' }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onChiudi();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onChiudi]);
  // Nel `body`: un antenato con `transform` o `backdrop-filter` (la barra
  // della home) farebbe di `position: fixed` una posizione relativa a lui.
  return createPortal(
    <div className={`destinazioni ${className}`} role="dialog" aria-label={t('pocket.dove', { nome })}>
      <p className="destinazioni-titolo">{t('pocket.dove', { nome })}</p>
      <div className="destinazioni-voci">
        {voci.map((d) =>
          hrefDi && d !== 'togli' ? (
            <a key={d} className="destinazione" href={hrefDi(d)}>
              {t(`pocket.dest.${d}`)}
            </a>
          ) : (
            <button key={d} className="destinazione" onClick={() => onScegli(d)}>
              {d === 'togli' ? t('pocket.togli') : t(`pocket.dest.${d}`)}
            </button>
          ),
        )}
        <button className="destinazione chiudi" onClick={onChiudi}>
          {t('pocket.chiudi')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * L'icona output: un cerchietto con dentro il risultato, alla sua destra.
 * Toccata, apre l'ovale; la scelta la esegue chi la monta (`onScegli`), che
 * sa anche salvare in Brain un risultato che non c'è ancora (§2.2).
 */
export function IconaOutput({ url, kind, nome, onScegli }) {
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <button
        className="icona-output"
        aria-label={t('pocket.uscita')}
        title={t('pocket.uscita')}
        aria-expanded={aperto}
        onClick={() => setAperto((v) => !v)}
      >
        <Anteprima url={url} kind={kind} />
      </button>
      {aperto && (
        <Destinazioni
          nome={nome}
          voci={destinazioniDi(kind)}
          onScegli={(d) => {
            setAperto(false);
            onScegli(d);
          }}
          onChiudi={() => setAperto(false)}
        />
      )}
    </>
  );
}

/**
 * Il cerchio del pocket, in alto a destra (speculare a Brain). Aperto, mostra
 * 4 file; gli altri scorrono al tocco del «›». Toccare un file apre le sue
 * destinazioni, più «togli dal pocket».
 */
export default function Pocket({ pocket, assets, leggi, onScegli, onTogli, hrefDi, className = '' }) {
  const [aperto, setAperto] = useState(false);
  const [inizio, setInizio] = useState(0);
  const [scelto, setScelto] = useState(null);
  const lista = vivi(pocket, assets);
  const visti = finestra(lista, inizio);

  return (
    <div className={`pocket ${className}`}>
      <button
        className="pocket-tasto"
        aria-pressed={aperto}
        aria-label={t('pocket.label')}
        title={t('pocket.help')}
        onClick={() => setAperto((v) => !v)}
      >
        <Icon name="pocket" />
        {lista.length > 0 && <span className="pocket-conta">{lista.length}</span>}
        <span className="pocket-nome">{t('pocket.label')}</span>
      </button>

      {aperto && (
        <div className="pocket-vassoio">
          {lista.length === 0 ? (
            <p className="pocket-vuoto">{t('pocket.vuoto')}</p>
          ) : (
            <>
              {visti.map((a) => (
                <button
                  key={a.id}
                  className="pocket-file"
                  title={a.name}
                  aria-label={a.name}
                  onClick={() => setScelto(a)}
                >
                  <Miniatura asset={a} leggi={leggi} />
                </button>
              ))}
              {lista.length > VISIBILI && (
                <button
                  className="pocket-gira"
                  aria-label={t('pocket.altri')}
                  title={t('pocket.altri')}
                  onClick={() => setInizio((i) => i + VISIBILI)}
                >
                  ›
                </button>
              )}
            </>
          )}
        </div>
      )}

      {scelto && (
        <Destinazioni
          nome={scelto.name}
          voci={[...destinazioniDi(scelto.kind).filter((d) => d !== 'pocket'), 'togli']}
          hrefDi={hrefDi && ((d) => hrefDi(d, scelto))}
          onScegli={(d) => {
            const a = scelto;
            setScelto(null);
            if (d === 'togli') onTogli(a.id);
            else onScegli(d, a);
          }}
          onChiudi={() => setScelto(null)}
          className={className ? `${className}-ovale` : ''}
        />
      )}
    </div>
  );
}
