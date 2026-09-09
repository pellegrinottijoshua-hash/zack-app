import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Compare from './components/Compare.jsx';
import Library from './components/Library.jsx';
import SvgEditor from './components/SvgEditor.jsx';
import { RemovePanel, ExportPanel, UpscalePanel, MetaBlock, Help } from './components/Panels.jsx';
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
import Piano from './components/Piano.jsx';
import MaskBrush from './components/MaskBrush.jsx';
import BatchPanel from './components/BatchPanel.jsx';
import SoundLab from './components/SoundLab.jsx';
import VoceLab from './components/VoceLab.jsx';
import FinishPanel from './components/FinishPanel.jsx';
import Advanced from './components/Advanced.jsx';
import ScegliAsset from './components/ScegliAsset.jsx';
import Tutorial from './components/Tutorial.jsx';
import Brain from './components/Brain.jsx';
import BatchGrid from './components/BatchGrid.jsx';
import { kindFromFile, nomeConSuffisso } from './store/model.js';
import { impacchetta, spacchetta, fotografaTela } from './store/brainBundle.js';
import StageBar from './components/StageBar.jsx';
import { useSound } from './hooks/useSound.js';
import { useBatch } from './hooks/useBatch.js';
import { canUpscale, estimateSeconds, getScale } from './engine/upscale.js';
import { TARGET_SIDE } from './engine/ready.js';
import { pianoZack, normalizza, fattoreDi, RICETTE_DI_FABBRICA } from './engine/ricette.js';
import { aPng, applicaAlfa, pixelDaFile, ritaglioIstantaneo } from './engine/ritaglio.js';
import { DESCRITTORI, getDescrittore, strumentiVisibili } from './servizi/index.js';
import { pianoVuoto, quantiSulPiano, statoDelPiano } from './servizi/piano.js';
import { statoLicenza, puoiLavorare, giorniAllaProva } from './engine/licenza.js';
import { leggiLicenza, salvaLicenza } from './store/licenza.js';
import { chiediLicenza, sessione, entraConEmail, entraConGoogle } from './lib/conto.js';
import Muro from './components/Muro.jsx';
import { nuovaNota, nuovoAsset, nuovoCerchio, prossimoPosto } from './engine/brain.js';
import { riordina } from './engine/riordina.js';
import { leggiDescrizione } from './engine/dizionarioVoce.js';
import { NEUTRA, fondiRicetta, getRecipe } from './engine/sound.js';
import { famiglia, genera, suRitmo, SR } from './engine/synth.js';
import { caricaFileDiProva, deveMostrareProva, segnaProvaVista } from './engine/prova.js';
import { SERVICES, getService, firstReady, NOMI_VECCHI } from './services.js';

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
import { bundleAll, bundleBlobs } from './store/bundle.js';
import { useEngine } from './hooks/useEngine.js';
import { t, setLang, detectLang, onLangChange } from './i18n/index.js';
import { onHelpChange, isHelpOn } from './i18n/help.js';
import { renderExport } from './engine/render.js';
import { analyze, applyCrop, renderMockup, closeHoles } from './engine/finish.js';
import { PRESETS, BACKGROUNDS } from './engine/export.js';
import { traceToSvg } from './engine/trace.js';
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
/**
 * La faccia di Zack in cima, una per servizio.
 *
 * È un **elenco di file che esistono**, non un insieme di id: era un `Set` e
 * `/zack/servizi/${tool}-320.webp`, cioè un percorso costruito a mano — alla
 * divisione del 2026-09-08 «effetti» ci è entrato e ha chiesto un'immagine
 * che nessuno ha mai disegnato. Un'immagine rotta in cima allo schermo, e
 * nessun errore in console: si vede solo guardando.
 *
 * `effetti` non c'è apposta, e non è una dimenticanza: la sua faccia va
 * disegnata. Finché non esiste, la striscia resta vuota lì — che è quello che
 * fa già per i servizi a pagamento.
 */
const FACCIA = new Set(['brain', 'scontorna', 'vettorializza', 'vocale']);

/**
 * I servizi che non lavorano su un file del piano.
 *
 * Era `tool !== 'suono'`, cioe' un id scritto a mano — e alla divisione del
 * 2026-09-08 sarebbe rimasto indietro senza lamentarsi: gli Effetti avrebbero
 * mostrato il nome di un JPG sopra le loro manopole, che e' esattamente il
 * difetto gia' costato una volta con `filmato`.
 */
const SENZA_FILE = new Set(['vocale', 'effetti']);

const STRATEGIE = {
  mask: 'maschera',
  crop: 'ritaglio',
  upscale: 'ingrandimento',
  browser: 'diretta',
  // Il fondo era piatto: nessun modello, nessuno scaricamento, ~20 ms. Va
  // detto nel pannello del risultato, perche' spiega da solo perche' quella
  // volta non c'e' stata attesa.
  istantaneo: 'senza modello',
};
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
      const s = SERVICES.find((x) => x.id === (NOMI_VECCHI[chiesto] || chiesto));
      return s?.ready ? s.id : 'scontorna';
    } catch {
      return 'scontorna';
    }
  });

  /*
   * L'editor non e' piu' una SCHERMATA a parte.
   *
   * Era `tool === 'editor'`, e ci si arrivava solo dopo aver tracciato
   * un'immagine e premuto «apri nell'editor» — per questo il committente il
   * 2026-09-09 diceva che gli strumenti erano spariti. Erano dietro una porta.
   *
   * `services.js` lo scriveva gia' nel 2026-08: «vettorializza ED editor SVG:
   * un servizio solo, perche' sono un gesto solo». Adesso e' vero anche nel
   * codice: aprire Vettoriale apre la tela, vuota, con gli strumenti ai
   * fianchi. La porta non c'e' piu' perche' non serve piu'.
   */
  const isEditor = tool === 'vettorializza';

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
  const [telaId, setTelaId] = useState(null);
  const [tela, setTela] = useState([]);

  /**
   * La regola con cui il tasto Zack riordina la tela di Brain.
   *
   * Sta qui e non dentro `Brain` perché il tasto vive nell'impianto: se lo
   * stato stesse nel componente, il tasto non potrebbe leggerlo.
   */
  const [regolaRiordino, setRegolaRiordino] = useState(getDescrittore('brain').tasto.predefinita);
  /**
   * Lo strumento di disegno acceso nel vettoriale.
   *
   * Sta qui e non dentro `SvgEditor` per la stessa ragione della freccia di
   * Brain: i comandi sono cerchi dell'impianto, e il loro stato sta dove
   * stanno loro. `select` è quello di partenza, come in ogni editor.
   */
  const [modoDisegno, setModoDisegno] = useState('select');

  /**
   * Cosa è aperto SOPRA la tela: `null`, `'avanzati'` o `'libreria'`.
   *
   * Uno stato solo e non due booleani: due booleani possono essere veri
   * insieme, e infatti lo sono stati — aperta la libreria e poi gli avanzati,
   * restavano tutt'e due, e la libreria copriva l'altro per sempre. Sopra la
   * tela ci può stare **una cosa sola**, e adesso lo dice il tipo.
   */
  const [sopraLaTela, setSopraLaTela] = useState(null);

  /**
   * La licenza, letta dalla memoria PRIMA di disegnare.
   *
   * Il muro non deve comparire un istante dopo lo studio: chi non ha pagato
   * vedrebbe per mezzo secondo la cosa che non può usare, che è peggio di un
   * muro netto.
   */
  const [licenza, setLicenza] = useState(() => leggiLicenza());
  const statoConto = statoLicenza(licenza);

  /**
   * Il muro è **spento** finché B1 non è finito.
   *
   * Il 2026-09-09 l'ho spinto su `main` con i Task 4 e 5 — quelli che
   * permettono di ENTRARE — ancora da fare, e Cloudflare ricostruisce da solo:
   * lo studio si è chiuso in produzione per tutti, e nessuno aveva modo di
   * rientrare. Non c'era nemmeno la porta.
   *
   * Un interruttore, spento per difetto: si accende con `VITE_MURO=1` al
   * momento della build, quando ci sarà da che parte entrare. Il muro esiste,
   * si può provare in locale, e non può più chiudere fuori nessuno per
   * distrazione.
   */
  const muroAcceso = import.meta.env.VITE_MURO === '1';
  const chiuso = muroAcceso && !puoiLavorare(statoConto);

  /**
   * Chiede al server chi siamo, e se ne ricorda.
   *
   * Se il server non risponde **non si tocca la licenza salvata**: la grazia
   * dei sette giorni esiste apposta (spec § 3.4), e sovrascriverla con un
   * fallimento di rete vorrebbe dire chiudere fuori chi ha pagato per colpa
   * di un wifi. `chiediLicenza` torna `null` per dire «non lo so», e chi non
   * lo sa tiene buona l'ultima risposta.
   */
  const aggiornaLicenza = useCallback(async () => {
    const token = await sessione();
    if (!token) return;
    const fresca = await chiediLicenza(token);
    if (!fresca) return;
    salvaLicenza(fresca);
    setLicenza(fresca);
  }, []);

  /*
   * DOPO il primo disegno, mai prima (spec § 8). Lo studio gira sul computer
   * di chi lo usa: farlo aspettare una risposta da Internet per aprire uno
   * strumento locale e' il modo di farsi odiare anche da chi ha pagato. Il
   * muro del primo istante lo decide `leggiLicenza()`, che e' sincrono.
   */
  useEffect(() => {
    aggiornaLicenza();
  }, [aggiornaLicenza]);
  /** Per «centra tutto», che ora è un cerchio ma muove la vista di Brain. */
  const brainRef = useRef(null);
  /** Il menu del `+` aperto. È un momento, non uno stato: si apre e si chiude. */
  const [menuPiu, setMenuPiu] = useState(false);
  /**
   * La freccia in corso: `null` spenta, `{da: null}` accesa, `{da: id}` a
   * metà. Sollevato fuori da `Brain` perché il comando è un cerchio
   * dell'impianto, e due comandi per la stessa cosa — uno dentro e uno fuori —
   * sono un comando di troppo.
   */
  const [collegaBrain, setCollegaBrain] = useState(null);

  /** La frase scritta in basso nel Vocale: da lì il tasto ricava i filtri. */
  const [descrizioneVoce, setDescrizioneVoce] = useState('');
  /**
   * Da dove parte la voce: una delle sei ricette, o «naturale».
   *
   * Sta qui e non dentro `SoundLab` per la stessa ragione della regola di
   * Brain: la scelta si fa nel punto oro, che è dell'impianto.
   */
  const [baseVoce, setBaseVoce] = useState(getDescrittore('vocale').tasto.predefinita);
  /**
   * I filtri impostati dal tasto, come scostamento dalla ricetta scelta.
   *
   * Due frasi di seguito sono due richieste che **si sommano**: chi scrive
   * «più calda», ascolta, e poi scrive «da radio» non sta ricominciando.
   */
  const [filtriVoce, setFiltriVoce] = useState({});
  /** I filtri di prima, per l'annulla. Una mossa sola, come per la tela. */
  const [filtriDiPrima, setFiltriDiPrima] = useState(null);
  /** Le manopole aperte: il `+` degli Effetti le apre senza chiedere un file. */
  const [effettoAperto, setEffettoAperto] = useState(false);
  /**
   * L'effetto che si sta costruendo.
   *
   * Sta qui e non dentro `SoundLab` perche' il tasto Zack lo SUONA e il
   * cerchio «un altro cosi'» ne cambia il seme: se lo stato stesse nel
   * componente, ne' l'uno ne' l'altro potrebbero toccarlo.
   *
   * `seme` e' un numero che cambia, non un dado nascosto: lo stesso seme da'
   * sempre lo stesso suono, quindi cio' che hai appena trovato si ritrova.
   */
  const [effetto, setEffetto] = useState(() => {
    const f = famiglia(getDescrittore('effetti').tasto.predefinita);
    return { famiglia: f.id, param: { ...f.param }, durata: f.durata, seme: 1 };
  });
  /**
   * La tela com'era prima dell'ultimo cambiamento.
   *
   * Una tela senza annulla è peggio di una senza il tasto: un trascinamento
   * sbagliato, o un riordino che non piace, non si tornano indietro. Una sola
   * mossa e non una pila, perché è quella che serve davvero — e una pila
   * andrebbe salvata, e non è quello che si salva di una lavagna.
   *
   * È **stato** e non `useRef` apposta: il cerchio dell'annulla si spegne
   * quando non c'è niente da annullare, e con un ref non si ridisegnerebbe —
   * resterebbe acceso a non fare niente, che è la definizione di un comando
   * rotto (la stessa riga c'è già per l'annulla dello scontorno).
   */
  const [telaDiPrima, setTelaDiPrima] = useState(null);

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
  /** Con quale strumento si e' aperto il pennello, per accendere il cerchio. */
  const [modoPennello, setModoPennello] = useState('erase');
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

  /*
   * DUE registratori, non uno.
   *
   * I due servizi usano il microfono per due cose diverse: il Vocale registra
   * la MATERIA — la voce che poi si trasforma — e gli Effetti registrano un
   * RITMO, che serve solo a posizionare le copie di un tonfo. Con un
   * registratore solo, battere «tum tum tum» negli Effetti riempiva anche il
   * Vocale, che si sarebbe trovato una voce che nessuno gli ha dato.
   *
   * Due istanze vuol dire due AudioContext, e va bene: il commento in
   * `useSound` mette in guardia dalle DECINE, non da due.
   */
  const voce = useSound();
  const effettiAudio = useSound();

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
    if (!isEditor) return undefined;
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
        setTool('vettorializza');
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
        const sorgente = result?.blob || file;

        /*
         * I pixel PRIMA del modello, e sono due cose in una.
         *
         * 1. Venti millisecondi per sapere se il modello servira'. Si paga
         *    qui, una volta, invece di far scendere 175 MB anche a un fondo
         *    piatto. E' esattamente cio' che la home fa dal 2026-08-27 e che
         *    lo studio non ha mai fatto.
         * 2. Da qui in poi sappiamo CHI ha sbagliato. Se il file non si
         *    decodifica, il colpevole e' il file; se si decodifica e poi il
         *    modello cade, il colpevole e' lo strumento — e non si manda
         *    l'utente a rifare un file che stava bene.
         */
        let src;
        try {
          src = await pixelDaFile(sorgente);
        } catch (e) {
          console.error(e);
          throw Object.assign(e, { code: 'file-illeggibile' });
        }

        const istante = ritaglioIstantaneo(src);
        const blob = istante
          ? await aPng(applicaAlfa(src, istante.alpha))
          : await engine.cutout(sorgente, s.model);

        pushResult({
          url: own(blob),
          blob,
          kind: 'png',
          // Lo scontorno non ricampiona: entra e esce alla stessa misura. Dirlo
          // serve a chi sta controllando di non aver perso risoluzione per strada.
          meta: {
            strategy: istante ? 'istantaneo' : 'browser',
            // Senza modello non c'e' un modello da nominare, e scrivere
            // `u2net` accanto a un ritaglio che non l'ha usato sarebbe una
            // riga falsa nel pannello del risultato.
            model: istante ? null : s.model,
            uniformita: istante ? istante.uniformita : null,
            source: stats?.image,
            output: stats?.image,
            ms: Date.now() - started,
          },
        });
        await library.save(blob, {
          name: `${file.name.replace(/\.[^.]+$/, '')}-scontornato`,
          kind: 'png',
          meta: {
            fromId: sourceAssetId,
            op: 'remove-bg',
            model: istante ? null : s.model,
            via: istante ? 'istantaneo' : 'modello',
          },
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
      // Questo lo sappiamo per davvero: i pixel non si sono decodificati, e
      // il colpevole e' il file. E' l'unico posto dove si puo' dire.
      else if (e.code === 'file-illeggibile')
        setError(`${t('engine.unreadable.title')} — ${t('engine.unreadable.body')}`);
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

      if (isEditor) {
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
    setTool('vettorializza');
    setTimeout(() => {
      const ok = editorRef.current?.setSvg(result.text);
      if (!ok) setError("L'editor non è riuscito ad aprire questo SVG.");
    }, 120);
  }

  async function openWorkInEditor(item) {
    try {
      const { file: f } = await library.read(item.id);
      const txt = await f.text();
      setTool('vettorializza');
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

  /**
   * Fino a TRE file in una volta, dal `+` o trascinandoli.
   *
   * Uno solo prende il piano di lavoro e lo si lavora a mano, col pennello e
   * il righello. Da due in su e' un blocco: si guardano insieme, in colonna, e
   * il tasto Zack li fa tutti. Il tetto e' tre come nella home — di piu' e' il
   * lavoro in blocco vero, che ha il suo pannello e arriva a quaranta.
   */
  /**
   * Mette dei file sul piano — AGGIUNGENDOLI a quelli che ci sono gia'.
   *
   * Il difetto (2026-09-05, riferito dal committente: «non c'e' il tasto piu'
   * per aggiungere secondo e terzo file»): questa funzione SOSTITUIVA sempre.
   * Non esisteva nessun percorso che aggiungesse, quindi anche mettendoci il
   * `+` premerlo avrebbe buttato via il file di prima — il tasto sarebbe
   * comparso e avrebbe fatto la cosa sbagliata, che e' peggio del tasto
   * mancante.
   *
   * Quanti ne stanno lo dice il DESCRITTORE, non un numero scritto qui: e' la
   * stessa domanda a cui risponde `servizi/`, e due risposte alla stessa
   * domanda divergono.
   */
  function accettaFile(lista, { aggiungi = false } = {}) {
    const immagini = [...lista].filter((f) => f.type.startsWith('image/'));
    if (!immagini.length) return;

    const massimo = getDescrittore(tool).accetta.quanti;
    // Cio' che sta gia' sul piano: la colonna, oppure il file singolo. Si
    // legge PRIMA di `reset()`, che lo cancellerebbe.
    const gia = aggiungi ? (batchFiles.length > 0 ? batchFiles : file ? [file] : []) : [];
    const insieme = [...gia, ...immagini].slice(0, massimo);

    if (insieme.length === 1) {
      setBatchFiles([]);
      batch.clear();
      onFile(insieme[0]);
      return;
    }
    // Da due in su il piano diventa la colonna: il file singolo esce di
    // scena, o resterebbero due lavori aperti insieme senza dirlo.
    reset();
    batch.clear();
    setBatchFiles(insieme);
  }

  /** Il `+`: sceglie i file dal computer, e li AGGIUNGE a quelli sul piano. */
  function scegliFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => accettaFile(input.files || [], { aggiungi: true });
    input.click();
  }

  /** Apre il pennello gia' sullo strumento scelto dal cerchio a destra. */
  function apriPennello(modo) {
    setModoPennello(modo);
    setBrushOpen(true);
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
  async function cambiaTela(prossima, { ricordabile = true } = {}) {
    // Il passo indietro si ricorda PRIMA di sovrascrivere. `ricordabile` è
    // falso solo quando a chiamare è l'annulla stesso, o annullare due volte
    // rimetterebbe la tela dov'era, avanti e indietro all'infinito.
    if (ricordabile) setTelaDiPrima(tela);
    setTela(prossima);
    if (telaId) await library.saveBrain(telaId, prossima);
  }

  /**
   * Il `+` del Vocale: due gesti diversi, non uno.
   *
   * **Registrare** apre il microfono, **aggiungere** prende una voce che hai
   * già. Metterli in uno solo avrebbe voluto dire scegliere al posto
   * dell'utente quale dei due intendeva.
   */
  function menuVocale(quale) {
    setMenuPiu(false);
    if (quale === 'registra') return voce.start();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) voce.apriFile(f);
    };
    return input.click();
  }

  /**
   * Il `+` degli Effetti: da dove parte il suono.
   *
   * «Costruisci» apre le manopole sulla famiglia scelta nel punto oro;
   * «ritmo» apre il microfono per battere il tempo che l'effetto seguira'.
   * Sono i due modi di cominciare, e nessuno dei due e' «apri un file»:
   * qui non si porta niente, si fa.
   */
  function menuEffetti(quale) {
    setMenuPiu(false);
    if (quale === 'ritmo') return effettiAudio.start();
    return setEffettoAperto(true);
  }

  /** Il suono di adesso: le manopole più, se c'è, il ritmo battuto. */
  function costruisciEffetto() {
    const colpo = genera(effetto.famiglia, {
      param: effetto.param,
      durata: effetto.durata,
      seme: effetto.seme,
    });
    const ritmo = effettiAudio.rhythm?.onsets?.length ? effettiAudio.rhythm.onsets : null;
    return ritmo ? suRitmo(colpo, ritmo) : colpo;
  }

  async function salvaEffetto() {
    setNotice(null);
    await library.save(effettiAudio.comeFile(costruisciEffetto(), SR), {
      name: `suono-${effetto.famiglia}`,
      kind: 'wav',
      meta: { op: 'sound', recipe: effetto.famiglia },
    });
    setNotice(t('sound.save'));
  }

  /**
   * Chi risponde alle pastiglie del punto oro, per servizio.
   *
   * Una mappa e non tre `tool === ...` di fila: il punto oro fa la stessa
   * domanda a tutti — «cosa farà il tasto quando lo premo» — e chi aggiunge
   * un servizio nuovo deve trovare UN posto dove rispondere, non tre righe
   * gemelle sparse fra le props.
   */
  const OPZIONE = {
    brain: { valore: regolaRiordino, cambia: setRegolaRiordino },
    vocale: { valore: baseVoce, cambia: setBaseVoce },
    vettorializza: { valore: s.tracePreset, cambia: (id) => set({ tracePreset: id }) },
    effetti: {
      valore: effetto.famiglia,
      // Cambiare famiglia riporta le manopole a quelle di casa sua: le
      // manopole di «vento» su «click» sarebbero numeri che non vogliono dire
      // niente, e il suono uscirebbe sbagliato senza che si capisca perche'.
      cambia: (id) => {
        const f = famiglia(id);
        setEffetto({ famiglia: id, param: { ...f.param }, durata: f.durata, seme: 1 });
      },
    },
  };

  /**
   * Cosa c'è sul piano, in una forma che `servizi/piano.js` sa leggere.
   *
   * Un oggetto solo, e non tre ternari sparsi fra le props: era li' che si era
   * persa la meta' della regola — «il piano e' vuoto quando non c'e' niente
   * sopra E non sta succedendo niente» — e con lei il tasto per fermare il
   * microfono.
   */
  const statoPiano = {
    tela: tela.length,
    clipVoce: voce.clip,
    registrandoVoce: voce.recording,
    effettoAperto,
    ritmo: effettiAudio.rhythm,
    registrandoRitmo: effettiAudio.recording,
    file,
    inColonna: batchFiles.length,
    risultati: batch.results.length,
  };

  /** La ricetta della voce: quella scelta nel punto oro più i filtri del tasto. */
  const ricettaVoce = fondiRicetta(
    baseVoce === 'neutra' ? NEUTRA : getRecipe(baseVoce),
    filtriVoce,
  );

  /** Il tasto imposta, non decide: si fonde con ciò che c'è già. */
  function applicaFiltriVoce(nuovi) {
    setFiltriDiPrima(filtriVoce);
    setFiltriVoce((v) => ({ ...v, ...nuovi }));
  }

  /**
   * Salva la VOCE registrata, non il suono lavorato.
   *
   * Richiesta del committente del 2026-09-05: oggi si registra, si esporta, e
   * la registrazione se ne va. Senza un archivio delle voci, qualunque cosa
   * venga dopo — varianti, cast, clonazione — non ha su cosa appoggiarsi.
   */
  async function salvaVoce() {
    const blob = voce.voceComeFile();
    if (!blob) return;
    await library.save(blob, {
      name: `voce-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`,
      kind: 'wav',
      // `op: 'voce'` distingue una VOCE da un effetto sonoro: è la differenza
      // che servirà per ritrovarle quando saranno tante.
      meta: { op: 'voce' },
    });
    setNotice(t('sound.saved'));
  }

  /**
   * La voce LAVORATA in libreria: la registrazione con i filtri addosso.
   *
   * Diversa da `salvaVoce`, che mette via la voce com'e' uscita dal
   * microfono. Sono due cose che si vogliono in due momenti diversi: la
   * seconda e' materia prima da riusare, questa e' il risultato.
   */
  async function salvaVoceLavorata() {
    const ricetta = fondiRicetta(baseVoce === 'neutra' ? NEUTRA : getRecipe(baseVoce), filtriVoce);
    const out = await voce.apply(ricetta);
    if (!out) return;
    await library.save(out.blob, {
      name: `voce-${baseVoce}`,
      kind: 'wav',
      meta: { op: 'sound', recipe: baseVoce },
    });
    setNotice(t('sound.save'));
  }

  /** Torna ai filtri di prima: il tasto imposta, e si puo' disfare. */
  function annullaFiltriVoce() {
    if (!filtriDiPrima) return;
    setFiltriVoce(filtriDiPrima);
    setFiltriDiPrima(null);
  }

  /** Un file dal computer: entra in libreria, e da lì sulla tela. */
  function portaFileInBrain() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept =
      'image/png,image/jpeg,image/svg+xml,audio/wav,audio/mpeg,video/mp4,video/webm,.md,.markdown,text/markdown';
    input.onchange = async () => {
      const scelti = [...input.files];
      if (scelti.length) await importaFile(scelti);
    };
    return input.click();
  }

  /** Un asset già in libreria, messo sulla tela dove c'è posto. */
  async function metiSullaTela(asset) {
    setSopraLaTela(null);
    await cambiaTela([...tela, nuovoAsset({ assetId: asset.id, ...prossimoPosto(tela) })]);
  }

  /** Torna alla tela di prima. Una mossa sola: vedi `telaDiPrima`. */
  async function annullaTela() {
    if (!telaDiPrima) return;
    const indietro = telaDiPrima;
    setTelaDiPrima(null);
    await cambiaTela(indietro, { ricordabile: false });
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
        if (item.kind === 'svg') setTool('vettorializza');
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

  /**
   * Scarica CIO' CHE C'E' SUL PIANO.
   *
   * Qui c'era `downloadAll`, che zippa la LIBRERIA: con la libreria vuota
   * rispondeva «libreria vuota» mentre sul piano c'erano tre risultati
   * pronti. Il commento sopra la riga diceva gia' la cosa giusta; il codice ne
   * faceva un'altra, ed e' il tipo di commento che questo progetto non vuole.
   *
   * Uno zip e non N scaricamenti: il browser blocca il secondo `a.click()` di
   * fila, quindi «scarica tutti» ne avrebbe consegnato uno.
   */
  async function scaricaIlPiano() {
    setError(null);
    // Un file solo passa dall'esportazione di sempre, che rispetta il formato
    // scelto: incartarlo in uno zip da solo sarebbe un passaggio in piu' per
    // niente.
    if (batch.results.length === 0) return runExport();

    setBusy(t('action.preparing'));
    try {
      const blob = await bundleBlobs(
        batch.results.map((r) => ({
          nome: `${r.file.name.replace(/\.[^.]+$/, '')}.png`,
          blob: r.blob,
        })),
      );
      api.download(own(blob), `zack-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (e) {
      console.error(e);
      setError(t('engine.error.body'));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Le anteprime dei file scelti, fatte UNA VOLTA.
   *
   * Prima l'URL nasceva dentro la `.map()` del render: uno nuovo a ogni
   * ridisegno, nessuno revocato, e ogni URL tiene in vita il blob a cui punta.
   * Tre file di stampa e una manciata di ridisegni sono decine di copie in
   * memoria.
   *
   * Sta QUI, sopra il `return` anticipato del motore: un hook dopo un `return`
   * condizionale gira in alcuni render e non in altri, e React si ferma con
   * «Rendered fewer hooks than expected».
   */
  const anteprime = useMemo(
    () => batchFiles.map((f) => ({ f, url: URL.createObjectURL(f) })),
    [batchFiles],
  );
  useEffect(() => () => anteprime.forEach((a) => URL.revokeObjectURL(a.url)), [anteprime]);

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

  const canExport = isEditor || Boolean(file);

  /**
   * Cio' che sta sul piano di lavoro, qualunque sia il servizio.
   *
   * Si chiama `suPiano` e non `tela` perche' `tela` e' gia' la lavagna di
   * Brain: due cose diverse con lo stesso nome nello stesso file.
   *
   * Estratta in una variabile perche' i servizi che passano dall'impianto la
   * mettono DENTRO `Piano`, e gli altri no: duplicarla sarebbe il modo piu'
   * rapido per farle prendere due strade diverse.
   */
  /**
   * Gli avanzati: un contenuto solo, due posti dove mostrarlo.
   *
   * Vivevano dentro la colonna di destra, e quando i servizi sono entrati
   * nell'impianto la colonna e' finita sotto un `display: none` — con dentro
   * blocco, ingrandimento, rifinitura ed esportazione. Quattro pannelli
   * spariti senza che niente si lamentasse.
   *
   * Ora sono una costante: l'impianto la apre dal cerchio piu' in basso,
   * l'editor (che l'impianto non ha) la tiene nella sua colonna. **Lo stesso
   * contenuto**, non due copie — due copie divergono al primo ritocco.
   */
  /*
   * Gli avanzati di BRAIN sono altri: sulla tela non c'è un file del piano,
   * quindi blocco, ingrandimento, rifinitura ed esportazione non hanno su
   * cosa lavorare. Qui ci sono i gesti che si fanno a lavoro finito —
   * portarsi via l'idea intera — e che il 2026-09-09 sono usciti dalla tela.
   */
  const avanzatiBrain = (
    <Advanced id="brain">
      <div className="field">
        <button className="btn ghost" disabled={tela.length === 0} onClick={faiPacco}>
          {t('brain.pacco')}
        </button>
        <Help k="brain.packHelp" />
      </div>
      <div className="field">
        <button className="btn ghost" disabled={tela.length === 0} onClick={fotografaLaTela}>
          {t('brain.foto')}
        </button>
      </div>
      {/* Riaprire un pacco sta accanto al tasto che li fa: chi ne ha uno lo
          cerca qui, non in un menu impostazioni. */}
      <label className="brain-riapri field">
        {t('brain.reopen')}
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={async (e) => {
            const f = e.target.files[0];
            e.target.value = '';
            if (f) await apriPacco(f);
          }}
        />
      </label>
    </Advanced>
  );

  const avanzati = (
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

          {!SENZA_FILE.has(tool) && file && (
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
  );

  const suPiano = (
batchFiles.length > 1 && batch.results.length === 0 ? (
      /* I file scelti, in colonna, PRIMA che il tasto li lavori: si vedono
         tutti e tre insieme — e' il senso di poterne portare tre. */
      <ul className="sc-colonna">
        {anteprime.map(({ f, url }) => (
          <li key={`${f.name}-${f.size}`}>
            {/* Togliere un file dalla colonna: prima si poteva solo
                ricominciare da capo, e con lui se ne andavano anche gli
                altri due. */}
            <button
              className="sc-togli"
              aria-label={t('bar.clear')}
              onClick={() => setBatchFiles((v) => v.filter((x) => x !== f))}
            >
              ×
            </button>
            <img src={url} alt="" aria-hidden="true" />
            <span>{f.name.replace(/\.[^.]+$/, '')}</span>
          </li>
        ))}
      </ul>
    ) : tool === 'scontorna' && batch.results.length > 0 && !brushOpen ? (
            /* Anche MENTRE gira: i risultati arrivano uno alla volta, e
               vederli comparire e' il modo piu' onesto di dire a che punto e'.
               Prima si aspettava `!batch.running`, e nel frattempo il piano
               tornava al riquadro vuoto — sembrava che il lavoro si fosse
               perso. */
            /* I risultati del blocco stanno sulla TELA, non in un elenco di
               francobolli nella colonna: l'errore del modello si vede per
               differenza guardandoli insieme, non aprendoli a uno a uno. */
            <BatchGrid
              results={batch.results}
              onFix={fixFromBatch}
              onRename={rinominaRisultato}
              onDownload={scaricaRisultato}
              onDownloadAll={null}
              onClose={() => {
                batch.clear();
                setBatchFiles([]);
              }}
            />
          ) : tool === 'brain' ? (
            <Brain
              ref={brainRef}
              items={tela}
              assets={library.assets}
              leggi={library.read}
              onChange={cambiaTela}
              onUse={assetAction}
              onSalvaDoc={salvaDocumento}
              onIcona={iconaDocumentoScelta}
              onScarica={scaricaAsset}
              /* Il gesto aperto arriva da fuori: il cerchio della freccia sta
                 nell'impianto, e il suo stato con lui. */
              collega={collegaBrain}
              onCollega={setCollegaBrain}
            />
          ) : tool === 'vocale' ? (
            <VoceLab
              sound={voce}
              descrizione={descrizioneVoce}
              onDescrizione={setDescrizioneVoce}
              /* Gia' fusa: la ricetta scelta nel punto oro piu' i filtri che
                 il tasto ha impostato dalla frase. */
              ricetta={ricettaVoce}
              onSalva={salvaVoceLavorata}
            />
          ) : tool === 'effetti' ? (
            <SoundLab
              effetto={effetto}
              onEffetto={setEffetto}
              ritmo={effettiAudio.rhythm?.onsets?.length ? effettiAudio.rhythm.onsets : null}
              registrando={effettiAudio.recording}
              errore={effettiAudio.error}
              onScordaRitmo={effettiAudio.reset}
              onFermaRitmo={effettiAudio.stop}
            />
          ) : isEditor ? (
            <SvgEditor
              ref={editorRef}
              /* Lo strumento acceso arriva da fuori: i cerchi ai fianchi sono
                 quelli, e la barra di parole dentro l'editor se n'e' andata. */
              modo={modoDisegno}
              onModo={setModoDisegno}
              onSelection={setSelCount}
              onRefuseNodes={() => setNotice(t('nodes.needPath'))}
            />
          ) : brushOpen && result?.kind === 'png' ? (
            <MaskBrush
              /* Cambiare strumento vuol dire ricominciare il gesto: il
                 pennello si rimonta, e rilegge `modoIniziale`. Senza questa
                 riga premere il righello accendeva il cerchio e lasciava la
                 gomma — `useState` guarda il valore solo al montaggio. */
              key={modoPennello}
              source={file}
              cutout={result.blob}
              modoIniziale={modoPennello}
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
        {/* Il nome del prodotto e' uscito dalla striscia il 2026-08-31: in
            cima ci sta UNA cosa sola, il logo del servizio in uso, e sta in
            mezzo. Il nome lo porta gia' la scheda del browser. */}
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

      {/*
       * I quattordici giorni si DICONO, ogni giorno, in una riga.
       *
       * Chi e' in prova lavora: non e' un muro, e non deve fermare niente. Ma
       * una prova che finisce senza preavviso e' una porta chiusa in faccia —
       * apri lo studio una mattina e non funziona piu', senza aver visto
       * arrivare niente. Sta qui sotto la striscia e non sul muro, perche' sul
       * muro ci finisce quando e' troppo tardi.
       */}
      {statoConto === 'prova' &&
        (() => {
          const giorni = giorniAllaProva(licenza);
          return (
            <p className="avviso-prova">
              {giorni <= 1 ? t('muro.provaUltimo') : t('muro.provaResta', { giorni })}
            </p>
          );
        })()}

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
          {/* Lo scaricamento si vede SEMPRE: `bannerOpen` serve a chiudere
              l'avviso della modalita' lenta, e chi l'ha chiuso una volta non
              ha chiesto di non sapere piu' quando stanno arrivando 176 MB. */}
          {(engine.phase === 'downloading' || bannerOpen) && engine.ready && (
            <EngineBanner
              tier={engine.tier}
              phase={engine.phase}
              progress={engine.scarico?.frazione != null ? engine.scarico.frazione * 100 : undefined}
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
          {!isEditor && !DESCRITTORI[tool] && (
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
                /*
                 * Il ritaglio vive negli avanzati: si aprono, e ci si porta.
                 *
                 * Il pannello ora sta in DUE posti — nell'impianto quando il
                 * cerchio lo apre, nella colonna per l'editor — quindi si
                 * cerca ovunque invece che dentro `.rail`: legato alla colonna
                 * il collegamento moriva in silenzio su ogni servizio entrato
                 * nell'impianto. Si preme e non succede niente e' peggio di un
                 * comando spento.
                 */
                setSopraLaTela('avanzati');
                const testa = document.querySelector('.avanzati-head');
                if (testa?.getAttribute('aria-expanded') !== 'true') testa?.click();
                requestAnimationFrame(() => {
                  document
                    .querySelector('.sect[data-id="crop"]')
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
          {/* Chi ha un descrittore passa dall'impianto. La lista non si
              scrive a mano: e' la stessa domanda a cui risponde `servizi/`,
              e due risposte alla stessa domanda divergono al primo servizio
              nuovo. */}
          {chiuso ? (
            /*
             * Il muro sta DENTRO `.stage`, non intorno a `.shell`: fuori
             * chiuderebbe anche la striscia e la libreria, che e' esattamente
             * cio' che la spec § 3.5 vieta — la libreria non si chiude mai, e
             * un test legge questo file per assicurarsene.
             */
            <Muro
              stato={statoConto}
              onEntra={entraConEmail}
              onGoogle={entraConGoogle}
              onAbbona={() => setNotice(t('muro.abbonatiPresto'))}
            />
          ) : DESCRITTORI[tool] ? (
            <Piano
              servizio={getDescrittore(tool)}
              /* Vuoto vuol dire NIENTE sul piano: ne' un file solo, ne' la
                 colonna dei tre scelti, ne' i risultati. Senza i tre scelti
                 il `+` restava in mezzo e la colonna non si vedeva mai. */
              vuoto={pianoVuoto(tool, statoPiano)}
              ricetta={ricetta}
              piano={stats?.image ? pianoZack(ricetta, stats.image) : null}
              /* Su Brain «quanti» sono gli oggetti sulla tela: da uno in su il
                 `+` piccolo resta in alto a sinistra, e il tetto è 99, cioè
                 non c'è. La croce no: si toglie l'oggetto scelto, non la
                 tela — quello lo fa `onTogli`, che qui è nullo. */
              quanti={quantiSulPiano(tool, statoPiano)}
              /* Il lavoro in corso, detto. Col file singolo lo dice gia' il
                 confronto; con la colonna non lo diceva nessuno. */
              lavoro={
                batch.running
                  ? {
                      testo: t('batch.progress', {
                        done: batch.summary.done + batch.summary.failed,
                        total: batch.summary.total,
                      }),
                      nota: batch.eta != null ? t('batch.eta', { sec: batch.eta }) : engine.phase,
                    }
                  : null
              }
              busy={Boolean(busy)}
              models={engine.models}
              modello={s.model}
              onModello={(id) => set({ model: id })}
              /* Su una tela non si «aggiunge un file»: si sceglie cosa
                 mettere. Il `+` apre il menu che il descrittore dichiara. */
              onPick={
                getDescrittore(tool).accetta.menu
                  ? () => {
                      setSopraLaTela(null);
                      setMenuPiu(true);
                    }
                  : scegliFile
              }
              menu={menuPiu}
              /* Il parametro si chiama `quale` e non `voce`: `voce` è il
                 registratore del Vocale, e come nome di parametro lo copriva
                 dentro questo blocco. */
              onMenu={(quale) => {
                if (tool === 'vocale') return menuVocale(quale);
                if (tool === 'effetti') return menuEffetti(quale);
                setMenuPiu(false);
                // Dal computer: entra in libreria e finisce sulla tela.
                if (quale === 'computer') return portaFileInBrain();
                // Dalla libreria: un pannello che si apre, si sceglie, si
                // chiude. Era un cassetto FISSO a sinistra della tela — e la
                // tela di Brain dev'essere vuota.
                if (quale === 'libreria') return setSopraLaTela('libreria');
                // `prossimoPosto` sa dove c'è spazio: due note nate insieme
                // non devono nascere una sopra l'altra.
                const dove = prossimoPosto(tela);
                return cambiaTela([
                  ...tela,
                  quale === 'gruppo' ? nuovoCerchio({ ...dove }) : nuovaNota({ ...dove }),
                ]);
              }}
              /* Gli avanzati, quando il cerchio li apre. Lo stesso contenuto
                 della colonna: non una seconda copia, la stessa. */
              pannello={
                sopraLaTela === 'libreria' ? (
                  <ScegliAsset
                    assets={library.assets.filter((a) => !tela.some((o) => o.assetId === a.id))}
                    tuttiSulPiano={library.assets.length > 0}
                    onScegli={metiSullaTela}
                    onChiudi={() => setSopraLaTela(null)}
                  />
                ) : sopraLaTela === 'tutorial' ? (
                  <Tutorial onChiudi={() => setSopraLaTela(null)} />
                ) : sopraLaTela === 'avanzati' ? (
                  tool === 'brain' ? avanzatiBrain : avanzati
                ) : null
              }
              inCorso={statoDelPiano(tool, statoPiano).inCorso}
              opzione={OPZIONE[tool]?.valore ?? regolaRiordino}
              onOpzione={OPZIONE[tool]?.cambia ?? setRegolaRiordino}
              /* Togliere il file singolo: senza conferma, perche' e' un
                 gesto piccolo e reversibile — il file sta ancora sul disco
                 dell'utente, e il `+` e' li' accanto. */
              /* Brain non ha una croce: la tela non è «un file sul piano»,
                 e una croce che svuota tutto in un clic, senza conferma,
                 sarebbe il gesto più distruttivo dell'app. Ogni oggetto ha
                 già la sua. */
              onTogli={
                tool === 'brain'
                  ? null
                  : tool === 'vocale'
                      ? voce.reset
                      : tool === 'effetti'
                        ? () => {
                            effettiAudio.reset();
                            setEffettoAperto(false);
                          }
                        : reset
              }
              /* Il rilascio segue lo stesso instradamento del `+`: se no il
                 trascinamento di una clip su Filmato finirebbe nel percorso
                 delle immagini, che la rifiuta in silenzio — il `+` funziona
                 e il trascinamento no, sulla stessa schermata. */
              onFile={(f) => accettaFile([f], { aggiungi: true })}
              onFiles={(files) => accettaFile(files, { aggiungi: true })}
              onZack={() => {
                if (tool === 'effetti') {
                  // Il tasto SUONA: e' cio' che si vuole da un effetto, e
                  // premerlo di nuovo lo risuona senza cambiarlo — lo stesso
                  // seme da' sempre lo stesso suono.
                  effettiAudio.suona(costruisciEffetto(), SR);
                  return;
                }
                if (tool === 'vocale') {
                  const letto = leggiDescrizione(descrizioneVoce);
                  if (letto.capito.length === 0) {
                    // Non tocca NIENTE: un tasto che indovina su una parola
                    // che non conosce insegna a non fidarsi del prossimo
                    // risultato.
                    setNotice(t('sound.nienteCapito'));
                    return;
                  }
                  applicaFiltriVoce(letto.filtri);
                  // Si dice sempre cosa si e' capito E cosa no: il tasto
                  // imposta, non decide, e l'utente deve poter correggere.
                  const detto = [t('sound.capito', { parole: letto.capito.join(', ') })];
                  if (letto.nonCapito.length > 0) {
                    detto.push(t('sound.nonCapito', { parole: letto.nonCapito.join(', ') }));
                  }
                  for (const [a, b] of letto.contraddizioni) {
                    detto.push(t('sound.contraddizione', { a, b }));
                  }
                  setNotice(detto.join(' '));
                  return;
                }
                if (tool === 'brain') {
                  // Deterministico: premere due volte da' lo stesso
                  // risultato, e ripremerlo non muove piu' niente. Lo
                  // difendono i test di `engine/riordina.js`.
                  cambiaTela(riordina(tela, regolaRiordino));
                  return;
                }
                // Con la colonna piena il tasto fa TUTTI i file: e' la stessa
                // promessa del tasto della home, applicata a tre invece che a
                // uno. I passi che il blocco sa fare sono lo scontorno e
                // l'ingrandimento; gli altri restano al file singolo.
                if (batchFiles.length > 1) {
                  // Una catena che non contiene niente che il blocco sappia
                  // fare non deve restare in silenzio: si premeva il tasto e
                  // non succedeva nulla, che e' indistinguibile da un guasto.
                  if (!ricetta.includes('scontorna') && !ricetta.includes('ingrandisci')) {
                    setNotice(t('zack.empty'));
                    return;
                  }
                  batch.run(batchFiles, {
                    cutout: ricetta.includes('scontorna'),
                    upscale: ricetta.includes('ingrandisci'),
                    vector: false,
                    exportPresets: [],
                  });
                  return;
                }
                runZack();
              }}
              onRicetta={salvaRicetta}
              /* Il tasto in alto a destra scarica CIO' CHE C'E': i tre file
                 della colonna se il blocco e' finito, il file singolo se il
                 piano ne ha uno solo. Sono lo stesso gesto. */
              onScarica={scaricaIlPiano}
              puoiScaricare={batch.results.length > 0 || canExport}
              strumenti={(() => {
                /*
                 * Il descrittore dice QUALI cerchi e QUANDO; qui si dice cosa
                 * fanno. La separazione non e' cerimonia: la prima meta' e'
                 * dati e vive in Node dove i test la vedono, la seconda sono
                 * chiusure sullo stato di React e non ci puo' vivere.
                 *
                 * I pennelli aprono GIA' sul loro strumento: sceglierlo due
                 * volte sarebbe premerlo due volte per la stessa cosa.
                 */
                const GESTI = {
                  righello: () => apriPennello('righello'),
                  restore: () => apriPennello('restore'),
                  erase: () => apriPennello('erase'),
                  undo: undoResult,
                  swap: swapFile,
                  freccia: () => setCollegaBrain((v) => (v ? null : { da: null })),
                  riascolta: voce.riascolta,
                  unAltro: () => setEffetto((e) => ({ ...e, seme: e.seme + 1 })),
                  ritmo: () => (effettiAudio.recording ? effettiAudio.stop() : effettiAudio.start()),
                  salvaEffetto,
                  pulisci: () => set({ clean: !s.clean }),
                  apriEditor: sendToEditor,
                  avanzati: () => setSopraLaTela((v) => (v === 'avanzati' ? null : 'avanzati')),
                  centra: () => brainRef.current?.centra(),
                  tutorial: () => setSopraLaTela((v) => (v === 'tutorial' ? null : 'tutorial')),
                  /*
                   * Gli otto strumenti di disegno: il cerchio accende il modo,
                   * e l'editor lo esegue. Un `id` solo per tutt'e due — quello
                   * che `SvgEditor` usa gia' — cosi' non c'e' una tabella di
                   * traduzione in mezzo che si puo' sfasare.
                   */
                  ...Object.fromEntries(
                    ['select', 'path', 'fhpath', 'line', 'rect', 'ellipse', 'text', 'pathedit'].map(
                      (m) => [m, () => setModoDisegno(m)],
                    ),
                  ),
                  salvaVoce,
                  /*
                   * «Annulla» vuol dire cose diverse su servizi diversi, e va
                   * bene: e' lo stesso gesto — torna indietro di una mossa —
                   * su oggetti diversi. Su Brain la tela, sul Vocale i filtri
                   * che il tasto ha appena impostato.
                   */
                  annulla: tool === 'vocale' ? annullaFiltriVoce : annullaTela,
                };
                const acceso = {
                  righello: brushOpen && modoPennello === 'righello',
                  restore: brushOpen && modoPennello === 'restore',
                  erase: brushOpen && modoPennello === 'erase',
                  freccia: Boolean(collegaBrain),
                  ritmo: effettiAudio.recording,
                  tutorial: sopraLaTela === 'tutorial',
                  [modoDisegno]: isEditor,
                  pulisci: s.clean,
                  avanzati: sopraLaTela === 'avanzati',
                };
                /*
                 * Cosa vuol dire «c'e' qualcosa sul piano» cambia col
                 * servizio: un file per lo scontorno, una clip per il
                 * filmato, DUE oggetti per Brain — una freccia ne collega
                 * due, e con uno solo il cerchio sarebbe li' acceso a non
                 * fare niente.
                 */
                /*
                 * Brain e' l'unico con una soglia sua: una freccia collega DUE
                 * oggetti, e con uno solo il cerchio sarebbe li' acceso a non
                 * fare niente. Gli altri seguono la regola comune, invece di
                 * riscriverla — riscriverla e' come si e' persa.
                 */
                const pieno =
                  tool === 'brain'
                    ? tela.filter((o) => o.t !== 'freccia').length >= 2
                    : /*
                         * `contenuto`, non `!vuoto`: gli strumenti lavorano su
                         * quello che C'E', non su quello che STA SUCCEDENDO.
                         * Mentre il microfono e' acceso il piano non e' vuoto —
                         * o il tasto Ferma non si disegnerebbe — ma non c'e'
                         * ancora niente su cui premere «Ascolta».
                         */
                        statoDelPiano(tool, statoPiano).contenuto;
                /*
                 * «C'e' un risultato» vuol dire cose diverse: per lo
                 * scontorno un PNG — i pennelli non hanno su cosa lavorare
                 * altrimenti — e per il vettoriale un SVG. Con la sola
                 * condizione del PNG, «apri nell'editor» non sarebbe comparso
                 * MAI: un cerchio dichiarato, un gesto scritto, e nessun modo
                 * di arrivarci.
                 */
                const uscita = tool === 'vettorializza' ? 'svg' : 'png';
                return strumentiVisibili(getDescrittore(tool), {
                  file: pieno,
                  risultato: result?.kind === uscita,
                  /* Il parametro si chiama `str` e non `s`: `s` sono le
                     impostazioni, e qui dentro le coprirebbe. E' lo stesso
                     inciampo di `voce` in `onMenu`, un'ora fa. */
                }).map((str) => ({
                  id: str.id,
                  icon: str.icon,
                  lato: str.lato,
                  label: t(str.label),
                  active: acceso[str.id] || undefined,
                  // L'annulla si spegne anche senza cronologia: premerlo
                  // quando non c'e' niente da annullare non fa niente, e un
                  // comando acceso che non fa niente e' un comando rotto.
                  disabled:
                    Boolean(busy) ||
                    (str.id === 'undo' && history.length === 0) ||
                    (str.id === 'annulla' && !(tool === 'vocale' ? filtriDiPrima : telaDiPrima)) ||
                    // I nodi non hanno cosa modificare finche' non e' scelto un
                    // tracciato: acceso, sarebbe un comando che non risponde.
                    (str.id === 'pathedit' && selCount === 0),
                  onClick: GESTI[str.id],
                }));
              })()}
            >
              {suPiano}
            </Piano>
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
          data-vuota={Boolean(DESCRITTORI[tool]) || undefined}
        >
          {/* Brain non ha comandi in colonna: i suoi stanno sulla tela, dove
              si guarda. Una colonna di comandi spenti accanto a una lavagna è
              esattamente il rumore che la regola §6.1 vuole togliere. */}
          {DESCRITTORI[tool] ? null : isEditor ? (
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

              {/* L'editor e' l'unico rimasto senza impianto, quindi e' l'unico
                  che tiene ancora gli avanzati in colonna. */}
              {avanzati}
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
          ) : null}

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

      {/* La libreria non compare nello scontorno: il piano e' vuoto, e
          «scarica tutto» e' diventato l'icona in alto a destra. Resta in
          tutti gli altri servizi, dove il lavoro si accumula. */}
      {/*
        ⚠️ **La libreria si vede anche col muro alzato** (spec § 3.5): chi non
        ha pagato deve poter guardare e scaricare i propri file. Un prodotto
        che li tiene in ostaggio non e' un prodotto.

        E fin qui era `!DESCRITTORI[tool]`, cioe' «solo nei servizi fuori
        dall'impianto» — che dal 2026-09-09 non sono piu' nessuno: entrati
        tutti e cinque, la libreria era diventata IRRAGGIUNGIBILE da qualunque
        schermata. Trovato mettendo il muro, non riferito da nessuno.
      */}
      {(chiuso || !DESCRITTORI[tool]) && (
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
      )}

      {!DESCRITTORI[tool] && <footer className="statusbar">
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
      </footer>}
    </div>
  );
}
