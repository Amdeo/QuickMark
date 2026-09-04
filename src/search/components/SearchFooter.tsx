import { Icon } from "../../components/Icon";
import type { ThemePreference } from "../hooks/useTheme";
import { Kbd } from "./Kbd";

interface SearchFooterProps {
  directUrl?: string;
  hasQuery: boolean;
  hasSelected: boolean;
  themePref: ThemePreference;
  effectiveTheme: "light" | "dark";
  onCycleTheme: () => void;
  onClose?: () => void;
}

export function SearchFooter({
  directUrl,
  hasQuery,
  hasSelected,
  themePref,
  effectiveTheme,
  onCycleTheme,
  onClose,
}: SearchFooterProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-outline-variant/40 bg-surface-container-low/60 px-3 py-2 text-[11px] text-outline">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <Kbd>↑↓</Kbd>
          <span>导航</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          <span>
            {directUrl ? "跳转" : hasSelected ? "打开" : hasQuery ? "搜索" : "打开"}
          </span>
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="flex items-center gap-0.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <span>新标签</span>
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="flex items-center gap-0.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>1–9</Kbd>
          </span>
          <span>直达</span>
        </span>
        {hasSelected ? (
          <span className="hidden items-center gap-1.5 lg:flex">
            <span className="flex items-center gap-0.5">
              <Kbd>Ctrl</Kbd>
              <Kbd>C</Kbd>
            </span>
            <span>复制链接</span>
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          title={`主题: ${themePref === "system" ? "跟随系统" : themePref === "light" ? "浅色" : "深色"}`}
          onClick={onCycleTheme}
          className="flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[11px] text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Icon
            name={
              themePref === "dark" || (themePref === "system" && effectiveTheme === "dark")
                ? "dark_mode"
                : "light_mode"
            }
            size={12}
          />
          <span>{themePref === "system" ? "自动" : themePref === "light" ? "浅色" : "深色"}</span>
        </button>
        {onClose ? (
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            <span>{hasQuery ? "清空" : "关闭"}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
