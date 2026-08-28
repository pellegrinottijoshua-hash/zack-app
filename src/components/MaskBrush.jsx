import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { guidaDritta, maniglia, puntoDellaGuida, spostaManiglia, tracciaGuidata } from '../engine/righello.js';
import {
  stroke,
  maskFromRgba,
  applyMask,
  colorsFrom,
  changedPixels,
  ERASE,
  RESTORE,
} from '../engine/brush.js';

/**
 * Le misure del pennello, in pixel DELLO SCHERMO.
 *
 * Il 4 non c'era, e il committente ci ha sbattuto contro (2026-08-27): quando
 * lo scontorno fallisce del tutto — non vede nemmeno il disco colorato dietro
 * il soggetto — rifare il bordo col 10 e' come disegnare un contorno con un
 * pennarello. Il 4 e' il piu' piccolo che resti visibile e afferrabile col
 * dito su un telefono.
 *
 * Sono pixel dello SCHERMO, non dell'immagine: `raggio = (size / 2) * scale`
 * converte, quindi zoomando lo stesso tasto copre meno pixel veri. Le due
 * lamentele — «la matita non e' abbastanza piccola» e «non si puo' zoomare» —
 * sono la stessa lamentela, e lo zoom e' la meta' che mancava.
 */
const SIZES = [4, 10, 25, 60, 120];

/**
 * Quanto si puo' ingrandire la tela.
 *
 * Otto volte: su un file da 4096 px mostrato a 800 significa arrivare a circa
 * 1,6 pixel dell'immagine per pixel dello schermo, cioe' vedere il bordo per
 * quello che e'. Oltre si guarda l'interpolazione, non il file.
 */
const ZOOM_MAX = 8;
const MAX_UNDO = 12;

/**
 * Correzione a mano del ritaglio.
 *
 * L'AI sbaglia sempre in qualche punto, e senza un modo di correggere l'utente
 * deve buttare via tutto il risultato per un capello di troppo. Qui si dipinge
 * sull'alfa: si toglie ciò che è rimasto, si recupera ciò che è sparito.
 *
 * Funziona a mouse e a dito: su un telefono il pennello è l'unico modo
 * praticabile di rifinire un ritaglio.
 *
 * **Serve il file di partenza, non solo il ritaglio.** Il canvas premoltiplica
 * i colori per l'opacità: ciò che è stato portato a trasparente ha perso il
 * colore sul posto, e recuperarlo dal solo ritaglio ridipinge nero. I colori
 * vivi stanno soltanto nella sorgente.
 */
/**
 * I pixel di un'immagine, eventualmente riportata a una misura data.
 *
 * Riscalare è lecito **solo se le proporzioni coincidono**: un ingrandimento
 * cambia la misura ma non il contenuto, quindi la sorgente riscalata ha il
 * colore giusto in ogni punto. Un ritaglio invece cambia il contenuto, e
 * riscalarlo sposterebbe i colori di posto — lì si rinuncia e lo si dice.
 *
 * Prima non si riscalava mai: dopo un ingrandimento in blocco la sorgente
 * aveva un'altra misura, il pennello rinunciava al colore e ciò che si
 * recuperava tornava NERO. Il difetto si vedeva solo correggendo a mano un
 * file passato dal blocco, cioè nel momento peggiore.
 */
async function toPixels(blob, misura = null) {
  const bmp = await createImageBitmap(blob);

  let w = bmp.width;
  let h = bmp.height;
  if (misura) {
    const stessaForma = Math.abs(bmp.width / bmp.height - misura.w / misura.h) < 0.01;
    if (stessaForma) {
      w = misura.w;
      h = misura.h;
    }
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

export default function MaskBrush({ source, cutout, onChange, onDone }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [mode, setMode] = useState('erase');
  const [size, setSize] = useState(25);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  /**
   * La guida del righello, e cosa si sta trascinando.
   *
   * Il righello non dipinge: guida chi dipinge. Con una guida attiva, Gomma e
   * Recupera lavorano in BARRIERA — il colore non passa dall'altra parte — ed
   * e' la risposta al bordo che il modello ha sbagliato: si mette la guida dove
   * dovrebbe stare e si riempie di getto, invece di ricalcarlo.
   */
  const [guida, setGuida] = useState(null);
  const presa = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  // Vero quando la sorgente non è utilizzabile: il recupero funziona ancora
  // dove il colore è sopravvissuto, ma va detto prima, non scoperto dipingendo.
  const [limited, setLimited] = useState(false);

  // Prepara i pixel una volta: il colore non cambia mai, solo l'alfa.
  useEffect(() => {
    let alive = true;
    (async () => {
      const cut = await toPixels(cutout);
      if (!alive) return;

      // La sorgente può mancare, essere un vettore, o avere un'altra
      // dimensione dopo un ritaglio o un ingrandimento. In tutti questi casi
      // si continua con quello che c'è invece di fermarsi.
      let src = null;
      try {
        src = source ? await toPixels(source, { w: cut.w, h: cut.h }) : null;
      } catch (e) {
        console.error(e);
      }
      if (!alive) return;

      const count = cut.w * cut.h;
      const usable = src && src.w === cut.w && src.h === cut.h;
      setLimited(!usable);

      stateRef.current = {
        w: cut.w,
        h: cut.h,
        rgba: colorsFrom(usable ? src.data : null, cut.data, count),
        mask: maskFromRgba(cut.data, count),
        undo: [],
        last: null,
      };
      paint();
    })();
    return () => {
      alive = false;
    };
    // Si prepara una volta per ogni ritaglio ricevuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutout, source]);

  const paint = useCallback(() => {
    const s = stateRef.current;
    const cv = canvasRef.current;
    if (!s || !cv) return;
    cv.width = s.w;
    cv.height = s.h;
    const copy = new Uint8ClampedArray(s.rgba);
    applyMask(copy, s.mask, s.w * s.h);
    const cx = cv.getContext('2d');
    cx.putImageData(new ImageData(copy, s.w, s.h), 0, 0);

    // La guida si disegna QUI, dentro la tela, e non in un livello sopra: un
    // elemento allineato a parte si scollerebbe al primo zoom. Non finisce nel
    // file salvato, che `commit` ricostruisce dai pixel piu' la maschera.
    if (!guida) return;
    const sp = Math.max(2, s.w / 400);
    cx.save();
    cx.strokeStyle = '#c4a35a';
    cx.lineWidth = sp;
    cx.beginPath();
    cx.moveTo(guida.a.x, guida.a.y);
    cx.quadraticCurveTo(guida.c.x, guida.c.y, guida.b.x, guida.b.y);
    cx.stroke();
    cx.fillStyle = '#c4a35a';
    for (const q of [guida.a, guida.b, puntoDellaGuida(guida, 0.5)]) {
      cx.beginPath();
      cx.arc(q.x, q.y, sp * 3, 0, Math.PI * 2);
      cx.fill();
    }
    cx.restore();
  }, [guida]);

  // Ridisegna quando la guida cambia: senza, la si trascina e non si vede.
  useEffect(() => {
    paint();
  }, [guida, paint]);

  /** Dal punto sullo schermo al pixel dell'immagine, qualunque sia lo zoom. */
  const toImage = (ev) => {
    const cv = canvasRef.current;
    const r = cv.getBoundingClientRect();
    const p = ev.touches?.[0] || ev;
    return {
      x: ((p.clientX - r.left) / r.width) * cv.width,
      y: ((p.clientY - r.top) / r.height) * cv.height,
    };
  };

  const begin = (ev) => {
    const s = stateRef.current;
    if (!s) return;
    ev.preventDefault();

    if (mode === 'righello') {
      const p = toImage(ev);
      const raggio = Math.max(14, s.w / 40);
      const quale = guida ? maniglia(guida, p, { presa: raggio }) : null;
      // Senza guida il primo trascinamento la crea; con guida si afferra una
      // maniglia, e toccando lontano se ne ricomincia una nuova.
      presa.current = quale ? { quale, ultimo: p } : { quale: 'nuova', da: p };
      if (!quale) setGuida(guidaDritta(p, p));
      return;
    }

    // La cronologia si limita: dodici passi bastano e non mangiano memoria.
    s.undo.push(s.mask.slice());
    if (s.undo.length > MAX_UNDO) s.undo.shift();
    setCanUndo(true);
    s.last = toImage(ev);
    move(ev);
  };

  const move = (ev) => {
    const s = stateRef.current;

    if (mode === 'righello') {
      const g = presa.current;
      if (!g) return;
      ev.preventDefault();
      const p = toImage(ev);
      if (g.quale === 'nuova') setGuida(guidaDritta(g.da, p));
      else {
        setGuida((v) => spostaManiglia(v, g.quale, { x: p.x - g.ultimo.x, y: p.y - g.ultimo.y }));
        presa.current = { ...g, ultimo: p };
      }
      return;
    }

    if (!s || !s.last) return;
    ev.preventDefault();
    const p = toImage(ev);
    // Il raggio è in pixel dell'immagine, così il pennello ha la stessa
    // dimensione percepita a qualsiasi zoom.
    const scale = s.w / canvasRef.current.getBoundingClientRect().width;
    tracciaGuidata(
      s.mask,
      s.w,
      s.h,
      s.last,
      p,
      { raggio: (size / 2) * scale, valore: mode === 'erase' ? ERASE : RESTORE },
      guida,
      { modo: 'barriera' },
    );
    s.last = p;
    paint();
    setDirty(true);
  };

  const end = () => {
    presa.current = null;
    const s = stateRef.current;
    if (!s) return;
    s.last = null;
    // Una passata che non ha cambiato nulla non entra nella cronologia:
    // un annulla che non annulla niente sembra rotto.
    const prev = s.undo[s.undo.length - 1];
    if (prev && changedPixels(prev, s.mask) === 0) s.undo.pop();
    setCanUndo(s.undo.length > 0);
  };

  const undo = () => {
    const s = stateRef.current;
    if (!s?.undo.length) return;
    s.mask = s.undo.pop();
    setCanUndo(s.undo.length > 0);
    paint();
  };

  const commit = async () => {
    const s = stateRef.current;
    if (!s) return;
    const cv = canvasRef.current;
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    onDone(blob);
    setDirty(false);
  };

  return (
    <div className="brush">
      <div className="brush-bar">
        <button
          className="opt"
          aria-pressed={mode === 'erase'}
          onClick={() => setMode('erase')}
          title={t('brush.eraseHelp')}
        >
          {t('brush.erase')}
        </button>
        <button
          className="opt"
          aria-pressed={mode === 'restore'}
          onClick={() => setMode('restore')}
          title={t('brush.restoreHelp')}
        >
          {t('brush.restore')}
        </button>

        <button
          className="opt"
          aria-pressed={mode === 'righello'}
          onClick={() => setMode(mode === 'righello' ? 'erase' : 'righello')}
          title={t('brush.rulerHelp')}
        >
          {t('brush.ruler')}
        </button>
        {guida && (
          <button className="btn ghost small" onClick={() => setGuida(null)}>
            {t('brush.rulerOff')}
          </button>
        )}

        <span className="brush-zoom">
          <button
            onClick={() => setZoom((z) => Math.max(1, Math.round(z / 1.5)))}
            disabled={zoom <= 1}
            aria-label={t('brush.zoomOut')}
          >
            −
          </button>
          {/* Il numero, non un'icona: chi corregge un bordo vuole sapere DOVE
              sta, e «3x» lo dice mentre una lente non lo dice. */}
          <b>{zoom}×</b>
          <button
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z < 2 ? 2 : z + 2))}
            disabled={zoom >= ZOOM_MAX}
            aria-label={t('brush.zoomIn')}
          >
            +
          </button>
        </span>

        <span className="brush-sizes">
          {SIZES.map((s) => (
            <button key={s} aria-pressed={size === s} onClick={() => setSize(s)} aria-label={`${s}px`}>
              <i style={{ width: Math.min(18, s / 6), height: Math.min(18, s / 6) }} />
            </button>
          ))}
        </span>

        <button className="btn ghost small" disabled={!canUndo} onClick={undo}>
          {t('editor.undo.label')}
        </button>
        <button className="btn small" disabled={!dirty} onClick={commit}>
          {t('brush.apply')}
        </button>
      </div>

      {limited && mode === 'restore' && <p className="verdict" data-level="attenzione">{t('brush.limited')}</p>}

      {/* Ingrandire la tela e' l'altra meta' del pennello piccolo: il raggio e'
          in pixel dello schermo, quindi a 8x lo stesso tasto copre otto volte
          meno pixel veri. Lo spostamento e' lo SCORRIMENTO nativo del
          contenitore — niente trascinamenti da reinventare, e funziona gia'
          con trackpad, dita e barre. */}
      <div className="brush-stage" data-zoom={zoom > 1 || undefined}>
        <canvas
          ref={canvasRef}
          onPointerDown={begin}
          onPointerMove={(e) => e.buttons && move(e)}
          onPointerUp={end}
          onPointerLeave={end}
          style={{
            cursor: 'crosshair',
            touchAction: 'none',
            width: zoom > 1 ? `${zoom * 100}%` : undefined,
            maxWidth: zoom > 1 ? 'none' : undefined,
          }}
        />
      </div>
    </div>
  );
}
