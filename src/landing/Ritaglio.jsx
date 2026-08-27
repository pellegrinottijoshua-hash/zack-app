import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_FILE,
  aPng,
  applicaAlfa,
  mb,
  pennella,
  pixelDaFile,
  ritaglioIstantaneo,
  scaricaModello,
} from './ritaglio.js';

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
 *    sticker. È la regola scritta in `vite.config.js`, e continua a valere
 *    adesso che la home lavora;
 * 2. **Prima si prova senza modello.** Uno sticker, un logo, un'illustrazione
 *    su tinta unita si ritagliano in venti millisecondi con `keying.js`. Il
 *    modello da 175 MB si scarica solo per le immagini che ne hanno davvero
 *    bisogno, ed è la differenza fra «un clic» e «un minuto e mezzo»;
 * 3. **L'attesa si dice in megabyte.** Dove non c'è una misura non c'è un
 *    avviso.
 */

/** Da coordinate del mouse a coordinate dell'immagine, che non è la stessa cosa. */
function puntoSuImmagine(e, canvas, w, h) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - box.left) / box.width) * w,
    y: ((e.clientY - box.top) / box.height) * h,
  };
}

export default function Ritaglio({ c, ricetta, onRicetta }) {
  const [lavori, setLavori] = useState([]);
  const [busy, setBusy] = useState(null);
  const [scarico, setScarico] = useState(null);
  const [avviso, setAvviso] = useState(null);
  const [troppi, setTroppi] = useState(false);
  const [scelto, setScelto] = useState(null);
  const [modo, setModo] = useState('rimetti');
  const [personalizza, setPersonalizza] = useState(false);
  const [sopra, setSopra] = useState(false);

  const motore = useRef(null);
  const tele = useRef({});
  const disegna = useRef(false);

  /**
   * Il motore, caricato solo quando si sa che serve davvero.
   *
   * La prima versione lo scaricava al passaggio del mouse sul tasto, per
   * guadagnare i secondi del finder. Sbagliata: scaricava 175 MB anche per
   * un'immagine che si ritaglia in venti millisecondi senza modello, cioè
   * annullava esattamente il vantaggio di `keying.js`.
   *
   * La regola giusta è più tardi e più mirata: **appena i file entrano** si
   * prova l'istantaneo — costa venti millisecondi — e il modello parte solo se
   * almeno uno non ce l'ha fatta. Chi porta sticker e illustrazioni non
   * scarica niente, mai; chi porta una fotografia trova il modello già a metà
   * strada quando preme.
   */
  const preparaMotore = useCallback(async () => {
    if (motore.current) return motore.current;
    const [{ createEngine }, cap] = await Promise.all([
      import('../engine/client.js'),
      import('../engine/capabilities.js'),
    ]);
    const tier = cap.pickTier(await cap.detectWebGpu(navigator.gpu));
    // `defaultModelFor` restituisce il MODELLO, non il suo id: passarlo a
    // `getModel` dava «Modello sconosciuto: [object Object]» (2026-08-27).
    // Il modello lo sceglie il prodotto, non questa pagina: un secondo posto
    // dove si decide quale rete usare è un secondo posto dove sbagliare.
    const model = cap.defaultModelFor(tier);
    const modelId = model.id;

    // Prima i byte, con la barra. Poi il motore, che li ritrova in cache.
    await scaricaModello(model.url, ({ fatti, totale, frazione }) =>
      setScarico({ fatti, totale, frazione }),
    );
    setScarico(null);

    const engine = createEngine();
    await engine.init(tier);
    motore.current = { engine, modelId };
    return motore.current;
  }, []);

  useEffect(() => () => motore.current?.engine.dispose(), []);

  /** Accetta i file, e il quarto diventa l'invito allo studio. */
  const accetta = useCallback(
    async (lista) => {
      const immagini = [...lista].filter((f) => /^image\//.test(f.type));
      if (!immagini.length) return;
      if (immagini.length > MAX_FILE) setTroppi(true);

      const presi = immagini.slice(0, MAX_FILE);
      setAvviso(null);
      setBusy(c.tool.reading);
      try {
        const nuovi = [];
        for (const f of presi) {
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
            url: null,
            via: null,
          });
        }
        setLavori(nuovi);
        setScelto(null);

        // Se anche uno solo ha bisogno del modello, i byte partono adesso:
        // l'utente sta ancora guardando le miniature, e quei secondi sono
        // gratis. Se nessuno ne ha bisogno, non parte niente. Mai.
        if (nuovi.some((l) => !l.pronto)) preparaMotore().catch(() => {});
      } catch {
        setAvviso(c.tool.unreadable);
      } finally {
        setBusy(null);
      }
    },
    [c, preparaMotore],
  );

  /** Il tasto Zack: prova l'istantaneo, e scende al modello solo se serve. */
  async function premiZack() {
    if (!lavori.length || busy) return;
    setAvviso(null);
    const fatti = [];

    try {
      // La prova istantanea è già stata fatta quando i file sono entrati:
      // qui si raccoglie soltanto il risultato.
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

      const conUrl = await Promise.all(
        fatti.map(async (l) => {
          const blob = await aPng(applicaAlfa(l.src, l.alpha));
          return { ...l, blob, url: URL.createObjectURL(blob) };
        }),
      );
      // L'ordine di partenza, non quello di arrivo: chi ha trascinato tre file
      // se li aspetta nell'ordine in cui li ha trascinati.
      const ordine = lavori.map((l) => l.id);
      conUrl.sort((a, b) => ordine.indexOf(a.id) - ordine.indexOf(b.id));

      setLavori(conUrl);
      setPersonalizza(true);
    } catch (e) {
      console.error(e);
      setAvviso(c.tool.failed);
    } finally {
      setBusy(null);
      setScarico(null);
    }
  }

  /** Ridisegna una tela dopo una pennellata. */
  const ridipingi = useCallback(async (l) => {
    const cv = tele.current[l.id];
    if (!cv) return;
    cv.getContext('2d').putImageData(applicaAlfa(l.src, l.alpha), 0, 0);
  }, []);

  useEffect(() => {
    for (const l of lavori) if (l.alpha) ridipingi(l);
  }, [lavori, ridipingi]);

  function pennellata(e, l) {
    if (!l.alpha) return;
    const cv = tele.current[l.id];
    const p = puntoSuImmagine(e, cv, l.src.w, l.src.h);
    // Il raggio in pixel dell'IMMAGINE, non dello schermo: su un file di
    // stampa un pennello di 24 px a schermo tocca quattro pixel veri.
    const raggio = Math.max(8, Math.round(l.src.w / 40));
    pennella(l.alpha, l.src.w, l.src.h, {
      ...p,
      raggio,
      valore: modo === 'rimetti' ? 255 : 0,
    });
    ridipingi(l);
  }

  async function scarica(l) {
    const blob = l.blob || (await aPng(applicaAlfa(l.src, l.alpha)));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${l.nome}-zack.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  const pronti = lavori.filter((l) => l.alpha);
  const passo = (id) => ricetta.includes(id);

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
        <ChePuoiFare c={c} ricetta={ricetta} />
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

      {!lavori.length && (
        <p className="rit-trascina">
          <button className="comelink" onClick={() => document.getElementById('rit-input').click()}>
            {c.tool.pick}
          </button>{' '}
          {c.tool.orDrop}
        </p>
      )}

      {/* ── l'attesa, detta in megabyte ─────────────────────────────────── */}
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
                  ? c.tool.progress
                      .replace('{fatti}', mb(scarico.fatti))
                      .replace('{totale}', mb(scarico.totale))
                  : mb(scarico.fatti)}
              </small>
            </>
          )}
        </div>
      )}

      {avviso && <p className="rit-avviso">{avviso}</p>}

      {/* ── i risultati, e un pennello solo per tutti ────────────────────── */}
      {lavori.length > 0 && (
        <>
          <div className="rit-tele">
            {lavori.map((l) => (
              <figure key={l.id} className="rit-tela" data-scelto={scelto === l.id || undefined}>
                <canvas
                  ref={(el) => {
                    if (el) {
                      tele.current[l.id] = el;
                      el.width = l.src.w;
                      el.height = l.src.h;
                      if (l.alpha) el.getContext('2d').putImageData(applicaAlfa(l.src, l.alpha), 0, 0);
                      else el.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(l.src.rgba), l.src.w, l.src.h), 0, 0);
                    }
                  }}
                  onPointerDown={(e) => {
                    if (!l.alpha) return;
                    setScelto(l.id);
                    disegna.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    pennellata(e, l);
                  }}
                  onPointerMove={(e) => disegna.current && pennellata(e, l)}
                  onPointerUp={() => {
                    disegna.current = false;
                  }}
                />
                <figcaption>
                  <span className="rit-nome">{l.nome}</span>
                  {l.via && (
                    <span className="rit-via">
                      {l.via === 'istante' ? c.tool.instant : c.tool.viaModel}
                    </span>
                  )}
                  {l.alpha && (
                    <button className="comelink" onClick={() => scarica(l)}>
                      {c.tool.download}
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>

          {pronti.length > 0 && (
            <div className="rit-pennello">
              <span>{c.tool.brush}</span>
              {['rimetti', 'togli'].map((m) => (
                <button key={m} aria-pressed={modo === m} onClick={() => setModo(m)}>
                  {c.tool[m]}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── prima notifica: fai tuo il tasto ────────────────────────────── */}
      {personalizza && (
        <div className="rit-tuo">
          <p>{c.tool.makeYours}</p>
          <div className="rit-pastiglie">
            {[
              { id: 'x4', label: '×4' },
              { id: 'x2', label: '×2' },
              { id: 'd2', label: ':2' },
              { id: 'd4', label: ':4' },
            ].map((p) => (
              <button
                key={p.id}
                className="pastiglia"
                aria-pressed={ricetta.includes(p.id)}
                onClick={() => onRicetta(p.id)}
              >
                {/* Il colore non è mai l'unico segnale: la scelta accesa prende
                    anche il numero del suo posto nella catena, che è oro E
                    informazione — dice in che ordine succederà. */}
                {ricetta.includes(p.id) && (
                  <b className="posto">{ricetta.indexOf(p.id) + 2}.</b>
                )}
                {p.label}
              </button>
            ))}
            <button
              className="pastiglia"
              aria-pressed={passo('scarica')}
              onClick={() => onRicetta('scarica')}
            >
              {passo('scarica') && <b className="posto">{ricetta.length + 1}.</b>}
              {c.tool.addDownload}
            </button>
          </div>
        </div>
      )}

      {/* ── seconda notifica: solo quando il limite lo tocca davvero ─────── */}
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
 * Il cerchietto che spiega.
 *
 * Un tasto che fa quattro cose senza dirlo è una scatola nera, e la prima
 * volta che sbaglia non lo si preme più. Dice cosa farà **e** che è tuo.
 */
function ChePuoiFare({ c, ricetta }) {
  const [aperto, setAperto] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!aperto) return undefined;
    const fuori = (e) => box.current && !box.current.contains(e.target) && setAperto(false);
    const esc = (e) => e.key === 'Escape' && setAperto(false);
    document.addEventListener('pointerdown', fuori);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fuori);
      document.removeEventListener('keydown', esc);
    };
  }, [aperto]);

  const passi = [c.tool.stepCutout, ...ricetta.map((r) => c.tool.steps[r]).filter(Boolean)];

  return (
    <span className="rit-info" ref={box}>
      <button
        className="tondo"
        aria-expanded={aperto}
        aria-label={c.tool.whatDoes}
        onClick={() => setAperto((v) => !v)}
      >
        i
      </button>
      {aperto && (
        <div className="rit-bolla">
          <strong>{c.tool.whatDoes}</strong>
          <ol>
            {passi.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          <p>{c.tool.yours}</p>
        </div>
      )}
    </span>
  );
}

/**
 * La piuma che scrive in oro, e si cancella.
 *
 * Un `<path>` solo, disegnato e cancellato in loop: **circa 2 KB**. Misurato
 * il 2026-08-27, un solo fotogramma dello stesso gesto vettorializzato da un
 * video ne pesa 232 — e il video intero 229. Un formato vettoriale non ha
 * nozione di «fotogramma precedente»: qui il disegno lo fa il browser, e
 * costa un attributo.
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
