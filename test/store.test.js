import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeName,
  uniqueName,
  makeAsset,
  makeFolder,
  makeMoodboard,
  canMoveFolder,
  folderPath,
  queryAssets,
  allTags,
  normalizeTag,
  isHex,
  newId,
} from '../src/store/model.js';

// Sorgenti deterministiche: un test che dipende dal caso non è un test.
const fixedRand = () => 0.5;
const fixedNow = () => Date.parse('2026-08-25T12:00:00Z');

test('safeName rende un nome usabile senza svuotarlo', () => {
  assert.equal(safeName('  Mio Design  '), 'Mio-Design');
  assert.equal(safeName('a/b\\c:d*e?'), 'abcde');
  assert.equal(safeName(''), 'senza-nome');
  assert.equal(safeName(null), 'senza-nome');
  assert.equal(safeName('...'), 'senza-nome', 'un nome di soli punti non è un nome');
  assert.ok(safeName('x'.repeat(200)).length <= 60);
});

test('uniqueName non sovrascrive mai un nome esistente', () => {
  // Sovrascrivere in silenzio è il difetto peggiore di una libreria.
  const taken = new Set(['logo.png', 'logo-2.png']);
  assert.equal(uniqueName('logo.png', taken), 'logo-3.png');
  assert.equal(uniqueName('nuovo.png', taken), 'nuovo.png');
  assert.equal(uniqueName('senza-estensione', new Set(['senza-estensione'])), 'senza-estensione-2');
});

test("uniqueName conserva l'estensione", () => {
  const out = uniqueName('disegno.svg', ['disegno.svg']);
  assert.ok(out.endsWith('.svg'), `estensione persa: ${out}`);
});

test('makeAsset costruisce un record completo e un nome file coerente', () => {
  const a = makeAsset({ name: 'Mio Logo', kind: 'svg', bytes: 1234, rand: fixedRand, now: fixedNow });
  assert.equal(a.name, 'Mio-Logo');
  assert.equal(a.kind, 'svg');
  assert.equal(a.bytes, 1234);
  assert.equal(a.folderId, null);
  assert.deepEqual(a.tags, []);
  assert.match(a.file, /^Mio-Logo-[a-z0-9]{8}\.svg$/);
  assert.equal(a.createdAt, '2026-08-25T12:00:00.000Z');
});

test('makeAsset rifiuta un tipo che non sappiamo salvare', () => {
  assert.throws(() => makeAsset({ name: 'x', kind: 'pdf' }), /Tipo sconosciuto/);
});

test('una cartella non può finire dentro se stessa o in un suo discendente', () => {
  // È il modo in cui un albero diventa un ciclo e l'interfaccia si impianta.
  const folders = [
    { id: 'a', parentId: null },
    { id: 'b', parentId: 'a' },
    { id: 'c', parentId: 'b' },
  ];
  assert.equal(canMoveFolder(folders, 'a', 'a'), false, 'dentro se stessa');
  assert.equal(canMoveFolder(folders, 'a', 'c'), false, 'dentro un nipote');
  assert.equal(canMoveFolder(folders, 'a', 'b'), false, 'dentro un figlio');
  assert.equal(canMoveFolder(folders, 'c', 'a'), true, 'verso un antenato va bene');
  assert.equal(canMoveFolder(folders, 'b', null), true, 'alla radice va sempre bene');
});

test('folderPath non si impianta su un ciclo già presente nei dati', () => {
  const rotto = [
    { id: 'a', name: 'A', parentId: 'b' },
    { id: 'b', name: 'B', parentId: 'a' },
  ];
  const p = folderPath(rotto, 'a');
  assert.ok(p.length <= 2, `il percorso non deve crescere all'infinito: ${p.join('/')}`);
});

test('folderPath legge dalla radice in giù', () => {
  const folders = [
    { id: 'a', name: 'Progetti', parentId: null },
    { id: 'b', name: 'Magliette', parentId: 'a' },
  ];
  assert.deepEqual(folderPath(folders, 'b'), ['Progetti', 'Magliette']);
  assert.deepEqual(folderPath(folders, null), []);
});

const assets = [
  { id: '1', name: 'gatto.png', kind: 'png', folderId: null, tags: ['animali'], moodboardIds: ['m1'], createdAt: '2026-08-01T00:00:00Z' },
  { id: '2', name: 'logo.svg', kind: 'svg', folderId: 'f1', tags: ['brand'], moodboardIds: [], createdAt: '2026-08-03T00:00:00Z' },
  { id: '3', name: 'gattino.svg', kind: 'svg', folderId: 'f1', tags: ['animali', 'brand'], moodboardIds: ['m1'], createdAt: '2026-08-02T00:00:00Z' },
];

test('queryAssets filtra per cartella, tag, tipo e ricerca', () => {
  assert.deepEqual(queryAssets(assets, { folderId: 'f1' }).map((a) => a.id), ['2', '3']);
  assert.deepEqual(queryAssets(assets, { tag: 'animali' }).map((a) => a.id), ['3', '1']);
  assert.deepEqual(queryAssets(assets, { kind: 'svg' }).map((a) => a.id), ['2', '3']);
  assert.deepEqual(queryAssets(assets, { search: 'gatt' }).map((a) => a.id), ['3', '1']);
  assert.deepEqual(queryAssets(assets, { moodboardId: 'm1' }).map((a) => a.id), ['3', '1']);
});

test('la ricerca non distingue maiuscole e ignora spazi ai bordi', () => {
  assert.equal(queryAssets(assets, { search: '  LOGO ' }).length, 1);
});

test('senza filtri escono tutti, dal più recente', () => {
  assert.deepEqual(queryAssets(assets).map((a) => a.id), ['2', '3', '1']);
});

test('i filtri si combinano', () => {
  assert.deepEqual(queryAssets(assets, { folderId: 'f1', tag: 'animali' }).map((a) => a.id), ['3']);
});

test('allTags conta e ordina dal più usato', () => {
  assert.deepEqual(allTags(assets), [
    { tag: 'animali', count: 2 },
    { tag: 'brand', count: 2 },
  ]);
});

test('normalizeTag ripulisce e rifiuta il vuoto', () => {
  assert.equal(normalizeTag('  Estate   2026 '), 'estate 2026');
  assert.equal(normalizeTag('   '), null);
  assert.equal(normalizeTag(null), null);
  assert.ok(normalizeTag('x'.repeat(100)).length <= 30);
});

test('la moodboard accetta solo colori validi', () => {
  const m = makeMoodboard({ name: 'Estate', palette: ['#C4A35A', 'rosso', '#111111'], rand: fixedRand, now: fixedNow });
  assert.deepEqual(m.palette, ['#C4A35A', '#111111']);
  assert.equal(isHex('#fff'), false, 'la forma a tre cifre non è ammessa: crea ambiguità');
});

test('gli id sono lunghi otto caratteri e usano un alfabeto sicuro', () => {
  const id = newId(fixedRand);
  assert.equal(id.length, 8);
  assert.match(id, /^[a-z0-9]{8}$/);
});

test('makeFolder normalizza il nome come gli asset', () => {
  const f = makeFolder({ name: '  Le / Mie Cose  ', rand: fixedRand, now: fixedNow });
  assert.equal(f.name, 'Le-Mie-Cose');
  assert.equal(f.parentId, null);
});
