import { bookmarkResultsToState, getBookmarksFromRuntime, getCachedBookmarkResultsFromChange } from "./useBookmarks";
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

test("getBookmarksFromRuntime returns bookmark results and folder paths", async () => {
  const sendMessage = vi.fn().mockResolvedValue({
    results: [{ item: bookmark, folderPath: ["Docs"] }],
    cached: true,
    refreshing: true,
  });

  const response = await getBookmarksFromRuntime({
    sendMessage,
  }, { preferFresh: false });

  expect(sendMessage).toHaveBeenCalledWith({
    type: "QUICKMARK_GET_BOOKMARKS",
    preferFresh: false,
  });
  expect(response.items).toEqual([bookmark]);
  expect(response.folderPaths.get("bookmark-1")).toEqual(["Docs"]);
  expect(response.cached).toBe(true);
  expect(response.refreshing).toBe(true);
});

test("getBookmarksFromRuntime surfaces runtime failures", async () => {
  await expect(
    getBookmarksFromRuntime({
      sendMessage: async () => ({ error: "runtime unavailable" }),
    })
  ).rejects.toThrow("runtime unavailable");
});

test("getBookmarksFromRuntime surfaces generic failures", async () => {
  await expect(
    getBookmarksFromRuntime({
      sendMessage: async () => ({ error: "无法加载书签和历史记录。" }),
    })
  ).rejects.toThrow("无法加载书签和历史记录。");
});

test("bookmarkResultsToState returns items and folder paths", () => {
  const state = bookmarkResultsToState([{ item: bookmark, folderPath: ["Docs"] }]);

  expect(state.items).toEqual([bookmark]);
  expect(state.folderPaths.get("bookmark-1")).toEqual(["Docs"]);
});

test("getCachedBookmarkResultsFromChange extracts updated cache values", () => {
  const results = [{ item: bookmark, folderPath: ["Docs"] }];

  expect(
    getCachedBookmarkResultsFromChange({
      "quickmark-bookmark-cache-v1": { newValue: results },
    })
  ).toEqual(results);
});
