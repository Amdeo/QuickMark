import { useEffect, useMemo, useRef, useState } from "react";
import type { BookmarkItem } from "../domain/types";
import { useBookmarks } from "./useBookmarks";

const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

type SearchAppProps = {
  mode?: "page" | "modal";
  onClose?: () => void;
  openBookmark?: (item: BookmarkItem, newTab: boolean) => Promise<void>;
};

export function SearchApp({ mode = "page", onClose, openBookmark = openBookmarkInExtensionPage }: SearchAppProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading, remove, markVisited, markRead, toggleFavorite, toggleUnread } = useBookmarks(query);
  const selected = results[selectedIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (selectedIndex > Math.max(results.length - 1, 0)) {
      setSelectedIndex(Math.max(results.length - 1, 0));
    }
  }, [results.length, selectedIndex]);

  const statusText = useMemo(() => {
    if (isLoading) {
      return "加载中";
    }
    if (!results.length) {
      return query ? "无结果" : "无书签";
    }
    return query ? "搜索结果" : "最近书签";
  }, [isLoading, query, results.length]);

  async function openSelected(newTab: boolean) {
    if (!selected) {
      return;
    }

    await markVisited(selected.id);
    await openBookmark(selected, newTab);
    onClose?.();
  }

  async function deleteSelected() {
    if (!selected) {
      return;
    }

    await remove(selected.id);
  }

  return (
    <main
      className={["text-on-surface", mode === "modal" ? "w-full" : "min-h-screen bg-surface"].join(" ")}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((index) => Math.min(index + 1, results.length - 1));
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((index) => Math.max(index - 1, 0));
        }
        if (event.key === "Enter") {
          event.preventDefault();
          void openSelected(event.metaKey || event.ctrlKey);
        }
        if (event.key === "Backspace" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void deleteSelected();
        }
        if (event.key === "Delete") {
          event.preventDefault();
          void deleteSelected();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onClose?.();
        }
      }}
    >
      <section
        className={[
          "mx-auto flex w-full max-w-3xl flex-col border border-outline-variant bg-surface shadow-2xl shadow-black/40",
          mode === "modal" ? "h-[78vh] rounded-xl" : "min-h-screen"
        ].join(" ")}
      >
        <div className="flex h-16 flex-none items-center gap-2 border-b border-outline-variant bg-surface-container px-4">
          <span className="text-lg text-outline">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full flex-1 border-none bg-transparent p-0 text-sm text-on-surface outline-none placeholder:text-outline"
            placeholder="搜索书签... (#标签 @工作区)"
            spellCheck={false}
          />
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>↵</Kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-1 mt-1 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-outline">
            {statusText}
          </div>

          {results.map((item, index) => (
            <BookmarkRow
              key={item.id}
              item={item}
              isSelected={index === selectedIndex}
              onMouseEnter={() => setSelectedIndex(index)}
              onOpen={(newTab) => void openSelected(newTab)}
              onToggleFavorite={() => void toggleFavorite(item.id)}
              onToggleUnread={() => void toggleUnread(item.id)}
            />
          ))}

          {!isLoading && !results.length ? (
            <div className="px-2 py-12 text-center text-sm text-on-surface-variant">
              {query ? "未找到匹配的书签。" : "在任意页面按 Command/Ctrl + Shift + S 保存当前网页。"}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-none items-center gap-2 border-t border-outline-variant bg-surface-container-low px-4 py-2 text-xs text-outline">
          <span>↑↓ 选择</span>
          <span>·</span>
          <span>Enter 打开</span>
          <span>·</span>
          <span>{isMac ? "⌘" : "Ctrl"} Enter 新标签页</span>
          <span>·</span>
          <span>Delete 删除</span>
          {onClose ? (
            <>
              <span>·</span>
              <span>Esc 关闭</span>
            </>
          ) : null}
        </footer>
      </section>
    </main>
  );
}

function BookmarkRow({
  item,
  isSelected,
  onMouseEnter,
  onOpen,
  onToggleFavorite,
  onToggleUnread,
}: {
  item: BookmarkItem;
  isSelected: boolean;
  onMouseEnter: () => void;
  onOpen: (newTab: boolean) => void;
  onToggleFavorite: () => void;
  onToggleUnread: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={(event) => onOpen(event.metaKey || event.ctrlKey)}
      className={[
        "group relative flex w-full cursor-pointer items-start gap-2 rounded-lg border-l-2 p-2 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary-container/10 shadow-[0_0_10px_rgba(78,142,255,0.10)]"
          : "border-transparent hover:bg-surface-container-high"
      ].join(" ")}
    >
      <div className="relative mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded border border-outline-variant bg-surface-container">
        {item.isUnread && (
          <span
            onClick={(e) => { e.stopPropagation(); onToggleUnread(); }}
            className="absolute -left-0.5 -top-0.5 z-10 h-2 w-2 cursor-pointer rounded-full bg-primary"
            aria-label="未读，点击标记为已读"
          />
        )}
        {item.favicon ? (
          <img src={item.favicon} alt="" className="h-4 w-4" />
        ) : (
          <span className="text-[10px] font-semibold uppercase text-outline">{item.domain.slice(0, 1)}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className={["truncate text-sm font-medium", isSelected ? "text-primary" : "text-on-surface"].join(" ")}>
          {item.title}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-outline">
          <span className="truncate">{item.domain}</span>
          <span className="h-0.5 w-0.5 flex-none rounded-full bg-outline" />
          <span className="truncate">{compactUrl(item.url)}</span>
          <span className="h-0.5 w-0.5 flex-none rounded-full bg-outline" />
          <span className="flex-none">{item.visitCount} 次访问</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={["flex-none text-sm transition-colors", item.isFavorite ? "text-primary" : "text-outline hover:text-primary"].join(" ")}
        title={item.isFavorite ? "取消收藏" : "收藏"}
        aria-pressed={item.isFavorite}
      >
        {item.isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <span className="rounded border border-outline-variant bg-outline-variant px-2 py-1 text-[11px] font-medium leading-none text-on-surface-variant">
      {children}
    </span>
  );
}

function compactUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function openBookmarkInExtensionPage(item: BookmarkItem, newTab: boolean): Promise<void> {
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
