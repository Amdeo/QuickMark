import { useEffect, useRef } from "react";
import { Icon } from "../../components/Icon";

/** 搜索框下方的最近搜索下拉：焦点留在输入框，由 ↑↓ / Enter 驱动 activeIndex。 */
export function RecentSearches({ items, activeIndex, onHover, onPick, onClear, onClose }: {
  items: string[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (query: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const path =
        typeof event.composedPath === "function"
          ? event.composedPath()
          : [event.target];
      if (popoverRef.current !== null && path.includes(popoverRef.current)) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute left-3 right-3 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-1 shadow-xl"
    >
      <p role="presentation" className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-outline/70">
        最近搜索
      </p>
      <div id="quickmark-recents" role="listbox" aria-label="最近搜索" className="flex flex-col">
        {items.map((query, index) => (
          <div
            key={query}
            id={`quickmark-recent-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            onMouseEnter={() => onHover(index)}
            // 按下不夺焦，焦点始终留在搜索框里，方便继续输入。
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(query)}
            className={[
              "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12px] transition-colors",
              index === activeIndex
                ? "bg-primary/15 font-medium text-primary"
                : "text-outline hover:bg-surface-container-high hover:text-on-surface",
            ].join(" ")}
          >
            <Icon name="history" size={12} className="shrink-0 opacity-60" />
            <span className="truncate">{query}</span>
          </div>
        ))}
      </div>
      <div role="presentation" className="my-1 h-px bg-outline-variant/40" />
      <button
        type="button"
        onClick={onClear}
        className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-[12px] text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
      >
        <Icon name="close" size={12} className="shrink-0 opacity-60" />
        <span>清空最近搜索</span>
      </button>
    </div>
  );
}
