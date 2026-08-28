import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_FILE, aPng, applicaAlfa, mb, pixelDaFile, ritaglioIstantaneo, scaricaModello } from './ritaglio.js';
import { guidaDritta, maniglia, pennellaGuidato, puntoDellaGuida, spostaManiglia } from '../engine/righello.js';

/**
 * Lo strumento gratuito della home: togli lo sfondo, fino a tre per volta.
 *
 * È la prima cosa che vede chi arriva, ed è la ragione per cui la home smette
 * di essere una pagina che racconta e diventa una che lavora. Tre decisioni
 * che non sono dettagli:
 *
 * 1. **Il motore non si carica finché non serve.** ONNX e i modelli entrano
 *    con un `import()` solo quando un file trascinato ne ha davvero bisogno —
 *    chi arriva, legge e se ne va non scarica un byte, e nemmeno chi porta uno
 *    sticker;
 * 2. **Prima si prova senza modello.** Uno sticker, un logo, un'illustrazione
 *    su tinta unita si ritagliano in venti millisecondi con `keying.js`;
 * 3. **L'attesa si dice in megabyte.** Dove non c'è una misura non c'è un
 *    avviso.
 *
 * L'impianto segue `docs/2026-08-28-contratto-ux.md`: gli strumenti compaiono
 * **dopo** il risultato, e la misura del tratto compare quando si sceglie uno
 * strumento — prima non c'è niente da correggere e niente da misurare.
 */

/**
 * Le misure del tratto, in pixel dello SCHERMO.
 *
 * Le stesse del pennello dello studio, e per la stessa ragione misurata il
 * 2026-08-27: il raggio si converte in pixel dell'immagine dividendo per lo
 * zoom, quindi a 8× la più fine copre 3 pixel veri invece di 24.
 */
const MISURE = [4, 10, 25, 60, 120];
const ZOOM_MAX = 8;

/** I tre strumenti del contratto. Il righello non dipinge: guida chi dipinge. */
const STRUMENTI = ['righello', 'ripristina', 'cancella'];

/** Da punto sullo schermo a pixel dell'immagine, qualunque sia lo zoom. */
function suImmagine(e, canvas) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

export default function Ritaglio({ c, ricetta, onRicetta }) {
  const [lavori, setLavori] = useState([]);
  const [busy, setBusy] = useState(null);
  const [scarico, setScarico] = useState(null);
  const [avviso, setAvviso] = useState(null);
  const [troppi, setTroppi] = useState(false);
  const [strumento, setStrumento] = useState(null);
  const [misura, setMisura] = useState(25);
  const [zoom, setZoom] = useState({});
  const [guide, setGuide] = useState({});
  const [personalizza, setPersonalizza] = useState(false);
  const [sopra, setSopra] = useState(false);

  const motore = useRef(null);
  const tele = useRef({});
  const trascino = useRef(null);

  const preparaMotore = useCallback(async () => {
    if (motore.current) return motore.current;
    const [{ createEngine }, cap] = await Promise.all([
      import('../engine/client.js'),
      import('../engine/capabilities.js'),
    ]);
    const tier = cap.pickTier(await cap.detectWebGpu(navigator.gpu));
    // `defaultModelFor` restituisce il MODELLO, non il suo id: il modello lo
    // sceglie il prodotto, non questa pagina.
    const model = cap.defaultModelFor(tier);
    await scaricaModello(model.url, (d) => setScarico(d));
    setScarico(null);
    const engine = createEngine();
    await engine.init(tier);
    motore.current = { engine, modelId: model.id };
    return motore.current;
  }, []);

  useEffect(() => () => motore.current?.engine.dispose(), []);

  const accetta = useCallback(
    async (lista) => {
      const immagini = [...lista].filter((f) => /^image\//.test(f.type));
      if (!immagini.length) return;
      if (immagini.length > MAX_FILE) setTroppi(true);

      setAvviso(null);
      setBusy(c.tool.reading);
      try {
        const nuovi = [];
        for (const f of immagini.slice(0, MAX_FILE)) {
          const src = await pixelDaFile(f);
          // Venti millisecondi per sapere se il modello servirà: si paga qui,
          // una volta, invece di far pagare a tutti lo scaricamento.
          const istante = ritaglioIstantaneo(src);
          nuovi.push({
            id: `${f.name}-${f.size}-${nuovi.length}`,
            nome: f.name.replace(/\.[^.]+$/, ''),
            src,
            alpha: null,
            pronto: istante ? istante.alpha : null,
            via: null,
          });
        }
        setLavori(nuovi);
        setStrumento(null);
        setGuide({});
        if (nuovi.some((l) => !l.pronto)) preparaMotore().catch(() => {});
      } catch {
        setAvviso(c.tool.unreadable);
      } finally {
        setBusy(null);
      }
    },
    [c, preparaMotore],
  );

  async function premiZack() {
    if (!lavori.length || busy) return;
    setAvviso(null);
    const fatti = [];
    try {
      const restano = [];
      for (const l of lavori) {
        if (l.pronto) fatti.push({ ...l, alpha: l.pronto, via: 'istante' });
        else restano.push(l);
      }
      if (restano.length) {
        setBusy(c.tool.preparing);
        const { engine, modelId } = await preparaMotore();
        for (const l of restano) {
          setBusy(c.tool.working);
          const bitmap = await createImageBitmap(
            new ImageData(new Uint8ClampedArray(l.src.rgba), l.src.w, l.src.h),
          );
          const out = await engine.cutout(bitmap, modelId);
          const alpha = new Uint8ClampedArray(l.src.w * l.src.h);
          for (let i = 0; i < alpha.length; i++) alpha[i] = out.rgba[i * 4 + 3];
          fatti.push({ ...l, alpha, via: 'modello' });
        }
      }
      // L'ordine di partenza, non quello di arrivo.
      const ordine = lavori.map((l) => l.id);
      fatti.sort((a, b) => ordine.indexOf(a.id) - ordine.indexOf(b.id));
      setLavori(fatti);
      setPersonalizza(true);
    } catch (e) {
      console.error(e);
      setAvviso(c.tool.failed);
    } finally {
      setBusy(null);
      setScarico(null);
    }
  }

  /**
   * Ridisegna una tela: prima i pixel, poi la guida sopra.
   *
   * La guida si disegna qui e non in un livello a parte perché deve stare
   * **sopra il risultato ma sotto niente**: un elemento separato allineato al
   * canvas si scollerebbe al primo zoom.
   */
  const ridipingi = useCallback(
    (l) => {
      const cv = tele.current[l.id];
      if (!cv) return;
      const cx = cv.getContext('2d');
      cx.putImageData(
        l.alpha ? applicaAlfa(l.src, l.alpha) : new ImageData(new Uint8ClampedArray(l.src.rgba), l.src.w, l.src.h),
        0,
        0,
      );

      const g = guide[l.id];
      if (!g) return;
      const spessore = Math.max(2, l.src.w / 400);
      cx.save();
      cx.strokeStyle = '#c4a35a';
      cx.lineWidth = spessore;
      cx.beginPath();
      cx.moveTo(g.a.x, g.a.y);
      cx.quadraticCurveTo(g.c.x, g.c.y, g.b.x, g.b.y);
      cx.stroke();
      // Le tre maniglie: due estremi e quella di curvatura. Senza un pallino
      // suo, la curvatura non si scopre mai.
      cx.fillStyle = '#c4a35a';
      for (const p of [g.a, g.b, puntoDellaGuida(g, 0.5)]) {
        cx.beginPath();
        cx.arc(p.x, p.y, spessore * 3, 0, Math.PI * 2);
        cx.fill();
      }
      cx.restore();
    },
    [guide],
  );

  useEffect(() => {
    for (const l of lavori) ridipingi(l);
  }, [lavori, ridipingi]);

  function giu(e, l) {
    if (!l.alpha || !strumento) return;
    const cv = tele.current[l.id];
    // La cattura del puntatore serve a non perdere il tratto se il dito esce
    // dalla tela, ma NON deve poter interrompere il gesto: su un puntatore che
    // il browser non riconosce solleva, e senza questo `try` la pennellata non
    // partiva affatto (2026-08-28).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* si dipinge lo stesso, si perde solo il tratto fuori dalla tela */
    }
    const p = suImmagine(e, cv);

    if (strumento === 'righello') {
      const g = guide[l.id];
      const presa = Math.max(14, l.src.w / 40);
      const quale = g ? maniglia(g, p, { presa }) : null;
      // Senza guida, il primo trascinamento la crea. Con guida, si afferra
      // una maniglia; toccando lontano se ne ricomincia una nuova.
      trascino.current = quale
        ? { id: l.id, quale, ultimo: p }
        : { id: l.id, quale: 'nuova', da: p };
      if (!quale) setGuide((g0) => ({ ...g0, [l.id]: guidaDritta(p, p) }));
      return;
    }

    trascino.current = { id: l.id, quale: 'pennello' };
    pennellata(p, l);
  }

  function muovi(e, l) {
    const t = trascino.current;
    if (!t || t.id !== l.id || !e.buttons) return;
    const p = suImmagine(e, tele.current[l.id]);

    if (t.quale === 'pennello') return pennellata(p, l);

    if (t.quale === 'nuova') {
      setGuide((g0) => ({ ...g0, [l.id]: guidaDritta(t.da, p) }));
      return;
    }
    setGuide((g0) => ({
      ...g0,
      [l.id]: spostaManiglia(g0[l.id], t.quale, { x: p.x - t.ultimo.x, y: p.y - t.ultimo.y }),
    }));
    trascino.current = { ...t, ultimo: p };
  }

  /**
   * Una pennellata, eventualmente fermata dalla guida.
   *
   * Il raggio è in pixel dell'IMMAGINE: la misura scelta è in pixel dello
   * schermo, e si divide per lo zoom — è il motivo per cui a 8× la matita più
   * fine copre 3 pixel veri invece di 24.
   */
  function pennellata(p, l) {
    if (!l.alpha) return;
    const cv = tele.current[l.id];
    const scala = l.src.w / cv.getBoundingClientRect().width;
    pennellaGuidato(
      l.alpha,
      l.src.w,
      l.src.h,
      { ...p, raggio: Math.max(1, (misura / 2) * scala), valore: strumento === 'ripristina' ? 255 : 0 },
      guide[l.id] || null,
      { modo: 'barriera' },
    );
    ridipingi(l);
  }

  async function scarica(l) {
    const blob = await aPng(applicaAlfa(l.src, l.alpha));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${l.nome}-zack.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  const pronti = lavori.some((l) => l.alpha);
  const z = (id) => zoom[id] || 1;
  const cambiaZoom = (id, d) =>
    setZoom((s) => ({ ...s, [id]: Math.min(ZOOM_MAX, Math.max(1, (s[id] || 1) + d)) }));

  return (
    <div
      className="rit"
      onDragOver={(e) => {
        e.preventDefault();
        setSopra(true);
      }}
      onDragLeave={() => setSopra(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSopra(false);
        accetta(e.dataTransfer.files);
      }}
      data-sopra={sopra || undefined}
    >
      <div className="rit-tasto">
        <button
          className="zack-oval"
          onClick={() => (lavori.length ? premiZack() : document.getElementById('rit-input').click())}
          disabled={Boolean(busy)}
        >
          ZACK
        </button>
        {/* Il punto oro: piccolo da vedere, 44 px da premere. Sotto quella
            misura un polpastrello sbaglia — la zona premibile sta nel CSS,
            attorno al pallino, ed è trasparente. */}
        <button
          className="punto-oro"
          aria-expanded={personalizza}
          aria-label={c.tool.customise}
          onClick={() => setPersonalizza((v) => !v)}
        >
          <i />
        </button>
      </div>

      <p className="rit-claim">{c.tool.claim}</p>

      <input
        id="rit-input"
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => accetta(e.target.files)}
      />

      {/* Il `+` si vede con uno o due file, e sparisce al terzo. */}
      {lavori.length < MAX_FILE && (
        <button className="rit-piu" onClick={() => document.getElementById('rit-input').click()}>
          <b>+</b>
          <span>{lavori.length ? c.tool.addMore : c.tool.orDrop}</span>
        </button>
      )}

      {(busy || scarico) && (
        <div className="rit-attesa">
          <PiumaCheScrive />
          <p>{busy || c.tool.downloading}</p>
          {scarico && (
            <>
              <div
                className="rit-barra"
                role="progressbar"
                aria-valuenow={Math.round((scarico.frazione ?? 0) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${Math.round((scarico.frazione ?? 0) * 100)}%` }} />
              </div>
              <small>
                {scarico.totale
                  ? c.tool.progress.replace('{fatti}', mb(scarico.fatti)).replace('{totale}', mb(scarico.totale))
                  : mb(scarico.fatti)}
              </small>
            </>
          )}
        </div>
      )}

      {avviso && <p className="rit-avviso">{avviso}</p>}

      {/* ── gli strumenti, che compaiono DOPO il risultato ───────────────── */}
      {pronti && (
        <div className="rit-strumenti">
          {STRUMENTI.map((s) => (
            <button key={s} aria-pressed={strumento === s} onClick={() => setStrumento(strumento === s ? null : s)}>
              {c.tool[s]}
            </button>
          ))}
          {guide && Object.keys(guide).length > 0 && (
            <button className="comelink" onClick={() => setGuide({})}>
              {c.tool.clearGuide}
            </button>
          )}

          {/* La misura del tratto compare quando si sceglie uno strumento:
              prima non c'è niente da misurare. Il righello non dipinge, quindi
              non ha una misura sua. */}
          {strumento && strumento !== 'righello' && (
            <span className="rit-misure">
              {MISURE.map((m) => (
                <button key={m} aria-pressed={misura === m} onClick={() => setMisura(m)} aria-label={`${m}px`}>
                  <i style={{ width: Math.min(18, m / 6), height: Math.min(18, m / 6) }} />
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      {lavori.length > 0 && (
        <div className="rit-tele">
          {lavori.map((l) => (
            <figure key={l.id} className="rit-tela">
              <div className="rit-vista" data-zoom={z(l.id) > 1 || undefined}>
                <canvas
                  ref={(el) => {
                    if (!el) return;
                    tele.current[l.id] = el;
                    el.width = l.src.w;
                    el.height = l.src.h;
                    ridipingi(l);
                  }}
                  style={{
                    cursor: strumento ? 'crosshair' : 'default',
                    touchAction: 'none',
                    width: z(l.id) > 1 ? `${z(l.id) * 100}%` : undefined,
                    maxWidth: z(l.id) > 1 ? 'none' : undefined,
                  }}
                  onPointerDown={(e) => giu(e, l)}
                  onPointerMove={(e) => muovi(e, l)}
                  onPointerUp={() => {
                    trascino.current = null;
                  }}
                />
              </div>

              {/* La barra dello zoom, accanto a ogni file. Senza, un bordo non
                  si corregge: misurato, a 8× la matita più fine passa da 24
                  pixel veri a 3. */}
              {l.alpha && (
                <div className="rit-zoom">
                  <button onClick={() => cambiaZoom(l.id, 1)} disabled={z(l.id) >= ZOOM_MAX} aria-label={c.tool.zoomIn}>
                    +
                  </button>
                  <b>{z(l.id)}×</b>
                  <button onClick={() => cambiaZoom(l.id, -1)} disabled={z(l.id) <= 1} aria-label={c.tool.zoomOut}>
                    −
                  </button>
                </div>
              )}

              <figcaption>
                <span className="rit-nome">{l.nome}</span>
                {l.via && <span className="rit-via">{l.via === 'istante' ? c.tool.instant : c.tool.viaModel}</span>}
                {l.alpha && (
                  <button className="comelink" onClick={() => scarica(l)}>
                    {c.tool.download}
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {personalizza && (
        <div className="rit-tuo">
          <p>{c.tool.makeYours}</p>
          <div className="rit-pastiglie">
            {[
              { id: 'x4', label: '×4' },
              { id: 'x2', label: '×2' },
              { id: 'd2', label: ':2' },
              { id: 'd4', label: ':4' },
              { id: 'scarica', label: c.tool.addDownload },
            ].map((p) => (
              <button
                key={p.id}
                className="pastiglia"
                aria-pressed={ricetta.includes(p.id)}
                onClick={() => onRicetta(p.id)}
              >
                {/* Il colore non è mai l'unico segnale: l'accesa porta anche il
                    numero del suo posto, che è oro E informazione. */}
                {ricetta.includes(p.id) && <b className="posto">{ricetta.indexOf(p.id) + 2}.</b>}
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {troppi && (
        <div className="rit-tre">
          <p>{c.tool.onlyThree}</p>
          <a className="lp-cta small" href="/app/">
            {c.tool.toStudio}
          </a>
          <button className="comelink" onClick={() => setTroppi(false)}>
            {c.tool.close}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * La piuma che scrive in oro, e si cancella.
 *
 * Un `<path>` solo: **circa 2 KB**. Misurato il 2026-08-27, un solo fotogramma
 * dello stesso gesto vettorializzato da un video ne pesa 232 — e il video
 * intero 229.
 */
function PiumaCheScrive() {
  return (
    <svg className="piuma" viewBox="0 0 200 60" aria-hidden="true">
      <path
        d="M6 42 C 30 12, 56 12, 76 34 S 122 56, 142 30 S 182 8, 194 26"
        fill="none"
        stroke="#c4a35a"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
