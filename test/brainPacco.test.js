import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manifesto, scriviIdee, leggiManifesto, percorso, VERSIONE } from '../src/engine/brainPacco.js';
import { nuovoAsset, nuovaNota, nuovoCerchio, nuovaFreccia } from '../src/engine/brain.js';

let seme = 7;
const rand = () => ((seme = (seme * 9301 + 49297) % 233280) / 233280);
const quando = () => new Date('2026-08-26T10:00:00.000Z');

const asset = (id, name, kind = 'png') => ({ id, name, kind, file: `${name}.${kind}`, tags: [], note: '' });

/** Un'idea come quella dell'esempio: un gruppo con dentro un'immagine e una nota. */
function idea() {
  const gruppo = nuovoCerchio({ titolo: 'The Rug', x: 0, y: 0, rand });
  const img = nuovoAsset({ assetId: 'a1', x: 40, y: 40, rand });
  const nota = nuovaNota({ testo: 'il bordo va rifatto', x: 60, y: 120, rand });
  return { items: [gruppo, img, nota], gruppo, img, nota };
}

test('il pacco porta con sé solo i lavori che stanno sulla tela', () => {
  // Esportare l'intera libreria dentro l'idea la renderebbe un archivio, non
  // un'idea: chi la riapre vuole quella cosa lì, non tutto il resto.
  const { items } = idea();
  const m = manifesto(items, [asset('a1', 'tappeto'), asset('a2', 'altro')], { quando });
  assert.equal(m.file.length, 1);
  assert.equal(m.file[0].nome, 'tappeto');
});

test('gli asset si riferiscono al percorso nel pacco, non al loro id', () => {
  // Un id della libreria di chi esporta non significa niente in quella di chi
  // importa: un pacco che si riapre solo sul computer che l'ha fatto non è un
  // salvataggio.
  const { items } = idea();
  const m = manifesto(items, [asset('a1', 'tappeto')], { quando });
  const suTela = m.tela.find((o) => o.t === 'asset');
  assert.equal(suTela.file, 'file/tappeto.png');
});

test('IDEE.md mette sotto il gruppo ciò che sta dentro il gruppo', () => {
  // È l'unica informazione che l'utente ha davvero espresso disponendo le
  // cose: le coordinate, a parole, non dicono niente.
  const { items } = idea();
  const testo = scriviIdee(manifesto(items, [asset('a1', 'tappeto')], { quando }));

  assert.match(testo, /## The Rug/);
  assert.match(testo, /\*\*tappeto\*\*/);
  assert.match(testo, /il bordo va rifatto/);
  assert.ok(!testo.includes('Fuori dai gruppi'), 'era tutto dentro il gruppo');
});

test('ciò che sta fuori da ogni gruppo non si perde', () => {
  const { items } = idea();
  const lontana = nuovaNota({ testo: 'idea slegata', x: 900, y: 900, rand });
  const testo = scriviIdee(manifesto([...items, lontana], [asset('a1', 'tappeto')], { quando }));

  assert.match(testo, /## Fuori dai gruppi/);
  assert.match(testo, /idea slegata/);
});

test('i legami si scrivono a parole, non come coordinate', () => {
  const { items, img, nota } = idea();
  const con = [...items, nuovaFreccia({ da: img.id, a: nota.id, rand })];
  const testo = scriviIdee(manifesto(con, [asset('a1', 'tappeto')], { quando }));

  assert.match(testo, /## Legami/);
  assert.match(testo, /tappeto\.png → nota/);
});

test('un gruppo vuoto lo dice, invece di sparire', () => {
  const vuoto = nuovoCerchio({ titolo: 'Funghissimi', x: 2000, y: 2000, rand });
  const testo = scriviIdee(manifesto([vuoto], [], { quando }));
  assert.match(testo, /## Funghissimi/);
  assert.match(testo, /_Vuoto\._/);
});

test('un pacco di una versione futura si rifiuta con una frase chiara', () => {
  // Aprirlo a metà lascerebbe all'utente una tela con dentro pezzi di
  // qualcos'altro, e nessun modo di sapere cosa manca.
  assert.throws(() => leggiManifesto({ versione: VERSIONE + 1 }), /versione più nuova/);
});

test('uno zip qualunque rinominato non passa per un Brain', () => {
  assert.throws(() => leggiManifesto(null), /non contiene un Brain/);
  assert.throws(() => leggiManifesto('ciao'), /non contiene un Brain/);
});

test('un manifesto valido torna indietro con la tela ripulita', () => {
  const { items } = idea();
  const m = manifesto(items, [asset('a1', 'tappeto')], { quando });
  const riletto = leggiManifesto(JSON.parse(JSON.stringify(m)));

  assert.equal(riletto.nome, 'Brain');
  assert.equal(riletto.tela.length, items.length);
  assert.equal(riletto.file.length, 1);
});

test('un lavoro senza nome di file ne ricava uno leggibile', () => {
  assert.equal(percorso({ name: 'voce', kind: 'wav' }), 'file/voce.wav');
  assert.equal(percorso(null), null);
});
