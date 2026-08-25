import { useCallback, useEffect, useMemo, useState } from 'react';
import * as lib from '../store/library.js';
import { queryAssets, allTags, folderPath } from '../store/model.js';

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

  const [filter, setFilter] = useState({ folderId: undefined, moodboardId: undefined, tag: null, search: '' });

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
    visible,
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
    update: act(lib.updateAsset),
    addTag: act(lib.addTag),
    removeTag: act(lib.removeTag),
    createFolder: act(lib.createFolder),
    deleteFolder: act(lib.deleteFolder),
    createMoodboard: act(lib.createMoodboard),
    deleteMoodboard: act(lib.deleteMoodboard),
    setInMoodboard: act(lib.setInMoodboard),
    repair: act(lib.repair),
    wipe: act(lib.wipe),
  };
}
