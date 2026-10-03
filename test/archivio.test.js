import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cestina,
  rimetti,
  inCestino,
  dividi,
  pool,
  livelloSpazio,
  pesoCestino,
  POOL_VISIBILI,
} from '../src/engine/archivio.js';

// Ogni prova dichiara l'archivio da cui parte: mai uno stato ereditato.

const ora = () => Date.parse('2026-10-03T12:00:00Z');
const file = (id, giorno, extra = {}) => ({ id, name: id, createdAt: `2026-09-${giorno}T10:00:00Z`, bytes: 100, ...extra });

test('cestinare scrive la data, rimettere la toglie, e niente altro cambia', () => {
  const a = file('a', '01', { folderId: 'f1', tags: ['x'] });
  const c = cestina(a, ora);
  assert.equal(c.cestinatoIl, '2026-10-03T12:00:00.000Z');
  assert.equal(inCestino(c), true);
  assert.equal(c.folderId, 'f1'); // resta dov'era: chi lo rimette lo ritrova lì
  const r = rimetti(c);
  assert.equal(inCestino(r), false);
  assert.deepEqual({ ...r, cestinatoIl: undefined }, { ...a, cestinatoIl: undefined });
  assert.equal(a.cestinatoIl, undefined); // puro
});

test('dividere: vivi e cestino, il cestino dal più recente', () => {
  const assets = [
    file('a', '01'),
    file('b', '02', { cestinatoIl: '2026-10-01T00:00:00Z' }),
    file('c', '03', { cestinatoIl: '2026-10-02T00:00:00Z' }),
    file('d', '04', { cestinatoIl: null }), // rimesso: vivo
  ];
  const { vivi, cestino } = dividi(assets);
  assert.deepEqual(vivi.map((a) => a.id), ['a', 'd']);
  assert.deepEqual(cestino.map((a) => a.id), ['c', 'b']);
});

test('la pool: i vivi dal più recente, mai un cestinato', () => {
  const assets = [file('vecchio', '01'), file('nuovo', '20'), file('buttato', '25', { cestinatoIl: '2026-10-01T00:00:00Z' })];
  assert.deepEqual(pool(assets).mostrati.map((a) => a.id), ['nuovo', 'vecchio']);
});

test('la pool: 20 visibili, e dice quanti ne restano', () => {
  const assets = Array.from({ length: 27 }, (_, i) => file(`f${i}`, String(i + 1).padStart(2, '0')));
  const { mostrati, restano } = pool(assets);
  assert.equal(POOL_VISIBILI, 20);
  assert.equal(mostrati.length, 20);
  assert.equal(mostrati[0].id, 'f26');
  assert.equal(restano, 7);
  assert.equal(pool(assets, { quanti: 40 }).restano, 0);
});

test('la pool cerca nel nome, nella nota e nei tag, senza badare alle maiuscole', () => {
  const assets = [
    file('Maglietta-oro', '01'),
    file('b', '02', { note: 'per il DROP di ottobre' }),
    file('c', '03', { tags: ['Zack'] }),
    file('d', '04'),
  ];
  assert.deepEqual(pool(assets, { cerca: 'maglietta' }).mostrati.map((a) => a.id), ['Maglietta-oro']);
  assert.deepEqual(pool(assets, { cerca: 'drop' }).mostrati.map((a) => a.id), ['b']);
  assert.deepEqual(pool(assets, { cerca: ' zack ' }).mostrati.map((a) => a.id), ['c']);
  assert.equal(pool(assets, { cerca: '' }).mostrati.length, 4);
});

test('lo spazio: senza una misura non c\'è un avviso', () => {
  assert.equal(livelloSpazio({ used: null, quota: null }), 'ignoto');
  assert.equal(livelloSpazio({ used: 10, quota: 0 }), 'ignoto');
  assert.equal(livelloSpazio(), 'ignoto');
  assert.equal(livelloSpazio({ used: 79, quota: 100 }), 'ok');
  assert.equal(livelloSpazio({ used: 80, quota: 100 }), 'attento');
  assert.equal(livelloSpazio({ used: 95, quota: 100 }), 'pieno');
});

test('il peso del cestino conta solo i cestinati', () => {
  const assets = [file('a', '01', { bytes: 500 }), file('b', '02', { bytes: 300, cestinatoIl: '2026-10-01T00:00:00Z' })];
  assert.equal(pesoCestino(assets), 300);
});
