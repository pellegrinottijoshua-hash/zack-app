import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovoGesto, giu, muove, su, dueDita, applica, accumula, ancora } from '../src/engine/gesti.js';

test('un dito solo lavora: non muove e non ingrandisce', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 10, y: 10 });
  assert.equal(dueDita(g), false);
  assert.equal(muove(g, { id: 1, x: 40, y: 10 }), null, 'un dito non deve spostare la vista');
});

test('due dita che si allontanano ingrandiscono', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  assert.equal(dueDita(g), true);
  const m = muove(g, { id: 2, x: 200, y: 0 });
  assert.ok(m.fattore > 1.9 && m.fattore < 2.1, `atteso ~2, ottenuto ${m.fattore}`);
});

test('due dita che scorrono insieme spostano e non ingrandiscono', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  const m1 = muove(g, { id: 1, x: 20, y: 0 });
  const m2 = muove(g, { id: 2, x: 120, y: 0 });
  // `muove` processa UN dito alla volta, quindi un pan a due dita arriva
  // come DUE eventi separati. Da f1=(0,0) f2=(100,0): dopo il primo evento
  // la distanza scende 100→80 (le dita sono davvero più vicine A META'
  // GESTO), dopo il secondo risale 80→100.
  //
  // Giro di correzione 3, Critico 1: `fattore` non è più il rapporto
  // rispetto all'evento PRECEDENTE — è il rapporto ASSOLUTO rispetto
  // all'inizio del pizzico (qui, la distanza 100 misurata al primo evento).
  // Un pan completo che riporta le dita alla distanza di partenza dà quindi
  // `fattore ≈ 1` GIÀ da solo sull'ultimo evento, senza bisogno di
  // moltiplicare per quello intermedio: non c'è più niente da comporre, ed
  // è esattamente il punto della correzione (vedi `gesti.js`).
  assert.ok(Math.abs(m1.fattore - 0.8) < 0.01, 'a meta\' gesto la distanza vera e\' scesa a 80/100');
  assert.ok(Math.abs(m2.fattore - 1) < 0.01, 'un pan completo torna alla distanza di partenza: fattore assoluto 1, non un prodotto');
  assert.ok(m1.dx + m2.dx > 0, 'lo spostamento va nella direzione delle dita');
});

test('alzare un dito non fa saltare la vista', () => {
  // Il difetto classico: si alza un dito, il centro fra i due salta, e
  // l'immagine schizza via. Dopo `su` il gesto riparte dal dito rimasto.
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  muove(g, { id: 2, x: 200, y: 0 });
  su(g, 2);
  assert.equal(muove(g, { id: 1, x: 10, y: 0 }), null, 'rimasto un dito solo: si torna a lavorare');
});

test('l’ingrandimento non esce dai limiti', () => {
  assert.deepEqual(
    applica({ x: 0, y: 0, z: 1 }, { dx: 0, dy: 0, fattore: 100 }, { min: 0.5, max: 8 }),
    { x: 0, y: 0, z: 8 },
  );
  assert.equal(applica({ x: 0, y: 0, z: 1 }, { dx: 0, dy: 0, fattore: 0.001 }, { min: 0.5, max: 8 }).z, 0.5);
});

// --- Giro di correzione 1 --------------------------------------------------

test('Critico 1: sopra il pavimento lo spostamento resta intatto', () => {
  // Il clamp su x/y non deve scattare quando non si e' al minimo: solo LI'
  // non c'e' niente da spostare, altrove lo spostamento e' legittimo.
  const r = applica({ x: 300, y: -150, z: 2 }, { dx: -40, dy: 10, fattore: 1 }, { min: 1, max: 8 });
  assert.deepEqual(r, { x: 260, y: -140, z: 2 });
});

// --- Giro di correzione 3 --------------------------------------------------
//
// Critico 1: `bandaGrezza` corrompeva un pan puro AL PAVIMENTO. Le due prove
// di Giro 1 sopra (rimosse: costruivano `fattore` a mano come rapporto
// PER-EVENTO, la semantica vecchia che la correzione elimina — vedi
// `gesti.js`, `muove`) sono sostituite da queste, che passano per il vero
// gesto (`giu`/`muove`), coi numeri ESATTI misurati dal controllore nel
// browser: due dita a 83px, un passo di 60px a testa, partenza 1×.

test('Critico 1 (Giro 3): un pan puro a 1×, dita a 83px e passo di 60px, finisce ESATTAMENTE a 1×', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 83, y: 0 });
  // Evento 1/2: il dito destro si muove di -60. La separazione vera scende
  // a 23px — 23/83 = 0,277, ben sotto il vecchio pavimento (min/2 = 0,5):
  // e' esattamente il passo che la banda riscriveva.
  const m1 = muove(g, { id: 2, x: 23, y: 0 });
  let grezza = accumula({ x: 0, y: 0, z: 1 }, m1);
  assert.ok(Math.abs(grezza.z - 23 / 83) < 1e-9, `intermedio: atteso ${23 / 83}, ottenuto ${grezza.z}`);
  // Evento 2/2: il dito sinistro si muove di -60. La separazione torna a
  // 83px: il gesto e' un pan puro.
  const m2 = muove(g, { id: 1, x: -60, y: 0 });
  grezza = accumula(grezza, m2);
  // ESATTO, non «entro 1e-9»: a 1× anche un ulp accende `data-zoom`
  // (`zoom > 1`) e fa crescere il palco — vedi la prova a coordinate
  // frazionarie piu' sotto.
  assert.equal(grezza.z, 1, `atteso 1 esatto, ottenuto ${grezza.z} (il difetto reale dava 1.8)`);
  assert.equal(applica(grezza, {}, { min: 1, max: 8 }).z, 1);
});

test('Critico 1 (Giro 3): passo == separazione, stesso pan puro, finisce ESATTAMENTE a 1×', () => {
  // Il caso estremo del report («step == separation → 8×»): le dita si
  // sfiorano a meta' gesto (`distanza` le pinza a 1px, mai a zero).
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 83, y: 0 });
  const m1 = muove(g, { id: 2, x: 0, y: 0 }); // -83: le dita si toccano
  let grezza = accumula({ x: 0, y: 0, z: 1 }, m1);
  const m2 = muove(g, { id: 1, x: -83, y: 0 }); // -83: torna alla separazione di partenza
  grezza = accumula(grezza, m2);
  assert.equal(grezza.z, 1, `atteso 1 esatto, ottenuto ${grezza.z} (il difetto reale dava 8)`);
});

test('Critico 1 (Giro 3): la stessa proprieta\' vale da un pavimento diverso da 1 (z=1.5 e z=2.5)', () => {
  // Generalizza le due prove sopra: qualunque sia lo zoom di partenza del
  // gesto, un pan puro (separazione di ritorno) lo lascia intatto — perche'
  // `accumula` ricalcola sempre da `zIniziale`, mai da un valore intermedio.
  for (const zPartenza of [1.5, 2.5]) {
    const g = nuovoGesto();
    giu(g, { id: 1, x: 0, y: 0 });
    giu(g, { id: 2, x: 83, y: 0 });
    const m1 = muove(g, { id: 2, x: 23, y: 0 });
    let grezza = accumula({ x: 0, y: 0, z: zPartenza }, m1);
    const m2 = muove(g, { id: 1, x: -60, y: 0 });
    grezza = accumula(grezza, m2);
    assert.equal(grezza.z, zPartenza, `da z=${zPartenza}, atteso ${zPartenza} esatto, ottenuto ${grezza.z}`);
  }
});

/** Numeri pseudo-casuali RIPETIBILI: una prova che cambia a ogni giro non prova niente. */
function lcg(seme) {
  let s = seme >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/**
 * Una coordinata come la da' un dito vero su uno schermo a 3x: un terzo di
 * pixel CSS. Non un dettaglio — i numeri di `lcg` da soli hanno 32 bit di
 * mantissa, e le loro somme e differenze sono ESATTE in virgola mobile: la
 * prova qui sotto passava verde anche senza la tolleranza che deve
 * difendere (misurato: 0 casi su 800). A terzi di pixel, 278 su 800.
 */
const terzi = (v) => Math.round(v * 3) / 3;

test('Critico 1 (Giro 3): un pan puro a coordinate FRAZIONARIE (dita vere) lascia lo zoom esatto, 1× e 2.5×', () => {
  // Trovato verificando: `clientX` di un dito vero e' frazionario, e
  // `hypot` di differenze uguali in aritmetica esatta non lo e' sempre in
  // virgola mobile — senza la tolleranza in `muove`, 278 di questi 800 pan
  // finivano a 1.0000000000000002 (o piu'), che a 1× accende `data-zoom` e fa crescere
  // il palco sotto un gesto che non ha ingrandito niente.
  const r = lcg(20260923);
  for (const zPartenza of [1, 2.5]) {
    for (let i = 0; i < 400; i++) {
      const a = { x: terzi(r() * 390), y: terzi(r() * 844) };
      const b = { x: terzi(r() * 390), y: terzi(r() * 844) };
      const passo = { x: terzi((r() - 0.5) * 240), y: terzi((r() - 0.5) * 240) };
      const g = nuovoGesto();
      giu(g, { id: 1, ...a });
      giu(g, { id: 2, ...b });
      let grezza = { x: 0, y: 0, z: zPartenza };
      grezza = accumula(grezza, muove(g, { id: 2, x: b.x + passo.x, y: b.y + passo.y }));
      grezza = accumula(grezza, muove(g, { id: 1, x: a.x + passo.x, y: a.y + passo.y }));
      const vista = applica(grezza, {}, { min: 1, max: 8 });
      assert.equal(vista.z, zPartenza, `pan ${i} da ${zPartenza}×: ottenuto ${vista.z}`);
    }
  }
});

test('Critico 1 (Giro 3): allargare e poi tornare alla separazione di partenza, nello STESSO tocco, torna esatto', () => {
  // `z` e' il rapporto ASSOLUTO dall'inizio del gesto, non un prodotto di
  // rapporti per ronda: ri-basare `iniziale.d` a ogni ronda da' lo stesso
  // numero in aritmetica esatta ma non in virgola mobile (misurato: 57% di
  // questi casi a 1.5000000000000002).
  const r = lcg(7);
  for (let i = 0; i < 300; i++) {
    const a = { x: terzi(r() * 390), y: terzi(r() * 844) };
    const b = { x: terzi(r() * 390), y: terzi(r() * 844) };
    const g = nuovoGesto();
    giu(g, { id: 1, ...a });
    giu(g, { id: 2, ...b });
    let grezza = { x: 0, y: 0, z: 1.5 };
    for (let k = 0; k < 3; k++) {
      const s = terzi(r() * 80);
      grezza = accumula(grezza, muove(g, { id: 1, x: a.x - s, y: a.y }));
      grezza = accumula(grezza, muove(g, { id: 2, x: b.x + s, y: b.y }));
    }
    grezza = accumula(grezza, muove(g, { id: 1, ...a }));
    grezza = accumula(grezza, muove(g, { id: 2, ...b }));
    assert.equal(grezza.z, 1.5, `caso ${i}: ottenuto ${grezza.z}`);
  }
});

test('Critico 2: un solo evento che non cambia la distanza vera non introduce zoom dal nulla', () => {
  // Il secondo numero del report (Giro 1): «da z = 1, un fotogramma perso
  // durante un pan di 100px → z = 6» — un difetto del vecchio meccanismo a
  // compounding, che il Giro 3 elimina alla radice (vedi le prove Critico 1
  // sopra). Qui la stessa idea di fondo, con un solo evento: id2 si sposta
  // lungo un arco attorno a id1 (stessa distanza, 100, direzione diversa) —
  // `fattore` deve restare 1, non introdurre zoom dal nulla.
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  const m = muove(g, { id: 2, x: 0, y: 100 }); // arco di raggio 100 attorno a id1: la distanza resta 100
  assert.ok(Math.abs(m.fattore - 1) < 1e-9, `atteso 1, ottenuto ${m.fattore}`);
  const grezza = accumula({ x: 0, y: 0, z: 1 }, m);
  assert.equal(grezza.z, 1);
});

test('Importante 3: due dita nello stesso punto danno fattore finito, non Infinity', () => {
  // La promessa dichiarata nell'intestazione del modulo: senza la guardia
  // su `distanza`, due dita che partono sovrapposte e poi si separano
  // dividono per una distanza di partenza zero → Infinity (o NaN se anche
  // dopo restano sovrapposte).
  const g = nuovoGesto();
  giu(g, { id: 1, x: 50, y: 50 });
  giu(g, { id: 2, x: 50, y: 50 });
  const m = muove(g, { id: 2, x: 150, y: 50 });
  assert.ok(Number.isFinite(m.fattore), `atteso un numero finito, ottenuto ${m.fattore}`);
  assert.equal(m.fattore, 100, 'guardia a 1px di distanza minima: 100 / 1');
});

test('Minore: la coppia attiva sono le PRIME due dita appoggiate, stabili con una terza', () => {
  // `coppia` promette un «ordine stabile». Con tre dita appoggiate, la
  // coppia attiva deve restare la prima (id 1, id 2): muovere la terza dita
  // non deve toccare ne' il centro ne' la distanza calcolati.
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });
  giu(g, { id: 3, x: 500, y: 500 });
  const m = muove(g, { id: 3, x: 900, y: 900 });
  assert.equal(m.fattore, 1, 'la terza dita non fa parte della coppia attiva');
  assert.equal(m.dx, 0);
  assert.equal(m.dy, 0);
});

test('Minore: un dito mai appoggiato non si aggiunge come fantasma', () => {
  // In MaskBrush.jsx, `begin` puo' tornare PRIMA di chiamare `giu` (l'
  // immagine non e' ancora pronta): il `pointermove` che arriva dopo per
  // quello stesso dito deve trovare `muove` che torna `null` senza
  // registrarlo, non un dito fantasma che fa scattare `dueDita`.
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  assert.equal(dueDita(g), false);
  const m = muove(g, { id: 99, x: 10, y: 10 });
  assert.equal(m, null, 'un dito sconosciuto non deve muovere nulla');
  assert.equal(dueDita(g), false, 'non deve entrare come fantasma nella mappa');
});

// --- Giro di correzione 2 --------------------------------------------------
//
// Correzione del committente: la ruling (b) del giro 1 («a 1x non c'e' niente
// da spostare») era falsa — misurata dal ricontrollore a 1x, canvas 1064x1064
// dentro un `.brush-stage` con `clientHeight 388`: un dito ha bisogno di
// spostare l'immagine anche a 1x per raggiungerne il fondo, e il pavimento
// che azzerava x/y glielo impediva. La ruling (a), non implementata al giro
// 1, chiude il buco da sola: si pinza `x`/`y` sulla geometria VERA (palco e
// tela), e il pavimento sparisce come caso speciale.

test('Ruling: a 1x, con la tela piu\' alta del palco, lo spostamento resta vivo e raggiunge il fondo', () => {
  // Le misure del ricontrollore: palco 1064x388 (la tela COPRE la larghezza
  // del palco, niente margine orizzontale), tela quadrata (rapporto 1:1,
  // qualunque sia la sua risoluzione vera in pixel).
  const limiti = { min: 1, max: 8, palco: { w: 1064, h: 388 }, tela: { w: 4000, h: 4000 } };
  const r = applica({ x: 0, y: 0, z: 1 }, { dx: -900, dy: -900, fattore: 1 }, limiti);
  // Orizzontale: nessun margine (la tela combacia col palco) — si azzera DI
  // CONSEGUENZA, non per un caso speciale sul pavimento.
  assert.equal(r.x, 0, 'nessun margine orizzontale a 1x: la tela e\' larga quanto il palco');
  // Verticale: 338px di margine ((1064 - 388) / 2) — un dito DEVE poterci
  // arrivare, altrimenti il fondo dell\'immagine resta irraggiungibile.
  assert.equal(r.y, -338, 'il pavimento non deve piu\' impedire di raggiungere il fondo dell\'immagine a 1x');
});

test('la tela non esce mai dalla cornice, a qualunque zoom', () => {
  const limiti = { min: 1, max: 8, palco: { w: 1064, h: 388 }, tela: { w: 4000, h: 4000 } };
  const r = applica({ x: 0, y: 0, z: 3 }, { dx: -5000, dy: -5000, fattore: 1 }, limiti);
  // A z=3 la tela resa e' 3192x3192 (palco.w * z, quadrata): margine
  // orizzontale (3192-1064)/2 = 1064, verticale (3192-388)/2 = 1402.
  assert.deepEqual(r, { x: -1064, y: -1402, z: 3 }, 'lo spostamento deve fermarsi al margine vero, non oltre');
});

// Giro di correzione 3: `bandaGrezza` e' stata cancellata (vedi `gesti.js`,
// storia in `accumula`) — le due prove precedenti la testavano direttamente
// e sono sostituite da queste, che verificano la STESSA proprieta' (nessuna
// zona morta dopo una stretta profonda) sul nuovo meccanismo: senza
// compounding, non serve piu' una banda per garantirla.

test('Nuovo Problema 2 (Giro 3): una stretta profonda, riaperta anche solo un po\', risponde SUBITO — nessuna banda necessaria', () => {
  // Da un pizzico pulito a 2x (dita a 60px), una stretta violenta porta le
  // dita quasi a toccarsi (4px: fattore reale assoluto 4/60), poi una
  // riapertura MODESTA (non un ritorno ai 60px di partenza) le porta a 40px.
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 60, y: 0 });
  const stretta = muove(g, { id: 2, x: 4, y: 0 });
  let grezza = accumula({ x: 0, y: 0, z: 2 }, stretta);
  assert.ok(Math.abs(grezza.z - (2 * 4) / 60) < 1e-9, 'lo zoom grezzo riflette il rapporto FISICO vero, senza pavimento intermedio');

  const riapertura = muove(g, { id: 2, x: 40, y: 0 });
  grezza = accumula(grezza, riapertura);
  // Rapporto assoluto dall'inizio del gesto: 40/60. Nessuna banda ha
  // corrotto il riferimento nel mezzo, quindi la risposta e' immediata e
  // proporzionale — non serve "recuperare" da un valore riscritto.
  assert.ok(Math.abs(grezza.z - (2 * 40) / 60) < 1e-9, `atteso ${(2 * 40) / 60}, ottenuto ${grezza.z} — nessuna zona morta`);
  assert.ok(grezza.z > 1, 'la riapertura modesta e\' gia\' visibile sopra il pavimento, senza raddoppi a vuoto');
});

test('Nuovo Problema 2 (Giro 3): un dip modesto (Critico 1 resta esatto) non ha piu\' bisogno di una banda per tornare esatto', () => {
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 83, y: 0 });
  const m1 = muove(g, { id: 2, x: 25, y: 0 }); // 25/83 ≈ 0.3, un dip modesto
  let grezza = accumula({ x: 0, y: 0, z: 2.5 }, m1);
  assert.ok(Math.abs(grezza.z - (2.5 * 25) / 83) < 1e-9, 'un dip modesto non deve essere toccato da nessuna banda: non ce n\'e\' piu\' una');
  const m2 = muove(g, { id: 1, x: -58, y: 0 }); // torna alla separazione di partenza (83)
  grezza = accumula(grezza, m2);
  assert.ok(Math.abs(grezza.z - 2.5) < 1e-9, 'il pan torna esattamente a 2.5');
});

test('Nuovo Problema 3: il pavimento non fa piu\' scattare uno strappo nello spostamento', () => {
  // Prima (giro 1): un fotogramma che tocca il pavimento a meta\' gesto
  // vedeva x/y azzerati di scatto, per poi tornare al valore vero al
  // fotogramma successivo — lo sfarfallio 250% → 100% → 250%. Rimossa la
  // pinza speciale, `limita` e\' continua in z: un valore appena sopra o
  // esattamente al pavimento danno lo stesso margine, non un salto a zero.
  const limiti = { min: 1, max: 8, palco: { w: 1064, h: 388 }, tela: { w: 4000, h: 4000 } };
  const appenaSopra = applica({ x: 0, y: -300, z: 1.01 }, {}, limiti);
  const alPavimento = applica({ x: 0, y: -300, z: 1 }, {}, limiti);
  assert.ok(
    Math.abs(appenaSopra.y - alPavimento.y) < 1,
    'un salto qui e\' esattamente il vecchio sfarfallio a meta\' gesto',
  );
  assert.notEqual(alPavimento.y, 0, 'il pavimento non deve piu\' azzerare da solo lo spostamento');
});

// Giro di correzione 3, Nuovo Problema 3: lo sfarfallio si e' rivelato in
// due meta' distinte. La prova sopra (Giro 2) copre SOLO y, con un palco
// piu' corto della tela dove il margine al pavimento e' comunque non-zero
// per la geometria — non poteva vedere il difetto vero, che vive sull'asse
// x: li' il margine E' identicamente zero a z=1 PER COSTRUZIONE
// (`larghezzaTela = palco.w * z`, sempre), quindi un tuffo transitorio di z
// durante un pan (un dito alla volta, l'evento intermedio vede DAVVERO le
// dita piu' vicine) faceva collassare a scatto lo spostamento in x, non solo
// tremolare la larghezza — il collasso e' la stessa regressione che il Giro
// 2 aveva gia' tolto, rientrata dalla geometria invece che da un caso
// speciale.

test('Nuovo Problema 3 (Giro 3): un tuffo intermedio di z non collassa piu\' il pan in x — misure del report', () => {
  // Riproduce esattamente la tabella del controllore: partenza 2×,
  // `translate(-60px, 0px)`, un pan con le dita a 83px e un passo di 60px.
  const limiti = { min: 1, max: 8, palco: { w: 1064, h: 1064 }, tela: { w: 4000, h: 4000 } };
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 83, y: 0 });

  const m1 = muove(g, { id: 2, x: 23, y: 0 }); // -60: la separazione vera scende a 23/83
  let grezza = accumula({ x: -60, y: 0, z: 2 }, m1);
  const intermedio = applica(grezza, {}, limiti);
  assert.ok(
    Math.abs(intermedio.x - -90) < 1e-9,
    `il fotogramma intermedio non deve collassare x: atteso -90, ottenuto ${intermedio.x} (il difetto reale dava 0)`,
  );

  const m2 = muove(g, { id: 1, x: -60, y: 0 }); // -60: la separazione torna a 83, il gesto e' un pan puro
  grezza = accumula(grezza, m2);
  const fine = applica(grezza, {}, limiti);
  assert.ok(Math.abs(fine.z - 2) < 1e-9, `atteso 2×, ottenuto ${fine.z}`);
  assert.ok(Math.abs(fine.x - -120) < 1e-9, `atteso -120px, ottenuto ${fine.x}`);
});

// Minore 3 (Giro 3): la guardia `Math.max(0, ...)` sul margine non e'
// decorativa — protegge esattamente il caso "tela piu' bassa del palco su
// un asse" (una tela panoramica in un palco quadrato, o il palco cresciuto
// a meta' gesto come nell'Importante 2). Senza, uno sconfinamento negativo
// pinza la posizione AL margine negativo, spingendo la tela fuori dal
// palco invece di lasciarla centrata.

test('Minore 3 (Giro 3): un margine negativo (tela piu\' bassa del palco) non spinge la tela fuori dalla cornice', () => {
  const limiti = { min: 1, max: 8, palco: { w: 1000, h: 1000 }, tela: { w: 1000, h: 200 } };
  // A z=1, larghezzaTela=1000, altezzaTela=1000*(200/1000)=200: la tela e'
  // 800px piu' bassa del palco quadrato. Senza la guardia, margineY
  // sarebbe -400, e `Math.min(-400, Math.max(400, y))` pinzerebbe y a -400
  // per qualunque y di partenza.
  const r = applica({ x: 0, y: 500, z: 1 }, {}, limiti);
  assert.equal(r.y, 0, 'un margine negativo deve azzerarsi, non spingere la tela fuori dal palco');
});

// Trovato VERIFICANDO Nuovo Problema 3 (non un finding del controllore): un
// margine misurato sullo zoom di inizio gesto e basta protegge il pan dal
// tuffo transitorio, ma lo congela se, SENZA sollevare le dita, un pizzico
// che ingrandisce e' seguito da un pan — un gesto singolo e naturale su un
// telefono. `zMargine` (vedi `accumula`) si aggiorna a fine ronda: il pan
// che segue uno spread a 2x si misura sul margine di 2x, non su quello di
// 1x. Lo ZOOM invece resta assoluto dall'inizio del gesto (prove sopra).

test('un pizzico che ingrandisce e poi continua a spostare, nello STESSO tocco, non blocca il pan sul margine vecchio', () => {
  const limiti = { min: 1, max: 8, palco: { w: 251, h: 182 }, tela: { w: 4000, h: 4000 } };
  const g = nuovoGesto();
  giu(g, { id: 1, x: 0, y: 0 });
  giu(g, { id: 2, x: 100, y: 0 });

  // Ronda 1 — spread: separazione 100 → 200 (fattore 2, z: 1 → 2), senza
  // sollevare le dita.
  let grezza = { x: 0, y: -34.5, z: 1 }; // partenza: gia' al margine vero di 1x
  const s1 = muove(g, { id: 1, x: -50, y: 0 });
  grezza = accumula(grezza, s1);
  const s2 = muove(g, { id: 2, x: 150, y: 0 });
  assert.equal(s2.assestato, true, 'la ronda si chiude quando ENTRAMBE le dita si sono mosse');
  grezza = accumula(grezza, s2);
  assert.ok(Math.abs(grezza.z - 2) < 1e-9, `dopo lo spread atteso 2, ottenuto ${grezza.z}`);

  // Ronda 2 — pan, STESSO tocco: entrambe le dita salgono di 70px, un
  // evento a testa, senza mai sollevarle.
  const p1 = muove(g, { id: 1, x: -50, y: -70 });
  grezza = accumula(grezza, p1);
  const p2 = muove(g, { id: 2, x: 150, y: -70 });
  assert.equal(p2.assestato, true);
  grezza = accumula(grezza, p2);

  const vista = applica(grezza, {}, limiti);
  // Al vero margine di 2x — (251×2 − 182)/2 = 160 — uno spostamento di
  // −104,5 sta ben dentro: NON deve restare bloccato ai −34,5 del margine
  // di 1x (il difetto: `zIniziale` congelato dall'inizio del tocco).
  assert.ok(
    Math.abs(vista.y - -104.5) < 1e-9,
    `atteso -104.5 (il pan si muove liberamente dopo lo spread), ottenuto ${vista.y} (bloccato al vecchio margine se sbagliato)`,
  );
});

// --- Task 11: Brain e la home libera ---------------------------------------

test('Brain e la home libera usano LO STESSO gesto, non due copie', () => {
  // Due implementazioni dello stesso gesto divergono alla prima correzione,
  // ed è il motivo per cui la matematica sta in un modulo solo.
  for (const f of ['../src/components/Brain.jsx', '../src/components/MaskBrush.jsx', '../src/landing/Ritaglio.jsx']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.match(src, /from '.*engine\/gesti\.js'/, `${f} non usa engine/gesti.js`);
  }
});

/** Un pizzico vero: due dita giu', un evento a testa, `ancora` a ogni evento. */
function pizzica(inizio, a, b, a2, b2, limiti) {
  const g = nuovoGesto();
  giu(g, { id: 1, ...a });
  giu(g, { id: 2, ...b });
  const v1 = ancora(inizio, muove(g, { id: 2, ...b2 }), limiti);
  const v2 = ancora(inizio, muove(g, { id: 1, ...a2 }), limiti);
  return { meta: v1, fine: v2 };
}

test('ancora: un pan puro (dita vere, terzi di pixel) lascia lo zoom ESATTO e sposta quanto le dita', () => {
  // La lezione del Giro 3, Critico 1, sulle due superfici nuove: lo zoom
  // passa da `accumula`, e `fattore` e' assoluto dall'inizio del pizzico.
  const r = lcg(1111);
  for (const z0 of [1, 0.25, 2.5]) {
    for (let i = 0; i < 300; i++) {
      const a = { x: terzi(r() * 390), y: terzi(r() * 844) };
      const b = { x: terzi(r() * 390), y: terzi(r() * 844) };
      const p = { x: terzi((r() - 0.5) * 240), y: terzi((r() - 0.5) * 240) };
      const inizio = { x: terzi(r() * 200 - 100), y: terzi(r() * 200 - 100), z: z0 };
      const { fine } = pizzica(inizio, a, b, { x: a.x + p.x, y: a.y + p.y }, { x: b.x + p.x, y: b.y + p.y }, { min: 0.25, max: 2.5 });
      assert.equal(fine.z, z0, `pan ${i} da ${z0}: z ${fine.z}`);
      assert.ok(Math.abs(fine.x - (inizio.x + p.x)) < 1e-9 && Math.abs(fine.y - (inizio.y + p.y)) < 1e-9, `pan ${i}: spostamento sbagliato`);
    }
  }
});

test('ancora: ingrandendo, il punto della tela sotto le dita RESTA sotto le dita', () => {
  // Brain disegna `translate(x,y) scale(z)` con l'origine in alto a
  // sinistra: senza l'ancora, lo zoom trascinerebbe tutto verso l'angolo.
  const inizio = { x: 40, y: 40, z: 1 };
  const a = { x: 100, y: 300 };
  const b = { x: 140, y: 300 };
  const sotto = (v, cx, cy) => [(cx - v.x) / v.z, (cy - v.y) / v.z];
  const prima = sotto(inizio, 120, 300);
  // Spread 40 → 80 attorno allo stesso centro, poi le dita scendono di 30.
  const { fine } = pizzica(inizio, a, b, { x: 80, y: 330 }, { x: 160, y: 330 }, { min: 0.25, max: 2.5 });
  assert.equal(fine.z, 2);
  const dopo = sotto(fine, 120, 330);
  assert.ok(Math.abs(dopo[0] - prima[0]) < 1e-9 && Math.abs(dopo[1] - prima[1]) < 1e-9, `prima ${prima}, dopo ${dopo}`);
});

test('ancora: lo zoom resta nei limiti dichiarati (Brain: 0.25 .. 2.5)', () => {
  const { fine: su } = pizzica({ x: 0, y: 0, z: 1 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }, { x: 900, y: 0 }, { min: 0.25, max: 2.5 });
  assert.equal(su.z, 2.5);
  const { fine: giuZ } = pizzica({ x: 0, y: 0, z: 1 }, { x: 0, y: 0 }, { x: 900, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { min: 0.25, max: 2.5 });
  assert.equal(giuZ.z, 0.25);
});

test('ancora: la mappa non esce dalla cornice — restano sempre `resta` pixel di contenuto nel palco', () => {
  const limiti = { min: 0.25, max: 2.5, palco: { w: 209, h: 411 }, contenuto: { x: 0, y: 0, w: 620, h: 120 }, resta: 48 };
  const { fine: via } = pizzica({ x: 40, y: 40, z: 1 }, { x: 70, y: 400 }, { x: 130, y: 400 }, { x: -2930, y: -2600 }, { x: -2870, y: -2600 }, limiti);
  assert.deepEqual([via.x, via.y], [48 - 620, 48 - 120], 'trascinata via in alto a sinistra: restano 48 px in basso a destra');
  const { fine: la } = pizzica({ x: 40, y: 40, z: 1 }, { x: 70, y: 400 }, { x: 130, y: 400 }, { x: 3070, y: 3400 }, { x: 3130, y: 3400 }, limiti);
  assert.deepEqual([la.x, la.y], [209 - 48, 411 - 48], 'trascinata via in basso a destra: restano 48 px in alto a sinistra');
});

test('ancora: a 1× il contenuto fuori dal palco resta RAGGIUNGIBILE con due dita (la lezione dell\'1×)', () => {
  // Tre note larghe 620 in un piano largo 209: la terza (420..620) e' fuori.
  // Il vincolo deve lasciar portare il suo bordo destro a filo del piano.
  const limiti = { min: 0.25, max: 2.5, palco: { w: 209, h: 411 }, contenuto: { x: 0, y: 0, w: 620, h: 120 }, resta: 48 };
  const { fine } = pizzica({ x: 40, y: 40, z: 1 }, { x: 70, y: 400 }, { x: 130, y: 400 }, { x: 70 - 451, y: 400 }, { x: 130 - 451, y: 400 }, limiti);
  assert.equal(fine.z, 1);
  assert.equal(fine.x + 620, 209, 'il bordo destro della terza nota arriva a filo del piano');
});

test('ancora: un contenuto piu\' piccolo di `resta` resta tutto visibile, non viene centrato ne\' bloccato', () => {
  const limiti = { min: 0.25, max: 2.5, palco: { w: 300, h: 300 }, contenuto: { x: 0, y: 0, w: 20, h: 20 }, resta: 48 };
  const { fine } = pizzica({ x: 100, y: 100, z: 1 }, { x: 150, y: 150 }, { x: 190, y: 150 }, { x: 5150, y: 150 }, { x: 5190, y: 150 }, limiti);
  assert.equal(fine.x, 300 - 20, 'tutto il contenuto (20 px) resta dentro, a filo del bordo destro');
  assert.equal(fine.y, 100, 'l\'asse che non si e\' mosso non cambia');
});
