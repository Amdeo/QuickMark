import Fuse, { type IFuseOptions } from "fuse.js";
import type { BookmarkItem } from "./types";

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

export type ResultGroup = {
  domain: string;
  items: BookmarkItem[];
  /** 当前结果中的真实记录数；不计额外显示的根地址。 */
  count: number;
};

/**
 * 按域名分组，保持各组首次出现的顺序；组内将无路径、无参数的根地址
 * 排到最前。原始记录没有根地址时，基于该组首条链接补一个可打开的首页。
 */
export function groupByDomain(
  results: BookmarkItem[],
  referenceItems: BookmarkItem[] = results
): ResultGroup[] {
  const groups: ResultGroup[] = [];
  const groupIndexByDomain = new Map<string, number>();

  for (const item of results) {
    const existing = groupIndexByDomain.get(item.domain);
    if (existing === undefined) {
      groupIndexByDomain.set(item.domain, groups.length);
      groups.push({ domain: item.domain, items: [item], count: 1 });
    } else {
      groups[existing].items.push(item);
      groups[existing].count += 1;
    }
  }

  for (const group of groups) {
    const home =
      referenceItems.find((item) => item.domain === group.domain && isHomeUrl(item.url)) ??
      createHomeItem(group.items[0]);
    if (home) {
      group.items = [home, ...group.items.filter((item) => item.id !== home.id)];
    }
  }
  return groups;
}

export type SortMode = "smart" | "recent" | "frequent" | "title" | "created" | "relevance";

/**
 * 一级域名（裸首页）：路径为空或 "/"，且不带任何查询参数或锚点，
 * 如 https://example.com 或 https://example.com/。
 * 带参数的 https://example.com/?ref=x 不算根地址。
 */
export function isHomeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.pathname === "" || parsed.pathname === "/") && parsed.search === "" && parsed.hash === "";
  } catch {
    return false;
  }
}

function createHomeItem(item: BookmarkItem | undefined): BookmarkItem | undefined {
  if (!item) return undefined;
  try {
    const { origin } = new URL(item.url);
    if (origin === "null") return undefined;
    return {
      id: `quickmark-generated-home:${item.domain}`,
      title: "首页",
      url: `${origin}/`,
      domain: item.domain,
      favicon: item.favicon,
      visitCount: 0,
    };
  } catch {
    return undefined;
  }
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

/** 非“相关度优先”搜索的同分回退，以及无查询时的排序函数。 */
function getSortFn(sortMode: SortMode, sourceFilter: SourceFilter): (a: BookmarkItem, b: BookmarkItem) => number {
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
    case "relevance":
      return sourceFilter === "history" ? compareByRecency : compareByUsage;
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
  const sortFn = getSortFn(sortMode, sourceFilter);

  if (!textQuery) {
    return [...filtered].sort(sortFn);
  }

  const currentItemsById = new Map(filtered.map((item) => [item.id, item]));
  const matches = fuse.search(textQuery).flatMap((result) => {
    const item = currentItemsById.get(result.item.id);
    return item ? [{ item, score: result.score }] : [];
  });

  if (sortMode === "relevance") {
    return matches.map((match) => match.item);
  }

  return matches
    .sort((a, b) => {
      const scoreDelta = (a.score ?? 0) - (b.score ?? 0);
      if (Math.abs(scoreDelta) > 0.0001) {
        return scoreDelta;
      }
      return sortFn(a.item, b.item);
    })
    .map((match) => match.item);
}

function compareByRecency(a: BookmarkItem, b: BookmarkItem): number {
  const timeA = a.lastVisitedAt ?? a.createdAt ?? 0;
  const timeB = b.lastVisitedAt ?? b.createdAt ?? 0;
  if (timeB !== timeA) return timeB - timeA;
  return b.visitCount - a.visitCount;
}

/**
 * 访问次数最多的排前面（纯"使用频率"），次数相同时回退到最近访问。
 * 与 smartScore 的差别：不掺入时间衰减，长期不用但访问多的记录
 * 依然靠前，避免和"智能排序"表现雷同。
 */
function compareByVisitCount(a: BookmarkItem, b: BookmarkItem): number {
  if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
  return compareByRecency(a, b);
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
