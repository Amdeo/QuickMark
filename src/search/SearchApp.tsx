import {
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
  isHttpUrl,
  resolveDirectUrl,
  type SourceFilter,
  type TimeFilter,
} from "../domain/search";
import { copyUrlToClipboard } from "./clipboard";
import { useTheme } from "./hooks/useTheme";
import {
  useSearchHistory,
} from "./hooks/useSearchHistory";
import { MAX_PINNED_SITES, useSearchPreferences } from "./hooks/useSearchPreferences";
import { PinnedSites } from "./components/PinnedSites";
import { RecentSearches } from "./components/RecentSearches";
import { getExtensionFaviconUrl } from "../adapters/favicon";
import { Kbd } from "./components/Kbd";
import { BookmarkRow, LoadingRow } from "./components/BookmarkRow";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { SearchFooter } from "./components/SearchFooter";

const RESULT_PAGE_SIZE = 50;
const SCROLL_ANCHOR = 88; // 选中项期望停留在滚动容器顶部下方的舒适位置


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
    recordSearch,
    clearSearchHistory,
  } = useSearchHistory();

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const { sortMode, setSortMode, pinnedSites, togglePinnedSite, movePinnedSite, isLoaded: preferencesLoaded, error: preferencesError } = useSearchPreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [recentIndex, setRecentIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldScrollSelectionRef = useRef(false);
  const [copyState, setCopyState] = useState<{ id: string; ok: boolean } | null>(null);
  const [openError, setOpenError] = useState<string>();
  const copyTimerRef = useRef<number | undefined>(undefined);

  const {
    bookmarks,
    results,
    isLoading,
    error,
    folderPaths,
    refresh,
    markVisited,
  } = useBookmarks(query, sourceFilter, timeFilter, sortMode);

  // Address-bar semantics: a complete URL or bare domain navigates directly.
  const directUrl = useMemo(() => resolveDirectUrl(query), [query]);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const modifierLabel = isMac ? "⌘" : "Ctrl";
  const jumpLabel = isMac ? "⇧⌃" : "Shift+Ctrl";
  const pinnedUrls = useMemo(() => new Set(pinnedSites.map((site) => site.url)), [pinnedSites]);
  const pinnedItems = useMemo(() => pinnedSites.map((site): BookmarkItem =>
    bookmarks.find((item) => item.url === site.url) ?? {
      id: `pinned:${site.url}`,
      title: site.title,
      url: site.url,
      domain: new URL(site.url).hostname,
      favicon: getExtensionFaviconUrl(site.url),
      visitCount: 0,
    }
  ), [bookmarks, pinnedSites]);
useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 只有在搜索框为空时按空格才会打开最近搜索；一旦有输入或历史清空就收起。
  useEffect(() => {
    if (query || searchHistory.length === 0) setRecentsOpen(false);
  }, [query, searchHistory.length]);

  function openRecentSearches() {
    setRecentIndex(0);
    setRecentsOpen(true);
  }

  function pickRecentSearch(value: string) {
    setRecentsOpen(false);
    setQuery(value);
    inputRef.current?.focus();
  }

  function clearRecentSearches() {
    setRecentsOpen(false);
    inputRef.current?.focus();
    void clearSearchHistory();
  }

  useEffect(() => {
    setSelectedIndex(0);
    setVisibleResultCount(RESULT_PAGE_SIZE);
    setOpenError(undefined);
    if (listRef.current) listRef.current.scrollTop = 0;
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

  const visibleResults = useMemo(
    () => results.slice(0, visibleResultCount),
    [results, visibleResultCount]
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
    await openItem(selected, newTab);
  }

  async function openItem(item: BookmarkItem, newTab: boolean): Promise<void> {
    setOpenError(undefined);
    try {
      await openBookmark(item, newTab);
      if (query.trim()) void recordSearch(query.trim());
      void markVisited(item.id);
      onClose?.();
    } catch {
      setOpenError("打开失败，请重试。");
    }
  }

  async function openDirectUrl(q: string, targetUrl: string, newTab: boolean): Promise<void> {
    await openItem(
      {
        id: `direct-${Date.now()}`,
        title: q,
        url: targetUrl,
        domain: "",
        favicon: "",
        visitCount: 0,
        source: "history",
      },
      newTab
    );
  }

  async function openWebSearch(q: string, newTab = false): Promise<void> {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    await openItem(
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


  useEffect(() => {
    function onEscapeCapture(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (recentsOpen) {
        setRecentsOpen(false);
        inputRef.current?.focus();
        return;
      }
      if (menuOpen) {
        setMenuOpen(false);
        inputRef.current?.focus();
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
  }, [query, onClose, menuOpen, recentsOpen]);

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
        if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
          if (event.code === "KeyP" || event.key.toLowerCase() === "p") {
            if (selected && preferencesLoaded) {
              event.preventDefault();
              togglePinnedSite(selected);
            }
            return;
          }
        }
        // Buttons keep native Enter/Space behavior; editing keys belong to the input.
        if (event.target !== inputRef.current || menuOpen) return;
        // 空格是查询里的正常字符，唯有搜索框为空时改为展开最近搜索。
        if (event.key === " " && !query) {
          event.preventDefault();
          openRecentSearches();
          return;
        }
        // 有输入时左右键属于光标移动，唯有搜索框为空时用来切换来源筛选。
        if (!query && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          const filters: SourceFilter[] = ["all", "bookmark", "history"];
          setSourceFilter(filters[(filters.indexOf(sourceFilter) + (event.key === "ArrowLeft" ? 2 : 1)) % 3]);
          return;
        }
        if (recentsOpen && searchHistory.length > 0) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const delta = event.key === "ArrowDown" ? 1 : -1;
            setRecentIndex((index) => (index + delta + searchHistory.length) % searchHistory.length);
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            pickRecentSearch(searchHistory[Math.min(recentIndex, searchHistory.length - 1)]);
            return;
          }
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
        if (event.key === "Enter") {
          event.preventDefault();
          void openSelected(event.metaKey || event.ctrlKey);
        }
        if (/^[1-9]$/.test(event.key) && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
          const target = pinnedItems[parseInt(event.key, 10) - 1];
          if (target) {
            event.preventDefault();
            void openItem(target, false);
          }
        }
        if (/^[1-9]$/.test(event.key) && event.ctrlKey && event.shiftKey && !event.metaKey && !event.altKey) {
          const target = visibleResults[parseInt(event.key, 10) - 1];
          if (target) {
            event.preventDefault();
            void openItem(target, false);
          }
        }
        if ((event.key === "c" || event.key === "C") && (event.metaKey || event.ctrlKey)) {
          if (selected && inputRef.current?.selectionStart === inputRef.current?.selectionEnd) {
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
            ? "quickmark-modal-enter max-h-[min(640px,calc(100vh-64px))] rounded-3xl border border-outline-variant/50 shadow-dialog overflow-hidden"
            : "mx-auto min-h-screen max-w-4xl p-6",
        ].join(" ")}
      >
        {/* Header Search Input */}
        <div className="relative flex h-14 shrink-0 items-center gap-3 border-b border-outline-variant/40 px-4">
          <Icon name="search" size={20} className="shrink-0 text-outline" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索书签、历史记录，或输入网址直达…"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-on-surface placeholder:text-outline/60 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-label="搜索书签和历史记录"
            aria-expanded="true"
            aria-controls={recentsOpen ? "quickmark-results quickmark-recents" : "quickmark-results"}
            aria-activedescendant={
              recentsOpen
                ? `quickmark-recent-${recentIndex}`
                : selected
                  ? `quickmark-result-${selected.id}`
                  : undefined
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
            <Kbd>{modifierLabel}</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>K</Kbd>
          </span>
          {recentsOpen && searchHistory.length > 0 ? (
            <RecentSearches
              items={searchHistory}
              activeIndex={Math.min(recentIndex, searchHistory.length - 1)}
              onHover={setRecentIndex}
              onPick={pickRecentSearch}
              onClear={clearRecentSearches}
              onClose={() => setRecentsOpen(false)}
            />
          ) : null}
        </div>

        {/* Filter and Sort Bar */}
        <FilterBar
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          query={query}
        >
          {!query.trim() && preferencesLoaded ? (
            <PinnedSites
              items={pinnedItems}
              onOpen={(index, newTab) => void openItem(pinnedItems[index], newTab)}
              onUnpin={togglePinnedSite}
              onReorder={movePinnedSite}
            />
          ) : null}
        </FilterBar>

        {preferencesError || openError ? (
          <div role="alert" className="shrink-0 px-4 py-2 text-[12px] text-error">
            {preferencesError || openError}
          </div>
        ) : null}

        {/* Results / Content Area */}
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto py-2"
          onScroll={(event) => {
            if (isNearScrollBottom(event.currentTarget)) {
              setVisibleResultCount((count) =>
                getNextVisibleResultCount(count, results.length, RESULT_PAGE_SIZE)
              );
            }
          }}
        >
          {results.length > 0 ? (
            <div className="px-4 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-outline/80">
              {statusText}{!query.trim() && sortMode === "smart" ? " · 最近常用优先" : ""}
            </div>
          ) : null}

          <div id="quickmark-results" className="flex flex-col" role="listbox" aria-label="搜索结果">
            {(isLoading || !preferencesLoaded) && results.length === 0 ? (
              <>
                <LoadingRow />
                <LoadingRow />
                <LoadingRow />
              </>
            ) : null}
            {visibleResults.map((item, index) => (
              <BookmarkRow
                key={item.id}
                item={item}
                folderPath={folderPaths.get(item.id) ?? []}
                query={query}
                shortcutKey={index + 1 <= 9 ? index + 1 : undefined}
                isSelected={index === selectedIndex}
                isCopied={copyState?.id === item.id && copyState.ok}
                copyFailed={copyState?.id === item.id && !copyState.ok}
                isPinned={pinnedUrls.has(item.url)}
                pinDisabled={!preferencesLoaded || (!pinnedUrls.has(item.url) && pinnedSites.length >= MAX_PINNED_SITES)}
                onMouseEnter={() => {
                  shouldScrollSelectionRef.current = false;
                  setSelectedIndex(index);
                }}
                onOpen={(newTab) => void openItem(item, newTab)}
                onCopy={() => void copyItemUrl(item)}
                onTogglePin={() => togglePinnedSite(item)}
              />
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
          hasHistory={searchHistory.length > 0}
          hasSelected={Boolean(selected)}
          themePref={themePref}
          effectiveTheme={effectiveTheme}
          onCycleTheme={cycleTheme}
          modifierLabel={modifierLabel}
          jumpLabel={jumpLabel}
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
