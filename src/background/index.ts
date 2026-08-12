import { getNativeBookmarks, isSearchablePageUrl } from "../adapters/chromeBookmarks";
import { createBookmarkCache, type BookmarkResult } from "./bookmarkCache";
import { BOOKMARK_CACHE_KEY } from "./cacheKeys";

const staleEvents = [
  chrome.bookmarks.onCreated,
  chrome.bookmarks.onRemoved,
  chrome.bookmarks.onChanged,
  chrome.bookmarks.onMoved,
  chrome.history.onVisited,
  chrome.history.onVisitRemoved,
];

const bookmarkCache = createBookmarkCache(getNativeBookmarks, {
  storage: {
    read: readBookmarkCache,
    write: writeBookmarkCache,
  },
});

async function readBookmarkCache(): Promise<BookmarkResult[] | undefined> {
  const stored = await chrome.storage.local.get(BOOKMARK_CACHE_KEY);
  return stored[BOOKMARK_CACHE_KEY] as BookmarkResult[] | undefined;
}

async function writeBookmarkCache(results: BookmarkResult[]): Promise<void> {
  await chrome.storage.local.set({ [BOOKMARK_CACHE_KEY]: results });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-search") {
    void toggleSearchOverlay();
  }
});

chrome.runtime.onMessage.addListener((message: { type?: string; url?: string; newTab?: boolean; id?: string; preferFresh?: boolean }, sender, sendResponse) => {
  // Only accept messages from this extension's own contexts
  // (content scripts, popup, etc.), never from other extensions or pages.
  if (sender.id !== chrome.runtime.id) {
    return;
  }

  if (message.type === "QUICKMARK_OPEN_URL" && message.url) {
    if (!message.newTab && sender.tab?.id != null) {
      void chrome.tabs.update(sender.tab.id, { url: message.url });
    } else {
      void chrome.tabs.create({ url: message.url, active: true });
    }
  }

  if (message.type === "QUICKMARK_TRIGGER_SEARCH") {
    void toggleSearchOverlay();
  }

  if (message.type === "QUICKMARK_MARK_VISITED" && message.id) {
    bookmarkCache.markVisited(message.id);
  }

  if (message.type === "QUICKMARK_GET_BOOKMARKS") {
    bookmarkCache.getBookmarks({ preferFresh: message.preferFresh })
      .then((response) => sendResponse(response))
      .catch((error: unknown) => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
    return true;
  }
});

for (const event of staleEvents) {
  event.addListener(() => bookmarkCache.markStale());
}

async function toggleSearchOverlay(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url || !isSearchablePageUrl(tab.url)) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE" });
  } catch {
    try {
      await injectContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE" });
    } catch {
      // silently fail
    }
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["assets/content.js"]
  });
}
