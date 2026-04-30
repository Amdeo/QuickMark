import { bookmarkFromTab, extractDomain, touchBookmark } from "../domain/bookmark";
import type { BookmarkItem, TabSnapshot } from "../domain/types";

const STORAGE_KEY = "quickmark.bookmarks";

export type SaveOptions = {
  tags?: string[];
  workspaceId?: string | null;
  notes?: string;
};

export interface BookmarkRepository {
  list(): Promise<BookmarkItem[]>;
  saveCurrentTab(tab: TabSnapshot, options?: SaveOptions, now?: number): Promise<BookmarkItem>;
  update(id: string, patch: Partial<Omit<BookmarkItem, "id" | "createdAt" | "lastVisitedAt" | "visitCount">>, now?: number): Promise<BookmarkItem | undefined>;
  bulkUpdate(ids: string[], patch: Partial<Omit<BookmarkItem, "id" | "createdAt" | "lastVisitedAt" | "visitCount">>, now?: number): Promise<void>;
  listByWorkspace(workspaceId: string | null): Promise<BookmarkItem[]>;
  markVisited(id: string, now?: number): Promise<BookmarkItem | undefined>;
  remove(id: string): Promise<void>;
}

export class ChromeBookmarkRepository implements BookmarkRepository {
  constructor(private readonly storage: Pick<chrome.storage.StorageArea, "get" | "set">) {}

  async list(): Promise<BookmarkItem[]> {
    const result = await this.storage.get({ [STORAGE_KEY]: [] });
    const items = Array.isArray(result[STORAGE_KEY]) ? (result[STORAGE_KEY] as BookmarkItem[]) : [];
    return items.map((item) => ({
      ...item,
      tags: item.tags ?? [],
      workspaceId: item.workspaceId ?? null,
      notes: item.notes ?? "",
      isFavorite: item.isFavorite ?? false,
      isUnread: item.isUnread ?? (item.visitCount === 0 ? true : false)
    }));
  }

  async saveCurrentTab(tab: TabSnapshot, options: SaveOptions = {}, now = Date.now()): Promise<BookmarkItem> {
    const next = bookmarkFromTab(tab, now);
    const items = await this.list();
    const existing = items.find((item) => item.id === next.id);
    const saved = existing
      ? touchBookmark(existing, now, {
          title: next.title,
          url: next.url,
          domain: next.domain,
          favicon: next.favicon,
          tags: options.tags ?? existing.tags,
          workspaceId: options.workspaceId !== undefined ? options.workspaceId : existing.workspaceId,
          notes: options.notes ?? existing.notes,
          isFavorite: existing.isFavorite,
          isUnread: existing.isUnread,
        })
      : { ...next, ...options };

    await this.write(upsert(items, saved));
    return saved;
  }

  async update(id: string, patch: Partial<Omit<BookmarkItem, "id" | "createdAt" | "lastVisitedAt" | "visitCount">>, now = Date.now()): Promise<BookmarkItem | undefined> {
    const items = await this.list();
    const existing = items.find((item) => item.id === id);

    if (!existing) {
      return undefined;
    }

    const saved: BookmarkItem = {
      ...existing,
      ...patch,
      updatedAt: now
    };
    await this.write(upsert(items, saved));
    return saved;
  }

  async listByWorkspace(workspaceId: string | null): Promise<BookmarkItem[]> {
    const items = await this.list();
    return items.filter((item) => item.workspaceId === workspaceId);
  }

  async markVisited(id: string, now = Date.now()): Promise<BookmarkItem | undefined> {
    const items = await this.list();
    const existing = items.find((item) => item.id === id);

    if (!existing) {
      return undefined;
    }

    const saved = touchBookmark(existing, now);
    await this.write(upsert(items, saved));
    return saved;
  }

  async remove(id: string): Promise<void> {
    const items = await this.list();
    await this.write(items.filter((item) => item.id !== id));
  }

  async bulkUpdate(
    ids: string[],
    patch: Partial<Omit<BookmarkItem, "id" | "createdAt" | "lastVisitedAt" | "visitCount">>,
    now = Date.now()
  ): Promise<void> {
    const items = await this.list();
    const idSet = new Set(ids);
    const updated = items.map((item) => {
      if (!idSet.has(item.id)) return item;
      return { ...item, ...patch, updatedAt: now };
    });
    await this.write(updated);
  }

  private write(items: BookmarkItem[]): Promise<void> {
    return this.storage.set({ [STORAGE_KEY]: items });
  }
}

export function createBookmarkRepository(): BookmarkRepository {
  return new ChromeBookmarkRepository(chrome.storage.local);
}

function upsert(items: BookmarkItem[], next: BookmarkItem): BookmarkItem[] {
  const index = items.findIndex((item) => item.id === next.id);

  if (index === -1) {
    return [next, ...items];
  }

  const copy = [...items];
  copy[index] = next;
  return copy;
}
