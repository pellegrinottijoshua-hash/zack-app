import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESCRITTORI } from '../src/servizi/index.js';
import { statoDelPiano, pianoVuoto, quantiSulPiano } from '../src/servizi/piano.js';

/*
 * Cosa c'e' sul piano, servizio per servizio.
 *
 * Il difetto che questi test impediscono di ripetere (2026-09-09, riferito dal
 * committente come «non funziona niente, ne' registrare»):
 *
 * «Vuoto» guardava SOLO se c'era una clip, e la clip nasce a registrazione
 * FINITA. Quindi mentre il microfono era acceso il piano risultava vuoto, il
 * componente col tasto FERMA non veniva disegnato, e non c'era nessun modo di
 * fermare la registrazione. Il microfono restava acceso.
 *
 * La regola dimenticata era mezza: il piano e' vuoto quando non c'e' niente
 * sopra **e non sta succedendo niente**. Qui la seconda meta' ha un nome —
 * `inCorso` — e un test che la cerca su tutti i servizi.
 *
 * Sta in `servizi/` e non in `App.jsx` perche' era una catena di ternari
 * dentro una prop: nessun test poteva vederla, ed e' esattamente il posto dove
 * si e' persa.
 */

test('un servizio che sta REGISTRANDO non ha il piano vuoto', () => {
  /*
   * E' il test che vale per tutti: qualunque cosa sia «in corso», il piano non
   * e' vuoto — o il comando per fermarla non viene disegnato.
   */
  assert.equal(pianoVuoto('vocale', { registrandoVoce: true }), false, 'il Vocale che registra sembra vuoto');
  assert.equal(pianoVuoto('effetti', { registrandoRitmo: true }), false, 'gli Effetti che registrano sembrano vuoti');
});

test('mentre registra, il piano conta come OCCUPATO anche per gli strumenti', () => {
  // Se `quanti` restasse a zero, il `+` piccolo e la croce sparirebbero e la
  // schermata non avrebbe piu' nessun comando addosso.
  assert.ok(quantiSulPiano('vocale', { registrandoVoce: true }) > 0);
  assert.ok(quantiSulPiano('effetti', { registrandoRitmo: true }) > 0);
});

test('senza niente sopra e senza niente in corso, il piano e’ vuoto', () => {
  for (const tool of Object.keys(DESCRITTORI)) {
    // Il vettoriale e' l'eccezione DICHIARATA: la sua tela e' un foglio da
    // disegno, e un foglio vuoto e' il punto di partenza, non «niente».
    if (tool === 'vettorializza') continue;
    assert.equal(pianoVuoto(tool, {}), true, `${tool}: il piano appena aperto non risulta vuoto`);
  }
});

test('il vettoriale apre GIA’ sulla sua tela, non su un invito', () => {
  /*
   * Il difetto che questo test impedisce di ripetere (2026-09-09, riferito dal
   * committente: «sono spariti tutti gli strumenti»): l'editor era una
   * schermata a parte, e ci si arrivava solo dopo aver tracciato un'immagine e
   * premuto «apri nell'editor». Aprire Vettoriale mostrava un `+` e basta.
   *
   * Adesso apre il foglio, con gli otto strumenti ai fianchi.
   */
  assert.equal(pianoVuoto('vettorializza', {}), false);
  assert.equal(statoDelPiano('vettorializza', {}).contenuto, true);
});

test('ogni servizio dice sia cosa c’e’ sopra sia cosa sta succedendo', () => {
  // Un servizio che non dichiara `inCorso` e' un servizio che puo' rifare il
  // difetto: `undefined` e' falso, e il piano tornerebbe vuoto durante il
  // lavoro senza che niente si lamenti.
  for (const tool of Object.keys(DESCRITTORI)) {
    const s = statoDelPiano(tool, {});
    assert.equal(typeof s.contenuto, 'boolean', `${tool}: «contenuto» non e’ un booleano`);
    assert.equal(typeof s.inCorso, 'boolean', `${tool}: «inCorso» non e’ un booleano`);
  }
});

test('il Vocale: la clip riempie il piano', () => {
  assert.equal(pianoVuoto('vocale', { clipVoce: { url: 'x' } }), false);
  assert.equal(quantiSulPiano('vocale', { clipVoce: { url: 'x' } }), 1);
});

test('Brain conta gli oggetti sulla tela, non «uno»', () => {
  // Il `+` piccolo sparisce al tetto del servizio, e su Brain il tetto e' 99:
  // contare «1» lo farebbe sparire a 99 note invece che mai.
  assert.equal(quantiSulPiano('brain', { tela: 7 }), 7);
  assert.equal(pianoVuoto('brain', { tela: 0 }), true);
});

test('lo scontorno: un file, o la colonna, o i risultati', () => {
  assert.equal(pianoVuoto('scontorna', { file: {} }), false);
  assert.equal(pianoVuoto('scontorna', { inColonna: 3 }), false);
  assert.equal(pianoVuoto('scontorna', { risultati: 2 }), false);
  assert.equal(quantiSulPiano('scontorna', { inColonna: 3 }), 3);
  assert.equal(quantiSulPiano('scontorna', { file: {} }), 1);
});

test('un servizio sconosciuto non esplode e non mente', () => {
  // Puo' arrivare da un indirizzo vecchio. Deve dire «vuoto», non rompersi.
  assert.equal(pianoVuoto('teletrasporto', {}), true);
  assert.equal(quantiSulPiano('teletrasporto', {}), 0);
});

test('mentre registra non c’e’ ancora NIENTE su cui usare uno strumento', () => {
  /*
   * Le due meta' servono a due cose diverse, e confonderle riaccende otto
   * cerchi in una schermata che ne deve offrire uno solo:
   *
   * - `inCorso` tiene il piano NON vuoto, cosi' il tasto Ferma si disegna;
   * - `contenuto` dice se c'e' qualcosa su cui premere «Ascolta», e mentre il
   *   microfono e' acceso non c'e' ancora niente.
   */
  const s = statoDelPiano('vocale', { registrandoVoce: true });
  assert.equal(s.inCorso, true);
  assert.equal(s.contenuto, false, 'gli strumenti comparirebbero senza niente su cui lavorare');
});

test('il vettoriale conta i FILE, non la sua tela', () => {
  /*
   * La tela c'e' sempre — e' un foglio da disegno — ma «quanti ce ne sono sul
   * piano» risponde a un'altra domanda: quante cose hai PORTATO.
   *
   * Contare uno con la tela vuota spegneva il tasto Zack all'apertura: la
   * regola «c'e' un file e la catena e' vuota» scattava senza nessun file.
   */
  assert.equal(quantiSulPiano('vettorializza', {}), 0, 'il tasto Zack si spegnerebbe all’apertura');
  assert.equal(quantiSulPiano('vettorializza', { file: {} }), 1);
  // E il piano resta «non vuoto»: sono due domande diverse.
  assert.equal(pianoVuoto('vettorializza', {}), false);
});
