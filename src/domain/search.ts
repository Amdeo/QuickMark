import Fuse, { type IFuseOptions } from "fuse.js";
import type { BookmarkItem } from "./types";
import { isHttpUrl } from "./url";

export { isHttpUrl };

/** Fuse 索引只保留搜索字段，访问统计由最新的 BookmarkItem 单独提供。 */
export type SearchableBookmarkItem = Pick<BookmarkItem, "id" | "title" | "url" | "domain">;

/** Fuse 索引使用的中间类型：额外携带中文标题的全拼字段。 */
export type IndexableBookmarkItem = SearchableBookmarkItem & {
  /** 中文标题的全拼（带空格与紧凑两种变体），纯英文标题为空字符串。 */
  __pinyin: string;
};

const PINYIN_KEY = "__pinyin";

const fuseOptions: IFuseOptions<IndexableBookmarkItem> = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "domain", weight: 0.3 },
    { name: "url", weight: 0.2 },
    { name: PINYIN_KEY, weight: 0.3 }
  ],
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true
};

const CJK_PATTERN = /[\u4e00-\u9fff]/;

type PinyinFn = (text: string, options?: { toneType?: string; type?: string; nonZh?: string }) => string;

let pinyinFn: PinyinFn | undefined;
let pinyinLoadPromise: Promise<PinyinFn> | undefined;

/**
 * 惰性加载拼音字典。字典作为独立 chunk（esbuild splitting）打包，
 * 仅在书签中存在中文标题时才被拉取；纯英文书签的用户零开销。
 */
export function ensurePinyinLoaded(): Promise<void> {
  if (pinyinFn) return Promise.resolve();
  if (!pinyinLoadPromise) {
    pinyinLoadPromise = import("pinyin-pro")
      .then((module) => {
        pinyinFn = module.pinyin as PinyinFn;
        return pinyinFn;
      })
      .catch((error) => {
        pinyinLoadPromise = undefined;
        throw error;
      });
  }
  return pinyinLoadPromise.then(() => undefined);
}

/** 是否存在中文标题（决定是否需要拼音字典）。 */
export function hasCjkTitles(items: BookmarkItem[]): boolean {
  return items.some((item) => CJK_PATTERN.test(item.title));
}

/**
 * 为含中文的标题生成全拼，同时提供带空格（zhi hu）与紧凑（zhihu）两种
 * 变体，保证「zhihu」与「zhi hu」两种输入习惯都能命中。
 * 纯英文标题返回空字符串，避免与 title 字段重复计分。
 * 字典未就绪时也返回空字符串（索引先以无拼音状态建立）。
 */
function toSearchPinyin(text: string): string {
  if (!CJK_PATTERN.test(text)) return "";
  if (!pinyinFn) return "";
  try {
    const spaced = pinyinFn(text, { toneType: "none", type: "string", nonZh: "consecutive" });
    const compact = spaced.replace(/\s+/g, "");
    return compact ? `${spaced} ${compact}` : spaced;
  } catch {
    return "";
  }
}

export function createBookmarkSearchIndex(items: SearchableBookmarkItem[]): Fuse<IndexableBookmarkItem> {
  return new Fuse(
    items.map(({ id, title, url, domain }) => ({
      id,
      title,
      url,
      domain,
      [PINYIN_KEY]: toSearchPinyin(title),
    })),
    fuseOptions
  );
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

export type SortMode = "smart" | "recent" | "frequent" | "title" | "created" | "relevance";

function compareByTitle(a: BookmarkItem, b: BookmarkItem): number {
  return a.title.localeCompare(b.title);
}

function compareByCreated(a: BookmarkItem, b: BookmarkItem): number {
  const timeA = a.createdAt ?? 0;
  const timeB = b.createdAt ?? 0;
  if (timeB !== timeA) return timeB - timeA;
  return b.visitCount - a.visitCount;
}

function compareByRecency(a: BookmarkItem, b: BookmarkItem): number {
  const timeA = a.lastVisitedAt ?? 0;
  const timeB = b.lastVisitedAt ?? 0;
  if (timeB !== timeA) return timeB - timeA;
  return b.visitCount - a.visitCount;
}

function compareByVisitCount(a: BookmarkItem, b: BookmarkItem): number {
  if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
  return compareByRecency(a, b);
}

/** Recent visits dominate; bounded frequency decays too, so dormant pages cannot stay pinned by usage. */
function smartScore(item: BookmarkItem, now: number): number {
  const daysSinceVisit = item.lastVisitedAt === undefined
    ? Infinity
    : Math.max(0, (now - item.lastVisitedAt) / 86_400_000);
  const recency = 100 * Math.exp(-daysSinceVisit / 3);
  const frequency = 40 * Math.min(1, Math.log2(Math.max(0, item.visitCount) + 1) / 8) * Math.exp(-daysSinceVisit / 14);
  return recency + frequency;
}

function getSortFn(sortMode: SortMode, candidates: BookmarkItem[], now: number): (a: BookmarkItem, b: BookmarkItem) => number {
  switch (sortMode) {
    case "recent":
      return compareByRecency;
    case "frequent":
      return compareByVisitCount;
    case "title":
      return compareByTitle;
    case "created":
      return compareByCreated;
    case "smart":
    case "relevance": {
      const scores = new Map(candidates.map((item) => [item.id, smartScore(item, now)]));
      return (a, b) => (scores.get(b.id)! - scores.get(a.id)!) || compareByRecency(a, b) || compareByTitle(a, b);
    }
  }
}

export function searchBookmarks(
  items: BookmarkItem[],
  query: string,
  fuse: Fuse<IndexableBookmarkItem> = createBookmarkSearchIndex(items),
  sourceFilter: SourceFilter = "all",
  timeFilter: TimeFilter = "all",
  sortMode: SortMode = "smart",
  filteredItems?: BookmarkItem[]
): BookmarkItem[] {
  const textQuery = query.trim();
  const filtered = filteredItems ?? filterByTime(filterBySource(items, sourceFilter), timeFilter);
  const now = Date.now();
  if (!textQuery) return [...filtered].sort(getSortFn(sortMode, filtered, now));

  const currentItemsById = new Map(filtered.map((item) => [item.id, item]));
  const matches = fuse.search(textQuery).flatMap((result) => {
    const item = currentItemsById.get(result.item.id);
    return item ? [{ item, score: result.score }] : [];
  });

  if (sortMode === "relevance") return matches.map((match) => match.item);
  const sortFn = getSortFn(sortMode, matches.map((match) => match.item), now);

  return matches
    .sort((a, b) => {
      const scoreDelta = (a.score ?? 0) - (b.score ?? 0);
      return Math.abs(scoreDelta) > 0.0001 ? scoreDelta : sortFn(a.item, b.item);
    })
    .map((match) => match.item);
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

  if (FULL_URL_PATTERN.test(trimmed) && isHttpUrl(trimmed)) {
    return trimmed;
  }

  if (BARE_DOMAIN_PATTERN.test(trimmed)) {
    const url = `https://${trimmed}`;
    return isHttpUrl(url) ? url : undefined;
  }

  if (LOCALHOST_PATTERN.test(trimmed)) {
    const url = `http://${trimmed}`;
    return isHttpUrl(url) ? url : undefined;
  }

  return undefined;
}
