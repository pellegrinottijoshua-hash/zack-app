import { useCallback, useEffect, useRef, useState } from 'react';
import { COPY } from './copy.js';
import HomeVideo from './HomeVideo.jsx';
import Ritaglio from './Ritaglio.jsx';

const APP_URL = '/app/';

/**
 * I sei del cast, con la faccia che hanno nel prodotto.
 *
 * Fino al 2026-08-27 esistevano solo come canone scritto: sette file in
 * `public/zack/` ed erano tutti Zack. Tutta la tesi — «Zack è la campagna,
 * non la mascotte» — poggiava su un cast che nel prodotto non si era mai
 * visto.
 */
const CAST = ['izack', 'ipigeon', 'iseagull', 'imoth', 'icat', 'iant'];

/**
 * La ricetta del tasto Zack, **la stessa chiave dello studio**.
 *
 * Fino al 2026-08-28 erano due chiavi separate, perché le due parti parlavano
 * lingue diverse: la home per fattori (`×4`, `:2`), lo studio per passi
 * (`ingrandisci`, che vuol dire «portalo alla misura di stampa» e il fattore
 * lo decide il file). Ora lo studio conosce `ridimensiona:x4`, quindi la home
 * può scrivere direttamente ciò che lo studio sa leggere.
 *
 * È il ponte, e non costa niente: stessa origine, stessa chiave, stesso
 * `localStorage`. Personalizzi il tasto qui, entri in `/app/`, ed è già il tuo.
 */
const CHIAVE = 'jayl.zack.scontorna';

/**
 * Dalla pastiglia al passo dello studio.
 *
 * Le pastiglie restano corte sullo schermo — `×4` sta in un ovale, non
 * `ridimensiona:x4` — ma sotto si scrive la parola intera, perché è quella
 * che l'altra metà del prodotto sa leggere.
 */
const PASSO = {
  x4: 'ridimensiona:x4',
  x2: 'ridimensiona:x2',
  d2: 'ridimensiona:d2',
  d4: 'ridimensiona:d4',
  scarica: 'scarica',
};
const PASTIGLIA = Object.fromEntries(Object.entries(PASSO).map(([k, v]) => [v, k]));

/** Ridimensionare è UNA scelta, non quattro: ×4 e :4 insieme non esistono. */
const MISURE = ['x4', 'x2', 'd2', 'd4'];

/**
 * Legge la ricetta condivisa e tiene solo ciò che la home sa mostrare.
 *
 * Lo studio ha più passi di quanti la home ne offra — `scontorna`, `buchi`,
 * `esporta` — e vanno **ignorati, non cancellati**: chi ha costruito una
 * catena nello studio non deve perderla passando dalla home.
 */
function leggiRicetta() {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE) || '[]');
    if (!Array.isArray(v)) return [];
    return v.map((x) => PASTIGLIA[x]).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Le cinque clip della home, in ordine.
 *
 * Ognuna riprende dall'ultimo fotogramma della precedente: il passaggio non si
 * vede, e chi scorre vede Zack fare una cosa sola per tutta la pagina. Se ne
 * mancano, i blocchi rimasti restano sull'ultima girata invece di mostrare un
 * riquadro vuoto — quindi si possono aggiungere una alla volta, man mano che
 * si generano, senza toccare il resto.
 */
const CLIP = [
  {
    // Due sorgenti perché lo sfondo è tolto: VP9 con alfa non lo legge
    // Safari, HEVC con alfa non lo legge Firefox. Chi non legge nessuno dei
    // due resta sul .mp4 col fondo panna, che sul panna della pagina è
    // comunque invisibile.
    fonti: [
      { src: '/hero/zack-1a.mov', type: 'video/quicktime' },
      { src: '/hero/zack-1a.webm', type: 'video/webm' },
      { src: '/hero/zack-1.mp4', type: 'video/mp4' },
    ],
    poster: '/hero/zack-1.webp',
  },
];

/**
 * I blocchi del racconto, in ordine.
 *
 * Uno per ogni pezzo del video: il primo blocco vede i primi secondi, il
 * secondo i successivi, e così via. Aggiungerne uno senza allungare il video
 * non rompe niente — i blocchi si dividono la durata che c'è — ma il gesto
 * non corrisponderà più alla frase, che è il motivo per cui questa lista sta
 * qui in vista e non sparsa nel JSX.
 */
const BLOCCHI = [
  {
    id: 'problema',
    render: (c) => (
      <>
        <p className="kicker">{c.problem.kicker}</p>
        <h2>{c.problem.title}</h2>
        <p>{c.problem.body}</p>
      </>
    ),
  },
  {
    id: 'strumenti',
    render: (c) => (
      <>
        <p className="kicker">{c.tools.kicker}</p>
        <h2>{c.tools.title}</h2>
        <p>{c.tools.body}</p>
        <ul className="lp-list">
          {c.tools.items.map((it) => (
            <li key={it.name}>
              <b>{it.name}</b>
              <span>{it.note}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'libreria',
    render: (c) => (
      <>
        <p className="kicker">{c.library.kicker}</p>
        <h2>{c.library.title}</h2>
        <p>{c.library.body}</p>
        <p className="lp-quote">{c.library.quote}</p>
      </>
    ),
  },
  {
    id: 'generazione',
    render: (c) => (
      <>
        <p className="kicker">{c.generate.kicker}</p>
        <h2>{c.generate.title}</h2>
        <p>{c.generate.body}</p>
        <p className="lp-receipt">{c.generate.example}</p>
        <p className="lp-note">{c.generate.note}</p>
      </>
    ),
  },
  {
    id: 'privacy',
    render: (c) => (
      <>
        <p className="kicker">{c.privacy.kicker}</p>
        <h2>{c.privacy.title}</h2>
        <p>{c.privacy.body}</p>
      </>
    ),
  },
];

/**
 * La pagina che deve convincere.
 *
 * Il video sta a schermo intero e non si muove mai; scorrono solo le parole,
 * sulla metà sinistra, perché Zack vive sulla destra dell'inquadratura. Le
 * clip sono cinque e si susseguono: ognuna riprende dall'ultimo fotogramma
 * della precedente, quindi il passaggio non si vede.
 *
 * Regole JAYL rispettate: niente televendita, niente giustificazioni, mostrare
 * invece di dichiarare. E il payoff chiude, in corsivo.
 */
export default function Landing() {
  const [lang, setLang] = useState('it');
  const [ricetta, setRicetta] = useState([]);
  const sezioni = useRef([]);
  const c = COPY[lang];

  useEffect(() => {
    const nav = (navigator.languages || []).map((l) => l.slice(0, 2));
    setLang(nav.includes('it') ? 'it' : 'en');
    setRicetta(leggiRicetta());
  }, []);

  /**
   * Accende o spegne un passo della catena.
   *
   * Le quattro misure sono **radio, non caselle**: accenderne una spegne le
   * altre. Se fossero indipendenti si potrebbe chiedere ×4 e :4 insieme e
   * aspettare trenta secondi per tornare esattamente da dove si è partiti —
   * un errore che si rende impossibile invece di segnalarlo.
   */
  const commuta = useCallback((id) => {
    setRicetta((prima) => {
      let dopo;
      if (prima.includes(id)) dopo = prima.filter((x) => x !== id);
      else if (MISURE.includes(id)) dopo = [...prima.filter((x) => !MISURE.includes(x)), id];
      else dopo = [...prima, id];
      // `scarica` chiude sempre la catena: scaricare a metà lavoro consegna un
      // file che non è quello che l'utente ha chiesto.
      dopo = [...dopo.filter((x) => x !== 'scarica'), ...(dopo.includes('scarica') ? ['scarica'] : [])];
      try {
        /*
         * Si SCRIVE dentro la catena dello studio, non sopra.
         *
         * La home mostra due cose — la misura e lo scaricamento — ma la catena
         * ne contiene altre: `scontorna`, `buchi`, `esporta`. Scrivere solo le
         * proprie le cancellerebbe, e chi ha costruito una catena nello studio
         * la perderebbe passando di qui a togliere una pastiglia.
         */
        const esistente = JSON.parse(localStorage.getItem(CHIAVE) || '[]');
        const altrui = (Array.isArray(esistente) ? esistente : []).filter((x) => !PASTIGLIA[x]);
        const miei = dopo.map((x) => PASSO[x]).filter(Boolean);
        // `scarica` in fondo comunque: è l'unico passo il cui posto nella
        // catena non è negoziabile.
        const unite = [...altrui.filter((x) => x !== 'scarica'), ...miei];
        localStorage.setItem(CHIAVE, JSON.stringify(unite));
      } catch {
        /* archivio pieno o negato: la scelta vale per questa visita */
      }
      return dopo;
    });
  }, []);

  return (
    <div className="landing">
      <header className="lp-nav">
        {/* Il prodotto si chiama Zack App dal 2026-08-27. Qui c'era ancora
            «JAYL STUDIO»: JAYL non sparisce, cambia mestiere — resta il
            marchio di chi lo fa, e sta in fondo, firmato. */}
        <span className="wordmark">
          ZACK <em>app</em>
        </span>
        <span className="spacer" />
        <div className="langswitch">
          {['it', 'en'].map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <a className="lp-cta small" href={APP_URL}>
          {c.nav.app}
        </a>
      </header>

      {/* ─── il primo schermo: lo strumento, non il racconto ──────────────
          Quasi vuoto, e non per gusto: il tasto è grosso perché intorno non
          c'è nient'altro. Chi arriva trascina un file prima di aver letto una
          riga; il racconto sta sotto, per chi ha già capito. */}
      <section className="lp-primo">
        <Ritaglio c={c} ricetta={ricetta} onRicetta={commuta} />

        <p className="lp-piu">
          <a href={APP_URL}>{c.piu}</a>
        </p>
      </section>

      {/* ─── l'insegna: dove il panna finisce e comincia il racconto ─────
          Il fondo scuro dell'immagine È il disegno, quindi non si scontorna e
          non si mette sul panna: fa da soglia fra i due mondi della pagina. */}
      <img
        className="lp-insegna"
        src="/zack/hero.webp"
        srcSet="/zack/hero-800.webp 800w, /zack/hero.webp 1600w"
        sizes="100vw"
        alt="Zack the Duck"
        width="1600"
        height="1195"
        loading="lazy"
      />

      {/* ─── apertura ────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <p className="kicker">{c.hero.kicker}</p>
        <h1>
          {c.hero.title.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </h1>
        <p className="lead">{c.hero.note}</p>
        <div className="lp-actions">
          <a className="lp-cta" href={APP_URL}>
            {c.hero.cta}
          </a>
          <span className="lp-price">{c.nav.price}</span>
        </div>
      </section>

      {/* ─── il racconto: il video sta fermo, le informazioni scorrono ──
          Zack fa una cosa sola per tutta la pagina; le uniche cose che si
          muovono davvero sono le parole. */}
      <div className="home-racconto">
        <HomeVideo clip={CLIP} sezioni={sezioni} />

        <div className="home-testi" data-alterna>
          {BLOCCHI.map((b, i) => (
            <section
              key={b.id}
              className="home-blocco"
              id={b.id}
              /* Si alterna: il vuoto dell'inquadratura c'è da tutte e due le
                 parti, e tenere tutto a sinistra farebbe sembrare i testi una
                 barra laterale invece che scritte dentro la scena. */
              data-lato={i % 2 ? 'destra' : 'sinistra'}
              ref={(el) => {
                sezioni.current[i] = el;
              }}
            >
              {b.render(c)}
            </section>
          ))}
        </div>
      </div>

      {/* ─── il confronto ────────────────────────────────────────────── */}
      <section className="lp-compare">
        <p className="kicker">{c.compare.kicker}</p>
        <h2>{c.compare.title}</h2>
        <div className="lp-rows">
          {c.compare.rows.map((r, i) => (
            <div key={r.name} className="lp-row" data-us={i === c.compare.rows.length - 1}>
              <b>{r.name}</b>
              <span className="lp-row-price">{r.price}</span>
              <span className="lp-row-note">{r.note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Brain: la cosa che nessuno può copiare ───────────────────── */}
      <section className="lp-brain">
        <img src="/zack/ebrain.webp" alt="" aria-hidden="true" width="800" height="800" loading="lazy" />
        <div>
          <p className="kicker">{c.brain.kicker}</p>
          <h2>{c.brain.title}</h2>
          <p>{c.brain.body}</p>
          <p className="lp-quote">{c.brain.pitch}</p>
          <p className="lp-note">{c.brain.note}</p>
        </div>
      </section>

      {/* ─── il cast ─────────────────────────────────────────────────── */}
      <section className="lp-cast">
        <p className="kicker">{c.cast.kicker}</p>
        <h2>{c.cast.title}</h2>
        <p>{c.cast.body}</p>
        <ul className="lp-facce">
          {CAST.map((n) => (
            <li key={n}>
              <img
                src={`/zack/cast/${n}-96.webp`}
                srcSet={`/zack/cast/${n}-96.webp 96w, /zack/cast/${n}.webp 512w`}
                sizes="88px"
                alt=""
                aria-hidden="true"
                width="96"
                height="96"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ─── chiusura ────────────────────────────────────────────────── */}
      <section className="lp-final">
        <span className="rule" />
        <h2>{c.final.title}</h2>
        <p>{c.final.body}</p>
        <a className="lp-cta" href={APP_URL}>
          {c.final.cta}
        </a>
        {/* La firma di chi lo fa. JAYL non è il nome del prodotto: è il
            marchio dello studio, e un marchio sta in fondo, piccolo. */}
        <p className="lp-firma">
          <img src="/jayl-mark.svg" alt="JAYL" width="28" height="28" loading="lazy" />
          <span>{c.firma.studio}</span>
        </p>
        <p className="payoff">{c.final.payoff}</p>
      </section>
    </div>
  );
}
