import type { BookmarkItem } from "../domain/types";
import { createBookmarkCache } from "./bookmarkCache";

const bookmark: BookmarkItem = {
  id: "bookmark-1",
  title: "Example",
  url: "https://example.com",
  domain: "example.com",
  favicon: "",
  visitCount: 0,
  source: "bookmark",
};

const updatedBookmark: BookmarkItem = {
  ...bookmark,
  title: "Updated Example",
};

test("bookmark cache reuses loaded results for repeated requests", async () => {
  const loadBookmarks = vi.fn().mockResolvedValue([{ item: bookmark, folderPath: ["Docs"] }]);
  const cache = createBookmarkCache(loadBookmarks);

  const first = await cache.getBookmarks();
  const second = await cache.getBookmarks();

  expect(loadBookmarks).toHaveBeenCalledTimes(1);
  expect(first.cached).toBe(false);
  expect(second.cached).toBe(true);
  expect(second.results).toEqual([{ item: bookmark, folderPath: ["Docs"] }]);
});

test("bookmark cache shares the same in-flight load", async () => {
  const loadBookmarks = vi.fn().mockResolvedValue([{ item: bookmark, folderPath: [] }]);
  const cache = createBookmarkCache(loadBookmarks);

  const [first, second] = await Promise.all([cache.getBookmarks(), cache.getBookmarks()]);

  expect(loadBookmarks).toHaveBeenCalledTimes(1);
  expect(first.results).toEqual(second.results);
});

test("bookmark cache returns stale results immediately while refreshing in the background", async () => {
  const loadBookmarks = vi
    .fn()
    .mockResolvedValueOnce([{ item: bookmark, folderPath: [] }])
    .mockResolvedValueOnce([{ item: updatedBookmark, folderPath: [] }]);
  const cache = createBookmarkCache(loadBookmarks);

  await cache.getBookmarks();
  cache.markStale();

  const stale = await cache.getBookmarks();
  const fresh = await cache.getBookmarks({ preferFresh: true });

  expect(stale.cached).toBe(true);
  expect(stale.refreshing).toBe(true);
  expect(stale.results).toEqual([{ item: bookmark, folderPath: [] }]);
  expect(fresh.results).toEqual([{ item: updatedBookmark, folderPath: [] }]);
  expect(loadBookmarks).toHaveBeenCalledTimes(2);
});

test("bookmark cache restores persisted results before refreshing", async () => {
  const loadBookmarks = vi.fn().mockResolvedValue([{ item: updatedBookmark, folderPath: [] }]);
  const storage = {
    read: vi.fn().mockResolvedValue([{ item: bookmark, folderPath: [] }]),
    write: vi.fn().mockResolvedValue(undefined),
  };
  const cache = createBookmarkCache(loadBookmarks, { storage });

  const restored = await cache.getBookmarks();
  const fresh = await cache.getBookmarks({ preferFresh: true });

  expect(restored.cached).toBe(true);
  expect(restored.refreshing).toBe(true);
  expect(restored.results).toEqual([{ item: bookmark, folderPath: [] }]);
  expect(fresh.results).toEqual([{ item: updatedBookmark, folderPath: [] }]);
  expect(loadBookmarks).toHaveBeenCalledTimes(1);
  expect(storage.write).toHaveBeenCalledWith([{ item: updatedBookmark, folderPath: [] }]);
});

test("bookmark cache treats an empty persisted cache as a cache hit", async () => {
  const loadBookmarks = vi.fn().mockResolvedValue([]);
  const storage = {
    read: vi.fn().mockResolvedValue([]),
    write: vi.fn().mockResolvedValue(undefined),
  };
  const cache = createBookmarkCache(loadBookmarks, { storage });

  const restored = await cache.getBookmarks();

  expect(restored.results).toEqual([]);
  expect(restored.cached).toBe(true);
  expect(loadBookmarks).toHaveBeenCalledTimes(1);
});

test("bookmark cache keeps an invalidation raised during a refresh", async () => {
  const bookmarkResults = [{ item: bookmark, folderPath: [] }];
  const refreshedResults = [{ item: updatedBookmark, folderPath: [] }];
  const retryResults = [{ item: { ...updatedBookmark, title: "Retried" }, folderPath: [] }];
  let resolveRefresh!: (results: typeof refreshedResults) => void;
  let resolveRetry!: (results: typeof retryResults) => void;
  const refreshPromise = new Promise<typeof refreshedResults>((resolve) => {
    resolveRefresh = resolve;
  });
  const retryPromise = new Promise<typeof retryResults>((resolve) => {
    resolveRetry = resolve;
  });
  const loadBookmarks = vi
    .fn()
    .mockResolvedValueOnce(bookmarkResults)
    .mockReturnValueOnce(refreshPromise)
    .mockReturnValueOnce(retryPromise);
  const cache = createBookmarkCache(loadBookmarks);

  await cache.getBookmarks();
  cache.markStale();
  await cache.getBookmarks();
  cache.markStale();
  resolveRefresh(refreshedResults);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const stillStale = await cache.getBookmarks();

  expect(stillStale.cached).toBe(true);
  expect(stillStale.refreshing).toBe(true);
  expect(loadBookmarks).toHaveBeenCalledTimes(3);
  resolveRetry(retryResults);
});

test("bookmark cache does not commit results loaded before invalidation", async () => {
  const initial = [{ item: bookmark, folderPath: [] }];
  const stale = [{ item: updatedBookmark, folderPath: [] }];
  const fresh = [{ item: { ...updatedBookmark, title: "Fresh" }, folderPath: [] }];
  let resolveFirstRefresh!: (results: typeof stale) => void;
  let resolveRetryRefresh!: (results: typeof fresh) => void;
  const firstRefresh = new Promise<typeof stale>((resolve) => {
    resolveFirstRefresh = resolve;
  });
  const retryRefresh = new Promise<typeof fresh>((resolve) => {
    resolveRetryRefresh = resolve;
  });
  const loadBookmarks = vi
    .fn()
    .mockResolvedValueOnce(initial)
    .mockReturnValueOnce(firstRefresh)
    .mockReturnValueOnce(retryRefresh);
  const storage = {
    read: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
  };
  const cache = createBookmarkCache(loadBookmarks, { storage });

  await cache.getBookmarks();
  storage.write.mockClear();
  cache.markStale();
  const staleResponse = cache.getBookmarks();
  cache.markStale();
  resolveFirstRefresh(stale);
  await staleResponse;
  await new Promise((resolve) => setTimeout(resolve, 0));

  const duringRetry = await cache.getBookmarks();
  expect(duringRetry.results).toEqual(initial);
  expect(duringRetry.cached).toBe(true);
  expect(duringRetry.refreshing).toBe(true);
  expect(loadBookmarks).toHaveBeenCalledTimes(3);
  expect(storage.write).not.toHaveBeenCalled();

  resolveRetryRefresh(fresh);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const afterRetry = await cache.getBookmarks();
  expect(afterRetry.results).toEqual(fresh);
  expect(storage.write).toHaveBeenCalledTimes(1);
});
test("markVisited bumps usage stats and persists them through storage", async () => {
  const loadBookmarks = vi.fn().mockResolvedValue([{ item: bookmark, folderPath: [] }]);
  const storage = {
    read: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
  };
  const cache = createBookmarkCache(loadBookmarks, { storage });

  await cache.getBookmarks();
  storage.write.mockClear();

  cache.markVisited("bookmark-1");

  const { item } = (await cache.getBookmarks()).results[0];
  expect(item.visitCount).toBe(1);
  expect(item.lastVisitedAt).toBeGreaterThan(0);
  expect(storage.write).toHaveBeenCalledWith([
    { item: { ...bookmark, visitCount: 1, lastVisitedAt: expect.any(Number) }, folderPath: [] },
  ]);
});

test("markVisited is a no-op for unknown ids or an empty cache", async () => {
  const cache = createBookmarkCache(vi.fn().mockResolvedValue([]));

  expect(() => cache.markVisited("missing")).not.toThrow();

  const { results } = await cache.getBookmarks();
  expect(results).toEqual([]);
});

test("late persisted cache restore cannot replace a completed fresh load", async () => {
  const oldResults = [{ item: bookmark, folderPath: [] }];
  const freshResults = [{ item: updatedBookmark, folderPath: [] }];
  let resolveRead!: (results: typeof oldResults) => void;
  const read = new Promise<typeof oldResults>((resolve) => { resolveRead = resolve; });
  const cache = createBookmarkCache(async () => freshResults, {
    storage: { read: () => read, write: async () => {} },
  });
  const normal = cache.getBookmarks();
  await cache.getBookmarks({ preferFresh: true });
  resolveRead(oldResults);
  expect((await normal).results).toEqual(freshResults);
  expect((await cache.getBookmarks()).results).toEqual(freshResults);
});

test("unreadable persisted cache still loads native bookmark data", async () => {
  const freshResults = [{ item: updatedBookmark, folderPath: [] }];
  const cache = createBookmarkCache(async () => freshResults, {
    storage: {
      read: async () => { throw new Error("storage unavailable"); },
      write: async () => {},
    },
  });
  expect((await cache.getBookmarks()).results).toEqual(freshResults);
});
