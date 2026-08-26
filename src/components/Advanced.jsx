import { useState } from 'react';
import { t } from '../i18n/index.js';

/**
 * L'unico posto dove qualcosa può stare nascosto.
 *
 * La regola è *tutto visibile, senza scorrere*, e nascondere la piega. Si
 * tiene a tre condizioni, e vanno verificate ogni volta che qualcuno sposta
 * un comando qui dentro:
 *
 * 1. **lo strumento si porta a termine senza aprirlo mai.** Se un comando
 *    serve al lavoro normale, non è avanzato: è un comando principale messo
 *    nel posto sbagliato;
 * 2. **si apre in un clic, sul posto, senza scorrere.** La colonna deve
 *    stare in una schermata anche con gli avanzati aperti. Se non ci sta, il
 *    problema è la lista dei comandi, non il pannello;
 * 3. **resta aperto se lo lasci aperto.** Chi li usa li usa sempre, e
 *    riaprirli ogni volta è una tassa su chi conosce il programma.
 *
 * Uno solo per schermata. Due «Avanzati» sono di nuovo sei sezioni chiuse con
 * un altro nome.
 */
export default function Advanced({ id = 'rail', children }) {
  const [aperto, setAperto] = useState(() => {
    try {
      return localStorage.getItem(`jayl.avanzati.${id}`) === '1';
    } catch {
      return false;
    }
  });

  function commuta() {
    const prossimo = !aperto;
    setAperto(prossimo);
    try {
      localStorage.setItem(`jayl.avanzati.${id}`, prossimo ? '1' : '0');
    } catch {
      // Archivio negato: vale per questa sessione. Meglio che rifiutare un
      // cambiamento che l'utente ha appena chiesto.
    }
  }

  return (
    <div className="avanzati" data-open={aperto}>
      <button className="avanzati-head" aria-expanded={aperto} onClick={commuta}>
        <span className="caret" aria-hidden="true">{aperto ? '▾' : '▸'}</span>
        {t('advanced.title')}
      </button>
      {aperto && <div className="avanzati-body">{children}</div>}
    </div>
  );
}
