import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGOLE, riordina } from '../src/engine/riordina.js';

/*
 * Il tasto Zack di Brain: riorganizza la tela.
 *
 * La regola che conta piu' di tutte e' il DETERMINISMO. Un riordino che
 * sposta le cose in modo diverso a ogni pressione non solleva niente: si
 * preme, si guarda, e non si preme mai piu'. Per questo e' la prima cosa
 * provata qui, su tutte e quattro le regole.
 */

const tela = () => [
  { id: 'a', t: 'nota', cat: 'idea', x: 300, y: 500, w: 200, h: 120 },
  { id: 'b', t: 'nota', cat: 'task', x: 10, y: 40, w: 200, h: 120 },
  { id: 'c', t: 'asset', x: 800, y: 90, w: 180, h: 180 },
  { id: 'd', t: 'cerchio', x: 60, y: 700, w: 320, h: 240 },
  { id: 'e', t: 'freccia', da: 'a', a: 'b' },
];

test('ogni regola e’ deterministica: premere due volte da’ lo stesso risultato', () => {
  for (const regola of REGOLE) {
    const uno = riordina(tela(), regola);
    const due = riordina(tela(), regola);
    assert.deepEqual(due, uno, `«${regola}» rimescola invece di riordinare`);
    // E rifarlo su un risultato gia' riordinato non lo muove piu':
    // un riordino che continua a spostare non e' arrivato da nessuna parte.
    assert.deepEqual(riordina(uno, regola), uno, `«${regola}» non si ferma mai`);
  }
});

test('nessuna regola perde o inventa oggetti', () => {
  for (const regola of REGOLE) {
    const dopo = riordina(tela(), regola);
    assert.deepEqual(
      dopo.map((o) => o.id).sort(),
      ['a', 'b', 'c', 'd', 'e'],
      `«${regola}» ha perso o inventato qualcosa`,
    );
  }
});

test('le frecce non si spostano: seguono i nodi', () => {
  // Una freccia non ha una posizione sua — collega due oggetti. Darle delle
  // coordinate la scollerebbe da cio' che collega.
  for (const regola of REGOLE) {
    const f = riordina(tela(), regola).find((o) => o.id === 'e');
    assert.equal(f.t, 'freccia');
    assert.equal(f.x, undefined, `«${regola}» ha dato una posizione a una freccia`);
  }
});

test('«tipo» mette insieme le cose dello stesso tipo', () => {
  // Ogni tipo prende una RIGA sua: le due note condividono la `y`, l'asset e
  // il gruppo stanno su righe diverse. (Una fila per tipo e non una colonna:
  // su un telefono lo spazio che abbonda è quello verticale.)
  const dopo = riordina(tela(), 'tipo');
  const rigaDi = (id) => dopo.find((o) => o.id === id).y;
  assert.equal(rigaDi('a'), rigaDi('b'), 'le due note non stanno sulla stessa riga');
  assert.notEqual(rigaDi('a'), rigaDi('c'), 'una nota e un asset sono finiti insieme');
  assert.notEqual(rigaDi('c'), rigaDi('d'), 'un asset e un gruppo sono finiti insieme');
});

test('«compatta» non riordina: toglie i buchi mantenendo l’ordine', () => {
  /*
   * E' il meno invasivo dei quattro, e serve che resti tale: chi lo preme
   * vuole ritrovare le sue cose dove le aveva messe, solo piu' vicine. Se
   * cambiasse anche l'ordine, sarebbe «per tipo» con un altro nome.
   */
  const prima = tela().filter((o) => o.t !== 'freccia');
  const dopo = riordina(tela(), 'compatta').filter((o) => o.t !== 'freccia');
  const perY = (l) => [...l].sort((p, q) => p.y - q.y || p.x - q.x).map((o) => o.id);
  assert.deepEqual(perY(dopo), perY(prima), '«compatta» ha cambiato l’ordine');
});

test('«compatta» avvicina davvero', () => {
  const ingombro = (l) => {
    const m = l.filter((o) => o.t !== 'freccia');
    const w = Math.max(...m.map((o) => o.x + o.w)) - Math.min(...m.map((o) => o.x));
    const h = Math.max(...m.map((o) => o.y + o.h)) - Math.min(...m.map((o) => o.y));
    return w * h;
  };
  assert.ok(
    ingombro(riordina(tela(), 'compatta')) < ingombro(tela()),
    '«compatta» non ha compattato niente',
  );
});

test('«gruppi» tiene insieme chi sta nello stesso gruppo', () => {
  const conGruppi = [
    { id: 'a', t: 'nota', gruppo: 'g1', x: 900, y: 10, w: 200, h: 120 },
    { id: 'b', t: 'nota', gruppo: 'g1', x: 20, y: 700, w: 200, h: 120 },
    { id: 'c', t: 'nota', gruppo: 'g2', x: 500, y: 300, w: 200, h: 120 },
  ];
  const dopo = riordina(conGruppi, 'gruppi');
  const y = (id) => dopo.find((o) => o.id === id).y;
  assert.equal(y('a'), y('b'), 'due cose dello stesso gruppo sono finite su righe diverse');
  assert.notEqual(y('a'), y('c'), 'gruppi diversi sono finiti sulla stessa riga');
});

test('«frecce» impagina dall’alto in basso seguendo il verso', () => {
  const catena = [
    { id: 'a', t: 'nota', x: 0, y: 0, w: 200, h: 120 },
    { id: 'b', t: 'nota', x: 0, y: 0, w: 200, h: 120 },
    { id: 'c', t: 'nota', x: 0, y: 0, w: 200, h: 120 },
    { id: 'f1', t: 'freccia', da: 'a', a: 'b' },
    { id: 'f2', t: 'freccia', da: 'b', a: 'c' },
  ];
  const dopo = riordina(catena, 'frecce');
  const y = (id) => dopo.find((o) => o.id === id).y;
  assert.ok(y('a') < y('b'), 'a dovrebbe stare sopra b');
  assert.ok(y('b') < y('c'), 'b dovrebbe stare sopra c');
});

test('una regola sconosciuta non tocca la tela', () => {
  // Una regola salvata puo' tornare indietro sbagliata. Non deve ne'
  // esplodere ne' spostare le cose a caso.
  const prima = tela();
  assert.deepEqual(riordina(prima, 'a-caso'), prima);
});

test('le quattro regole restano quattro', () => {
  // Se questo numero cambia e' una decisione, non una cosa che scivola dentro.
  assert.deepEqual([...REGOLE].sort(), ['compatta', 'frecce', 'gruppi', 'tipo']);
});
