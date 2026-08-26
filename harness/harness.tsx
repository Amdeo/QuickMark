// 排序验证页：mock chrome API，渲染真实 SearchApp。
// 构建：npx esbuild harness/harness.tsx --bundle --format=iife --platform=browser --outfile=harness/bundle.js --define:process.env.NODE_ENV='"production"' && npx tailwindcss -i src/styles.css -o harness/styles.css --minify
// 数据刻意让 smart/recent/frequent/title 可区分：
// - message.bilibili.com 刚访问（18 分钟前）→ 最近访问应排第 1
// - 首页 44 次但 13 天未用 → 使用频率应上浮到第 4
// - GitHub 19 次但 1 小时前刚用 → 智能排序第 5，使用频率第 7
import React from "react";
import { createRoot } from "react-dom/client";
import { SearchApp } from "../src/search/SearchApp";

type BookmarkResult = {
  item: {
    id: string;
    title: string;
    url: string;
    domain: string;
    favicon?: string;
    lastVisitedAt?: number;
    visitCount: number;
    source?: "bookmark" | "history";
  };
  folderPath: string[];
};

const NOW = Date.now();

function results(): BookmarkResult[] {
  const mk = (
    id: string,
    title: string,
    url: string,
    visitCount: number,
    lastVisitedAt: number,
    source: "bookmark" | "history"
  ): BookmarkResult => ({
    item: { id, title, url, domain: new URL(url).hostname.replace(/^www\./, ""), visitCount, lastVisitedAt, source },
    folderPath: ["书签栏"],
  });
  return [
    mk("h-msg", "消息中心 - 哔哩哔哩", "https://message.bilibili.com/#/whisper", 3, NOW - 18 * 60_000, "history"),
    mk("h-itab", "新标签页", "https://go.itab.link/", 389, NOW - 58 * 60_000, "history"),
    mk("h-bili", "哔哩哔哩 弹幕视频网", "https://www.bilibili.com/", 74, NOW - 5 * 3_600_000, "history"),
    mk("h-kimi", "Kimi AI 官网 - K3 上线", "https://www.kimi.com/", 66, NOW - 6 * 3_600_000, "history"),
    mk("h-deep", "DeepSeek - 探索未至之境", "https://chat.deepseek.com/", 25, NOW - 7 * 3_600_000, "history"),
    mk("h-github", "GitHub", "https://github.com/", 19, NOW - 60 * 60_000, "history"),
    mk("h-home", "首页 - 江苏蔚之领域智能科技有限公司", "http://localhost:4000/", 44, NOW - 13 * 86_400_000, "history"),
    mk("h-agents", "AGENTS.md 1. Core Principles", "http://127.0.0.1:3080/", 8, NOW - 2 * 86_400_000, "history"),
    mk("h-vault", "Vaultwarden Web", "https://vault.yuandongbin.asia:8443/", 23, NOW - 8 * 86_400_000, "history"),
    mk("b-siyu", "Home - Siyu API", "https://siyu.site/", 7, NOW - 2 * 86_400_000, "bookmark"),
    mk("b-hermes", "Hermes Studio", "https://hermes.yuandongbin.asia:8443/", 5, NOW - 86_400_000, "bookmark"),
  ];
}

const globalChrome = {
  runtime: {
    id: "harness",
    sendMessage: async (message: { type: string }) => {
      if (message.type === "QUICKMARK_GET_BOOKMARKS") return { results: results(), cached: true };
      return {};
    },
  },
  storage: {
    local: { get: async () => ({}) },
    onChanged: { addListener() {}, removeListener() {} },
  },
} as unknown as typeof chrome;
(window as unknown as { chrome: unknown }).chrome = globalChrome;

// 与内容脚本一致：把面板渲染进 shadow root，用于复现/验证
// shadow 边界事件重定向导致的排序菜单点击失效 bug。
const host = document.getElementById("root")!;
host.style.cssText = "width: 768px; margin: 40px auto;";
const shadowHost = document.createElement("div");
shadowHost.style.cssText = "width: 768px;";
const shadow = shadowHost.attachShadow({ mode: "open" });
const app = document.createElement("div");
shadow.append(app);
host.append(shadowHost);
createRoot(app).render(<SearchApp mode="modal" />);