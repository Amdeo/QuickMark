// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BookmarkItem } from "../domain/types";
import { SearchApp } from "./SearchApp";
import { copyUrlToClipboard } from "./clipboard";

let results: BookmarkItem[];
const markVisited = vi.fn();
vi.mock("./useBookmarks", () => ({
  useBookmarks: () => ({
    bookmarks: results, results, isLoading: false, error: undefined,
    folderPaths: new Map(), refresh: vi.fn(), markVisited,
  }),
}));
vi.mock("./hooks/useTheme", () => ({
  useTheme: () => ({ themePref: "light", effectiveTheme: "light", cycleTheme: vi.fn() }),
}));
let searchHistory: string[] = [];
const clearSearchHistory = vi.fn(async () => { searchHistory = []; });
vi.mock("./hooks/useSearchHistory", () => ({
  useSearchHistory: () => ({ searchHistory, recordSearch: vi.fn(), clearSearchHistory }),
}));

let root: Root;
let container: HTMLDivElement;
let shadow: ShadowRoot;
let stored: Record<string, unknown>;
const openBookmark = vi.fn();
const onClose = vi.fn();

function item(id: string, url = `https://example.com/${id}`): BookmarkItem {
  return { id, title: `Page ${id}`, url, domain: new URL(url).hostname, visitCount: 1, source: "bookmark" };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("chrome", {
    runtime: { getURL: (path: string) => `https://extension.test${path}` },
    storage: {
      local: {
        get: vi.fn(async () => ({ ...stored })),
        set: vi.fn(async (next: Record<string, unknown>) => { Object.assign(stored, next); }),
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
  results = [item("first"), item("second"), item("third")];
  searchHistory = [];
  clearSearchHistory.mockClear();
  stored = {};
  openBookmark.mockReset().mockResolvedValue(undefined);
  markVisited.mockReset().mockResolvedValue(undefined);
  onClose.mockReset();
  container = document.createElement("div");
  shadow = container.attachShadow({ mode: "open" });
  document.body.append(container);
  root = createRoot(shadow);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  await act(async () => root.render(<SearchApp mode="modal" openBookmark={openBookmark} onClose={onClose} />));
}

function input() { return shadow.querySelector<HTMLInputElement>('[role="combobox"]')!; }
function button(label: string) { return shadow.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!; }
function menuItem(label: string) {
  return Array.from(shadow.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
    .find((option) => option.textContent === label)!;
}
async function click(target: Element) {
  await act(async () => target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true })));
}
async function key(target: Element, keyValue: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key: keyValue, bubbles: true, composed: true, cancelable: true, ...options });
  await act(async () => target.dispatchEvent(event));
  return event;
}
async function typeQuery(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  });
}

test("renders every same-domain page in ranked order without inserting a home URL", async () => {
  results = [item("a"), item("b", "https://other.test/b"), item("c"), item("d"), item("e")];
  await mount();
  const rows = Array.from(shadow.querySelectorAll('[role="option"]'));
  expect(rows.map((row) => row.id)).toEqual(results.map((result) => `quickmark-result-${result.id}`));
  expect(rows[2].textContent).toContain("example.com/c");
  expect(rows[2].querySelector('[title="https://example.com/c"]')).not.toBeNull();
});

test("keyboard navigation loads the next page without skipping the boundary result", async () => {
  results = Array.from({ length: 60 }, (_, index) => item(String(index)));
  await mount();
  expect(shadow.querySelector("#quickmark-result-50")).toBeNull();
  for (let index = 0; index < 50; index++) await key(input(), "ArrowDown");
  await key(input(), "Enter");
  expect(openBookmark).toHaveBeenCalledWith(results[50], false);
});

test("click opens that row even without hover and with a direct URL in the query", async () => {
  await mount();
  await typeQuery("https://different.test/");
  await click(shadow.querySelector("#quickmark-result-second")!);
  expect(openBookmark).toHaveBeenCalledWith(results[1], false);
});

test("Enter still navigates a typed URL rather than a matching row", async () => {
  await mount();
  await typeQuery("https://different.test/");
  await key(input(), "Enter", { ctrlKey: true });
  expect(openBookmark).toHaveBeenCalledWith(expect.objectContaining({ url: "https://different.test/" }), true);
});

test("a pinned website shows only its icon and opens its exact URL", async () => {
  await mount();
  await click(button("固定网站：Page second"));
  expect(openBookmark).not.toHaveBeenCalled();
  const strip = shadow.querySelector('section[aria-label="固定网站"]')!;
  // 固定图标并入筛选栏：与来源筛选胶囊同一行，不再自己占一行。
  const row = strip.parentElement!;
  expect(Array.from(row.querySelectorAll("button[aria-pressed]")).map((chip) => chip.textContent)).toEqual([
    "全部",
    "书签",
    "历史",
  ]);
  const shortcut = button("打开固定网站：Page second");
  expect(shortcut.textContent?.trim()).toBe("");
  const marker = strip.firstElementChild!;
  expect(marker.tagName.toLowerCase()).toBe("svg");
  expect(marker.compareDocumentPosition(shortcut) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  await click(shortcut);
  expect(openBookmark).toHaveBeenCalledWith(results[1], false);
  openBookmark.mockClear();
  await click(shadow.querySelector('section[aria-label="固定网站"] button[aria-label="取消固定：Page second"]')!);
  expect(shadow.querySelector('button[aria-label="打开固定网站：Page second"]')).toBeNull();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function drag(from: Element, to: Element) {
  const data = new Map<string, string>();
  const dataTransfer = {
    effectAllowed: "",
    dropEffect: "",
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? "",
  };
  const steps: Array<[Element, string]> = [
    [from, "dragstart"],
    [to, "dragover"],
    [to, "drop"],
    [from, "dragend"],
  ];
  for (const [target, type] of steps) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    target.dispatchEvent(event);
  }
}

test("pinned icons show their shortcut numbers and reorder by drag", async () => {
  await mount();
  await click(button("固定网站：Page first"));
  await click(button("固定网站：Page second"));
  await click(button("固定网站：Page third"));
  const strip = () => shadow.querySelector('section[aria-label="固定网站"]')!;
  const chips = () => Array.from(strip().querySelectorAll('button[aria-label^="打开固定网站："]'));
  const numbers = () => Array.from(strip().querySelectorAll('span[aria-hidden="true"]')).map((badge) => badge.textContent);

  expect(numbers()).toEqual(["1", "2", "3"]);
  await act(async () => drag(chips()[2], chips()[0]));
  await flush();

  expect(chips().map((chip) => chip.getAttribute("aria-label"))).toEqual([
    "打开固定网站：Page third",
    "打开固定网站：Page first",
    "打开固定网站：Page second",
  ]);
  expect(numbers()).toEqual(["1", "2", "3"]);
  expect(stored["quickmark-pinned-sites"]).toEqual([
    { url: results[2].url, title: results[2].title },
    { url: results[0].url, title: results[0].title },
    { url: results[1].url, title: results[1].title },
  ]);
  await key(input(), "1", { ctrlKey: true });
  expect(openBookmark).toHaveBeenCalledWith(results[2], false);
});

test("Ctrl+digit opens pinned sites while Shift+Ctrl+digit opens result rows", async () => {
  await mount();
  await click(button("固定网站：Page second"));
  await key(input(), "1", { ctrlKey: true });
  expect(openBookmark).toHaveBeenCalledWith(results[1], false);
  openBookmark.mockClear();
  await key(input(), "1", { ctrlKey: true, shiftKey: true });
  expect(openBookmark).toHaveBeenCalledWith(results[0], false);
  // 固定区与结果区修饰键分离，结果行角标恒为 1..9，不做偏移。
  const rows = Array.from(shadow.querySelectorAll('[role="option"]'));
  expect(rows[0].querySelector("span[aria-hidden]")?.textContent).toBe("1");
  expect(rows[1].querySelector("span[aria-hidden]")?.textContent).toBe("2");
});

test("typing a query hides the pin strip; Shift+Ctrl+digit opens results and Ctrl+digit still opens pins", async () => {
  await mount();
  await click(button("固定网站：Page second"));
  await typeQuery("page");
  expect(shadow.querySelector('section[aria-label="固定网站"]')).toBeNull();
  await key(input(), "1", { ctrlKey: true, shiftKey: true });
  expect(openBookmark).toHaveBeenCalledWith(results[0], false);
  openBookmark.mockClear();
  await key(input(), "1", { ctrlKey: true });
  expect(openBookmark).toHaveBeenCalledWith(results[1], false);
});

test("digit shortcuts out of range or with a dead modifier do nothing", async () => {
  await mount();
  await click(button("固定网站：Page first"));
  await key(input(), "2", { ctrlKey: true });
  expect(openBookmark).not.toHaveBeenCalled();
  await key(input(), "9", { ctrlKey: true, shiftKey: true });
  expect(openBookmark).not.toHaveBeenCalled();
  await key(input(), "1", { metaKey: true });
  expect(openBookmark).not.toHaveBeenCalled();
});

test("Alt+P still pins the selected row beside the Shift+Ctrl+digit mapping", async () => {
  await mount();
  await key(input(), "p", { altKey: true });
  expect(shadow.querySelector('section[aria-label="固定网站"]')).not.toBeNull();
  // 固定后该行移出结果列表，结果区首行顺延为 Page second。
  expect(shadow.querySelector("#quickmark-result-first")).toBeNull();
  await key(input(), "1", { ctrlKey: true, shiftKey: true });
  expect(openBookmark).toHaveBeenCalledWith(results[1], false);
});

test("a pinned site leaves the result list for its icon strip and comes back with a query", async () => {
  await mount();
  await click(button("固定网站：Page second"));
  const rowIds = () => Array.from(shadow.querySelectorAll('[role="option"]')).map((row) => row.id);
  expect(rowIds()).toEqual(["quickmark-result-first", "quickmark-result-third"]);
  await key(input(), "2", { ctrlKey: true, shiftKey: true });
  expect(openBookmark).toHaveBeenCalledWith(results[2], false);
  openBookmark.mockClear();

  // 图标条隐藏时固定项回到结果里，搜索仍然能找到它。
  await typeQuery("second");
  expect(shadow.querySelector('section[aria-label="固定网站"]')).toBeNull();
  expect(rowIds()).toContain("quickmark-result-second");
});

test("a saved pin remains usable even after its bookmark or history record disappears", async () => {
  stored["quickmark-pinned-sites"] = [{ url: "https://gone.test/path", title: "Saved site" }];
  await mount();
  await click(button("打开固定网站：Saved site"));
  expect(openBookmark).toHaveBeenCalledWith(expect.objectContaining({ url: "https://gone.test/path" }), false);
});

test("editing keys and Enter on a focused button are not hijacked by result navigation", async () => {
  await mount();
  await typeQuery("abc");
  expect((await key(input(), "ArrowLeft")).defaultPrevented).toBe(false);
  input().setSelectionRange(0, 2);
  expect((await key(input(), "c", { ctrlKey: true })).defaultPrevented).toBe(false);
  const pinButton = button("固定网站：Page first");
  pinButton.focus();
  expect((await key(pinButton, "Enter")).defaultPrevented).toBe(false);
  expect(openBookmark).not.toHaveBeenCalled();
});

test("an empty box cycles the source filters with the arrow keys, a typed query keeps the cursor", async () => {
  await mount();
  const activeChip = () => shadow.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')!.textContent;
  expect(activeChip()).toBe("全部");
  expect((await key(input(), "ArrowRight")).defaultPrevented).toBe(true);
  expect(activeChip()).toBe("书签");
  await key(input(), "ArrowRight");
  expect(activeChip()).toBe("历史");
  await key(input(), "ArrowRight");
  expect(activeChip()).toBe("全部");
  await key(input(), "ArrowLeft");
  expect(activeChip()).toBe("历史");

  // 带修饰键的左右键交给系统（行首/词首跳转、选中），不抢来做筛选切换。
  await key(input(), "ArrowRight", { metaKey: true });
  await key(input(), "ArrowLeft", { altKey: true });
  expect(activeChip()).toBe("历史");

  await typeQuery("abc");
  expect((await key(input(), "ArrowLeft")).defaultPrevented).toBe(false);
  expect(activeChip()).toBe("历史");
});

test("merged filter menu narrows the time range, sorts, and closes on outside click", async () => {
  await mount();
  const trigger = shadow.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
  expect(trigger.textContent).toContain("筛选");
  await click(trigger);
  const checked = shadow.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')!;
  expect(checked.textContent).toBe("全部时间");
  expect(shadow.activeElement).toBe(checked);
  await key(checked, "ArrowDown");
  const today = shadow.activeElement as HTMLButtonElement;
  expect(today.textContent).toBe("今天");
  await click(today);
  expect(trigger.textContent).toContain("今天");
  expect(shadow.activeElement).toBe(trigger);
  expect(openBookmark).not.toHaveBeenCalled();

  await click(trigger);
  await click(menuItem("最近访问"));
  expect(stored["quickmark-sort-mode"]).toBe("recent");
  expect(trigger.textContent).toContain("今天 · 最近访问");

  await click(trigger);
  await act(async () => input().dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true })));
  expect(shadow.querySelector('[role="menu"]')).toBeNull();
});

test("space in an empty box opens recent searches, and Enter refills the highlighted one", async () => {
  searchHistory = ["react", "vite"];
  await mount();
  expect(shadow.querySelector('[role="listbox"][aria-label="最近搜索"]')).toBeNull();

  await key(input(), " ");
  const options = () => Array.from(shadow.querySelectorAll('#quickmark-recents [role="option"]'));
  expect(options().map((option) => option.textContent)).toEqual(["react", "vite"]);
  // 焦点留在搜索框：打开后仍可直接输入。
  expect(shadow.activeElement).toBe(input());
  expect(input().getAttribute("aria-activedescendant")).toBe("quickmark-recent-0");

  await key(input(), "ArrowDown");
  expect(shadow.activeElement).toBe(input());
  expect(shadow.querySelector("#quickmark-recent-1")!.getAttribute("aria-selected")).toBe("true");

  await key(input(), "Escape");
  expect(shadow.querySelector('[role="listbox"][aria-label="最近搜索"]')).toBeNull();
  expect(onClose).not.toHaveBeenCalled();

  await key(input(), " ");
  expect(input().getAttribute("aria-activedescendant")).toBe("quickmark-recent-0");
  await key(input(), "ArrowDown");
  await key(input(), "Enter");
  expect(input().value).toBe("vite");
  expect(shadow.querySelector('[role="listbox"][aria-label="最近搜索"]')).toBeNull();
  expect(openBookmark).not.toHaveBeenCalled();
});

test("space stays a normal character once the query has content", async () => {
  searchHistory = ["react"];
  await mount();
  await typeQuery("rea");
  const event = await key(input(), " ");
  expect(event.defaultPrevented).toBe(false);
  expect(shadow.querySelector('[role="listbox"][aria-label="最近搜索"]')).toBeNull();
});

test("the recents popover clears the stored history and stops opening", async () => {
  searchHistory = ["react", "vite"];
  await mount();
  await key(input(), " ");
  const clear = Array.from(shadow.querySelectorAll("button"))
    .find((candidate) => candidate.textContent === "清空最近搜索")!;
  await click(clear);
  expect(clearSearchHistory).toHaveBeenCalled();
  expect(shadow.querySelector('[role="listbox"][aria-label="最近搜索"]')).toBeNull();
  await key(input(), " ");
  expect(shadow.querySelector('[role="listbox"][aria-label="最近搜索"]')).toBeNull();
});

test("navigation failure keeps the panel open and does not record a successful visit", async () => {
  openBookmark.mockRejectedValueOnce(new Error("tab gone"));
  await mount();
  await key(input(), "Enter");
  expect(onClose).not.toHaveBeenCalled();
  expect(markVisited).not.toHaveBeenCalled();
  expect(shadow.querySelector('[role="alert"]')).not.toBeNull();
  await key(input(), "Enter");
  expect(onClose).toHaveBeenCalledOnce();
});

test("clipboard rejection is surfaced rather than reported as copied", async () => {
  await expect(copyUrlToClipboard("https://example.com", {
    writeText: async () => { throw new Error("permission denied"); },
  })).rejects.toThrow("permission denied");
});
