import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuovoGesto, giu, muove, su, dueDita, applica, accumula } from '../src/engine/gesti.js';

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
  // Difetto nella prova originale del brief: `muove` processa UN dito alla
  // volta, quindi un pan a due dita arriva come DUE eventi separati. Da
  // f1=(0,0) f2=(100,0): dopo il primo evento la distanza scende 100→80
  // (fattore 0.8, le dita sono davvero più vicine A META' GESTO), dopo il
  // secondo risale 80→100 (fattore 1.25). Pretendere che m2.fattore da solo
  // sia ~1 è falso per costruzione: chiede al modulo di mentire su uno stato
  // intermedio reale. La proprietà vera è che un pan COMPLETO non cambia la
  // scala: il PRODOTTO dei due fattori torna a 1 (0.8 × 1.25 = 1 esatto).
  assert.ok(Math.abs(m1.fattore * m2.fattore - 1) < 0.01, 'un pan completo non deve cambiare la scala');
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

test('Critico 2: un pan puro che parte dal pavimento ci torna, anche se un passo intermedio lo sfonda', () => {
  // La proprieta' che il controllore chiede: un gesto completo che non
  // cambia la distanza fra le dita non deve cambiare lo zoom — nemmeno se,
  // a meta' gesto (un dito che si muove prima dell'altro, il caso comune
  // per come `muove` processa un dito alla volta), il fattore intermedio
  // scende sotto il pavimento. Qui si accumula grezzo (mai pinzato) e si
  // pinza una sola volta, come deve fare chi chiama (MaskBrush.jsx).
  let grezza = { x: 0, y: 0, z: 1.5 };
  grezza = accumula(grezza, { dx: 30, dy: 0, fattore: 0.6 }); // 1.5 × 0.6 = 0.9: sotto il pavimento a meta' gesto
  grezza = accumula(grezza, { dx: 30, dy: 0, fattore: 1.25 / 0.9 }); // risale esattamente a 1.25: il gesto e' un pan puro
  const vista = applica(grezza, {}, { min: 1, max: 8 });
  assert.ok(Math.abs(vista.z - 1.25) < 1e-9, `atteso 1.25, ottenuto ${vista.z}`);
  assert.equal(vista.x, 60, 'lo spostamento del pan resta: qui non si tocca il pavimento, solo lo si sfiora a meta\' gesto');
});

test('Critico 2: da z=2.5, un pan puro con un passo intermedio sotto il pavimento torna a 2.5, non 3.6', () => {
  // I numeri del report (§5): «da z = 2.5, un pan puro di 60px con le dita
  // a 83px l'una dall'altra → z = 3.6». Qui gli stessi fattori, accumulati
  // grezzi e pinzati una sola volta: lo zoom deve tornare esattamente 2.5.
  let grezza = { x: 0, y: 0, z: 2.5 };
  grezza = accumula(grezza, { dx: 30, dy: 0, fattore: 0.3 }); // 2.5×0.3=0.75: sotto il pavimento a meta' gesto
  grezza = accumula(grezza, { dx: 30, dy: 0, fattore: 1 / 0.3 }); // e torna esattamente a 2.5
  const vista = applica(grezza, {}, { min: 1, max: 8 });
  assert.ok(Math.abs(vista.z - 2.5) < 1e-9, `atteso 2.5, ottenuto ${vista.z}`);
});

test('Critico 2: un fotogramma perso durante un pan da z=1 non manda lo zoom a 6', () => {
  // Il secondo numero del report: «da z = 1, un fotogramma perso durante un
  // pan di 100px → z = 6». Un fotogramma perso e' semplicemente un passo di
  // `accumula` in meno da parte di chi chiama: il pinzare-una-volta-sola
  // non introduce comunque zoom dal nulla quando il fattore complessivo
  // resta 1.
  let grezza = { x: 0, y: 0, z: 1 };
  grezza = accumula(grezza, { dx: 100, dy: 0, fattore: 1 }); // un solo passo: nessun cambio di scala
  const vista = applica(grezza, {}, { min: 1, max: 8 });
  assert.equal(vista.z, 1);
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

test('Nuovo Problema 2: una stretta profonda non lascia una zona morta, un solo raddoppio rientra in vista', () => {
  // Il difetto reale misurato nel browser: z grezzo corre libero (0.2, poi
  // 0.4, poi 0.8 — DUE raddoppi senza alcun effetto visibile, il terzo porta
  // finalmente a 1.6). Con la banda, lo stesso pizzico risponde súbito.
  const limiti = { min: 1, max: 8 };
  let grezza = { x: 0, y: 0, z: 2 };
  grezza = accumula(grezza, { fattore: 0.1 }, limiti); // 2 × 0.1 = 0.2 grezzo
  assert.equal(grezza.z, 0.5, 'la banda deve fermare lo zoom grezzo a min/2, non lasciarlo correre a 0.2');

  grezza = accumula(grezza, { fattore: 2 }, limiti); // un SOLO raddoppio
  assert.equal(grezza.z, 1, 'un solo raddoppio deve bastare a rientrare esattamente al pavimento');

  grezza = accumula(grezza, { fattore: 1.2 }, limiti); // un movimento piccolo, non un raddoppio
  assert.ok(grezza.z > 1, 'subito dopo il pavimento un piccolo movimento e\' gia\' visibile: niente altra zona morta');
});

test('Nuovo Problema 2: la banda non tocca un pan che sfiora appena il pavimento (Critico 2 resta esatto)', () => {
  // Gli stessi numeri del Critico 2 (giro 1): un dip a 0.75 e uno a 0.9 sono
  // ben dentro la banda (min/2 = 0.5) e non devono MAI essere corretti qui,
  // o il pan non torna esattamente al punto di partenza.
  const limiti = { min: 1, max: 8 };
  let grezza = { x: 0, y: 0, z: 2.5 };
  grezza = accumula(grezza, { fattore: 0.3 }, limiti); // 2.5 × 0.3 = 0.75, sopra la banda: intatto
  assert.equal(grezza.z, 0.75, 'un dip modesto non deve essere toccato dalla banda');
  grezza = accumula(grezza, { fattore: 1 / 0.3 }, limiti);
  assert.ok(Math.abs(grezza.z - 2.5) < 1e-9, 'il pan torna esattamente a 2.5, la banda non ha corrotto il valore vero');
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
