import { renderToStaticMarkup } from "react-dom/server";
import type { BookmarkItem } from "../domain/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
});

test("SearchApp shows the full result URL instead of only the domain", async () => {
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

  expect(html).toContain("https://example.com/docs/deep/path?utm_source=quickmark");
  expect(html).not.toContain(">example.com<");
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
    url: `https://example.com/${index}`,
    domain: "example.com",
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
