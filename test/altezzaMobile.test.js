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
 * `.shell` riserva spazio per la barra fissa in fondo con un numero scritto
 * a mano — e i pezzi VERI della barra (il suo padding-top, il padding-bottom
 * per il «presto» su due righe, l'altezza del cerchio piu' alto) sono
 * dichiarati 3100 righe piu' in basso, in un media block diverso. Il giro di
 * correzione 1 (Important 5) ha trovato esattamente questo scollegamento:
 * la barra e' cresciuta (30 -> 42px di padding-bottom, Task 8) e il numero
 * qui non l'ha seguita, finche' non l'ha corretto a mano un umano che ha
 * misurato nel browser — la stessa distrazione che puo' ripetersi al
 * prossimo cambiamento di uno qualunque dei tre pezzi. Questa prova lega i
 * numeri: computa quanto usa DAVVERO la barra sommando i tre valori dal
 * sorgente, e pretende che `.shell` ne riservi almeno tanto.
 */
test('.shell riserva almeno quanto la barra usa DAVVERO, non un numero a mano', () => {
  // Il padding-top e il padding-bottom della barra fissa sul telefono, dallo
  // stesso `padding: Npx Npx calc(Mpx + env(...))` che disegna «§ 8. I
  // servizi in basso sono CERCHI».
  const paddingBarra = CSS.match(
    /padding:\s*(\d+)px\s+\d+px\s+calc\((\d+)px \+ env\(safe-area-inset-bottom/,
  );
  assert.ok(paddingBarra, 'non trovo più il padding di `.toolrail` sul telefono (§ 8 di styles.css)');
  const paddingTop = Number(paddingBarra[1]);
  const paddingBottom = Number(paddingBarra[2]);

  // Il cerchio piu' alto della barra: lo scontorno, sempre piu' grande degli
  // altri (e' il centro del prodotto).
  const cerchio = CSS.match(
    /\.toolrail \.tool-item\[data-servizio='scontorna'\]\s*\{[^}]*height:\s*(\d+)px/,
  );
  assert.ok(cerchio, 'non trovo più l’altezza del cerchio di Scontorna');
  const altezzaCerchio = Number(cerchio[1]);

  // Quanto riserva `.shell` per la barra fissa, sul telefono.
  const riserva = dichiarazioni('.shell')
    .map((b) => b.match(/padding-bottom:\s*calc\((\d+)px/))
    .find(Boolean);
  assert.ok(riserva, '.shell non riserva più uno spazio in calc() per la barra fissa');
  const riservato = Number(riserva[1]);

  const usatoDavvero = paddingTop + altezzaCerchio + paddingBottom;
  assert.ok(
    riservato >= usatoDavvero,
    `.shell riserva ${riservato}px ma la barra ne usa davvero ${usatoDavvero}px ` +
      `(${paddingTop} di padding-top + ${altezzaCerchio} del cerchio + ${paddingBottom} di padding-bottom): ` +
      'la libreria torna sotto la barra fissa, come nel difetto già corretto una volta.',
  );
});

/*
 * Il nome di Brain (Important 4, giro di correzione 1): il suo cerchio e'
 * uscito da FILA con Task 8 e ha perso il `.tool-name` sempre visibile che
 * ogni cerchio della barra tiene sul telefono — la stessa mancanza che
 * questo file stesso, qualche riga piu' sopra nel CSS vero, cita come
 * l'esempio ammonitorio di Brain: «nessun modo di sapere quale fosse Brain
 * e quale Suono». Il JSX puo' avere lo `<span className="brain-nome">`
 * (provato da sorgente in `home.test.js`) e restare comunque invisibile se
 * il CSS lo tiene `display: none` per sempre: questa prova chiede che, da
 * qualche parte, torni `display: block`.
 */
test('il nome di Brain torna visibile sul telefono, non resta nascosto per sempre', () => {
  const blocchi = dichiarazioni('.brain-nome');
  assert.ok(blocchi.length > 0, '.brain-nome non è più dichiarato in styles.css');
  assert.ok(
    blocchi.some((b) => /display:\s*block/.test(b)),
    '.brain-nome resta `display: none` anche sul telefono: Brain torna senza nome, la stessa mancanza già segnalata',
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
