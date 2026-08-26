import { getDisplayFolderPath, getNextVisibleResultCount, getScrollTarget, isNearScrollBottom, splitQueryMatch, formatRelativeTime, compactUrl } from "./display";

test("getDisplayFolderPath keeps short paths unchanged", () => {
  expect(getDisplayFolderPath(["前端", "React"])).toBe("前端 > React");
});

test("getDisplayFolderPath collapses long paths to the final levels", () => {
  expect(getDisplayFolderPath(["收集箱", "产品", "文章", "长标题测试目录"])).toBe("... > 文章 > 长标题测试目录");
});

test("splitQueryMatch returns a single plain segment when there is no query", () => {
  expect(splitQueryMatch("React Docs", "")).toEqual([{ text: "React Docs", match: false }]);
});

test("splitQueryMatch marks matching text without changing original casing", () => {
  expect(splitQueryMatch("React Documentation", "doc")).toEqual([
    { text: "React ", match: false },
    { text: "Doc", match: true },
    { text: "umentation", match: false },
  ]);
});

test("getNextVisibleResultCount appends one page without exceeding total", () => {
  expect(getNextVisibleResultCount(50, 120, 50)).toBe(100);
  expect(getNextVisibleResultCount(100, 120, 50)).toBe(120);
});

test("isNearScrollBottom detects when the user scrolls close to the end", () => {
  expect(isNearScrollBottom({ scrollTop: 650, clientHeight: 300, scrollHeight: 1000 }, 80)).toBe(true);
  expect(isNearScrollBottom({ scrollTop: 500, clientHeight: 300, scrollHeight: 1000 }, 80)).toBe(false);
});

test("formatRelativeTime renders friendly Chinese relative times", () => {
  const now = 1_000_000_000_000;
  expect(formatRelativeTime(now - 30_000, now)).toBe("刚刚");
  expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5 分钟前");
  expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("3 小时前");
  expect(formatRelativeTime(now - 25 * 3_600_000, now)).toBe("昨天");
  expect(formatRelativeTime(now - 4 * 86_400_000, now)).toBe("4 天前");
});

test("formatRelativeTime falls back to a date beyond a week", () => {
  const now = new Date(2026, 4, 20, 12, 0, 0).getTime();
  const past = new Date(2026, 3, 5, 9, 30, 0).getTime();
  expect(formatRelativeTime(past, now)).toBe("4月5日");
  expect(formatRelativeTime(now - 20 * 86_400_000, now)).toBe("4月30日");
  const lastYear = new Date(2025, 11, 31, 23, 0, 0).getTime();
  expect(formatRelativeTime(lastYear, now)).toBe("2025年12月31日");
});

test("compactUrl strips protocol, www, and trailing slashes", () => {
  expect(compactUrl("https://example.com/docs")).toBe("example.com/docs");
  expect(compactUrl("https://www.example.com/")).toBe("example.com");
  expect(compactUrl("http://example.com/a/b?q=1")).toBe("example.com/a/b?q=1");
  expect(compactUrl("https://kimi.com")).toBe("kimi.com");
});

describe("getScrollTarget", () => {
  const base = {
    scrollTop: 200,
    clientHeight: 600,
    scrollHeight: 1200,
    containerTop: 100,
    rowHeight: 40,
    anchor: 88,
  };

  test("moves upward when the selected row crosses the top anchor", () => {
    // 行视口位置 -150 < 88：向上滚 238，边界裁剪为 0。
    expect(getScrollTarget({ ...base, rowTop: -50 })).toBe(0);
    expect(getScrollTarget({ ...base, scrollTop: 600, rowTop: 50 })).toBe(462);
  });

  test("moves downward when the selected row crosses the bottom anchor", () => {
    // 行底 540 > 600-88：向下滚到行底落在锚点带上沿（600-88）。
    expect(getScrollTarget({ ...base, rowTop: 600 })).toBe(228);
  });

  test("clamps the target to the scroll boundaries", () => {
    expect(getScrollTarget({ ...base, scrollTop: 50, rowTop: -50 })).toBe(0);
    expect(getScrollTarget({ ...base, rowTop: 800 })).toBe(428);
  });

  test("returns no target when the selected row is comfortably visible", () => {
    expect(getScrollTarget({ ...base, rowTop: 200 })).toBeUndefined();
  });

  test("scrolls the row back into view when it is above the viewport at the bottom", () => {
    // 底部回归：行已滚出视口上方，必须向上滚动而不是被钳制在 maxScroll。
    const atBottom = {
      ...base,
      scrollTop: 600,
      clientHeight: 600,
      scrollHeight: 1200,
      rowTop: 20, // 相对容器 100 上方 80px，行顶在视口 -80 处
    };
    expect(getScrollTarget(atBottom)).toBe(432);
  });
});
