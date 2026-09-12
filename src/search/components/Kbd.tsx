import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="flex h-[18px] items-center justify-center rounded border border-outline-variant/50 bg-surface-container/70 px-1 font-code text-[10px] font-medium text-outline">
      {children}
    </kbd>
  );
}
