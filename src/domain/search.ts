import Fuse, { type IFuseOptions } from "fuse.js";
import type { BookmarkItem, Workspace } from "./types";

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

function parseQuery(query: string) {
  const tags: string[] = [];
  const workspaces: string[] = [];
  const textTokens: string[] = [];

  for (const token of query.trim().split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith("#") && token.length > 1) {
      tags.push(token.slice(1).toLowerCase());
    } else if (token.startsWith("@") && token.length > 1) {
      workspaces.push(token.slice(1).toLowerCase());
    } else {
      textTokens.push(token);
    }
  }

  return {
    tags,
    workspaces,
    textQuery: textTokens.join(" ")
  };
}

export function searchBookmarks(
  items: BookmarkItem[],
  query: string,
  workspaces?: Workspace[]
): BookmarkItem[] {
  const { tags, workspaces: workspaceQueries, textQuery } = parseQuery(query);

  let filtered = items;

  if (tags.length > 0) {
    filtered = filtered.filter((item) =>
      tags.every((tag) => item.tags.some((t) => t.toLowerCase() === tag))
    );
  }

  if (workspaceQueries.length > 0 && workspaces) {
    const workspaceNameMap = new Map<string, string>();
    for (const ws of workspaces) {
      workspaceNameMap.set(ws.name.toLowerCase(), ws.id);
    }
    const matchingIds = new Set(
      workspaceQueries
        .map((name) => workspaceNameMap.get(name))
        .filter((id): id is string => id !== undefined)
    );
    filtered = filtered.filter(
      (item) => item.workspaceId !== null && matchingIds.has(item.workspaceId)
    );
  }

  if (!textQuery.trim()) {
    return [...filtered].sort(compareByUsage);
  }

  return new Fuse(filtered, fuseOptions)
    .search(textQuery)
    .sort((a, b) => {
      const scoreDelta = (a.score ?? 0) - (b.score ?? 0);
      if (Math.abs(scoreDelta) > 0.0001) {
        return scoreDelta;
      }

      return compareByUsage(a.item, b.item);
    })
    .map((result) => result.item);
}

function compareByUsage(a: BookmarkItem, b: BookmarkItem): number {
  const aVisited = a.lastVisitedAt ?? a.updatedAt;
  const bVisited = b.lastVisitedAt ?? b.updatedAt;

  if (bVisited !== aVisited) {
    return bVisited - aVisited;
  }

  if (b.visitCount !== a.visitCount) {
    return b.visitCount - a.visitCount;
  }

  return a.title.localeCompare(b.title);
}
