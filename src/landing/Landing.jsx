import { useEffect, useState } from 'react';
import Scene from './Scene.jsx';
import { COPY } from './copy.js';

const APP_URL = '/app/';

/**
 * La pagina che deve convincere.
 *
 * Struttura a scene: ognuna è alta più di uno schermo e tiene fermo un livello
 * mentre si scorre. Il posto per il video AI è già dentro `Scene` — quando i
 * video ci saranno, si passano come attributo e la pagina non cambia.
 *
 * Regole JAYL rispettate: niente televendita, niente giustificazioni, mostrare
 * invece di dichiarare. E il payoff chiude, in corsivo.
 */
export default function Landing() {
  const [lang, setLang] = useState('it');
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

      {/* ─── il problema ─────────────────────────────────────────────── */}
      {/* Il primo video della home. Non si riproduce da sé: lo scorrimento
          ne muove la testina, quindi il gesto di Zack — stacca la piuma,
          disegna, il marchio si solidifica — avanza mentre leggi. Il poster
          regge da solo finché il video non è arrivato. */}
      <Scene
        id="problema"
        depth={2.2}
        align="left"
        video="/hero/zack-marchio.mp4"
        poster="/hero/zack-marchio.webp"
      >
        <p className="kicker">{c.problem.kicker}</p>
        <h2>{c.problem.title}</h2>
        <p>{c.problem.body}</p>
      </Scene>

      {/* ─── gli strumenti inclusi ───────────────────────────────────── */}
      <Scene id="strumenti" depth={2.6} align="left">
        <p className="kicker">{c.tools.kicker}</p>
        <h2>{c.tools.title}</h2>
        <p>{c.tools.body}</p>
        <ul className="lp-list">
          {c.tools.items.map((it) => (
            <li key={it.name}>
              <b>{it.name}</b>
              <span>{it.desc}</span>
            </li>
          ))}
        </ul>
      </Scene>

      {/* ─── la differenza vera ──────────────────────────────────────── */}
      <Scene id="libreria" depth={2.4} align="left">
        <p className="kicker">{c.library.kicker}</p>
        <h2>{c.library.title}</h2>
        <p>{c.library.body}</p>
        <p className="lp-quote">{c.library.quote}</p>
      </Scene>

      {/* ─── la generazione ──────────────────────────────────────────── */}
      <Scene id="generazione" depth={2.2} align="left">
        <p className="kicker">{c.generate.kicker}</p>
        <h2>{c.generate.title}</h2>
        <p>{c.generate.body}</p>
        <p className="lp-receipt">{c.generate.example}</p>
        <p className="lp-note">{c.generate.note}</p>
      </Scene>

      {/* ─── privacy ─────────────────────────────────────────────────── */}
      <Scene id="privacy" depth={2} align="left">
        <p className="kicker">{c.privacy.kicker}</p>
        <h2>{c.privacy.title}</h2>
        <p>{c.privacy.body}</p>
      </Scene>

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
