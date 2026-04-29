import { describe, expect, it } from "vitest";
import type { BookmarkItem } from "./types";
import { searchBookmarks } from "./search";

const items: BookmarkItem[] = [
  {
    id: "a",
    title: "React Documentation",
    url: "https://react.dev/reference/react",
    domain: "react.dev",
    createdAt: 1,
    updatedAt: 100,
    lastVisitedAt: 100,
    visitCount: 2,
    tags: [],
    workspaceId: null,
    notes: ""
  },
  {
    id: "b",
    title: "React Router Guide",
    url: "https://reactrouter.com/start",
    domain: "reactrouter.com",
    createdAt: 1,
    updatedAt: 300,
    lastVisitedAt: 300,
    visitCount: 1,
    tags: [],
    workspaceId: null,
    notes: ""
  },
  {
    id: "c",
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/",
    domain: "typescriptlang.org",
    createdAt: 1,
    updatedAt: 200,
    lastVisitedAt: 200,
    visitCount: 9,
    tags: [],
    workspaceId: null,
    notes: ""
  }
];

describe("searchBookmarks", () => {
  it("returns recent bookmarks first when query is empty", () => {
    expect(searchBookmarks(items, "").map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("searches by title, url, and domain", () => {
    expect(searchBookmarks(items, "typescript").map((item) => item.id)).toEqual(["c"]);
    expect(searchBookmarks(items, "reactrouter").map((item) => item.id)).toEqual(["b"]);
  });

  it("uses visit count as a tie breaker after recency", () => {
    const sameRecency = items.map((item) => ({ ...item, lastVisitedAt: 100 }));

    expect(searchBookmarks(sameRecency, "").map((item) => item.id)).toEqual(["c", "a", "b"]);
  });
});
