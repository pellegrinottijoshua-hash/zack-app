import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENSO, KIND_VOCE, consensoNonValido, fileVoce, leggiVoce, nomeVoce, testoConsenso, vociDellaLibreria,
} from '../src/engine/voci.js';
import {
  CAMPIONE_MAX_BYTE, DESCRIZIONE_MIN, MISURA_CAMBIO, MISURA_CLONAZIONE, MISURA_DISEGNO, VOCI_PRONTE,
  descrizioneNonValida, durataWav, letturaNonValida, nomeVoceNonValido, prezzoCambio, prezzoClonazione,
  prezzoDisegno, voceAmmessa,
} from '../src/engine/listinoVoce.js';
import { KINDS, iconaDocumento, kindFromFile } from '../src/store/model.js';
import { DESTINAZIONI, destinazioniSu } from '../src/engine/pocket.js';
import { priceFor } from '../src/engine/ledger.js';

/* Le voci come file, il consenso, e i listini di 6b e 6c (puri). */

/** Un WAV PCM: `secondi` di silenzio al formato dato. */
export function wav(secondi, { frequenza = 16000, canali = 1, bit = 16, coda = 0 } = {}) {
  const dati = Math.round(secondi * frequenza) * canali * (bit / 8);
  const b = new Uint8Array(44 + dati + coda);
  const v = new DataView(b.buffer);
  const scrivi = (o, s) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  scrivi(0, 'RIFF');
  v.setUint32(4, 36 + dati, true);
  scrivi(8, 'WAVE');
  scrivi(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, canali, true);
  v.setUint32(24, frequenza, true);
  v.setUint32(28, frequenza * canali * (bit / 8), true);
  v.setUint16(32, canali * (bit / 8), true);
  v.setUint16(34, bit, true);
  scrivi(36, 'data');
  v.setUint32(40, dati, true);
  return b;
}

test('una voce è un tipo di file, con l’onda per faccia, e torna dal pacco', () => {
  assert.ok(KINDS.includes(KIND_VOCE));
  assert.equal(iconaDocumento({ kind: 'voce' }), 'wave');
  assert.equal(kindFromFile('george-abc.voce'), 'voce');
});

test('il file di una voce: si scrive e si rilegge; un file qualunque non è una voce', () => {
  const testo = fileVoce({ id: 'el-1', nome: 'Nonna', nota: 'calda', origine: 'clonata', consenso: 'c-1' });
  assert.deepEqual(leggiVoce(testo), { id: 'el-1', nome: 'Nonna', nota: 'calda', origine: 'clonata', consenso: 'c-1' });
  assert.equal(leggiVoce('# un prompt'), null);
  assert.equal(leggiVoce('{"tipo":"voce"}'), null, 'una voce senza id non serve a niente');
  assert.throws(() => fileVoce({ nome: 'x' }), /voce-senza-id/);
});

test('le voci della libreria, dalla più recente', () => {
  const a = [
    { id: '1', kind: 'voce', createdAt: '2026-10-01' },
    { id: '2', kind: 'mp3', createdAt: '2026-10-05' },
    { id: '3', kind: 'voce', createdAt: '2026-10-03' },
  ];
  assert.deepEqual(vociDellaLibreria(a).map((x) => x.id), ['3', '1']);
});

test('il nome del file di una voce non è mai vuoto', () => {
  assert.equal(nomeVoce('  la   mia voce '), 'la mia voce');
  assert.equal(nomeVoce(''), 'voce');
});

test('⚠️ il consenso: due scelte, e «ho il permesso» vuole il nome di chi parla', () => {
  assert.equal(consensoNonValido(null), 'senza-consenso');
  assert.equal(consensoNonValido({ scelta: 'boh' }), 'senza-consenso');
  assert.equal(consensoNonValido({ scelta: 'mia' }), null);
  assert.equal(consensoNonValido({ scelta: 'permesso' }), 'senza-nome-di-chi-parla');
  assert.equal(consensoNonValido({ scelta: 'permesso', chiParla: '   ' }), 'senza-nome-di-chi-parla');
  assert.equal(consensoNonValido({ scelta: 'permesso', chiParla: 'x'.repeat(81) }), 'nome-troppo-lungo');
  assert.equal(consensoNonValido({ scelta: 'permesso', chiParla: 'Marta' }), null);
});

test('il testo del consenso è quello mostrato, col nome e la versione', () => {
  assert.equal(testoConsenso({ scelta: 'mia' }), `${CONSENSO.mia} (${CONSENSO.versione})`);
  const t = testoConsenso({ scelta: 'permesso', chiParla: ' Marta ' });
  assert.ok(t.includes('Questa voce è di Marta.'));
  assert.ok(t.endsWith(`(${CONSENSO.versione})`));
});

test('una voce posata sul Vocale lo sceglie; sugli altri servizi no', () => {
  assert.deepEqual(DESTINAZIONI.voce, ['pocket', 'vocale-voce', 'brain']);
  assert.deepEqual(destinazioniSu('vocale', 'voce'), ['vocale-voce']);
  assert.deepEqual(destinazioniSu('immagine', 'voce'), []);
  assert.deepEqual(destinazioniSu('vocale', 'png'), []);
});

test('⚠️ una voce propria si usa solo se il Worker l’ha trovata per QUESTO conto', () => {
  assert.equal(voceAmmessa(VOCI_PRONTE[0].id), true);
  assert.equal(voceAmmessa('el-mia'), false);
  assert.equal(voceAmmessa('el-mia', ['el-mia']), true);
  assert.equal(letturaNonValida({ testo: 'ciao', voce: 'el-mia', proprie: ['el-mia'] }), null);
  assert.equal(letturaNonValida({ testo: 'ciao', voce: 'el-altrui', proprie: ['el-mia'] }), 'voce-sconosciuta');
});

test('⚠️ senza misura, nessun prezzo per disegnare, clonare, cambiare', () => {
  assert.equal(MISURA_DISEGNO, null);
  assert.equal(MISURA_CLONAZIONE, null);
  assert.equal(MISURA_CAMBIO, null);
  assert.equal(prezzoDisegno(), null);
  assert.equal(prezzoClonazione(), null);
  assert.equal(prezzoCambio(10), null);
});

test('con una misura: prezzi fissi per disegno e clonazione, a secondo per il cambio', () => {
  assert.deepEqual(prezzoDisegno(40), priceFor(40));
  assert.deepEqual(prezzoClonazione(100), priceFor(100));
  assert.deepEqual(prezzoCambio(10, 3), priceFor(30));
  assert.deepEqual(prezzoCambio(9.2, 3), priceFor(30), 'il secondo iniziato si paga intero');
  assert.deepEqual(prezzoCambio(0, 3), priceFor(3), 'mai zero');
});

test('descrizione e nome di una voce', () => {
  assert.equal(descrizioneNonValida('corta'), 'descrizione-corta');
  assert.equal(descrizioneNonValida('a'.repeat(DESCRIZIONE_MIN)), null);
  assert.equal(descrizioneNonValida('a'.repeat(1001)), 'descrizione-lunga');
  assert.equal(nomeVoceNonValido(' '), 'senza-nome');
  assert.equal(nomeVoceNonValido('Nonna'), null);
  assert.ok(CAMPIONE_MAX_BYTE >= 1024 * 1024);
});

test('⚠️ la durata si legge dal WAV, e solo dal WAV che ci aspettiamo', () => {
  assert.equal(durataWav(wav(2.5)), 2.5);
  assert.equal(durataWav(wav(1, { frequenza: 44100 })), null, 'un’altra frequenza non si conta');
  assert.equal(durataWav(wav(1, { canali: 2 })), null);
  assert.equal(durataWav(new Uint8Array(10)), null);
  assert.equal(durataWav(new TextEncoder().encode('x'.repeat(100))), null);
  assert.equal(durataWav(wav(1, { coda: 32000 })), null, 'audio nascosto dopo `data` non passa');
  // Un `data` che dichiara più di quanto c'è: si contano i byte veri.
  const corto = wav(2).slice(0, 44 + 16000);
  assert.equal(durataWav(corto), 0.5);
});
