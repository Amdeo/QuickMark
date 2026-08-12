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
    commands: new Set<(command: string) => void>(),
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

test("background registers chrome event listeners on load", async () => {
  const chromeMock = createChromeMock();
  await importBackground(chromeMock);

  expect(chromeMock.api.commands.onCommand.addListener).toHaveBeenCalledTimes(1);
  expect(chromeMock.api.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
  expect(chromeMock.api.bookmarks.onCreated.addListener).toHaveBeenCalledTimes(1);
  expect(chromeMock.api.bookmarks.onRemoved.addListener).toHaveBeenCalledTimes(1);
  expect(chromeMock.api.bookmarks.onChanged.addListener).toHaveBeenCalledTimes(1);
  expect(chromeMock.api.bookmarks.onMoved.addListener).toHaveBeenCalledTimes(1);
  expect(chromeMock.api.history.onVisited.addListener).toHaveBeenCalledTimes(1);
  expect(chromeMock.api.history.onVisitRemoved.addListener).toHaveBeenCalledTimes(1);
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
