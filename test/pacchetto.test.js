import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EFFETTI, FAMIGLIE, FONTE, cercaEffetti, nomeEffetto } from '../src/engine/pacchetto.js';

/* Il pacchetto di effetti (fase 7a): il catalogo e i file combaciano. */

const PUBBLICO = join(import.meta.dirname, '..', 'public');

test('circa 150 effetti, in famiglie dichiarate, da una fonte CC0', () => {
  assert.ok(EFFETTI.length >= 140 && EFFETTI.length <= 180, `${EFFETTI.length}`);
  assert.match(FONTE, /CC0/);
  for (const e of EFFETTI) assert.ok(FAMIGLIE.includes(e.famiglia), e.id);
  for (const f of FAMIGLIE) assert.ok(EFFETTI.some((e) => e.famiglia === f), `famiglia vuota: ${f}`);
});

test('⚠️ ogni effetto del catalogo ha il suo file, e ogni file sta nel catalogo', () => {
  const nelCatalogo = new Set(EFFETTI.map((e) => e.file));
  for (const e of EFFETTI) {
    const p = join(PUBBLICO, e.file);
    assert.ok(existsSync(p), `manca ${e.file}`);
  }
  for (const f of FAMIGLIE) {
    for (const nome of readdirSync(join(PUBBLICO, 'effetti', f))) {
      assert.ok(nelCatalogo.has(`effetti/${f}/${nome}`), `file fuori catalogo: ${f}/${nome}`);
    }
  }
});

test('id unici, MP3, durata vera, nome in tutt’e due le lingue', () => {
  assert.equal(new Set(EFFETTI.map((e) => e.id)).size, EFFETTI.length);
  for (const e of EFFETTI) {
    assert.match(e.file, /^effetti\/[a-z]+\/[a-z0-9-]+\.mp3$/);
    // Sotto i 50 ms non è un effetto: è un tic che sembra un difetto.
    assert.ok(e.durata >= 0.05 && e.durata <= 10, `${e.id}: ${e.durata}`);
    assert.ok(e.nome.it && e.nome.en, e.id);
  }
});

test('⚠️ i crediti nominano ogni file, con la licenza', () => {
  const crediti = readFileSync(join(PUBBLICO, 'effetti', 'CREDITI.txt'), 'utf8');
  assert.match(crediti, /CC0/);
  for (const e of EFFETTI) assert.ok(crediti.includes(e.file), `senza credito: ${e.file}`);
});

test('il pacchetto pesa poco: si scarica solo quello che si ascolta, ma comunque sotto i 4 MB', () => {
  const peso = EFFETTI.reduce((n, e) => n + statSync(join(PUBBLICO, e.file)).size, 0);
  assert.ok(peso < 4 * 1024 * 1024, `${peso} byte`);
});

test('cercare: per famiglia, per parole, in una lingua o nell’altra, senza accenti', () => {
  assert.equal(cercaEffetti().length, EFFETTI.length);
  const passi = cercaEffetti({ famiglia: 'passi' });
  assert.ok(passi.length > 0 && passi.every((e) => e.famiglia === 'passi'));
  assert.ok(cercaEffetti({ testo: 'vetro' }).every((e) => /vetro/i.test(e.nome.it)));
  assert.deepEqual(
    cercaEffetti({ testo: 'glass' }).map((e) => e.id),
    cercaEffetti({ testo: 'vetro' }).map((e) => e.id),
    '«glass» e «vetro» trovano gli stessi',
  );
  assert.ok(cercaEffetti({ testo: 'retro' }).length > 0, '«retro» trova «rétro»');
  assert.ok(cercaEffetti({ testo: 'legno forte' }).every((e) => /legno forte/i.test(e.nome.it)));
  assert.equal(cercaEffetti({ famiglia: 'passi', testo: 'laser' }).length, 0);
});

test('il nome nella lingua chiesta, l’italiano come ripiego', () => {
  const e = { id: 'x', nome: { it: 'Vetro', en: 'Glass' } };
  assert.equal(nomeEffetto(e, 'en'), 'Glass');
  assert.equal(nomeEffetto(e, 'fr'), 'Vetro');
  assert.equal(nomeEffetto({ id: 'y' }), 'y');
});
