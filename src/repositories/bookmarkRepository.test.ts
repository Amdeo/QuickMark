import { describe, expect, it } from "vitest";
import { createMemoryStorageArea } from "../test/memoryStorage";
import { ChromeBookmarkRepository } from "./bookmarkRepository";

describe("ChromeBookmarkRepository", () => {
  it("upserts new and existing bookmarks by URL id", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const first = await repository.saveCurrentTab(
      { title: "Example", url: "https://example.com", favIconUrl: "icon-a" },
      {},
      1000
    );
    const second = await repository.saveCurrentTab(
      { title: "Example Updated", url: "https://example.com", favIconUrl: "icon-b" },
      {},
      2000
    );
    const all = await repository.list();

    expect(first.visitCount).toBe(1);
    expect(second).toMatchObject({
      id: "https://example.com",
      title: "Example Updated",
      favicon: "icon-b",
      createdAt: 1000,
      updatedAt: 2000,
      lastVisitedAt: 2000,
      visitCount: 2
    });
    expect(all).toHaveLength(1);
  });

  it("saves a new bookmark with options", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const item = await repository.saveCurrentTab(
      { title: "Example", url: "https://example.com", favIconUrl: "icon-a" },
      { tags: ["news", "tech"], workspaceId: "ws-1", notes: "A note" },
      1000
    );

    expect(item).toMatchObject({
      id: "https://example.com",
      title: "Example",
      tags: ["news", "tech"],
      workspaceId: "ws-1",
      notes: "A note",
      visitCount: 1
    });
  });

  it("preserves existing options on upsert when not provided", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    await repository.saveCurrentTab(
      { title: "Example", url: "https://example.com" },
      { tags: ["news"], workspaceId: "ws-1", notes: "A note" },
      1000
    );

    const second = await repository.saveCurrentTab(
      { title: "Example Updated", url: "https://example.com" },
      {},
      2000
    );

    expect(second).toMatchObject({
      tags: ["news"],
      workspaceId: "ws-1",
      notes: "A note",
      visitCount: 2
    });
  });

  it("overrides existing options on upsert when provided", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    await repository.saveCurrentTab(
      { title: "Example", url: "https://example.com" },
      { tags: ["news"], workspaceId: "ws-1", notes: "A note" },
      1000
    );

    const second = await repository.saveCurrentTab(
      { title: "Example Updated", url: "https://example.com" },
      { tags: ["updated"], workspaceId: null, notes: "Updated note" },
      2000
    );

    expect(second).toMatchObject({
      tags: ["updated"],
      workspaceId: null,
      notes: "Updated note",
      visitCount: 2
    });
  });

  it("updates a bookmark by id", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const item = await repository.saveCurrentTab(
      { title: "Example", url: "https://example.com" },
      {},
      1000
    );

    const updated = await repository.update(
      item.id,
      { title: "Updated Title", tags: ["tag1"], notes: "New notes" },
      3000
    );

    expect(updated).toMatchObject({
      id: item.id,
      title: "Updated Title",
      tags: ["tag1"],
      notes: "New notes",
      updatedAt: 3000,
      createdAt: 1000
    });
  });

  it("returns undefined when updating non-existing bookmark", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const result = await repository.update("non-existing", { title: "X" });
    expect(result).toBeUndefined();
  });

  it("lists bookmarks by workspace", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    await repository.saveCurrentTab(
      { title: "A", url: "https://a.com" },
      { workspaceId: "ws-1" },
      1000
    );
    await repository.saveCurrentTab(
      { title: "B", url: "https://b.com" },
      { workspaceId: null },
      1000
    );
    await repository.saveCurrentTab(
      { title: "C", url: "https://c.com" },
      { workspaceId: "ws-1" },
      1000
    );

    const ws1 = await repository.listByWorkspace("ws-1");
    const unassigned = await repository.listByWorkspace(null);

    expect(ws1).toHaveLength(2);
    expect(ws1.map((i) => i.title)).toEqual(["C", "A"]);
    expect(unassigned).toHaveLength(1);
    expect(unassigned[0].title).toBe("B");
  });

  it("removes a bookmark by id", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const item = await repository.saveCurrentTab({ title: "Example", url: "https://example.com" }, {}, 1000);
    await repository.remove(item.id);

    expect(await repository.list()).toEqual([]);
  });

  it("migrates old bookmarks without new fields on list", async () => {
    const storage = createMemoryStorageArea({
      "quickmark.bookmarks": [
        {
          id: "https://old.com",
          title: "Old",
          url: "https://old.com",
          domain: "old.com",
          createdAt: 100,
          updatedAt: 100,
          visitCount: 1
        }
      ]
    });
    const repository = new ChromeBookmarkRepository(storage);

    const items = await repository.list();
    expect(items[0]).toMatchObject({
      tags: [],
      workspaceId: null,
      notes: ""
    });
  });

  it("migrates old bookmarks without isFavorite/isUnread", async () => {
    const storage = createMemoryStorageArea({
      "quickmark.bookmarks": [
        {
          id: "https://old-unread.com",
          title: "Old Unread",
          url: "https://old-unread.com",
          domain: "old-unread.com",
          createdAt: 100,
          updatedAt: 100,
          visitCount: 0
        },
        {
          id: "https://old-read.com",
          title: "Old Read",
          url: "https://old-read.com",
          domain: "old-read.com",
          createdAt: 100,
          updatedAt: 100,
          visitCount: 3
        }
      ]
    });
    const repository = new ChromeBookmarkRepository(storage);

    const items = await repository.list();
    expect(items[0]).toMatchObject({ isFavorite: false, isUnread: true });
    expect(items[1]).toMatchObject({ isFavorite: false, isUnread: false });
  });

  it("saves a new bookmark with isUnread=true and isFavorite=false by default", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const item = await repository.saveCurrentTab(
      { title: "Example", url: "https://example.com" },
      {},
      1000
    );

    expect(item).toMatchObject({ isFavorite: false, isUnread: true });
  });

  it("bulk updates multiple bookmarks", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const a = await repository.saveCurrentTab({ title: "A", url: "https://a.com" }, {}, 1000);
    const b = await repository.saveCurrentTab({ title: "B", url: "https://b.com" }, {}, 1000);
    const c = await repository.saveCurrentTab({ title: "C", url: "https://c.com" }, {}, 1000);

    await repository.bulkUpdate([a.id, b.id], { workspaceId: "ws-1" }, 2000);

    const items = await repository.list();
    expect(items.find((i) => i.id === a.id)?.workspaceId).toBe("ws-1");
    expect(items.find((i) => i.id === b.id)?.workspaceId).toBe("ws-1");
    expect(items.find((i) => i.id === c.id)?.workspaceId).toBeNull();
  });
});
