import type { BookmarkItem } from "../domain/types";

export type BookmarkResult = { item: BookmarkItem; folderPath: string[] };

type LoadBookmarks = () => Promise<BookmarkResult[]>;

type BookmarkCacheStorage = {
  read: () => Promise<BookmarkResult[] | undefined>;
  write: (results: BookmarkResult[]) => Promise<void>;
};

type GetBookmarkOptions = {
  preferFresh?: boolean;
};

type BookmarkCacheResponse = {
  results: BookmarkResult[];
  cached: boolean;
  refreshing: boolean;
};

type BookmarkCacheOptions = {
  storage?: BookmarkCacheStorage;
};

export function createBookmarkCache(loadBookmarks: LoadBookmarks, options: BookmarkCacheOptions = {}) {
  let cachedResults: BookmarkResult[] | undefined;
  let isStale = true;
  let staleVersion = 0;
  let pendingLoad: Promise<BookmarkResult[]> | undefined;
  let pendingRestore: Promise<BookmarkResult[] | undefined> | undefined;

  async function restorePersistedCache(): Promise<BookmarkResult[] | undefined> {
    if (!options.storage) {
      return undefined;
    }
    if (!pendingRestore) {
      pendingRestore = options.storage.read().then((results) => {
        if (cachedResults === undefined && results !== undefined) {
          cachedResults = results;
        }
        return cachedResults;
      }).catch(() => {
        pendingRestore = undefined;
        return undefined;
      });
    }
    return pendingRestore;
  }

  async function loadAndCache(): Promise<BookmarkResult[]> {
    if (!pendingLoad) {
      pendingLoad = (async () => {
        while (true) {
          const loadVersion = staleVersion;
          const results = await loadBookmarks();
          if (staleVersion !== loadVersion) {
            // 加载期间发生失效，丢弃这批结果并立即重试，避免
            // preferFresh 调用拿到过期数据，也避免旧结果覆盖缓存。
            continue;
          }
          cachedResults = results;
          isStale = false;
          void options.storage?.write(results).catch(() => {
            // In-memory cache is still valid if persistence fails.
          });
          return results;
        }
      })().finally(() => {
        pendingLoad = undefined;
      });
    }
    return pendingLoad;
  }

  function refreshInBackground(): void {
    void loadAndCache().catch(() => {
      // Keep the last successful cache available.
    });
  }

  return {
    async getBookmarks(options: GetBookmarkOptions = {}): Promise<BookmarkCacheResponse> {
      if (!cachedResults || options.preferFresh) {
        if (!cachedResults && !options.preferFresh) {
          const restoredResults = await restorePersistedCache();
          if (restoredResults !== undefined) {
            if (isStale) refreshInBackground();
            return { results: restoredResults, cached: true, refreshing: Boolean(pendingLoad) };
          }
        }

        const results = await loadAndCache();
        return { results, cached: false, refreshing: false };
      }

      if (isStale) {
        refreshInBackground();
      }

      return { results: cachedResults, cached: true, refreshing: Boolean(pendingLoad) };
    },
    markStale(): void {
      staleVersion += 1;
      isStale = true;
    },
    /**
     * 更新刚打开条目的使用统计并持久化，使智能/频率排序在下次打开
     * 面板时保持一致；后续过期刷新会与真实的 chrome.history 数据对齐。
     */
    markVisited(id: string): void {
      if (!cachedResults) return;
      const bookmarkResult = cachedResults.find((entry) => entry.item.id === id);
      if (!bookmarkResult) return;
      bookmarkResult.item.visitCount += 1;
      bookmarkResult.item.lastVisitedAt = Date.now();
      void options.storage?.write(cachedResults).catch(() => {
        // 即使持久化失败，内存缓存也已更新。
      });
    },
  };
}
