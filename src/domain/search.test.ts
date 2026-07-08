import { createBookmarkSearchIndex, filterBySource, searchBookmarks } from "./search";
import type { BookmarkItem } from "./types";

const items: BookmarkItem[] = [
  { id: "b1", title: "React Docs", url: "https://react.dev", domain: "react.dev", visitCount: 5, source: "bookmark" },
  { id: "b2", title: "Vue Guide", url: "https://vuejs.org", domain: "vuejs.org", visitCount: 3, source: "bookmark" },
  { id: "h1", title: "GitHub", url: "https://github.com", domain: "github.com", visitCount: 10, source: "history" },
  { id: "h2", title: "Stack Overflow", url: "https://stackoverflow.com", domain: "stackoverflow.com", visitCount: 8, source: "history" },
];

const fuse = createBookmarkSearchIndex(items);

describe("filterBySource", () => {
  test("returns all items when filter is 'all'", () => {
    expect(filterBySource(items, "all")).toEqual(items);
  });

  test("returns only bookmarks when filter is 'bookmark'", () => {
    const result = filterBySource(items, "bookmark");
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.source === "bookmark")).toBe(true);
  });

  test("returns only history when filter is 'history'", () => {
    const result = filterBySource(items, "history");
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.source === "history")).toBe(true);
  });
});

describe("searchBookmarks", () => {
  test("empty query returns sorted items for 'all'", () => {
    const result = searchBookmarks(items, "", fuse, "all");
    expect(result).toHaveLength(4);
  });

  test("empty query returns only bookmarks when filtered", () => {
    const result = searchBookmarks(items, "", fuse, "bookmark");
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.source === "bookmark")).toBe(true);
  });

  test("empty query returns only history when filtered", () => {
    const result = searchBookmarks(items, "", fuse, "history");
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.source === "history")).toBe(true);
  });

  test("search filters by source before matching", () => {
    const result = searchBookmarks(items, "github", fuse, "bookmark");
    expect(result).toHaveLength(0);
  });

  test("search finds history items when filtered to history", () => {
    const result = searchBookmarks(items, "github", fuse, "history");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("history");
  });

  test("default filter is 'all'", () => {
    const result = searchBookmarks(items, "");
    expect(result).toHaveLength(4);
  });

  test("history filter sorts by lastVisitedAt descending", () => {
    const historyItems: BookmarkItem[] = [
      { id: "h1", title: "Old Site", url: "https://old.com", domain: "old.com", visitCount: 1, source: "history", lastVisitedAt: 1000 },
      { id: "h2", title: "New Site", url: "https://new.com", domain: "new.com", visitCount: 1, source: "history", lastVisitedAt: 5000 },
      { id: "h3", title: "Mid Site", url: "https://mid.com", domain: "mid.com", visitCount: 1, source: "history", lastVisitedAt: 3000 },
    ];
    const result = searchBookmarks(historyItems, "", createBookmarkSearchIndex(historyItems), "history");
    expect(result.map((i) => i.id)).toEqual(["h2", "h3", "h1"]);
  });

  test("history search tie-breaks by lastVisitedAt descending", () => {
    const historyItems: BookmarkItem[] = [
      { id: "h1", title: "GitHub", url: "https://github.com", domain: "github.com", visitCount: 1, source: "history", lastVisitedAt: 1000 },
      { id: "h2", title: "GitHub", url: "https://github.com", domain: "github.com", visitCount: 5, source: "history", lastVisitedAt: 5000 },
    ];
    const result = searchBookmarks(historyItems, "github", createBookmarkSearchIndex(historyItems), "history");
    expect(result[0].id).toBe("h2");
  });
});
