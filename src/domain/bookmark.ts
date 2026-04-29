import type { BookmarkItem, TabSnapshot } from "./types";

export function bookmarkFromTab(tab: TabSnapshot, now = Date.now()): BookmarkItem {
  if (!tab.url) {
    throw new Error("Cannot save a tab without a URL");
  }

  const url = normalizeUrl(tab.url);

  return {
    id: url,
    title: tab.title?.trim() || tab.url,
    url,
    domain: extractDomain(url),
    favicon: tab.favIconUrl,
    createdAt: now,
    updatedAt: now,
    visitCount: 1,
    tags: [],
    workspaceId: null,
    notes: ""
  };
}

export function touchBookmark(
  item: BookmarkItem,
  now = Date.now(),
  patch: Partial<
    Pick<BookmarkItem, "title" | "domain" | "favicon" | "url" | "tags" | "workspaceId" | "notes">
  > = {}
): BookmarkItem {
  return {
    ...item,
    ...patch,
    updatedAt: now,
    lastVisitedAt: now,
    visitCount: item.visitCount + 1
  };
}

export function extractDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  const normalized = parsed.toString();

  if (parsed.pathname === "/" && !parsed.search && !parsed.hash) {
    return normalized.replace(/\/$/, "");
  }

  return normalized;
}
