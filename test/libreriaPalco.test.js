import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * La libreria aperta e il palco: nessuno dei due dipinge sull'altro.
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

test('la libreria sta sopra il palco, e sotto la barra fissa del telefono', () => {
  const lib = di('.library');
  assert.equal(valore(lib, 'position'), 'relative', '.library deve essere posizionata perché z-index valga');
  const z = Number(valore(lib, 'z-index'));
  assert.ok(z > 0, `.library senza z-index: il palco che trabocca le dipinge sopra la testata (z-index = ${valore(lib, 'z-index')})`);
  const barra = Number(valore(di('.toolrail', TELEFONO), 'z-index'));
  assert.ok(barra > z, `la barra fissa dei servizi (z ${barra}) deve restare sopra la libreria (z ${z})`);
});

test('la libreria cede lo spazio, e la sua striscia scorre dentro il corpo', () => {
  assert.equal(valore(di('.library'), 'min-height'), '0', '.library senza min-height: 0 non si stringe mai: cede il palco');
  const corpo = di('.library-body');
  assert.equal(valore(corpo, 'display'), 'flex');
  assert.equal(valore(corpo, 'flex-direction'), 'column');
  const strip = di('.strip');
  assert.notEqual(valore(strip, 'height'), '100%', "`.strip { height: 100% }` spinge l'ultima fila sotto il taglio del corpo");
  assert.equal(valore(strip, 'min-height'), '0');
  assert.match(valore(strip, 'flex') ?? '', /^1\b/, '.strip deve prendersi il resto del corpo (flex: 1)');
});

test('il palco ha un minimo su .main, in tutte e due le piante', () => {
  const minimo = valore(di(':root'), '--palco-minimo');
  assert.ok(minimo, 'manca --palco-minimo su :root');
  assert.equal(valore(di('.main', TELEFONO), 'min-height'), 'var(--palco-minimo)', 'telefono: .main deve tenere il minimo del palco');
  assert.match(valore(di('.main', DESKTOP), 'min-height') ?? '', /var\(--palco-minimo\)/, 'desktop: .main deve tenere servizi + palco');
  // Il minimo è fatto delle due misure che il palco contiene davvero: se
  // una cambia e l'altra no, il minimo mente.
  const piu = di('.sc-piu').map((r) => r.corpo).join(';');
  const alto = [...piu.matchAll(/(?:^|;|\s)height\s*:\s*(clamp\([^;]*dvh[^;]*\))/g)].at(-1)?.[1];
  assert.ok(alto && minimo.includes(alto), `--palco-minimo (${minimo}) non contiene l'altezza del + (${alto})`);
  const fondo = valore(di('.sc'), 'padding-bottom');
  assert.ok(fondo && minimo.includes(fondo), `--palco-minimo (${minimo}) non contiene lo spazio del tasto (${fondo})`);
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

test('le colonne degli strumenti non escono dal palco: scorrono', () => {
  const col = di('.sc-strumenti');
  assert.ok(valore(col, 'max-height'), '.sc-strumenti senza max-height scende oltre il palco');
  assert.equal(valore(col, 'overflow-y'), 'auto');
  assert.match(
    valore(di(".sc .sc-strumenti[data-lato='destra']", TELEFONO), 'max-height') ?? '',
    /clamp\(96px, 15dvh, 150px\)/,
    'sul telefono la colonna destra deve fermarsi sopra il punto oro del tasto Zack',
  );
});
