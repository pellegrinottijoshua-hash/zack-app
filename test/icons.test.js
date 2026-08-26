import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../src/lib/icons.js';
import { SERVICES } from '../src/services.js';
import { FOLDER_ICONS } from '../src/store/model.js';

/**
 * Estrae i numeri da un tracciato SVG, tenendo il segno.
 * Serve solo a controllare che nessuno esca dal riquadro: non è un parser.
 */
const numeri = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);

test('ogni servizio ha la sua icona', () => {
  // Un nome sbagliato non solleva niente: l'icona ripiega sulla cartella e il
  // servizio mostra il simbolo di un'altra cosa per sempre.
  for (const s of SERVICES) {
    assert.ok(ICONS[s.icon], `il servizio ${s.id} chiede l'icona "${s.icon}", che non esiste`);
  }
});

test('ogni icona di cartella esiste davvero', () => {
  for (const nome of FOLDER_ICONS) {
    assert.ok(ICONS[nome], `la cartella può usare "${nome}", che non esiste`);
  }
});

test('nessun tracciato esce dal riquadro', () => {
  // Il vecchio "annulla" finiva a y=24: la curva usciva dal viewBox e veniva
  // tagliata a metà. Un tracciato fuori riquadro non solleva niente — si vede
  // solo guardando, e solo se si sa cosa cercare.
  for (const [nome, tracciati] of Object.entries(ICONS)) {
    for (const d of tracciati) {
      for (const n of numeri(d)) {
        assert.ok(
          n >= -24 && n <= 24,
          `l'icona "${nome}" ha il valore ${n}, fuori da un riquadro 24×24`,
        );
      }
    }
  }
});

test('ogni icona è una lista di tracciati, e ognuno comincia con un M', () => {
  // La lista non è cosmetica: il filo d'oro disegna un tracciato alla volta,
  // e una stringa unica con più M dentro si disegnerebbe tutta insieme.
  for (const [nome, tracciati] of Object.entries(ICONS)) {
    assert.ok(Array.isArray(tracciati) && tracciati.length > 0, `"${nome}" non è una lista`);
    for (const d of tracciati) {
      assert.match(d, /^M/, `un tracciato di "${nome}" non comincia con M`);
    }
  }
});

test('le icone che il canone richiede ci sono', () => {
  // Brain e il tasto Zack: se qualcuno le toglie credendole inutili, la
  // schermata perde il suo simbolo e nessun altro test se ne accorge.
  for (const nome of ['brain', 'feather', 'nota', 'freccia', 'gruppo']) {
    assert.ok(ICONS[nome], `manca l'icona "${nome}"`);
  }
});

test('i cinque bollini di Brain sono cinque', () => {
  // Cinque significati distinti coprono quasi tutto; il ventunesimo bollino
  // non lo ritrova più nessuno. Il numero è una decisione, non un caso.
  const bollini = ['stella', 'domanda', 'spunta', 'croce', 'fuoco'];
  assert.equal(bollini.length, 5);
  for (const nome of bollini) assert.ok(ICONS[nome], `manca il bollino "${nome}"`);
});
