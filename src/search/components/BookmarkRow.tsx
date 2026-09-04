import { useRef, useState } from "react";
import type { BookmarkItem } from "../../domain/types";
import { Icon } from "../../components/Icon";
import { getExtensionFaviconUrl } from "../../adapters/favicon";
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

export function BookmarkRow({
  item,
  folderPath,
  query,
  index,
  isSelected,
  isCopied,
  copyFailed,
  grouped = false,
  alternate = false,
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
  /** 是否位于域名分组卡片内（取消外边距与独立圆角，由卡片容器裁切）。 */
  grouped?: boolean;
  /** 组内交替底色：奇数位置的行使用更深的底色形成斑马纹。 */
  alternate?: boolean;
  onMouseEnter: () => void;
  onOpen: (newTab: boolean) => void;
  onCopy: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(item.favicon);
  const displayFolderPath = getDisplayFolderPath(folderPath);
  const rowRef = useRef<HTMLDivElement>(null);

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
        "group relative flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors duration-150",
        grouped ? "mx-0 rounded-none" : "mx-2 rounded-xl",
        // 组内卡片：奇数行透出容器底色，偶数行加深形成斑马纹；
        // hover 统一用更深的 highest，保证两种行上都有高亮反馈。
        isSelected
          ? "bg-primary-fixed/40 ring-1 ring-inset ring-primary/15"
          : grouped
            ? alternate
              ? "bg-surface-container-high hover:bg-surface-container-highest"
              : "hover:bg-surface-container-highest"
            : "hover:bg-surface-container-low/70",
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
                : "bg-surface-container-high text-outline group-hover:bg-surface-container-highest group-hover:text-on-surface",
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
          <span
            className="truncate font-mono text-[13px] font-semibold leading-5 text-primary"
            title={item.url}
          >
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

export function GroupHeader({
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
        className={[
          "shrink-0 opacity-70 transition-transform",
          isExpanded ? "rotate-180" : "",
        ].join(" ")}
      />
    </button>
  );
}

export function LoadingRow() {
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
