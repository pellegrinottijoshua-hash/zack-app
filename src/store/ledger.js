/**
 * Il registro del saldo, in centesimi.
 *
 * **Tutto in centesimi interi, mai in euro decimali.** In virgola mobile
 * 0,1 + 0,2 fa 0,30000000000000004: su un saldo che rappresenta denaro vero
 * quell'errore si accumula finché qualcuno non riesce a spendere un centesimo
 * che non ha. È lo stesso motivo per cui le banche non usano i float.
 *
 * Il flusso è **prenota → conferma o rilascia**, non "scala e spera":
 * una generazione fallita non deve consumare nulla, e due schede aperte non
 * devono poter spendere lo stesso denaro.
 *
 * Tutto puro: nessuna rete, nessuno storage. Si verifica senza spendere.
 */

export const HOLD_TTL_MS = 15 * 60 * 1000; // una scheda chiusa a metà non blocca il saldo per sempre

/** Il margine dichiarato, applicato al costo del fornitore. */
export const MARGIN = 0.14;

export function emptyLedger() {
  return { balance: 0, holds: [], entries: [] };
}

const cents = (euro) => Math.round(Number(euro) * 100);
export const toEuro = (c) => c / 100;

/** Prezzo finale al cliente, in centesimi, dal costo del fornitore in euro. */
export function priceFor(providerCostEuro) {
  const cost = cents(providerCostEuro);
  const margin = Math.ceil(cost * MARGIN);
  return { total: cost + margin, cost, margin };
}

/** Quanto è realmente spendibile: il saldo meno ciò che è già impegnato. */
export function available(ledger, now = Date.now()) {
  const held = ledger.holds
    .filter((h) => h.expiresAt > now)
    .reduce((sum, h) => sum + h.amount, 0);
  return ledger.balance - held;
}

export function topUp(ledger, euro, { now = Date.now, id = () => String(now()) } = {}) {
  const amount = cents(euro);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('topup-invalid'), { code: 'topup-invalid' });
  }
  return {
    ...ledger,
    balance: ledger.balance + amount,
    entries: [
      { id: id(), kind: 'topup', amount, at: new Date(now()).toISOString() },
      ...ledger.entries,
    ],
  };
}

/**
 * Impegna un importo. Fallisce se il disponibile non basta — mai il saldo
 * lordo, o due generazioni in parallelo spendono lo stesso denaro.
 */
export function reserve(ledger, euro, { label = '', now = Date.now, id = () => String(now()) } = {}) {
  const amount = cents(euro);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('reserve-invalid'), { code: 'reserve-invalid' });
  }
  const t = now();
  const clean = purge(ledger, t);
  if (available(clean, t) < amount) {
    throw Object.assign(new Error('insufficient-funds'), { code: 'insufficient-funds' });
  }
  const hold = { id: id(), amount, label, createdAt: t, expiresAt: t + HOLD_TTL_MS };
  return { ledger: { ...clean, holds: [...clean.holds, hold] }, hold };
}

/**
 * Conferma al costo reale, che può differire dalla stima.
 *
 * Se il reale supera il prenotato si addebita comunque: il lavoro è già stato
 * fatto e pagato al fornitore, e bloccarlo a cose fatte punirebbe l'utente per
 * una nostra stima sbagliata. Il saldo può finire sotto zero solo così, e la
 * differenza viene registrata perché sia visibile.
 */
export function commit(ledger, holdId, euroReal, { now = Date.now, id = () => String(now()) } = {}) {
  const hold = ledger.holds.find((h) => h.id === holdId);
  if (!hold) throw Object.assign(new Error('hold-unknown'), { code: 'hold-unknown' });

  const real = euroReal == null ? hold.amount : cents(euroReal);
  if (!Number.isFinite(real) || real < 0) {
    throw Object.assign(new Error('commit-invalid'), { code: 'commit-invalid' });
  }

  return {
    ...ledger,
    balance: ledger.balance - real,
    holds: ledger.holds.filter((h) => h.id !== holdId),
    entries: [
      {
        id: id(),
        kind: 'spend',
        amount: -real,
        label: hold.label,
        estimated: hold.amount,
        overrun: real > hold.amount ? real - hold.amount : 0,
        at: new Date(now()).toISOString(),
      },
      ...ledger.entries,
    ],
  };
}

/** Rilascia senza addebitare: è la risposta a ogni fallimento. */
export function release(ledger, holdId) {
  if (!ledger.holds.some((h) => h.id === holdId)) return ledger;
  return { ...ledger, holds: ledger.holds.filter((h) => h.id !== holdId) };
}

/** Toglie le prenotazioni scadute: una scheda chiusa non blocca il saldo. */
export function purge(ledger, now = Date.now()) {
  const alive = ledger.holds.filter((h) => h.expiresAt > now);
  return alive.length === ledger.holds.length ? ledger : { ...ledger, holds: alive };
}

/** Formattazione in euro, per l'interfaccia. */
export function formatEuro(centsValue, lang = 'it') {
  return new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(centsValue / 100);
}
