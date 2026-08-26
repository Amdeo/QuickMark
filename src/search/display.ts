export type TextSegment = {
  text: string;
  match: boolean;
};

export type ScrollMetrics = {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
};

export function getDisplayFolderPath(path: string[]): string {
  if (path.length <= 2) {
    return path.join(" > ");
  }
  return ["...", ...path.slice(-2)].join(" > ");
}

export function splitQueryMatch(text: string, query: string): TextSegment[] {
  const needle = query.trim();
  if (!needle) {
    return [{ text, match: false }];
  }

  const index = text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (index < 0) {
    return [{ text, match: false }];
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + needle.length);
  const after = text.slice(index + needle.length);
  return [
    ...(before ? [{ text: before, match: false }] : []),
    { text: match, match: true },
    ...(after ? [{ text: after, match: false }] : []),
  ];
}

export function getNextVisibleResultCount(current: number, total: number, pageSize: number): number {
  return Math.min(total, current + pageSize);
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp;
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 2 * day) return "昨天";
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return sameYear
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function compactUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

export type ScrollTargetMetrics = ScrollMetrics & {
  containerTop: number;
  rowTop: number;
  rowHeight: number;
  anchor: number;
};

export function getScrollTarget(metrics: ScrollTargetMetrics): number | undefined {
  // 行在视口内的位置：rowTop - containerTop 已包含当前滚动偏移的影响。
  const viewportTop = metrics.rowTop - metrics.containerTop;
  const viewportBottom = viewportTop + metrics.rowHeight;
  const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight);

  if (viewportTop < metrics.anchor) {
    // 行高于顶部锚点：向上滚，直到行顶落到锚点位置。
    return Math.max(0, Math.min(maxScroll, metrics.scrollTop - (metrics.anchor - viewportTop)));
  }

  if (viewportBottom > metrics.clientHeight - metrics.anchor) {
    // 行低于底部锚点：向下滚行底到锚点带下沿。
    return Math.max(
      0,
      Math.min(
        maxScroll,
        metrics.scrollTop + (viewportBottom - (metrics.clientHeight - metrics.anchor))
      )
    );
  }

  return undefined;
}

export function isNearScrollBottom(metrics: ScrollMetrics, threshold = 120): boolean {
  return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - threshold;
}