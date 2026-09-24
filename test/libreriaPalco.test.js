import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * La libreria aperta e il palco: nessuno dei due dipinge sull'altro, e
 * quando lo spazio non basta cede il corpo della libreria.
 *
 * Bloccante 2 della revisione finale della fase 1 (2026-09-23). Sul telefono
 * (390×844) la libreria, aperta una volta, non si chiudeva più: `.main` è
 * `flex: 1; min-height: 0` e con la libreria a 52vh si prendeva 138px, il
 * palco teneva i suoi 220 e SBORDAVA di 82px sopra la testata della
 * libreria. Tasto Zack e mascotte coprivano «Riduci» e «Scarica tutto»
 * (premere «Scarica tutto» premeva ZACK), e `jayl.libOpen` riapriva la
 * trappola a ogni visita. A 1280×800 lo stesso difetto, più leggero: il
 * palco scendeva a 148px, la tela a zero, e il `+` saliva sotto la fila dei
 * servizi.
 *
 * ⚠️ DICHIARATA stretta. Questa è una prova di SORGENTE: legge
 * `src/styles.css` come testo e controlla che le dichiarazioni che chiudono
 * il difetto ci siano, nel blocco giusto. NON prova che niente si
 * sovrapponga — quello dipende dalla geometria vera, e lo prova il browser
 * (`elementFromPoint` al centro di ogni comando, a 390/800/1280, libreria
 * aperta e chiusa, in ogni servizio: vedi il rapporto
 * `.superpowers/sdd/2026-09-15-la-pelle/final-fix-report.md`). Qui si
 * impedisce soltanto che una di queste righe sparisca in silenzio.
 * Niente DOM, niente jsdom: scelta del progetto.
 */
const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

/**
 * Le regole foglia del foglio, ognuna col suo contesto `@media` (o `''`).
 * Un parser di parentesi graffe e basta: toglie i commenti, poi cammina.
 */
function regole() {
  const testo = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const fuori = [];
  const pila = [];
  let inizio = 0;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (c === '{') {
      pila.push(testo.slice(inizio, i).trim());
      inizio = i + 1;
    } else if (c === '}') {
      const testa = pila.pop();
      if (testa !== undefined && !testa.startsWith('@')) {
        fuori.push({ media: pila.filter((p) => p.startsWith('@media')).join(' '), selettore: testa, corpo: testo.slice(inizio, i) });
      }
      inizio = i + 1;
    }
  }
  return fuori;
}
const TUTTE = regole();

/** Il valore dell'ULTIMA dichiarazione `prop` fra le regole date (vince chi viene dopo). */
function valore(lista, prop) {
  let v;
  for (const r of lista) {
    for (const m of r.corpo.matchAll(new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([^;]+)`, 'g'))) v = m[1].trim();
  }
  return v;
}
const di = (selettore, media = '') => TUTTE.filter((r) => r.selettore === selettore && r.media === media);
const TELEFONO = '@media (max-width: 760px)';
const DESKTOP = '@media (min-width: 761px)';

/*
 * Giro finale (2026-09-24), ruling del controllore: quando lo spazio in
 * verticale finisce, cede il CORPO della libreria — mai la TESTATA (l'unica
 * uscita) e mai la COLONNA degli strumenti (l'unica strada per annulla,
 * rifai, scarica). Il primo giro (`d0016eb`) faceva cedere la libreria
 * intera fino a zero (testata fuori schermo a 844×390) e accorciava la
 * colonna con uno scorrimento senza barra («Rifai» a 0px a 1280×800).
 */
test('la testata della libreria è figlia della pagina e resta incollata in fondo', () => {
  assert.equal(valore(di('.library'), 'display'), 'contents', 'dentro una scatola comune la testata cede con lei');
  const testa = di('.library-head');
  assert.equal(valore(testa, 'position'), 'sticky');
  assert.equal(valore(testa, 'bottom'), '0');
  assert.equal(valore(testa, 'flex'), 'none', 'la testata non si stringe mai');
  const z = Number(valore(testa, 'z-index'));
  assert.ok(z > 0, 'la testata deve stare sopra il palco');
  const barra = Number(valore(di('.toolrail', TELEFONO), 'z-index'));
  assert.ok(barra > z, `la barra fissa dei servizi (z ${barra}) deve restare sopra la testata (z ${z})`);
  // Sul telefono NIENTE `bottom` in più: il `padding-bottom` di `.shell`
  // tiene già la testata sopra la barra fissa (con 128px in più si fermava
  // sopra il punto oro — misurato).
  assert.equal(valore(di('.library-head', TELEFONO), 'bottom'), undefined);
  assert.equal(valore(di('.shell'), 'overflow-y'), 'auto', 'se lo schermo è più basso della somma, la pagina scorre');
});

test('cede il corpo della libreria, fino a un minimo; la striscia scorre dentro il corpo', () => {
  assert.equal(valore(di('.library-body'), 'display'), 'none', 'chiusa, il corpo non c’è');
  const aperto = di(".library[data-open='true'] .library-body");
  assert.equal(valore(aperto, 'display'), 'flex');
  assert.match(valore(aperto, 'flex') ?? '', /^0 1 /, 'il corpo deve poter cedere (flex-shrink 1)');
  assert.match(valore(aperto, 'min-height') ?? '', /min\(/, 'il corpo cede fino a un minimo, non a zero');
  for (const [sel, media] of [[".library[data-open='true'] .library-body", TELEFONO], [".library[data-open='true'][data-size='grande'] .library-body", '']]) {
    assert.ok(valore(di(sel, media), 'flex-basis'), `${sel} ${media}: manca la misura che il corpo vuole`);
    assert.match(valore(di(sel, media), 'min-height') ?? '', /min\(/, `${sel} ${media}: manca il minimo`);
  }
  assert.equal(valore(di('.library-body'), 'flex-direction'), 'column');
  const strip = di('.strip');
  assert.notEqual(valore(strip, 'height'), '100%', "`.strip { height: 100% }` spinge l'ultima fila sotto il taglio del corpo");
  assert.equal(valore(strip, 'min-height'), '0');
  assert.match(valore(strip, 'flex') ?? '', /^1\b/, '.strip deve prendersi il resto del corpo (flex: 1)');
});

test('il palco non cede mai, e chiede quanto la sua colonna più lunga', () => {
  assert.equal(valore(di('.main'), 'flex'), '1 0 auto', '.main deve partire dal suo contenuto e non stringersi');
  for (const media of ['', TELEFONO]) {
    const min = valore(di('.sc', media), 'min-height') ?? '';
    assert.match(min, /var\(--colonna-destra/, `.sc ${media}: il minimo deve contare i cerchi a destra`);
    assert.match(min, /var\(--colonna-sinistra/, `.sc ${media}: il minimo deve contare i cerchi a sinistra`);
  }
  // Sul telefono la colonna destra deve finire sopra il tasto Zack (e il
  // suo punto oro): il minimo ne conta la misura.
  assert.match(valore(di('.sc', TELEFONO), 'min-height') ?? '', /clamp\(220px, 38vw, 340px\)/);
  // Sul desktop la tela si ferma sopra il tasto.
  assert.match(valore(di('.sc-tela', DESKTOP), 'margin-bottom') ?? '', /clamp\(200px, 20vw, 260px\)/);
  // Chi scrive i due numeri: Piano, dagli strumenti visibili.
  const PIANO = readFileSync(new URL('../src/components/Piano.jsx', import.meta.url), 'utf8');
  assert.match(PIANO, /cerchiPerLato\(strumenti\)/);
  assert.match(PIANO, /'--colonna-sinistra':\s*cerchi\.sinistra/);
  assert.match(PIANO, /'--colonna-destra':\s*cerchi\.destra/);
});

test('ciò che non entra nella tela scorre dentro la tela', () => {
  const tela = di('.sc-tela');
  assert.equal(valore(tela, 'overflow'), 'auto', 'la tela visibile lascia uscire il + sotto la fila dei servizi');
  assert.equal(valore(tela, 'align-items'), 'safe center');
  assert.equal(valore(tela, 'justify-content'), 'safe center');
});

test("con due colonne l'angolo sta nell'angolo, e sul telefono sotto Brain", () => {
  const sel = ".sc[data-fianchi='due'] .sc-angolo[data-posto='sinistra']";
  const d = di(sel);
  assert.equal(valore(d, 'top'), '0');
  assert.equal(valore(d, 'transform'), 'none');
  const t = di(sel, TELEFONO);
  const angolo = parseInt(valore(t, 'top'), 10);
  const colonna = parseInt(valore(di(".sc[data-fianchi='due'] .sc-strumenti[data-lato='sinistra']", TELEFONO), 'top'), 10);
  // Due cerchi da 46 con 8 di spazio: 100px d'angolo, poi la colonna.
  assert.ok(angolo >= 60, `sul telefono l'angolo (top ${angolo}) finisce sotto il tasto Brain`);
  assert.ok(colonna >= angolo + 100, `la colonna sinistra (top ${colonna}) deve partire sotto l'angolo (${angolo} + 100)`);
});

test('la colonna degli strumenti non si accorcia e non scorre', () => {
  for (const [sel, media] of [['.sc-strumenti', ''], [".sc-strumenti[data-lato='sinistra']", ''], [".sc[data-fianchi='due'] .sc-strumenti[data-lato='sinistra']", TELEFONO], [".sc .sc-strumenti[data-lato='destra']", TELEFONO]]) {
    const r = di(sel, media);
    assert.equal(valore(r, 'max-height'), undefined, `${sel} ${media}: una colonna accorciata nasconde «Rifai»`);
    assert.equal(valore(r, 'overflow-y'), undefined, `${sel} ${media}: niente colonna che scorre`);
    assert.equal(valore(r, 'scrollbar-width'), undefined, `${sel} ${media}: niente barra nascosta`);
  }
});
