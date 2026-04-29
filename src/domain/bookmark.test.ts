import { describe, expect, it } from "vitest";
import { bookmarkFromTab, touchBookmark } from "./bookmark";

describe("bookmark domain helpers", () => {
  it("builds a bookmark from the active tab metadata", () => {
    const item = bookmarkFromTab(
      {
        title: "QuickMark Spec",
        url: "https://example.com/docs/spec?tab=1#intro",
        favIconUrl: "https://example.com/favicon.ico"
      },
      1000
    );

    expect(item).toMatchObject({
      id: "https://example.com/docs/spec?tab=1#intro",
      title: "QuickMark Spec",
      url: "https://example.com/docs/spec?tab=1#intro",
      domain: "example.com",
      favicon: "https://example.com/favicon.ico",
      createdAt: 1000,
      updatedAt: 1000,
      visitCount: 1,
      tags: [],
      workspaceId: null,
      notes: ""
    });
  });

  it("uses the URL as title when tab title is missing", () => {
    const item = bookmarkFromTab({ url: "https://news.ycombinator.com/" }, 2000);

    expect(item.title).toBe("https://news.ycombinator.com/");
    expect(item.domain).toBe("news.ycombinator.com");
  });

  it("touches an existing bookmark without changing creation time", () => {
    const original = bookmarkFromTab({ title: "Docs", url: "https://example.com" }, 1000);
    const updated = touchBookmark(original, 3000, { title: "New Docs" });

    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(3000);
    expect(updated.lastVisitedAt).toBe(3000);
    expect(updated.visitCount).toBe(2);
    expect(updated.title).toBe("New Docs");
  });

  it("can update tags, workspaceId, and notes via touchBookmark", () => {
    const original = bookmarkFromTab({ title: "Docs", url: "https://example.com" }, 1000);
    const updated = touchBookmark(original, 3000, {
      tags: ["dev", "ref"],
      workspaceId: "ws-1",
      notes: "Important docs"
    });

    expect(updated.tags).toEqual(["dev", "ref"]);
    expect(updated.workspaceId).toBe("ws-1");
    expect(updated.notes).toBe("Important docs");
    expect(updated.updatedAt).toBe(3000);
    expect(updated.visitCount).toBe(2);
  });
});
