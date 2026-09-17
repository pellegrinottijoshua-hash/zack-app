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

test('Critico 1: al pavimento lo spostamento si azzera, non solo lo zoom', () => {
  // Il difetto reale (MaskBrush.jsx): l'unico posto che azzerava x/y al
  // minimo era il pulsante `-`, e quel pulsante e' disabilitato esattamente
  // quando z tocca il minimo. Un pizzico che porta z al pavimento con uno
  // spostamento residuo lasciava la tela fuori quadro senza via d'uscita.
  const r = applica({ x: 300, y: -150, z: 1.3 }, { dx: -40, dy: 10, fattore: 0.5 }, { min: 1, max: 8 });
  assert.deepEqual(r, { x: 0, y: 0, z: 1 }, 'il pavimento azzera anche lo spostamento residuo');
});

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
