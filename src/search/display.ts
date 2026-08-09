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

export function isNearScrollBottom(metrics: ScrollMetrics, threshold = 120): boolean {
  return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - threshold;
}
