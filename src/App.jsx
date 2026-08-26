import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Compare from './components/Compare.jsx';
import Library from './components/Library.jsx';
import SvgEditor from './components/SvgEditor.jsx';
import { RemovePanel, TracePanel, ExportPanel, UpscalePanel, MetaBlock, Help } from './components/Panels.jsx';
import EngineBanner from './components/EngineBanner.jsx';
import LanguageSwitch from './components/LanguageSwitch.jsx';
import HelpToggle from './components/HelpToggle.jsx';
import Onboarding, { hasSeenOnboarding } from './components/Onboarding.jsx';
import VectorTools from './components/VectorTools.jsx';
import { resolveShortcut } from './engine/shortcuts.js';
import { useLibrary } from './hooks/useLibrary.js';
import ToolRail from './components/ToolRail.jsx';
import MaskBrush from './components/MaskBrush.jsx';
import BatchPanel from './components/BatchPanel.jsx';
import SoundLab from './components/SoundLab.jsx';
import FinishPanel from './components/FinishPanel.jsx';
import StageBar from './components/StageBar.jsx';
import { useSound } from './hooks/useSound.js';
import { useBatch } from './hooks/useBatch.js';
import { canUpscale, estimateSeconds, getScale } from './engine/upscale.js';
import { TARGET_SIDE } from './engine/ready.js';
import { pianoZack, normalizza, RICETTE_DI_FABBRICA } from './engine/ricette.js';
import { getService, firstReady } from './services.js';

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
const STRATEGIE = { mask: 'maschera', crop: 'ritaglio', upscale: 'ingrandimento', browser: 'diretta' };
// Un tempo che non abbiamo misurato non si stampa: «NaNs» sembra un guasto,
// e un trattino dice la verità.
const secs = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : '—');

export default function App() {
  const [apiState, setApiState] = useState('offline');
  const [tool, setTool] = useState('scontorna');

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
          name: `${file.name.replace(/\.[^.]+$/, '')}-vettoriale`,
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
  function fixFromBatch({ file: original, blob }) {
    setError(null);
    setNotice(null);
    setTool('scontorna');
    setFile(original);
    setBeforeUrl(own(original));
    setSourceAssetId(null);
    setHistory([]);
    setResult({ url: own(blob), blob, kind: 'png', meta: { strategy: 'browser', batch: true } });
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
        name: `${source.name.replace(/\.[^.]+$/, '')}-${s.preset}`,
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

      if (piano.passi.includes('scontorna')) {
        setBusy(t('zack.working'));
        setBusyNote(null);
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
        setBusy(t('zack.working'));
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
        setBusy(t('zack.working'));
        setUpscaling(true);
        const bmp = await createImageBitmap(current);
        const out = await engine.upscale(bmp, piano.scaleId, (phase, d) => {
          if (d?.done) setBusyNote(`${d.done}/${d.total}`);
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

      if (piano.passi.includes('esporta')) {
        await library.save(current, {
          name: `${base}-zack`,
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
            JAYL <em>STUDIO</em>
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

  return (
    <div className="shell" data-working={isEditor}>
      <header className="topbar">
        <span className="wordmark">
          JAYL <em>STUDIO</em>
        </span>
        <span className="spacer" />
        <HelpToggle />
        <LanguageSwitch />
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
          {!isEditor && tool !== 'suono' && (
            <StageBar
              file={file}
              image={stats?.image}
              hasResult={result?.kind === 'png'}
              canUndo={history.length > 0}
              brushOpen={brushOpen}
              busy={Boolean(busy)}
              ricetta={ricetta}
              pianoZack={stats?.image ? pianoZack(ricetta, stats.image) : null}
              onZack={runZack}
              onRicetta={salvaRicetta}
              onUndo={undoResult}
              onBrush={() => setBrushOpen((v) => !v)}
              onCrop={() => {
                const el = document.querySelector('.rail .sect[data-open] .sect-title');
                setNotice(null);
                // La sezione Ritaglio vive nel pannello: si apre e ci si porta.
                const head = [...document.querySelectorAll('.rail .sect-head')].find(
                  (h) => h.querySelector('.sect-title')?.textContent === t('crop.title'),
                );
                if (head) {
                  if (head.getAttribute('aria-expanded') !== 'true') head.click();
                  head.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }
                void el;
              }}
              onSwap={swapFile}
              onClear={() => {
                if (window.confirm(t('bar.confirmClear'))) reset();
              }}
            />
          )}

          {error && <div className="alert">{error}</div>}
          {notice && !error && <div className="alert">{notice}</div>}

          {tool === 'suono' ? (
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
                await library.save(blob, {
                  name: `${(file?.name || 'immagine').replace(/\.[^.]+$/, '')}-corretto`,
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
              labels={['originale', tool === 'scontorna' ? 'scontornato' : 'vettoriale']}
            />
          ) : (
            <Dropzone
              onFile={onFile}
              title={t(tool === 'scontorna' ? 'drop.title' : 'drop.vectorTitle')}
              hint={t(tool === 'scontorna' ? 'drop.hint' : 'drop.vectorHint')}
            />
          )}
        </section>

        <aside className="rail">
          {isEditor ? (
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
            </>
          ) : (
            <TracePanel presets={TRACE_PRESETS} s={s} set={set} busy={Boolean(busy)} />
          )}

          {result?.meta && !isEditor && (
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

          {!isEditor && tool !== 'suono' && file && (
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
        <span className="payoff">{t('app.payoff')}</span>
      </footer>
    </div>
  );
}
