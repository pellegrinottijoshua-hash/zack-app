import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { KIND_AUDIO, KIND_VIDEO, KIND_TESTO, ICONE_DOCUMENTO, iconaDocumento, anteprimaTesto, kindFromFile } from '../store/model.js';
import {
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
import { oggettiNascosti } from '../engine/archivio.js';
import { eTrascinamento } from '../engine/pocket.js';
import Icon from './Icon.jsx';
// Con l'alias: `muovi` qui e' gia' quello di `engine/brain.js` (sposta un
// oggetto), e `muove` accanto a lui si confonderebbe a ogni lettura.
import { nuovoGesto, giu as ditoGiu, muove as ditoMuove, su as ditoSu, dueDita, ancora } from '../engine/gesti.js';

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
  if (KIND_TESTO.includes(asset.kind)) return <SchedaDocumento asset={asset} leggi={leggi} />;
  return <img src={url} alt={asset.name} draggable={false} />;
}

/**
 * La faccia di un file sulla tela (fase 5b, B2 / B-g): dentro il cerchio.
 * Un'immagine si vede, un video mostra il primo fotogramma, un audio l'onda,
 * un documento la sua icona; e un'icona scelta a mano vale per tutti. È un
 * segno per riconoscerlo fra venti, non una lettura: per guardarlo davvero
 * lo si tocca, e si apre la scheda.
 */
function Faccia({ asset, leggi }) {
  const [url, setUrl] = useState(null);
  const mostraFile =
    asset && !asset.meta?.icona && !KIND_AUDIO.includes(asset.kind) && !KIND_TESTO.includes(asset.kind);

  useEffect(() => {
    if (!mostraFile) return undefined;
    let vivo = true;
    let creato = null;
    leggi(asset.id).then(({ file }) => {
      if (!vivo) return;
      creato = URL.createObjectURL(file);
      setUrl(creato);
    });
    return () => {
      vivo = false;
      if (creato) URL.revokeObjectURL(creato);
    };
  }, [asset, leggi, mostraFile]);

  if (!asset) return <span className="brain-perso">{t('brain.lost')}</span>;
  if (!mostraFile) {
    return <Icon name={asset.meta?.icona ? iconaDocumento(asset) : KIND_AUDIO.includes(asset.kind) ? 'wave' : iconaDocumento(asset)} />;
  }
  if (!url) return <span className="brain-attesa" />;
  // `#t=0.1`: senza, Safari su iPhone non disegna il primo fotogramma.
  if (KIND_VIDEO.includes(asset.kind)) return <video src={`${url}#t=0.1`} muted playsInline preload="metadata" />;
  return <img src={url} alt="" draggable={false} />;
}

/**
 * Un documento sulla tela: la scheda chiusa.
 *
 * Mostra l'icona scelta, il nome e da dove comincia il testo — non tutto. Il
 * tetto sta in `anteprimaTesto`, ed è dichiarato: una bibbia da 200 KB dentro
 * un riquadro di 200 px non è illeggibile, è una tela che si impianta.
 *
 * Non prova a somigliare a un markdown reso: sulla tela conta **riconoscerlo**
 * fra venti altri, e per questo bastano un'icona e tre righe. La lettura vera
 * è l'editor, e ci si arriva con un doppio clic.
 */
function SchedaDocumento({ asset, leggi }) {
  const [testo, setTesto] = useState(null);

  useEffect(() => {
    let vivo = true;
    leggi(asset.id)
      .then(({ file }) => file.text())
      .then((txt) => vivo && setTesto(txt));
    return () => {
      vivo = false;
    };
  }, [asset, leggi]);

  return (
    <div className="brain-doc">
      <span className="brain-doc-testa">
        <Icon name={iconaDocumento(asset)} />
        <b>{asset.name}</b>
      </span>
      <pre>{testo === null ? '' : anteprimaTesto(testo)}</pre>
      <span className="brain-doc-apri">{t('brain.doc.open')}</span>
    </div>
  );
}

/**
 * Il documento aperto: si legge intero, e si scrive.
 *
 * Copre la tela per intero, e questa è l'unica eccezione alla regola «gli
 * strumenti non coprono la tela» — perché qui il documento **è** il lavoro,
 * non un comando che gli sta accanto. Leggere una bibbia di serie dentro un
 * riquadro di 200 px sarebbe leggere da una feritoia.
 *
 * Salva sopra lo stesso asset, non ne crea uno nuovo: vedi `sovrascriviAsset`.
 * E salva **su richiesta**, non a ogni tasto: un salvataggio automatico su un
 * documento di 200 KB significa riscrivere 200 KB in OPFS a ogni lettera.
 */
function Documento({ asset, leggi, onSalva, onScarica, onChiudi }) {
  const [testo, setTesto] = useState(null);
  const [partenza, setPartenza] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    leggi(asset.id)
      .then(({ file }) => file.text())
      .then((txt) => {
        if (!vivo) return;
        setTesto(txt);
        setPartenza(txt);
      });
    return () => {
      vivo = false;
    };
  }, [asset, leggi]);

  const sporco = testo !== null && testo !== partenza;

  // Esc chiude, ma non butta via il lavoro non salvato senza chiedere: un
  // documento perso per un tasto premuto di sfuggita è il difetto che fa
  // smettere di usare uno strumento.
  useEffect(() => {
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      if (sporco && !window.confirm(t('brain.doc.perdere'))) return;
      onChiudi();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [sporco, onChiudi]);

  async function salva() {
    setSalvando(true);
    try {
      await onSalva(asset.id, testo);
      setPartenza(testo);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="brain-documento" role="dialog" aria-modal="true" aria-label={asset.name}>
      <div className="brain-doc-barra">
        <Icon name={iconaDocumento(asset)} />
        <b>{asset.name}</b>
        {sporco && <span className="brain-doc-sporco">{t('brain.doc.nonSalvato')}</span>}
        <span className="brain-spazio" />
        <button className="btn ghost small" onClick={() => onScarica(asset)}>
          {t('library.download')}
        </button>
        <button className="btn small" disabled={!sporco || salvando} onClick={salva}>
          {salvando ? t('brain.doc.salvando') : t('brain.doc.salva')}
        </button>
        <button
          className="btn ghost small"
          onClick={() => {
            if (sporco && !window.confirm(t('brain.doc.perdere'))) return;
            onChiudi();
          }}
        >
          {t('batch.close')}
        </button>
      </div>
      <textarea
        className="brain-doc-testo"
        value={testo ?? ''}
        readOnly={testo === null}
        spellCheck={false}
        onChange={(e) => setTesto(e.target.value)}
      />
    </div>
  );
}

/**
 * La scheda di un file (fase 5b, B-b): si apre col tocco. Qui un file si
 * GUARDA — l'immagine grande, il video e l'audio che partono — e si scrivono
 * il suo nome e la sua nota, che stanno sull'icona e viaggiano col file.
 *
 * Il menu di prima (scontorna, vettorializza, riprendi, togli dalla tela) se
 * n'è andato (B1): un file si manda a un servizio trascinandolo sul suo
 * cerchio, e si toglie dalla tela posandolo sulla pool.
 */
function Scheda({ asset, item, leggi, onRinomina, onNota, onIcona, onApri, onChiudi }) {
  const [nome, setNome] = useState(asset.name);
  const [nota, setNota] = useState(asset.note || '');
  useEffect(() => {
    setNome(asset.name);
    setNota(asset.note || '');
  }, [asset.id, asset.name, asset.note]);

  const salvaNome = () => {
    const pulito = nome.trim();
    if (pulito && pulito !== asset.name) onRinomina(asset.id, pulito);
    else setNome(asset.name);
  };

  return (
    <aside className="brain-scelto brain-scheda" aria-label={asset.name}>
      <div className="scegli-testa">
        <h3>{t('brain.scheda.title')}</h3>
        <button className="btn ghost small" onClick={onChiudi} aria-label={t('bar.clear')}>
          ×
        </button>
      </div>
      <div className="brain-scheda-file">
        <Contenuto item={item} asset={asset} leggi={leggi} />
      </div>
      <label className="brain-scheda-campo">
        {t('brain.scheda.nome')}
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvaNome}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>
      <label className="brain-scheda-campo">
        {t('brain.scheda.nota')}
        <textarea
          value={nota}
          rows={3}
          placeholder={t('brain.scheda.notaVuota')}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => nota !== (asset.note || '') && onNota(asset.id, nota)}
        />
      </label>
      {KIND_TESTO.includes(asset.kind) && (
        <button className="btn" onClick={() => onApri(asset)}>
          {t('brain.doc.open')}
        </button>
      )}
      {/* L'icona del file: su una tela con venti file è l'unica cosa che si
          legge senza avvicinarsi (richiesta del 2026-09-04). */}
      <div className="brain-icone">
        {ICONE_DOCUMENTO.map((n) => (
          <button
            key={n}
            className="brain-icona"
            aria-pressed={asset.meta?.icona === n}
            aria-label={n}
            onClick={() => onIcona(asset.id, n)}
          >
            <Icon name={n} />
          </button>
        ))}
      </div>
    </aside>
  );
}

const NESSUNO = new Set();

function Brain({
  items,
  assets,
  leggi,
  onChange,
  onSalvaDoc,
  onIcona,
  onScarica,
  onRinomina,
  onNota,
  /*
   * La freccia in corso arriva da FUORI: il comando ora e' un cerchio
   * dell'impianto, come i tre gesti di FilmLab. Tenerne anche uno qui dentro
   * vorrebbe dire due comandi per la stessa cosa, e il secondo che si accende
   * senza che il primo se ne accorga.
   */
  collega,
  onCollega,
  /*
   * Gli id dei file nel cestino (fase 5a). I loro oggetti non si disegnano,
   * ma restano in `items`: la tela si riscrive intera a ogni mossa, e
   * «rimetti» deve ritrovarli al loro posto.
   */
  cestinati = NESSUNO,
}, ref) {
  const [scelto, setScelto] = useState(null);
  /* La scheda aperta col tocco (5b): l'id dell'OGGETTO, non dell'asset —
     lo stesso file può stare due volte sulla tela. */
  const [scheda, setScheda] = useState(null);
  // Vero se il puntatore si è mosso oltre la soglia: allora non era un tocco.
  const mosso = useRef(false);
  /* Il documento aperto a tutto schermo sopra la tela. Non è un secondo
     stato del prodotto: è una lettura, e si chiude con Esc come ogni altro
     pannello che copre il lavoro. */
  const [aperto, setAperto] = useState(null);
  const [vista, setVista] = useState({ x: 40, y: 40, z: 1 });
  const piano = useRef(null);
  const preso = useRef(null);
  /**
   * Due dita muovono e ingrandiscono la mappa, un dito trascina l'oggetto
   * (Task 11). `gesto` sono le dita appoggiate; `pizzico` e' la vista e
   * l'angolo del piano all'INIZIO del pizzico — `ancora` ricalcola ogni
   * evento da li', mai dal passo precedente. `vista` resta l'unico stato:
   * la rotella e «centra» scrivono nello stesso posto.
   */
  const gesto = useRef(nuovoGesto());
  const pizzico = useRef(null);

  const perId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const nascosti = useMemo(() => oggettiNascosti(items, cestinati), [items, cestinati]);

  /** Un oggetto nuovo entra dove c'è posto, non sopra gli altri. */
  // Trascinamento. I puntatori si catturano: senza, uscire dalla finestra
  // mentre si trascina lascia l'oggetto attaccato al mouse per sempre.
  function prendi(e, id) {
    // Il secondo dito non prende niente: sta cominciando un pizzico.
    if (dueDita(gesto.current)) return;
    if (e.target.closest('input, textarea, audio, video, button')) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* puntatore non riconosciuto: si trascina lo stesso finché resta sopra */
    }
    preso.current = { id, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
    mosso.current = false;
    setScelto(id);
    onChange(davanti(items, id));
  }

  function trascina(e) {
    if (!preso.current) return;
    const { id, x, y, x0, y0 } = preso.current;
    // Sotto la soglia è ancora un tocco: l'oggetto non si muove, e al
    // rilascio si apre la scheda. Un dito non sta mai fermo del tutto.
    if (!mosso.current && !eTrascinamento(e.clientX - x0, e.clientY - y0)) return;
    mosso.current = true;
    const dx = (e.clientX - x) / vista.z;
    const dy = (e.clientY - y) / vista.z;
    preso.current = { ...preso.current, x: e.clientX, y: e.clientY };
    onChange(muovi(items, id, dx, dy));
  }

  const molla = () => {
    preso.current = null;
  };

  /**
   * Ogni dito che si appoggia sul piano, PRIMA che l'oggetto sotto lo prenda
   * (fase di cattura): e' l'unico modo di sapere che e' il secondo quando
   * l'oggetto decide se prenderlo.
   */
  function ditoAppoggiato(e) {
    // Il primo dito di un tocco nuovo azzera: un dito alzato fuori dal piano
    // (evento perso) non deve restare come fantasma e fare di ogni tocco
    // successivo un «secondo dito».
    if (e.isPrimary) gesto.current = nuovoGesto();
    ditoGiu(gesto.current, { id: e.pointerId, x: e.clientX, y: e.clientY });
    if (!dueDita(gesto.current)) return;
    // ⚠️ Il brief: con un oggetto in mano, il secondo dito lo MOLLA prima di
    // cominciare — altrimenti l'oggetto vola via seguendo il centro delle due
    // dita. `prendi` (che gira dopo, sull'oggetto) non lo riprende.
    preso.current = null;
    const r = piano.current.getBoundingClientRect();
    pizzico.current = { inizio: { ...vista }, left: r.left, top: r.top };
  }

  function ditoMosso(e) {
    const m = ditoMuove(gesto.current, { id: e.pointerId, x: e.clientX, y: e.clientY });
    if (!m) {
      trascina(e);
      return;
    }
    const p = pizzico.current;
    if (!p) return;
    const { left: l, top: t } = p;
    const cont = riquadro(items.filter((o) => !nascosti.has(o.id)));
    const el = piano.current;
    setVista(
      ancora(
        p.inizio,
        { fattore: m.fattore, cx: m.cx - l, cy: m.cy - t, cx0: m.cx0 - l, cy0: m.cy0 - t },
        {
          min: ZOOM_MIN,
          max: ZOOM_MAX,
          palco: el ? { w: el.clientWidth, h: el.clientHeight } : undefined,
          contenuto: cont || undefined,
        },
      ),
    );
  }

  function ditoAlzato(e) {
    ditoSu(gesto.current, e.pointerId);
    if (!dueDita(gesto.current)) pizzico.current = null;
    molla();
  }

  function rotella(e) {
    if (!e.ctrlKey && !e.metaKey) {
      setVista((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      return;
    }
    setVista((v) => ({ ...v, z: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.z - e.deltaY * 0.002)) }));
  }

  /** Rimette tutto in vista: è il gesto che salva chi si è perso. */
  function centra() {
    const r = riquadro(items.filter((o) => !nascosti.has(o.id)));
    if (!r || !piano.current) return;
    const { clientWidth: w, clientHeight: h } = piano.current;
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(w / (r.w + 120), h / (r.h + 120))));
    setVista({ z, x: (w - r.w * z) / 2 - r.x * z, y: (h - r.h * z) / 2 - r.y * z });
  }

  useEffect(() => {
    const tasti = (e) => {
      if (e.key === 'Escape') {
        onCollega(null);
        setScelto(null);
        setScheda(null);
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && scelto) {
        // Mentre si scrive — sulla tela o nella scheda — Backspace cancella
        // lettere, non oggetti.
        if (document.activeElement?.closest('input, textarea, [contenteditable]')) return;
        onChange(togli(items, scelto));
        setScelto(null);
      }
    };
    document.addEventListener('keydown', tasti);
    return () => document.removeEventListener('keydown', tasti);
  }, [items, scelto, onChange, onCollega]);

  /*
   * «Centra tutto» arriva da fuori: il comando ora e' un cerchio
   * dell'impianto, ma la vista (dove si sta guardando, e quanto) e' roba di
   * qui. Stessa forma che l'editor SVG usa gia' con `editorRef`.
   */
  // `apri`: «nota» nel `+` crea un `.md` e lo apre subito per scriverci (5b).
  useImperativeHandle(ref, () => ({ centra, apri: setAperto }), [items]);

  const oggetto = items.find((o) => o.id === scelto) || null;
  const oggettoScheda = items.find((o) => o.id === scheda && !nascosti.has(o.id)) || null;
  const fileScheda = oggettoScheda?.t === 'asset' ? perId.get(oggettoScheda.assetId) : null;

  return (
    <div className="brain">
      {/* Solo la tela. La barra (centra, zoom, pacchi, immagine) e il
          cassetto dei file se ne sono andati il 2026-09-09: «la tela dev'essere
          vuota, deve essere una mappa concettuale». I comandi non sono spariti
          — stanno nei cerchi dell'impianto e sotto Avanzati, che e' dove
          l'impianto li tiene per tutti gli altri servizi. */}
      <div className="brain-corpo">
        <div
          className="brain-piano"
          ref={piano}
          onWheel={rotella}
          onPointerDownCapture={ditoAppoggiato}
          onPointerMove={ditoMosso}
          onPointerUp={ditoAlzato}
          onPointerCancel={ditoAlzato}
          onPointerDown={(e) => {
            // Il secondo dito sul vuoto comincia un pizzico, non deseleziona.
            if (dueDita(gesto.current)) return;
            if (e.target === e.currentTarget || e.target.classList.contains('brain-tela')) {
              setScelto(null);
              setScheda(null);
              onCollega(null);
            }
          }}
        >
          {collega && (
            <p className="brain-istruzione">
              {collega.da ? t('brain.arrowTo') : t('brain.arrowFrom')}
            </p>
          )}

          <div
            className="brain-tela"
            style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})` }}
          >
            <svg className="brain-frecce">
              {items
                .filter((o) => o.t === 'freccia' && !nascosti.has(o.id))
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
              .filter((o) => o.t !== 'freccia' && !nascosti.has(o.id))
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
                  onClick={() => {
                    // Il tocco APRE (B-b): la scheda col nome, la nota e il file
                    // da guardare. Un trascinamento finito sull'oggetto non è un
                    // tocco, e non apre niente.
                    if (o.t !== 'asset' || mosso.current) return;
                    setScheda(o.id);
                  }}
                  onDoubleClick={() => {
                    // Il doppio clic apre il documento per scriverci.
                    const a = o.t === 'asset' ? perId.get(o.assetId) : null;
                    if (a && KIND_TESTO.includes(a.kind)) setAperto(a);
                  }}
                  onPointerDown={(e) => {
                    // Un secondo dito non disegna frecce e non prende oggetti.
                    if (dueDita(gesto.current)) return;
                    if (collega) {
                      // Due clic: il primo sceglie da dove, il secondo dove.
                      // Dopo il secondo la modalità RESTA accesa: chi disegna
                      // una freccia quasi sempre ne disegna tre, e ripremere
                      // il tasto ogni volta è una tassa. Si esce con Esc o
                      // ripremendo FRECCIA.
                      e.stopPropagation();
                      if (!collega.da) onCollega({ da: o.id });
                      else if (collega.da !== o.id) {
                        onChange([...items, nuovaFreccia({ da: collega.da, a: o.id })]);
                        onCollega({ da: null });
                      }
                      return;
                    }
                    prendi(e, o.id);
                  }}
                >
                  {o.t === 'asset' && (
                    <>
                      <span className="brain-faccia">
                        <Faccia asset={perId.get(o.assetId)} leggi={leggi} />
                      </span>
                      {/* Titolo e nota SULL'icona (B4): sono del file, e
                          viaggiano con lui — non con la tela. */}
                      <span className="brain-titolo">{perId.get(o.assetId)?.name}</span>
                      {perId.get(o.assetId)?.note && (
                        <span className="brain-nota-icona">{perId.get(o.assetId).note}</span>
                      )}
                    </>
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

        {/* La scheda del file toccato; per un gruppo il colore e «togli». */}
        {fileScheda ? (
          <Scheda
            asset={fileScheda}
            item={oggettoScheda}
            leggi={leggi}
            onRinomina={onRinomina}
            onNota={onNota}
            onIcona={onIcona}
            onApri={setAperto}
            onChiudi={() => setScheda(null)}
          />
        ) : (
          oggetto?.t === 'cerchio' && (
            <aside className="brain-scelto">
              <h3>{t('brain.kind.cerchio')}</h3>
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
          )
        )}
      </div>

      {aperto && (
        <Documento
          asset={aperto}
          leggi={leggi}
          onSalva={onSalvaDoc}
          onScarica={onScarica}
          onChiudi={() => setAperto(null)}
        />
      )}
    </div>
  );
}

export default forwardRef(Brain);
