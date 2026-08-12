import type { BookmarkItem } from "../domain/types";
import { getExtensionFaviconUrl } from "./favicon";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isSearchablePageUrl(url: string): boolean {
  try {
    const blockedProtocols = new Set([
      "about:",
      "chrome:",
      "chrome-extension:",
      "devtools:",
      "edge:",
      "moz-extension:",
      "safari-extension:"
    ]);
    return !blockedProtocols.has(new URL(url).protocol.toLowerCase());
  } catch {
    // Unparseable URLs are not injectable pages; be conservative.
    return false;
  }
}

function flattenBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  folderPath: string[] = []
): Array<{ item: BookmarkItem; folderPath: string[] }> {
  const results: Array<{ item: BookmarkItem; folderPath: string[] }> = [];

  for (const node of nodes) {
    if (node.url && isSearchablePageUrl(node.url)) {
      results.push({
        item: {
          id: node.id,
          title: node.title || node.url,
          url: node.url,
          domain: extractDomain(node.url),
          favicon: getExtensionFaviconUrl(node.url),
          createdAt: node.dateAdded,
          visitCount: 0,
          source: "bookmark"
        },
        folderPath: [...folderPath]
      });
    } else if (node.children) {
      results.push(...flattenBookmarks(node.children, [...folderPath, node.title]));
    }
  }

  return results;
}

export async function getNativeBookmarks(): Promise<
  Array<{ item: BookmarkItem; folderPath: string[] }>
> {
  const [tree, historyItems] = await Promise.all([
    chrome.bookmarks.getTree(),
    chrome.history.search({ text: "", maxResults: 5000, startTime: Date.now() - 90 * 86400000 })
  ]);

  const bookmarkResults = flattenBookmarks(tree);
  const bookmarkUrlSet = new Set(bookmarkResults.map((r) => r.item.url));

  // Build a single merged map of all searchable history entries.
  const historyMap = new Map<string, { title: string; lastVisitTime: number; visitCount: number }>();
  for (const h of historyItems) {
    if (!h.url || !isSearchablePageUrl(h.url)) continue;
    const existing = historyMap.get(h.url);
    if (existing) {
      existing.visitCount += h.visitCount ?? 0;
      if (h.lastVisitTime && h.lastVisitTime > existing.lastVisitTime) {
        existing.lastVisitTime = h.lastVisitTime;
        if (h.title) existing.title = h.title;
      }
    } else {
      historyMap.set(h.url, {
        title: h.title || h.url,
        lastVisitTime: h.lastVisitTime ?? 0,
        visitCount: h.visitCount ?? 0,
      });
    }
  }

  // Enrich bookmarks with history visit data.
  for (const r of bookmarkResults) {
    const history = historyMap.get(r.item.url);
    if (history) {
      r.item.lastVisitedAt = Math.floor(history.lastVisitTime);
      r.item.visitCount = history.visitCount;
    }
  }

  // Convert non-bookmark history to BookmarkItem format.
  const historyResults: Array<{ item: BookmarkItem; folderPath: string[] }> = [];
  let historyId = 0;
  for (const [url, data] of historyMap) {
    if (bookmarkUrlSet.has(url)) continue;
    historyResults.push({
      item: {
        id: `history-${historyId++}`,
        title: data.title,
        url,
        domain: extractDomain(url),
        favicon: getExtensionFaviconUrl(url),
        lastVisitedAt: Math.floor(data.lastVisitTime),
        visitCount: data.visitCount,
        source: "history",
      },
      folderPath: [],
    });
  }

  return [...bookmarkResults, ...historyResults];
}
