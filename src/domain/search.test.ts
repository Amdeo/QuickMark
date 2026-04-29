import { describe, expect, it } from "vitest";
import type { BookmarkItem, Workspace } from "./types";
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
    tags: ["frontend", "docs"],
    workspaceId: "ws1",
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
    tags: ["frontend", "routing"],
    workspaceId: "ws2",
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
    tags: ["backend", "docs"],
    workspaceId: null,
    notes: ""
  }
];

const workspaces: Workspace[] = [
  { id: "ws1", name: "Personal", createdAt: 1, updatedAt: 1 },
  { id: "ws2", name: "Work", createdAt: 1, updatedAt: 1 }
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

  it("filters by tag with # syntax", () => {
    expect(searchBookmarks(items, "#docs").map((item) => item.id)).toEqual(["c", "a"]);
    expect(searchBookmarks(items, "#frontend").map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("filters by multiple tags", () => {
    expect(searchBookmarks(items, "#docs #frontend").map((item) => item.id)).toEqual(["a"]);
  });

  it("filters by workspace with @ syntax", () => {
    expect(searchBookmarks(items, "@personal", workspaces).map((item) => item.id)).toEqual(["a"]);
    expect(searchBookmarks(items, "@work", workspaces).map((item) => item.id)).toEqual(["b"]);
  });

  it("combines text search with tag and workspace filters", () => {
    expect(searchBookmarks(items, "react @personal", workspaces).map((item) => item.id)).toEqual(["a"]);
    expect(searchBookmarks(items, "react #routing", workspaces).map((item) => item.id)).toEqual(["b"]);
  });

  it("ignores @workspace filter when workspaces list is not provided", () => {
    expect(searchBookmarks(items, "@personal").map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("returns empty result when no matches", () => {
    expect(searchBookmarks(items, "#nonexistent")).toEqual([]);
    expect(searchBookmarks(items, "@nonexistent", workspaces)).toEqual([]);
  });
});
