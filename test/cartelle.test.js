import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuovoAsset, nuovoCerchio, nuovaFreccia, normalizzaTela, aggiorna, ICONA, TIPI } from '../src/engine/brain.js';
import {
  livello,
  discendenti,
  percorso,
  livelloValido,
  mettiIn,
  posaSu,
  togliTutto,
  suLivello,
  iconaSotto,
} from '../src/engine/cartelle.js';
import { riordina } from '../src/engine/riordina.js';

let seme = 0;
const rand = () => ((seme = (seme * 9301 + 49297) % 233280) / 233280);

/** Tre file sulla tela di fuori, e una freccia fra i primi due. */
function tela() {
  const a = nuovoAsset({ assetId: 'A', x: 0, y: 0, rand });
  const b = nuovoAsset({ assetId: 'B', x: 300, y: 0, rand });
  const c = nuovoAsset({ assetId: 'C', x: 600, y: 0, rand });
  return [a, b, c, nuovaFreccia({ da: a.id, a: b.id, rand })];
}

test('la cartella è un tipo della tela', () => {
  assert.ok(TIPI.includes('cartella'));
});

test('icona su icona: nasce una cartella con la faccia e il nome della madre', () => {
  const items = tela();
  const [a, b] = items;
  const { items: dopo, cartella } = posaSu(items, a.id, b.id, { nome: 'Madre', rand });
  const c = dopo.find((o) => o.id === cartella);
  assert.equal(c.t, 'cartella');
  assert.equal(c.faccia, 'B');
  assert.equal(c.titolo, 'Madre');
  // Al posto della madre, con la misura di un'icona.
  assert.deepEqual([c.x, c.y, c.w, c.h], [b.x, b.y, ICONA, ICONA]);
  assert.equal(c.in, undefined);
  assert.equal(dopo.find((o) => o.id === a.id).in, cartella);
  assert.equal(dopo.find((o) => o.id === b.id).in, cartella);
  // Dentro, accanto e non uno sopra l'altro.
  const dentro = livello(dopo, cartella).filter((o) => o.t === 'asset');
  assert.notDeepEqual([dentro[0].x, dentro[0].y], [dentro[1].x, dentro[1].y]);
});

test('su una cartella ci si entra; su un gruppo o su se stessi non succede niente', () => {
  const items = tela();
  const [a, b, c] = items;
  const { items: con, cartella } = posaSu(items, a.id, b.id, { rand });
  const { items: dopo, cartella: dove } = posaSu(con, c.id, cartella, { rand });
  assert.equal(dove, cartella);
  assert.equal(dopo.find((o) => o.id === c.id).in, cartella);

  const g = nuovoCerchio({ rand });
  const conGruppo = [...items, g];
  assert.equal(posaSu(conGruppo, a.id, g.id).items, conGruppo);
  assert.equal(posaSu(conGruppo, a.id, a.id).items, conGruppo);
  assert.equal(posaSu(conGruppo, a.id, a.id).cartella, null);
});

test('le cartelle si annidano, ma una cartella non entra mai in un suo discendente', () => {
  const items = tela();
  const [a, b, c] = items;
  const { items: uno, cartella: fuori } = posaSu(items, a.id, b.id, { rand });
  // Dentro `fuori`, c su a: una cartella nella cartella.
  const conC = mettiIn(uno, c.id, fuori);
  const { items: due, cartella: sotto } = posaSu(conC, c.id, a.id, { rand });
  assert.equal(due.find((o) => o.id === sotto).in, fuori);
  assert.deepEqual(
    percorso(due, sotto).map((o) => o.id),
    [fuori, sotto],
  );
  assert.ok(discendenti(due, fuori).has(c.id));
  // `fuori` dentro `sotto` la farebbe sparire con tutto quello che tiene.
  assert.equal(mettiIn(due, fuori, sotto), due);
  assert.equal(posaSu(due, fuori, sotto).cartella, null);
  assert.equal(mettiIn(due, fuori, fuori), due);
});

test('un livello mostra i suoi oggetti, e solo le frecce coi due capi lì', () => {
  const items = tela();
  const [a, b, c, f] = items;
  assert.deepEqual(livello(items).map((o) => o.id), [a.id, b.id, c.id, f.id]);
  // b entra in una cartella fatta con c: la freccia a→b si nasconde.
  const { items: dopo, cartella } = posaSu(items, b.id, c.id, { rand });
  assert.ok(!livello(dopo).some((o) => o.id === f.id));
  assert.ok(dopo.some((o) => o.id === f.id), 'nascosta, non cancellata');
  // Uscendo, b torna fuori (al primo posto libero) e la freccia ricompare.
  const fuori = mettiIn(dopo, b.id, null);
  assert.equal(fuori.find((o) => o.id === b.id).in, undefined);
  assert.ok(livello(fuori).some((o) => o.id === f.id));
  assert.ok(livello(dopo, cartella).some((o) => o.id === b.id));
});

test('togliere una cartella toglie dalla tela anche quello che tiene, e le sue frecce', () => {
  const items = tela();
  const [a, b, c] = items;
  const { items: dopo, cartella } = posaSu(items, b.id, c.id, { rand });
  const via = togliTutto(dopo, cartella);
  assert.deepEqual(via.map((o) => o.id), [a.id]);
});

test('una tela salvata con cartelle perse o in giro torna fuori, non sparisce', () => {
  const items = tela();
  const [a, b] = items;
  const persa = normalizzaTela([{ ...a, in: 'non-esiste' }, b]);
  assert.equal(persa[0].in, undefined);

  const c1 = { id: 'c1', t: 'cartella', titolo: '', faccia: 'A', x: 0, y: 0, w: ICONA, h: ICONA, in: 'c2' };
  const c2 = { id: 'c2', t: 'cartella', titolo: '', faccia: 'B', x: 0, y: 0, w: ICONA, h: ICONA, in: 'c1' };
  const giro = normalizzaTela([c1, c2, { ...b, in: 'c1' }]);
  assert.ok(giro.every((o) => o.in === undefined));
  // Quella buona resta dov'è.
  const buona = normalizzaTela([{ ...c1, in: undefined }, { ...a, in: 'c1' }]);
  assert.equal(buona[1].in, 'c1');
});

test('livelloValido: una cartella tolta rimette fuori', () => {
  const items = tela();
  const [a, b] = items;
  const { items: dopo, cartella } = posaSu(items, a.id, b.id, { rand });
  assert.equal(livelloValido(dopo, cartella), cartella);
  assert.equal(livelloValido(togliTutto(dopo, cartella), cartella), null);
  assert.equal(livelloValido(dopo, null), null);
});

test('il riordino di una cartella aperta non muove la tela di fuori', () => {
  const items = tela();
  const [a, b, c] = items;
  const { items: dopo, cartella } = posaSu(items, a.id, b.id, { rand });
  const riordinata = suLivello(dopo, cartella, (qui) => riordina(qui, 'compatta'));
  assert.deepEqual(riordinata.find((o) => o.id === c.id), dopo.find((o) => o.id === c.id));
  assert.deepEqual(riordinata.find((o) => o.id === cartella), dopo.find((o) => o.id === cartella));
  // «per tipo» conosce le cartelle: non restano dov'erano, sopra gli altri.
  const perTipo = riordina(livello(dopo), 'tipo');
  const posti = perTipo.filter((o) => o.t !== 'freccia').map((o) => `${o.x},${o.y}`);
  assert.equal(new Set(posti).size, posti.length);
});

test('iconaSotto conta il cerchio, il livello e chi sta sopra', () => {
  const items = tela();
  const [a, b] = items;
  const r = ICONA / 2;
  assert.equal(iconaSotto(items, b.x + r, b.y + r, { escluso: a.id }).id, b.id);
  // L'angolo del quadrato è fuori dal cerchio.
  assert.equal(iconaSotto(items, b.x + 2, b.y + 2), null);
  assert.equal(iconaSotto(items, b.x + r, b.y + r, { escluso: b.id }), null);
  assert.equal(iconaSotto(items, b.x + r, b.y + r, { dentro: 'altrove' }), null);
});

test('la faccia del cast si sceglie da una lista chiusa', () => {
  const [a] = tela();
  assert.equal(aggiorna([a], a.id, { icona: 'zack' })[0].icona, 'zack');
  assert.equal(aggiorna([a], a.id, { icona: 'drago' })[0].icona, undefined);
  assert.equal(aggiorna([{ ...a, icona: 'cat' }], a.id, { icona: null })[0].icona, null);
});

test('un oggetto nuovo nasce nel livello aperto, accanto agli altri', async () => {
  const { aggiungi } = await import('../src/engine/cartelle.js');
  const items = tela();
  const [a, b] = items;
  const { items: dopo, cartella } = posaSu(items, a.id, b.id, { rand });
  const nuovo = nuovoAsset({ assetId: 'N', rand });
  const con = aggiungi(dopo, nuovo, cartella);
  const n = con.find((o) => o.id === nuovo.id);
  assert.equal(n.in, cartella);
  const posti = livello(con, cartella).map((o) => `${o.x},${o.y}`);
  assert.equal(new Set(posti).size, posti.length);
  assert.equal(aggiungi(items, nuovo).at(-1).in, undefined);
});

test('il posto libero guarda dove stanno le cose, non quante sono', async () => {
  const { aggiungi } = await import('../src/engine/cartelle.js');
  // Due file nelle caselle 0 e 2: il terzo va nella 1, non nella 2.
  const a = nuovoAsset({ assetId: 'A', x: 0, y: 0, rand });
  const b = nuovoAsset({ assetId: 'B', x: 340, y: 0, rand });
  const n = aggiungi([a, b], nuovoAsset({ assetId: 'N', rand })).at(-1);
  assert.deepEqual([n.x, n.y], [170, 0]);
  // Uno spostato a mano a metà strada occupa anche la casella 1.
  const c = nuovoAsset({ assetId: 'C', x: 250, y: 10, rand });
  const m = aggiungi([a, b, c], nuovoAsset({ assetId: 'M', rand })).at(-1);
  assert.deepEqual([m.x, m.y], [510, 0]);
});
