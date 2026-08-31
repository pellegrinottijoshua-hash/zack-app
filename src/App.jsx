import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Compare from './components/Compare.jsx';
import Library from './components/Library.jsx';
import SvgEditor from './components/SvgEditor.jsx';
import { RemovePanel, TracePanel, ExportPanel, UpscalePanel, MetaBlock, Help } from './components/Panels.jsx';
import EngineBanner from './components/EngineBanner.jsx';
import LanguageSwitch from './components/LanguageSwitch.jsx';
// «Spiegami» e' nascosto dal 2026-08-31 (decisione del committente): la
// striscia in cima porta solo il logo del servizio. Il componente resta qui,
// pronto, perche' rimetterlo e' una riga sola.
// import HelpToggle from './components/HelpToggle.jsx';
import Onboarding, { hasSeenOnboarding } from './components/Onboarding.jsx';
import VectorTools from './components/VectorTools.jsx';
import { resolveShortcut } from './engine/shortcuts.js';
import { useLibrary } from './hooks/useLibrary.js';
import ToolRail from './components/ToolRail.jsx';
import Scontorna from './components/Scontorna.jsx';
import MaskBrush from './components/MaskBrush.jsx';
import BatchPanel from './components/BatchPanel.jsx';
import SoundLab from './components/SoundLab.jsx';
import FinishPanel from './components/FinishPanel.jsx';
import Advanced from './components/Advanced.jsx';
import Brain from './components/Brain.jsx';
import BatchGrid from './components/BatchGrid.jsx';
import FilmLab from './components/FilmLab.jsx';
import { kindFromFile, nomeConSuffisso } from './store/model.js';
import { impacchetta, spacchetta, fotografaTela } from './store/brainBundle.js';
import StageBar from './components/StageBar.jsx';
import { useSound } from './hooks/useSound.js';
import { useBatch } from './hooks/useBatch.js';
import { canUpscale, estimateSeconds, getScale } from './engine/upscale.js';
import { TARGET_SIDE } from './engine/ready.js';
import { pianoZack, normalizza, fattoreDi, RICETTE_DI_FABBRICA } from './engine/ricette.js';
import { caricaFileDiProva, deveMostrareProva, segnaProvaVista } from './engine/prova.js';
import { SERVICES, getService, firstReady } from './services.js';

/** La catena salvata per un servizio, o quella di fabbrica se non c'è. */
function leggiRicetta(servizio) {
  const fabbrica = RICETTE_DI_FABBRICA[servizio] || [];
  try {
    const salvata = localStorage.getItem(`jayl.zack.${servizio}`);
    return salvata ? normalizza(JSON.parse(salvata)) : fabbrica;
  } catch {
    return fabbrica;
  }
}
import { bundleAll } from './store/bundle.js';
import { useEngine } from './hooks/useEngine.js';
import { t, setLang, detectLang, onLangChange } from './i18n/index.js';
import { onHelpChange, isHelpOn } from './i18n/help.js';
import { renderExport } from './engine/render.js';
import { analyze, applyCrop, renderMockup, closeHoles } from './engine/finish.js';
import { PRESETS, BACKGROUNDS } from './engine/export.js';
import { traceToSvg, TRACE_PRESETS } from './engine/trace.js';
import * as api from './lib/api.js';

const PALETTE = ['#111111', '#F5F0E8', '#FFFFFF', '#8A8A85', '#C4A35A', 'none'];

const px = (d) => (d ? `${d.w}×${d.h}` : '—');
/** Come è stato ottenuto il risultato, detto in italiano. */
/**
 * I servizi che hanno la loro faccia, consegnata dal committente.
 *
 * Non e' un'icona astratta: e' la faccia di Zack che FA quella cosa — il becco
 * d'oro dello scontorno, la nota del suono, il tracciato del vettoriale. Sta
 * in cima, e dice dove sei.
 */
const FACCIA = new Set(['brain', 'scontorna', 'vettorializza', 'filmato', 'suono']);

const STRATEGIE = { mask: 'maschera', crop: 'ritaglio', upscale: 'ingrandimento', browser: 'diretta' };
// Un tempo che non abbiamo misurato non si stampa: «NaNs» sembra un guasto,
// e un trattino dice la verità.
const secs = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : '—');

export default function App() {
  const [apiState, setApiState] = useState('offline');
  /**
   * Il servizio con cui si apre.
   *
   * I cerchi della home linkano `?servizio=<id>`: entrare gia' dentro il
   * servizio che si e' premuto e' tutto il punto di quei cerchi. Un id che
   * non esiste, o spento, non deve poter aprire una schermata rotta — si
   * ricade sullo scontorno, che e' il servizio di casa.
   */
  const [tool, setTool] = useState(() => {
    try {
      const chiesto = new URLSearchParams(location.search).get('servizio');
      const s = SERVICES.find((x) => x.id === chiesto);
      return s?.ready ? s.id : 'scontorna';
    } catch {
      return 'scontorna';
    }
  });

  /**
   * La catena del tasto Zack, una per servizio.
   *
   * Sta nell'archivio locale come le altre preferenze. Quando ci sarà
   * l'account ci si sposta: è la prima cosa che l'utente si arrabbierebbe di
   * perdere, ed è leggerissima — poche righe, non i suoi file. Anche un
   * account di sola licenza può portarsela dietro senza contraddire la
   * promessa di non tenere niente su un server.
   */
  const [ricetta, setRicetta] = useState(() => leggiRicetta('scontorna'));

  /**
   * La tela di Brain aperta, e i suoi oggetti.
   *
   * Vive dentro una raccolta della libreria: una tela senza la sua raccolta
   * non significa niente. Se non ce n'è ancora nessuna, la prima si crea da
   * sola alla prima apertura — chiedere un nome prima di aver visto la tela è
   * un modulo davanti a una porta.
   */
  /** Il filmato aperto nel servizio Filmato: non è il file del piano di
   *  lavoro, che resta un'immagine. Tenerli separati evita che aprire una
   *  clip butti via il ritaglio a cui si stava lavorando. */
  const [filmato, setFilmato] = useState(null);

  const [telaId, setTelaId] = useState(null);
  const [tela, setTela] = useState([]);

  function salvaRicetta(prossima) {
    const pulita = normalizza(prossima);
    setRicetta(pulita);
    try {
      localStorage.setItem(`jayl.zack.${tool}`, JSON.stringify(pulita));
    } catch {
      // Archivio pieno o negato: la catena vale per questa sessione. Meglio
      // che rifiutare il cambiamento davanti a un utente che l'ha appena fatto.
    }
  }

  const [file, setFile] = useState(null);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [result, setResult] = useState(null); // { blob|text, url, kind, meta }
  const [busy, setBusy] = useState(null);
  const [busyNote, setBusyNote] = useState(null);
  /**
   * Quanto è fatto, da 0 a 1, quando lo sappiamo.
   *
   * `null` quando non c'è niente da contare: una barra che finge di sapere è
   * peggio di una che striscia dicendo «sto lavorando». Dove non c'è una
   * misura non c'è un avviso — vale anche per l'avanzamento.
   */
  const [quanto, setQuanto] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const library = useLibrary();
  // La striscia dei lavori parte chiusa: mangia un quinto dello schermo, e
  // chi apre l'app vuole lavorare su un file, non sfogliare l'archivio.
  const [libOpen, setLibOpen] = useState(() => {
    try {
      return localStorage.getItem('jayl.libOpen') === '1';
    } catch {
      return false;
    }
  });
  // Aperta in grande resta grande: chi sfoglia ottanta lavori non vuole
  // riallargarla a ogni giro.
  // In griglia per impostazione predefinita: la striscia orizzontale rende
  // irraggiungibili tutti i lavori dopo il settimo, ed e' il modo sbagliato di
  // guardare un archivio.
  const [libBig, setLibBig] = useState(() => {
    try {
      return localStorage.getItem('jayl.libBig') !== '0';
    } catch {
      return true;
    }
  });

  const [s, setS] = useState({
    // Sovrascritto appena il motore sa cosa può fare questo browser: scegliere
    // qui un default fisso significherebbe proporre a un browser lento un
    // modello che non regge.
    model: null,
    tracePreset: 'poster',
    clean: true,
    preset: 'gelato-front',
    background: 'transparent',
    // Le tre rifiniture. Il capo nero è il default perché è il capo su cui si
    // sbaglia di più: è lì che una grafica scura sparisce senza avvisare.
    aspect: 'auto',
    garment: 'nero',
    shape: 'tee-front',
    scale: 'x4',
  });
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const editorRef = useRef(null);
  const [selCount, setSelCount] = useState(0);
  const [nodeMode, setNodeMode] = useState(false);
  // I riferimenti scelti dalla libreria per la prossima generazione. Vivono
  // qui perché attraversano gli strumenti: si scelgono guardando l'archivio e
  // si usano generando.
  const [references, setReferences] = useState([]);
  const [brushOpen, setBrushOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState([]);
  // Da quale lavoro in libreria viene il file aperto: serve a registrare la
  // provenienza, che è ciò che rende ritrovabile un file di cui non si
  // ricorda il nome.
  const [sourceAssetId, setSourceAssetId] = useState(null);
  /** Da quale risultato del Blocco viene il file in correzione, se ne viene. */
  const [daBlocco, setDaBlocco] = useState(null);
  // Le misure del file aperto: le leggono tutte e tre le rifiniture, e leggerle
  // una volta sola costa una passata invece di tre su milioni di pixel.
  const [stats, setStats] = useState(null);
  const [statsReading, setStatsReading] = useState(false);
  const [mockup, setMockup] = useState(null);
  // L'ingrandimento ora puo' durare minuti: serve sapere quando e' in corso
  // per offrire di fermarlo.
  const [upscaling, setUpscaling] = useState(false);
  // Un passo indietro, come in qualunque programma di disegno. Otto passi
  // bastano: piu' in la' non si torna, si ricomincia.
  const [history, setHistory] = useState([]);
  const resultRef = useRef(null);
  resultRef.current = result;

  /** Sostituisce il risultato tenendo da parte quello di prima. */
  const pushResult = (next) => {
    setHistory((h) => [...h, resultRef.current].slice(-8));
    setResult(next);
  };

  function undoResult() {
    setHistory((h) => {
      if (!h.length) return h;
      setResult(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }
  // Cambia a ogni azione sull'editor per far rileggere al pannello la
  // posizione della selezione, che la libreria muta fuori da React.
  const [editorTick, setEditorTick] = useState(0);

  // Le misure si rifanno a ogni cambio del file o del risultato: un controllo
  // di stampa che descrive il file di prima è peggio di nessun controllo.
  const measured = result?.blob || file;
  useEffect(() => {
    let alive = true;
    setMockup(null);
    if (!measured) {
      setStats(null);
      return undefined;
    }
    setStatsReading(true);
    analyze(measured)
      .then((m) => alive && setStats(m))
      .catch((e) => {
        console.error(e);
        if (alive) setStats(null);
      })
      .finally(() => alive && setStatsReading(false));
    return () => {
      alive = false;
    };
  }, [measured]);

  // ─── motore nel browser ────────────────────────────────────────────────
  const engine = useEngine();
  const [bannerOpen, setBannerOpen] = useState(true);
  const [, forceRender] = useState(0);

  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding());

  /**
   * Il lampo sul tasto Zack quando il file di prova arriva da solo.
   *
   * Un lampo solo, e poi mai più: è un dito puntato sul punto da cui si
   * comincia, non un elemento dell'interfaccia che pulsa in eterno. Il colore
   * non è mai l'unico segnale — sotto il tasto c'è già scritto cosa farà e
   * quanto ci mette.
   */
  const [lampoZack, setLampoZack] = useState(false);

  useEffect(() => {
    setLang(detectLang(navigator.languages));
    forceRender((n) => n + 1);
    // Lingua e spiegazioni devono ridisegnare tutta l'interfaccia, non solo il
    // proprio interruttore.
    const offLang = onLangChange(() => forceRender((n) => n + 1));
    const offHelp = onHelpChange(() => forceRender((n) => n + 1));
    return () => {
      offLang();
      offHelp();
    };
  }, []);

  const sound = useSound();

  const batch = useBatch({
    engine,
    library,
    model: s.model || engine.defaultModelId,
  });

  /** Sceglie più file in una volta: è il gesto che apre il lavoro in blocco. */
  function pickBatchFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const list = [...(input.files || [])].filter((f) => f.type.startsWith('image/'));
      if (list.length) {
        setBatchFiles(list);
        batch.clear();
      }
    };
    input.click();
  }

  // Scorciatoie da tastiera: attive solo nell'editor, e mai mentre si scrive.
  // La decisione su quale azione eseguire sta in una funzione pura testata a
  // parte; qui resta solo il collegamento.
  useEffect(() => {
    if (tool !== 'editor') return undefined;
    const onKey = (ev) => {
      const action = resolveShortcut(ev);
      if (!action) return;
      const e = editorRef.current;
      if (!e) return;
      ev.preventDefault();

      if (action.startsWith('tool:')) {
        const id = action.slice(5);
        const ok = e.setMode(id);
        setNodeMode(ok && id === 'pathedit');
      } else if (action.startsWith('nudge:')) {
        const [dx, dy] = action.slice(6).split(',').map(Number);
        e.nudge(dx, dy);
      } else if (action === 'delete') e.del();
      else if (action === 'duplicate') e.duplicate();
      else if (action === 'group') e.group();
      else if (action === 'ungroup') e.ungroup();
      else if (action === 'undo') e.undo();
      else if (action === 'redo') e.redo();

      setEditorTick((n) => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  // Il motore decide il default: l'utente deve poter premere Scontorna senza
  // aver scelto nulla.
  useEffect(() => {
    if (engine.defaultModelId) setS((prev) => ({ ...prev, model: prev.model ?? engine.defaultModelId }));
  }, [engine.defaultModelId]);

  // Object URLs we created and must revoke on unmount.
  const urls = useRef(new Set());
  const own = (blob) => {
    const u = URL.createObjectURL(blob);
    urls.current.add(u);
    return u;
  };
  useEffect(() => {
    const set = urls.current;
    return () => set.forEach(URL.revokeObjectURL);
  }, []);


  function onFile(f) {
    setError(null);
    setNotice(null);
    setHistory([]);
    setResult(null);
    setFile(f);
    setBeforeUrl(own(f));
    // Un file trascinato da fuori non ha un'origine in libreria.
    setSourceAssetId(null);

    // An SVG dropped anywhere belongs in the editor.
    if (/\.svg$/i.test(f.name)) {
      f.text().then((txt) => {
        setTool('editor');
        setTimeout(() => editorRef.current?.setSvg(txt), 120);
      });
    }
  }

  /**
   * Mette il file di prova sul piano di lavoro.
   *
   * Passa dallo stesso `onFile` di un file trascinato: da qui in poi non è
   * «un esempio», è un file di lavoro, e tutto ciò che l'utente impara su di
   * lui vale sui suoi. Se il file non c'è (cartella `public` incompleta) non
   * si dice niente: un errore all'apertura per un file che l'utente non ha
   * chiesto sarebbe peggio del silenzio.
   */
  const caricaEsempio = useCallback(async ({ lampo = false } = {}) => {
    try {
      const f = await caricaFileDiProva();
      onFile(f);
      if (lampo) {
        setLampoZack(true);
        // Il lampo dura quanto l'animazione e poi sparisce dallo stato: un
        // attributo che resta acceso rianimerebbe il tasto a ogni ridisegno.
        setTimeout(() => setLampoZack(false), 2000);
      }
    } catch {
      // Silenzio voluto: vedi sopra.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Il primo minuto: alla primissima apertura, con la libreria ancora vuota,
  // il piano di lavoro non è vuoto. Si aspetta che la libreria abbia risposto,
  // o si metterebbe un esempio davanti a chi ha già ottanta lavori dentro.
  useEffect(() => {
    if (!library.ready || file) return;
    if (!deveMostrareProva({ archivio: window.localStorage, lavori: library.assets.length })) return;
    segnaProvaVista(window.localStorage);
    caricaEsempio({ lampo: true });
    // Vale una volta sola, all'apertura: le dipendenze mutevoli lo
    // rifarebbero ogni volta che la libreria cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.ready]);

  function reset() {
    setHistory([]);
    setFile(null);
    setBeforeUrl(null);
    setResult(null);
    setError(null);
    setNotice(null);
  }

  async function run(kind) {
    setError(null);
    setNotice(null);
    setApiState('lavora');
    try {
      if (kind === 'remove') {
        // Gira nel browser: nessuna chiamata di rete, nessun costo per noi.
        setBusy(t('engine.working'));
        setBusyNote(null);
        const started = Date.now();
        // Sul lavoro in corso, non sull'originale: chi ha appena ingrandito e
        // preme Scontorna si vedeva tornare il file piccolo, con
        // l'ingrandimento buttato via senza un avviso.
        const blob = await engine.cutout(result?.blob || file, s.model);
        pushResult({
          url: own(blob),
          blob,
          kind: 'png',
          // Lo scontorno non ricampiona: entra e esce alla stessa misura. Dirlo
          // serve a chi sta controllando di non aver perso risoluzione per strada.
          meta: {
            strategy: 'browser',
            model: s.model,
            source: stats?.image,
            output: stats?.image,
            ms: Date.now() - started,
          },
        });
        await library.save(blob, {
          name: `${file.name.replace(/\.[^.]+$/, '')}-scontornato`,
          kind: 'png',
          meta: { fromId: sourceAssetId, op: 'remove-bg', model: s.model },
        });
      } else {
        // Anche il tracciato gira nel browser: VTracer in WebAssembly, 140 KB.
        setBusy(t('vector.working'));
        setBusyNote(null);
        const { svg: text, meta } = await traceToSvg(file, { preset: s.tracePreset, clean: s.clean });
        const blob = new Blob([text], { type: 'image/svg+xml' });
        pushResult({ url: own(blob), blob, text, kind: 'svg', meta });
        await library.save(blob, {
          name: nomeConSuffisso(file.name.replace(/\.[^.]+$/, ''), 'vettoriale'),
          kind: 'svg',
          meta: { fromId: sourceAssetId, op: 'vectorize', preset: s.tracePreset, paths: meta.paths },
        });
      }
    } catch (e) {
      // Un codice interno non è un messaggio: lo traduciamo in una frase che
      // dice cosa è successo e cosa fare. Lo stack resta in console.
      console.error(e);
      if (e.code === 'trace-empty') setError(`${t('trace.empty.title')} — ${t('trace.empty.body')}`);
      else if (e.code) setError(`${t('engine.error.title')} — ${t('engine.error.body')}`);
      else setError(e.message);
    } finally {
      setBusy(null);
      setBusyNote(null);
      setApiState('pronta');
    }
  }

  /**
   * Porta un risultato del blocco sotto il pennello, con il suo originale.
   *
   * L'originale è la metà che conta: senza, «Recupera» non ha colori da
   * riportare. È il motivo per cui il blocco se li tiene entrambi.
   */
  /** Rinomina un risultato del blocco, in archivio. */
  async function rinominaRisultato(r, nome) {
    if (!r.assetId || !nome) return;
    await library.update(r.assetId, { name: nome });
    setNotice(t('batch.renamed', { nome }));
  }

  /** Porta via un file solo, senza passare dallo zip di tutto. */
  function scaricaRisultato(r, nome) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(r.blob);
    a.download = `${nome || r.file.name.replace(/\.[^.]+$/, '')}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  /**
   * Apre il pennello su un risultato del Blocco, **ricordandosi da dove viene**.
   *
   * Prima non se lo ricordava, e all'APPLICA la correzione non aveva più un
   * posto a cui tornare: finiva nel banco a file singolo e in libreria come
   * `-corretto`, mentre la piastrella nel Blocco restava quella sbagliata.
   * Chi corregge quaranta file vuole vedere la griglia aggiustarsi, non
   * collezionare doppioni.
   */
  function fixFromBatch({ file: original, blob, assetId }) {
    setError(null);
    setNotice(null);
    setTool('scontorna');
    setFile(original);
    setBeforeUrl(own(original));
    setSourceAssetId(assetId ?? null);
    setHistory([]);
    setResult({ url: own(blob), blob, kind: 'png', meta: { strategy: 'browser', batch: true } });
    setDaBlocco({ file: original, assetId: assetId ?? null });
    setBrushOpen(true);
  }

  /** Taglia attorno al soggetto. Il calcolo è già fatto dal pannello. */
  async function runCrop(rect) {
    setError(null);
    setNotice(null);
    setBusy(t('crop.apply'));
    const started = Date.now();
    try {
      const blob = await applyCrop(measured, rect);
      // Meta proprio, non ereditato dal ritaglio dello sfondo: tenere i numeri
      // del passaggio precedente li farebbe leggere come se fossero di questo.
      pushResult({
        url: own(blob),
        blob,
        kind: 'png',
        meta: {
          strategy: 'crop',
          source: stats?.image,
          output: { w: rect.w, h: rect.h },
          ms: Date.now() - started,
        },
      });
      await library.save(blob, {
        name: `${(file?.name || 'immagine').replace(/\.[^.]+$/, '')}-ritagliato`,
        kind: 'png',
        meta: { fromId: sourceAssetId, op: 'crop', aspect: s.aspect },
      });
      setNotice(`${rect.w}×${rect.h}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function runMockup() {
    setError(null);
    setNotice(null);
    setBusy(t('mockup.make'));
    try {
      const { blob } = await renderMockup(measured, {
        shape: s.shape,
        garment: s.garment,
        box: stats?.box,
      });
      const name = `${(file?.name || 'grafica').replace(/\.[^.]+$/, '')}-${s.shape}-${s.garment}`;
      setMockup({ url: own(blob), blob, name: `${name}.png` });
      await library.save(blob, {
        name,
        kind: 'png',
        meta: { fromId: sourceAssetId, op: 'mockup', shape: s.shape, garment: s.garment },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  /** Export whatever is currently the best version of the work. */
  async function runExport() {
    setError(null);
    setApiState('lavora');
    setBusy(t('action.preparing'));
    try {
      let source = file;
      let isVector = false;

      if (tool === 'editor') {
        const svg = editorRef.current?.getSvg();
        if (!svg) throw new Error("L'editor è vuoto.");
        source = new File([svg], `${(file?.name || 'disegno').replace(/\.[^.]+$/, '')}.svg`, {
          type: 'image/svg+xml',
        });
        isVector = true;
      } else if (result) {
        const ext = result.kind === 'svg' ? 'svg' : 'png';
        source = new File([result.blob], `${file.name.replace(/\.[^.]+$/, '')}.${ext}`, {
          type: result.kind === 'svg' ? 'image/svg+xml' : 'image/png',
        });
        isVector = result.kind === 'svg';
      }

      // Anche l'export gira nel browser: il flusso principale non ha piu'
      // bisogno che il backend sia acceso.
      const { blob, meta } = await renderExport(source, {
        preset: s.preset,
        background: s.background,
        isVector,
      });
      api.download(own(blob), `${source.name.replace(/\.[^.]+$/, '')}-${s.preset}.png`);
      await library.save(blob, {
        name: nomeConSuffisso(source.name.replace(/\.[^.]+$/, ''), s.preset),
        kind: 'png',
        meta: { fromId: sourceAssetId, op: 'export', preset: s.preset, background: s.background },
      });
      setNotice(
        `${meta.canvas.w}×${meta.canvas.h}${meta.upscaleLimited ? ` — ${t('result.tooSmall')}` : ''}`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      setApiState('pronta');
    }
  }

  async function saveFromEditor() {
    setError(null);
    try {
      const svg = editorRef.current?.getSvg();
      if (!svg) throw new Error("L'editor è vuoto.");
      const work = await library.save(new Blob([svg], { type: 'image/svg+xml' }), {
        name: (file?.name || 'disegno').replace(/\.[^.]+$/, ''),
        kind: 'svg',
        meta: { fromId: sourceAssetId, op: 'editor' },
      });
      setNotice(work.file);
    } catch (e) {
      setError(e.message);
    }
  }

  async function cleanFromEditor() {
    setError(null);
    try {
      const svg = editorRef.current?.getSvg();
      if (!svg) throw new Error("L'editor è vuoto.");
      const { svg: out, meta } = await api.cleanSvg(svg);
      editorRef.current?.setSvg(out);
      setNotice(`SVG ripulito: ${meta.saved}% in meno (${meta.before} → ${meta.after} byte).`);
    } catch (e) {
      setError(e.message);
    }
  }

  /** Send the traced SVG straight into the editor — the whole point of having both. */
  function sendToEditor() {
    if (result?.kind !== 'svg') return;
    setTool('editor');
    setTimeout(() => {
      const ok = editorRef.current?.setSvg(result.text);
      if (!ok) setError("L'editor non è riuscito ad aprire questo SVG.");
    }, 120);
  }

  async function openWorkInEditor(item) {
    try {
      const { file: f } = await library.read(item.id);
      const txt = await f.text();
      setTool('editor');
      setTimeout(() => editorRef.current?.setSvg(txt), 120);
    } catch (e) {
      console.error(e);
      setError(t('engine.error.body'));
    }
  }

  /**
   * Un pulsante solo: scontorna e porta il file alla misura di stampa.
   *
   * Scontornare e ingrandire sono due gesti separati soltanto per chi ha
   * scritto il programma. Per chi stampa sono una cosa sola.
   */
  /**
   * Il tasto Zack: esegue la catena del servizio, in ordine.
   *
   * Era `runReady`, che faceva due gesti fissi. La differenza non è quanti
   * passi ci sono: è che il piano viene deciso prima, mostrato accanto al
   * pulsante, e poi eseguito esattamente com'è scritto. Il codice qui sotto
   * non sceglie niente — `pianoZack` ha già scelto.
   */
  async function runZack() {
    if (!stats?.image) return;
    setError(null);
    setNotice(null);

    const piano = pianoZack(ricetta, stats.image);
    if (piano.passi.length === 0) return;

    try {
      let current = result?.blob || file;
      const base = (file?.name || 'immagine').replace(/\.[^.]+$/, '');
      // Più passi, più cose da dire: si tengono tutte. Il conteggio dei buchi
      // sovrascritto dall'esito dell'ingrandimento è proprio l'informazione
      // che l'utente non ha modo di ricavare guardando l'immagine.
      const detto = [];

      /*
       * Dire dove siamo nella catena.
       *
       * L'attesa del tasto Zack è la più lunga del prodotto — 84 secondi
       * misurati su un file di stampa il 2026-08-27 — ed era anche la meno
       * raccontata: usciva un «34/81» senza unità, cioè un numero che non
       * significa niente per chi non sa cosa sia una piastrella. Il passo
       * singolo dell'ingrandimento lo faceva già meglio del tasto che lo
       * contiene.
       *
       * Ora ogni passo si annuncia col nome che l'utente ha spuntato in
       * «Cosa farà», e con la sua posizione nella catena: dopo un minuto la
       * domanda non è «quanto manca», è «si è piantato?».
       */
      const passi = piano.passi;
      const annuncia = (passo, coda) => {
        const i = passi.indexOf(passo) + 1;
        setBusy(t('zack.working'));
        setBusyNote([`${i}/${passi.length} · ${t(`zack.step.${passo}`)}`, coda].filter(Boolean).join(' · '));
      };

      if (piano.passi.includes('scontorna')) {
        annuncia('scontorna');
        setQuanto(null);
        const started = Date.now();
        current = await engine.cutout(current, s.model);
        pushResult({
          url: own(current),
          blob: current,
          kind: 'png',
          meta: { strategy: 'browser', model: s.model, ms: Date.now() - started },
        });
      }

      if (piano.passi.includes('buchi')) {
        annuncia('buchi');
        setQuanto(null);
        const esito = await closeHoles(current);
        if (esito.richiusi > 0) {
          current = esito.blob;
          pushResult({
            url: own(current),
            blob: current,
            kind: 'png',
            meta: { strategy: 'holes', holes: esito.richiusi },
          });
        }
        // Il conteggio si dice a parole: un'immagine cambiata in silenzio è
        // una sorpresa, non una rifinitura.
        detto.push(esito.richiusi > 0 ? t('zack.holes', { n: esito.richiusi }) : t('zack.noHoles'));
      }

      if (piano.passi.includes('ingrandisci')) {
        annuncia('ingrandisci');
        setUpscaling(true);
        const bmp = await createImageBitmap(current);
        // I secondi che restano davvero, ricalcolati sulle piastrelle già
        // fatte: è la stessa cosa che fa l'ingrandimento da solo, e non c'era
        // ragione perché la catena che lo contiene ne dicesse di meno.
        const totali = piano.secondi;
        const out = await engine.upscale(bmp, piano.scaleId, (phase, d) => {
          if (!d?.done) return;
          const fatto = d.done / d.total;
          setQuanto(fatto);
          annuncia('ingrandisci', t('upscale.estimate', { sec: Math.round((1 - fatto) * totali) }));
        });
        const cv = document.createElement('canvas');
        cv.width = out.width;
        cv.height = out.height;
        cv.getContext('2d').putImageData(new ImageData(out.rgba, out.width, out.height), 0, 0);
        current = await new Promise((r) => cv.toBlob(r, 'image/png'));
        pushResult({
          url: own(current),
          blob: current,
          kind: 'png',
          meta: { strategy: 'upscale', output: { w: out.width, h: out.height } },
        });
        detto.push(
          piano.raggiunto
            ? t('zack.done', { size: `${out.width}×${out.height}` })
            : t('ready.short', { size: `${out.width}×${out.height}`, target: TARGET_SIDE }),
        );
      }

      /*
       * Il ridimensionamento a fattore fisso, che e' due mestieri.
       *
       * Ingrandire passa dal modello e costa secondi; rimpicciolire e' una
       * riscrittura di pixel e non costa niente. Sono lo stesso passo per
       * l'utente — «quanto grande?» — e due strade diverse qui sotto.
       */
      const passoRid = piano.passi.find((p) => fattoreDi(p) !== null);
      if (passoRid) {
        annuncia(passoRid);
        const f = fattoreDi(passoRid);
        if (f > 1) {
          setUpscaling(true);
          const bmp = await createImageBitmap(current);
          const totali = piano.secondi;
          const out = await engine.upscale(bmp, piano.scaleId, (fase, d) => {
            if (!d?.done) return;
            const fatto = d.done / d.total;
            setQuanto(fatto);
            annuncia(passoRid, t('upscale.estimate', { sec: Math.round((1 - fatto) * totali) }));
          });
          const cv = document.createElement('canvas');
          cv.width = out.width;
          cv.height = out.height;
          cv.getContext('2d').putImageData(new ImageData(out.rgba, out.width, out.height), 0, 0);
          current = await new Promise((r) => cv.toBlob(r, 'image/png'));
          setUpscaling(false);
        } else {
          const bmp = await createImageBitmap(current);
          const cv = document.createElement('canvas');
          // Mai sotto un pixel: un'immagine da zero pixel non e' piccola, e' rotta.
          cv.width = Math.max(1, Math.round(bmp.width * f));
          cv.height = Math.max(1, Math.round(bmp.height * f));
          const cx = cv.getContext('2d');
          // Alta qualita' e non il default: ridurre a meta' col campionamento
          // piu' vicino produce una scalinata su ogni bordo, che e' proprio
          // cio' che questo prodotto vende di saper evitare.
          cx.imageSmoothingEnabled = true;
          cx.imageSmoothingQuality = 'high';
          cx.drawImage(bmp, 0, 0, cv.width, cv.height);
          bmp.close?.();
          current = await new Promise((r) => cv.toBlob(r, 'image/png'));
        }
        pushResult({
          url: own(current),
          blob: current,
          kind: 'png',
          meta: { strategy: 'ridimensiona', fattore: f, output: piano.out },
        });
        detto.push(t('zack.done', { size: `${piano.out.w}×${piano.out.h}` }));
      }

      if (piano.passi.includes('esporta')) {
        await library.save(current, {
          name: nomeConSuffisso(base, 'zack'),
          kind: 'png',
          meta: { fromId: sourceAssetId, op: 'zack', passi: piano.passi },
        });
      }

      if (piano.passi.includes('scarica')) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(current);
        a.download = `${base}-zack.png`;
        a.click();
        // L'URL va rilasciato o la memoria cresce a ogni pressione.
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      }

      if (detto.length === 0) detto.push(t('zack.done', { size: `${stats.image.w}×${stats.image.h}` }));
      setNotice(detto.join(' · '));
    } catch (e) {
      console.error(e);
      if (e.code === 'upscale-stopped') setNotice(t('upscale.stopped'));
      else setError(t('engine.error.body'));
    } finally {
      setUpscaling(false);
      setBusy(null);
      setBusyNote(null);
      setQuanto(null);
    }
  }

  /** Cambia il file sul piano di lavoro senza passare dal cestino. */
  function swapFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) onFile(f);
    };
    input.click();
  }

  /** Ingrandimento: ricostruisce il dettaglio invece di interpolare. */
  async function runUpscale() {
    const src = result?.blob || file;
    if (!src) return;
    setError(null);
    setNotice(null);
    try {
      const bmp = await createImageBitmap(src);
      const verdict = canUpscale(bmp.width, bmp.height, getScale(s.scale).factor);
      if (!verdict.ok) {
        bmp.close?.();
        setNotice(t(`upscale.tooBig.${verdict.reason}`));
        return;
      }
      const secs = estimateSeconds(bmp.width, bmp.height, getScale(s.scale));
      setBusy(t('upscale.working'));
      setBusyNote(t('upscale.estimate', { sec: secs }));
      setUpscaling(true);

      const out = await engine.upscale(bmp, s.scale, (phase, d) => {
        if (d?.done) {
          // I secondi che restano davvero, ricalcolati sulle piastrelle gia'
          // fatte: dopo un minuto una stima ferma sembra un blocco.
          const left = Math.round(((d.total - d.done) / d.total) * secs);
          setBusyNote(`${d.done}/${d.total} · ${t('upscale.estimate', { sec: left })}`);
        }
      });

      const cv = document.createElement('canvas');
      cv.width = out.width;
      cv.height = out.height;
      cv.getContext('2d').putImageData(new ImageData(out.rgba, out.width, out.height), 0, 0);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      pushResult({ url: own(blob), blob, kind: 'png', meta: { strategy: 'upscale', output: { w: out.width, h: out.height } } });
      await library.save(blob, {
        name: `${(file?.name || 'immagine').replace(/\.[^.]+$/, '')}-ingrandita`,
        kind: 'png',
        meta: { fromId: sourceAssetId, op: 'upscale', scale: s.scale },
      });
    } catch (e) {
      console.error(e);
      // Fermarsi non e' un guasto: e' una scelta, e non merita un allarme.
      if (e.code === 'upscale-stopped') setNotice(t('upscale.stopped'));
      else if (e.code?.startsWith('upscale-too-large'))
        setNotice(t(`upscale.tooBig.${e.code.split('-').pop()}`));
      else setError(t('engine.error.body'));
    } finally {
      setUpscaling(false);
      setBusy(null);
      setBusyNote(null);
    }
  }

  // Entrando in Brain si apre l'ultima tela, o se ne crea una: una schermata
  // che chiede di creare qualcosa prima di mostrare com'è fatta si abbandona.
  useEffect(() => {
    if (tool !== 'brain' || !library.ready || telaId) return;
    let vivo = true;
    (async () => {
      const prima = library.moodboards[0] || (await library.createMoodboard(t('brain.board')));
      if (!vivo || !prima) return;
      setTelaId(prima.id);
      setTela(await library.readBrain(prima.id));
    })();
    return () => {
      vivo = false;
    };
  }, [tool, library.ready, library.moodboards, telaId]);

  /**
   * Porta dei file dentro la libreria, da Brain.
   *
   * È l'unica porta d'ingresso che non passa da uno strumento: finora un
   * video di riferimento o una voce registrata altrove non avevano modo di
   * entrare. Ciò che non sappiamo tenere si dice, non si salva con
   * l'etichetta sbagliata — un'etichetta sbagliata si scopre mesi dopo.
   */
  async function importaFile(scelti) {
    setError(null);
    let entrati = 0;
    let rifiutati = 0;

    for (const f of scelti) {
      const kind = kindFromFile(f.name, f.type);
      if (!kind) {
        rifiutati++;
        continue;
      }
      await library.save(f, {
        name: f.name.replace(/\.[^.]+$/, ''),
        kind,
        meta: { op: 'import' },
      });
      entrati++;
    }

    const detto = [];
    if (entrati) detto.push(t('brain.imported', { n: entrati }));
    if (rifiutati) detto.push(t('brain.refused', { n: rifiutati }));
    setNotice(detto.join(' · ') || null);
  }

  /**
   * Salva un documento modificato sulla tela.
   *
   * Riscrive i byte dello stesso asset invece di crearne uno nuovo: per un
   * `.md` la modifica non è un lavoro derivato, è lo stesso documento un
   * minuto dopo. Vedi `sovrascriviAsset`.
   */
  async function salvaDocumento(id, testo) {
    setError(null);
    try {
      await library.sovrascrivi(id, new Blob([testo], { type: 'text/markdown' }));
      setNotice(t('brain.doc.salvato'));
    } catch (e) {
      setError(e.message);
    }
  }

  /** L'icona di un documento: è il modo in cui lo si riconosce sulla tela. */
  async function iconaDocumentoScelta(id, icona) {
    const a = library.assets.find((x) => x.id === id);
    await library.update(id, { meta: { ...(a?.meta || {}), icona } });
  }

  /** Porta via un asset così com'è, senza passare dallo zip di tutto. */
  async function scaricaAsset(asset) {
    try {
      const { file } = await library.read(asset.id);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = `${asset.name}.${asset.kind}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch (e) {
      setError(e.message);
    }
  }

  /**
   * La fotografia della tela.
   *
   * Lo stesso disegno che finisce nel pacco come `mappa.png`, ma fuori: era
   * sepolto dentro uno zip, cioè invisibile a chi voleva solo far vedere a
   * qualcuno com'è messa un'idea.
   */
  async function fotografaLaTela() {
    setError(null);
    setBusy('foto');
    try {
      const nome = library.moodboards.find((m) => m.id === telaId)?.name || 'Brain';
      const scatto = await fotografaTela(tela, library.assets, nome);
      if (!scatto) {
        setNotice(t('brain.fotoVuota'));
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(scatto.blob);
      a.download = scatto.nomeFile;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      setNotice(t('brain.fotoFatta', { nome: scatto.nomeFile }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  /**
   * Il tasto Zack di Brain: porta via l'idea intera.
   *
   * È la risposta al lato debole del prodotto. `downloadAll()` salva i file ma
   * perde la disposizione, le note e i legami — cioè il pensiero. Qui esce
   * tutto, in un pacco che si rimette dentro.
   */
  async function faiPacco() {
    setError(null);
    try {
      const nome = library.moodboards.find((m) => m.id === telaId)?.name || 'Brain';
      const { blob, nomeFile } = await impacchetta(tela, library.assets, nome);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nomeFile;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      setNotice(t('brain.packed', { file: nomeFile }));
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }

  /** Riapre un pacco: i file tornano in libreria, la tela torna com'era. */
  async function apriPacco(file) {
    setError(null);
    try {
      const { nome, tela: dentro, entrati } = await spacchetta(file);
      await library.refresh();
      const board = await library.createMoodboard(nome);
      setTelaId(board.id);
      setTela(dentro);
      await library.saveBrain(board.id, dentro);
      setNotice(t('brain.unpacked', { nome, n: entrati }));
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }

  /** Ogni cambiamento si salva subito: nessuno preme "salva" su una lavagna. */
  async function cambiaTela(prossima) {
    setTela(prossima);
    if (telaId) await library.saveBrain(telaId, prossima);
  }

  /**
   * Un'azione partita da un lavoro in libreria: il file diventa quello su cui
   * si sta lavorando e lo strumento giusto si apre da solo. È la scorciatoia
   * che evita "scegli lo strumento, poi ritrova il file".
   */
  async function assetAction(kind, item) {
    setError(null);
    setNotice(null);
    try {
      const { file: f } = await library.read(item.id);
      const asFile = new File([f], item.file, { type: f.type });

      if (kind === 'reference') {
        setReferences((prev) =>
          prev.some((r) => r.id === item.id) ? prev : [...prev, { id: item.id, name: item.name }],
        );
        setNotice(`${t('actions.added')}: ${item.name}`);
        return;
      }

      setHistory([]);
      setResult(null);
      setFile(asFile);
      setBeforeUrl(own(asFile));
      setSourceAssetId(item.id);
      // «Riprendi» rimette il lavoro sul piano e basta: non decide al posto di
      // chi lo riapre cosa vorra' farci.
      if (kind === 'open') {
        if (item.kind === 'svg') setTool('editor');
        setNotice(`${t('library.resume')}: ${item.name}`);
        return;
      }
      setTool(kind === 'cutout' ? 'scontorna' : 'vettorializza');
    } catch (e) {
      console.error(e);
      setError(t('engine.error.body'));
    }
  }

  /** Zip di tutto l'archivio, costruito qui: nessun server coinvolto. */
  async function downloadAll() {
    setError(null);
    setBusy(t('action.preparing'));
    try {
      const blob = await bundleAll();
      api.download(own(blob), `jayl-studio-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (e) {
      console.error(e);
      setError(e.code === 'library-empty' ? t('library.empty') : t('engine.error.body'));
    } finally {
      setBusy(null);
    }
  }

  // L'attesa dipende dal MOTORE, non dal server. Il backend serve solo alla
  // libreria su disco: legare tutta l'interfaccia alla sua risposta rendeva
  // l'app inutilizzabile senza backend, cioè l'esatto contrario della promessa.
  if (!engine.ready) {
    return (
      <div className="shell">
        <header className="topbar">
          <span className="wordmark">
            ZACK <em>app</em>
          </span>
          <span className="spacer" />
          <LanguageSwitch />
        </header>
        <div className="stage">
          <p className="editorial">{t('engine.starting')}</p>
        </div>
      </div>
    );
  }

  const isEditor = tool === 'editor';
  const canExport = isEditor || Boolean(file);

  /**
   * Cio' che sta sul piano di lavoro, qualunque sia il servizio.
   *
   * Si chiama `suPiano` e non `tela` perche' `tela` e' gia' la lavagna di
   * Brain: due cose diverse con lo stesso nome nello stesso file., qualunque sia il servizio.
   *
   * Estratta in una variabile perche' lo scontorno ora la mette DENTRO il suo
   * piano di lavoro (`Scontorna`) e gli altri servizi no: duplicarla sarebbe
   * il modo piu' rapido per farle prendere due strade diverse.
   */
  const suPiano = (
tool === 'scontorna' && !batch.running && batch.results.length > 0 && !brushOpen ? (
            /* I risultati del blocco stanno sulla TELA, non in un elenco di
               francobolli nella colonna: l'errore del modello si vede per
               differenza guardandoli insieme, non aprendoli a uno a uno. */
            <BatchGrid
              results={batch.results}
              onFix={fixFromBatch}
              onRename={rinominaRisultato}
              onDownload={scaricaRisultato}
              onDownloadAll={downloadAll}
              onClose={() => batch.clear()}
            />
          ) : tool === 'brain' ? (
            <Brain
              items={tela}
              assets={library.assets}
              leggi={library.read}
              onChange={cambiaTela}
              onUse={assetAction}
              onImport={importaFile}
              onPacco={faiPacco}
              onApriPacco={apriPacco}
              onSalvaDoc={salvaDocumento}
              onIcona={iconaDocumentoScelta}
              onFoto={fotografaLaTela}
              onScarica={scaricaAsset}
            />
          ) : tool === 'filmato' ? (
            <FilmLab
              file={filmato}
              onPick={setFilmato}
              onSave={async (blob, { kind, op }) =>
                library.save(blob, {
                  name: (filmato?.name || 'filmato').replace(/\.[^.]+$/, ''),
                  kind,
                  meta: { op },
                })
              }
              onNotice={setNotice}
              onError={setError}
            />
          ) : tool === 'suono' ? (
            <SoundLab
              sound={sound}
              onSave={async (blob, recipe) => {
                setNotice(null);
                await library.save(blob, {
                  name: `suono-${recipe.id}`,
                  kind: 'wav',
                  meta: { op: 'sound', recipe: recipe.id },
                });
                setNotice(t('sound.save'));
              }}
            />
          ) : isEditor ? (
            <SvgEditor
              ref={editorRef}
              onSelection={setSelCount}
              onRefuseNodes={() => setNotice(t('nodes.needPath'))}
            />
          ) : brushOpen && result?.kind === 'png' ? (
            <MaskBrush
              source={file}
              cutout={result.blob}
              onDone={async (blob) => {
                pushResult({ url: own(blob), blob, kind: 'png', meta: { ...result.meta, retouched: true } });
                setBrushOpen(false);

                if (daBlocco) {
                  // La correzione torna DOVE STAVA. E sovrascrive l'asset
                  // invece di crearne uno: correggere a mano non e' un lavoro
                  // nuovo, e' lo stesso asset un minuto dopo — lo stesso
                  // ragionamento gia' scritto in `sovrascriviAsset` per i .md.
                  batch.correggi(daBlocco.file, blob);
                  if (daBlocco.assetId) await library.sovrascrivi(daBlocco.assetId, blob);
                  setDaBlocco(null);
                  setNotice(t('brush.backToBatch'));
                  return;
                }

                await library.save(blob, {
                  name: nomeConSuffisso((file?.name || 'immagine').replace(/\.[^.]+$/, ''), 'corretto'),
                  kind: 'png',
                  meta: { fromId: sourceAssetId, op: 'brush' },
                });
              }}
            />
          ) : file ? (
            <Compare
              before={beforeUrl}
              after={result?.url}
              busy={busy}
              busyNote={busyNote}
              quanto={quanto}
              labels={['originale', tool === 'scontorna' ? 'scontornato' : 'vettoriale']}
            />
          ) : (
            <Dropzone
              onFile={onFile}
              onEsempio={caricaEsempio}
              title={t(tool === 'scontorna' ? 'drop.title' : 'drop.vectorTitle')}
              hint={t(tool === 'scontorna' ? 'drop.hint' : 'drop.vectorHint')}
            />
          )
  );

  return (
    <div className="shell" data-working={isEditor}>
      {/* La striscia nera in cima, e dentro il LOGO DEL SERVIZIO IN USO.
          La faccia di Zack che fa quella cosa e' l'unica cosa che deve stare
          qui: dice dove sei senza una parola, e cambia quando cambi servizio.

          «Spiegami» e la scelta della lingua sono NASCOSTI per ora — decisione
          del committente del 2026-08-31. I componenti restano importati e
          pronti: rimetterli e' una riga. */}
      <header className="topbar">
        {/* Il marchio del prodotto, non quello del negozio: JAYL resta di
            jayl.store e dei capi, Zack App è il software. Erano la stessa
            parola su due modelli di business con ritmi incompatibili. */}
        <span className="wordmark">
          ZACK <em>app</em>
        </span>
        <span className="spacer" />
        {FACCIA.has(tool) && (
          <img
            className="topbar-faccia"
            src={`/zack/servizi/${tool}-320.webp`}
            alt=""
            aria-hidden="true"
            width="320"
            height="320"
          />
        )}
      </header>

      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      <div className="main">
        <ToolRail
          current={tool}
          collapsed={isEditor}
          balance={null}
          onPick={(svc) => {
            if (!svc.ready) {
              setNotice(`${t('soon.title')} — ${t('soon.body')}`);
              return;
            }
            setNotice(null);
            setTool(svc.id);
            setRicetta(leggiRicetta(svc.id));
          }}
        />

        <section className="stage">
          {bannerOpen && engine.ready && (
            <EngineBanner
              tier={engine.tier}
              phase={engine.phase}
              onDismiss={() => setBannerOpen(false)}
            />
          )}
          {/* La barra parla del file sul piano di lavoro. In Brain non c'è un
              file sul piano: c'è una tela, e i suoi comandi stanno sopra di
              lei. Lasciarla visibile faceva credere che il tasto Zack agisse
              su ciò che si stava guardando. */}
          {/* La barra sopra la tela parla del file sul piano di lavoro, che è
              un'immagine. Nei servizi che lavorano su altro non ha senso, e
              `filmato` era rimasto fuori dalla lista mentre veniva aggiunto
              dappertutto: chi apriva Filmato si trovava sopra il nome di un
              JPG e il tasto Zack, che avrebbe scontornato l'immagine mentre
              lui guardava una clip. */}
          {!isEditor && !['suono', 'brain', 'filmato', 'scontorna'].includes(tool) && (
            <StageBar
              file={file}
              image={stats?.image}
              hasResult={result?.kind === 'png'}
              canUndo={history.length > 0}
              brushOpen={brushOpen}
              busy={Boolean(busy)}
              ricetta={ricetta}
              pianoZack={stats?.image ? pianoZack(ricetta, stats.image) : null}
              lampoZack={lampoZack}
              onZack={runZack}
              onRicetta={salvaRicetta}
              onUndo={undoResult}
              onBrush={() => setBrushOpen((v) => !v)}
              onCrop={() => {
                setNotice(null);
                // Il ritaglio vive negli avanzati: si aprono, e ci si porta.
                // Cercare la sezione per il testo del titolo, com'era prima,
                // si rompeva al primo cambio di traduzione: ora ha un id.
                const avanzati = document.querySelector('.rail .avanzati-head');
                if (avanzati?.getAttribute('aria-expanded') !== 'true') avanzati?.click();
                requestAnimationFrame(() => {
                  document
                    .querySelector('.rail .sect[data-id="crop"]')
                    ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                });
              }}
              onSwap={swapFile}
              onClear={() => {
                if (window.confirm(t('bar.confirmClear'))) reset();
              }}
            />
          )}

          {error && <div className="alert">{error}</div>}
          {notice && !error && <div className="alert">{notice}</div>}

          {/* Lo scontorno ha il suo piano di lavoro: vuoto, col `+` in mezzo,
              il tasto Zack in basso a destra e la mascotte a sinistra. La
              tela vera — confronto, pennello, blocco — gli sta dentro, e
              compare quando c'e' un file. */}
          {tool === 'scontorna' ? (
            <Scontorna
              vuoto={!file && batch.results.length === 0}
              ricetta={ricetta}
              piano={stats?.image ? pianoZack(ricetta, stats.image) : null}
              busy={Boolean(busy)}
              models={engine.models}
              modello={s.model}
              onModello={(id) => set({ model: id })}
              onPick={swapFile}
              onFile={onFile}
              onZack={runZack}
              onRicetta={salvaRicetta}
              onScarica={runExport}
              puoiScaricare={canExport}
              strumenti={
                file
                  ? [
                      { id: 'undo', icon: 'undo', label: t('bar.undo'), disabled: Boolean(busy) || history.length === 0, onClick: undoResult },
                      { id: 'eraser', icon: 'eraser', label: t('bar.eraser'), disabled: Boolean(busy) || result?.kind !== 'png', active: brushOpen, onClick: () => setBrushOpen((v) => !v) },
                      { id: 'swap', icon: 'swap', label: t('bar.swap'), disabled: Boolean(busy), onClick: swapFile },
                      {
                        id: 'clear',
                        icon: 'clear',
                        label: t('bar.clear'),
                        disabled: Boolean(busy),
                        onClick: () => {
                          if (window.confirm(t('bar.confirmClear'))) reset();
                        },
                      },
                    ]
                  : []
              }
            >
              {suPiano}
            </Scontorna>
          ) : (
            suPiano
          )}
        </section>

        <aside
          className="rail"
          /* Brain, Suono e Filmato hanno i loro comandi sulla tela, dove si
             guarda. Senza questo la colonna mostrava i comandi del vettoriale
             accanto al laboratorio dei suoni: un pannello che parla di
             un'altra cosa è peggio di un pannello vuoto. */
          data-vuota={['brain', 'suono', 'filmato', 'scontorna'].includes(tool) || undefined}
        >
          {/* Brain non ha comandi in colonna: i suoi stanno sulla tela, dove
              si guarda. Una colonna di comandi spenti accanto a una lavagna è
              esattamente il rumore che la regola §6.1 vuole togliere. */}
          {['brain', 'suono', 'filmato', 'scontorna'].includes(tool) ? null : isEditor ? (
            <>
              <VectorTools
                editor={editorRef}
                selCount={selCount}
                nodeMode={nodeMode}
                tick={editorTick}
                onNodeMode={(on) => {
                  setNodeMode(on);
                  editorRef.current?.nodeMode(on);
                }}
              />

              <button className="btn ghost" onClick={cleanFromEditor}>
                {t('editor.clean.label')}
              </button>
            </>
          ) : tool === 'scontorna' ? (
            <>
              <RemovePanel models={engine.models} s={s} set={set} busy={Boolean(busy)} />

              {result?.kind === 'png' && (
                <div className="field">
                  <span className="label">
                    <span>{t('brush.title')}</span>
                  </span>
                  <Help k="brush.help" />
                  <button
                    className="opt"
                    aria-pressed={brushOpen}
                    disabled={Boolean(busy)}
                    onClick={() => setBrushOpen((v) => !v)}
                  >
                    {t('brush.open')}
                  </button>
                </div>
              )}

            </>
          ) : (
            <TracePanel presets={TRACE_PRESETS} s={s} set={set} busy={Boolean(busy)} />
          )}

          {/* Un solo posto nascosto per schermata, e solo per ciò che il
              lavoro normale non usa: la catena del tasto Zack porta a termine
              lo scontorno senza aprirlo mai. */}
          {!isEditor && (
            <Advanced id={tool}>
              <BatchPanel
                files={batchFiles}
                batch={batch}
                onPickFiles={pickBatchFiles}
                onClearFiles={() => {
                  setBatchFiles([]);
                  batch.clear();
                }}
                onFix={fixFromBatch}
              />

              <UpscalePanel
                image={stats?.image}
                scaleId={s.scale}
                onScale={(id) => set({ scale: id })}
                busy={Boolean(busy)}
                running={upscaling}
                onRun={runUpscale}
                onStop={engine.stopUpscale}
              />

              {result?.meta && (
                <>
                  <MetaBlock
                    title="Risultato"
                    rows={
                      result.kind === 'svg'
                        ? [
                            ['path', String(result.meta.paths)],
                            ['peso', `${Math.round(result.meta.bytes / 1024)} KB`],
                            ['risparmio', `${result.meta.saved}%`],
                            ['tempo', secs(result.meta.ms)],
                          ]
                        : [
                            ['strategia', STRATEGIE[result.meta.strategy] || 'diretta'],
                            ['sorgente', px(result.meta.source)],
                            ['uscita', px(result.meta.output)],
                            ['la rete ha visto', px(result.meta.modelSaw)],
                            ['tempo', secs(result.meta.ms)],
                          ]
                    }
                  />
                  {result.kind === 'svg' && (
                    <button className="btn ghost small" onClick={sendToEditor}>
                      Apri nell'editor
                    </button>
                  )}
                </>
              )}

              {tool !== 'suono' && file && (
                <FinishPanel
                  stats={stats}
                  reading={statsReading}
                  s={s}
                  set={set}
                  busy={Boolean(busy)}
                  isVector={result?.kind === 'svg'}
                  mockup={mockup}
                  onCrop={runCrop}
                  onMockup={runMockup}
                />
              )}

              <ExportPanel
                presets={PRESETS}
                backgrounds={Object.keys(BACKGROUNDS)}
                s={s}
                set={set}
                busy={Boolean(busy)}
              />
            </Advanced>
          )}

          {file && !isEditor && (
            <button className="btn ghost" onClick={reset}>
              {t('control.reset.label')}
            </button>
          )}

          {/* One sticky bar so the primary action is never below the fold. */}
          <div className="cta">
            {isEditor ? (
              <button className="btn" onClick={saveFromEditor}>
                {t('editor.save.label')}
              </button>
            ) : (
              <button
                className="btn"
                disabled={!file || Boolean(busy)}
                onClick={() => run(tool === 'scontorna' ? 'remove' : 'trace')}
              >
                {t(tool === 'scontorna' ? 'tool.cutout.label' : 'tool.vector.label')}
              </button>
            )}
            <button
              className="btn ghost"
              disabled={!canExport || Boolean(busy)}
              onClick={runExport}
            >
              {t('action.export.label')}
            </button>
          </div>
        </aside>
      </div>

      <Library
        store={library}
        open={libOpen}
        onToggle={() =>
          setLibOpen((v) => {
            const next = !v;
            try {
              localStorage.setItem('jayl.libOpen', next ? '1' : '0');
            } catch {
              /* la sessione corrente funziona lo stesso */
            }
            return next;
          })
        }
        big={libBig}
        onToggleBig={() =>
          setLibBig((v) => {
            const next = !v;
            try {
              localStorage.setItem('jayl.libBig', next ? '1' : '0');
            } catch {
              /* la sessione corrente funziona lo stesso */
            }
            return next;
          })
        }
        onOpenInEditor={openWorkInEditor}
        onDownloadAll={downloadAll}
        onAssetAction={assetAction}
      />

      <footer className="statusbar">
        <span>
          {t('status.file')} <b>{file ? file.name : t('status.none')}</b>
        </span>
        {!isEditor && (
          <span>
            {t('status.mode')}{' '}
            {/* Il nome amichevole, non l'id tecnico: "isnet-general-use" non
                dice niente a nessuno. */}
            <b>
              {tool === 'scontorna'
                ? t(engine.models.find((m) => m.id === s.model)?.labelKey || 'status.none')
                : s.tracePreset}
            </b>
          </span>
        )}
        <span>
          {t('status.format')} <b>{s.preset}</b>
        </span>
        {/* Il blocco gira anche quando il suo pannello non si vede: è un
            lavoro da mezz'ora, e obbligare a restare a guardarlo farebbe di
            «quaranta file in un colpo» una promessa di stare fermi. Qui sotto
            resta il conto, in ogni servizio. */}
        {batch.running && (
          <span className="stato-blocco">
            {t('batch.title')}{' '}
            <b>
              {t('batch.progress', {
                done: batch.summary.done + batch.summary.failed,
                total: batch.summary.total,
              })}
            </b>
            {batch.eta != null && ` · ${t('batch.eta', { sec: batch.eta })}`}
          </span>
        )}

        <span className="payoff">{t('app.payoff')}</span>
      </footer>
    </div>
  );
}
