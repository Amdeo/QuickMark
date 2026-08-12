import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BookmarkItem } from "../domain/types";
import { Icon } from "../components/Icon";
import { getExtensionFaviconUrl } from "../adapters/favicon";
import { useBookmarks } from "./useBookmarks";
import { getDisplayFolderPath, getNextVisibleResultCount, isNearScrollBottom, splitQueryMatch, formatRelativeTime, compactUrl } from "./display";
import { groupByDomain, resolveDirectUrl, type SortMode, type SourceFilter, type TimeFilter } from "../domain/search";

const HISTORY_KEY = "quickmark-search-history";
const THEME_KEY = "quickmark-theme";
const MAX_HISTORY = 5;
const RESULT_PAGE_SIZE = 50;
const DEFAULT_ITEMS_PER_DOMAIN = 3;

const TIME_FILTERS: Array<{ value: TimeFilter; label: string }> = [
  { value: "all", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

const SORT_MODES: Array<{ value: SortMode; label: string }> = [
  { value: "smart", label: "智能排序" },
  { value: "recent", label: "最近访问" },
  { value: "frequent", label: "使用频率" },
  { value: "title", label: "标题 A-Z" },
  { value: "created", label: "创建时间" },
  { value: "relevance", label: "相关度优先" },
];

type ThemePreference = "light" | "dark" | "system";

// 搜索历史和主题保存在 chrome.storage.local，而非 localStorage：
// 内容脚本与宿主页面共享源，使用 localStorage 会按站点分散数据，
// 还会向访问过的页面暴露搜索词。

let memoryThemePreference: ThemePreference | undefined;
let themeLoadingPromise: Promise<ThemePreference> | undefined;

async function ensureThemePreferenceLoaded(): Promise<ThemePreference> {
  if (memoryThemePreference !== undefined) return memoryThemePreference;
  themeLoadingPromise ??= (async () => {
    let preference: ThemePreference = "system";
    try {
      const result = await chrome.storage.local.get(THEME_KEY);
      const raw = result[THEME_KEY];
      if (raw === "light" || raw === "dark" || raw === "system") {
        preference = raw;
      }
    } catch {
      /* 保留默认值 */
    }
    memoryThemePreference = preference;
    return preference;
  })();
  return themeLoadingPromise;
}

async function saveThemePreference(theme: ThemePreference): Promise<void> {
  memoryThemePreference = theme;
  try {
    await chrome.storage.local.set({ [THEME_KEY]: theme });
  } catch {
    /* 忽略持久化失败，内存中的主题仍然有效 */
  }
}

function getEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type ClipboardLike = {
  writeText: (text: string) => Promise<void>;
};

let memorySearchHistory: string[] | undefined;
let historyLoadingPromise: Promise<void> | undefined;

async function ensureSearchHistoryLoaded(): Promise<void> {
  if (memorySearchHistory !== undefined) return;
  if (historyLoadingPromise) {
    await historyLoadingPromise;
    return;
  }
  historyLoadingPromise = (async () => {
    try {
      const result = await chrome.storage.local.get(HISTORY_KEY);
      const raw = result[HISTORY_KEY];
      memorySearchHistory = Array.isArray(raw)
        ? raw.filter((entry): entry is string => typeof entry === "string")
        : [];
    } catch {
      memorySearchHistory = [];
    }
  })();
  await historyLoadingPromise;
}

function getSearchHistory(): string[] {
  return memorySearchHistory ?? [];
}

async function saveSearchHistory(history: string[]): Promise<void> {
  await ensureSearchHistoryLoaded();
  memorySearchHistory = history.slice(0, MAX_HISTORY);
  try {
    await chrome.storage.local.set({ [HISTORY_KEY]: memorySearchHistory });
  } catch {
    /* ignore */
  }
}

async function addSearchHistory(query: string): Promise<void> {
  const q = query.trim();
  if (!q) return;
  await ensureSearchHistoryLoaded();
  const history = getSearchHistory().filter((h) => h !== q);
  history.unshift(q);
  await saveSearchHistory(history);
}

export async function copyUrlToClipboard(
  url: string,
  clipboard: ClipboardLike | undefined = navigator.clipboard
): Promise<void> {
  if (clipboard) {
    await clipboard.writeText(url);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function isComposingEvent(event: { nativeEvent: KeyboardEvent }): boolean {
  return event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
}

type SearchAppProps = {
  mode?: "page" | "modal";
  onClose?: () => void;
  openBookmark?: (item: BookmarkItem, newTab: boolean) => Promise<void>;
};

export function SearchApp({ mode = "page", onClose, openBookmark = openBookmarkDefault }: SearchAppProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleResultCount, setVisibleResultCount] = useState(RESULT_PAGE_SIZE);
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => getEffectiveTheme("system"));
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("smart");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<BookmarkItem | undefined>(undefined);
  const [expandedDomains, setExpandedDomains] = useState<ReadonlySet<string>>(new Set());
  const [copyState, setCopyState] = useState<{ id: string; ok: boolean } | null>(null);
  const copyTimerRef = useRef<number | undefined>(undefined);
  const { results, isLoading, error, folderPaths, refresh, markVisited } = useBookmarks(query, sourceFilter, timeFilter, sortMode);

  // Address-bar semantics: a complete URL or bare domain navigates directly.
  const directUrl = useMemo(() => resolveDirectUrl(query), [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 仅加载一次持久化主题，随后同步用户偏好与系统主题变化。
  useEffect(() => {
    let cancelled = false;
    ensureThemePreferenceLoaded().then((preference) => {
      if (!cancelled) setThemePref(preference);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setEffectiveTheme(getEffectiveTheme(themePref));
  }, [themePref]);

  useEffect(() => {
    if (themePref !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setEffectiveTheme(getEffectiveTheme("system"));
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [themePref]);

  useEffect(() => {
    setSelectedIndex(0);
    setVisibleResultCount(RESULT_PAGE_SIZE);
  }, [query, sourceFilter, timeFilter, sortMode]);

  useEffect(() => {
    setVisibleResultCount((count) => Math.min(Math.max(count, RESULT_PAGE_SIZE), results.length || RESULT_PAGE_SIZE));
  }, [results.length]);

  useEffect(() => {
    if (selectedIndex >= visibleResultCount - 1) {
      setVisibleResultCount((count) =>
        Math.max(count, getNextVisibleResultCount(selectedIndex, results.length, RESULT_PAGE_SIZE))
      );
    }
  }, [results.length, selectedIndex, visibleResultCount]);

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    ensureSearchHistoryLoaded().then(() => setSearchHistory(getSearchHistory()));
  }, []);

  const { bookmarkCount, historyCount } = useMemo(() => {
    let b = 0;
    let h = 0;
    for (const r of results) {
      if (r.source === "history") h++;
      else b++;
    }
    return { bookmarkCount: b, historyCount: h };
  }, [results]);

  const statusText = useMemo(() => {
    if (isLoading) return "加载中";
    if (error) return "加载失败";
    if (!results.length) {
      if (query) return "无结果";
      if (timeFilter !== "all") return "该时间范围无记录";
      if (sourceFilter === "bookmark") return "无书签";
      if (sourceFilter === "history") return "无历史记录";
      return "无书签";
    }
    if (sourceFilter === "bookmark") return `书签 ${results.length}`;
    if (sourceFilter === "history") return `历史 ${results.length}`;
    const parts: string[] = [];
    if (bookmarkCount > 0) parts.push(`书签 ${bookmarkCount}`);
    if (historyCount > 0) parts.push(`历史 ${historyCount}`);
    return parts.join(" · ");
  }, [isLoading, error, query, results.length, bookmarkCount, historyCount, sourceFilter, timeFilter]);

  const loadedResults = useMemo(
    () => results.slice(0, visibleResultCount),
    [results, visibleResultCount]
  );

  const groups = useMemo(() => groupByDomain(loadedResults), [loadedResults]);

  const renderedGroups = useMemo(() => {
    let flatIndex = 0;
    return groups.map((group) => {
      const isGrouped = group.items.length > 1;
      const isExpanded = expandedDomains.has(group.domain);
      const items =
        isGrouped && !isExpanded
          ? group.items.slice(0, DEFAULT_ITEMS_PER_DOMAIN)
          : group.items;
      const entries = items.map((item) => ({ item, flatIndex: flatIndex++ }));
      return {
        group,
        isGrouped,
        isExpanded,
        entries,
      };
    });
  }, [groups, expandedDomains]);

  const visibleResults = useMemo(
    () => renderedGroups.flatMap((g) => g.entries.map((e) => e.item)),
    [renderedGroups]
  );

  const selected = visibleResults[selectedIndex];

  useEffect(() => {
    if (selectedIndex > Math.max(visibleResults.length - 1, 0)) {
      setSelectedIndex(Math.max(visibleResults.length - 1, 0));
    }
  }, [visibleResults.length, selectedIndex]);

  // 仅当选中索引变化时记录目标条目；展开/收起分组会改变 visibleResults
  // 但不应覆盖 ref，否则下面的校正 effect 无法把选中项跟随到新位置。
  useEffect(() => {
    const current = visibleResults[selectedIndex];
    if (current) {
      selectedItemRef.current = current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  useEffect(() => {
    const target = selectedItemRef.current;
    if (!target) return;
    const newIndex = visibleResults.findIndex((item) => item.id === target.id);
    if (newIndex >= 0 && newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
    }
  }, [visibleResults, selectedIndex]);

  async function openSelected(newTab: boolean) {
    // Address-bar semantics: a complete URL or bare domain always jumps
    // directly, even when local results exist.
    if (directUrl) {
      await openDirectUrl(query.trim(), directUrl, newTab);
      return;
    }
    if (!selected) {
      if (query.trim()) {
        await openWebSearch(query.trim());
      }
      return;
    }
    if (query.trim()) {
      void addSearchHistory(query).then(() => setSearchHistory(getSearchHistory()));
    }
    await markVisited(selected.id);
    await openBookmark(selected, newTab);
    onClose?.();
  }

  async function openDirectUrl(rawQuery: string, url: string, newTab: boolean): Promise<void> {
    await addSearchHistory(rawQuery);
    setSearchHistory(getSearchHistory());
    await openBookmark(
      {
        id: "quickmark-direct-url",
        title: url,
        url,
        domain: new URL(url).hostname.replace(/^www\./, ""),
        favicon: "",
        visitCount: 0,
        source: "history",
      },
      newTab
    );
    onClose?.();
  }

  async function openWebSearch(rawQuery: string): Promise<void> {
    const url = `https://www.google.com/search?q=${encodeURIComponent(rawQuery)}`;
    await addSearchHistory(rawQuery);
    setSearchHistory(getSearchHistory());
    await openBookmark(
      {
        id: "quickmark-web-search",
        title: rawQuery,
        url,
        domain: "google.com",
        favicon: "",
        visitCount: 0,
        source: "history",
      },
      true
    );
    onClose?.();
  }

  async function copyItemUrl(item: BookmarkItem): Promise<void> {
    let ok = false;
    try {
      await copyUrlToClipboard(item.url);
      ok = true;
    } catch {
      ok = false;
    }
    window.clearTimeout(copyTimerRef.current);
    setCopyState({ id: item.id, ok });
    copyTimerRef.current = window.setTimeout(() => setCopyState(null), 1600);
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  function toggleDomain(domain: string): void {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!sortMenuOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [sortMenuOpen]);

  useEffect(() => {
    function onEscapeCapture(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (sortMenuOpen) {
        setSortMenuOpen(false);
        return;
      }
      if (query) {
        setQuery("");
      } else {
        onClose?.();
      }
    }
    document.addEventListener("keydown", onEscapeCapture, true);
    return () => document.removeEventListener("keydown", onEscapeCapture, true);
  }, [query, onClose, sortMenuOpen]);

  return (
    <main
      data-theme={effectiveTheme}
      className={["text-on-surface", mode === "modal" ? "w-full" : "min-h-screen bg-surface"].join(" ")}
      onKeyDown={(event) => {
        if (isComposingEvent(event)) {
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((index) => Math.min(index + 1, visibleResults.length - 1));
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((index) => Math.max(index - 1, 0));
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const filters = ["all", "bookmark", "history"] as SourceFilter[];
          const idx = filters.indexOf(sourceFilter);
          setSourceFilter(filters[(idx - 1 + filters.length) % filters.length]);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          const filters = ["all", "bookmark", "history"] as SourceFilter[];
          const idx = filters.indexOf(sourceFilter);
          setSourceFilter(filters[(idx + 1) % filters.length]);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          void openSelected(event.metaKey || event.ctrlKey);
        }
        if (/^[1-9]$/.test(event.key) && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          const index = parseInt(event.key, 10) - 1;
          const target = visibleResults[index];
          if (target) {
            void markVisited(target.id);
            void openBookmark(target, false);
            onClose?.();
          }
        }
        if ((event.key === "c" || event.key === "C") && (event.metaKey || event.ctrlKey)) {
          if (!selected) return;
          const active = document.activeElement as HTMLInputElement | null;
          const hasInputSelection =
            active instanceof HTMLInputElement &&
            typeof active.selectionStart === "number" &&
            typeof active.selectionEnd === "number" &&
            active.selectionStart !== active.selectionEnd;
          if (hasInputSelection) return;
          event.preventDefault();
          void copyItemUrl(selected);
        }
      }}
    >
      <section
        className={[
          "mx-auto flex w-full max-w-3xl flex-col overflow-hidden bg-surface-container-lowest ring-1 ring-outline-variant/60",
          mode === "modal"
            ? "quickmark-modal-enter h-[600px] max-h-[85vh] rounded-2xl shadow-[0_24px_56px_-20px_rgba(15,23,42,0.22),_0_8px_24px_-12px_rgba(15,23,42,0.10),_0_1px_2px_rgba(15,23,42,0.04)]"
            : "min-h-screen shadow-none"
        ].join(" ")}
      >
        {/* Search Header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-outline-variant/40 bg-surface-container-lowest px-4">
          <Icon name="search" size={18} className="shrink-0 text-outline" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full flex-1 border-none bg-transparent p-0 font-body-md text-[15px] leading-6 text-on-surface outline-none placeholder:text-outline/80"
            placeholder="搜索书签和历史…"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls="quickmark-results"
            aria-activedescendant={selected ? `quickmark-result-${selected.id}` : undefined}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
              title="清空"
              aria-label="清空搜索"
            >
              <Icon name="close" size={14} />
            </button>
          ) : null}
          <span className="flex shrink-0 items-center gap-0.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>

        {/* Source / Time Filter & Sort */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-outline-variant/40 bg-surface-container-lowest/80 px-4 py-1.5">
          {(["all", "bookmark", "history"] as SourceFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSourceFilter(filter)}
              className={[
                "h-7 cursor-pointer rounded-lg px-2.5 text-[12px] font-medium transition-colors",
                sourceFilter === filter
                  ? "bg-primary text-on-primary"
                  : "text-outline hover:bg-surface-container hover:text-on-surface"
              ].join(" ")}
            >
              {filter === "all" ? "全部" : filter === "bookmark" ? "书签" : "历史"}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px shrink-0 bg-outline-variant/50" aria-hidden />
          {TIME_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeFilter(value)}
              className={[
                "h-7 cursor-pointer rounded-lg px-2.5 text-[12px] font-medium transition-colors",
                timeFilter === value
                  ? "bg-surface-container-high text-on-surface"
                  : "text-outline hover:bg-surface-container hover:text-on-surface"
              ].join(" ")}
            >
              {label}
            </button>
          ))}
          <div className="relative ml-auto shrink-0" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setSortMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={sortMenuOpen}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="sort" size={13} className="shrink-0" />
              <span>{SORT_MODES.find((m) => m.value === sortMode)?.label ?? "智能排序"}</span>
              <Icon
                name="expand_more"
                size={13}
                className={["shrink-0 transition-transform", sortMenuOpen ? "rotate-180" : ""].join(" ")}
              />
            </button>
            {sortMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1.5 w-36 rounded-lg border border-outline-variant/40 bg-surface-container p-1 shadow-xl"
              >
                {SORT_MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sortMode === value}
                    onClick={() => {
                      setSortMode(value);
                      setSortMenuOpen(false);
                    }}
                    className={[
                      "flex h-7 w-full cursor-pointer items-center rounded-md px-2 text-left text-[12px] transition-colors",
                      sortMode === value
                        ? "bg-primary/15 font-medium text-primary"
                        : "text-outline hover:bg-surface-container-high hover:text-on-surface"
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Content Area */}
        <div
          className="flex-1 overflow-y-auto py-2"
          onScroll={(event) => {
            if (isNearScrollBottom(event.currentTarget)) {
              setVisibleResultCount((count) =>
                getNextVisibleResultCount(count, results.length, RESULT_PAGE_SIZE)
              );
            }
          }}
        >
          {!query.trim() && searchHistory.length > 0 ? (
            <div className="mb-1">
              {historyExpanded ? (
                <>
                  <div className="flex items-center justify-between px-4 pb-0.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-outline/80">
                    <span>最近搜索</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setHistoryExpanded(false)}
                        className="cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-outline/70 transition-colors hover:bg-surface-container hover:text-on-surface"
                      >
                        收起
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void saveSearchHistory([]).then(() => setSearchHistory([]));
                        }}
                        className="cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-outline/70 transition-colors hover:bg-surface-container hover:text-on-surface"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <div className="hide-scrollbar flex gap-1.5 overflow-x-auto px-4 py-1">
                    {searchHistory.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setQuery(h)}
                        className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-surface-container px-2.5 text-[12px] text-on-surface transition-colors hover:bg-surface-container-high"
                      >
                        <Icon name="history" size={12} className="shrink-0 text-outline/60" />
                        <span className="truncate">{h}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between px-4 py-1.5">
                  <span className="text-[11px] text-outline/60">
                    最近搜索 · {searchHistory.length} 条
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryExpanded(true)}
                    className="cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-outline/70 transition-colors hover:bg-surface-container hover:text-on-surface"
                  >
                    展开
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {query.trim() && results.length > 0 ? (
            <div className="px-4 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-outline/80">
              {statusText}
            </div>
          ) : null}

          <div id="quickmark-results" className="flex flex-col" role="listbox" aria-label="搜索结果">
            {isLoading && results.length === 0 ? (
              <>
                <LoadingRow />
                <LoadingRow />
                <LoadingRow />
              </>
            ) : null}
            {renderedGroups.map(({ group, isGrouped, isExpanded, entries }) => (
              <Fragment key={group.domain}>
                {isGrouped ? (
                  <GroupHeader
                    domain={group.domain}
                    count={group.items.length}
                    isExpanded={isExpanded}
                    onToggle={() => toggleDomain(group.domain)}
                  />
                ) : null}
                {entries.map(({ item, flatIndex }) => (
                  <BookmarkRow
                    key={item.id}
                    item={item}
                    folderPath={folderPaths.get(item.id) ?? []}
                    query={query}
                    index={flatIndex}
                    isSelected={flatIndex === selectedIndex}
                    isCopied={copyState?.id === item.id && copyState.ok}
                    copyFailed={copyState?.id === item.id && !copyState.ok}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                    onOpen={(newTab) => void openSelected(newTab)}
                    onCopy={() => void copyItemUrl(item)}
                  />
                ))}
              </Fragment>
            ))}
          </div>

          {error ? (
            <div className="mx-3 mt-2 flex items-center justify-between gap-3 rounded-xl border border-error-container/60 bg-error-container/30 px-4 py-3 text-[13px] text-on-error-container">
              <span>无法加载书签和历史记录。</span>
              <button
                type="button"
                onClick={() => void refresh({ preferFresh: true })}
                className="shrink-0 cursor-pointer rounded-md border border-error/30 bg-surface-container-lowest px-2.5 py-1 font-code text-[11px] text-error transition-colors hover:bg-error-container/70"
              >
                重试
              </button>
            </div>
          ) : null}

          {!isLoading && !error && !results.length ? (
            <EmptyState
              query={query}
              directUrl={directUrl}
              hasHistory={searchHistory.length > 0}
              onOpenDirect={(newTab) => void openDirectUrl(query.trim(), directUrl ?? "", newTab)}
              onSearchWeb={() => void openWebSearch(query)}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-outline-variant/40 bg-surface-container-low/60 px-3 py-2 text-[11px] text-outline">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Kbd>↑↓</Kbd>
              <span>导航</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd>
              <span>{directUrl ? "跳转" : selected ? "打开" : query ? "搜索" : "打开"}</span>
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="flex items-center gap-0.5">
                <Kbd>Ctrl</Kbd>
                <Kbd>↵</Kbd>
              </span>
              <span>新标签</span>
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="flex items-center gap-0.5">
                <Kbd>Ctrl</Kbd>
                <Kbd>1–9</Kbd>
              </span>
              <span>直达</span>
            </span>
            {selected ? (
              <span className="hidden items-center gap-1.5 lg:flex">
                <span className="flex items-center gap-0.5">
                  <Kbd>Ctrl</Kbd>
                  <Kbd>C</Kbd>
                </span>
                <span>复制链接</span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={`主题: ${themePref === "system" ? "跟随系统" : themePref === "light" ? "浅色" : "深色"}`}
              onClick={() => {
                const next: ThemePreference =
                  themePref === "system" ? "light" : themePref === "light" ? "dark" : "system";
                setThemePref(next);
                void saveThemePreference(next);
              }}
              className="flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[11px] text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon
                name={themePref === "dark" || (themePref === "system" && effectiveTheme === "dark") ? "dark_mode" : "light_mode"}
                size={12}
              />
              <span>{themePref === "system" ? "自动" : themePref === "light" ? "浅色" : "深色"}</span>
            </button>
            {onClose ? (
              <span className="flex items-center gap-1.5">
                <Kbd>Esc</Kbd>
                <span>{query ? "清空" : "关闭"}</span>
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function GroupHeader({
  domain,
  count,
  isExpanded,
  onToggle,
}: {
  domain: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mx-2 mt-1 flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-[11px] text-outline transition-colors hover:bg-surface-container-low/70 hover:text-on-surface"
    >
      <Icon name="workspaces" size={11} className="shrink-0 opacity-70" />
      <span className="truncate font-medium">{domain}</span>
      <span className="shrink-0 opacity-60">{count} 条</span>
      <Icon
        name="expand_more"
        size={12}
        className={["shrink-0 opacity-70 transition-transform", isExpanded ? "rotate-180" : ""].join(" ")}
      />
    </button>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="flex h-[18px] items-center justify-center rounded border border-outline-variant/50 bg-surface-container/70 px-1.5 font-code text-[10px] font-medium text-outline">
      {children}
    </kbd>
  );
}

function LoadingRow() {
  return (
    <div className="mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-surface-container" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 h-3.5 w-2/5 animate-pulse rounded-md bg-surface-container" />
        <div className="h-3 w-3/5 animate-pulse rounded-md bg-surface-container-low" />
      </div>
    </div>
  );
}

function BookmarkRow({
  item,
  folderPath,
  query,
  index,
  isSelected,
  isCopied,
  copyFailed,
  onMouseEnter,
  onOpen,
  onCopy,
}: {
  item: BookmarkItem;
  folderPath: string[];
  query: string;
  index: number;
  isSelected: boolean;
  isCopied: boolean;
  copyFailed: boolean;
  onMouseEnter: () => void;
  onOpen: (newTab: boolean) => void;
  onCopy: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(item.favicon);
  const displayFolderPath = getDisplayFolderPath(folderPath);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div
      ref={rowRef}
      id={`quickmark-result-${item.id}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      onMouseEnter={onMouseEnter}
      onClick={(event) => onOpen(event.metaKey || event.ctrlKey)}
      className={[
        "group relative mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150",
        isSelected
          ? "bg-primary-fixed/40 ring-1 ring-inset ring-primary/15"
          : "hover:bg-surface-container-low/70"
      ].join(" ")}
    >
      {/* Favicon + Number Badge */}
      <div className="relative shrink-0">
        {index < 9 ? (
          <span
            className={[
              "absolute -left-1.5 -top-1.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-md px-1 text-[9.5px] font-semibold transition-colors",
              isSelected
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-outline group-hover:bg-surface-container-highest group-hover:text-on-surface"
            ].join(" ")}
            aria-hidden
          >
            {index + 1}
          </span>
        ) : null}
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-surface-container/70 ring-1 ring-outline-variant/30">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt=""
              className="h-full w-full object-cover"
              onError={() => {
                if (imgSrc === item.favicon) {
                  setImgSrc(getExtensionFaviconUrl(item.url));
                } else {
                  setImgSrc("");
                }
              }}
            />
          ) : (
            <Icon name="language" size={18} className="text-primary" />
          )}
        </div>
      </div>

      {/* URL (primary) + Title (secondary) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon name="link" size={12} className="shrink-0 text-primary/70" />
          <span className="truncate font-mono text-[13px] font-semibold leading-5 text-primary" title={item.url}>
            <HighlightedText text={compactUrl(item.url)} query={query} />
          </span>
          {item.source === "history" && item.lastVisitedAt ? (
            <span className="flex-none whitespace-nowrap text-[11px] text-outline/70">
              {formatRelativeTime(item.lastVisitedAt)}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] leading-4 text-outline">
          <span className="truncate">
            <HighlightedText text={item.title} query={query} />
          </span>
          {item.source === "history" && (
            <span className="shrink-0 rounded-md bg-tertiary-fixed/70 px-1.5 py-0.5 text-[10px] font-medium text-on-tertiary-fixed">
              历史
            </span>
          )}
          {folderPath.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-container/60 px-1.5 py-0.5 text-[10.5px] text-outline">
              <Icon name="workspaces" size={10} className="shrink-0" />
              <span className="max-w-[140px] truncate">
                <HighlightedText text={displayFolderPath} query={query} />
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Right Action Area */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={isCopied ? "已复制" : copyFailed ? "复制失败" : `复制链接：${item.title}`}
          title={isCopied ? "已复制" : copyFailed ? "复制失败" : "复制链接"}
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          className={[
            "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors",
            isCopied
              ? "text-primary"
              : copyFailed
                ? "text-error"
                : "text-outline hover:bg-surface-container hover:text-on-surface",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          ].join(" ")}
        >
          <Icon name={isCopied ? "check" : copyFailed ? "close" : "copy"} size={13} />
        </button>
        <div
          className={[
            "hidden items-center gap-1 rounded-md px-2 py-1 font-code text-[10.5px] transition-all sm:flex",
            isSelected
              ? "bg-primary text-on-primary shadow-sm"
              : "bg-surface-container/60 text-outline opacity-0 group-hover:opacity-100"
          ].join(" ")}
          aria-hidden
        >
          <span>↵</span>
          <span>打开</span>
        </div>
      </div>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitQueryMatch(text, query).map((segment, index) => (
        <span key={`${segment.text}-${index}`} className={segment.match ? "rounded bg-tertiary-fixed px-0.5 text-on-tertiary-fixed" : undefined}>
          {segment.text}
        </span>
      ))}
    </>
  );
}

function EmptyState({
  query,
  directUrl,
  hasHistory,
  onOpenDirect,
  onSearchWeb,
}: {
  query: string;
  directUrl?: string;
  hasHistory: boolean;
  onOpenDirect: (newTab: boolean) => void;
  onSearchWeb: () => void;
}) {
  if (query) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container/60 ring-1 ring-outline-variant/40">
          <Icon name={directUrl ? "language" : "search"} size={20} className={directUrl ? "text-primary" : "text-outline/70"} />
        </div>
        <div>
          {directUrl ? (
            <>
              <div className="text-[14px] font-semibold text-on-surface">直接打开</div>
              <div className="mt-0.5 text-[12px] text-outline">{compactUrl(directUrl)}</div>
            </>
          ) : (
            <>
              <div className="text-[14px] font-semibold text-on-surface">未找到匹配项</div>
              <div className="mt-0.5 text-[12px] text-outline">
                书签和历史记录里都没有 “{query}”
              </div>
            </>
          )}
        </div>
        {directUrl ? (
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDirect(false)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[12.5px] font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="language" size={14} />
              <span>打开网站</span>
              <span className="ml-1 rounded bg-on-primary/15 px-1.5 py-0.5 font-code text-[10px]">↵</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDirect(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-[12px] font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              <span>新标签页打开</span>
              <span className="font-code text-[10px] text-outline">⌘↵</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSearchWeb}
            className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[12.5px] font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="search" size={14} />
            <span>用 Google 搜索</span>
            <span className="ml-1 rounded bg-on-primary/15 px-1.5 py-0.5 font-code text-[10px]">↵</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container/60 ring-1 ring-outline-variant/40">
        <Icon name="bookmarks" size={20} className="text-outline/70" />
      </div>
      <div>
        <div className="text-[14px] font-semibold text-on-surface">
          {hasHistory ? "开始输入以搜索" : "还没有书签"}
        </div>
        <div className="mt-0.5 text-[12px] text-outline">
          {hasHistory ? "继续输入或选择最近搜索" : "Chrome 中保存的书签会出现在这里"}
        </div>
      </div>
    </div>
  );
}

async function openBookmarkDefault(item: BookmarkItem, newTab: boolean): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    window.open(item.url, "_blank");
    return;
  }
  if (newTab) {
    await chrome.tabs.create({ url: item.url, active: true });
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { url: item.url });
  } else {
    await chrome.tabs.create({ url: item.url, active: true });
  }
}
