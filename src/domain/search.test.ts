import { createBookmarkSearchIndex, filterBySource, filterByTime, isHomeUrl, searchBookmarks, groupByDomain } from "./search";
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

describe("groupByDomain", () => {
  test("keeps single-domain results in one group in first-occurrence order", () => {
    const results: BookmarkItem[] = [
      { id: "h1", title: "Kimi", url: "https://www.kimi.com/", domain: "kimi.com", visitCount: 47, source: "history", lastVisitedAt: 5000 },
      { id: "h2", title: "Kimi", url: "https://www.kimi.com/settings", domain: "kimi.com", visitCount: 32, source: "history", lastVisitedAt: 4000 },
      { id: "b1", title: "React Docs", url: "https://react.dev", domain: "react.dev", visitCount: 5, source: "bookmark" },
      { id: "h3", title: "Kimi", url: "https://www.kimi.com/membership", domain: "kimi.com", visitCount: 19, source: "history", lastVisitedAt: 3000 },
    ];

    const groups = groupByDomain(results);

    expect(groups.map((g) => g.domain)).toEqual(["kimi.com", "react.dev"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["h1", "h2", "h3"]);
  });

  test("returns an empty list for no results", () => {
    expect(groupByDomain([])).toEqual([]);
  });
});

describe("filterByTime", () => {
  // 2026-05-20 is a Wednesday. Build relative dates to stay independent
  // of the day the test suite runs on.
  const now = new Date(2026, 4, 20, 12, 0, 0).getTime();
  function dateAt(daysAgo: number, hour = 12): number {
    const date = new Date(2026, 4, 20, hour, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    return date.getTime();
  }

  const timedItems: BookmarkItem[] = [
    { id: "today", title: "A", url: "https://a.com", domain: "a.com", visitCount: 1, source: "history", lastVisitedAt: dateAt(0, 10) },
    { id: "this-week", title: "B", url: "https://b.com", domain: "b.com", visitCount: 1, source: "history", lastVisitedAt: dateAt(1) },
    { id: "last-week", title: "C", url: "https://c.com", domain: "c.com", visitCount: 1, source: "history", lastVisitedAt: dateAt(3) },
    { id: "last-month", title: "D", url: "https://d.com", domain: "d.com", visitCount: 1, source: "history", lastVisitedAt: dateAt(40) },
    { id: "untimed", title: "E", url: "https://e.com", domain: "e.com", visitCount: 1, source: "bookmark" },
  ];

  test("returns all items when timeFilter is 'all'", () => {
    expect(filterByTime(timedItems, "all", now)).toHaveLength(5);
  });

  test("'today' keeps only items visited after midnight", () => {
    const result = filterByTime(timedItems, "today", now);
    expect(result.map((i) => i.id)).toEqual(["today"]);
  });

  test("'week' keeps Monday-to-now items and drops the previous Sunday", () => {
    const result = filterByTime(timedItems, "week", now);
    expect(result.map((i) => i.id)).toEqual(["today", "this-week"]);
  });

  test("'month' keeps everything since the 1st", () => {
    const result = filterByTime(timedItems, "month", now);
    expect(result.map((i) => i.id)).toEqual(["today", "this-week", "last-week"]);
  });

  test("items without a timestamp are excluded from every period filter", () => {
    const result = filterByTime(timedItems, "month", now);
    expect(result.some((i) => i.id === "untimed")).toBe(false);
  });

  test("the exact period boundary is inclusive", () => {
    const mondayMidnight = new Date(2026, 4, 18, 0, 0, 0).getTime();
    const items: BookmarkItem[] = [
      { id: "at-boundary", title: "X", url: "https://x.com", domain: "x.com", visitCount: 1, source: "history", lastVisitedAt: mondayMidnight },
      { id: "before", title: "Y", url: "https://y.com", domain: "y.com", visitCount: 1, source: "history", lastVisitedAt: mondayMidnight - 1 },
    ];
    const result = filterByTime(items, "week", now);
    expect(result.map((i) => i.id)).toEqual(["at-boundary"]);
  });
});

describe("searchBookmarks sort modes", () => {
  const sortItems: BookmarkItem[] = [
    { id: "a", title: "Alpha", url: "https://a.com", domain: "a.com", visitCount: 1, source: "bookmark", createdAt: 1000, lastVisitedAt: 3000 },
    { id: "b", title: "Beta", url: "https://b.com", domain: "b.com", visitCount: 5, source: "bookmark", createdAt: 2000, lastVisitedAt: 1000 },
    { id: "c", title: "Gamma", url: "https://c.com", domain: "c.com", visitCount: 3, source: "bookmark", createdAt: 3000, lastVisitedAt: 2000 },
  ];
  const sortFuse = createBookmarkSearchIndex(sortItems);

  test("'title' sorts alphabetically without a query", () => {
    const result = searchBookmarks(sortItems, "", sortFuse, "all", "all", "title");
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  test("'created' sorts newest first without a query", () => {
    const result = searchBookmarks(sortItems, "", sortFuse, "all", "all", "created");
    expect(result.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  test("'recent' sorts by last visit without a query", () => {
    const result = searchBookmarks(sortItems, "", sortFuse, "all", "all", "recent");
    expect(result.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  test("'frequent' sorts by usage without a query", () => {
    const result = searchBookmarks(sortItems, "", sortFuse, "all", "all", "frequent");
    expect(result.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  test("timeFilter narrows query results to the period", () => {
    const day = 86_400_000;
    // Noon today is always inside the "today" boundary regardless of the
    // clock time when the suite runs; 10 days ago is always outside it.
    const todayNoon = new Date().setHours(12, 0, 0, 0);
    const mixed: BookmarkItem[] = [
      { id: "fresh", title: "React Docs", url: "https://react.dev", domain: "react.dev", visitCount: 1, source: "history", lastVisitedAt: todayNoon },
      { id: "old", title: "React Blog", url: "https://react.dev/blog", domain: "react.dev", visitCount: 1, source: "history", lastVisitedAt: todayNoon - 10 * day },
    ];
    const mixedFuse = createBookmarkSearchIndex(mixed);

    const result = searchBookmarks(mixed, "react", mixedFuse, "all", "today");
    expect(result.map((i) => i.id)).toEqual(["fresh"]);
  });
});

describe("home page priority", () => {
  test("isHomeUrl detects root paths only", () => {
    expect(isHomeUrl("https://example.com")).toBe(true);
    expect(isHomeUrl("https://example.com/")).toBe(true);
    expect(isHomeUrl("https://example.com/?ref=x")).toBe(true);
    expect(isHomeUrl("https://example.com/docs")).toBe(false);
    expect(isHomeUrl("https://www.example.com/blog")).toBe(false);
    expect(isHomeUrl("not-a-url")).toBe(false);
  });

  test("home page ranks before sub-pages in every sort mode", () => {
    // The home entry is worst on every sort key (oldest visit, fewest
    // visits, earliest creation, later title), yet must still rank first.
    const items: BookmarkItem[] = [
      { id: "docs", title: "Docs", url: "https://react.dev/learn", domain: "react.dev", visitCount: 9, source: "bookmark", createdAt: 3000, lastVisitedAt: 3000 },
      { id: "home", title: "React", url: "https://react.dev", domain: "react.dev", visitCount: 1, source: "bookmark", createdAt: 1000, lastVisitedAt: 1000 },
      { id: "blog", title: "Blog", url: "https://react.dev/blog", domain: "react.dev", visitCount: 5, source: "bookmark", createdAt: 2000, lastVisitedAt: 2000 },
    ];
    const fuse = createBookmarkSearchIndex(items);

    const modes = ["smart", "recent", "frequent", "title", "created", "relevance"] as const;
    for (const mode of modes) {
      const result = searchBookmarks(items, "", fuse, "all", "all", mode);
      expect(result[0]?.id).toBe("home");
      expect(result[0]?.url).toBe("https://react.dev");
    }
  });
});
