import { help } from '../i18n/help.js';

/**
 * Un gruppo di comandi dentro il pannello.
 *
 * **Non è più richiudibile, ed è una decisione.** Lo era: ogni sezione
 * ricordava se stessa, e sei sezioni chiuse facevano una colonna corta. Ma un
 * comando chiuso è un comando che non esiste — chi non sa che c'è non va a
 * cercarlo dietro un triangolino, e la colonna corta nascondeva il problema
 * vero invece di risolverlo: i comandi erano troppi.
 *
 * La regola del committente è *tutto visibile, senza scorrere*. Il modo di
 * rispettarla non è chiudere: è **togliere**. Ciò che non serve al lavoro
 * normale di uno strumento sta dietro un solo «Avanzati» (`Advanced.jsx`),
 * non dietro sei.
 *
 * L'API resta la stessa perché chi la usa non deve cambiare: `defaultOpen` e
 * `forceOpen` sono accettati e ignorati, e spariranno quando l'ultimo
 * chiamante avrà smesso di passarli.
 */
export default function Section({ id, title, badge, helpKey, children }) {
  const hint = helpKey ? help(helpKey) : null;

  return (
    <section className="sect" data-open="true" data-id={id}>
      <div className="sect-head">
        <span className="sect-title">{title}</span>
        {badge && <b>{badge}</b>}
      </div>
      <div className="sect-body">
        {hint && <p className="help">{hint}</p>}
        {children}
      </div>
    </section>
  );
}
