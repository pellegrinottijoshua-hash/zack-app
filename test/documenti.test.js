import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KINDS,
  KIND_TESTO,
  ICONE_DOCUMENTO,
  kindFromFile,
  makeAsset,
  iconaDocumento,
  anteprimaTesto,
  titoloDocumento,
} from '../src/store/model.js';

test('un .md portato da fuori viene riconosciuto', () => {
  // È la porta d'ingresso del ponte verso Claude: se il tipo non si riconosce,
  // il file entra con l'etichetta sbagliata e non si apre più.
  assert.equal(kindFromFile('PROJECT-BIBLE.md', 'text/markdown'), 'md');
  assert.equal(kindFromFile('note.markdown', ''), 'md');
  // L'estensione basta: certi sistemi non dichiarano il tipo dei markdown.
  assert.equal(kindFromFile('RIPRENDI-QUI.md', ''), 'md');
  // E il tipo basta: certi file scaricati arrivano senza estensione.
  assert.equal(kindFromFile('scaricato', 'text/markdown'), 'md');
});

test('il .md sta fra i tipi della libreria, e fra quelli di testo', () => {
  assert.ok(KINDS.includes('md'));
  assert.deepEqual(KIND_TESTO, ['md']);
});

test('un documento nasce con la sua icona, e la porta con sé', () => {
  // L'icona non è decorazione: su una tela con venti documenti è l'unica cosa
  // che si legge senza avvicinarsi.
  const a = makeAsset({ name: 'bibbia.md', kind: 'md', bytes: 10, meta: { icona: 'stella' } });
  assert.equal(iconaDocumento(a), 'stella');
});

test('un documento senza icona ne ha comunque una', () => {
  // Un buco nel disegno è peggio di una scelta banale: la scheda resterebbe
  // vuota nel punto in cui l'occhio cerca il tipo.
  const a = makeAsset({ name: 'bibbia.md', kind: 'md', bytes: 10 });
  assert.equal(iconaDocumento(a), ICONE_DOCUMENTO[0]);
});

test('unicona inventata non passa: si torna a quella di partenza', () => {
  const a = makeAsset({ name: 'x.md', kind: 'md', bytes: 1, meta: { icona: 'drago' } });
  assert.equal(iconaDocumento(a), ICONE_DOCUMENTO[0]);
});

test("l'anteprima si ferma, invece di trascinare in scheda un documento intero", () => {
  // La scheda sulla tela mostra un assaggio. Senza tetto, una bibbia da 200 KB
  // finisce dentro un riquadro di 200 px e la tela si impianta.
  const lungo = Array.from({ length: 400 }, (_, i) => `riga ${i}`).join('\n');
  const a = anteprimaTesto(lungo, { righe: 6 });
  assert.equal(a.split('\n').length, 6);
  assert.ok(a.length < lungo.length);
});

test("l'anteprima di un documento corto è il documento", () => {
  assert.equal(anteprimaTesto('una riga sola'), 'una riga sola');
});

test("l'anteprima salta il titolo markdown e le righe vuote in cima", () => {
  // Le prime righe di un .md sono quasi sempre `# Titolo` e una riga vuota:
  // un'anteprima che le mostra dice due volte quello che dice già il nome.
  assert.equal(anteprimaTesto('# The Rug\n\n\nIl tappeto non parla mai.\nMai.', { righe: 2 }),
    'Il tappeto non parla mai.\nMai.');
});

test('il titolo di un documento è il suo primo titolo markdown, se ce l\'ha', () => {
  // Serve a `IDEE.md`: «the-rug-bible.md» dice meno di «The Rug — episodio 1»,
  // e nella panoramica dei progetti conta cosa c'è dentro.
  assert.equal(titoloDocumento('# The Rug — episodio 1\n\ntesto'), 'The Rug — episodio 1');
  assert.equal(titoloDocumento('## Sotto-titolo\ntesto'), 'Sotto-titolo');
});

test('un documento senza titolo non se ne inventa uno', () => {
  // Meglio niente che la prima riga di testo spacciata per titolo.
  assert.equal(titoloDocumento('solo testo, nessun cancelletto'), null);
  assert.equal(titoloDocumento(''), null);
});
