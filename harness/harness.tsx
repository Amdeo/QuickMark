// 验证页：mock Chrome 数据与存储，渲染真实 Shadow DOM SearchApp。
// 构建：npx esbuild harness/harness.tsx --bundle --format=iife --platform=browser --outfile=harness/bundle.js --define:process.env.NODE_ENV='"production"' && npx tailwindcss -i src/styles.css -o harness/styles.css --minify
import React from "react";
import { createRoot } from "react-dom/client";
import { SearchApp } from "../src/search/SearchApp";
import type { BookmarkResult } from "../background/bookmarkCache";

const now = Date.now();
const hour = 3_600_000;
const fixtures: Array<[string, string, number, number]> = [
  ["GitHub", "https://github.com/", 19, 1],
  ["GitHub Issues", "https://github.com/issues", 3, 0.3],
  ["React 文档", "https://react.dev/", 66, 6],
  ["MDN Web Docs", "https://developer.mozilla.org/", 25, 7],
  ["Vite", "https://vite.dev/", 7, 2],
  ["TypeScript", "https://www.typescriptlang.org/", 44, 13 * 24],
  ["Vitest", "https://vitest.dev/", 8, 48],
  ["Chrome Extensions", "https://developer.chrome.com/docs/extensions/", 23, 8 * 24],
  ["GitHub Pull Requests", "https://github.com/pulls", 5, 24],
];
let results: BookmarkResult[] = fixtures.map(([title, url, visitCount, hoursAgo], index) => ({
  item: {
    id: String(index), title, url, visitCount, lastVisitedAt: now - hoursAgo * hour,
    domain: new URL(url).hostname.replace(/^www\./, ""),
    source: index % 3 === 0 ? "bookmark" : "history",
  },
  folderPath: index % 3 === 0 ? ["开发工具"] : [],
}));

type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;
const listeners = new Set<StorageListener>();
const stored = JSON.parse(localStorage.getItem("quickmark-harness") ?? "{}") as Record<string, unknown>;
function publish(changes: Record<string, chrome.storage.StorageChange>) {
  for (const listener of listeners) listener(changes, "local");
}

const globalChrome = {
  runtime: {
    id: "harness",
    getURL: () => "/public/icons/icon32.png",
    sendMessage: async (message: { type: string; id?: string }) => {
      if (message.type === "QUICKMARK_GET_BOOKMARKS") return { results, cached: true };
      if (message.type === "QUICKMARK_MARK_VISITED") {
        results = results.map((result) => result.item.id === message.id ? {
          ...result, item: { ...result.item, visitCount: result.item.visitCount + 1, lastVisitedAt: Date.now() },
        } : result);
        publish({ "quickmark.bookmark-cache-v1": { newValue: results } });
      }
      return {};
    },
  },
  storage: {
    local: {
      get: async (keys: string | string[]) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, stored[key]])),
      set: async (values: Record<string, unknown>) => {
        const changes = Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, { oldValue: stored[key], newValue }]));
        Object.assign(stored, values);
        localStorage.setItem("quickmark-harness", JSON.stringify(stored));
        publish(changes);
      },
    },
    onChanged: {
      addListener: (listener: StorageListener) => listeners.add(listener),
      removeListener: (listener: StorageListener) => listeners.delete(listener),
    },
  },
} as unknown as typeof chrome;
(window as unknown as { chrome: unknown }).chrome = globalChrome;

const host = document.getElementById("root")!;
host.style.cssText = "width:min(768px,calc(100% - 32px));margin:40px auto";
const shadow = host.attachShadow({ mode: "open" });
const styles = document.createElement("link");
styles.rel = "stylesheet";
styles.href = "./styles.css";
const app = document.createElement("div");
shadow.append(styles, app);
createRoot(app).render(<SearchApp mode="modal" openBookmark={async (item, newTab) => {
  // 记录实际导航目标，不离开验证页。
  host.dataset.openedUrl = item.url;
  host.dataset.openedNewTab = String(newTab);
}} />);
