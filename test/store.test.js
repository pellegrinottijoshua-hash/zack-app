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

// ─── organizzazione: colori, icone, note, derivazione ───────────────────────
import {
  FOLDER_COLORS,
  FOLDER_ICONS,
  isFolderColor,
  isFolderIcon,
  cleanNote,
  lineage,
  derivedFrom,
  smartCollections,
} from '../src/store/model.js';

test('colori e icone sono un insieme CHIUSO', () => {
  // Le etichette libere sembrano flessibili e diventano ingestibili: dopo tre
  // mesi si hanno «brand», «Brand» e «branding» e non se ne usa nessuna.
  assert.ok(FOLDER_COLORS.length >= 3 && FOLDER_COLORS.length <= 8, 'pochi, o non si riconoscono');
  assert.ok(FOLDER_ICONS.length >= 4 && FOLDER_ICONS.length <= 12);
  assert.equal(isFolderColor('#C4A35A'), true);
  assert.equal(isFolderColor('#ff0000'), false, 'un colore fuori palette non entra');
  assert.equal(isFolderIcon('stella'), true);
  assert.equal(isFolderIcon('inventata'), false);
});

test('i colori delle cartelle restano dentro la palette JAYL', () => {
  const ammessi = ['#C4A35A', '#8A8A85', '#F5F0E8', '#6E6E6A', '#3D3D3A'];
  for (const c of FOLDER_COLORS) {
    assert.ok(ammessi.includes(c), `${c} è fuori dal marchio`);
  }
});

test('una cartella con colore o icona inventati torna al predefinito', () => {
  const f = makeFolder({ name: 'x', color: '#ff0000', icon: 'inventata', rand: fixedRand, now: fixedNow });
  assert.equal(f.color, FOLDER_COLORS[0]);
  assert.equal(f.icon, FOLDER_ICONS[0]);
});

test('una cartella porta colore, icona e nota', () => {
  const f = makeFolder({
    name: 'Magliette',
    color: '#8A8A85',
    icon: 'maglietta',
    note: '  Le  cose   dell estate  ',
    rand: fixedRand,
    now: fixedNow,
  });
  assert.equal(f.color, '#8A8A85');
  assert.equal(f.icon, 'maglietta');
  assert.equal(f.note, 'Le cose dell estate', 'la nota viene ripulita');
});

test('una nota non può essere infinita', () => {
  const lunga = cleanNote('x'.repeat(1000));
  assert.ok(lunga.length <= 280, `una nota di ${lunga.length} caratteri non è una nota`);
  assert.equal(cleanNote(null), '');
});

test('un asset nasce con nota vuota, non preferito e senza origine', () => {
  const a = makeAsset({ name: 'x', kind: 'png', bytes: 1, rand: fixedRand, now: fixedNow });
  assert.equal(a.note, '');
  assert.equal(a.starred, false);
  assert.equal(a.fromId, null);
});

test('un asset ricorda da quale lavoro deriva', () => {
  const a = makeAsset({ name: 'x', kind: 'png', bytes: 1, meta: { fromId: 'abc' }, rand: fixedRand, now: fixedNow });
  assert.equal(a.fromId, 'abc');
});

const catena = [
  { id: 'a', fromId: null, name: 'foto' },
  { id: 'b', fromId: 'a', name: 'scontornato' },
  { id: 'c', fromId: 'b', name: 'vettoriale' },
  { id: 'd', fromId: 'b', name: 'stampa' },
];

test('la derivazione risale dalla radice al lavoro', () => {
  assert.deepEqual(lineage(catena, 'c').map((a) => a.name), ['foto', 'scontornato', 'vettoriale']);
  assert.deepEqual(lineage(catena, 'a').map((a) => a.name), ['foto']);
});

test('la derivazione non si impianta su dati con un anello', () => {
  const rotto = [
    { id: 'x', fromId: 'y' },
    { id: 'y', fromId: 'x' },
  ];
  const c = lineage(rotto, 'x');
  assert.ok(c.length <= 2, `la catena non deve crescere all'infinito: ${c.length}`);
});

test('derivedFrom elenca i figli diretti', () => {
  assert.deepEqual(derivedFrom(catena, 'b').map((a) => a.name), ['vettoriale', 'stampa']);
  assert.deepEqual(derivedFrom(catena, 'c'), []);
});

test('le raccolte pronte contano quello che serve davvero', () => {
  const now = Date.parse('2026-08-25T12:00:00Z');
  const recente = new Date(now - 2 * 86400000).toISOString();
  const vecchio = new Date(now - 40 * 86400000).toISOString();
  const items = [
    { id: '1', createdAt: recente, starred: true, moodboardIds: ['m'] },
    { id: '2', createdAt: vecchio, starred: false, moodboardIds: [] },
    { id: '3', createdAt: recente, starred: false, moodboardIds: [] },
  ];
  const c = smartCollections(items, now);
  const byId = Object.fromEntries(c.map((x) => [x.id, x.count]));
  assert.equal(byId.recenti, 2);
  assert.equal(byId.preferiti, 1);
  assert.equal(byId.riferimenti, 1);
});
