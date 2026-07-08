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

export function isNearScrollBottom(metrics: ScrollMetrics, threshold = 120): boolean {
  return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - threshold;
}
