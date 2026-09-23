/**
 * Due dita muovono e ingrandiscono, un dito lavora.
 *
 * La regola trasversale T5 del quaderno, e la condizione perché la penna e lo
 * zoom possano convivere: senza, si contendono lo stesso dito e uno dei due
 * deve sparire — è il motivo per cui oggi lo zoom è affidato a due pulsanti
 * `+` e `−` invece che al gesto che tutti fanno per istinto.
 *
 * Puro apposta, come `pixels.js` e `righello.js`: qui dentro c'è la
 * matematica che sbaglia in silenzio (un centro che salta, un fattore che
 * diverge), e in Node si guarda invece di indovinarla su un telefono.
 *
 * Niente `Math.hypot` sulla distanza zero: due dita nello stesso punto danno
 * fattore 1, non `Infinity`.
 */

export function nuovoGesto() {
  return { dita: new Map(), iniziale: null };
}

export function dueDita(g) {
  return g.dita.size >= 2;
}

export function giu(g, { id, x, y }) {
  g.dita.set(id, { x, y });
  // Sotto le due dita non c'e' un pizzico in corso: qualunque riferimento
  // vecchio (`iniziale`, la distanza di partenza) non significa piu' niente
  // e va dimenticato, o il PROSSIMO pizzico erediterebbe la base sbagliata.
  if (g.dita.size < 2) g.iniziale = null;
}

export function su(g, id) {
  g.dita.delete(id);
  if (g.dita.size < 2) g.iniziale = null;
}

/** Gli ID dei due punti attivi, in ordine stabile. */
function coppiaId(g) {
  const k = [...g.dita.keys()];
  return [k[0], k[1]];
}

/** I due punti attivi, in ordine stabile. */
function coppia(g) {
  const v = [...g.dita.values()];
  return [v[0], v[1]];
}

function distanza(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return d < 1 ? 1 : d;
}

/**
 * Sotto questa differenza (in pixel dello schermo) due separazioni delle dita
 * sono la STESSA separazione.
 *
 * Giro di correzione 3, trovato verificando il Critico 1: le coordinate di un
 * dito vero sono frazionarie (`clientX` 187.3333… su uno schermo a 3x), e
 * `hypot` di due differenze che sono uguali in aritmetica esatta non lo e'
 * sempre in virgola mobile — misurato in Node su 20 000 pan puri a
 * coordinate frazionarie, il 18% finiva a `1.0000000000000002` invece che a
 * `1`. Non e' un'estetica: `MaskBrush.jsx` accende `data-zoom` su `zoom > 1`,
 * e quell'ulp fa CRESCERE il palco (233 → 550 sul telefono) sotto un pan che
 * non ha ingrandito niente. Un milionesimo di pixel e' molto sotto qualunque
 * sensore: nessun pizzico vero lo produce.
 */
const STESSA_SEPARAZIONE = 1e-6;

/**
 * Un dito si muove.
 *
 * Torna `null` con un dito solo — **è il segnale che il gesto è lavoro**, e
 * chi chiama deve dipingere invece di spostare la vista. Con due dita torna:
 *
 * - `dx`,`dy`: lo spostamento del centro delle dita, RELATIVO al passo
 *   precedente (additivo: una somma non compone, non ha il problema di
 *   `fattore`);
 * - `fattore`: il rapporto fra la separazione ATTUALE delle dita e quella
 *   misurata all'INIZIO del pizzico — assoluto, mai rispetto all'evento
 *   precedente;
 * - `assestato`: vero sull'evento che chiude una «ronda» (vedi sotto).
 *
 * **Giro di correzione 3, Critico 1 — `fattore` e' assoluto dall'inizio del
 * gesto.** Era `dopo.d / prima.d`, il rapporto rispetto all'evento
 * PRECEDENTE, che chi chiama moltiplicava nel proprio `z` evento dopo evento.
 * Un pizzico e' un `pointermove` per DITO, non uno per gesto: un pan puro
 * arriva come due eventi con un fattore intermedio lontano da 1 (nel caso
 * del controllore 23/83 = 0,277), che la banda di allora riscriveva,
 * corrompendo la base su cui il secondo evento moltiplicava — 1× finiva a
 * 1,8×, e a 8× col passo uguale alla separazione. Ora `iniziale.d` si
 * cattura UNA volta, al primo evento del pizzico, e non si tocca piu' finche'
 * il pizzico dura: `z = zIniziale × separazione / separazioneIniziale`
 * (vedi `accumula`) e il ritorno esatto di un pan puro — o di qualunque
 * pizzico che riporti le dita alla separazione di partenza — e' vero PER
 * COSTRUZIONE, non per una somma di errori che si compensano.
 *
 * **La «ronda» NON tocca `fattore`.** Una ronda si chiude quando ENTRAMBE le
 * dita della coppia si sono mosse almeno una volta dall'ultima chiusura:
 * dentro una ronda (un dito solo spostato) la separazione vera e' davvero,
 * per un evento, diversa. Serve solo a chi pinza lo spostamento (`limita`,
 * via `accumula`): e' il momento in cui lo zoom mostrato e' di nuovo
 * affidabile come misura del margine. Una prima versione di questo giro
 * ri-basava ANCHE `iniziale.d` a ogni ronda: il prodotto telescopico e'
 * uguale in aritmetica esatta ma non in virgola mobile — misurato, uno
 * spread e ritorno alla separazione di partenza nello stesso tocco finiva a
 * `1.5000000000000002` invece di `1.5` nel 57% dei casi. Qui non si ri-basa.
 *
 * Limite noto, non coperto da prova: se durante un pizzico a due dita ne
 * atterra una terza e poi si alza una delle due originarie, la coppia attiva
 * cambia ma `iniziale` resta quello della coppia di partenza. Un caso a tre
 * dita, mai richiesto da nessun finding. Fuori scope.
 */
export function muove(g, { id, x, y }) {
  if (!g.dita.has(id)) return null;
  if (g.dita.size < 2) {
    g.dita.set(id, { x, y });
    return null;
  }
  const [idA, idB] = coppiaId(g);
  const [a1, b1] = coppia(g);
  const prima = { cx: (a1.x + b1.x) / 2, cy: (a1.y + b1.y) / 2, d: distanza(a1, b1) };
  if (!g.iniziale) g.iniziale = { d: prima.d, ronda: new Set() };
  g.dita.set(id, { x, y });
  const [a2, b2] = coppia(g);
  const dopo = { cx: (a2.x + b2.x) / 2, cy: (a2.y + b2.y) / 2, d: distanza(a2, b2) };
  const ini = g.iniziale;
  const fattore = Math.abs(dopo.d - ini.d) < STESSA_SEPARAZIONE ? 1 : dopo.d / ini.d;
  if (id === idA || id === idB) ini.ronda.add(id);
  const assestato = ini.ronda.has(idA) && ini.ronda.has(idB);
  if (assestato) ini.ronda = new Set();
  return { dx: dopo.cx - prima.cx, dy: dopo.cy - prima.cy, fattore, assestato };
}

/**
 * Accumula un evento del gesto SENZA pinzare ai limiti dichiarati.
 *
 * Il valore grezzo vive per tutta la durata del gesto e si pinza *una sola
 * volta*, con `applica`, quando si scrive lo stato mostrato (Giro di
 * correzione 1, Critico 2: pinzare a ogni evento e ripartire dal pinzato fa
 * sbagliare il gesto appena un passo intermedio tocca un limite).
 *
 * - `x`,`y`: additivi, un delta per evento.
 * - `z`: NON si accumula. Si RICALCOLA da `zIniziale` — lo zoom di quando il
 *   pizzico e' cominciato, catturato la prima volta che si passa di qui e poi
 *   portato avanti invariato — per `fattore`, assoluto dall'inizio del
 *   pizzico (vedi `muove`). `fattore` assente (i pulsanti `+`/`−`, un
 *   `applica` di sola pinza) lascia `z` com'e'.
 * - `zMargine`: lo zoom su cui `limita` misura il margine dello spostamento.
 *   Parte da `zIniziale` e si aggiorna allo `z` appena calcolato SOLO sugli
 *   eventi che chiudono una ronda (`assestato`), mai a meta'.
 *
 * **Perche' due zoom e non uno (Giro 3, Nuovo Problema 3).** A meta' ronda
 * lo zoom mostrato trema davvero (un dito spostato, l'altro no: le dita SONO
 * piu' vicine per un evento). Se il margine si misura su quello, un tuffo
 * verso 1× lo azzera — a 1× il margine orizzontale e' identicamente zero —
 * e lo spostamento collassa a scatto (misurato: da 2×, `translate(-60px,0)`
 * passava per `""`). Misurato invece sullo zoom di inizio gesto e basta, uno
 * spread seguito da un pan nello STESSO tocco resterebbe pinzato sul margine
 * di prima dello spread finche' le dita non si alzano. La ronda da' a
 * ciascuno il suo: il margine segue lo zoom, ma solo quando lo zoom e' una
 * misura vera.
 *
 * **Storia — `bandaGrezza` non c'e' piu'.** Fino al Giro 2, `z` era
 * `grezza.z × fattore` per evento, pinzato a una banda larga (`min/2`..
 * `max×2`) contro la fuga di una stretta violenta. Bandare il valore
 * intermedio RISCRIVEVA l'unica memoria che il gesto aveva del suo inizio
 * (23/83 bandato a 0,5, poi ×83/23 = 1,8× invece di 1×). Con `z` ricalcolato
 * sempre dallo stesso `zIniziale` non c'e' niente che possa fuggire: una
 * stretta violenta da' uno `z` grezzo basso e vero, e la riapertura lo
 * ricalcola subito dalla stessa base.
 */
export function accumula(grezza, { dx = 0, dy = 0, fattore, assestato = false } = {}) {
  const zIniziale = grezza.zIniziale ?? grezza.z;
  const z = fattore == null ? grezza.z : zIniziale * fattore;
  const zMargine = assestato ? z : (grezza.zMargine ?? zIniziale);
  return { x: grezza.x + dx, y: grezza.y + dy, z, zIniziale, zMargine };
}

/**
 * La vista dentro i limiti — di zoom, e di geometria.
 *
 * Un ingrandimento fuori scala è un guasto: si pinza. Lo spostamento (`x`,
 * `y`) si pinza sulla geometria VERA del palco (`palco: {w,h}`, le misure
 * visibili dello stage) e della tela (`tela: {w,h}`, le misure NATURALI —
 * non quelle rese — dell'immagine): la tela resa e' sempre larga
 * `palco.w * z` (e' cosi' che la CSS la disegna, anche a 1x — vedi il
 * commento su `MaskBrush.jsx`), alta in proporzione al rapporto di `tela`.
 * Il margine e' meta' dello sconfinamento su ciascun asse: e' lo spazio che
 * serve per portare il bordo lontano della tela a filo col bordo del palco,
 * senza mai scoprire un vuoto oltre — ne' MAI lasciare che la tela esca
 * dalla cornice.
 *
 * **Giro di correzione 2:** qui NON si azzera `x`/`y` quando `z` tocca il
 * pavimento. Un palco piu' basso della tela lascia margine anche a 1x, ed
 * era quell'azzeramento a togliere l'unico modo che un dito aveva di
 * raggiungere il fondo dell'immagine, con `touch-action: none` a spegnere lo
 * scorrimento nativo. Quando la tela combacia col palco su un asse il
 * margine E' zero, e lo spostamento torna a zero DI CONSEGUENZA.
 *
 * **Giro di correzione 3:** il margine si misura su `zMargine` (vedi
 * `accumula`), non sullo `z` istantaneo; senza `zMargine` (i pulsanti, un
 * passo isolato) si usa `z`. La LARGHEZZA resa resta lo `z` istantaneo: quel
 * tremolio a meta' ronda e' inerente a eventi che arrivano un dito alla
 * volta, e su un telefono vero (un evento per dito per fotogramma, pochi
 * pixel ciascuno) e' sotto il pixel.
 *
 * Senza geometria (`palco`/`tela` mancanti) si pinza solo `z`.
 */
function limita({ x, y, z, zMargine }, { min = 1, max = 8, palco, tela } = {}) {
  const zl = Math.min(max, Math.max(min, z));
  if (!palco || !tela) return { x, y, z: zl };
  const zm = Math.min(max, Math.max(min, zMargine ?? z));
  const larghezzaTela = palco.w * zm;
  const altezzaTela = larghezzaTela * (tela.h / tela.w);
  // Giro 3, Minore 3: `Math.max(0, …)` non e' decorativo. Con una tela piu'
  // bassa (o piu' stretta) del palco lo sconfinamento e' NEGATIVO, e
  // `Math.min(-m, Math.max(m, v))` pinzerebbe `v` esattamente a `-m`,
  // cioe' spingerebbe la tela FUORI dal palco invece di lasciarla centrata.
  const margineX = Math.max(0, (larghezzaTela - palco.w) / 2);
  const margineY = Math.max(0, (altezzaTela - palco.h) / 2);
  // `|| 0` non `?? 0`: normalizza un -0 (Math.min/max possono tornarlo
  // quando il margine è 0) a 0 — un -0 confonderebbe chi usa `Object.is`.
  return {
    x: Math.min(margineX, Math.max(-margineX, x)) || 0,
    y: Math.min(margineY, Math.max(-margineY, y)) || 0,
    z: zl,
  };
}

/** La vista nuova, dentro i limiti. Un ingrandimento fuori scala è un guasto. */
export function applica(vista, mossa = {}, limiti) {
  return limita(accumula(vista, mossa), limiti);
}
