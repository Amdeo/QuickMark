import { createBookmarkSearchIndex, ensurePinyinLoaded, filterBySource, filterByTime, isHomeUrl, searchBookmarks, groupByDomain, resolveDirectUrl } from "./search";
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
  test("keeps group order but puts the pathless root URL first within its group", () => {
    const results: BookmarkItem[] = [
      { id: "h1", title: "Kimi 设置", url: "https://www.kimi.com/settings", domain: "kimi.com", visitCount: 47, source: "history", lastVisitedAt: 5000 },
      { id: "b1", title: "React Docs", url: "https://react.dev", domain: "react.dev", visitCount: 5, source: "bookmark" },
      { id: "h2", title: "Kimi", url: "https://www.kimi.com/", domain: "kimi.com", visitCount: 32, source: "history", lastVisitedAt: 4000 },
      { id: "h3", title: "Kimi 会员", url: "https://www.kimi.com/membership", domain: "kimi.com", visitCount: 19, source: "history", lastVisitedAt: 3000 },
    ];

    const groups = groupByDomain(results);

    expect(groups.map((g) => g.domain)).toEqual(["kimi.com", "react.dev"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["h2", "h1", "h3"]);
  });

  test("generates a root URL when a group has only paths or query parameters", () => {
    const results: BookmarkItem[] = [
      { id: "settings", title: "Kimi 设置", url: "https://www.kimi.com/settings", domain: "kimi.com", favicon: "icon", visitCount: 5, source: "history" },
      { id: "campaign", title: "Kimi 活动", url: "https://www.kimi.com/?ref=campaign", domain: "kimi.com", visitCount: 3, source: "history" },
    ];

    const [group] = groupByDomain(results);

    expect(group.items.map((item) => item.url)).toEqual([
      "https://www.kimi.com/",
      "https://www.kimi.com/settings",
      "https://www.kimi.com/?ref=campaign",
    ]);
    expect(group.items[0]).toMatchObject({
      id: "quickmark-generated-home:kimi.com",
      title: "首页",
      domain: "kimi.com",
      favicon: "icon",
      visitCount: 0,
    });
  });

  test("uses a real root URL from the current filter before generating one", () => {
    const results: BookmarkItem[] = [
      { id: "settings", title: "Kimi 设置", url: "https://www.kimi.com/settings", domain: "kimi.com", visitCount: 5, source: "history" },
    ];
    const referenceItems: BookmarkItem[] = [
      { id: "home", title: "Kimi", url: "https://www.kimi.com/", domain: "kimi.com", visitCount: 8, source: "bookmark" },
      ...results,
    ];

    const [group] = groupByDomain(results, referenceItems);

    expect(group.items.map((item) => item.id)).toEqual(["home", "settings"]);
    expect(group.count).toBe(1);
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

describe("root URL detection", () => {
  test("detects only bare primary domains without params or anchors", () => {
    expect(isHomeUrl("https://example.com")).toBe(true);
    expect(isHomeUrl("https://example.com/")).toBe(true);
    expect(isHomeUrl("https://example.com/?ref=x")).toBe(false);
    expect(isHomeUrl("https://example.com/#top")).toBe(false);
    expect(isHomeUrl("https://example.com/docs")).toBe(false);
    expect(isHomeUrl("https://www.example.com/blog")).toBe(false);
    expect(isHomeUrl("not-a-url")).toBe(false);
  });
});
