import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * L'altezza che decide il layout si misura in `dvh`, non in `vh`.
 *
 * Il difetto (2026-09-04, riferito dal committente: «non si vede piu' ne' il
 * tasto zack ne' la mascot»):
 *
 * - `.shell` e' `height: 100%` E `overflow: hidden` — non scorre niente;
 * - `.sc` era `min-height: min(74vh, 640px)`;
 * - su un telefono `vh` e' il viewport GRANDE, quello senza la barra del
 *   browser. Con la barra visibile, `.sc` diventa piu' alto dello schermo
 *   vero;
 * - mascotte e tasto Zack sono `position: absolute; bottom:` dentro `.sc`,
 *   quindi ancorati a un fondo che finisce fuori dallo schermo — e con
 *   `overflow: hidden` quel fondo si taglia e non c'e' modo di raggiungerlo.
 *
 * Perche' nessuno se n'era accorto: in un browser da scrivania, e nel
 * riquadro d'anteprima, NON C'E' la barra del browser, quindi `vh` e
 * l'altezza vera coincidono e il difetto e' invisibile. Si vede solo su un
 * telefono vero. Da qui un test che guarda la REGOLA invece del risultato.
 *
 * La riga in `vh` resta come ricaduta per i browser che non conoscono `dvh`:
 * la seconda dichiarazione vince dove `dvh` esiste, e viene ignorata dove no.
 */
const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

/** Le dichiarazioni di un selettore esatto, dovunque compaia. */
function dichiarazioni(selettore) {
  const esatto = selettore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...CSS.matchAll(new RegExp(`(?:^|\\n)\\s*${esatto}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
}

test('il piano di lavoro dichiara la sua altezza minima in dvh', () => {
  // Solo i blocchi che misurano DAVVERO col viewport: `.sc { min-height: 0 }`
  // e' un azzeramento e non ha niente da seguire.
  const conViewport = dichiarazioni('.sc').filter((b) => /min-height:[^;]*vh/.test(b));
  assert.ok(conViewport.length > 0, '.sc non dichiara piu’ una min-height legata al viewport');
  for (const b of conViewport) {
    assert.match(
      b,
      /min-height:\s*[^;]*dvh/,
      '.sc misura la sua altezza minima in vh: su un telefono con la barra del ' +
        'browser il suo fondo — dove stanno mascotte e tasto Zack — finisce ' +
        'fuori dallo schermo, e `.shell` e’ overflow:hidden quindi non si puo’ scorrere',
    );
  }
});

test('la mascotte e il tasto restano dentro lo schermo vero', () => {
  // Sono i due che il committente non vedeva. Le loro misure seguono il
  // viewport, quindi devono seguire quello VERO.
  for (const sel of ['.sc-zack']) {
    const conAltezza = dichiarazioni(sel).filter((b) => /height:\s*clamp/.test(b));
    assert.ok(conAltezza.length > 0, `${sel} non dichiara piu’ un'altezza`);
    assert.ok(
      conAltezza.some((b) => /dvh/.test(b)),
      `${sel} misura in vh: cresce oltre lo schermo vero su un telefono`,
    );
  }
});

test('nessuna regola misura un’altezza SOLO in vh', () => {
  /*
   * `vh` da solo va bene per una decorazione, non per qualcosa che decide
   * dove finisce il fondo della pagina. La regola qui e': se una
   * dichiarazione di altezza usa `vh`, da qualche parte nello stesso blocco
   * deve esserci la sua gemella in `dvh`.
   */
  const blocchi = [...CSS.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]);
  const colpevoli = blocchi.filter(
    (b) => /(?:^|\s)(?:min-|max-)?height:[^;]*\bvh\b/.test(b) && !/dvh/.test(b),
  );
  assert.deepEqual(
    colpevoli.map((b) => b.trim().split('\n').find((r) => /vh/.test(r))?.trim()),
    [],
    'queste altezze seguono il viewport grande invece di quello vero',
  );
});

/*
 * La schermata non conta i propri figli.
 *
 * Il 2026-09-09 `.shell` era `grid-template-rows: auto 1fr auto`, e il numero
 * di figli faceva parte del layout. La riga della prova e' entrata come
 * secondo figlio, si e' presa l'`1fr` — 295px per una frase — e ha schiacciato
 * `.main` a 353. Due giorni prima lo stesso inciampo aveva portato `.brain` ad
 * altezza ZERO: gli oggetti c'erano, la tela non si vedeva.
 *
 * E' il difetto che non si vede scrivendo: il CSS non cambia, cambia il JSX.
 * In colonna flex un figlio in piu' e' alto quanto il suo contenuto, e chi
 * deve crescere lo dichiara da se'.
 */
test('la schermata sta in colonna flex, non a righe contate', () => {
  for (const blocco of dichiarazioni('.shell')) {
    assert.doesNotMatch(
      blocco,
      /grid-template-rows/,
      '.shell conta le proprie righe: il prossimo figlio si prende l’1fr',
    );
  }
  const flex = dichiarazioni('.shell').some((b) => /flex-direction:\s*column/.test(b));
  assert.ok(flex, '.shell non e’ piu’ una colonna flex');
  assert.ok(
    dichiarazioni('.main').some((b) => /flex:\s*1/.test(b)),
    '.main non dice piu’ di volersi prendere lo spazio che avanza',
  );
});
