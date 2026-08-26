import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { KIND_AUDIO, KIND_VIDEO, kindFromFile } from '../store/model.js';
import {
  nuovoAsset,
  nuovaNota,
  nuovoCerchio,
  nuovaFreccia,
  muovi,
  aggiorna,
  togli,
  davanti,
  prossimoPosto,
  riquadro,
  COLORI,
  CATEGORIE,
} from '../engine/brain.js';
import Icon from './Icon.jsx';

/**
 * Brain: la tela dove le idee si mettono in ordine.
 *
 * Le decisioni stanno in `engine/brain.js`, qui c'è il disegno e i gesti.
 * Tre gesti, non comandi: **trascina** per spostare, **doppio clic** per
 * scrivere, **rotella** per avvicinarsi. Tutto il resto è una fila di tasti
 * che sta in una riga sola — se un giorno non ci sta più, il problema è la
 * fila, non la riga.
 *
 * Perché non un `<canvas>`: gli oggetti sono decine, non migliaia, e un nodo
 * DOM per oggetto porta gratis il testo selezionabile, l'audio che si ascolta,
 * il video che si guarda e la tastiera che funziona. Con un canvas unico
 * andrebbero riscritti tutti e quattro.
 */

/** Quanto ci si può avvicinare e allontanare. Oltre non si capisce più dove si è. */
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;

function Contenuto({ item, asset, leggi }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!asset) return undefined;
    let vivo = true;
    let creato = null;
    leggi(asset.id).then(({ file }) => {
      if (!vivo) return;
      creato = URL.createObjectURL(file);
      setUrl(creato);
    });
    // L'URL va rilasciato o la memoria cresce a ogni tela aperta: sono
    // decine di file, e restano appesi finché non si ricarica la pagina.
    return () => {
      vivo = false;
      if (creato) URL.revokeObjectURL(creato);
    };
  }, [asset, leggi]);

  if (!asset) return <span className="brain-perso">{t('brain.lost')}</span>;
  if (!url) return <span className="brain-attesa" />;

  if (KIND_AUDIO.includes(asset.kind)) {
    return (
      <>
        <Icon name="wave" />
        <audio src={url} controls preload="none" />
      </>
    );
  }
  if (KIND_VIDEO.includes(asset.kind)) return <video src={url} controls preload="metadata" />;
  return <img src={url} alt={asset.name} draggable={false} />;
}

export default function Brain({ items, assets, leggi, onChange, onUse, onImport, onPacco, onApriPacco }) {
  const [scelto, setScelto] = useState(null);
  const [vista, setVista] = useState({ x: 40, y: 40, z: 1 });
  const [collega, setCollega] = useState(null);
  const piano = useRef(null);
  const preso = useRef(null);

  const perId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  /** Un oggetto nuovo entra dove c'è posto, non sopra gli altri. */
  const aggiungi = useCallback(
    (fai) => {
      const dove = prossimoPosto(items);
      const o = fai(dove);
      onChange([...items, o]);
      setScelto(o.id);
    },
    [items, onChange],
  );

  // Trascinamento. I puntatori si catturano: senza, uscire dalla finestra
  // mentre si trascina lascia l'oggetto attaccato al mouse per sempre.
  function prendi(e, id) {
    if (e.target.closest('input, textarea, audio, video, button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    preso.current = { id, x: e.clientX, y: e.clientY };
    setScelto(id);
    onChange(davanti(items, id));
  }

  function trascina(e) {
    if (!preso.current) return;
    const { id, x, y } = preso.current;
    const dx = (e.clientX - x) / vista.z;
    const dy = (e.clientY - y) / vista.z;
    preso.current = { id, x: e.clientX, y: e.clientY };
    onChange(muovi(items, id, dx, dy));
  }

  const molla = () => {
    preso.current = null;
  };

  function rotella(e) {
    if (!e.ctrlKey && !e.metaKey) {
      setVista((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      return;
    }
    setVista((v) => ({ ...v, z: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.z - e.deltaY * 0.002)) }));
  }

  /** Rimette tutto in vista: è il gesto che salva chi si è perso. */
  function centra() {
    const r = riquadro(items);
    if (!r || !piano.current) return;
    const { clientWidth: w, clientHeight: h } = piano.current;
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(w / (r.w + 120), h / (r.h + 120))));
    setVista({ z, x: (w - r.w * z) / 2 - r.x * z, y: (h - r.h * z) / 2 - r.y * z });
  }

  useEffect(() => {
    const tasti = (e) => {
      if (e.key === 'Escape') {
        setCollega(null);
        setScelto(null);
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && scelto) {
        if (document.activeElement?.closest('.brain-oggetto textarea, .brain-oggetto input')) return;
        onChange(togli(items, scelto));
        setScelto(null);
      }
    };
    document.addEventListener('keydown', tasti);
    return () => document.removeEventListener('keydown', tasti);
  }, [items, scelto, onChange]);

  const oggetto = items.find((o) => o.id === scelto) || null;
  const assetScelto = oggetto?.t === 'asset' ? perId.get(oggetto.assetId) : null;
  const daPiazzare = assets.filter((a) => !items.some((o) => o.assetId === a.id));

  return (
    <div className="brain">
      {/* Una riga sola di comandi: se un giorno non ci stanno, il problema è
          la fila, non la riga. */}
      <div className="brain-barra">
        <button onClick={() => aggiungi((d) => nuovaNota({ ...d }))}>
          <Icon name="nota" draw /> {t('brain.add.note')}
        </button>
        <button onClick={() => aggiungi((d) => nuovoCerchio({ ...d }))}>
          <Icon name="gruppo" draw /> {t('brain.add.group')}
        </button>
        <button
          aria-pressed={Boolean(collega)}
          disabled={items.filter((o) => o.t !== 'freccia').length < 2}
          onClick={() => setCollega(collega ? null : { da: null })}
        >
          <Icon name="freccia" draw /> {t('brain.add.arrow')}
        </button>
        <span className="brain-spazio" />
        <button onClick={centra} disabled={items.length === 0}>
          {t('brain.center')}
        </button>
        <span className="brain-zoom">{Math.round(vista.z * 100)}%</span>

        {/* Riaprire un pacco sta accanto al tasto che li fa: chi ne ha uno lo
            cerca qui, non in un menu impostazioni. */}
        <label className="brain-riapri">
          {t('brain.reopen')}
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={async (e) => {
              const f = e.target.files[0];
              e.target.value = '';
              if (f) await onApriPacco(f);
            }}
          />
        </label>

        {/* Il tasto Zack di Brain: porta via l'idea intera. In Brain non c'è
            un file sul piano di lavoro, quindi la barra sopra la tela non
            c'è — il tasto vive qui, dove sta il lavoro. */}
        <button className="brain-zack" disabled={items.length === 0} onClick={onPacco}>
          <Icon name="feather" draw />
          {t('zack.label')}
        </button>
      </div>

      <div className="brain-corpo">
        {/* I lavori non ancora sulla tela. Un clic e ci finiscono: prendere un
            file dalla libreria non deve essere un viaggio. */}
        <aside className="brain-cassetto">
          <h3>{t('brain.drawer')}</h3>

          {/* La porta d'ingresso. Senza, Brain poteva mostrare solo ciò che
              era già uscito da uno strumento: un video di riferimento o una
              voce registrata altrove non avevano modo di entrare. */}
          <label className="brain-porta">
            {t('brain.import')}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/svg+xml,audio/wav,audio/mpeg,video/mp4,video/webm"
              onChange={async (e) => {
                const scelti = [...e.target.files];
                e.target.value = '';
                await onImport(scelti);
              }}
            />
          </label>
          {/* Due vuoti diversi: "non hai ancora salvato niente" e "sono già
              tutti sulla tela" sono due situazioni opposte, e dire la seconda
              a chi si trova nella prima lo lascia a cercare un cassetto che
              non esiste. */}
          {daPiazzare.length === 0 && (
            <p className="brain-vuoto">
              {assets.length === 0 ? t('brain.libraryEmpty') : t('brain.drawerEmpty')}
            </p>
          )}
          <div className="brain-elenco">
            {daPiazzare.map((a) => (
              <button
                key={a.id}
                className="brain-chip"
                title={a.name}
                onClick={() => aggiungi((d) => nuovoAsset({ assetId: a.id, ...d }))}
              >
                {a.name}
              </button>
            ))}
          </div>
        </aside>

        <div
          className="brain-piano"
          ref={piano}
          onWheel={rotella}
          onPointerMove={trascina}
          onPointerUp={molla}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget || e.target.classList.contains('brain-tela')) {
              setScelto(null);
              setCollega(null);
            }
          }}
        >
          {collega && (
            <p className="brain-istruzione">
              {collega.da ? t('brain.arrowTo') : t('brain.arrowFrom')}
            </p>
          )}

          {/* Tela vuota: Zack seduto fra le sue cose (E-BRAIN). Sparisce al
              primo oggetto — un fondale che resta sotto il lavoro è rumore. */}
          {items.length === 0 && (
            <img className="brain-vuota" src="/zack/sfere.webp" alt="" />
          )}

          <div
            className="brain-tela"
            style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})` }}
          >
            <svg className="brain-frecce">
              {items
                .filter((o) => o.t === 'freccia')
                .map((f) => {
                  const a = items.find((o) => o.id === f.da);
                  const b = items.find((o) => o.id === f.a);
                  if (!a || !b) return null;
                  const x1 = a.x + a.w / 2;
                  const y1 = a.y + a.h / 2;
                  const x2 = b.x + b.w / 2;
                  const y2 = b.y + b.h / 2;
                  return (
                    <line
                      key={f.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      markerEnd="url(#punta)"
                      onClick={() => onChange(togli(items, f.id))}
                    />
                  );
                })}
              <defs>
                <marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 0L10 5L0 10z" />
                </marker>
              </defs>
            </svg>

            {items
              .filter((o) => o.t !== 'freccia')
              .map((o) => (
                <div
                  key={o.id}
                  className="brain-oggetto"
                  data-t={o.t}
                  data-scelto={o.id === scelto || undefined}
                  data-collega={collega?.da === o.id || undefined}
                  style={{
                    left: o.x,
                    top: o.y,
                    width: o.w,
                    height: o.h,
                    '--tinta': o.colore || undefined,
                  }}
                  onPointerDown={(e) => {
                    if (collega) {
                      // Due clic: il primo sceglie da dove, il secondo dove.
                      // Dopo il secondo la modalità RESTA accesa: chi disegna
                      // una freccia quasi sempre ne disegna tre, e ripremere
                      // il tasto ogni volta è una tassa. Si esce con Esc o
                      // ripremendo FRECCIA.
                      e.stopPropagation();
                      if (!collega.da) setCollega({ da: o.id });
                      else if (collega.da !== o.id) {
                        onChange([...items, nuovaFreccia({ da: collega.da, a: o.id })]);
                        setCollega({ da: null });
                      }
                      return;
                    }
                    prendi(e, o.id);
                  }}
                >
                  {o.t === 'asset' && (
                    <Contenuto item={o} asset={perId.get(o.assetId)} leggi={leggi} />
                  )}

                  {o.t === 'nota' && (
                    <>
                      {/* La maniglia. Senza, la nota era quasi impossibile da
                          spostare: il testo occupa tutto il riquadro e ogni
                          clic finisce nel campo di scrittura invece che sul
                          trascinamento. Ora si scrive dentro e si sposta di
                          sopra, e la targhetta dice anche che nota è. */}
                      <span className="nota-presa">{t(`brain.cat.${o.cat || CATEGORIE[0].id}`)}</span>
                      <textarea
                        value={o.testo}
                        placeholder={t('brain.notePlaceholder')}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange(aggiorna(items, o.id, { testo: e.target.value }))}
                      />
                    </>
                  )}

                  {o.t === 'cerchio' && (
                    <input
                      value={o.titolo}
                      placeholder={t('brain.groupPlaceholder')}
                      onChange={(e) => onChange(aggiorna(items, o.id, { titolo: e.target.value }))}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Cosa si può fare con ciò che si è scelto. Vuoto quando non c'è
            niente di scelto: un pannello di comandi spenti è rumore. */}
        {oggetto && (
          <aside className="brain-scelto">
            <h3>{assetScelto ? assetScelto.name : t(`brain.kind.${oggetto.t}`)}</h3>

            {/* Per una nota si sceglie il SENSO, non la tinta: cinque tinte
                del marchio non si distinguono a colpo d'occhio, e soprattutto
                non significano niente. Una nota «Da fare» invece si conta, si
                cerca e si estrae. */}
            {oggetto.t === 'nota' && (
              <div className="brain-categorie">
                {CATEGORIE.map((c) => (
                  <button
                    key={c.id}
                    className="brain-categoria"
                    aria-pressed={(oggetto.cat || CATEGORIE[0].id) === c.id}
                    onClick={() => onChange(aggiorna(items, oggetto.id, { cat: c.id }))}
                  >
                    <i style={{ background: c.colore }} />
                    {t(`brain.cat.${c.id}`)}
                  </button>
                ))}
              </div>
            )}

            {oggetto.t === 'cerchio' && (
              <div className="brain-colori">
                {COLORI.map((c) => (
                  <button
                    key={c}
                    className="brain-colore"
                    style={{ background: c }}
                    aria-pressed={oggetto.colore === c}
                    aria-label={c}
                    onClick={() => onChange(aggiorna(items, oggetto.id, { colore: c }))}
                  />
                ))}
              </div>
            )}

            {assetScelto && (
              <div className="brain-usa">
                {/* Il ponte verso gli strumenti: da qui il lavoro finisce
                    sul piano senza passare dalla libreria. */}
                <button onClick={() => onUse('cutout', assetScelto)}>{t('actions.cutout')}</button>
                <button onClick={() => onUse('vector', assetScelto)}>{t('actions.vector')}</button>
                <button onClick={() => onUse('open', assetScelto)}>{t('library.resume')}</button>
              </div>
            )}

            <button
              className="brain-togli"
              onClick={() => {
                onChange(togli(items, oggetto.id));
                setScelto(null);
              }}
            >
              {t('brain.remove')}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

