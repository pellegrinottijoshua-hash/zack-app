import it from './it.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };

export const LANGS = ['it', 'en'];
const DICTS = { it, en };

let current = 'en';
const listeners = new Set();

export function detectLang(languages = []) {
  for (const l of languages) {
    const short = String(l).slice(0, 2).toLowerCase();
    if (LANGS.includes(short)) return short;
  }
  return 'en';
}

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : 'en';
  for (const fn of listeners) fn(current);
  return current;
}

export function getLang() {
  return current;
}

/** Permette all'interfaccia di ridisegnarsi quando la lingua cambia. */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Una chiave mancante restituisce la chiave stessa invece di rompersi: in
 * un'interfaccia una traduzione assente è un difetto estetico, una schermata
 * bianca è un difetto grave.
 */
export function t(key, vars) {
  const raw = key
    .split('.')
    .reduce((o, part) => (o == null ? undefined : o[part]), DICTS[current]);
  if (typeof raw !== 'string') return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
