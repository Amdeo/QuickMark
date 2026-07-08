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
