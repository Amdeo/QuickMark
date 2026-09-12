import { useCallback, useEffect, useRef, useState } from "react";
import type { SortMode } from "../../domain/search";
import { isHttpUrl } from "../../domain/url";

export type PinnedSite = {
  url: string;
  title: string;
};

/** 8 个 28px 图标、6px 间距，加上行首钉子标记约 300px；与来源筛选、筛选下拉同排，面板变窄时整行换行。 */
export const MAX_PINNED_SITES = 8;

const SORT_MODE_KEY = "quickmark-sort-mode";
const PINNED_SITES_KEY = "quickmark-pinned-sites";
const DEFAULT_SORT_MODE: SortMode = "smart";
const sortModes: Record<SortMode, true> = {
  smart: true,
  recent: true,
  frequent: true,
  title: true,
  created: true,
  relevance: true,
};

function parseSortMode(value: unknown): SortMode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(sortModes, value) ? (value as SortMode) : DEFAULT_SORT_MODE;
}

function parsePinnedSites(value: unknown): PinnedSite[] {
  if (!Array.isArray(value)) return [];

  const seenUrls = new Set<string>();
  const sites: PinnedSite[] = [];
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      !("url" in entry) || typeof entry.url !== "string" ||
      !("title" in entry) || typeof entry.title !== "string"
    ) {
      continue;
    }

    if (!isHttpUrl(entry.url) || seenUrls.has(entry.url)) continue;
    seenUrls.add(entry.url);
    sites.push({ url: entry.url, title: entry.title });
    if (sites.length === MAX_PINNED_SITES) break;
  }
  return sites;
}

function storageAvailable(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local && !!chrome.storage?.onChanged;
}

/** Persists search ordering and manually pinned, exact URLs independently. */
export function useSearchPreferences() {
  const [sortMode, setSortModeState] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [pinnedSites, setPinnedSitesState] = useState<PinnedSite[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const pinnedSitesRef = useRef(pinnedSites);
  const isLoadedRef = useRef(false);
  const sortRevisionRef = useRef(0);
  const pinnedRevisionRef = useRef(0);
  const writeQueueRef = useRef(Promise.resolve());
  const pendingWritesRef = useRef<Record<string, number>>({});

  const updatePinnedSites = useCallback((sites: PinnedSite[]) => {
    pinnedSitesRef.current = sites;
    setPinnedSitesState(sites);
  }, []);

  const enqueueSave = useCallback((key: string, value: SortMode | PinnedSite[]) => {
    pendingWritesRef.current[key] = (pendingWritesRef.current[key] ?? 0) + 1;
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        await chrome.storage.local.set({ [key]: value });
        setError(undefined);
      } catch {
        setError("无法保存搜索偏好设置。");
      } finally {
        pendingWritesRef.current[key] -= 1;
      }
    });
  }, []);

  useEffect(() => {
    if (!storageAvailable()) {
      setError("无法访问扩展存储，偏好设置暂时不能保存。");
      return;
    }
    let cancelled = false;
    const initialSortRevision = sortRevisionRef.current;
    const initialPinnedRevision = pinnedRevisionRef.current;
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local") return;
      const sortChange = changes[SORT_MODE_KEY];
      if (sortChange && !pendingWritesRef.current[SORT_MODE_KEY]) {
        sortRevisionRef.current += 1;
        setSortModeState(parseSortMode(sortChange.newValue));
      }
      const pinnedChange = changes[PINNED_SITES_KEY];
      if (pinnedChange && !pendingWritesRef.current[PINNED_SITES_KEY]) {
        pinnedRevisionRef.current += 1;
        updatePinnedSites(parsePinnedSites(pinnedChange.newValue));
      }
    };
    chrome.storage.onChanged.addListener(listener);
    void chrome.storage.local.get([SORT_MODE_KEY, PINNED_SITES_KEY]).then((stored) => {
      if (cancelled) return;
      if (sortRevisionRef.current === initialSortRevision) {
        setSortModeState(parseSortMode(stored[SORT_MODE_KEY]));
      }
      if (pinnedRevisionRef.current === initialPinnedRevision) {
        updatePinnedSites(parsePinnedSites(stored[PINNED_SITES_KEY]));
      }
      isLoadedRef.current = true;
      setIsLoaded(true);
    }).catch(() => {
      if (!cancelled) setError("无法加载搜索偏好设置，请重新打开面板。");
    });
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [updatePinnedSites]);

  const setSortMode = useCallback((mode: SortMode) => {
    if (!Object.prototype.hasOwnProperty.call(sortModes, mode)) return;
    sortRevisionRef.current += 1;
    setSortModeState(mode);
    if (storageAvailable()) enqueueSave(SORT_MODE_KEY, mode);
  }, [enqueueSave]);

  const togglePinnedSite = useCallback((site: PinnedSite) => {
    if (!isLoadedRef.current || !isHttpUrl(site.url) || typeof site.title !== "string") return;
    const existing = pinnedSitesRef.current;
    const existingIndex = existing.findIndex((pinned) => pinned.url === site.url);
    if (existingIndex < 0 && existing.length >= MAX_PINNED_SITES) return;
    const next = existingIndex >= 0
      ? existing.filter((_, index) => index !== existingIndex)
      : [...existing, { url: site.url, title: site.title }];
    pinnedRevisionRef.current += 1;
    updatePinnedSites(next);
    if (storageAvailable()) enqueueSave(PINNED_SITES_KEY, next);
  }, [enqueueSave, updatePinnedSites]);

  const movePinnedSite = useCallback((from: number, to: number) => {
    const existing = pinnedSitesRef.current;
    if (from === to || from < 0 || to < 0 || from >= existing.length || to >= existing.length) return;
    const next = [...existing];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    pinnedRevisionRef.current += 1;
    updatePinnedSites(next);
    if (storageAvailable()) enqueueSave(PINNED_SITES_KEY, next);
  }, [enqueueSave, updatePinnedSites]);

  return { sortMode, setSortMode, pinnedSites, togglePinnedSite, movePinnedSite, isLoaded, error };
}
