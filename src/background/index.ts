import { getNativeBookmarks, isSearchablePageUrl } from "../adapters/chromeBookmarks";
import { isHttpUrl } from "../domain/search";
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
  } else if (command === "open-tabs") {
    void toggleTabsOverlay();
  }
});
chrome.runtime.onMessage.addListener((
  message: {
    type?: string;
    url?: string;
    newTab?: boolean;
    id?: string;
    preferFresh?: boolean;
    tabId?: number;
    windowId?: number;
  },
  sender,
  sendResponse
) => {
  // 仅接受本扩展上下文（内容脚本、弹窗等）发出的消息，拒绝其他扩展或页面。
  if (sender.id !== chrome.runtime.id) {
    return;
  }

  if (message.type === "QUICKMARK_OPEN_URL" && message.url) {
    if (!isHttpUrl(message.url)) {
      return;
    }
    if (!message.newTab && sender.tab?.id != null) {
      void chrome.tabs.update(sender.tab.id, { url: message.url });
    } else {
      void chrome.tabs.create({ url: message.url, active: true });
    }
  }

  if (message.type === "QUICKMARK_TRIGGER_SEARCH") {
    void toggleSearchOverlay();
  }
  if (message.type === "QUICKMARK_TOGGLE_TABS") {
    void toggleTabsOverlay();
  }

  if (message.type === "QUICKMARK_LIST_TABS") {
    void chrome.tabs.query({}).then((tabs) => {
      // activeId 是注入面板的 tab(快捷键触发时即当前激活 tab),供面板标记"当前"。
      sendResponse({
        tabs: tabs.filter((tab) => tab.id !== chrome.tabs.TAB_ID_NONE),
        activeId: sender.tab?.id,
      });
    });
    return true;
  }

  if (message.type === "QUICKMARK_ACTIVATE_TAB" && message.tabId != null && message.windowId != null) {
    void Promise.all([
      chrome.tabs.update(message.tabId, { active: true }),
      chrome.windows.update(message.windowId, { focused: true }),
    ]);
    sendResponse({ ok: true });
  }

  if (message.type === "QUICKMARK_CLOSE_TAB" && message.tabId != null) {
    chrome.tabs.remove(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    return true;
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

async function toggleTabsOverlay(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !isSearchablePageUrl(tab.url)) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE_TABS" });
  } catch {
    try {
      await injectContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE_TABS" });
    } catch {
      // silently fail
    }
  }
}
