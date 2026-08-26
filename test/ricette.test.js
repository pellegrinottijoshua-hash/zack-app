import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pianoZack,
  normalizza,
  stessaRicetta,
  RICETTE_DI_FABBRICA,
  PASSI,
} from '../src/engine/ricette.js';

const piccola = { w: 800, h: 600 };
const grande = { w: 4200, h: 3000 };

test('la ricetta di fabbrica dello scontorno fa quello che il committente ha chiesto', () => {
  // "il mio Zack è file in 4000×4000 circa, bg tolto e gomma che ha già
  // ririempito dentro il logo": sfondo via, buchi richiusi, misura di stampa.
  const r = RICETTE_DI_FABBRICA.scontorna;
  assert.ok(r.includes('scontorna'));
  assert.ok(r.includes('buchi'));
  assert.ok(r.includes('ingrandisci'));
});

test('lo scaricamento automatico è spento di fabbrica', () => {
  // Un file che parte da solo verso la cartella Download è una sorpresa, non
  // una comodità. Si accende, non si subisce.
  for (const r of Object.values(RICETTE_DI_FABBRICA)) {
    assert.ok(!r.includes('scarica'), 'nessuna ricetta di fabbrica scarica da sola');
  }
});

test('il piano dice i passi, la misura e l\'attesa prima di premere', () => {
  const piano = pianoZack(RICETTE_DI_FABBRICA.scontorna, piccola);

  assert.deepEqual(piano.passi.slice(0, 2), ['scontorna', 'buchi']);
  assert.ok(piano.secondi > 0, 'senza attesa dichiarata il pulsante mente');
  assert.ok(piano.out.w > piccola.w, 'un file piccolo va ingrandito');
});

test('un file già grande non viene ingrandito, e il piano lo dice', () => {
  // Ingrandire un file che è già alla misura aggiunge solo attesa. Il tasto
  // deve saperlo prima, non scoprirlo dopo.
  const piano = pianoZack(RICETTE_DI_FABBRICA.scontorna, grande);
  assert.ok(!piano.passi.includes('ingrandisci'));
});

test('una ricetta vuota non fa niente e non esplode', () => {
  const piano = pianoZack([], piccola);
  assert.deepEqual(piano.passi, []);
  assert.equal(piano.secondi, 0);
});

test('un passo sconosciuto salvato ieri viene ignorato', () => {
  // Tutto ciò che è salvato può tornare indietro sbagliato: una versione
  // vecchia, un passo tolto dal programma, una chiave scritta a mano. Il
  // tasto non deve né esplodere né eseguire qualcosa che nessuno ha chiesto.
  assert.deepEqual(normalizza(['scontorna', 'teletrasporta', 'esporta']), ['scontorna', 'esporta']);
  assert.deepEqual(normalizza('scontorna'), []);
  assert.deepEqual(normalizza(null), []);
});

test('un passo ripetuto si esegue una volta sola', () => {
  assert.deepEqual(normalizza(['scontorna', 'scontorna']), ['scontorna']);
});

test('la lista dei passi resta chiusa', () => {
  // Ogni passo in più è un'altra cosa che può andare storta in silenzio dentro
  // un tasto solo. Se questo numero cambia, è una decisione: va discussa, non
  // fatta scivolando.
  assert.equal(PASSI.length, 5);
});

test('l\'ordine dei passi è quello della ricetta, non quello della lista', () => {
  // Chi riordina i passi si aspetta che l'ordine conti. Se non contasse,
  // trascinarli sarebbe un gesto senza effetto — peggio di un gesto assente.
  const piano = pianoZack(['esporta', 'scontorna'], piccola);
  assert.deepEqual(piano.passi, ['scontorna', 'esporta']);
});

test('"Zack può ricordarlo" non compare per la ricetta che già hai', () => {
  assert.ok(stessaRicetta(['scontorna', 'buchi'], ['scontorna', 'buchi']));
  assert.ok(!stessaRicetta(['scontorna', 'buchi'], ['buchi', 'scontorna']));
  assert.ok(!stessaRicetta(['scontorna'], ['scontorna', 'buchi']));
});

test('senza immagine il piano si rifiuta di partire', () => {
  assert.throws(() => pianoZack(['scontorna'], null), /Nessuna immagine/);
});
