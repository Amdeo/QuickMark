import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookmarkItem } from "../domain/types";
import { createBookmarkSearchIndex, filterBySource, filterByTime, searchBookmarks } from "../domain/search";
import type { SortMode, SourceFilter, TimeFilter } from "../domain/search";
import { BOOKMARK_CACHE_KEY } from "../background/cacheKeys";
import type { BookmarkResult } from "../background/bookmarkCache";

type BookmarkState = {
  items: BookmarkItem[];
  folderPaths: Map<string, string[]>;
};

type RuntimeClient = {
  sendMessage: (message: { type: "QUICKMARK_GET_BOOKMARKS"; preferFresh?: boolean }) => Promise<
    | { results: BookmarkResult[]; cached?: boolean; refreshing?: boolean }
    | { error: string }
  >;
};

type StorageAreaLike = {
  get: (key: string) => Promise<Record<string, unknown>>;
};

type StorageChangeLike = Record<string, { newValue?: unknown }>;

type GetBookmarksOptions = {
  preferFresh?: boolean;
};

export async function getBookmarksFromRuntime(
  runtime: RuntimeClient,
  options: GetBookmarksOptions = {}
) {
  const response = await runtime.sendMessage({
    type: "QUICKMARK_GET_BOOKMARKS",
    preferFresh: options.preferFresh,
  });
  if (response && typeof response === "object" && "error" in response) {
    throw new Error(String(response.error));
  }
  const state = bookmarkResultsToState(response.results);
  return { ...state, cached: Boolean(response.cached), refreshing: Boolean(response.refreshing) };
}

export function bookmarkResultsToState(results: BookmarkResult[]): BookmarkState {
  const items: BookmarkItem[] = [];
  const folderPaths = new Map<string, string[]>();
  for (const r of results) {
    items.push(r.item);
    folderPaths.set(r.item.id, r.folderPath);
  }
  return { items, folderPaths };
}

export function getCachedBookmarkResultsFromChange(changes: StorageChangeLike): BookmarkResult[] | undefined {
  const nextValue = changes[BOOKMARK_CACHE_KEY]?.newValue;
  return Array.isArray(nextValue) ? nextValue as BookmarkResult[] : undefined;
}

async function getBookmarksFromStorage(storage: StorageAreaLike): Promise<BookmarkState | undefined> {
  const stored = await storage.get(BOOKMARK_CACHE_KEY);
  const cachedResults = stored[BOOKMARK_CACHE_KEY];
  if (!Array.isArray(cachedResults)) {
    return undefined;
  }
  return bookmarkResultsToState(cachedResults as BookmarkResult[]);
}

export function useBookmarks(
  query: string,
  sourceFilter: SourceFilter = "all",
  timeFilter: TimeFilter = "all",
  sortMode: SortMode = "smart"
) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [folderPaths, setFolderPaths] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const bookmarkCountRef = useRef(0);

  const applyBookmarkState = useCallback((state: BookmarkState) => {
    bookmarkCountRef.current = state.items.length;
    setBookmarks(state.items);
    setFolderPaths(state.folderPaths);
  }, []);

  const refresh = useCallback(async (options: GetBookmarksOptions = {}) => {
    setIsLoading((loading) => options.preferFresh || bookmarkCountRef.current === 0 ? true : loading);
    setError(undefined);
    try {
      const response = await getBookmarksFromRuntime(chrome.runtime, options);
      applyBookmarkState(response);
    } catch (err) {
      if (bookmarkCountRef.current === 0) {
        setBookmarks([]);
        setFolderPaths(new Map());
      }
      setError(err instanceof Error ? err.message : "无法加载书签和历史记录。");
    } finally {
      setIsLoading(false);
    }
  }, [applyBookmarkState]);

  useEffect(() => {
    let cancelled = false;

    async function loadCachedThenRefresh() {
      try {
        const cached = await getBookmarksFromStorage(chrome.storage.local);
        if (!cancelled && cached) {
          applyBookmarkState(cached);
          setIsLoading(false);
        }
      } catch {
        // Background refresh still provides a fallback.
      }
      if (!cancelled) {
        void refresh();
      }
    }

    void loadCachedThenRefresh();
    return () => {
      cancelled = true;
    };
  }, [applyBookmarkState, refresh]);

  useEffect(() => {
    const listener = (changes: StorageChangeLike, areaName: string) => {
      if (areaName !== "local") return;
      const results = getCachedBookmarkResultsFromChange(changes);
      if (!results) return;
      applyBookmarkState(bookmarkResultsToState(results));
      setIsLoading(false);
      setError(undefined);
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [applyBookmarkState]);

  const fuse = useMemo(() => createBookmarkSearchIndex(bookmarks), [bookmarks]);

  // When a source/time filter is active, the search runs against the
  // filtered set. Build that index once per (items, filters) instead of
  // on every keystroke.
  const filteredItems = useMemo(
    () =>
      sourceFilter === "all" && timeFilter === "all"
        ? bookmarks
        : filterByTime(filterBySource(bookmarks, sourceFilter), timeFilter),
    [bookmarks, sourceFilter, timeFilter]
  );
  const filteredFuse = useMemo(
    () => (filteredItems === bookmarks ? fuse : createBookmarkSearchIndex(filteredItems)),
    [filteredItems, fuse]
  );

  const results = useMemo(
    () => searchBookmarks(bookmarks, query, fuse, sourceFilter, timeFilter, sortMode, filteredFuse),
    [bookmarks, query, fuse, sourceFilter, timeFilter, sortMode, filteredFuse]
  );

  const markVisited = useCallback(async (id: string) => {
    setBookmarks((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, visitCount: item.visitCount + 1, lastVisitedAt: Date.now() }
          : item
      )
    );
    // Persist through the background cache so usage-aware sorting
    // survives the next palette open.
    try {
      await chrome.runtime.sendMessage({ type: "QUICKMARK_MARK_VISITED", id });
    } catch {
      // Best effort: the local update already applied.
    }
  }, []);

  return { bookmarks, results, folderPaths, isLoading, error, refresh, markVisited };
}
