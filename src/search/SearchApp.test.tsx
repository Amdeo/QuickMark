import { renderToStaticMarkup } from "react-dom/server";
import type { BookmarkItem } from "../domain/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
});

test("SearchApp shows the compact URL with the full URL in the title attribute", async () => {
  const bookmark: BookmarkItem = {
    id: "bookmark-1",
    title: "Example Docs",
    url: "https://example.com/docs/deep/path?utm_source=quickmark",
    domain: "example.com",
    favicon: "",
    visitCount: 3,
    source: "bookmark",
  };

  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.doMock("./useBookmarks", () => ({
    useBookmarks: () => ({
      results: [bookmark],
      isLoading: false,
      error: undefined,
      folderPaths: new Map([["bookmark-1", ["Docs"]]]),
      refresh: vi.fn(),
      markVisited: vi.fn(),
    }),
  }));

  const { SearchApp } = await import("./SearchApp");
  const html = renderToStaticMarkup(<SearchApp />);

  expect(html).toContain(">example.com/docs/deep/path?utm_source=quickmark<");
  expect(html).toContain('title="https://example.com/docs/deep/path?utm_source=quickmark"');
});

test("copyUrlToClipboard writes the URL to the clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { platform: "MacIntel" });

  const { copyUrlToClipboard } = await import("./SearchApp");

  await copyUrlToClipboard("https://example.com/docs", { writeText });

  expect(writeText).toHaveBeenCalledWith("https://example.com/docs");
});

test("copyUrlToClipboard falls back to document copy when clipboard is unavailable", async () => {
  const textarea = {
    value: "",
    setAttribute: vi.fn(),
    select: vi.fn(),
    style: {} as CSSStyleDeclaration,
  };
  const appendChild = vi.fn();
  const removeChild = vi.fn();
  const execCommand = vi.fn().mockReturnValue(true);
  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.stubGlobal("document", {
    body: { appendChild, removeChild },
    createElement: vi.fn().mockReturnValue(textarea),
    execCommand,
  });

  const { copyUrlToClipboard } = await import("./SearchApp");

  await copyUrlToClipboard("https://example.com/docs", undefined);

  expect(textarea.value).toBe("https://example.com/docs");
  expect(appendChild).toHaveBeenCalledWith(textarea);
  expect(textarea.select).toHaveBeenCalled();
  expect(execCommand).toHaveBeenCalledWith("copy");
  expect(removeChild).toHaveBeenCalledWith(textarea);
});

test("SearchApp renders a copy link button for each result", async () => {
  const bookmark: BookmarkItem = {
    id: "bookmark-1",
    title: "Example Docs",
    url: "https://example.com/docs",
    domain: "example.com",
    favicon: "",
    visitCount: 3,
    source: "bookmark",
  };

  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.doMock("./useBookmarks", () => ({
    useBookmarks: () => ({
      results: [bookmark],
      isLoading: false,
      error: undefined,
      folderPaths: new Map(),
      refresh: vi.fn(),
      markVisited: vi.fn(),
    }),
  }));

  const { SearchApp } = await import("./SearchApp");
  const html = renderToStaticMarkup(<SearchApp />);

  expect(html).toContain('aria-label="复制链接：Example Docs"');
});

test("SearchApp initially renders only the first page of results", async () => {
  const results: BookmarkItem[] = Array.from({ length: 60 }, (_, index) => ({
    id: `bookmark-${index}`,
    title: `Example ${index}`,
    url: `https://site${index}.com/${index}`,
    domain: `site${index}.com`,
    favicon: "",
    visitCount: index,
    source: "bookmark",
  }));

  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.doMock("./useBookmarks", () => ({
    useBookmarks: () => ({
      results,
      isLoading: false,
      error: undefined,
      folderPaths: new Map(),
      refresh: vi.fn(),
      markVisited: vi.fn(),
    }),
  }));

  const { SearchApp } = await import("./SearchApp");
  const html = renderToStaticMarkup(<SearchApp />);

  expect(html).toContain("Example 49");
  expect(html).not.toContain("Example 50");
});

test("SearchApp collapses same-domain results with an expand button", async () => {
  const results: BookmarkItem[] = Array.from({ length: 5 }, (_, index) => ({
    id: `h-${index}`,
    title: `Kimi ${index}`,
    url: `https://www.kimi.com/page/${index}`,
    domain: "kimi.com",
    favicon: "",
    visitCount: 5,
    source: "history",
    lastVisitedAt: 1000 + index,
  }));

  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.doMock("./useBookmarks", () => ({
    useBookmarks: () => ({
      results,
      isLoading: false,
      error: undefined,
      folderPaths: new Map(),
      refresh: vi.fn(),
      markVisited: vi.fn(),
    }),
  }));

  const { SearchApp } = await import("./SearchApp");
  const html = renderToStaticMarkup(<SearchApp />);

  expect(html).toContain("kimi.com");
  expect(html).toContain("5 条");
  expect(html).toContain("还有 2 条");
  expect(html).toContain("Kimi 0");
  expect(html).toContain("Kimi 2");
  expect(html).not.toContain("Kimi 3");
});

test("SearchApp renders time filter chips with '全部时间' selected by default", async () => {
  const bookmark: BookmarkItem = {
    id: "bookmark-1",
    title: "Example Docs",
    url: "https://example.com/docs",
    domain: "example.com",
    favicon: "",
    visitCount: 3,
    source: "bookmark",
  };

  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.doMock("./useBookmarks", () => ({
    useBookmarks: () => ({
      results: [bookmark],
      isLoading: false,
      error: undefined,
      folderPaths: new Map(),
      refresh: vi.fn(),
      markVisited: vi.fn(),
    }),
  }));

  const { SearchApp } = await import("./SearchApp");
  const html = renderToStaticMarkup(<SearchApp />);

  expect(html).toContain("全部时间");
  expect(html).toContain("今天");
  expect(html).toContain("本周");
  expect(html).toContain("本月");
});

test("SearchApp renders the sort control closed with the smart mode label", async () => {
  const bookmark: BookmarkItem = {
    id: "bookmark-1",
    title: "Example Docs",
    url: "https://example.com/docs",
    domain: "example.com",
    favicon: "",
    visitCount: 3,
    source: "bookmark",
  };

  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.doMock("./useBookmarks", () => ({
    useBookmarks: () => ({
      results: [bookmark],
      isLoading: false,
      error: undefined,
      folderPaths: new Map(),
      refresh: vi.fn(),
      markVisited: vi.fn(),
    }),
  }));

  const { SearchApp } = await import("./SearchApp");
  const html = renderToStaticMarkup(<SearchApp />);

  expect(html).toContain("智能排序");
  expect(html).toContain('aria-haspopup="menu"');
  // The menu itself stays closed: sort options are not rendered.
  expect(html).not.toContain("最近访问");
  expect(html).not.toContain("标题 A-Z");
});

test("SearchApp shows the compact URL for duplicate titles inside a domain group", async () => {
  const results: BookmarkItem[] = [
    { id: "h0", title: "Kimi", url: "https://www.kimi.com/", domain: "kimi.com", favicon: "", visitCount: 5, source: "history", lastVisitedAt: 3000 },
    { id: "h1", title: "Kimi", url: "https://www.kimi.com/settings", domain: "kimi.com", favicon: "", visitCount: 4, source: "history", lastVisitedAt: 2000 },
    { id: "h2", title: "Kimi Chat", url: "https://www.kimi.com/chat", domain: "kimi.com", favicon: "", visitCount: 3, source: "history", lastVisitedAt: 1000 },
  ];

  vi.stubGlobal("navigator", { platform: "MacIntel" });
  vi.doMock("./useBookmarks", () => ({
    useBookmarks: () => ({
      results,
      isLoading: false,
      error: undefined,
      folderPaths: new Map(),
      refresh: vi.fn(),
      markVisited: vi.fn(),
    }),
  }));

  const { SearchApp } = await import("./SearchApp");
  const html = renderToStaticMarkup(<SearchApp />);

  // First row keeps its title, the duplicate shows the compact URL instead,
  // and a different title renders normally.
  expect(html).toContain(">Kimi<");
  expect(html).toContain(">kimi.com/settings<");
  expect(html).toContain('title="https://www.kimi.com/settings"');
  expect(html).toContain(">Kimi Chat<");
  expect(html).toContain(">kimi.com/chat<");
});
