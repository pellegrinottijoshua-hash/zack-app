/**
 * Scorciatoie da tastiera dell'editor.
 *
 * Le lettere seguono le convenzioni che chi disegna ha già nelle dita — V per
 * selezionare, P per la penna, R per il rettangolo — perché una scorciatoia
 * inventata è peggio di nessuna scorciatoia: va imparata e non trasferisce.
 *
 * La logica è una funzione pura: prende un evento e restituisce l'azione. Così
 * si può verificare senza browser, ed è l'unico modo per essere sicuri che
 * "Canc" non cancelli mentre stai scrivendo in un campo.
 */

export const SHORTCUTS = [
  { keys: ['v'], action: 'tool:select', labelKey: 'tools.select.label' },
  { keys: ['a'], action: 'tool:pathedit', labelKey: 'tools.nodes.label' },
  { keys: ['p'], action: 'tool:path', labelKey: 'tools.pen.label' },
  { keys: ['n'], action: 'tool:fhpath', labelKey: 'tools.pencil.label' },
  { keys: ['l'], action: 'tool:line', labelKey: 'tools.line.label' },
  { keys: ['r'], action: 'tool:rect', labelKey: 'tools.rect.label' },
  { keys: ['e'], action: 'tool:ellipse', labelKey: 'tools.ellipse.label' },
  { keys: ['t'], action: 'tool:text', labelKey: 'tools.text.label' },
  { keys: ['delete', 'backspace'], action: 'delete', labelKey: 'editor.remove.label' },
  { keys: ['d'], mod: true, action: 'duplicate', labelKey: 'arrange.duplicate' },
  { keys: ['g'], mod: true, action: 'group', labelKey: 'editor.group.label' },
  { keys: ['g'], mod: true, shift: true, action: 'ungroup', labelKey: 'editor.ungroup.label' },
  { keys: ['z'], mod: true, action: 'undo', labelKey: 'editor.undo.label' },
  { keys: ['z'], mod: true, shift: true, action: 'redo', labelKey: 'editor.redo.label' },
  { keys: ['arrowleft'], action: 'nudge:-1,0' },
  { keys: ['arrowright'], action: 'nudge:1,0' },
  { keys: ['arrowup'], action: 'nudge:0,-1' },
  { keys: ['arrowdown'], action: 'nudge:0,1' },
  { keys: ['arrowleft'], shift: true, action: 'nudge:-10,0' },
  { keys: ['arrowright'], shift: true, action: 'nudge:10,0' },
  { keys: ['arrowup'], shift: true, action: 'nudge:0,-10' },
  { keys: ['arrowdown'], shift: true, action: 'nudge:0,10' },
];

/**
 * Vero quando l'utente sta scrivendo da qualche parte.
 * Senza questo controllo premere "r" mentre si nomina un livello cambierebbe
 * strumento, e "Canc" cancellerebbe il disegno invece di una lettera.
 */
export function isTyping(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return target.isContentEditable === true;
}

/**
 * @param {KeyboardEvent} e
 * @returns {string|null} l'azione da eseguire, oppure null
 */
export function resolveShortcut(e) {
  if (!e || isTyping(e.target)) return null;

  const key = String(e.key || '').toLowerCase();
  const mod = Boolean(e.metaKey || e.ctrlKey);
  const shift = Boolean(e.shiftKey);

  // Le più specifiche prima: Cmd+Shift+Z deve vincere su Cmd+Z.
  const ordered = [...SHORTCUTS].sort(
    (a, b) => Number(Boolean(b.shift)) - Number(Boolean(a.shift)),
  );

  for (const s of ordered) {
    if (!s.keys.includes(key)) continue;
    if (Boolean(s.mod) !== mod) continue;
    if (Boolean(s.shift) !== shift) continue;
    return s.action;
  }
  return null;
}
