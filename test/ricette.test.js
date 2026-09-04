import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pianoZack,
  commutaPasso,
  commutaFattore,
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

/*
 * `ridimensiona:<fattore>` — lo studio impara i fattori.
 *
 * Il buco che chiude (2026-08-28): la home offre `x4 x2 :2 :4`, che sono
 * FATTORI; lo studio aveva solo `ingrandisci`, che non e' un fattore ma
 * «portalo alla misura di stampa» — di quanto lo decide il file. Le due
 * lingue non si parlavano, quindi il tasto personalizzato sulla home non
 * poteva seguire l'utente dentro l'app.
 *
 * E lo studio non sapeva RIMPICCIOLIRE affatto. La tavola dei tasti che il
 * committente ha disegnato — INGRANDISCI, RIMPICCIOLISCI, 4X, 2X, :2, :4 —
 * dice che deve saperlo.
 *
 * Il fattore sta dentro il nome del passo (`ridimensiona:x4`) e non in un
 * campo a parte: cosi' una catena resta una LISTA DI STRINGHE, che e' la
 * regola scritta in cima a ricette.js — «una catena e' una lista, non un
 * programma». Un passo con dei parametri accanto sarebbe il primo passo verso
 * un costruttore di flussi di lavoro, cioe' la cosa che stiamo evitando.
 */

test('i quattro fattori sono passi validi', () => {
  for (const f of ['x4', 'x2', 'd2', 'd4']) {
    assert.deepEqual(normalizza([`ridimensiona:${f}`]), [`ridimensiona:${f}`]);
  }
});

test('un fattore inventato viene buttato via, non eseguito', () => {
  // Una ricetta salvata puo' tornare indietro sbagliata: da una versione
  // vecchia, da una chiave scritta a mano. Un fattore sconosciuto non deve
  // far esplodere il tasto ne' eseguire qualcosa che nessuno ha chiesto.
  assert.deepEqual(normalizza(['ridimensiona:x99']), []);
  assert.deepEqual(normalizza(['ridimensiona']), []);
  assert.deepEqual(normalizza(['ridimensiona:']), []);
});

test('un solo ridimensiona per catena', () => {
  // Sono una scelta, non quattro interruttori: x4 e :4 insieme farebbero
  // aspettare mezzo minuto per tornare da dove si e' partiti.
  assert.deepEqual(normalizza(['ridimensiona:x4', 'ridimensiona:d2']), ['ridimensiona:x4']);
});

test('il fattore esplicito batte l ingrandimento automatico', () => {
  // Rispondono alla stessa domanda — «quanto grande?» — e non possono
  // convivere. Vince chi l'ha detto esplicitamente: `ingrandisci` e' il
  // valore di fabbrica, `ridimensiona:x4` e' una scelta di qualcuno.
  assert.deepEqual(normalizza(['ingrandisci', 'ridimensiona:x2']), ['ridimensiona:x2']);
  assert.deepEqual(normalizza(['ridimensiona:x2', 'ingrandisci']), ['ridimensiona:x2']);
});

test('rimpicciolire non costa attesa e dice la misura giusta', () => {
  const piano = pianoZack(['ridimensiona:d2'], { w: 1000, h: 800 });
  assert.deepEqual(piano.out, { w: 500, h: 400 });
  assert.equal(piano.secondi, 0, 'ridurre e una riscrittura di pixel, non un modello');
  assert.deepEqual(piano.passi, ['ridimensiona:d2']);
});

test('rimpicciolire non scende mai sotto un pixel', () => {
  const piano = pianoZack(['ridimensiona:d4'], { w: 3, h: 2 });
  assert.ok(piano.out.w >= 1 && piano.out.h >= 1, `misura ${piano.out.w}x${piano.out.h}`);
});

test('ingrandire di un fattore dice la misura e un attesa vera', () => {
  const piano = pianoZack(['ridimensiona:x2'], { w: 600, h: 400 });
  assert.deepEqual(piano.out, { w: 1200, h: 800 });
  assert.ok(piano.secondi > 0, 'passa dal modello, quindi si aspetta');
});

test('la catena della home diventa una catena che lo studio sa leggere', () => {
  // È il ponte: le pastiglie della home scritte nella lingua dello studio.
  const piano = pianoZack(['scontorna', 'buchi', 'ridimensiona:x4', 'scarica'], { w: 500, h: 500 });
  assert.deepEqual(piano.passi, ['scontorna', 'buchi', 'ridimensiona:x4', 'scarica']);
  assert.deepEqual(piano.out, { w: 2000, h: 2000 });
});

test('spuntare un passo nello studio non cancella il fattore della home', () => {
  // Il difetto che questa funzione impedisce (2026-08-28): il pannello «Cosa
  // farà» ricostruiva la ricetta da PASSI, che è una lista CHIUSA e non
  // contiene `ridimensiona:x4`. Bastava una spunta qualsiasi nello studio per
  // perdere in silenzio la scelta fatta sulla home — e il difetto non si vede
  // subito: si scopre quando il file esce della misura sbagliata.
  const r = ['scontorna', 'ridimensiona:x4'];
  const dopo = commutaPasso(r, 'buchi');
  assert.ok(dopo.includes('ridimensiona:x4'), 'il fattore e sopravvissuto');
  assert.ok(dopo.includes('buchi'));
  assert.ok(dopo.includes('scontorna'));
});

test('spegnere un passo lascia il fattore dov e', () => {
  const dopo = commutaPasso(['scontorna', 'buchi', 'ridimensiona:d2'], 'buchi');
  assert.deepEqual(dopo.filter((p) => p !== 'ridimensiona:d2'), ['scontorna']);
  assert.ok(dopo.includes('ridimensiona:d2'));
});

test('accendere e spegnere lo stesso passo torna al punto di partenza', () => {
  const r = ['scontorna', 'ridimensiona:x2'];
  assert.deepEqual(normalizza(commutaPasso(commutaPasso(r, 'esporta'), 'esporta')), normalizza(r));
});

test('accendere un fattore lo mette nella catena', () => {
  assert.deepEqual(commutaFattore(['scontorna'], 'x4'), ['scontorna', 'ridimensiona:x4']);
});

test('ripremere lo stesso fattore lo spegne', () => {
  assert.deepEqual(commutaFattore(['scontorna', 'ridimensiona:x4'], 'x4'), ['scontorna']);
});

test('un secondo fattore sostituisce il primo, non si somma', () => {
  // Un solo ridimensionamento per catena: e' gia' la regola di `normalizza`.
  // «×4» e «:4» insieme farebbero aspettare mezzo minuto per tornare
  // esattamente da dove si e' partiti.
  assert.deepEqual(commutaFattore(['scontorna', 'ridimensiona:x4'], 'd2'), [
    'scontorna',
    'ridimensiona:d2',
  ]);
});

test('accendere un fattore spegne «ingrandisci»', () => {
  /*
   * Rispondono alla stessa domanda — «quanto grande?» — e `normalizza` fa
   * gia' vincere il fattore. Toglierlo QUI serve all'occhio: se restasse
   * acceso sarebbe una pastiglia premuta che non fa niente. «Il colore non e'
   * mai l'unico segnale» vale anche al contrario — un segnale acceso deve
   * corrispondere a un effetto.
   */
  assert.deepEqual(commutaFattore(['scontorna', 'ingrandisci'], 'x2'), [
    'scontorna',
    'ridimensiona:x2',
  ]);
});

test('un fattore che non esiste non tocca la catena', () => {
  // Una chiave puo' arrivare da un archivio vecchio o scritta a mano: non
  // deve produrre un passo che nessuno sa eseguire.
  assert.deepEqual(commutaFattore(['scontorna'], 'x8'), ['scontorna']);
});
