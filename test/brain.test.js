import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nuovoAsset,
  nuovaNota,
  nuovoCerchio,
  nuovaFreccia,
  normalizzaTela,
  muovi,
  aggiorna,
  togli,
  davanti,
  riquadro,
  prossimoPosto,
  COLORI,
  TIPI,
  CATEGORIE,
} from '../src/engine/brain.js';

/** Un generatore prevedibile: gli id contano solo per essere diversi. */
let seme = 0;
const rand = () => ((seme = (seme * 9301 + 49297) % 233280) / 233280);

const tela = () => {
  const a = nuovoAsset({ assetId: 'aaa', x: 0, y: 0, rand });
  const b = nuovaNota({ testo: 'va sul retro', x: 300, y: 0, rand });
  return [a, b, nuovaFreccia({ da: a.id, a: b.id, rand })];
};

test('una nota tiene testo e categoria', () => {
  const n = nuovaNota({ testo: 'chiedere a lei', cat: 'domanda', rand });
  assert.equal(n.testo, 'chiedere a lei');
  assert.equal(n.cat, 'domanda');
});

test('la categoria porta con sé il suo colore', () => {
  // Si sceglie il senso, non la tinta: lasciarli scollegati produce una nota
  // "Da fare" color idea, cioè un'etichetta che mente.
  const n = nuovaNota({ cat: 'task', rand });
  assert.equal(n.colore, CATEGORIE.find((c) => c.id === 'task').colore);
});

test('una categoria inventata ricade su quella di partenza', () => {
  // Le tele salvate mesi fa possono contenere categorie che abbiamo tolto.
  const n = nuovaNota({ cat: 'teletrasporto', rand });
  assert.equal(n.cat, CATEGORIE[0].id);
});

test('cambiare categoria cambia anche il colore', () => {
  const items = [nuovaNota({ cat: 'idea', rand })];
  const dopo = aggiorna(items, items[0].id, { cat: 'fatto' });
  assert.equal(dopo[0].cat, 'fatto');
  assert.equal(dopo[0].colore, CATEGORIE.find((c) => c.id === 'fatto').colore);
});

test('un asset senza lavoro dietro non si crea', () => {
  assert.throws(() => nuovoAsset({ assetId: null, rand }), /senza lavoro dietro/);
});

test('una freccia collega due oggetti, non due punti', () => {
  // Ancorata a coordinate resterebbe indietro appena sposti ciò che collega.
  const items = tela();
  const f = items.find((o) => o.t === 'freccia');
  assert.equal(f.da, items[0].id);
  assert.equal(f.a, items[1].id);
});

test('una freccia che torna su se stessa non si crea', () => {
  assert.throws(() => nuovaFreccia({ da: 'x', a: 'x', rand }), /su se stessa/);
});

test('togliere un oggetto porta via le sue frecce', () => {
  // Lasciarle sarebbe un errore visibile solo al ricaricamento dopo, quando
  // normalizzaTela le butta via e la tela sembra cambiata da sola.
  const items = tela();
  const dopo = togli(items, items[0].id);
  assert.equal(dopo.length, 1);
  assert.equal(dopo[0].t, 'nota');
});

test('una freccia orfana salvata ieri viene scartata al caricamento', () => {
  const items = [...tela()];
  items.splice(0, 1); // l'asset sparisce, la freccia resta
  assert.equal(normalizzaTela(items).length, 1);
});

test('un oggetto di tipo sconosciuto non entra sulla tela', () => {
  assert.deepEqual(normalizzaTela([{ id: 'a', t: 'ologramma' }]), []);
  assert.deepEqual(normalizzaTela('non è una tela'), []);
});

test('spostare sposta solo ciò che si è preso in mano', () => {
  const items = tela();
  const dopo = muovi(items, items[1].id, 10, -5);
  assert.equal(dopo[1].x, 310);
  assert.equal(dopo[1].y, -5);
  assert.equal(dopo[0].x, 0, 'gli altri non si muovono');
});

test('un oggetto non si può rimpicciolire fino a non poterlo più afferrare', () => {
  // Sotto una certa misura non c'è più niente da prendere per ingrandirlo:
  // l'oggetto resta sulla tela e non si recupera.
  const items = tela();
  const dopo = aggiorna(items, items[0].id, { w: 2, h: 2 });
  assert.ok(dopo[0].w >= 60);
  assert.ok(dopo[0].h >= 48);
});

test('portare davanti mette l\'oggetto in fondo alla lista', () => {
  // L'ordine della lista è l'ordine di disegno: ultimo disegnato, sopra tutti.
  const items = tela();
  const dopo = davanti(items, items[0].id);
  assert.equal(dopo[dopo.length - 1].id, items[0].id);
});

test('il riquadro contiene tutto e ignora le frecce', () => {
  const r = riquadro(tela());
  assert.equal(r.x, 0);
  assert.equal(r.w, 500, '300 di distanza più i 200 della nota');
});

test('una tela vuota non ha riquadro, invece di averne uno sbagliato', () => {
  assert.equal(riquadro([]), null);
});

test('i nuovi oggetti non finiscono impilati nello stesso punto', () => {
  // Dieci oggetti nello stesso punto rendono la tela inservibile, e nessuno
  // si mette a spostarli uno per uno.
  const uno = prossimoPosto([]);
  const due = prossimoPosto([nuovaNota({ rand })]);
  assert.notDeepEqual(uno, due);
});

test('la lista dei tipi resta chiusa', () => {
  // Sei oggetti, non venti: è una decisione, non un limite tecnico.
  assert.deepEqual(TIPI, ['asset', 'nota', 'cerchio', 'freccia']);
});

test('ogni categoria ha un colore valido e distinto', () => {
  // Due categorie dello stesso colore sono due etichette che sulla tela si
  // leggono come una sola.
  const tinte = new Set();
  for (const c of CATEGORIE) {
    assert.match(c.colore, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(!tinte.has(c.colore), `${c.id} ripete un colore già usato`);
    tinte.add(c.colore);
  }
  assert.ok(COLORI.length >= 3, 'i cerchi usano ancora i colori delle cartelle');
});

test('un titolo lunghissimo su un cerchio viene ripulito', () => {
  const c = nuovoCerchio({ titolo: '  spazi  ', rand });
  assert.equal(c.titolo, 'spazi');
});

// ---------------------------------------------------------------------------
// La porta d'ingresso: che tipo è un file portato da fuori.
// ---------------------------------------------------------------------------

test('il tipo si riconosce dall\'estensione', async () => {
  const { kindFromFile } = await import('../src/store/model.js');
  assert.equal(kindFromFile('foto.JPG'), 'jpg');
  assert.equal(kindFromFile('voce.wav'), 'wav');
  assert.equal(kindFromFile('clip.mp4'), 'mp4');
  assert.equal(kindFromFile('logo.svg'), 'svg');
});

test('il tipo si riconosce anche senza estensione', async () => {
  // I file scaricati da certi siti arrivano senza estensione: rifiutarli
  // manderebbe l'utente a rinominarli a mano prima di poterli usare.
  const { kindFromFile } = await import('../src/store/model.js');
  assert.equal(kindFromFile('scaricato', 'image/png'), 'png');
  assert.equal(kindFromFile('', 'video/webm'), 'webm');
});

test('un tipo che non sappiamo tenere si dichiara, non si indovina', async () => {
  // Salvare un .psd con l'etichetta "png" è un errore che si scopre mesi
  // dopo, quando il file non si apre più.
  const { kindFromFile } = await import('../src/store/model.js');
  assert.equal(kindFromFile('progetto.psd', 'image/vnd.adobe.photoshop'), null);
});
