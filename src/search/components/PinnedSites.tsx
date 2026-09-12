import { useState } from "react";
import { Icon } from "../../components/Icon";
import type { BookmarkItem } from "../../domain/types";
import { BookmarkFavicon } from "./BookmarkRow";

/** 固定在筛选栏里的一行图标：编号对应 Ctrl 数字键，名称与网址放在 title / aria-label 里。 */
export function PinnedSites({ items, onOpen, onUnpin, onReorder }: {
  items: BookmarkItem[];
  onOpen: (index: number, newTab: boolean) => void;
  onUnpin: (item: BookmarkItem) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="固定网站"
      className="flex shrink-0 items-center gap-1.5 py-1.5"
    >
      <Icon name="pin" size={13} aria-hidden className="mr-2 shrink-0 text-outline/70" />
      {items.map((item, index) => (
        <div
          key={item.url}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
            setDragging(index);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTarget(index);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const from = Number(event.dataTransfer.getData("text/plain"));
            if (Number.isInteger(from)) onReorder(from, index);
            setDragging(null);
            setDropTarget(null);
          }}
          onDragEnd={() => {
            setDragging(null);
            setDropTarget(null);
          }}
          className={[
            "group relative rounded-lg transition-opacity",
            dragging === index ? "opacity-40" : "",
            dropTarget === index && dragging !== null && dragging !== index
              ? "ring-2 ring-primary/50"
              : "",
          ].join(" ")}
        >
          <button
            type="button"
            aria-label={`打开固定网站：${item.title}`}
            title={`${item.title}\n${item.url}\nCtrl+${index + 1} 打开 · 拖拽可排序`}
            onClick={(event) => onOpen(index, event.metaKey || event.ctrlKey)}
            className="flex h-7 w-7 cursor-grab items-center justify-center rounded-lg bg-surface-container/70 ring-1 ring-outline-variant/30 transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
          >
            <BookmarkFavicon url={item.url} favicon={item.favicon} size={15} />
          </button>
          <span
            aria-hidden
            className="pointer-events-none absolute -left-1.5 -top-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-md bg-surface-container-high px-1 text-[9.5px] font-semibold text-outline transition-colors group-hover:bg-primary group-hover:text-on-primary"
          >
            {index + 1}
          </span>
          <button
            type="button"
            aria-label={`取消固定：${item.title}`}
            title="取消固定"
            onClick={() => onUnpin(item)}
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-surface-container-highest text-outline opacity-0 ring-1 ring-outline-variant/40 transition-opacity hover:text-on-surface group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
          >
            <Icon name="close" size={9} />
          </button>
        </div>
      ))}
    </section>
  );
}
