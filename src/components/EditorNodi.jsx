import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n/index.js';
import {
  leggiPercorso, scriviPercorso, muoviNodo, muoviManiglia, aggiungiNodo, togliNodo, curvaODritto, apriChiudi,
  angoloOLiscio, segmentoVicino, segmentiDi, nodoVicino,
} from '../engine/nodi.js';

/**
 * L'editor dei nodi (fase 8b, spec `2026-10-05-nodi-design.md` §2.3).
 *
 * Un livello NOSTRO sopra la tela di svgedit: la modalità nodi della libreria
 * si rompeva sulle trasformazioni e sui composti, e i suoi punti di 5 px non
 * si prendevano. Qui il tracciato scelto diventa il modello di `engine/nodi.js`,
 * e si disegna in coordinate dello SCHERMO con la stessa trasformazione della
 * tela (`getScreenCTM`): zoom, scorrimento e `transform` vengono gratis.
 *
 * - punti di 12 px con un bersaglio di 24 (`r` invisibile più grande);
 * - le maniglie solo sul nodo scelto e sui suoi vicini;
 * - trascinare riscrive `d` a ogni movimento (l'anteprima è il disegno vero);
 * - il rilascio entra nella cronologia di svgedit: «annulla» funziona;
 * - doppio clic su un segmento aggiunge un nodo; frecce, Canc, Esc.
 */

const RAGGIO = 6;
const BERSAGLIO = 12;

function leggi(el) {
  try {
    return leggiPercorso(el.getAttribute('d'));
  } catch {
    return null;
  }
}

export default function EditorNodi({ elemento, canvas, ospite = null, onEsci, onAvviso, piccolo = false, striscia = null }) {
  const [modello, setModello] = useState(() => leggi(elemento));
  // Il livello sta ESATTAMENTE sopra la tela (`ospite`), e taglia ciò che
  // ne esce: sul telefono la tela si vede solo in parte, e la linea dei nodi
  // finiva sopra i cerchi accanto (misurato a 375 px, 8c).
  const [posto, setPosto] = useState(null);
  const [scelto, setScelto] = useState(null);
  const [, ridisegna] = useState(0);
  const contenitore = useRef(null);
  const trascina = useRef(null);
  // L'ultimo `d` registrato: la cronologia va da qui al nuovo.
  const registrato = useRef(elemento.getAttribute('d'));
  const scritto = useRef(registrato.current);

  // Zoom, scorrimento, annulla dall'esterno: si ridisegna quando la
  // trasformazione cambia, e si rilegge il `d` se non l'abbiamo scritto noi.
  useEffect(() => {
    let vivo = true;
    let ultimo = '';
    const giro = () => {
      if (!vivo) return;
      const m = elemento.getScreenCTM?.();
      const r = contenitore.current?.getBoundingClientRect();
      const o = ospite?.getBoundingClientRect();
      const w = contenitore.current?.parentElement?.getBoundingClientRect();
      const firma = m && r ? `${m.a},${m.b},${m.c},${m.d},${m.e},${m.f},${r.left},${r.top},${o?.width},${o?.height}` : '';
      if (firma !== ultimo) {
        ultimo = firma;
        if (o && w) setPosto({ left: o.left - w.left, top: o.top - w.top, width: o.width, height: o.height });
        ridisegna((x) => x + 1);
      }
      const d = elemento.getAttribute('d');
      if (!trascina.current && d !== scritto.current) {
        scritto.current = d;
        registrato.current = d;
        const letto = leggi(elemento);
        if (letto) setModello(letto);
        setScelto(null);
      }
      requestAnimationFrame(giro);
    };
    requestAnimationFrame(giro);
    return () => {
      vivo = false;
    };
  }, [elemento, ospite]);

  /** Scrive il modello nel tracciato, dal vivo (senza cronologia). */
  function scrivi(m) {
    const d = scriviPercorso(m);
    scritto.current = d;
    elemento.setAttribute('d', d);
    setModello(m);
  }

  /** Il passo entra nella cronologia di svgedit: da `registrato` a quello che c'è adesso. */
  function registra() {
    const nuovo = elemento.getAttribute('d');
    const vecchio = registrato.current;
    if (nuovo === vecchio) return;
    elemento.setAttribute('d', vecchio);
    canvas?.changeSelectedAttribute?.('d', nuovo, [elemento]);
    if (elemento.getAttribute('d') !== nuovo) elemento.setAttribute('d', nuovo);
    registrato.current = nuovo;
    scritto.current = nuovo;
  }

  /** Un'operazione del modello, scritta e registrata in un colpo. */
  function fai(op) {
    const m = op(modello);
    if (!m) {
      onAvviso?.(t('nodi.ultimo'));
      return;
    }
    scrivi(m);
    registra();
  }

  useEffect(() => {
    const tasto = (e) => {
      const dove = e.target?.tagName;
      if (dove === 'INPUT' || dove === 'TEXTAREA' || e.target?.isContentEditable) return;
      // Questi tasti sono NOSTRI finché i nodi sono aperti: le scorciatoie
      // dell'editor (App) sposterebbero o cancellerebbero la forma INTERA.
      // Ci si mette in ascolto in cattura, e si ferma qui la propagazione.
      const prendi = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (e.key === 'Escape') {
        prendi();
        onEsci?.();
        return;
      }
      const nostro = e.key.startsWith('Arrow') || e.key === 'Delete' || e.key === 'Backspace';
      if (nostro && !e.metaKey && !e.ctrlKey) {
        if (!scelto) {
          prendi();
          return;
        }
      } else return;
      const passo = e.shiftKey ? 10 : 1;
      const frecce = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
      if (frecce[e.key]) {
        prendi();
        fai((m) => muoviNodo(m, scelto, ...frecce[e.key]));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        prendi();
        fai((m) => togliNodo(m, scelto));
        setScelto(null);
      }
    };
    window.addEventListener('keydown', tasto, true);
    return () => window.removeEventListener('keydown', tasto, true);
  });

  if (!modello) return null;
  const ctm = elemento.getScreenCTM?.();
  const box = contenitore.current?.getBoundingClientRect();
  const pronto = Boolean(ctm && box);
  const aSchermo = (p) => {
    if (!pronto) return { x: 0, y: 0 };
    const q = new DOMPoint(p.x, p.y).matrixTransform(ctm);
    return { x: q.x - box.left, y: q.y - box.top };
  };
  const aUtente = (clientX, clientY) => new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  // La scala dello schermo: per convertire i raggi in unità del documento.
  const scala = pronto ? Math.hypot(ctm.a, ctm.b) || 1 : 1;

  const dSchermo = pronto
    ? scriviPercorso({
        sottopercorsi: modello.sottopercorsi.map((s) => ({
          chiuso: s.chiuso,
          nodi: s.nodi.map((n) => ({
            ...aSchermo(n),
            dentro: n.dentro && aSchermo(n.dentro),
            fuori: n.fuori && aSchermo(n.fuori),
          })),
        })),
      })
    : '';

  function inizia(e, presa) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const u = aUtente(e.clientX, e.clientY);
    trascina.current = { ...presa, ultimo: { x: u.x, y: u.y }, mosso: false };
    if (presa.tipo === 'nodo') setScelto({ s: presa.s, n: presa.n });
  }

  function muovi(e) {
    const tr = trascina.current;
    if (!tr) return;
    const u = aUtente(e.clientX, e.clientY);
    tr.mosso = true;
    if (tr.tipo === 'nodo') {
      scrivi(muoviNodo(modello, tr, u.x - tr.ultimo.x, u.y - tr.ultimo.y));
      tr.ultimo = { x: u.x, y: u.y };
    } else {
      scrivi(muoviManiglia(modello, tr, u.x, u.y));
    }
  }

  function finisci() {
    const tr = trascina.current;
    trascina.current = null;
    if (tr?.mosso) registra();
  }

  /**
   * Doppio clic sulla linea: un nodo nuovo lì, senza cambiare la forma.
   * Ascoltato su tutto il livello e non solo sulla linea: su un tracciato
   * fitto i bersagli dei nodi (24 px) coprono quasi tutta la linea, e il
   * doppio clic cadeva su di loro (misurato). Si ignora solo sul pallino
   * visibile di un nodo.
   */
  function aggiungiQui(e) {
    const u = aUtente(e.clientX, e.clientY);
    if (nodoVicino(modello, u.x, u.y, RAGGIO / scala)) return;
    const v = segmentoVicino(modello, u.x, u.y, BERSAGLIO / scala);
    if (!v) return;
    fai((m) => aggiungiNodo(m, v, v.t));
    setScelto({ s: v.s, n: v.segmento + 1 });
  }

  // Il segmento «del» nodo scelto: quello che parte da lui.
  const segScelto = scelto && segmentiDi(modello.sottopercorsi[scelto.s]) > scelto.n ? { s: scelto.s, segmento: scelto.n } : null;
  const nodoScelto = scelto && modello.sottopercorsi[scelto.s]?.nodi[scelto.n];
  const vicini = (s, n) => {
    if (!scelto || scelto.s !== s) return false;
    const len = modello.sottopercorsi[s].nodi.length;
    return n === scelto.n || n === (scelto.n + 1) % len || n === (scelto.n - 1 + len) % len;
  };

  return (
    <div className="editor-nodi" ref={contenitore} style={posto ? { ...posto, right: 'auto', bottom: 'auto' } : undefined}>
      {pronto && (
        <svg className="editor-nodi-tela" width="100%" height="100%" onDoubleClick={aggiungiQui}>
          {/* La linea, larga da prendere: doppio clic aggiunge un nodo. */}
          <path className="editor-nodi-presa" d={dSchermo} />
          <path className="editor-nodi-linea" d={dSchermo} />
          {modello.sottopercorsi.map((sp, s) =>
            sp.nodi.map((n, i) => {
              const p = aSchermo(n);
              const maniglie = !piccolo && vicini(s, i) ? ['dentro', 'fuori'].filter((l) => n[l]) : [];
              return (
                <g key={`${s}-${i}`}>
                  {maniglie.map((lato) => {
                    const h = aSchermo(n[lato]);
                    return (
                      <g key={lato}>
                        <line className="editor-nodi-braccio" x1={p.x} y1={p.y} x2={h.x} y2={h.y} />
                        <circle className="editor-nodi-maniglia" cx={h.x} cy={h.y} r={RAGGIO * 0.8} />
                        <circle
                          className="editor-nodi-bersaglio"
                          data-maniglia={lato}
                          cx={h.x}
                          cy={h.y}
                          r={BERSAGLIO}
                          onPointerDown={(e) => inizia(e, { tipo: 'maniglia', s, n: i, lato })}
                          onPointerMove={muovi}
                          onPointerUp={finisci}
                        />
                      </g>
                    );
                  })}
                  <circle
                    className="editor-nodi-nodo"
                    data-scelto={scelto?.s === s && scelto?.n === i ? 'si' : undefined}
                    data-liscio={n.liscio ? 'si' : undefined}
                    cx={p.x}
                    cy={p.y}
                    r={RAGGIO}
                  />
                  <circle
                    className="editor-nodi-bersaglio"
                    data-nodo={`${s}-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={BERSAGLIO}
                    onPointerDown={(e) => inizia(e, { tipo: 'nodo', s, n: i })}
                    onPointerMove={muovi}
                    onPointerUp={finisci}
                  />
                </g>
              );
            }),
          )}
        </svg>
      )}

      {/* La barra dei nodi: il pannello laterale nell'impianto non c'è. Sta
          FUORI dalla tela, nella striscia sopra (`striscia`, un portale): sopra
          la tela copriva i punti in alto — misurato, il primo nodo del logo
          stava sotto «Aggiungi». Ogni comando lavora sul nodo scelto (o sul
          segmento che parte da lui), e si spegne quando non ha su cosa. */}
      {striscia && createPortal(
        <div className="editor-nodi-striscia">
          <div className="editor-nodi-barra" role="toolbar" aria-label={t('nodi.barra')}>
            <button className="chip" disabled={!segScelto} onClick={() => fai((m) => aggiungiNodo(m, segScelto, 0.5))}>
              {t('nodi.aggiungi')}
            </button>
            <button
              className="chip"
              disabled={!scelto}
              onClick={() => {
                fai((m) => togliNodo(m, scelto));
                setScelto(null);
              }}
            >
              {t('nodi.togli')}
            </button>
            <button className="chip" disabled={!segScelto} onClick={() => fai((m) => curvaODritto(m, segScelto))}>
              {t('nodi.curvaDritto')}
            </button>
            {!piccolo && (
              <button
                className="chip"
                disabled={!nodoScelto}
                aria-pressed={Boolean(nodoScelto?.liscio)}
                onClick={() => fai((m) => angoloOLiscio(m, scelto))}
              >
                {t('nodi.liscio')}
              </button>
            )}
            <button className="chip" disabled={!scelto} onClick={() => fai((m) => apriChiudi(m, { s: scelto.s }))}>
              {t('nodi.apriChiudi')}
            </button>
            <button className="chip" onClick={onEsci}>
              {t('nodi.fine')}
            </button>
          </div>
          <p className="editor-nodi-aiuto">{t(piccolo ? 'nodi.aiutoDito' : 'nodi.aiuto')}</p>
        </div>,
        striscia,
      )}
    </div>
  );
}
