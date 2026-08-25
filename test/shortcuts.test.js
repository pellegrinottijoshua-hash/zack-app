import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveShortcut, isTyping, SHORTCUTS } from '../src/engine/shortcuts.js';

const ev = (key, opts = {}) => ({ key, target: { tagName: 'BODY' }, ...opts });

test('le lettere scelgono lo strumento', () => {
  assert.equal(resolveShortcut(ev('v')), 'tool:select');
  assert.equal(resolveShortcut(ev('r')), 'tool:rect');
  assert.equal(resolveShortcut(ev('T')), 'tool:text', 'le maiuscole valgono come le minuscole');
});

test('annulla e ripeti si distinguono per lo shift', () => {
  assert.equal(resolveShortcut(ev('z', { metaKey: true })), 'undo');
  assert.equal(resolveShortcut(ev('z', { metaKey: true, shiftKey: true })), 'redo');
  // Su Windows e Linux si usa Ctrl invece di Cmd.
  assert.equal(resolveShortcut(ev('z', { ctrlKey: true })), 'undo');
});

test('raggruppa e separa si distinguono per lo shift', () => {
  assert.equal(resolveShortcut(ev('g', { metaKey: true })), 'group');
  assert.equal(resolveShortcut(ev('g', { metaKey: true, shiftKey: true })), 'ungroup');
});

test('una lettera con il tasto comando non cambia strumento', () => {
  // Cmd+R ricarica la pagina: non deve anche cambiare strumento.
  assert.equal(resolveShortcut(ev('r', { metaKey: true })), null);
});

test('le frecce spostano, con shift spostano di piu', () => {
  assert.equal(resolveShortcut(ev('ArrowLeft')), 'nudge:-1,0');
  assert.equal(resolveShortcut(ev('ArrowLeft', { shiftKey: true })), 'nudge:-10,0');
  assert.equal(resolveShortcut(ev('ArrowDown', { shiftKey: true })), 'nudge:0,10');
});

test('mentre si scrive nessuna scorciatoia agisce', () => {
  // È il caso che rovinerebbe tutto: "Canc" mentre rinomini un livello.
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    assert.equal(resolveShortcut({ key: 'Delete', target: { tagName: tag } }), null, tag);
    assert.equal(resolveShortcut({ key: 'r', target: { tagName: tag } }), null, tag);
  }
  assert.equal(
    resolveShortcut({ key: 'Delete', target: { tagName: 'DIV', isContentEditable: true } }),
    null,
  );
});

test('isTyping riconosce i campi ma non il resto', () => {
  assert.equal(isTyping({ tagName: 'INPUT' }), true);
  assert.equal(isTyping({ tagName: 'DIV' }), false);
  assert.equal(isTyping(null), false);
});

test('un tasto senza scorciatoia non restituisce nulla', () => {
  assert.equal(resolveShortcut(ev('q')), null);
  assert.equal(resolveShortcut(null), null);
});

test('nessuna scorciatoia è definita due volte con la stessa combinazione', () => {
  const seen = new Set();
  for (const s of SHORTCUTS) {
    for (const k of s.keys) {
      const combo = `${k}|${Boolean(s.mod)}|${Boolean(s.shift)}`;
      assert.equal(seen.has(combo), false, `combinazione doppia: ${combo}`);
      seen.add(combo);
    }
  }
});
