import { useEffect, useRef, useState } from 'react';
import { timeForBlock, blockAt } from './scrollVideo.js';

/**
 * Il video della home: uno solo, sempre visibile, che avanza a blocchi.
 *
 * **Non sono cinque video in cinque scene.** È un video unico che resta fermo
 * sullo schermo mentre le informazioni gli scorrono davanti: scorri una volta
 * e partono i primi cinque secondi, scorri ancora e il gesto continua. Le
 * uniche cose che si muovono davvero sono le parole.
 *
 * La differenza non è di effetto: con cinque video separati l'attenzione si
 * spezza a ogni scena e il personaggio riparte da capo ogni volta. Così invece
 * Zack sta facendo **una cosa sola** per tutta la pagina, e chi legge la vede
 * andare avanti.
 *
 * Il conto di quale blocco e a che punto sta in `scrollVideo.js`, dove i test
 * lo vedono senza browser: un blocco sbagliato non solleva niente, fa solo
 * vedere il gesto sbagliato accanto alla frase giusta.
 */
export default function HomeVideo({ src, poster, blocchi, sezioni }) {
  const video = useRef(null);
  const [attivo, setAttivo] = useState(0);

  useEffect(() => {
    const v = video.current;
    if (!v) return undefined;

    // Chi ha chiesto meno movimento vede il poster e basta: un video che si
    // trascina sotto le dita è esattamente ciò che quell'impostazione evita.
    const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (calmo?.matches) return undefined;

    let frame = null;

    const aggiorna = () => {
      frame = null;
      const riquadri = sezioni.current
        .filter(Boolean)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, height: r.height };
        });

      const { indice, progresso } = blockAt(riquadri, window.innerHeight);
      setAttivo(indice);

      if (!Number.isFinite(v.duration)) return;
      const target = timeForBlock(indice, progresso, v.duration, blocchi);
      // Sotto un fotogramma il salto non si vede, e cercare a ogni evento di
      // scorrimento inonda il decoder: il video scatterebbe invece di scorrere.
      if (Math.abs(v.currentTime - target) > 1 / 30) v.currentTime = target;
    };

    const programma = () => {
      if (frame == null) frame = requestAnimationFrame(aggiorna);
    };
    const risincronizza = () => {
      if (!document.hidden) programma();
    };

    window.addEventListener('scroll', programma, { passive: true });
    window.addEventListener('resize', programma);
    document.addEventListener('visibilitychange', risincronizza);
    v.addEventListener('loadedmetadata', programma);
    programma();

    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', programma);
      window.removeEventListener('resize', programma);
      document.removeEventListener('visibilitychange', risincronizza);
      v.removeEventListener('loadedmetadata', programma);
    };
  }, [blocchi, sezioni]);

  return (
    <div className="home-video" data-blocco={attivo}>
      <video
        ref={video}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      {/* Dove si è arrivati. Non è decorazione: senza, chi scorre non sa che
          il video sta seguendo lui, e crede che sia un'animazione qualunque. */}
      <div className="home-tacche" aria-hidden="true">
        {Array.from({ length: blocchi }, (_, i) => (
          <span key={i} data-on={i <= attivo || undefined} />
        ))}
      </div>
    </div>
  );
}
