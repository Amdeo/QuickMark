import { Icon } from "../../components/Icon";
import { compactUrl } from "../display";

interface EmptyStateProps {
  query: string;
  directUrl?: string;
  hasHistory: boolean;
  onOpenDirect: (newTab: boolean) => void;
  onSearchWeb: () => void;
}

export function EmptyState({
  query,
  directUrl,
  hasHistory,
  onOpenDirect,
  onSearchWeb,
}: EmptyStateProps) {
  if (query) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container/60 ring-1 ring-outline-variant/40">
          <Icon
            name={directUrl ? "language" : "search"}
            size={20}
            className={directUrl ? "text-primary" : "text-outline/70"}
          />
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
              <span className="ml-1 rounded bg-on-primary/15 px-1.5 py-0.5 font-code text-[10px]">
                ↵
              </span>
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
            <span className="ml-1 rounded bg-on-primary/15 px-1.5 py-0.5 font-code text-[10px]">
              ↵
            </span>
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
          {hasHistory ? "按空格查看最近搜索" : "Chrome 中保存的书签会出现在这里"}
        </div>
      </div>
    </div>
  );
}
