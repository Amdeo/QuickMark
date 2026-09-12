import { createBookmarkSearchIndex, ensurePinyinLoaded, filterBySource, filterByTime, searchBookmarks, resolveDirectUrl } from "./search";
import type { BookmarkItem } from "./types";

afterEach(() => vi.restoreAllMocks());

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

  test("'frequent' ranks by raw visit count and differs from 'smart'", () => {
    // fresh：访问少但刚访问过；old：访问多但 30 天未用。
    // 智能排序看重近期活跃 → fresh 在前；使用频率只看次数 → old 在前。
    const now = Date.now();
    const day = 86_400_000;
    const freqItems: BookmarkItem[] = [
      { id: "old", title: "Old", url: "https://old.com", domain: "old.com", visitCount: 9, source: "history", lastVisitedAt: now - 30 * day },
      { id: "fresh", title: "Fresh", url: "https://fresh.com", domain: "fresh.com", visitCount: 1, source: "history", lastVisitedAt: now },
    ];
    const freqFuse = createBookmarkSearchIndex(freqItems);

    expect(searchBookmarks(freqItems, "", freqFuse, "all", "all", "smart").map((i) => i.id)).toEqual(["fresh", "old"]);
    expect(searchBookmarks(freqItems, "", freqFuse, "all", "all", "frequent").map((i) => i.id)).toEqual(["old", "fresh"]);
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

  test("smart ranking favors recent modest use over dormant high count", () => {
    const now = new Date(2026, 4, 20, 12).getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const candidates: BookmarkItem[] = [
      { id: "dormant", title: "Dormant", url: "https://example.com/old", domain: "example.com", visitCount: 100, lastVisitedAt: now - 60 * 86_400_000 },
      { id: "recent", title: "Recent", url: "https://example.com/new", domain: "example.com", visitCount: 2, lastVisitedAt: now - 86_400_000 },
    ];
    const result = searchBookmarks(candidates, "", createBookmarkSearchIndex(candidates), "all", "all", "smart");
    expect(result.map((item) => item.id)).toEqual(["recent", "dormant"]);
  });

  test("smart ranking does not give unvisited created bookmarks fabricated recency", () => {
    const now = new Date(2026, 4, 20, 12).getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const candidates: BookmarkItem[] = [
      { id: "created", title: "Created", url: "https://created.example", domain: "created.example", visitCount: 1, createdAt: now },
      { id: "visited", title: "Visited", url: "https://visited.example", domain: "visited.example", visitCount: 1, lastVisitedAt: now - 86_400_000 },
    ];
    const result = searchBookmarks(candidates, "", createBookmarkSearchIndex(candidates), "all", "all", "smart");
    expect(result.map((item) => item.id)).toEqual(["visited", "created"]);
  });

  test("smart sorting rewards frequency among equally recent visits", () => {
    const lastVisitedAt = new Date(2026, 4, 20, 12).getTime();
    vi.spyOn(Date, "now").mockReturnValue(lastVisitedAt);
    const candidates: BookmarkItem[] = [
      { id: "few", title: "Few", url: "https://few.example", domain: "few.example", visitCount: 2, lastVisitedAt },
      { id: "many", title: "Many", url: "https://many.example", domain: "many.example", visitCount: 8, lastVisitedAt },
    ];
    const result = searchBookmarks(candidates, "", createBookmarkSearchIndex(candidates), "all", "all", "smart");
    expect(result.map((item) => item.id)).toEqual(["many", "few"]);
  });

  test("same-domain results stay flat and preserve every exact URL", () => {
    const candidates: BookmarkItem[] = [
      { id: "one", title: "One", url: "https://same.example/one", domain: "same.example", visitCount: 1 },
      { id: "two", title: "Two", url: "https://same.example/two", domain: "same.example", visitCount: 1 },
    ];
    const result = searchBookmarks(candidates, "", createBookmarkSearchIndex(candidates), "all", "all", "title");
    expect(result.map((item) => item.url)).toEqual(["https://same.example/one", "https://same.example/two"]);
  });

  test("recent sorting uses actual last visits, never creation time fallback", () => {
    const candidates: BookmarkItem[] = [
      { id: "visited", title: "Visited", url: "https://visited.example", domain: "visited.example", visitCount: 1, createdAt: 1, lastVisitedAt: 2 },
      { id: "created", title: "Created", url: "https://created.example", domain: "created.example", visitCount: 1, createdAt: 9_999_999 },
    ];
    const result = searchBookmarks(candidates, "", createBookmarkSearchIndex(candidates), "all", "all", "recent");
    expect(result.map((item) => item.id)).toEqual(["visited", "created"]);
  });

});
describe("pinyin search", () => {
  const zhItems: BookmarkItem[] = [
    { id: "zhihu", title: "知乎 - 发现", url: "https://www.zhihu.com", domain: "zhihu.com", visitCount: 5, source: "bookmark" },
    { id: "react", title: "React 文档", url: "https://react.dev", domain: "react.dev", visitCount: 3, source: "bookmark" },
    { id: "github", title: "GitHub", url: "https://github.com", domain: "github.com", visitCount: 1, source: "bookmark" },
  ];

  // 拼音字典改为按需惰性加载，测试前先确保就绪。
  beforeAll(async () => {
    await ensurePinyinLoaded();
  });

  test("pinyin query matches a Chinese-only title", () => {
    const fuse = createBookmarkSearchIndex(zhItems);
    const result = searchBookmarks(zhItems, "zhihu", fuse);
    expect(result[0]?.id).toBe("zhihu");
  });

  test("pinyin query matches a mixed Chinese-English title", () => {
    const fuse = createBookmarkSearchIndex(zhItems);
    const result = searchBookmarks(zhItems, "wendang", fuse);
    expect(result[0]?.id).toBe("react");
  });

  test("spaced pinyin query matches", () => {
    const fuse = createBookmarkSearchIndex(zhItems);
    const result = searchBookmarks(zhItems, "zhi hu", fuse);
    expect(result[0]?.id).toBe("zhihu");
  });
});

describe("resolveDirectUrl", () => {
  test("returns https URL for a bare domain", () => {
    expect(resolveDirectUrl("github.com")).toBe("https://github.com");
  });

  test("handles subdomains, ports, and paths", () => {
    expect(resolveDirectUrl("docs.example.com")).toBe("https://docs.example.com");
    expect(resolveDirectUrl("example.com:8080/admin")).toBe("https://example.com:8080/admin");
    expect(resolveDirectUrl("example.com/a/b?q=1")).toBe("https://example.com/a/b?q=1");
  });

  test("passes through full http/https URLs unchanged", () => {
    expect(resolveDirectUrl("https://github.com/issues")).toBe("https://github.com/issues");
    expect(resolveDirectUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  test("rejects invalid ports and non-web protocols", () => {
    expect(resolveDirectUrl("https://example.com:99999")).toBeUndefined();
    expect(resolveDirectUrl("javascript:alert(1)")).toBeUndefined();
    expect(resolveDirectUrl("file:///tmp/example")).toBeUndefined();
  });

  test("handles localhost with a port", () => {
    expect(resolveDirectUrl("localhost:8080")).toBe("http://localhost:8080");
  });

  test("trims surrounding whitespace", () => {
    expect(resolveDirectUrl("  github.com  ")).toBe("https://github.com");
  });

  test("returns undefined for plain text queries", () => {
    expect(resolveDirectUrl("react docs")).toBeUndefined();
    expect(resolveDirectUrl("github")).toBeUndefined();
    expect(resolveDirectUrl("")).toBeUndefined();
    expect(resolveDirectUrl("react")).toBeUndefined();
  });

  test("rejects domain-like text containing spaces", () => {
    expect(resolveDirectUrl("two words.com")).toBeUndefined();
    expect(resolveDirectUrl("github.com/hello world")).toBeUndefined();
  });
});

