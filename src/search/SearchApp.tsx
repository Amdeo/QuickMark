import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BookmarkItem } from "../domain/types";
import { Icon } from "../components/Icon";
import { useBookmarks } from "./useBookmarks";
import {
  getNextVisibleResultCount,
  getScrollTarget,
  isNearScrollBottom,
} from "./display";
import {
  groupByDomain,
  isHttpUrl,
  resolveDirectUrl,
  type SortMode,
  type SourceFilter,
  type TimeFilter,
} from "../domain/search";
import {
  copyUrlToClipboard,
  type ClipboardLike,
} from "./clipboard";
import {
  useTheme,
  ensureThemePreferenceLoaded,
  saveThemePreference,
  getEffectiveTheme,
  type ThemePreference,
} from "./hooks/useTheme";
import {
  useSearchHistory,
  ensureSearchHistoryLoaded,
  getSearchHistory,
  saveSearchHistory,
  addSearchHistory,
} from "./hooks/useSearchHistory";
import { Kbd } from "./components/Kbd";
import { BookmarkRow, GroupHeader, LoadingRow } from "./components/BookmarkRow";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { SearchFooter } from "./components/SearchFooter";

const RESULT_PAGE_SIZE = 50;
const DEFAULT_ITEMS_PER_DOMAIN = 3;
const SCROLL_ANCHOR = 88; // 选中项期望停留在滚动容器顶部下方的舒适位置

// 导出供现有测试与调用方使用，保持向后兼容
export {
  copyUrlToClipboard,
  type ClipboardLike,
  ensureThemePreferenceLoaded,
  saveThemePreference,
  getEffectiveTheme,
  type ThemePreference,
  ensureSearchHistoryLoaded,
  getSearchHistory,
  saveSearchHistory,
  addSearchHistory,
};

function isComposingEvent(event: { nativeEvent: KeyboardEvent }): boolean {
  return event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
}

function scrollSelectedRowIntoView(
  container: HTMLElement | null,
  row: HTMLElement | null
): void {
  if (!container || !row) return;

  const target = getScrollTarget({
    scrollTop: container.scrollTop,
    clientHeight: container.clientHeight,
    scrollHeight: container.scrollHeight,
    containerTop: container.getBoundingClientRect().top,
    rowTop: row.getBoundingClientRect().top,
    rowHeight: row.getBoundingClientRect().height,
    anchor: SCROLL_ANCHOR,
  });

  if (target === undefined) return;

  // 键盘连续反向操作必须立即采用最新位置，避免异步动画抢占下一个目标。
  container.scrollTop = target;
}

type SearchAppProps = {
  mode?: "page" | "modal";
  onClose?: () => void;
  openBookmark?: (item: BookmarkItem, newTab: boolean) => Promise<void>;
};

export function SearchApp({
  mode = "page",
  onClose,
  openBookmark = openBookmarkDefault,
}: SearchAppProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleResultCount, setVisibleResultCount] = useState(RESULT_PAGE_SIZE);
  const { themePref, effectiveTheme, cycleTheme } = useTheme();
  const {
    searchHistory,
    historyExpanded,
    setHistoryExpanded,
    recordSearch,
  } = useSearchHistory();

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("smart");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<BookmarkItem | undefined>(undefined);
  const shouldScrollSelectionRef = useRef(false);
  const [expandedDomains, setExpandedDomains] = useState<ReadonlySet<string>>(new Set());
  const [copyState, setCopyState] = useState<{ id: string; ok: boolean } | null>(null);
  const copyTimerRef = useRef<number | undefined>(undefined);

  const {
    filteredItems,
    results,
    isLoading,
    error,
    folderPaths,
    refresh,
    markVisited,
  } = useBookmarks(query, sourceFilter, timeFilter, sortMode);

  // Address-bar semantics: a complete URL or bare domain navigates directly.
  const directUrl = useMemo(() => resolveDirectUrl(query), [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
    setVisibleResultCount(RESULT_PAGE_SIZE);
  }, [query, sourceFilter, timeFilter, sortMode]);

  useEffect(() => {
    setVisibleResultCount((count) =>
      Math.min(Math.max(count, RESULT_PAGE_SIZE), results.length || RESULT_PAGE_SIZE)
    );
  }, [results.length]);

  useEffect(() => {
    if (selectedIndex >= visibleResultCount - 1) {
      setVisibleResultCount((count) =>
        Math.max(
          count,
          getNextVisibleResultCount(selectedIndex, results.length, RESULT_PAGE_SIZE)
        )
      );
    }
  }, [results.length, selectedIndex, visibleResultCount]);

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
    const parts: string[] = [];
    if (sourceFilter === "bookmark") return `书签 ${results.length}`;
    if (sourceFilter === "history") return `历史 ${results.length}`;
    if (bookmarkCount > 0) parts.push(`书签 ${bookmarkCount}`);
    if (historyCount > 0) parts.push(`历史 ${historyCount}`);
    return parts.join(" · ");
  }, [isLoading, error, query, results.length, bookmarkCount, historyCount, sourceFilter, timeFilter]);

  const loadedResults = useMemo(
    () => results.slice(0, visibleResultCount),
    [results, visibleResultCount]
  );

  const groups = useMemo(
    () => groupByDomain(loadedResults, filteredItems),
    [loadedResults, filteredItems]
  );

  const renderedGroups = useMemo(() => {
    let flatIndex = 0;
    return groups.map((group) => {
      const isGrouped = group.items.length > 1;
      const isExpanded = expandedDomains.has(group.domain);
      // 派生首页不占用折叠组的真实记录显示名额。
      const collapsedCount = DEFAULT_ITEMS_PER_DOMAIN + Number(group.items.length > group.count);
      const items =
        isGrouped && !isExpanded
          ? group.items.slice(0, collapsedCount)
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

  useLayoutEffect(() => {
    const shouldScroll = shouldScrollSelectionRef.current;
    shouldScrollSelectionRef.current = false;
    if (!shouldScroll || !selected) return;
    const selectedRow = listRef.current
      ? listRef.current.querySelector<HTMLDivElement>('[role="option"][aria-selected="true"]')
      : null;
    scrollSelectedRowIntoView(listRef.current, selectedRow);
  }, [selected?.id, visibleResults]);

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
  }, [selectedIndex, visibleResults]);

  useEffect(() => {
    const target = selectedItemRef.current;
    if (!target) return;
    const newIndex = visibleResults.findIndex((item) => item.id === target.id);
    if (newIndex >= 0 && newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
    }
  }, [visibleResults, selectedIndex]);

  async function openSelected(newTab: boolean): Promise<void> {
    if (directUrl) {
      await openDirectUrl(query.trim(), directUrl, newTab);
      return;
    }
    if (!selected) {
      if (query.trim()) {
        await openWebSearch(query.trim(), newTab);
      }
      return;
    }
    if (query.trim()) {
      void recordSearch(query.trim());
    }
    void markVisited(selected.id);
    await openBookmark(selected, newTab);
    onClose?.();
  }

  async function openDirectUrl(q: string, targetUrl: string, newTab: boolean): Promise<void> {
    void recordSearch(q);
    await openBookmark(
      {
        id: `direct-${Date.now()}`,
        title: targetUrl,
        url: targetUrl,
        domain: "",
        favicon: "",
        visitCount: 0,
        source: "history",
      },
      newTab
    );
    onClose?.();
  }

  async function openWebSearch(q: string, newTab = false): Promise<void> {
    void recordSearch(q);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    await openBookmark(
      {
        id: `search-${Date.now()}`,
        title: `Google 搜索: ${q}`,
        url: searchUrl,
        domain: "google.com",
        favicon: "",
        visitCount: 0,
        source: "history",
      },
      newTab
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
      className={[
        "text-on-surface",
        mode === "modal" ? "w-full" : "min-h-screen bg-surface",
      ].join(" ")}
      onKeyDown={(event) => {
        if (isComposingEvent(event)) {
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          const nextIndex = Math.max(0, Math.min(selectedIndex + 1, visibleResults.length - 1));
          if (nextIndex !== selectedIndex) {
            shouldScrollSelectionRef.current = true;
            setSelectedIndex(nextIndex);
          }
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          const nextIndex = Math.max(0, Math.min(selectedIndex - 1, visibleResults.length - 1));
          if (nextIndex !== selectedIndex) {
            shouldScrollSelectionRef.current = true;
            setSelectedIndex(nextIndex);
          }
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
          if (selected) {
            event.preventDefault();
            void copyItemUrl(selected);
          }
        }
      }}
    >
      <section
        className={[
          "flex flex-col bg-surface",
          mode === "modal"
            ? "max-h-[min(640px,calc(100vh-64px))] rounded-3xl border border-outline-variant/50 shadow-dialog overflow-hidden"
            : "mx-auto min-h-screen max-w-4xl p-6",
        ].join(" ")}
      >
        {/* Header Search Input */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-outline-variant/40 px-4">
          <Icon name="search" size={20} className="shrink-0 text-outline" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索书签、历史记录，或输入网址直达…"
            className="flex-1 bg-transparent text-[15px] font-medium text-on-surface placeholder:text-outline/60 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls="quickmark-results"
            aria-activedescendant={
              selected ? `quickmark-result-${selected.id}` : undefined
            }
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

        {/* Filter and Sort Bar */}
        <FilterBar
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          sortMenuOpen={sortMenuOpen}
          setSortMenuOpen={setSortMenuOpen}
          query={query}
        />

        {/* Results / Content Area */}
        <div
          ref={listRef}
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
                          void saveSearchHistory([]).then(() => {
                            void recordSearch("");
                          });
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
            {renderedGroups.map(({ group, isGrouped, isExpanded, entries }) => {
              const rows = entries.map(({ item, flatIndex }, rowIndex) => (
                <BookmarkRow
                  key={item.id}
                  item={item}
                  folderPath={folderPaths.get(item.id) ?? []}
                  query={query}
                  index={flatIndex}
                  isSelected={flatIndex === selectedIndex}
                  isCopied={copyState?.id === item.id && copyState.ok}
                  copyFailed={copyState?.id === item.id && !copyState.ok}
                  grouped={isGrouped}
                  alternate={isGrouped && rowIndex % 2 === 1}
                  onMouseEnter={() => {
                    shouldScrollSelectionRef.current = false;
                    setSelectedIndex(flatIndex);
                  }}
                  onOpen={(newTab) => void openSelected(newTab)}
                  onCopy={() => void copyItemUrl(item)}
                />
              ));

              return (
                <Fragment key={group.domain}>
                  {isGrouped ? (
                    <GroupHeader
                      domain={group.domain}
                      count={group.count}
                      isExpanded={isExpanded}
                      onToggle={() => toggleDomain(group.domain)}
                    />
                  ) : null}
                  {isGrouped ? (
                    <div
                      role="presentation"
                      className="mx-2 overflow-hidden rounded-xl bg-surface-container-low ring-1 ring-outline-variant/25"
                    >
                      {rows}
                    </div>
                  ) : (
                    rows
                  )}
                </Fragment>
              );
            })}
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
              onOpenDirect={(newTab) =>
                void openDirectUrl(query.trim(), directUrl ?? "", newTab)
              }
              onSearchWeb={() => void openWebSearch(query)}
            />
          ) : null}
        </div>

        {/* Footer */}
        <SearchFooter
          directUrl={directUrl}
          hasQuery={Boolean(query)}
          hasSelected={Boolean(selected)}
          themePref={themePref}
          effectiveTheme={effectiveTheme}
          onCycleTheme={cycleTheme}
          onClose={onClose}
        />
      </section>
    </main>
  );
}

async function openBookmarkDefault(item: BookmarkItem, newTab: boolean): Promise<void> {
  if (!isHttpUrl(item.url)) {
    return;
  }
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
