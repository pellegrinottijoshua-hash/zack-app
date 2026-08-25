import { test } from 'node:test';
import assert from 'node:assert/strict';
import it from '../src/i18n/it.json' with { type: 'json' };
import en from '../src/i18n/en.json' with { type: 'json' };
import { t, setLang, detectLang } from '../src/i18n/index.js';

const keys = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  );

const at = (dict, key) => key.split('.').reduce((o, part) => o[part], dict);

test('italiano e inglese hanno esattamente le stesse chiavi', () => {
  const a = keys(it).sort();
  const b = keys(en).sort();
  const soloIt = a.filter((k) => !b.includes(k));
  const soloEn = b.filter((k) => !a.includes(k));
  assert.deepEqual(soloIt, [], `chiavi senza traduzione inglese: ${soloIt.join(', ')}`);
  assert.deepEqual(soloEn, [], `chiavi senza traduzione italiana: ${soloEn.join(', ')}`);
});

test('nessuna stringa è vuota', () => {
  for (const [lang, dict] of [
    ['it', it],
    ['en', en],
  ]) {
    for (const k of keys(dict)) {
      assert.ok(String(at(dict, k)).trim().length > 0, `${lang}.${k} è vuota`);
    }
  }
});

test('ogni controllo ha il suo testo di aiuto', () => {
  // Regola di progetto: un comando senza spiegazione non è finito.
  const all = keys(it);
  for (const k of all.filter((k) => k.startsWith('control.') && k.endsWith('.label'))) {
    const help = k.replace(/\.label$/, '.help');
    assert.ok(all.includes(help), `manca il testo di aiuto per ${k}`);
  }
});

test("il testo di aiuto spiega davvero, non ripete l'etichetta", () => {
  for (const [lang, dict] of [
    ['it', it],
    ['en', en],
  ]) {
    const all = keys(dict);
    for (const k of all.filter((k) => k.endsWith('.help'))) {
      const labelKey = k.replace(/\.help$/, '.label');
      // Un aiuto può descrivere un intero gruppo di comandi e non avere
      // un'etichetta gemella: la regola vale solo dove il confronto esiste.
      if (!all.includes(labelKey)) continue;
      const help = at(dict, k);
      const label = at(dict, labelKey);
      assert.ok(help.length > label.length + 15, `${lang}.${k} è troppo scarno per aiutare`);
    }
  }
});

test('le variabili usate in italiano esistono anche in inglese', () => {
  // Se una lingua usa {pct} e l'altra no, una delle due mostra un buco.
  const vars = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');
  for (const k of keys(it)) {
    assert.equal(vars(at(it, k)), vars(at(en, k)), `variabili diverse in ${k}`);
  }
});

test('t restituisce la lingua scelta e sostituisce le variabili', () => {
  setLang('it');
  assert.equal(t('engine.tier.fast.name'), 'Rapido');
  setLang('en');
  assert.equal(t('engine.tier.fast.name'), 'Fast');
  assert.match(t('engine.download.progress', { pct: 42 }), /42/);
});

test('t non esplode su una chiave mancante, la restituisce', () => {
  assert.equal(t('chiave.che.non.esiste'), 'chiave.che.non.esiste');
});

test('detectLang sceglie italiano solo se il browser lo chiede', () => {
  assert.equal(detectLang(['it-IT', 'en']), 'it');
  assert.equal(detectLang(['en-GB']), 'en');
  assert.equal(detectLang([]), 'en');
  assert.equal(detectLang(['fr-FR']), 'en');
});

test('nessun messaggio di errore mostra gergo tecnico', () => {
  // Vincolo globale: l'utente non deve mai leggere uno stack o un nome di API.
  const gergo = /undefined|null|NaN|stack|exception|onnx|webgpu|wasm|500|fetch\(/i;
  for (const [lang, dict] of [
    ['it', it],
    ['en', en],
  ]) {
    for (const k of keys(dict).filter((k) => k.includes('error'))) {
      assert.doesNotMatch(String(at(dict, k)), gergo, `${lang}.${k} contiene gergo tecnico`);
    }
  }
});
