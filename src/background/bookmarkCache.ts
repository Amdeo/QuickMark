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
  let pendingLoad: Promise<BookmarkResult[]> | undefined;
  let pendingRestore: Promise<BookmarkResult[] | undefined> | undefined;

  async function restorePersistedCache(): Promise<BookmarkResult[] | undefined> {
    if (!options.storage) {
      return undefined;
    }
    if (!pendingRestore) {
      pendingRestore = options.storage.read().then((results) => {
        if (results?.length) {
          cachedResults = results;
        }
        return results;
      });
    }
    return pendingRestore;
  }

  async function loadAndCache(): Promise<BookmarkResult[]> {
    if (!pendingLoad) {
      pendingLoad = loadBookmarks()
        .then((results) => {
          cachedResults = results;
          isStale = false;
          void options.storage?.write(results).catch(() => {
            // In-memory cache is still valid if persistence fails.
          });
          return results;
        })
        .finally(() => {
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
          if (restoredResults?.length) {
            refreshInBackground();
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
      isStale = true;
    },
    /**
     * Bump usage stats for an item the user just opened. Persisted
     * through storage so smart/frequent sorting survives the next
     * palette open; a later stale refresh reconciles with the real
     * chrome.history data.
     */
    markVisited(id: string): void {
      if (!cachedResults) return;
      const result = cachedResults.find((entry) => entry.item.id === id);
      if (!result) return;
      result.item.visitCount += 1;
      result.item.lastVisitedAt = Date.now();
      void options.storage?.write(cachedResults).catch(() => {
        // In-memory cache is still updated if persistence fails.
      });
    },
  };
}
