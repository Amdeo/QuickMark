import type { BookmarkItem } from "../domain/types";

const bookmark: BookmarkItem = {
  id: "bookmark-1",
  title: "Example",
  url: "https://example.com",
  domain: "example.com",
  favicon: "",
  visitCount: 0,
  source: "bookmark",
};

const getNativeBookmarks = vi.fn();

vi.mock("../adapters/chromeBookmarks", () => ({
  getNativeBookmarks: (...args: unknown[]) => getNativeBookmarks(...args),
  isSearchablePageUrl: () => true,
}));

function createChromeMock() {
  const listeners = {
    commands: new Set<(command: string, tab?: chrome.tabs.Tab) => void>(),
    runtime: new Set<(message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => unknown>(),
    bookmarks: {
      onCreated: new Set<() => void>(),
      onRemoved: new Set<() => void>(),
      onChanged: new Set<() => void>(),
      onMoved: new Set<() => void>(),
    },
    history: {
      onVisited: new Set<() => void>(),
      onVisitRemoved: new Set<() => void>(),
    },
  };

  return {
    listeners,
    api: {
      commands: {
        onCommand: {
          addListener: vi.fn((cb: (command: string) => void) => {
            listeners.commands.add(cb);
          }),
        },
      },
      runtime: {
        id: "test-extension",
        onMessage: {
          addListener: vi.fn((cb) => {
            listeners.runtime.add(cb);
          }),
        },
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      },
      bookmarks: {
        onCreated: { addListener: vi.fn((cb) => listeners.bookmarks.onCreated.add(cb)) },
        onRemoved: { addListener: vi.fn((cb) => listeners.bookmarks.onRemoved.add(cb)) },
        onChanged: { addListener: vi.fn((cb) => listeners.bookmarks.onChanged.add(cb)) },
        onMoved: { addListener: vi.fn((cb) => listeners.bookmarks.onMoved.add(cb)) },
      },
      history: {
        onVisited: { addListener: vi.fn((cb) => listeners.history.onVisited.add(cb)) },
        onVisitRemoved: { addListener: vi.fn((cb) => listeners.history.onVisitRemoved.add(cb)) },
      },
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        TAB_ID_NONE: -1,
      },
      windows: {
        update: vi.fn().mockResolvedValue(undefined),
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue(undefined),
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    },
  };
}

async function importBackground(chromeMock: ReturnType<typeof createChromeMock>) {
  vi.stubGlobal("chrome", chromeMock.api);
  await import("./index");
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  getNativeBookmarks.mockReset();
});


test("QUICKMARK_GET_BOOKMARKS returns results and keeps message channel open", async () => {
  const chromeMock = createChromeMock();
  getNativeBookmarks.mockResolvedValue([{ item: bookmark, folderPath: ["Docs"] }]);
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];
  const sendResponse = vi.fn();

  const keepChannelOpen = messageListener({ type: "QUICKMARK_GET_BOOKMARKS" }, { id: "test-extension" }, sendResponse);

  expect(keepChannelOpen).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(sendResponse).toHaveBeenCalledWith({
    results: [{ item: bookmark, folderPath: ["Docs"] }],
    cached: false,
    refreshing: false,
  });
});

test("QUICKMARK_GET_BOOKMARKS returns error response when loading fails", async () => {
  const chromeMock = createChromeMock();
  getNativeBookmarks.mockRejectedValue(new Error("bookmarks unavailable"));
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];
  const sendResponse = vi.fn();

  const keepChannelOpen = messageListener({ type: "QUICKMARK_GET_BOOKMARKS" }, { id: "test-extension" }, sendResponse);

  expect(keepChannelOpen).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(sendResponse).toHaveBeenCalledWith({ error: "bookmarks unavailable" });
});

test("QUICKMARK_OPEN_URL ignores non-http URLs", async () => {
  const chromeMock = createChromeMock();
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];
  messageListener(
    { type: "QUICKMARK_OPEN_URL", url: "javascript:alert(1)", newTab: true },
    { id: "test-extension", tab: { id: 42 } },
    vi.fn()
  );

  expect(chromeMock.api.tabs.create).not.toHaveBeenCalled();
  expect(chromeMock.api.tabs.update).not.toHaveBeenCalled();
});

test("QUICKMARK_OPEN_URL opens in the sending tab when newTab is false", async () => {
  const chromeMock = createChromeMock();
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];

  messageListener(
    { type: "QUICKMARK_OPEN_URL", url: "https://example.com", newTab: false },
    { id: "test-extension", tab: { id: 42 } },
    vi.fn()
  );

  expect(chromeMock.api.tabs.update).toHaveBeenCalledWith(42, { url: "https://example.com" });
  expect(chromeMock.api.tabs.create).not.toHaveBeenCalled();
});

test("QUICKMARK_OPEN_URL creates a new tab when newTab is true or the sender has no tab", async () => {
  const chromeMock = createChromeMock();
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];

  messageListener(
    { type: "QUICKMARK_OPEN_URL", url: "https://example.com", newTab: true },
    { id: "test-extension", tab: { id: 42 } },
    vi.fn()
  );
  messageListener(
    { type: "QUICKMARK_OPEN_URL", url: "https://example.com", newTab: false },
    { id: "test-extension" },
    vi.fn()
  );

  expect(chromeMock.api.tabs.create).toHaveBeenCalledTimes(2);
  expect(chromeMock.api.tabs.create).toHaveBeenCalledWith({ url: "https://example.com", active: true });
  expect(chromeMock.api.tabs.update).not.toHaveBeenCalled();
});

test("messages from other extensions are ignored", async () => {
  const chromeMock = createChromeMock();
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];

  messageListener(
    { type: "QUICKMARK_OPEN_URL", url: "https://example.com", newTab: true },
    { id: "other-extension" },
    vi.fn()
  );

  expect(chromeMock.api.tabs.create).not.toHaveBeenCalled();
  expect(chromeMock.api.tabs.update).not.toHaveBeenCalled();
});

test("QUICKMARK_MARK_VISITED bumps usage stats in the served cache", async () => {
  const chromeMock = createChromeMock();
  getNativeBookmarks.mockResolvedValue([{ item: bookmark, folderPath: [] }]);
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];
  const sendResponse = vi.fn();

  messageListener({ type: "QUICKMARK_GET_BOOKMARKS" }, { id: "test-extension" }, sendResponse);
  await new Promise((resolve) => setTimeout(resolve, 10));

  messageListener(
    { type: "QUICKMARK_MARK_VISITED", id: "bookmark-1" },
    { id: "test-extension", tab: { id: 1 } },
    vi.fn()
  );

  sendResponse.mockClear();
  messageListener({ type: "QUICKMARK_GET_BOOKMARKS" }, { id: "test-extension" }, sendResponse);
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(sendResponse).toHaveBeenCalledWith(
    expect.objectContaining({
      cached: true,
      results: [
        {
          item: expect.objectContaining({ visitCount: 1, lastVisitedAt: expect.any(Number) }),
          folderPath: [],
        },
      ],
    })
  );
});

test("QUICKMARK_TRIGGER_SEARCH toggles search overlay", async () => {
  const chromeMock = createChromeMock();
  chromeMock.api.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }]);
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];

  messageListener({ type: "QUICKMARK_TRIGGER_SEARCH" }, { id: "test-extension" }, vi.fn());

  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(chromeMock.api.tabs.sendMessage).toHaveBeenCalledWith(1, { type: "QUICKMARK_TOGGLE" });
});

test("open-search command toggles search overlay", async () => {
  const chromeMock = createChromeMock();
  chromeMock.api.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }]);
  await importBackground(chromeMock);

  const [commandListener] = [...chromeMock.listeners.commands];
  commandListener("open-search");

  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(chromeMock.api.tabs.sendMessage).toHaveBeenCalledWith(1, { type: "QUICKMARK_TOGGLE" });
});

test("open-search command targets the command's tab even when currentWindow is stale", async () => {
  // Tab panel 跨窗口切换后焦点事件未及处理时，query({active, currentWindow}) 会返回空，
  // 旧实现静默失效；命令回调自带的 tab 不受影响。
  const chromeMock = createChromeMock();
  chromeMock.api.tabs.query.mockResolvedValue([]);
  await importBackground(chromeMock);

  const [commandListener] = [...chromeMock.listeners.commands];
  commandListener("open-search", { id: 202, windowId: 20, url: "https://b.test/" } as chrome.tabs.Tab);

  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(chromeMock.api.tabs.query).not.toHaveBeenCalled();
  expect(chromeMock.api.tabs.sendMessage).toHaveBeenCalledWith(202, { type: "QUICKMARK_TOGGLE" });
});

test("bookmark and history events mark cache stale", async () => {
  const chromeMock = createChromeMock();
  getNativeBookmarks
    .mockResolvedValueOnce([{ item: bookmark, folderPath: [] }])
    .mockResolvedValueOnce([{ item: { ...bookmark, title: "Updated" }, folderPath: [] }]);
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];
  const sendResponse = vi.fn();

  // First call populates the cache.
  messageListener({ type: "QUICKMARK_GET_BOOKMARKS" }, { id: "test-extension" }, sendResponse);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ cached: false }));

  // Fire a bookmark change event to mark the cache stale.
  const [onChanged] = [...chromeMock.listeners.bookmarks.onChanged];
  onChanged();

  sendResponse.mockClear();
  messageListener({ type: "QUICKMARK_GET_BOOKMARKS" }, { id: "test-extension" }, sendResponse);
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(getNativeBookmarks).toHaveBeenCalledTimes(2);
  expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ cached: true, refreshing: true }));
});

test("open-tabs command forwards the toggle message", async () => {
  const chromeMock = createChromeMock();
  chromeMock.api.tabs.query.mockResolvedValue([{ id: 1, url: "https://example.com" }]);
  await importBackground(chromeMock);

  const [commandListener] = [...chromeMock.listeners.commands];
  commandListener("open-tabs");

  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(chromeMock.api.tabs.sendMessage).toHaveBeenCalledWith(1, { type: "QUICKMARK_TOGGLE_TABS" });
});

test("tab messages list tabs and activate a selected tab", async () => {
  const chromeMock = createChromeMock();
  chromeMock.api.tabs.query.mockResolvedValue([
    { id: 1, windowId: 10, index: 0, title: "Example", url: "https://example.com" },
    { id: -1, windowId: 10, index: 1, title: "Discarded", url: "chrome://newtab" },
  ]);
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];
  const sendResponse = vi.fn();
  expect(messageListener({ type: "QUICKMARK_LIST_TABS" }, { id: "test-extension" }, sendResponse)).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(sendResponse).toHaveBeenCalledWith({
    tabs: [{ id: 1, windowId: 10, index: 0, title: "Example", url: "https://example.com" }],
    activeId: undefined,
  });

  messageListener(
    { type: "QUICKMARK_ACTIVATE_TAB", tabId: 1, windowId: 10 },
    { id: "test-extension" },
    sendResponse,
  );
  expect(chromeMock.api.tabs.update).toHaveBeenCalledWith(1, { active: true });
  expect(chromeMock.api.windows.update).toHaveBeenCalledWith(10, { focused: true });
});

test("tab messages close a selected tab", async () => {
  const chromeMock = createChromeMock();
  await importBackground(chromeMock);

  const [messageListener] = [...chromeMock.listeners.runtime];
  const sendResponse = vi.fn();
  expect(messageListener({ type: "QUICKMARK_CLOSE_TAB", tabId: 42 }, { id: "test-extension" }, sendResponse)).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(chromeMock.api.tabs.remove).toHaveBeenCalledWith(42);
  expect(sendResponse).toHaveBeenCalledWith({ ok: true });
});

test("QUICKMARK_OPEN_URL reports completion and tab navigation failures", async () => {
  const chromeMock = createChromeMock();
  await importBackground(chromeMock);
  const [listener] = [...chromeMock.listeners.runtime];
  const message = { type: "QUICKMARK_OPEN_URL", url: "https://example.com", newTab: false };
  const sender = { id: "test-extension", tab: { id: 42 } };
  // ES2022 target has no Promise.withResolvers; await the callback signal directly.
  const success = await new Promise((resolve) => {
    expect(listener(message, sender, resolve)).toBe(true);
  });
  expect(success).toEqual({ ok: true });
  chromeMock.api.tabs.update.mockRejectedValueOnce(new Error("Tab not found"));
  const failure = await new Promise((resolve) => {
    expect(listener(message, sender, resolve)).toBe(true);
  });
  expect(failure).toEqual({ ok: false, error: "Tab not found" });
});
