import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { guidaDritta, maniglia, puntoDellaGuida, spostaManiglia, tracciaGuidata } from '../engine/righello.js';
import { nuovoGesto, giu, muove, su, dueDita, applica, accumula } from '../engine/gesti.js';
import {
  stroke,
  maskFromRgba,
  applyMask,
  colorsFrom,
  changedPixels,
  ERASE,
  RESTORE,
} from '../engine/brush.js';

/**
 * Le misure del pennello, in pixel DELLO SCHERMO.
 *
 * Il 4 non c'era, e il committente ci ha sbattuto contro (2026-08-27): quando
 * lo scontorno fallisce del tutto — non vede nemmeno il disco colorato dietro
 * il soggetto — rifare il bordo col 10 e' come disegnare un contorno con un
 * pennarello. Il 4 e' il piu' piccolo che resti visibile e afferrabile col
 * dito su un telefono.
 *
 * Sono pixel dello SCHERMO, non dell'immagine: `raggio = (size / 2) * scale`
 * converte, quindi zoomando lo stesso tasto copre meno pixel veri. Le due
 * lamentele — «la matita non e' abbastanza piccola» e «non si puo' zoomare» —
 * sono la stessa lamentela, e lo zoom e' la meta' che mancava.
 */
const SIZES = [4, 10, 25, 60, 120];

/**
 * Quanto si puo' ingrandire la tela.
 *
 * Otto volte: su un file da 4096 px mostrato a 800 significa arrivare a circa
 * 1,6 pixel dell'immagine per pixel dello schermo, cioe' vedere il bordo per
 * quello che e'. Oltre si guarda l'interpolazione, non il file.
 */
const ZOOM_MAX = 8;
const MAX_UNDO = 12;

/**
 * Correzione a mano del ritaglio.
 *
 * L'AI sbaglia sempre in qualche punto, e senza un modo di correggere l'utente
 * deve buttare via tutto il risultato per un capello di troppo. Qui si dipinge
 * sull'alfa: si toglie ciò che è rimasto, si recupera ciò che è sparito.
 *
 * Funziona a mouse e a dito: su un telefono il pennello è l'unico modo
 * praticabile di rifinire un ritaglio.
 *
 * **Serve il file di partenza, non solo il ritaglio.** Il canvas premoltiplica
 * i colori per l'opacità: ciò che è stato portato a trasparente ha perso il
 * colore sul posto, e recuperarlo dal solo ritaglio ridipinge nero. I colori
 * vivi stanno soltanto nella sorgente.
 */
/**
 * I pixel di un'immagine, eventualmente riportata a una misura data.
 *
 * Riscalare è lecito **solo se le proporzioni coincidono**: un ingrandimento
 * cambia la misura ma non il contenuto, quindi la sorgente riscalata ha il
 * colore giusto in ogni punto. Un ritaglio invece cambia il contenuto, e
 * riscalarlo sposterebbe i colori di posto — lì si rinuncia e lo si dice.
 *
 * Prima non si riscalava mai: dopo un ingrandimento in blocco la sorgente
 * aveva un'altra misura, il pennello rinunciava al colore e ciò che si
 * recuperava tornava NERO. Il difetto si vedeva solo correggendo a mano un
 * file passato dal blocco, cioè nel momento peggiore.
 */
async function toPixels(blob, misura = null) {
  const bmp = await createImageBitmap(blob);

  let w = bmp.width;
  let h = bmp.height;
  if (misura) {
    const stessaForma = Math.abs(bmp.width / bmp.height - misura.w / misura.h) < 0.01;
    if (stessaForma) {
      w = misura.w;
      h = misura.h;
    }
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

/** La curva della guida, tracciata due volte: un filo scuro sotto, l'oro sopra. */
function traccia(cx, guida) {
  cx.beginPath();
  cx.moveTo(guida.a.x, guida.a.y);
  cx.quadraticCurveTo(guida.c.x, guida.c.y, guida.b.x, guida.b.y);
  cx.stroke();
}

export default function MaskBrush({ source, cutout, modoIniziale, onChange, onDone }) {
  const canvasRef = useRef(null);
  // Le misure VISIBILI del palco (non della tela, che puo' sconfinare):
  // servono a `limiti()` qui sotto per pinzare lo spostamento sulla
  // geometria vera, invece che su un pavimento fisso (Giro di correzione 2).
  const stageRef = useRef(null);
  const stateRef = useRef(null);
  // Lo strumento con cui si entra: dai cerchi a destra si sceglie GIA' cosa
  // fare — righello, ripristina, cancella — e riaprirsi sempre sulla gomma
  // vorrebbe dire premere due volte per la stessa cosa.
  const [mode, setMode] = useState(modoIniziale || 'erase');
  const [size, setSize] = useState(25);
  const [dirty, setDirty] = useState(false);
  /**
   * La vista della tela: spostamento e ingrandimento in UN solo posto.
   *
   * È lo stato che il gesto a due dita e i pulsanti `+`/`−` condividono — la
   * porta che non si chiude (chi lavora col mouse non ha un secondo dito):
   * i pulsanti restano, ma scrivono qui, non in una variabile a parte che
   * il gesto ignorerebbe o azzererebbe.
   */
  const [vista, setVista] = useState({ x: 0, y: 0, z: 1 });
  const zoom = vista.z;
  // Lo stato dei puntatori per il gesto a due dita: un dito lavora, due
  // spostano e ingrandiscono. Vive per tutta la vita del componente, non si
  // ricrea a ogni render.
  const gesto = useRef(nuovoGesto());
  /**
   * Il valore VERO del gesto a due dita, senza pinza.
   *
   * Giro di correzione 1, Critico 2: pinzare `vista` a ogni `pointermove` e
   * poi ripartire dal risultato già pinzato per il passo successivo fa
   * sbagliare lo zoom quando un passo intermedio del gesto tocca un limite
   * (il pizzico a due dita è un evento per DITO, non uno per gesto — un
   * dito arriva prima dell'altro quasi sempre). Qui si accumula grezzo per
   * tutta la durata del gesto (`accumula`, mai pinzato) e si pinza *una
   * volta sola* (`applica`) quando si scrive `vista`. `null` fuori da un
   * gesto a due dita: il prossimo gesto riparte dal valore mostrato.
   */
  const vistaGrezza = useRef(null);
  /**
   * Il palco misurato all'INIZIO del gesto a due dita, non ogni volta.
   *
   * Trappola misurata in scrittura: `.brush-stage[data-zoom]` (styles.css)
   * fa dipendere l'ALTEZZA del palco stesso da `zoom > 1` — sul telefono,
   * 182px sotto 1x, 550px sopra. Un pizzico che attraversa lo zero (z che
   * sale sopra 1 e poi torna a toccarlo) fa scattare quell'attributo A META'
   * GESTO: leggere il palco dal vivo a ogni `pointermove` significa pinzare
   * lo spostamento su un palco che cambia misura sotto il gesto stesso — un
   * secondo palco 550 al posto di 182 rende il margine verticale negativo
   * (la tela a 1x, 251px, e' piu' bassa di 550) e AZZERA uno spostamento
   * legittimo. Il palco si misura una volta, quando il secondo dito atterra
   * (`begin`), e resta quello per tutta la durata del gesto — esattamente
   * come `vistaGrezza` non si ripinza a ogni evento.
   */
  const palcoCatturato = useRef(null);
  /**
   * La geometria vera per pinzare lo spostamento (`gesti.js`, `limita`).
   *
   * Il modulo e' puro e non tocca il DOM: qui si legge — palco e tela, non
   * di piu' — e si passa. `palco` sono le misure VISIBILI di `.brush-stage`
   * (`clientWidth`/`clientHeight`, mai quelle della tela che puo' sconfinare
   * oltre) — quelle CATTURATE all'inizio del gesto se ce n'e' uno in corso
   * (`palcoCatturato`), altrimenti quelle attuali (i pulsanti, che non sono
   * un gesto disteso su piu' eventi, misurano dal vivo). `tela` sono le
   * misure NATURALI dell'immagine (`s.w`/`s.h`, gli stessi pixel della
   * maschera — la tela resa e' sempre larga `palco.w * z`, qualunque sia lo
   * zoom, e alta in proporzione a questo rapporto).
   *
   * `undefined` prima che l'immagine sia pronta: `limita` degrada da sola al
   * solo pinzare `z`, senza un palco su cui misurare uno spostamento.
   */
  const limiti = () => {
    const st = stageRef.current;
    const s = stateRef.current;
    if (!s) return { min: 1, max: ZOOM_MAX };
    const palco = palcoCatturato.current || (st ? { w: st.clientWidth, h: st.clientHeight } : null);
    if (!palco) return { min: 1, max: ZOOM_MAX };
    return { min: 1, max: ZOOM_MAX, palco, tela: { w: s.w, h: s.h } };
  };
  /**
   * Il palco cambia misura quando `data-zoom` si accende o si spegne: si
   * ripinza `vista` sulla misura NUOVA, dopo che il DOM l'ha presa.
   *
   * Giro di correzione 3, Importante 2, la meta' dei pulsanti: `+` e `−`
   * pinzano sul palco di PRIMA del render che accende o spegne `data-zoom`
   * (182/233 contro 550 sul telefono). Da 1× a 2× il margine calcolato sul
   * palco basso e' piu' largo di quello vero: con palco 251×233/550, una
   * tela alta a 1× fra 233 e 317 px (un 4:5 verticale ne fa 314) portata al
   * margine resta fuori di qualche pixel dopo il `+` — `(2T−550)/2 <
   * (T−233)/2` per `T < 317`. Qui si rilegge dal vivo UNA volta,
   * a DOM aggiornato. Durante un gesto a due dita non si tocca niente: li'
   * comanda il palco catturato (stabilita' a meta' gesto), e il rilascio
   * ripinza da se' (vedi `end`).
   */
  const ingrandita = zoom > 1;
  useLayoutEffect(() => {
    if (palcoCatturato.current) return;
    setVista((v) => {
      const n = applica(v, {}, limiti());
      return n.x === v.x && n.y === v.y && n.z === v.z ? v : n;
    });
    // Solo quando `data-zoom` cambia: `limiti` si ricrea a ogni render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingrandita]);
  /**
   * La guida del righello, e cosa si sta trascinando.
   *
   * Il righello non dipinge: guida chi dipinge. Con una guida attiva, Gomma e
   * Recupera lavorano in BARRIERA — il colore non passa dall'altra parte — ed
   * e' la risposta al bordo che il modello ha sbagliato: si mette la guida dove
   * dovrebbe stare e si riempie di getto, invece di ricalcarlo.
   */
  const [guida, setGuida] = useState(null);
  const presa = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  // Vero quando la sorgente non è utilizzabile: il recupero funziona ancora
  // dove il colore è sopravvissuto, ma va detto prima, non scoperto dipingendo.
  const [limited, setLimited] = useState(false);

  // Prepara i pixel una volta: il colore non cambia mai, solo l'alfa.
  useEffect(() => {
    let alive = true;
    (async () => {
      const cut = await toPixels(cutout);
      if (!alive) return;

      // La sorgente può mancare, essere un vettore, o avere un'altra
      // dimensione dopo un ritaglio o un ingrandimento. In tutti questi casi
      // si continua con quello che c'è invece di fermarsi.
      let src = null;
      try {
        src = source ? await toPixels(source, { w: cut.w, h: cut.h }) : null;
      } catch (e) {
        console.error(e);
      }
      if (!alive) return;

      const count = cut.w * cut.h;
      const usable = src && src.w === cut.w && src.h === cut.h;
      setLimited(!usable);

      stateRef.current = {
        w: cut.w,
        h: cut.h,
        rgba: colorsFrom(usable ? src.data : null, cut.data, count),
        mask: maskFromRgba(cut.data, count),
        undo: [],
        last: null,
      };
      paint();
    })();
    return () => {
      alive = false;
    };
    // Si prepara una volta per ogni ritaglio ricevuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutout, source]);

  const paint = useCallback(() => {
    const s = stateRef.current;
    const cv = canvasRef.current;
    if (!s || !cv) return;
    cv.width = s.w;
    cv.height = s.h;
    const copy = new Uint8ClampedArray(s.rgba);
    applyMask(copy, s.mask, s.w * s.h);
    const cx = cv.getContext('2d');
    cx.putImageData(new ImageData(copy, s.w, s.h), 0, 0);

    // La guida si disegna QUI, dentro la tela, e non in un livello sopra: un
    // elemento allineato a parte si scollerebbe al primo zoom. Non finisce nel
    // file salvato, che `commit` ricostruisce dai pixel piu' la maschera.
    if (!guida) return;

    /*
     * La guida si misura in pixel DELLO SCHERMO, non dell'immagine.
     *
     * Il difetto (2026-09-05, riferito dal committente come «il righello
     * ancora niente»): lo spessore era `max(2, larghezza/400)` in pixel
     * d'immagine. Su un telefono la tela e' mostrata rimpicciolita — misurato:
     * un'immagine da 2000 px in un riquadro da 295 css, scala 6,78 — quindi
     * quei 5 pixel d'immagine diventavano **0,74 px sullo schermo**, piu'
     * sottili di un pixel. E le maniglie erano punti da 2,2 px, contro i 44
     * che il contratto UX dichiara come minimo per un dito.
     *
     * Si trascinava, la guida NASCEVA davvero, e non si vedeva: da fuori e'
     * indistinguibile da un comando rotto — che e' esattamente come e' stato
     * riferito, due volte.
     *
     * Il conto giusto il pennello lo fa gia' in `move()`. Qui non lo faceva.
     */
    const scala = s.w / (canvasRef.current?.getBoundingClientRect().width || s.w);
    const px = (schermo) => schermo * scala;

    cx.save();
    // Un filo scuro sotto: l'oro su una maglietta chiara sparisce, e la guida
    // deve vedersi su qualunque immagine.
    cx.lineCap = 'round';
    cx.strokeStyle = 'rgba(17, 17, 17, 0.55)';
    cx.lineWidth = px(4.5);
    traccia(cx, guida);
    cx.strokeStyle = '#c4a35a';
    cx.lineWidth = px(2.5);
    traccia(cx, guida);

    for (const q of [guida.a, guida.b, puntoDellaGuida(guida, 0.5)]) {
      // Il pallino si VEDE a 9 px di raggio; la zona che lo AFFERRA e' piu'
      // grande e sta in `begin`, come per il punto oro.
      cx.beginPath();
      cx.arc(q.x, q.y, px(9), 0, Math.PI * 2);
      cx.fillStyle = '#c4a35a';
      cx.fill();
      cx.lineWidth = px(2);
      cx.strokeStyle = 'rgba(17, 17, 17, 0.55)';
      cx.stroke();
    }
    cx.restore();
  }, [guida]);

  // Ridisegna quando la guida cambia: senza, la si trascina e non si vede.
  useEffect(() => {
    paint();
  }, [guida, paint]);

  /** Dal punto sullo schermo al pixel dell'immagine, qualunque sia lo zoom. */
  const toImage = (ev) => {
    const cv = canvasRef.current;
    const r = cv.getBoundingClientRect();
    const p = ev.touches?.[0] || ev;
    return {
      x: ((p.clientX - r.left) / r.width) * cv.width,
      y: ((p.clientY - r.top) / r.height) * cv.height,
    };
  };

  const begin = (ev) => {
    const s = stateRef.current;
    if (!s) return;
    ev.preventDefault();

    giu(gesto.current, { id: ev.pointerId, x: ev.clientX, y: ev.clientY });
    if (dueDita(gesto.current)) {
      // Il secondo dito e' appoggiato: da qui si ingrandisce e si sposta,
      // non si lavora. Si annulla il tratto o la presa del righello in
      // corso, altrimenti il secondo dito lascerebbe una riga o
      // trascinerebbe una maniglia per sbaglio.
      s.last = null;
      presa.current = null;
      // Il gesto a due dita comincia ORA: si riparte dal valore mostrato,
      // ancora non pinzato di nuovo (vedi il commento su `vistaGrezza`), e
      // si cattura il palco UNA VOLTA (vedi il commento su
      // `palcoCatturato`) — non a ogni evento, o il palco stesso cambia
      // misura a meta' gesto quando lo zoom attraversa 1x.
      if (!vistaGrezza.current) {
        vistaGrezza.current = { ...vista };
        palcoCatturato.current = stageRef.current
          ? { w: stageRef.current.clientWidth, h: stageRef.current.clientHeight }
          : null;
      }
      return;
    }

    if (mode === 'righello') {
      const p = toImage(ev);
      // 22 px dello schermo di raggio, cioe' un bersaglio da 44: e' la
      // misura minima dichiarata nel contratto UX §3, «sotto i 44x44 px un
      // comando si sbaglia». Prima erano `s.w / 40` pixel d'IMMAGINE, che su
      // una foto da 2000 px in un riquadro da 295 fanno 7 px veri: una
      // maniglia che col dito non si prende mai.
      const scala = s.w / (canvasRef.current?.getBoundingClientRect().width || s.w);
      const raggio = Math.max(14, 22 * scala);
      const quale = guida ? maniglia(guida, p, { presa: raggio }) : null;
      // Senza guida il primo trascinamento la crea; con guida si afferra una
      // maniglia, e toccando lontano se ne ricomincia una nuova.
      presa.current = quale ? { quale, ultimo: p } : { quale: 'nuova', da: p };
      if (!quale) setGuida(guidaDritta(p, p));
      return;
    }

    // La cronologia si limita: dodici passi bastano e non mangiano memoria.
    s.undo.push(s.mask.slice());
    if (s.undo.length > MAX_UNDO) s.undo.shift();
    setCanUndo(true);
    s.last = toImage(ev);
    move(ev);
  };

  const move = (ev) => {
    const s = stateRef.current;

    const m = muove(gesto.current, { id: ev.pointerId, x: ev.clientX, y: ev.clientY });
    if (m) {
      // Due dita: si sposta e si ingrandisce la vista, non si dipinge.
      // Il clamp si applica una volta per gesto, non a ogni evento: si
      // accumula sul valore grezzo (mai pinzato, vedi `vistaGrezza`) e si
      // pinza solo qui, scrivendo `vista` — lo stesso posto in cui
      // scrivono i pulsanti +/-: nessuno dei due sovrascrive o ignora
      // l'altro.
      ev.preventDefault();
      vistaGrezza.current = accumula(vistaGrezza.current || vista, m);
      setVista(applica(vistaGrezza.current, {}, limiti()));
      return;
    }

    if (mode === 'righello') {
      const g = presa.current;
      if (!g) return;
      ev.preventDefault();
      const p = toImage(ev);
      if (g.quale === 'nuova') setGuida(guidaDritta(g.da, p));
      else {
        setGuida((v) => spostaManiglia(v, g.quale, { x: p.x - g.ultimo.x, y: p.y - g.ultimo.y }));
        presa.current = { ...g, ultimo: p };
      }
      return;
    }

    if (!s || !s.last) return;
    ev.preventDefault();
    const p = toImage(ev);
    // Il raggio è in pixel dell'immagine, così il pennello ha la stessa
    // dimensione percepita a qualsiasi zoom.
    const scale = s.w / canvasRef.current.getBoundingClientRect().width;
    tracciaGuidata(
      s.mask,
      s.w,
      s.h,
      s.last,
      p,
      { raggio: (size / 2) * scale, valore: mode === 'erase' ? ERASE : RESTORE },
      guida,
      { modo: 'barriera' },
    );
    s.last = p;
    paint();
    setDirty(true);
  };

  const end = (ev) => {
    // Il dito si alza: esce dallo stato del gesto, cosi' se ne resta uno
    // solo si torna a lavorare invece di continuare a leggere un centro fra
    // due dita di cui una non c'e' piu' (il salto classico).
    su(gesto.current, ev?.pointerId);
    // Il gesto a due dita e' finito (o non lo era mai): il prossimo riparte
    // dal valore mostrato, non da un residuo grezzo di uno vecchio — e
    // ricattura il palco daccapo, invece di tenere quello di un gesto ormai
    // chiuso.
    if (!dueDita(gesto.current)) {
      const gestoFinito = palcoCatturato.current !== null;
      vistaGrezza.current = null;
      palcoCatturato.current = null;
      if (gestoFinito) {
        // IMPORTANTE 2 (Giro 3): il palco catturato all'inizio del gesto
        // puo' non descrivere piu' il palco vero quando le dita si alzano —
        // `.brush-stage[data-zoom]` (styles.css) fa crescere lo stage non
        // appena `z` supera 1x, A META' GESTO, e il palco catturato resta
        // quello piccolo di prima per tutta la durata (di proposito, e' cio'
        // che da' stabilita' DURANTE il gesto). Misurato nel browser: un
        // pizzico che porta a 2x lascia il margine calcolato sul vecchio
        // palco (233) invece di quello vero, ormai cresciuto (550) — la
        // tela resta con una parte fuori dal palco finche' non arriva un
        // tocco nuovo che ricattura tutto daccapo. Qui si ripinza `vista`
        // UNA VOLTA, subito dopo il rilascio, sulla geometria LIVE
        // (`limiti()` legge dal vivo perche' `palcoCatturato.current` e'
        // gia' `null` sopra): non tocca la stabilita' durante il gesto,
        // solo il fotogramma del rilascio.
        setVista((v) => applica(v, {}, limiti()));
      }
    }
    presa.current = null;
    const s = stateRef.current;
    if (!s) return;
    s.last = null;
    // Una passata che non ha cambiato nulla non entra nella cronologia:
    // un annulla che non annulla niente sembra rotto.
    const prev = s.undo[s.undo.length - 1];
    if (prev && changedPixels(prev, s.mask) === 0) s.undo.pop();
    setCanUndo(s.undo.length > 0);
  };

  const undo = () => {
    const s = stateRef.current;
    if (!s?.undo.length) return;
    s.mask = s.undo.pop();
    setCanUndo(s.undo.length > 0);
    paint();
  };

  const commit = async () => {
    const s = stateRef.current;
    if (!s) return;
    const cv = canvasRef.current;
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    onDone(blob);
    setDirty(false);
  };

  return (
    <div className="brush">
      <div className="brush-bar">
        <button
          className="opt"
          aria-pressed={mode === 'erase'}
          onClick={() => setMode('erase')}
          title={t('brush.eraseHelp')}
        >
          {t('brush.erase')}
        </button>
        <button
          className="opt"
          aria-pressed={mode === 'restore'}
          onClick={() => setMode('restore')}
          title={t('brush.restoreHelp')}
        >
          {t('brush.restore')}
        </button>

        <button
          className="opt"
          aria-pressed={mode === 'righello'}
          onClick={() => setMode(mode === 'righello' ? 'erase' : 'righello')}
          title={t('brush.rulerHelp')}
        >
          {t('brush.ruler')}
        </button>
        {guida && (
          <button className="btn ghost small" onClick={() => setGuida(null)}>
            {t('brush.rulerOff')}
          </button>
        )}

        <span className="brush-zoom">
          <button
            onClick={() => {
              // Un click e' un gesto a un dito solo, non a due: qualunque
              // grezzo lasciato da un pizzico interrotto non deve influire
              // sul prossimo (vedi il commento su `vistaGrezza`).
              vistaGrezza.current = null;
              palcoCatturato.current = null;
              setVista((v) => {
                // Stesso stato del gesto: si legge e si scrive `vista`, mai
                // una copia separata che il pizzico ignorerebbe. La stessa
                // `applica` del gesto pinza lo spostamento sulla geometria
                // vera (Giro di correzione 2): non c'e' piu' un azzeramento
                // manuale al minimo, che a un palco piu' basso della tela
                // toglierebbe l'unico modo di raggiungere il fondo dell'
                // immagine.
                const z = Math.max(1, Math.round(v.z / 1.5));
                return applica({ ...v, z }, {}, limiti());
              });
            }}
            disabled={zoom <= 1}
            aria-label={t('brush.zoomOut')}
          >
            −
          </button>
          {/* Il numero, non un'icona: chi corregge un bordo vuole sapere DOVE
              sta, e «3x» lo dice mentre una lente non lo dice. Arrotondato:
              il pizzico a due dita, a differenza dei pulsanti, non ferma la
              vista su un intero. */}
          <b>{Math.round(zoom * 10) / 10}×</b>
          <button
            onClick={() => {
              vistaGrezza.current = null;
              palcoCatturato.current = null;
              setVista((v) => applica({ ...v, z: Math.min(ZOOM_MAX, v.z < 2 ? 2 : v.z + 2) }, {}, limiti()));
            }}
            disabled={zoom >= ZOOM_MAX}
            aria-label={t('brush.zoomIn')}
          >
            +
          </button>
        </span>

        <span className="brush-sizes">
          {SIZES.map((s) => (
            <button key={s} aria-pressed={size === s} onClick={() => setSize(s)} aria-label={`${s}px`}>
              <i style={{ width: Math.min(18, s / 6), height: Math.min(18, s / 6) }} />
            </button>
          ))}
        </span>

        <button className="btn ghost small" disabled={!canUndo} onClick={undo}>
          {t('editor.undo.label')}
        </button>
        <button className="btn small" disabled={!dirty} onClick={commit}>
          {t('brush.apply')}
        </button>
      </div>

      {limited && mode === 'restore' && <p className="verdict" data-level="attenzione">{t('brush.limited')}</p>}

      {/* Ingrandire la tela e' l'altra meta' del pennello piccolo: il raggio e'
          in pixel dello schermo, quindi a 8x lo stesso tasto copre otto volte
          meno pixel veri. Con un dito solo, lo spostamento resta lo
          SCORRIMENTO nativo del contenitore (barra, trackpad) — chi lavora
          col mouse non ha un secondo dito, e questa via non si tocca. Con
          due dita, `vista.x/y` sposta la tela sopra quello: e' l'unica via
          per chi tocca, perche' `touch-action: none` (sotto) toglie apposta
          lo scorrimento nativo del browser sulla tela. */}
      <div className="brush-stage" data-zoom={ingrandita || undefined} ref={stageRef}>
        <canvas
          ref={canvasRef}
          onPointerDown={begin}
          onPointerMove={(e) => e.buttons && move(e)}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          style={{
            cursor: 'crosshair',
            touchAction: 'none',
            width: zoom > 1 ? `${zoom * 100}%` : undefined,
            maxWidth: zoom > 1 ? 'none' : undefined,
            transform: vista.x || vista.y ? `translate(${vista.x}px, ${vista.y}px)` : undefined,
          }}
        />
      </div>
    </div>
  );
}
