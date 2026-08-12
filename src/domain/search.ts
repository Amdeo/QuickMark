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

export type TimeFilter = "all" | "today" | "week" | "month";

/**
 * Start-of-period boundary (local time) for a time filter:
 * today = midnight, week = Monday 00:00, month = the 1st 00:00.
 */
function getTimeFilterStart(now: number, timeFilter: TimeFilter): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  if (timeFilter === "week") {
    // getDay(): 0 = Sunday, 6 = Saturday; (day + 6) % 7 days back reaches Monday.
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  } else if (timeFilter === "month") {
    date.setDate(1);
  }
  return date.getTime();
}

/**
 * Keep items whose last visit (or creation) time falls inside the period.
 * Items with no timestamp are only included when timeFilter is "all".
 */
export function filterByTime(items: BookmarkItem[], timeFilter: TimeFilter, now = Date.now()): BookmarkItem[] {
  if (timeFilter === "all") return items;
  const start = getTimeFilterStart(now, timeFilter);
  return items.filter((item) => (item.lastVisitedAt ?? item.createdAt ?? 0) >= start);
}

export type ResultGroup = {
  domain: string;
  items: BookmarkItem[];
};

/**
 * Group consecutive search results by domain, preserving the original order
 * of the first occurrence of each domain. Used by the UI to collapse
 * same-site clutter (e.g. multiple history entries from one site).
 */
export function groupByDomain(results: BookmarkItem[]): ResultGroup[] {
  const groups: ResultGroup[] = [];
  const groupIndexByDomain = new Map<string, number>();

  for (const item of results) {
    const existing = groupIndexByDomain.get(item.domain);
    if (existing === undefined) {
      groupIndexByDomain.set(item.domain, groups.length);
      groups.push({ domain: item.domain, items: [item] });
    } else {
      groups[existing].items.push(item);
    }
  }

  return groups;
}

export type SortMode = "smart" | "recent" | "frequent" | "title" | "created" | "relevance";

/**
 * A home page is a URL whose path is empty or just "/" —
 * e.g. https://example.com or https://example.com/?ref=x.
 */
export function isHomeUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname === "" || pathname === "/";
  } catch {
    return false;
  }
}

/**
 * Wrap a sort function so official home pages of a site always rank
 * before its sub-pages, no matter which sort mode is active.
 */
function withHomeFirst(sortFn: (a: BookmarkItem, b: BookmarkItem) => number) {
  return (a: BookmarkItem, b: BookmarkItem): number => {
    const aHome = isHomeUrl(a.url) ? 1 : 0;
    const bHome = isHomeUrl(b.url) ? 1 : 0;
    if (aHome !== bHome) return bHome - aHome;
    return sortFn(a, b);
  };
}

function compareByTitle(a: BookmarkItem, b: BookmarkItem): number {
  return a.title.localeCompare(b.title);
}

function compareByCreated(a: BookmarkItem, b: BookmarkItem): number {
  const timeA = a.createdAt ?? 0;
  const timeB = b.createdAt ?? 0;
  if (timeB !== timeA) return timeB - timeA;
  return b.visitCount - a.visitCount;
}

/**
 * Tie-breaker / no-query sort function for a sort mode.
 * "smart" and "relevance" both fall back to the existing automatic
 * choice: history by recency, everything else by usage.
 */
function getSortFn(sortMode: SortMode, sourceFilter: SourceFilter): (a: BookmarkItem, b: BookmarkItem) => number {
  switch (sortMode) {
    case "recent":
      return withHomeFirst(compareByRecency);
    case "frequent":
      return withHomeFirst(compareByUsage);
    case "title":
      return withHomeFirst(compareByTitle);
    case "created":
      return withHomeFirst(compareByCreated);
    case "smart":
    case "relevance":
      return withHomeFirst(sourceFilter === "history" ? compareByRecency : compareByUsage);
  }
}

export function searchBookmarks(
  items: BookmarkItem[],
  query: string,
  fuse = createBookmarkSearchIndex(items),
  sourceFilter: SourceFilter = "all",
  timeFilter: TimeFilter = "all",
  sortMode: SortMode = "smart"
): BookmarkItem[] {
  const textQuery = query.trim();
  const filtered = filterByTime(filterBySource(items, sourceFilter), timeFilter);
  const sortFn = getSortFn(sortMode, sourceFilter);

  if (!textQuery) {
    return [...filtered].sort(sortFn);
  }

  const needsCustomIndex = sourceFilter !== "all" || timeFilter !== "all";
  const searchFuse = needsCustomIndex ? createBookmarkSearchIndex(filtered) : fuse;

  const matches = searchFuse.search(textQuery);
  if (sortMode === "relevance") {
    return matches.map((result) => result.item);
  }

  return matches
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

const FULL_URL_PATTERN = /^https?:\/\/\S+$/i;
const BARE_DOMAIN_PATTERN = /^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:\/\S*)?$/i;
const LOCALHOST_PATTERN = /^localhost(?::\d{1,5})?(?:\/\S*)?$/i;

/**
 * If a query is a complete URL or a bare domain, return a navigable URL
 * (address-bar semantics). Returns undefined for plain text so the caller
 * falls back to bookmark search / web search.
 */
export function resolveDirectUrl(query: string): string | undefined {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  if (FULL_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (BARE_DOMAIN_PATTERN.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (LOCALHOST_PATTERN.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return undefined;
}
