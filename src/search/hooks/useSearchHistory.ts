import { useEffect, useState } from "react";

const HISTORY_KEY = "quickmark-search-history";
const MAX_HISTORY = 5;

let memorySearchHistory: string[] | undefined;
let historyLoadingPromise: Promise<void> | undefined;

export async function ensureSearchHistoryLoaded(): Promise<void> {
  if (memorySearchHistory !== undefined) return;
  if (historyLoadingPromise) {
    await historyLoadingPromise;
    return;
  }
  historyLoadingPromise = (async () => {
    try {
      const result = await chrome.storage.local.get(HISTORY_KEY);
      const raw = result[HISTORY_KEY];
      memorySearchHistory = Array.isArray(raw)
        ? raw.filter((entry): entry is string => typeof entry === "string")
        : [];
    } catch {
      memorySearchHistory = [];
    }
  })();
  await historyLoadingPromise;
}

export function getSearchHistory(): string[] {
  return memorySearchHistory ?? [];
}

export async function saveSearchHistory(history: string[]): Promise<void> {
  await ensureSearchHistoryLoaded();
  memorySearchHistory = history.slice(0, MAX_HISTORY);
  try {
    await chrome.storage.local.set({ [HISTORY_KEY]: memorySearchHistory });
  } catch {
    /* ignore */
  }
}

export async function addSearchHistory(query: string): Promise<void> {
  const q = query.trim();
  if (!q) return;
  await ensureSearchHistoryLoaded();
  const history = getSearchHistory().filter((h) => h !== q);
  history.unshift(q);
  await saveSearchHistory(history);
}

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    ensureSearchHistoryLoaded().then(() => setSearchHistory(getSearchHistory()));
  }, []);

  const recordSearch = async (query: string) => {
    await addSearchHistory(query);
    setSearchHistory(getSearchHistory());
  };

  const clearSearchHistory = async () => {
    await saveSearchHistory([]);
    setSearchHistory(getSearchHistory());
  };

  return {
    searchHistory,
    recordSearch,
    clearSearchHistory,
  };
}
