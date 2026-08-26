import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  genera,
  suRitmo,
  rumore,
  inviluppo,
  passaBasso,
  passaAlto,
  normalizza,
  famiglia,
  FAMIGLIE,
  SR,
} from '../src/engine/synth.js';

/** Energia media: serve a dire "qui si sente" senza ascoltare. */
const energia = (d, da = 0, a = d.length) => {
  let s = 0;
  for (let i = da; i < a; i++) s += d[i] * d[i];
  return Math.sqrt(s / Math.max(1, a - da));
};

test('lo stesso seme dà lo stesso suono', () => {
  // Un suono che non si può rifare uguale non si può nemmeno correggere: si
  // regola una manopola e cambia anche tutto il resto.
  const a = genera('impatto', { seme: 7 });
  const b = genera('impatto', { seme: 7 });
  assert.deepEqual(Array.from(a.slice(0, 200)), Array.from(b.slice(0, 200)));
});

test('semi diversi danno suoni diversi', () => {
  const a = genera('vento', { seme: 1 });
  const b = genera('vento', { seme: 2 });
  assert.notDeepEqual(Array.from(a.slice(0, 200)), Array.from(b.slice(0, 200)));
});

test('ogni famiglia produce qualcosa che si sente', () => {
  // Una ricetta che restituisce silenzio non solleva niente: si scopre
  // premendo "ascolta" e non sentendo nulla.
  for (const f of FAMIGLIE) {
    const d = genera(f.id);
    assert.ok(d.length > 0, `${f.id} non ha campioni`);
    assert.ok(energia(d) > 0.01, `${f.id} è praticamente silenzio`);
  }
});

test('niente supera il fondo scala', () => {
  // Sopra 1 il WAV a 16 bit tronca e il suono gracchia. Succede proprio con
  // le manopole al massimo, cioè quando l'utente sta cercando il suono forte.
  for (const f of FAMIGLIE) {
    const d = genera(f.id, { param: { corpo: 1, tono: 1, sporco: 1, velocita: 1 } });
    for (let i = 0; i < d.length; i++) {
      assert.ok(Math.abs(d[i]) <= 1.0001, `${f.id} esce dal fondo scala`);
    }
  }
});

test('una manopola fuori scala viene riportata dentro', () => {
  // Le manopole arrivano anche da una ricetta salvata mesi fa: una fuori
  // scala produrrebbe un filtro impazzito o un volume che spacca le casse.
  const d = genera('impatto', { param: { corpo: 99, tono: -5 } });
  assert.ok(energia(d) > 0);
  for (let i = 0; i < d.length; i++) assert.ok(Math.abs(d[i]) <= 1.0001);
});

test('il suono muore invece di tagliarsi', () => {
  // Un troncamento secco si sente come un click alla fine: è il difetto più
  // riconoscibile di un effetto sintetizzato male.
  const d = genera('impatto');
  const inizio = energia(d, 0, Math.floor(d.length * 0.15));
  const fine = energia(d, Math.floor(d.length * 0.9));
  assert.ok(fine < inizio * 0.25, `la coda non si spegne: ${fine} contro ${inizio}`);
});

test('la durata chiesta è la durata ottenuta', () => {
  const d = genera('click', { durata: 0.5 });
  assert.equal(d.length, Math.floor(0.5 * SR));
});

test('una durata assurda viene riportata a un intervallo sensato', () => {
  assert.ok(genera('click', { durata: 999 }).length <= 10 * SR);
  assert.ok(genera('click', { durata: -3 }).length > 0);
});

test('un effetto sconosciuto si rifiuta invece di restituire silenzio', () => {
  assert.throws(() => famiglia('teletrasporto'), /sconosciuto/);
});

test('il passa-basso toglie l\'acuto e il passa-alto il grave', () => {
  const rnd = rumore(3);
  const d = new Float32Array(SR);
  for (let i = 0; i < d.length; i++) d[i] = rnd();

  // Il rumore filtrato in basso varia meno da un campione all'altro.
  const salto = (x) => {
    let s = 0;
    for (let i = 1; i < x.length; i++) s += Math.abs(x[i] - x[i - 1]);
    return s / x.length;
  };
  assert.ok(salto(passaBasso(d, 200)) < salto(d));
  assert.ok(salto(passaAlto(d, 4000)) > salto(passaBasso(d, 4000)));
});

test('la normalizzazione non esplode sul silenzio', () => {
  // Dividere per il picco di un array tutto a zero darebbe NaN in ogni
  // campione, e un WAV di NaN è un file che il lettore rifiuta.
  const zero = new Float32Array(100);
  const out = normalizza(zero);
  for (let i = 0; i < out.length; i++) assert.equal(out[i], 0);
});

test('l\'inviluppo parte da zero, cresce, e finisce a zero', () => {
  // Il picco NON tocca 1: attacco e decadimento si sovrappongono, e va bene
  // così — il volume lo recupera `normalizza`. Quello che conta è la forma:
  // silenzio, crescita, morte. Un inviluppo che non muore lascia un click.
  const e = inviluppo(1000);
  let max = 0;
  let dove = 0;
  for (let i = 0; i < e.length; i++) {
    if (e[i] > max) {
      max = e[i];
      dove = i;
    }
  }
  assert.ok(e[0] < 0.05, 'non parte dal silenzio');
  assert.ok(e[999] < 0.05, 'non muore');
  assert.ok(max > e[0] && max > e[999], 'non c\'è nessun picco');
  assert.ok(dove > 0 && dove < 999, 'il picco è su un estremo');
});

test('il ritmo mette una copia per ogni battuta', () => {
  // È il ponte col pezzo che già funzionava: dico "tum tum tum" e torna come
  // passi di gigante.
  const colpo = genera('impatto', { durata: 0.1 });
  const out = suRitmo(colpo, [0, 0.5, 1]);
  assert.ok(out.length > 1 * SR);
  assert.ok(energia(out, 0, 2000) > 0.01, 'manca il colpo sul tempo zero');
  assert.ok(energia(out, Math.floor(0.5 * SR), Math.floor(0.5 * SR) + 2000) > 0.01);
});

test('senza battute il colpo torna com\'era', () => {
  const colpo = genera('click');
  assert.equal(suRitmo(colpo, []), colpo);
});

test('due battute vicine si accavallano invece di tagliarsi', () => {
  // Sovrascrivere taglierebbe la coda del primo colpo, che è proprio il
  // suono che rende naturale una raffica.
  const colpo = genera('impatto', { durata: 0.3 });
  const out = suRitmo(colpo, [0, 0.05]);
  assert.ok(energia(out) > 0);
  for (let i = 0; i < out.length; i++) assert.ok(Math.abs(out[i]) <= 1.0001);
});
