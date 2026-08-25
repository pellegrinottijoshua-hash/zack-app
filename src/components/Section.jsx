import { useState } from 'react';
import { help } from '../i18n/help.js';

/**
 * Una sezione richiudibile del pannello.
 *
 * L'editor ha sei gruppi di comandi: mostrarli tutti insieme costringe a
 * scorrere per raggiungere quello che serve, e chi disegna guarda la tela, non
 * il pannello. Ogni sezione ricorda se è aperta, così l'attrezzatura di
 * ciascuno resta come l'ha lasciata.
 */
export default function Section({ id, title, badge, helpKey, children, defaultOpen = true, forceOpen = false }) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(`jayl.section.${id}`);
      return saved === null ? defaultOpen : saved === '1';
    } catch {
      return defaultOpen;
    }
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(`jayl.section.${id}`, next ? '1' : '0');
    } catch {
      /* la sessione corrente funziona lo stesso */
    }
  };

  // Quando una modalità richiede la sezione, questa si apre da sola: entrare
  // nella modifica nodi e non vedere i comandi dei nodi sarebbe assurdo.
  const shown = open || forceOpen;

  const hint = helpKey ? help(helpKey) : null;

  return (
    <section className="sect" data-open={shown}>
      <button className="sect-head" aria-expanded={shown} onClick={toggle}>
        <span className="caret" aria-hidden="true">
          {shown ? '▾' : '▸'}
        </span>
        <span className="sect-title">{title}</span>
        {badge && <b>{badge}</b>}
      </button>
      {shown && (
        <div className="sect-body">
          {hint && <p className="help">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
