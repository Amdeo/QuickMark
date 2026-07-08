import { getNativeBookmarks, isSearchablePageUrl } from "./chromeBookmarks";

test("isSearchablePageUrl rejects extension and browser internal pages", () => {
  expect(isSearchablePageUrl("https://example.com/docs")).toBe(true);
  expect(isSearchablePageUrl("http://example.com/docs")).toBe(true);
  expect(isSearchablePageUrl("chrome-extension://abc/popup.html")).toBe(false);
  expect(isSearchablePageUrl("chrome://extensions/")).toBe(false);
  expect(isSearchablePageUrl("edge://extensions/")).toBe(false);
  expect(isSearchablePageUrl("about:blank")).toBe(false);
  expect(isSearchablePageUrl("devtools://devtools/bundled/inspector.html")).toBe(false);
});

test("getNativeBookmarks filters extension pages from bookmarks and history", async () => {
  const originalChrome = globalThis.chrome;

  globalThis.chrome = {
    bookmarks: {
      getTree: async () => [
        {
          id: "root",
          title: "",
          children: [
            {
              id: "bookmark-1",
              title: "Example",
              url: "https://example.com/docs",
            },
            {
              id: "bookmark-extension",
              title: "Extension Popup",
              url: "chrome-extension://abc/popup.html",
            },
          ],
        },
      ],
    },
    history: {
      search: async () => [
        {
          id: "history-1",
          title: "Docs",
          url: "https://docs.example.com",
          lastVisitTime: 1000,
          visitCount: 2,
        },
        {
          id: "history-extension",
          title: "Extension Options",
          url: "chrome-extension://abc/options.html",
          lastVisitTime: 2000,
          visitCount: 3,
        },
      ],
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://quickmark${path}`,
    },
  } as unknown as typeof chrome;

  try {
    const results = await getNativeBookmarks();

    expect(results.map((result) => result.item.url)).toEqual([
      "https://example.com/docs",
      "https://docs.example.com",
    ]);
  } finally {
    globalThis.chrome = originalChrome;
  }
});
