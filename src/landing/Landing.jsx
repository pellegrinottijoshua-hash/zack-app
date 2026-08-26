import { useEffect, useRef, useState } from 'react';
import { COPY } from './copy.js';
import HomeVideo from './HomeVideo.jsx';

const APP_URL = '/app/';

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
  { src: '/hero/zack-1.mp4', poster: '/hero/zack-1.webp' },
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
    figura: '/zack/sfere.webp',
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
    figura: '/zack/vettoriale.webp',
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
    figura: '/zack/libreria.webp',
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
    figura: '/zack/cornice.webp',
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
    figura: '/zack/piuma.webp',
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
  const sezioni = useRef([]);
  const c = COPY[lang];

  useEffect(() => {
    const nav = (navigator.languages || []).map((l) => l.slice(0, 2));
    setLang(nav.includes('it') ? 'it' : 'en');
  }, []);

  return (
    <div className="landing">
      <header className="lp-nav">
        <span className="wordmark">
          JAYL <em>STUDIO</em>
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

      {/* ─── apertura ────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <p className="kicker">{c.hero.kicker}</p>
        <h1>
          {c.hero.title.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </h1>
        <p className="lead">{c.hero.body}</p>
        <div className="lp-actions">
          <a className="lp-cta" href={APP_URL}>
            {c.hero.cta}
          </a>
          <span className="lp-price">{c.nav.price}</span>
        </div>
        <p className="lp-note">{c.hero.note}</p>
      </section>

      {/* ─── il racconto: il video sta fermo, le informazioni scorrono ──
          Zack fa una cosa sola per tutta la pagina; le uniche cose che si
          muovono davvero sono le parole. */}
      <div className="home-racconto">
        <HomeVideo clip={CLIP} sezioni={sezioni} />

        <div className="home-testi">
          {BLOCCHI.map((b, i) => (
            <section
              key={b.id}
              className="home-blocco"
              id={b.id}
              ref={(el) => {
                sezioni.current[i] = el;
              }}
            >
              {b.render(c)}
              {/* L'illustrazione accompagna il testo e non lo sostituisce:
                  è ferma, mentre il video accanto è la cosa che si muove.
                  Due animazioni sullo stesso schermo si tolgono attenzione. */}
              {b.figura && <img className="home-figura" src={b.figura} alt="" loading="lazy" />}
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

      {/* ─── chiusura ────────────────────────────────────────────────── */}
      <section className="lp-final">
        <span className="rule" />
        <h2>{c.final.title}</h2>
        <p>{c.final.body}</p>
        <a className="lp-cta" href={APP_URL}>
          {c.final.cta}
        </a>
        <p className="payoff">{c.final.payoff}</p>
      </section>
    </div>
  );
}
