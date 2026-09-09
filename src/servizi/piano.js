/**
 * Cosa c'è sul piano di lavoro, servizio per servizio.
 *
 * **La regola, per intero:** il piano è vuoto quando non c'è niente sopra
 * **e non sta succedendo niente**.
 *
 * La seconda metà si era persa, e il 2026-09-09 il committente l'ha riferita
 * così: *«non funziona niente, né registrare»*. Aveva ragione. «Vuoto»
 * guardava solo se c'era una clip, e la clip nasce a registrazione **finita**:
 * quindi mentre il microfono era acceso il piano risultava vuoto, il pannello
 * col tasto **Ferma** non veniva disegnato, e non c'era nessun modo di
 * fermare la registrazione. Il microfono restava acceso.
 *
 * Era una catena di ternari dentro una prop di `App.jsx`, dove nessun test
 * poteva vederla — ed è esattamente il posto dove si è persa. Qui è **dati e
 * una funzione pura**, in Node, dove i test la guardano.
 */

/**
 * Le due domande, per ogni servizio.
 *
 * - `contenuto`: c'è qualcosa **sopra** il piano?
 * - `inCorso`: sta succedendo **qualcosa**? — registrare, e domani qualunque
 *   altra cosa che l'utente deve poter fermare.
 *
 * Tutt'e due dichiarate sempre, anche quando una è sempre falsa: un servizio
 * che non nomina `inCorso` è un servizio che può rifare il difetto, perché
 * `undefined` è falso e nessuno si lamenta.
 */
const COSA_CE = {
  brain: (s) => ({ contenuto: (s.tela ?? 0) > 0, inCorso: false }),
  vocale: (s) => ({ contenuto: Boolean(s.clipVoce), inCorso: Boolean(s.registrandoVoce) }),
  effetti: (s) => ({
    contenuto: Boolean(s.effettoAperto) || Boolean(s.ritmo),
    inCorso: Boolean(s.registrandoRitmo),
  }),
  /*
   * Lo scontorno e il vettoriale lavorano su un file del piano, e il piano può
   * tenerne fino a tre più i risultati del blocco.
   */
  scontorna: (s) => ({
    contenuto: Boolean(s.file) || (s.inColonna ?? 0) > 0 || (s.risultati ?? 0) > 0,
    inCorso: false,
  }),
  /*
   * Il vettoriale non ha mai il piano vuoto, ed è voluto: la sua tela **è** il
   * lavoro. Un foglio da disegno vuoto non è «niente sul piano», è il punto di
   * partenza, e va mostrato subito con gli strumenti intorno — *«il canva
   * vuoto color panna»* (committente, 2026-09-09). Il `+` resta piccolo
   * nell'angolo, per portare dentro un'immagine da tracciare.
   */
  vettorializza: () => ({ contenuto: true, inCorso: false }),
};

/** Quanti oggetti conta il piano, per il `+` piccolo e per la croce. */
const QUANTI = {
  // Non «1»: il `+` piccolo sparisce al tetto del servizio, e su Brain il
  // tetto è 99. Contare uno lo farebbe sparire a 99 note invece che mai.
  brain: (s) => s.tela ?? 0,
  scontorna: (s) => ((s.inColonna ?? 0) > 1 ? s.inColonna : s.file ? 1 : 0),
};
/*
 * Il vettoriale conta i FILE, non la tela.
 *
 * La tela c'e' sempre — `contenuto` e' sempre vero, e' un foglio da disegno —
 * ma «quanti ce ne sono sul piano» risponde a un'altra domanda: quante cose
 * hai PORTATO. Contare uno con la tela vuota spegneva il tasto Zack
 * all'apertura, perche' la regola «un file e la catena vuota» scattava senza
 * che ci fosse nessun file.
 */
QUANTI.vettorializza = QUANTI.scontorna;

/**
 * Cosa c'è sul piano. Un servizio sconosciuto risponde «niente e niente»:
 * può arrivare da un indirizzo vecchio, e deve dirlo invece di rompersi.
 */
export function statoDelPiano(tool, s = {}) {
  const come = COSA_CE[tool];
  return come ? come(s) : { contenuto: false, inCorso: false };
}

/** Il piano è vuoto: niente sopra, e niente in corso. */
export function pianoVuoto(tool, s = {}) {
  const { contenuto, inCorso } = statoDelPiano(tool, s);
  return !contenuto && !inCorso;
}

/**
 * Quanti ce ne sono. Chi non conta a modo suo vale «uno se è occupato»:
 * mentre si registra deve valere uno, o il `+` e la croce spariscono e la
 * schermata resta senza nessun comando addosso.
 */
export function quantiSulPiano(tool, s = {}) {
  if (QUANTI[tool]) return QUANTI[tool](s);
  return pianoVuoto(tool, s) ? 0 : 1;
}
