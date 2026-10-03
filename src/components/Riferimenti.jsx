import { useState } from 'react';
import { limitiDi } from '../engine/listino.js';
import { dividiPerPocket } from '../engine/pocket.js';
import { t } from '../i18n/index.js';

const RUOLI = ['personaggio', 'oggetto', 'stile'];

/**
 * Gli Elements: asset della libreria che entrano nella generazione.
 *
 * Non si caricano ogni volta — **si scelgono dalla libreria**, che è già
 * l'archivio degli asset di chi lavora. Il ruolo si dichiara scegliendo,
 * perché il fornitore tratta un personaggio diversamente da uno stile.
 *
 * ⚠️ **Un riferimento esce dal computer.** È l'unica cosa in tutto il prodotto
 * che lo fa, ed è per forza: generare vuol dire mandare a un fornitore. Si
 * dice qui, accanto al gesto, non in una pagina di aiuto.
 */
export default function Riferimenti({
  servizio,
  scelti,
  onCambia,
  assets,
  onChiudi,
  ruoloIniziale = 'personaggio',
  /*
   * Video (fetta 3d) usa lo stesso pannello con i suoi ruoli (primo/ultimo
   * fotogramma, riferimento), i suoi tetti e una regola in più — i
   * fotogrammi e i riferimenti non si mescolano — che gli passa `puoAggiungere`
   * dallo stesso modulo che il Worker usa per giudicare.
   */
  ruoli = RUOLI,
  limiti: limitiDati,
  prefisso = 'immagine.ruolo',
  puoAggiungere = () => true,
  /*
   * Il pocket (fase 4b, A7): i suoi file stanno in cima, perché il pocket è
   * proprio ciò che si tiene a portata di mano. La divisione la fa
   * `dividiPerPocket` sugli `assets` già filtrati, quindi vale lo stesso filtro.
   */
  pocket = null,
}) {
  const limiti = limitiDati || limitiDi(servizio);
  // La scheda con cui il pannello si apre: il ruolo scelto nel `+` di
  // Immagine, non sempre «personaggio» — altrimenti i tre tasti del `+`
  // promettono una scheda e ne aprono sempre un'altra.
  const [ruolo, setRuolo] = useState(ruoloIniziale);
  const quanti = (r) => scelti.filter((s) => s.ruolo === r).length;
  const pieno =
    quanti(ruolo) >= limiti[ruolo] || scelti.length >= limiti.totale || !puoAggiungere(ruolo, scelti);
  const { dalPocket, resto } = pocket ? dividiPerPocket(pocket, assets) : { dalPocket: [], resto: assets };
  const chip = (a) => (
    <button
      key={a.id}
      className="brain-chip"
      disabled={pieno}
      title={a.name}
      onClick={() => onCambia([...scelti, { ruolo, assetId: a.id, nome: a.name }])}
    >
      {a.name}
    </button>
  );

  return (
    <div className="riferimenti">
      <div className="riferimenti-ruoli">
        {ruoli.map((r) => (
          <button
            key={r}
            className={`btn ghost${r === ruolo ? ' on' : ''}`}
            onClick={() => setRuolo(r)}
          >
            {t(`${prefisso}.${r}`)} {quanti(r)}/{limiti[r]}
          </button>
        ))}
      </div>

      {dalPocket.length > 0 && (
        <>
          <p className="riferimenti-sezione">{t('immagine.dalPocket')}</p>
          <div className="riferimenti-griglia riferimenti-pocket">{dalPocket.map(chip)}</div>
          <p className="riferimenti-sezione">{t('immagine.dallaLibreria')}</p>
        </>
      )}
      <div className="riferimenti-griglia">
        {resto.map(chip)}
      </div>

      {scelti.length > 0 && (
        <ul className="riferimenti-scelti">
          {scelti.map((s, i) => (
            <li key={`${s.assetId}-${i}`}>
              {t(`${prefisso}.${s.ruolo}`)}: {s.nome}
              <button
                className="btn ghost"
                onClick={() => onCambia(scelti.filter((_, j) => j !== i))}
              >
                {t('immagine.togli')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* La riga che dice la verità sul confine, dove il gesto avviene. */}
      <p className="riferimenti-avviso">{t('immagine.escono')}</p>
      <button className="btn" onClick={onChiudi}>{t('immagine.chiudi')}</button>
    </div>
  );
}
