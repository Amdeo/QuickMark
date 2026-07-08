import { getDisplayFolderPath, getNextVisibleResultCount, isNearScrollBottom, splitQueryMatch } from "./display";

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
