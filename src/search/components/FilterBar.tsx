import { useEffect, useRef } from "react";
import { Icon } from "../../components/Icon";
import type { SortMode, SourceFilter, TimeFilter } from "../../domain/search";

export const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "bookmark", label: "书签" },
  { value: "history", label: "历史" },
];

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

/** 无查询词时的提示；有查询词时匹配程度优先，模式只处理相近结果。 */
const MENU_TITLE_SORTED = "时间范围与排序；智能排序按最近访问和使用频率推荐；自动记住排序选择";
const MENU_TITLE_QUERY = "时间范围与排序；有关键词时匹配程度优先，按所选模式处理相近结果；自动记住排序选择";

interface FilterBarProps {
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  query: string;
  /** 固定网站图标条：与来源筛选、下拉同排，无固定网站时由调用方不渲染。 */
  children?: React.ReactNode;
}

export function FilterBar({
  sourceFilter,
  setSourceFilter,
  timeFilter,
  setTimeFilter,
  sortMode,
  setSortMode,
  menuOpen,
  setMenuOpen,
  query,
  children,
}: FilterBarProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (menuOpen) {
      const menu = menuRef.current;
      (menu?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]:not(:disabled)') ??
        menu?.querySelector<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)'))?.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const path =
        typeof event.composedPath === "function"
          ? event.composedPath()
          : [event.target];
      const isInsideMenu =
        menuRef.current !== null &&
        path.includes(menuRef.current);
      if (!isInsideMenu) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen, setMenuOpen]);

  const timeLabel = TIME_FILTERS.find((option) => option.value === timeFilter)?.label;
  const sortLabel = SORT_MODES.find((option) => option.value === sortMode)?.label;
  // 时间范围不再有常显胶囊，按钮本身必须显示已生效的非默认选项。
  const summary =
    [timeFilter === "all" ? null : timeLabel, sortMode === "smart" ? null : sortLabel]
      .filter(Boolean)
      .join(" · ") || "筛选";

  function renderOption(
    value: string,
    label: string,
    checked: boolean,
    disabled: boolean,
    onSelect: () => void,
    title?: string
  ) {
    return (
      <button
        key={value}
        type="button"
        role="menuitemradio"
        aria-checked={checked}
        disabled={disabled}
        title={title}
        onClick={() => {
          onSelect();
          closeMenu();
        }}
        className={[
          "flex h-7 w-full cursor-pointer items-center rounded-md px-2 text-left text-[12px] transition-colors",
          disabled
            ? "cursor-not-allowed text-outline/40"
            : checked
              ? "bg-primary/15 font-medium text-primary"
              : "text-outline hover:bg-surface-container-high hover:text-on-surface",
        ].join(" ")}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-outline-variant/40 bg-surface-container-lowest/80 px-4 py-1.5">
      {SOURCE_FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setSourceFilter(value)}
          aria-pressed={sourceFilter === value}
          className={[
            "h-7 cursor-pointer rounded-lg px-2.5 text-[12px] font-medium transition-colors",
            sourceFilter === value
              ? "bg-primary text-on-primary"
              : "text-outline hover:bg-surface-container hover:text-on-surface",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px shrink-0 bg-outline-variant/50" aria-hidden />
      {children}
      <div
        className="relative ml-auto shrink-0"
        ref={menuRef}
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            event.preventDefault();
            event.stopPropagation();
            closeMenu();
          }
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (!menuOpen) {
            setMenuOpen(true);
            return;
          }
          const options = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)') ?? []);
          const index = options.indexOf(event.target as HTMLButtonElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 :
            (index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
          options[next]?.focus();
        }}
      >
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={query.trim() ? MENU_TITLE_QUERY : MENU_TITLE_SORTED}
          className="flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Icon name="filter" size={13} className="shrink-0" />
          <span>{summary}</span>
          <Icon
            name="expand_more"
            size={13}
            className={[
              "shrink-0 transition-transform",
              menuOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1.5 w-40 rounded-lg border border-outline-variant/40 bg-surface-container p-1 shadow-xl"
          >
            <div role="group" aria-label="时间范围">
              <p role="presentation" className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-outline/70">
                时间范围
              </p>
              {TIME_FILTERS.map(({ value, label }) =>
                renderOption(value, label, timeFilter === value, false, () => setTimeFilter(value))
              )}
            </div>
            <div role="presentation" className="my-1 h-px bg-outline-variant/40" />
            <div role="group" aria-label="排序">
              <p role="presentation" className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-outline/70">
                排序
              </p>
              {SORT_MODES.map(({ value, label }) => {
                const relevanceWithoutQuery = value === "relevance" && !query.trim();
                return renderOption(
                  value,
                  label,
                  sortMode === value,
                  relevanceWithoutQuery,
                  () => setSortMode(value),
                  relevanceWithoutQuery ? "输入关键词后可用" : undefined
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
