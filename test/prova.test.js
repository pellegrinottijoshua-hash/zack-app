import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHIAVE_PROVA,
  FILE_DI_PROVA,
  caricaFileDiProva,
  deveMostrareProva,
  segnaProvaVista,
} from '../src/engine/prova.js';

/** Un archivio finto: le stesse tre chiamate che usa `localStorage`. */
function archivioFinto(iniziale = {}) {
  const dati = { ...iniziale };
  return {
    dati,
    getItem: (k) => (k in dati ? dati[k] : null),
    setItem: (k, v) => {
      dati[k] = String(v);
    },
  };
}

/** Un archivio che rifiuta, come in una finestra anonima con i dati bloccati. */
const archivioNegato = {
  getItem() {
    throw new Error('negato');
  },
  setItem() {
    throw new Error('negato');
  },
};

test('alla primissima apertura il file di prova si mostra', () => {
  // È tutto il punto: la tela vuota è il difetto che costa di più.
  assert.equal(deveMostrareProva({ archivio: archivioFinto(), lavori: 0 }), true);
});

test('chi ha già dei lavori non si ritrova una maglietta altrui sul piano', () => {
  // Avere lavori in libreria significa aver già passato il primo minuto.
  assert.equal(deveMostrareProva({ archivio: archivioFinto(), lavori: 3 }), false);
});

test('visto una volta, non torna', () => {
  const archivio = archivioFinto();
  segnaProvaVista(archivio);
  assert.equal(archivio.getItem(CHIAVE_PROVA), '1');
  assert.equal(deveMostrareProva({ archivio, lavori: 0 }), false);
});

test('con l archivio negato si mostra lo stesso', () => {
  // Un file di prova di troppo è un difetto piccolo; un primo minuto vuoto no.
  assert.equal(deveMostrareProva({ archivio: archivioNegato, lavori: 0 }), true);
  assert.doesNotThrow(() => segnaProvaVista(archivioNegato));
});

test('senza argomenti si mostra: è il caso della prima apertura assoluta', () => {
  assert.equal(deveMostrareProva(), true);
});

test('il file di prova arriva con nome e tipo, come un file trascinato', async () => {
  // Da qui in poi non è più «un esempio»: segue lo stesso percorso di un file
  // dell'utente, e tutto ciò che si impara su di lui vale davvero.
  const finto = async (url) => {
    assert.equal(url, FILE_DI_PROVA.url);
    return { ok: true, blob: async () => new Blob([new Uint8Array([1, 2, 3])]) };
  };
  const file = await caricaFileDiProva(finto);
  assert.equal(file.name, 'maglietta-jayl.jpg');
  assert.equal(file.type, 'image/jpeg');
  assert.ok(file.size > 0);
});

test('se il file di prova manca lo dice, invece di mettere un file vuoto sul piano', async () => {
  const finto = async () => ({ ok: false, status: 404 });
  await assert.rejects(() => caricaFileDiProva(finto), /404/);
});
