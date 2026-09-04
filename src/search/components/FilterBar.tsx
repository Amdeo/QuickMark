import { useEffect, useRef } from "react";
import { Icon } from "../../components/Icon";
import type { SortMode, SourceFilter, TimeFilter } from "../../domain/search";

export const TIME_FILTERS: Array<{ value: TimeFilter; label: string }> = [
  { value: "all", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

export const SORT_MODES: Array<{ value: SortMode; label: string }> = [
  { value: "smart", label: "智能排序" },
  { value: "recent", label: "最近访问" },
  { value: "frequent", label: "使用频率" },
  { value: "title", label: "标题 A-Z" },
  { value: "created", label: "创建时间" },
  { value: "relevance", label: "相关度优先" },
];

interface FilterBarProps {
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  sortMenuOpen: boolean;
  setSortMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  query: string;
}

export function FilterBar({
  sourceFilter,
  setSourceFilter,
  timeFilter,
  setTimeFilter,
  sortMode,
  setSortMode,
  sortMenuOpen,
  setSortMenuOpen,
  query,
}: FilterBarProps) {
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortMenuOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const path =
        typeof event.composedPath === "function"
          ? event.composedPath()
          : [event.target];
      const isInsideMenu =
        sortMenuRef.current !== null &&
        path.some((node) => sortMenuRef.current!.contains(node as Node));
      if (!isInsideMenu) {
        setSortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [sortMenuOpen, setSortMenuOpen]);

  return (
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
              : "text-outline hover:bg-surface-container hover:text-on-surface",
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
              : "text-outline hover:bg-surface-container hover:text-on-surface",
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
          <span>
            {SORT_MODES.find((m) => m.value === sortMode)?.label ?? "智能排序"}
          </span>
          <Icon
            name="expand_more"
            size={13}
            className={[
              "shrink-0 transition-transform",
              sortMenuOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
        {sortMenuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1.5 w-36 rounded-lg border border-outline-variant/40 bg-surface-container p-1 shadow-xl"
          >
            {SORT_MODES.map(({ value, label }) => {
              const relevanceWithoutQuery = value === "relevance" && !query.trim();
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortMode === value}
                  disabled={relevanceWithoutQuery}
                  title={relevanceWithoutQuery ? "输入关键词后可用" : undefined}
                  onClick={() => {
                    setSortMode(value);
                    setSortMenuOpen(false);
                  }}
                  className={[
                    "flex h-7 w-full cursor-pointer items-center rounded-md px-2 text-left text-[12px] transition-colors",
                    relevanceWithoutQuery
                      ? "cursor-not-allowed text-outline/40"
                      : sortMode === value
                        ? "bg-primary/15 font-medium text-primary"
                        : "text-outline hover:bg-surface-container-high hover:text-on-surface",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
