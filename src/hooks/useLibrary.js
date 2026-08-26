import { useCallback, useEffect, useMemo, useState } from 'react';
import * as lib from '../store/library.js';
import {
  queryAssets,
  allTags,
  folderPath,
  smartCollections,
  lineage,
  derivedFrom,
  doppioni,
  pesoDi,
} from '../store/model.js';

/**
 * La libreria vista da React.
 *
 * Tiene una copia in memoria dei metadati e la ricarica dopo ogni scrittura:
 * per l'archivio di una persona sola è più semplice e più affidabile che
 * tenere sincronizzati aggiornamenti parziali, e la differenza di velocità
 * non è percepibile.
 */
export function useLibrary() {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [moodboards, setMoodboards] = useState([]);
  const [usage, setUsage] = useState({ used: null, quota: null });

  const [filter, setFilter] = useState({ folderId: undefined, moodboardId: undefined, tag: null, search: '', collection: null });

  const refresh = useCallback(async () => {
    try {
      const snap = await lib.snapshot();
      setAssets(snap.assets);
      setFolders(snap.folders);
      setMoodboards(snap.moodboards);
      setUsage(snap.usage);
    } catch {
      // Un errore di lettura non deve portarsi via il piano di lavoro.
    }
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await lib.isSupported();
      setSupported(ok);
      if (ok) await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const visible = useMemo(() => queryAssets(assets, filter), [assets, filter]);
  const tags = useMemo(() => allTags(assets), [assets]);
  const collections = useMemo(() => smartCollections(assets), [assets]);

  // Filtro applicato dopo la query, perché le raccolte pronte non sono
  // cartelle: sono domande sul tempo e sull'uso.
  const shown = useMemo(() => {
    const c = collections.find((x) => x.id === filter.collection);
    return c ? visible.filter(c.match) : visible;
  }, [visible, collections, filter.collection]);

  const save = useCallback(
    async (blob, opts) => {
      const asset = await lib.saveAsset(blob, { ...opts, folderId: filter.folderId ?? null });
      await refresh();
      return asset;
    },
    [refresh, filter.folderId],
  );

  const act = useCallback(
    (fn) =>
      async (...args) => {
        const out = await fn(...args);
        await refresh();
        return out;
      },
    [refresh],
  );

  return {
    ready,
    supported,
    assets,
    visible: shown,
    collections,
    folders,
    moodboards,
    tags,
    usage,
    filter,
    setFilter,
    refresh,
    save,
    pathOf: (id) => folderPath(folders, id),
    read: lib.readAsset,
    remove: act(lib.deleteAsset),
    /**
     * Cancella molti lavori con un solo ricarico della libreria.
     *
     * Passare cento volte da `remove` significherebbe cento istantanee
     * dell'archivio: la potatura è il gesto che tocca più lavori insieme, ed è
     * anche quello che deve sembrare istantaneo. Un fallimento su uno non
     * ferma gli altri — chi ha chiesto di buttare cinquanta scarti non vuole
     * ritrovarne quaranta perché il decimo era già sparito.
     */
    removeMany: useCallback(
      async (ids) => {
        for (const id of ids) {
          try {
            await lib.deleteAsset(id);
          } catch {
            // Già sparito, o file irraggiungibile: si va avanti.
          }
        }
        await refresh();
      },
      [refresh],
    ),
    update: act(lib.updateAsset),
    addTag: act(lib.addTag),
    removeTag: act(lib.removeTag),
    createFolder: act(lib.createFolder),
    updateFolder: act(lib.updateFolder),
    setNote: act(lib.setNote),
    toggleStar: act(lib.toggleStar),
    lineageOf: (id) => lineage(assets, id),
    doppioni: () => doppioni(assets),
    pesoDi: (ids) => pesoDi(assets, ids),
    derivedOf: (id) => derivedFrom(assets, id),
    deleteFolder: act(lib.deleteFolder),
    createMoodboard: act(lib.createMoodboard),
    deleteMoodboard: act(lib.deleteMoodboard),
    setInMoodboard: act(lib.setInMoodboard),
    // La tela di Brain non passa da `act`: quello ricarica tutta la libreria
    // a ogni chiamata, e qui si salva a ogni oggetto spostato. Ricaricare
    // l'archivio mentre trascini è il modo più diretto di far scattare la tela.
    readBrain: lib.readBrain,
    saveBrain: lib.saveBrain,
    repair: act(lib.repair),
    wipe: act(lib.wipe),
  };
}
