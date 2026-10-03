import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { FATTORI, PASSI, commutaFattore, commutaPasso } from '../engine/ricette.js';
import { postoDelPiu, mostraMascotte, cerchiPerLato } from '../servizi/pelle.js';
import Icon from './Icon.jsx';

/**
 * Lo scontorno nello studio, rifatto sul disegno del committente (2026-08-31).
 *
 * È la stessa schermata della home, con lo studio dietro. Il principio è che
 * **il piano di lavoro è vuoto**: niente barra dei comandi sopra la tela,
 * niente pannello della qualità di fianco, niente due pulsanti in fondo. Ci
 * sono quattro cose sole, e stanno agli angoli:
 *
 * - il `+` grande in mezzo, che è il gesto con cui si comincia;
 * - il **tasto Zack** in basso a destra, sopra la fila dei servizi: è lui che
 *   fa il lavoro, e la catena la decide il punto oro;
 * - la **mascotte** in basso a sinistra, ferma, accanto al tasto — finché il
 *   piano è vuoto: `mostraMascotte` decide quando c'è;
 * - gli **strumenti a destra**, cerchi in colonna, che compaiono *dopo* —
 *   quando c'è qualcosa da correggere. Prima non ci sarebbe niente da fare.
 *   **Scarica** (Task 7) è tornato dall'angolo in alto a destra a essere uno
 *   di questi cerchi: lo stesso gesto, un posto solo.
 *
 * La scelta del modello è finita dentro il punto oro insieme alla catena: sono
 * tutt'e due «come deve comportarsi il tasto», e in mezzo allo schermo erano
 * un pannello da leggere prima di poter premere qualcosa. Qui sono due: rapido
 * e qualità. Il terzo (illustrazioni) resta nel motore, non nella scelta.
 */

/**
 * I simboli dei fattori, gli stessi della home.
 *
 * Il committente il 2026-09-04: «il tasto zack non ha le stesse opzioni della
 * home (x2 X4 ecc)». Erano già esposti da `ricette.js`, già pianificati da
 * `pianoZack` e già eseguiti da `runZack`: mancava solo il modo di accenderli.
 * Restano simboli e non parole perché sono quattro e devono stare su una riga.
 */
const SIMBOLO = { x4: '×4', x2: '×2', d2: ':2', d4: ':4' };

export default function Piano({
  /** Il descrittore del servizio aperto: dice claim, modelli e fattori. */
  servizio,
  vuoto,
  ricetta,
  piano,
  /** Quanti file ci sono sul piano: con piu' di uno il tasto li fa tutti. */
  quanti,
  /** Toglie dal piano il file singolo. Nella colonna ogni file ha la sua. */
  onTogli,
  busy,
  models,
  modello,
  strumenti,
  lavoro,
  onPick,
  onFile,
  onFiles,
  onZack,
  onRicetta,
  onModello,
  /** Il menu del `+`, aperto: un momento, non uno stato del prodotto. */
  menu,
  onMenu,
  /** Le scelte del punto oro, un valore per gruppo: `{ [gruppo]: idScelto }`. */
  scelte,
  onScelta,
  /** Il pannello aperto sopra la tela: gli avanzati, quando c'è qualcosa. */
  pannello,
  /** Sta succedendo qualcosa che l'utente deve poter fermare (una registrazione). */
  inCorso,
  children,
}) {
  const [aperto, setAperto] = useState(false);
  const [sopra, setSopra] = useState(false);
  const box = useRef(null);

  // Un pannello aperto mentre si lavora altrove copre la tela: si chiude da
  // solo cliccando fuori o con Esc. È la stessa regola del tasto di prima.
  useEffect(() => {
    if (!aperto) return undefined;
    const fuori = (e) => {
      if (box.current && !box.current.contains(e.target)) setAperto(false);
    };
    const esc = (e) => e.key === 'Escape' && setAperto(false);
    document.addEventListener('pointerdown', fuori);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fuori);
      document.removeEventListener('keydown', esc);
    };
  }, [aperto]);

  const vuota = !piano || piano.passi.length === 0;
  // Quali modelli offre QUESTO servizio: lo scontorno ne ha due, il filmato
  // nessuno. Prima era una costante nel file, cioe' una regola dello
  // scontorno scritta dentro il pezzo che dovrebbe valere per tutti.
  const offerti = models.filter((m) => servizio.tasto.modelli.includes(m.id));

  /* Dove sta il `+`, e se la mascotte c'è: due decisioni che vivevano dentro
     i ternari di questo JSX, cioè dove nessun test poteva vederle. */
  const posto = postoDelPiu(servizio.id, { quanti, tetto: servizio.accetta.quanti });

  /* Quanti cerchi per fianco: il palco li conta per farsi alto quanto la
     sua colonna più lunga (`min-height` di `.sc` in styles.css). */
  const cerchi = cerchiPerLato(strumenti);

  return (
    <div
      className="sc"
      /* Il piano resta una zona di rilascio: prima lo era il riquadro
         tratteggiato, che il disegno del committente ha tolto. Toglierlo
         SENZA rimettere il rilascio qui significherebbe che nell'app non si
         puo' piu' trascinare un file dentro. */
      onDragOver={(e) => {
        e.preventDefault();
        setSopra(true);
      }}
      onDragLeave={() => setSopra(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSopra(false);
        // Tre in una volta anche trascinandoli: se il `+` ne prende tre, il
        // trascinamento non puo' prenderne uno.
        onFiles([...e.dataTransfer.files]);
      }}
      data-sopra={sopra || undefined}
      /* Senza tasto (Brain, 5b) lo spazio che `.sc` gli riservava in fondo
         torna alla tela. */
      data-senza-tasto={servizio.tasto.nascosto || undefined}
      style={{ '--colonna-sinistra': cerchi.sinistra, '--colonna-destra': cerchi.destra }}
      /* Le colonne degli strumenti sono sovrapposte, non affiancate: senza
         dirlo alla tela, su 390 px coprirebbero 44 px di lavoro per lato.
         Contratto § 7.2: «la tela resta grande — 390 − 44 − 44 = 302». */
      data-fianchi={
        strumenti.some((x) => x.lato === 'sinistra')
          ? 'due'
          : strumenti.length > 0
            ? 'uno'
            : undefined
      }
    >
      {/*
        Col piano gia' occupato, il `+` e la croce restano — piccoli, a
        sinistra del file, dove non c'e' nient'altro.

        E' il contratto UX §5, che diceva gia' tutt'e due e non era rispettato
        (segnalato dal committente il 2026-09-05): «il `+` si vede con 1 o 2,
        sparisce al terzo» e «l'iconcina dentro ogni riquadro porta via quello
        solo». Il codice mostrava il `+` SOLO a piano vuoto, e la croce solo
        dalla colonna da due in su: con un file solo non c'era modo ne' di
        aggiungerne un altro ne' di toglierlo, se non ricominciando.

        `posto` (Task 7, `pelle.js`) decide DOVE sta il +, non se l'angolo
        c'è: sono due domande diverse, e confonderle è stato un Critico della
        revisione (Giro di correzioni 1). Con `quanti === tetto` (es. UN file
        su un servizio che ne accetta uno solo) `posto` torna `null` — il `+`
        non serve più, è al tetto — ma la × per togliere quel file resta
        viva: era lei sola a mancare, con `onTogli` cablato e nessun'altra
        strada nel codice per svuotare il piano. L'angolo quindi si monta
        quando c'è ALMENO UNA delle due cose da mostrarci; le due guardie
        interne restano indipendenti e decidono ciascuna il suo pezzo.
      */}
      {(posto === 'sinistra' || (quanti === 1 && onTogli)) && (
        <div className="sc-angolo" data-posto="sinistra">
          {posto === 'sinistra' && (
            <button
              className="sc-piu-piccolo"
              onClick={onPick}
              title={t('drop.title')}
              aria-label={t('drop.title')}
            >
              +
            </button>
          )}
          {quanti === 1 && onTogli && (
            <button
              className="sc-piu-piccolo"
              onClick={onTogli}
              title={t('bar.clear')}
              aria-label={t('bar.clear')}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Il menu del `+`, per i servizi che non prendono un file ma una
          scelta: su una tela non si «aggiunge un file», si sceglie cosa
          mettere. E' un MOMENTO e non uno stato — si apre, si sceglie, e non
          resta niente aperto — come l'ovale del punto oro. */}
      {menu && servizio.accetta.menu && (
        <div className="sc-menu" role="menu">
          {servizio.accetta.menu.map((voce) => (
            <button key={voce} role="menuitem" className="pastiglia" onClick={() => onMenu(voce)}>
              {t(`menu.${voce}`)}
            </button>
          ))}
        </div>
      )}

      {/* La tela. Vuota c'è il `+` e basta: è il gesto con cui si comincia, ed
          è grande perché intorno non c'è nient'altro.

          `vuoto` e non `posto === 'centro'`: sono due domande diverse, e
          scambiarle è stato un Critico della revisione (Giro di correzioni 1,
          `src/servizi/piano.js:56-62`). `postoDelPiu` conta i FILE — su
          Immagine i riferimenti, sul Vettoriale i file portati dentro — e con
          zero di quelli torna `'centro'` anche se la tela NON è vuota: per
          Immagine è il prompt (col Preventivo e i riferimenti scelti), per il
          Vettoriale è il foglio da disegno con gli otto strumenti già accesi
          sopra. Montare lì il `+` grande al posto di `children` smontava
          quella schermata per intero — lo stesso guasto del righello.
          `vuoto` (`pianoVuoto`, `piano.js`) è la prop che c'è da sempre e
          risponde alla domanda giusta: «c'è qualcosa sopra il piano, o sta
          succedendo qualcosa?». */}
      <div className="sc-tela">
        {vuoto ? (
          <div className="sc-vuoto">
            <button className="sc-piu" onClick={onPick} aria-label={t('drop.title')}>
              +
            </button>
            {/* La stessa frase della home, sotto il `+`: chi entra dallo
                studio deve leggere la stessa promessa di chi entra dalla
                home, o sono due prodotti. */}
            <p className="sc-claim">{t(servizio.claim)}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Mentre il tasto lavora si DICE che sta lavorando, e a che punto e'.
          Senza, tre file in coda erano otto secondi di schermo immobile — e
          uno schermo immobile e' indistinguibile da uno rotto. */}
      {lavoro && (
        <div className="sc-attesa" role="status">
          <svg className="piuma" viewBox="0 0 200 60" aria-hidden="true">
            <path
              d="M6 42 C 30 12, 56 12, 76 34 S 122 56, 142 30 S 182 8, 194 26"
              fill="none"
              stroke="#c4a35a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <p>{lavoro.testo}</p>
          {lavoro.nota && <small>{lavoro.nota}</small>}
        </div>
      )}

      {/* Gli strumenti compaiono DOPO il risultato, in colonna ai fianchi, e
          sono cerchi: il nome ruba larghezza alla tela in ogni schermata, e
          qui la tela è il lavoro. Il nome resta nel `title`.

          Due colonne e non una: il contratto § 7.2 le chiede per il
          Vettoriale, che di strumenti ne ha troppi per un fianco solo. Chi
          non dichiara un lato sta a destra, che è dov'erano tutti. */}
      {['sinistra', 'destra'].map((lato) => {
        const quelli = strumenti.filter((s) => (s.lato || 'destra') === lato);
        if (quelli.length === 0) return null;
        return (
          <div className="sc-strumenti" data-lato={lato} key={lato}>
            {quelli.map((s) => (
              <button
                key={s.id}
                className="sc-strumento"
                data-strumento={s.id}
                /* La pool di Brain è anche un bersaglio (5b): un file della
                   tela posato lì torna nell'archivio, cioè esce dalla tela. */
                data-bersaglio={s.id === 'pool' ? 'pool' : undefined}
                aria-pressed={s.active || undefined}
                aria-label={s.label}
                title={s.label}
                disabled={s.disabled}
                onClick={s.onClick}
              >
                <Icon name={s.icon} />
              </button>
            ))}
          </div>
        );
      })}

      {/* Il pannello degli avanzati, sopra la tela.

          § 5.4 toglie dalla colonna blocco, ingrandimento, rifinitura ed
          esportazione, e § 7.2 dice dove vanno: qui. Quando i servizi sono
          entrati nell'impianto la colonna e' sparita con dentro tutto — un
          `display: none` che si portava via quattro pannelli senza dirlo.
          Sopra la tela e non di fianco, perche' di fianco vorrebbe dire
          rimettere la colonna. */}
      {pannello && <div className="sc-pannello">{pannello}</div>}

      {/* In basso: la mascotte a sinistra, il tasto a destra. Sopra la fila
          dei servizi, che sta sotto di loro.

          `mostraMascotte` (Task 5, `pelle.js`): c'è finché il piano è vuoto,
          e solo sui servizi che hanno uno stato vuoto — non su Brain, dove
          la tela vuota è il punto di partenza e non un'attesa. */}
      {mostraMascotte(servizio.id, { quanti }) && (
        <img
          className="sc-zack"
          src="/zack/zack-disegna.webp"
          srcSet="/zack/zack-disegna-360.webp 360w, /zack/zack-disegna.webp 720w"
          sizes="150px"
          alt=""
          aria-hidden="true"
          width="720"
          height="720"
        />
      )}

      {/* Brain non ha il tasto Zack (B1, fase 5b): lì non si genera niente,
          si organizza. Il gesto che fa partire il lavoro è trascinare un file
          su un servizio. */}
      {!servizio.tasto.nascosto && (
        <div className="sc-tasto" ref={box}>
          <button
            className="zack-oval"
            aria-label={t('zack.label')}
            title={servizio.tasto.azione === 'catena' && vuota ? t('zack.empty') : t('zack.title')}
            /* Col piano vuoto il tasto NON e' spento: e' il secondo modo di
               cominciare, insieme al `+`. Si spegne solo quando c'e' un file e
               la catena e' vuota — li' non c'e' niente da fare. */
            /* La catena vuota spegne il tasto solo di chi HA una catena: su
               Brain `piano` e' sempre nullo — non c'e' un'immagine da
               misurare — e questa riga l'avrebbe spento per sempre. */
            /* Spento anche mentre qualcosa e' in corso: durante una
               registrazione l'unica cosa da fare e' fermarla, e un tasto Zack
               premibile li' e' un secondo comando che compete con l'unico. */
            /*
               `quanti > 0` e non `!vuoto`: erano la stessa cosa finche' «piano
               non vuoto» voleva dire «c'e' un file». Sul vettoriale non lo vuol
               piu' dire — la sua tela e' sempre li' — e la regola spegneva il
               tasto all'apertura, con niente da tracciare e niente da fare.
               La regola vera e': c'e' UN file, e la catena e' vuota. */
            disabled={
              busy ||
              inCorso ||
              (servizio.tasto.azione === 'catena' && quanti > 0 && quanti <= 1 && vuota)
            }
            /* Col piano ancora vuoto il tasto e' il secondo modo di cominciare,
               insieme al `+`: porta dentro un file invece di lavorare a vuoto. */
            onClick={quanti === 0 && servizio.accetta.file ? onPick : onZack}
          >
            <img
              src="/zack/tasto-zack.webp"
              srcSet="/zack/tasto-zack-600.webp 600w, /zack/tasto-zack.webp 1200w"
              sizes="300px"
              alt=""
              width="1200"
              height="670"
            />
          </button>

          {/* Il punto oro: alla destra dell'ovale e in alto, senza toccarlo —
              la stessa posizione della home, misurata sull'immagine. */}
          <button
            className="punto-oro"
            aria-expanded={aperto}
            aria-label={t('zack.what')}
            onClick={() => setAperto((v) => !v)}
          >
            <i />
          </button>

          {aperto && (
            <div className="sc-tuo">
              <p>{t('zack.title')}</p>

              {/* Un servizio che non offre modelli non deve mostrare il
                  riquadro vuoto dove starebbero: un gruppo senza pastiglie e'
                  un comando che non si puo' premere. */}
              {offerti.length > 0 && (
                <div className="sc-modelli" role="group" aria-label={t('control.quality.label')}>
                  {offerti.map((m) => (
                    <button
                      key={m.id}
                      className="pastiglia"
                      aria-pressed={modello === m.id}
                      title={m.id}
                      onClick={() => onModello(m.id)}
                    >
                      {t(m.labelKey)}
                    </button>
                  ))}
                </div>
              )}

              {/* I quattro fattori, gli stessi della home. Stanno fra i modelli
                  e la catena perche' rispondono alla seconda domanda del tasto:
                  con quale modello, quanto grande, e poi cosa fare. Un filmato
                  non si ingrandisce col modello, quindi li' non ci sono. */}
              {servizio.tasto.fattori && (
                <div className="sc-fattori" role="group" aria-label={t('zack.resize')}>
                  {Object.keys(FATTORI).map((chiave) => (
                    <button
                      key={chiave}
                      className="pastiglia"
                      aria-pressed={ricetta.includes(`ridimensiona:${chiave}`)}
                      title={t(`zack.stepHelp.ridimensiona:${chiave}`)}
                      onClick={() => onRicetta(commutaFattore(ricetta, chiave))}
                    >
                      {SIMBOLO[chiave]}
                    </button>
                  ))}
                </div>
              )}

              {/* La catena e' dello scontorno e di chi gli somiglia. Su Brain
                  «Scontorna · Ingrandisci · Vettorializza» sarebbero tre
                  pastiglie che non toccano niente: il tasto li' riordina. */}
              {servizio.tasto.azione === 'catena' && (
                <div className="sc-catena">
                  {(servizio.tasto.passi || PASSI).map((passo) => {
                    const acceso = ricetta.includes(passo);
                    return (
                      <button
                        key={passo}
                        className="pastiglia"
                        aria-pressed={acceso}
                        title={t(`zack.stepHelp.${passo}`)}
                        onClick={() => onRicetta(commutaPasso(ricetta, passo))}
                      >
                        {t(`zack.step.${passo}`)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Le scelte del tasto, un gruppo per domanda: su Brain la regola
                  di riordino, su Immagine la misura e il formato. Rispondono
                  tutte alla stessa domanda del punto oro — «cosa farà quando lo
                  premo» — quindi stanno dove sta già quella risposta. */}
              {(servizio.tasto.gruppi || []).map((g) => (
                <div className="sc-fattori" role="group" aria-label={t(g.label)} key={g.id}>
                  {g.opzioni.map((o) => (
                    <button
                      key={o.id}
                      className="pastiglia"
                      aria-pressed={(scelte?.[g.id] ?? g.predefinita) === o.id}
                      onClick={() => onScelta(g.id, o.id)}
                    >
                      {t(o.label)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
