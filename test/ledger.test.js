import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyLedger,
  topUp,
  reserve,
  commit,
  release,
  purge,
  available,
  priceFor,
  formatEuro,
  toEuro,
  HOLD_TTL_MS,
  MARGIN,
} from '../src/store/ledger.js';

// Tempo e id deterministici: la contabilità non si verifica col caso.
const T0 = Date.parse('2026-08-25T10:00:00Z');
let counter = 0;
const opts = (now = T0) => ({ now: () => now, id: () => `x${++counter}` });

test('il saldo è in centesimi interi, mai in virgola mobile', () => {
  // 0,1 + 0,2 in float fa 0,30000000000000004. Su denaro vero
  // quell'errore si accumula finché qualcuno spende un centesimo che non ha.
  let l = emptyLedger();
  l = topUp(l, 0.1, opts());
  l = topUp(l, 0.2, opts());
  assert.equal(l.balance, 30, 'deve essere esattamente 30 centesimi');
  assert.equal(Number.isInteger(l.balance), true);
});

test('priceFor applica il margine dichiarato del 12% e arrotonda a favore del centesimo', () => {
  const p = priceFor(0.35);
  assert.equal(p.cost, 35);
  assert.equal(p.margin, Math.ceil(35 * MARGIN));
  assert.equal(p.total, p.cost + p.margin);
  assert.equal(MARGIN, 0.12);
});

test('priceFor non produce mai un margine di zero su un costo non nullo', () => {
  // Un margine arrotondato a zero significherebbe lavorare in perdita
  // sulle generazioni più economiche, che sono anche le più frequenti.
  const p = priceFor(0.01);
  assert.ok(p.margin >= 1, `margine ${p.margin} su un centesimo di costo`);
});

test('una ricarica di zero o negativa viene rifiutata', () => {
  const l = emptyLedger();
  assert.throws(() => topUp(l, 0, opts()), /topup-invalid/);
  assert.throws(() => topUp(l, -5, opts()), /topup-invalid/);
});

test('non si può prenotare più del disponibile', () => {
  let l = topUp(emptyLedger(), 1, opts());
  assert.throws(() => reserve(l, 1.5, opts()), /insufficient-funds/);
});

test('due prenotazioni non possono spendere lo stesso denaro', () => {
  // È il difetto classico: due schede aperte, un solo saldo.
  let l = topUp(emptyLedger(), 1, opts());
  const a = reserve(l, 0.6, opts());
  assert.throws(() => reserve(a.ledger, 0.6, opts()), /insufficient-funds/);
  assert.equal(available(a.ledger, T0), 40);
});

test('una generazione fallita non consuma nulla', () => {
  let l = topUp(emptyLedger(), 5, opts());
  const { ledger: withHold, hold } = reserve(l, 0.42, opts());
  assert.equal(available(withHold, T0), 458);

  const after = release(withHold, hold.id);
  assert.equal(after.balance, 500, 'il saldo non deve muoversi');
  assert.equal(available(after, T0), 500);
  assert.equal(after.holds.length, 0);
});

test('rilasciare una prenotazione inesistente non rompe nulla', () => {
  const l = topUp(emptyLedger(), 5, opts());
  assert.deepEqual(release(l, 'mai-esistita'), l);
});

test('la conferma addebita il costo reale, non la stima', () => {
  let l = topUp(emptyLedger(), 5, opts());
  const { ledger: withHold, hold } = reserve(l, 0.5, { ...opts(), label: 'video' });
  const done = commit(withHold, hold.id, 0.38, opts());

  assert.equal(done.balance, 500 - 38);
  assert.equal(done.holds.length, 0);
  assert.equal(done.entries[0].kind, 'spend');
  assert.equal(done.entries[0].amount, -38);
  assert.equal(done.entries[0].label, 'video');
});

test('un costo reale superiore alla stima viene addebitato e registrato', () => {
  // Il lavoro è già stato fatto e pagato al fornitore: bloccarlo a cose fatte
  // punirebbe l'utente per una nostra stima sbagliata.
  let l = topUp(emptyLedger(), 0.5, opts());
  const { ledger: withHold, hold } = reserve(l, 0.4, opts());
  const done = commit(withHold, hold.id, 0.6, opts());

  assert.equal(done.balance, -10, 'il saldo può andare sotto solo così');
  assert.equal(done.entries[0].overrun, 20);
});

test('confermare una prenotazione che non esiste è un errore, non un addebito', () => {
  const l = topUp(emptyLedger(), 5, opts());
  assert.throws(() => commit(l, 'fantasma', 1, opts()), /hold-unknown/);
});

test('una prenotazione scaduta libera il denaro da sola', () => {
  // Una scheda chiusa a metà non deve bloccare il saldo per sempre.
  let l = topUp(emptyLedger(), 5, opts());
  const { ledger: withHold } = reserve(l, 2, opts());
  assert.equal(available(withHold, T0), 300);

  const dopo = T0 + HOLD_TTL_MS + 1000;
  assert.equal(available(withHold, dopo), 500, 'scaduta: il denaro torna disponibile');
  assert.equal(purge(withHold, dopo).holds.length, 0);
});

test('dopo una scadenza si può prenotare di nuovo lo stesso denaro', () => {
  let l = topUp(emptyLedger(), 1, opts());
  const { ledger: withHold } = reserve(l, 1, opts());
  const dopo = T0 + HOLD_TTL_MS + 1;
  const nuovo = reserve(withHold, 1, opts(dopo));
  assert.equal(nuovo.hold.amount, 100);
});

test('lo storico registra ogni movimento, dal più recente', () => {
  let l = topUp(emptyLedger(), 5, opts());
  const { ledger: h, hold } = reserve(l, 1, opts());
  l = commit(h, hold.id, 1, opts());
  l = topUp(l, 2, opts());

  assert.equal(l.entries.length, 3);
  assert.equal(l.entries[0].kind, 'topup');
  assert.equal(l.entries[1].kind, 'spend');
  assert.equal(l.entries[2].kind, 'topup');
});

test('formatEuro mostra il denaro come lo legge una persona', () => {
  assert.match(formatEuro(1240, 'it'), /12,40/);
  assert.match(formatEuro(1240, 'en'), /12\.40/);
  assert.equal(toEuro(1240), 12.4);
});

test('cento operazioni da un centesimo lasciano il saldo esatto', () => {
  // Il test che smaschera la virgola mobile: in float questo non torna.
  let l = topUp(emptyLedger(), 1, opts());
  for (let i = 0; i < 100; i++) {
    const { ledger: h, hold } = reserve(l, 0.01, opts());
    l = commit(h, hold.id, 0.01, opts());
  }
  assert.equal(l.balance, 0, `saldo finale ${l.balance}, atteso 0`);
});
