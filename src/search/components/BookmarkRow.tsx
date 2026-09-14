import { useState } from "react";
import type { BookmarkItem } from "../../domain/types";
import { Icon } from "../../components/Icon";
import { getExtensionFaviconUrl } from "../../adapters/favicon";
import { MAX_PINNED_SITES } from "../hooks/useSearchPreferences";
import {
  compactUrl,
  formatRelativeTime,
  getDisplayFolderPath,
  splitQueryMatch,
} from "../display";

export function HighlightedText({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitQueryMatch(text, query).map((segment, index) => (
        <span
          key={`${segment.text}-${index}`}
          className={
            segment.match
              ? "rounded bg-tertiary-fixed px-0.5 text-on-tertiary-fixed"
              : undefined
          }
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}

export function BookmarkFavicon({ url, favicon, size = 20 }: { url: string; favicon?: string; size?: number }) {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const fallback = getExtensionFaviconUrl(url);
  const primary = favicon || fallback;
  return failedAttempts < 2 ? (
    <img
      src={failedAttempts === 0 ? primary : fallback}
      alt=""
      style={{ width: size, height: size }}
      className="object-contain"
      onError={() => setFailedAttempts(failedAttempts === 0 && primary !== fallback ? 1 : 2)}
    />
  ) : <Icon name="language" size={size} className="text-primary" />;
}

export function BookmarkRow({
  item,
  folderPath,
  query,
  shortcutKey,
  isSelected,
  isCopied,
  copyFailed,
  isPinned,
  pinDisabled,
  onMouseEnter,
  onOpen,
  onCopy,
  onTogglePin,
}: {
  item: BookmarkItem;
  folderPath: string[];
  query: string;
  /** 该行对应的 Shift+Ctrl 数字键；未分配键时不显示角标。 */
  shortcutKey?: number;
  isSelected: boolean;
  isCopied: boolean;
  copyFailed: boolean;
  isPinned: boolean;
  pinDisabled: boolean;
  onMouseEnter: () => void;
  onOpen: (newTab: boolean) => void;
  onCopy: () => void;
  onTogglePin: () => void;
}) {
  const displayFolderPath = getDisplayFolderPath(folderPath);

  return (
    <div
      id={`quickmark-result-${item.id}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      onMouseEnter={onMouseEnter}
      onClick={(event) => onOpen(event.metaKey || event.ctrlKey)}
      className={[
        "group relative flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors duration-150",
        "mx-2 rounded-xl ring-1 ring-inset",
        isSelected
          ? "bg-primary-fixed/40 ring-primary/40"
          : "ring-outline-variant/70 hover:bg-surface-container-low/70",
      ].join(" ")}
    >
      {/* Favicon + Number Badge */}
      <div className="relative shrink-0">
        {shortcutKey !== undefined ? (
          <span
            className={[
              "absolute -left-1.5 -top-1.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-md px-1 text-[9.5px] font-semibold transition-colors",
              isSelected
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-outline group-hover:bg-surface-container-highest group-hover:text-on-surface",
            ].join(" ")}
            aria-hidden
          >
            {shortcutKey}
          </span>
        ) : null}
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-surface-container/70 ring-1 ring-outline-variant/30">
          <BookmarkFavicon key={item.url} url={item.url} favicon={item.favicon} />
        </div>
      </div>

      {/* URL (primary) + Title (secondary) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon name="link" size={12} className="shrink-0 text-primary/70" />
          <span
            className="truncate font-mono text-[13px] font-semibold leading-5 text-primary"
            title={item.url}
          >
            <HighlightedText text={compactUrl(item.url)} query={query} />
          </span>
          {item.lastVisitedAt ? (
            <span className="hidden flex-none whitespace-nowrap text-[11px] text-outline/70 sm:inline" title={new Date(item.lastVisitedAt).toLocaleString()}>
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
            <span className="hidden shrink-0 items-center gap-1 rounded-md bg-surface-container/60 px-1.5 py-0.5 text-[10.5px] text-outline sm:inline-flex">
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
        {item.visitCount > 0 ? (
          <span
            className={[
              "hidden shrink-0 items-center gap-1 text-[11px] text-outline/80 transition-opacity sm:flex",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            ].join(" ")}
          >
            <Icon name="history" size={11} className="shrink-0 opacity-70" />
            {item.visitCount} 次
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`${isPinned ? "取消固定" : "固定网站"}：${item.title}`}
          aria-pressed={isPinned}
          disabled={pinDisabled}
          title={isPinned ? "取消固定 · Alt+P" : pinDisabled ? `最多固定 ${MAX_PINNED_SITES} 个网站，请先取消一个` : "固定到顶部 · Alt+P"}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin();
          }}
          className={[
            "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors focus:opacity-100 disabled:cursor-not-allowed disabled:text-outline/40",
            isPinned ? "text-primary" : "text-outline hover:bg-surface-container hover:text-on-surface",
            isSelected || isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          ].join(" ")}
        >
          <Icon name={isPinned ? "pin_off" : "pin"} size={14} />
        </button>
        <button
          type="button"
          aria-label={
            isCopied
              ? "已复制"
              : copyFailed
                ? "复制失败"
                : `复制链接：${item.title}`
          }
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
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100",
          ].join(" ")}
        >
          <Icon name={isCopied ? "check" : copyFailed ? "close" : "copy"} size={13} />
        </button>
        <div
          className={[
            "hidden items-center gap-1 rounded-md px-2 py-1 font-code text-[10.5px] transition-all sm:flex",
            isSelected
              ? "bg-primary text-on-primary shadow-sm"
              : "bg-surface-container/60 text-outline opacity-0 group-hover:opacity-100",
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


export function LoadingRow() {
  return (
    <div className="mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset ring-outline-variant/70">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-surface-container" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 h-3.5 w-2/5 animate-pulse rounded-md bg-surface-container" />
        <div className="h-3 w-3/5 animate-pulse rounded-md bg-surface-container-low" />
      </div>
    </div>
  );
}
