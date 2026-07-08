import Fuse, { type IFuseOptions } from "fuse.js";
import type { BookmarkItem } from "./types";

const fuseOptions: IFuseOptions<BookmarkItem> = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "domain", weight: 0.3 },
    { name: "url", weight: 0.2 }
  ],
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true
};

export function createBookmarkSearchIndex(items: BookmarkItem[]) {
  return new Fuse(items, fuseOptions);
}

export type SourceFilter = "all" | "bookmark" | "history";

export function filterBySource(items: BookmarkItem[], sourceFilter: SourceFilter): BookmarkItem[] {
  if (sourceFilter === "all") return items;
  return items.filter((item) => item.source === sourceFilter);
}

export function searchBookmarks(
  items: BookmarkItem[],
  query: string,
  fuse = createBookmarkSearchIndex(items),
  sourceFilter: SourceFilter = "all"
): BookmarkItem[] {
  const textQuery = query.trim();
  const filtered = filterBySource(items, sourceFilter);
  const sortFn = sourceFilter === "history" ? compareByRecency : compareByUsage;

  if (!textQuery) {
    return [...filtered].sort(sortFn);
  }

  const searchFuse = sourceFilter === "all" ? fuse : createBookmarkSearchIndex(filtered);

  return searchFuse
    .search(textQuery)
    .sort((a, b) => {
      const scoreDelta = (a.score ?? 0) - (b.score ?? 0);
      if (Math.abs(scoreDelta) > 0.0001) {
        return scoreDelta;
      }
      return sortFn(a.item, b.item);
    })
    .map((result) => result.item);
}

function compareByRecency(a: BookmarkItem, b: BookmarkItem): number {
  const timeA = a.lastVisitedAt ?? a.createdAt ?? 0;
  const timeB = b.lastVisitedAt ?? b.createdAt ?? 0;
  if (timeB !== timeA) return timeB - timeA;
  return b.visitCount - a.visitCount;
}

function smartScore(item: BookmarkItem, now: number): number {
  let score = 0;
  const daysSinceVisit = (now - (item.lastVisitedAt ?? item.createdAt ?? now)) / 86400000;
  score += Math.max(0, 100 * Math.exp(-daysSinceVisit / 7));
  score += Math.log2(item.visitCount + 1) * 30;
  const daysSinceCreate = (now - (item.createdAt ?? now)) / 86400000;
  score += Math.max(0, 50 * Math.exp(-daysSinceCreate / 14));
  return score;
}

function compareByUsage(a: BookmarkItem, b: BookmarkItem): number {
  const now = Date.now();
  const scoreDelta = smartScore(b, now) - smartScore(a, now);
  if (Math.abs(scoreDelta) > 0.1) {
    return scoreDelta;
  }
  return a.title.localeCompare(b.title);
}
