import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';

/**
 * Mentre il microfono è acceso.
 *
 * Il difetto che questo componente esiste per chiudere (2026-09-09, riferito
 * dal committente): si premeva «Registra», il microfono si accendeva, e **non
 * c'era nessun modo di fermarlo**. Il tasto Ferma viveva in un pannello che si
 * disegnava solo a registrazione finita.
 *
 * Quindi qui c'è **una cosa sola da fare**, grande: fermare. Niente cerchietto
 * in un angolo — mentre registri non ci sono altre scelte, e una schermata che
 * ne offre otto sta mentendo su quale conta.
 *
 * Il contatore non è decorazione: senza, un microfono acceso e una schermata
 * ferma sono indistinguibili da un guasto — è la stessa ragione per cui il
 * tasto Zack dice a che punto è.
 */
export default function Registrazione({ onFerma, aiuto }) {
  const [secondi, setSecondi] = useState(0);
  const daQuando = useRef(Date.now());

  useEffect(() => {
    // Si conta dall'orologio e non sommando i tick: una scheda in secondo
    // piano li salta, e il contatore direbbe meno di quanto ha registrato.
    const id = setInterval(() => setSecondi(Math.floor((Date.now() - daQuando.current) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secondi / 60)).padStart(2, '0');
  const ss = String(secondi % 60).padStart(2, '0');

  return (
    <div className="registrazione" role="status" aria-live="polite">
      <div className="reg-spia" aria-hidden="true">
        <i />
      </div>
      <p className="reg-tempo">
        {mm}:{ss}
      </p>
      <p className="reg-nota">{aiuto}</p>
      <button className="btn reg-ferma" onClick={onFerma} autoFocus>
        {t('sound.stop')}
      </button>
    </div>
  );
}
