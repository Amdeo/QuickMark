import { getExtensionFaviconUrl } from "../adapters/favicon";
import { palette, withAlpha, type Theme } from "../design/tokens";

const HOST_ID = "quickmark-tabs-root";

// 颜色令牌统一来自 src/design/tokens.ts（事实源为 styles.css，与 DESIGN.md
// 同步），双主题跟随 prefers-color-scheme；布局参数仍保持内联以保证 Shadow
// DOM 自包含。设计语言与搜索面板一致：primary 蓝 accent、24px 面板圆角、
// 三层软阴影、Inter + system mono、悬浮卡片行、selected = primary-fixed 40%
// + inset ring。

/** 由共享调色板生成 :host 内的 CSS 变量。 */
function themeVars(theme: Theme): string {
  const p = palette[theme];
  return [
    `--qt-bg: ${p.surface1};                 /* surface-1 */`,
    `--qt-bg2: ${p.surface2};                /* surface-2 */`,
    `--qt-bg3: ${p.surface3};                /* surface-3 */`,
    `--qt-bg4: ${p.surface4};                /* surface-4 */`,
    `--qt-hairline: ${p.hairline};`,
    `--qt-ink: ${p.ink};`,
    `--qt-ink-muted: ${p.inkMuted};`,
    `--qt-ink-subtle: ${p.inkSubtle};`,
    `--qt-primary: ${p.primary};`,
    `--qt-on-primary: ${p.onPrimary};`,
    `--qt-sel-bg: ${withAlpha(p.primaryFixed, 0.4)};   /* primary-fixed 40% */`,
    `--qt-sel-ring: ${withAlpha(p.primary, 0.15)};`,
    `--qt-error: ${p.error};`,
    `--qt-error-bg: ${p.errorContainer};`,
  ].join("\n    ");
}

const STYLE = `
  :host {
    all: initial;
    ${themeVars("light")}
  }
  @media (prefers-color-scheme: dark) {
    :host {
      ${themeVars("dark")}
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .qt-overlay {
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(0, 0, 0, 0.15); backdrop-filter: blur(6px);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 8vh 16px 16px;
    font: 400 14px Inter, ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0; color: var(--qt-ink);
    animation: qt-fade 200ms ease-out;
  }
  .qt-panel {
    width: 768px; height: 600px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
    display: flex; flex-direction: column;
    background: var(--qt-bg); border: 1px solid var(--qt-hairline); border-radius: 24px;
    box-shadow: 0 24px 56px -20px rgba(15,23,42,0.22), 0 8px 24px -12px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04);
    overflow: hidden;
    animation: qt-rise 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes qt-fade { from { opacity: 0; } }
  @keyframes qt-rise { from { opacity: 0; transform: translateY(16px) scale(0.96); } }
  .qt-searchwrap { padding: 18px 20px 12px; }
  .qt-search {
    display: flex; align-items: center; height: 46px; border: 1px solid var(--qt-hairline); border-radius: 12px;
    background: var(--qt-bg3); padding: 0 12px;
  }
  .qt-search:focus-within { border-color: var(--qt-primary); box-shadow: 0 0 0 3px var(--qt-sel-ring); }
  .qt-search svg { width: 18px; height: 18px; color: var(--qt-primary); margin-right: 9px; flex: none; }
  .qt-search input {
    flex: 1; min-width: 0; background: transparent; border: 0; outline: 0;
    color: var(--qt-ink); font-size: 15px; font-family: inherit;
  }
  .qt-search input::placeholder { color: var(--qt-ink-subtle); }
  .qt-kbd {
    font: 500 10px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--qt-ink-subtle);
    background: var(--qt-bg3); border: 1px solid var(--qt-hairline); border-radius: 4px;
    padding: 2px 6px; white-space: nowrap;
  }
  .qt-filters { display: flex; gap: 6px; margin-top: 12px; }
  .qt-filter {
    display: flex; align-items: center; gap: 4px;
    color: var(--qt-ink-subtle); background: var(--qt-bg3); border: 1px solid var(--qt-hairline);
    padding: 5px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; font-family: inherit;
    transition: background .15s, border-color .15s, color .15s;
  }
  .qt-filter:hover { color: var(--qt-ink); }
  .qt-filter.on { color: var(--qt-on-primary); background: var(--qt-primary); border-color: transparent; }
  .qt-filter .qt-count { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .qt-body { flex: 1; min-height: 0; padding: 2px 12px 10px; overflow-y: auto; }
  .qt-head {
    display: flex; justify-content: space-between; padding: 0 8px 8px;
    color: var(--qt-ink-muted); font-size: 11px; text-transform: uppercase;
    letter-spacing: .05em; font-weight: 700;
  }
  .qt-head .qt-muted { color: var(--qt-ink-subtle); font-weight: 500; text-transform: none; letter-spacing: 0; }
  .qt-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .qt-item {
    min-height: 52px; padding: 8px 9px; display: flex; align-items: center; gap: 9px;
    border: 1px solid transparent; border-radius: 12px; background: transparent; text-align: left;
    cursor: pointer; font-family: inherit; width: 100%; color: var(--qt-ink);
    transition: background .15s, border-color .15s;
  }
  .qt-item:hover { background: var(--qt-bg2); }
  .qt-item.on { background: var(--qt-sel-bg); box-shadow: inset 0 0 0 1px var(--qt-sel-ring); }
  .qt-item.on:hover { background: var(--qt-sel-bg); }
  .qt-fav {
    width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
    flex: none; position: relative; background: var(--qt-bg3); border: 1px solid var(--qt-hairline);
    color: var(--qt-ink-subtle); font-weight: 800; font-size: 11px;
  }
  .qt-fav img { width: 100%; height: 100%; display: block; border-radius: 7px; }
  .qt-dot {
    position: absolute; right: -2px; bottom: -2px; width: 8px; height: 8px;
    border-radius: 50%; background: var(--qt-primary);
    border: 1.5px solid var(--qt-bg);
  }
  .qt-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; }
  .qt-tname { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 600; }
  .qt-turl { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--qt-ink-subtle); font-size: 12px; margin-top: 3px; }
  .qt-meta { display: flex; align-items: center; gap: 8px; color: var(--qt-ink-subtle); font-size: 10px; flex: none; }
  /* pin 自带容器背景，避免与选中行的 ⌘N chip（同色 primary 底）贴边融为一体。 */
  .qt-meta .qt-pin {
    width: 18px; height: 18px; display: grid; place-items: center; flex: none;
    background: var(--qt-bg3); border: 1px solid var(--qt-hairline); border-radius: 5px;
    color: var(--qt-primary);
  }
  .qt-item.on .qt-kbd { background: var(--qt-primary); color: var(--qt-on-primary); border-color: transparent; }
  .qt-close {
    display: flex; width: 28px; height: 28px; align-items: center; justify-content: center;
    border: 0; border-radius: 7px; background: transparent; color: var(--qt-ink-subtle);
    cursor: pointer; opacity: 0; transition: color .15s, background .15s, opacity .15s;
  }
  .qt-item:hover .qt-close, .qt-item:focus-within .qt-close, .qt-item.on .qt-close { opacity: 1; }
  .qt-close:hover, .qt-close:focus-visible { background: var(--qt-error-bg); color: var(--qt-error); outline: none; }
  .qt-close:focus-visible { box-shadow: 0 0 0 2px var(--qt-sel-ring); }
  .qt-empty {
    padding: 48px 0; text-align: center; color: var(--qt-ink-subtle);
    display: flex; align-items: center; flex-direction: column; gap: 7px;
  }
  .qt-empty-icon {
    width: 48px; height: 48px; border-radius: 24px; display: grid; place-items: center;
    background: var(--qt-bg3); border: 1px solid var(--qt-hairline); color: var(--qt-ink-subtle);
    margin-bottom: 4px;
  }
  .qt-empty-icon svg { width: 20px; height: 20px; }
  .qt-empty strong { color: var(--qt-ink); font-size: 14px; font-weight: 600; }
  .qt-footer {
    border-top: 1px solid var(--qt-hairline); background: var(--qt-bg2);
    padding: 8px 20px; display: flex; gap: 14px; align-items: center;
    color: var(--qt-ink-subtle); font-size: 11px;
  }
  .qt-footer .qt-kbd { font-size: 10px; padding: 2px 4px; margin-right: 3px; }
  .qt-footer .qt-branding { margin-left: auto; font-weight: 800; color: var(--qt-ink-subtle); }
  .qt-footer .qt-branding b { color: var(--qt-primary); }
  .qt-scroll::-webkit-scrollbar { width: 8px; }
  .qt-scroll::-webkit-scrollbar-thumb { background: var(--qt-bg4); border-radius: 4px; }
  .qt-scroll::-webkit-scrollbar-track { background: transparent; }
  @media (max-width: 600px) {
    .qt-list { grid-template-columns: 1fr; }
    .qt-footer { gap: 8px; flex-wrap: wrap; }
  }
  @media (prefers-reduced-motion: reduce) {
    .qt-overlay, .qt-panel { animation: none; }
    .qt-item, .qt-filter, .qt-close { transition: none; }
  }
`;

type TabView = Pick<chrome.tabs.Tab, "id" | "index" | "title" | "url" | "pinned" | "windowId" | "favIconUrl" | "lastAccessed">;

type TabsResponse = {
  tabs: TabView[];
  activeId?: number;
};

type TabsState = {
  tabs: TabView[];
  activeId?: number;
  filter: "all" | "pinned" | "recent";
  selected: number;
};

const state: TabsState = { tabs: [], filter: "all", selected: 0 };
let host: HTMLDivElement | undefined;
let input: HTMLInputElement | undefined;
let listEl: HTMLDivElement | undefined;
let emptyEl: HTMLDivElement | undefined;
let winsEl: HTMLSpanElement | undefined;

const escapeHtml = (value: unknown): string =>
  String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);

function domain(url: string | undefined): string {
  try {
    const parsed = new URL(url ?? "");
    // chrome://、about:、view-source: 等内部页面统一归入"特殊页面"。
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "特殊页面";
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "特殊页面";
  }
}

function sortTabs(tabs: TabView[], filter: TabsState["filter"]): TabView[] {
  if (filter === "recent") {
    return [...tabs].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  }
  return [...tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.index - b.index);
}

function visibleTabs(): TabView[] {
  const query = input?.value.trim().toLowerCase() ?? "";
  return sortTabs(state.tabs, state.filter).filter((tab) => {
    // "recent" 不过滤记录，仅改变排序（MRU）。
    const matchesFilter = state.filter !== "pinned" || tab.pinned;
    const matchesQuery = !query || `${tab.title ?? ""} ${tab.url ?? ""}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
}

// Sites whose favicon failed to load. Skipped on subsequent opens so we render
// the letter immediately instead of re-issuing a doomed network request.
const failedFavicons = new Set<string>();

function faviconHtml(tab: TabView): string {
  if (tab.url && !failedFavicons.has(tab.url)) {
    return `<img src="${escapeHtml(getExtensionFaviconUrl(tab.url, 32))}" alt="" loading="lazy" decoding="async" />`;
  }
  return escapeHtml((tab.title || "?")[0]?.toUpperCase() ?? "?");
}

const PIN_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.5 3 21 9.5l-2.4 2.4-1.2-.4-4.6 4.6-.4-1.2z"/></svg>';
const CLOSE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function render(): void {
  if (!host || !listEl || !emptyEl || !winsEl) return;
  const tabs = visibleTabs();
  const allCount = host.querySelector<HTMLElement>(".qt-all");
  const pinnedCount = host.querySelector<HTMLElement>(".qt-pinned");
  if (allCount) allCount.textContent = String(state.tabs.length);
  if (pinnedCount) pinnedCount.textContent = String(state.tabs.filter((tab) => tab.pinned).length);
  winsEl.textContent = `${new Set(state.tabs.map((tab) => tab.windowId)).size} 个窗口`;
  emptyEl.style.display = tabs.length ? "none" : "flex";
  listEl.innerHTML = tabs
    .map(
      (tab, index) => `
        <div class="qt-item ${index === state.selected ? "on" : ""}" id="qt-option-${index}" data-index="${index}" role="option" aria-selected="${index === state.selected}">
          <span class="qt-fav">${faviconHtml(tab)}${tab.id === state.activeId ? '<i class="qt-dot" title="当前标签页" aria-label="当前标签页"></i>' : ""}</span>
          <span class="qt-copy"><span class="qt-tname">${escapeHtml(tab.title || "无标题")}</span><span class="qt-turl">${escapeHtml(domain(tab.url))}</span></span>
          <span class="qt-meta">${tab.pinned ? `<span class="qt-pin" title="已固定">${PIN_SVG}</span>` : ""}${index < 9 ? `<span class="qt-kbd">⌘${index + 1}</span>` : ""}<button class="qt-close" type="button" data-tab-id="${tab.id ?? ""}" aria-label="关闭标签页：${escapeHtml(tab.title || "无标题")}" title="关闭标签页">${CLOSE_SVG}</button></span>
        </div>`,
    )
    .join("");
  const optionId = tabs[state.selected] ? `qt-option-${state.selected}` : "";
  if (optionId) {
    input?.setAttribute("aria-activedescendant", optionId);
  } else {
    input?.removeAttribute("aria-activedescendant");
  }
}
function closeTab(tabId: number, index: number): void {
  void sendMessage<{ ok: boolean }>({ type: "QUICKMARK_CLOSE_TAB", tabId }).then((response) => {
    if (response?.ok) {
      state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
      const nextTabs = visibleTabs();
      state.selected = Math.min(index, Math.max(nextTabs.length - 1, 0));
      render();
      return;
    }
    refresh();
  });
}

function sendMessage<T>(message: Record<string, unknown>): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: T | undefined) => {
      resolve(response);
    });
  });
}

function activate(index = state.selected): void {
  const tab = visibleTabs()[index];
  if (tab?.id == null || tab.windowId == null) return;
  void sendMessage({ type: "QUICKMARK_ACTIVATE_TAB", tabId: tab.id, windowId: tab.windowId });
  closeTabsOverlay();
}

function refresh(): void {
  void sendMessage<TabsResponse>({ type: "QUICKMARK_LIST_TABS" }).then((response) => {
    if (!response || !Array.isArray(response.tabs)) return;
    state.tabs = response.tabs;
    state.activeId = response.activeId;
    state.selected = Math.min(state.selected, Math.max(state.tabs.length - 1, 0));
    render();
  });
}

function closeTabsOverlay(): void {
  host?.remove();
  host = undefined;
  input = undefined;
  listEl = undefined;
  emptyEl = undefined;
  winsEl = undefined;
}

function move(delta: number): void {
  const total = visibleTabs().length;
  if (total === 0) return;
  state.selected = Math.max(0, Math.min(state.selected + delta, total - 1));
  render();
  listEl?.querySelector<HTMLElement>(".qt-item.on")?.scrollIntoView({ block: "nearest" });
}

function openTabsOverlay(): void {
  if (host?.isConnected) {
    input?.focus();
    return;
  }

  host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  shadow.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "qt-overlay";
  overlay.setAttribute("role", "presentation");
  overlay.innerHTML = `
    <div class="qt-panel" role="dialog" aria-modal="true" aria-label="QuickMark 标签切换">
      <div class="qt-searchwrap">
        <div class="qt-search">
          ${SEARCH_SVG}
          <input placeholder="搜索标签页、网址..." autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="qt-listbox" aria-label="搜索标签页和网址" />
          <span class="qt-kbd">⌘ ⇧ O</span>
        </div>
        <div class="qt-filters" role="group" aria-label="标签页筛选">
          <button class="qt-filter on" data-filter="all" type="button" aria-pressed="true">全部 <span class="qt-count qt-all">0</span></button>
          <button class="qt-filter" data-filter="pinned" type="button" aria-pressed="false">已固定 <span class="qt-count qt-pinned">0</span></button>
          <button class="qt-filter" data-filter="recent" type="button" aria-pressed="false">最近使用</button>
        </div>
      </div>
      <div class="qt-body qt-scroll">
        <div class="qt-head"><span>标签页</span><span class="qt-muted qt-wins">正在读取...</span></div>
        <div class="qt-list" id="qt-listbox" role="listbox" aria-label="打开的标签页"></div>
        <div class="qt-empty" style="display:none">
          <div class="qt-empty-icon">${SEARCH_SVG}</div>
          <strong>没有找到匹配的标签页</strong>
          <span>试试搜索标题或网址</span>
        </div>
      </div>
      <div class="qt-footer">
        <span><span class="qt-kbd">←↑↓→</span>导航</span>
        <span><span class="qt-kbd">↵</span>切换</span>
        <span><span class="qt-kbd">Del</span>关闭</span>
        <span><span class="qt-kbd">esc</span>退出</span>
        <span><span class="qt-kbd">⌘1-9</span>直达</span>
        <span class="qt-branding">QuickMark <b>●</b></span>
      </div>
    </div>`;
  shadow.appendChild(overlay);

  input = overlay.querySelector<HTMLInputElement>(".qt-search input") ?? undefined;
  listEl = overlay.querySelector<HTMLDivElement>(".qt-list") ?? undefined;
  emptyEl = overlay.querySelector<HTMLDivElement>(".qt-empty") ?? undefined;
  winsEl = overlay.querySelector<HTMLSpanElement>(".qt-wins") ?? undefined;
  state.selected = 0;
  if (input) input.value = "";

  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) closeTabsOverlay();
  });

  // 事件委托：click 冒泡 + error 捕获（error 不冒泡），渲染列表时不再逐个绑定。
  listEl?.addEventListener("click", (event) => {
    const target = event.target as Element;
    const item = target.closest<HTMLElement>(".qt-item");
    if (!item) return;
    const index = Number(item.dataset.index);
    if (Number.isInteger(index)) {
      const closeButton = target.closest<HTMLElement>(".qt-close");
      if (closeButton) {
        const tabId = Number(closeButton.dataset.tabId);
        if (Number.isInteger(tabId)) closeTab(tabId, index);
      } else {
        activate(index);
      }
    }
  });
  listEl?.addEventListener(
    "error",
    (event) => {
      const img = event.target as HTMLImageElement;
      if (img.tagName !== "IMG") return;
      const tab = visibleTabs()[Number(img.closest<HTMLElement>(".qt-item")?.dataset.index)];
      if (tab?.url) failedFavicons.add(tab.url);
      img.replaceWith(document.createTextNode((tab?.title || "?")[0]?.toUpperCase() ?? "?"));
    },
    true,
  );

  overlay.querySelectorAll<HTMLButtonElement>(".qt-filter").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      if (filter !== "all" && filter !== "pinned" && filter !== "recent") return;
      state.filter = filter;
      state.selected = 0;
      overlay.querySelectorAll<HTMLButtonElement>(".qt-filter").forEach((item) => {
        const on = item === button;
        item.classList.toggle("on", on);
        item.setAttribute("aria-pressed", String(on));
      });
      render();
    });
  });
  input?.addEventListener("input", () => {
    state.selected = 0;
    render();
  });
  overlay.addEventListener("keydown", (event) => {
    // 输入框内正在编辑文本时，退格/删除与 ←→ 让位给光标移动；
    // 输入框为空时保留列表语义（Backspace 关标签页、←→ 横向导航）。
    const editing = event.target === input && (input?.value ?? "") !== "";
    if (event.key === "Escape") {
      event.preventDefault();
      // Raycast 惯例：第一次 Esc 清空查询，第二次关闭。
      if (input?.value) {
        input.value = "";
        state.selected = 0;
        render();
      } else {
        closeTabsOverlay();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(2);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-2);
      return;
    }
    if (event.key === "ArrowRight") {
      if (editing) return;
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowLeft") {
      if (editing) return;
      event.preventDefault();
      move(-1);
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && !editing) {
      event.preventDefault();
      const tab = visibleTabs()[state.selected];
      if (tab?.id != null) closeTab(tab.id, state.selected);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activate();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) {
      event.preventDefault();
      activate(Number(event.key) - 1);
    }
  });

  document.documentElement.appendChild(host);
  refresh();
  requestAnimationFrame(() => input?.focus());
}

export async function toggleTabsOverlay(): Promise<void> {
  if (host?.isConnected) {
    closeTabsOverlay();
  } else {
    openTabsOverlay();
  }
}
