import { useState } from 'react';
import { help } from '../i18n/help.js';

/**
 * Un gruppo di comandi dentro il pannello, richiudibile.
 *
 * **Questa decisione è stata ribaltata due volte, e vale la pena scrivere
 * perché.** All'inizio le sezioni erano richiudibili; le ho rese fisse perché
 * un comando chiuso è un comando che non esiste, e sei sezioni chiuse
 * nascondevano il problema vero — i comandi erano troppi — invece di
 * risolverlo. Il committente le ha richieste richiudibili, con una ragione
 * diversa e migliore della mia: *«in modo da dare spazio al canva»*. Non si
 * chiudono per far stare la lista, si chiudono per **guardare il lavoro**.
 *
 * Le due cose convivono a queste condizioni, che sono ciò che mancava prima:
 *
 * 1. **aperte di default**, sempre. Un comando si nasconde solo se sei tu a
 *    nasconderlo;
 * 2. **ricordano come le hai lasciate**, per servizio;
 * 3. e la lista resta corta lo stesso: ciò che non serve al lavoro normale sta
 *    in `Advanced.jsx`, non dentro una sezione chiusa.
 */
export default function Section({ id, title, badge, helpKey, children, defaultOpen = true, forceOpen = false }) {
  const [aperta, setAperta] = useState(() => {
    try {
      const salvata = localStorage.getItem(`jayl.section.${id}`);
      return salvata === null ? defaultOpen : salvata === '1';
    } catch {
      return defaultOpen;
    }
  });

  function commuta() {
    const prossima = !aperta;
    setAperta(prossima);
    try {
      localStorage.setItem(`jayl.section.${id}`, prossima ? '1' : '0');
    } catch {
      // Archivio negato: vale per questa sessione.
    }
  }

  // Quando una modalità richiede la sezione, si apre da sola: entrare nella
  // modifica nodi e non vedere i comandi dei nodi sarebbe assurdo.
  const mostra = aperta || forceOpen;
  const hint = helpKey ? help(helpKey) : null;

  return (
    <section className="sect" data-open={mostra} data-id={id}>
      <button className="sect-head" aria-expanded={mostra} onClick={commuta}>
        <span className="caret" aria-hidden="true">{mostra ? '▾' : '▸'}</span>
        <span className="sect-title">{title}</span>
        {badge && <b>{badge}</b>}
      </button>
      {mostra && (
        <div className="sect-body">
          {hint && <p className="help">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
