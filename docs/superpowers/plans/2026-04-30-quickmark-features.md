# QuickMark Feature Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend QuickMark from MVP to full bookmark management with save panel, workspaces, dashboard, and settings.

**Architecture:** Data layer extended first (tags/workspaceId/notes on bookmarks + new Workspace entity), then shared UI components, then pages. All pages are static HTML entry points built by Vite. Content script handles both search and save panel overlays via shadow DOM.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, esbuild (for content script IIFE), Vitest, Chrome Extension MV3

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/domain/types.ts` | BookmarkItem + Workspace types |
| `src/domain/bookmark.ts` | Domain helpers (bookmarkFromTab, touchBookmark) |
| `src/repositories/bookmarkRepository.ts` | Bookmark CRUD over chrome.storage.local |
| `src/repositories/workspaceRepository.ts` | Workspace CRUD over chrome.storage.local |
| `src/components/TagInput.tsx` | Tag chip input (shared) |
| `src/components/WorkspaceSelect.tsx` | Workspace dropdown (shared) |
| `src/save/SavePanel.tsx` | Save overlay UI |
| `src/content/index.tsx` | Content script: search + save panel overlays |
| `src/background/index.ts` | Service worker: command routing |
| `src/popup/PopupApp.tsx` | Extension popup menu |
| `src/workspaces/WorkspacesApp.tsx` | Workspaces management page |
| `src/dashboard/DashboardApp.tsx` | Bookmark dashboard page |
| `src/settings/SettingsApp.tsx` | Settings page |
| `popup.html` | Popup entry HTML |
| `workspaces.html` | Workspaces page entry HTML |
| `dashboard.html` | Dashboard page entry HTML |
| `settings.html` | Settings page entry HTML |
| `vite.config.ts` | Build config with all entry points |
| `public/manifest.json` | Extension manifest |

---

### Task 1: Extend BookmarkItem Type and Domain Helpers

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/bookmark.ts`
- Modify: `src/domain/bookmark.test.ts`

- [ ] **Step 1: Write the failing test**

Modify `src/domain/bookmark.test.ts` to assert new fields exist:

```typescript
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
    expect(item.tags).toEqual([]);
    expect(item.workspaceId).toBeNull();
    expect(item.notes).toBe("");
  });

  it("touches an existing bookmark without changing creation time", () => {
    const original = bookmarkFromTab({ title: "Docs", url: "https://example.com" }, 1000);
    const updated = touchBookmark(original, 3000, { title: "New Docs" });

    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(3000);
    expect(updated.lastVisitedAt).toBe(3000);
    expect(updated.visitCount).toBe(2);
    expect(updated.title).toBe("New Docs");
    expect(updated.tags).toEqual([]);
    expect(updated.workspaceId).toBeNull();
    expect(updated.notes).toBe("");
  });

  it("touches with new optional fields", () => {
    const original = bookmarkFromTab({ title: "Docs", url: "https://example.com" }, 1000);
    const updated = touchBookmark(original, 3000, {
      tags: ["reference"],
      workspaceId: "ws_1",
      notes: "Important docs"
    });

    expect(updated.tags).toEqual(["reference"]);
    expect(updated.workspaceId).toBe("ws_1");
    expect(updated.notes).toBe("Important docs");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/bookmark.test.ts`
Expected: FAIL — `tags`, `workspaceId`, `notes` fields not found on BookmarkItem

- [ ] **Step 3: Extend types and domain helpers**

Modify `src/domain/types.ts`:

```typescript
export type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
  lastVisitedAt?: number;
  visitCount: number;
  tags: string[];
  workspaceId: string | null;
  notes: string;
};

export type Workspace = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
};

export type TabSnapshot = {
  title?: string;
  url?: string;
  favIconUrl?: string;
};
```

Modify `src/domain/bookmark.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/bookmark.test.ts`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/bookmark.ts src/domain/bookmark.test.ts
git commit -m "feat: extend BookmarkItem with tags, workspaceId, notes; add Workspace type"
```

---

### Task 2: Extend BookmarkRepository

**Files:**
- Modify: `src/repositories/bookmarkRepository.ts`
- Modify: `src/repositories/bookmarkRepository.test.ts`

- [ ] **Step 1: Write the failing test**

Replace `src/repositories/bookmarkRepository.test.ts`:

```typescript
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
      visitCount: 2,
      tags: [],
      workspaceId: null,
      notes: ""
    });
    expect(all).toHaveLength(1);
  });

  it("saves with options (tags, workspaceId, notes)", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const item = await repository.saveCurrentTab(
      { title: "Docs", url: "https://docs.example.com" },
      { tags: ["reference"], workspaceId: "ws_1", notes: "Important" },
      1000
    );

    expect(item.tags).toEqual(["reference"]);
    expect(item.workspaceId).toBe("ws_1");
    expect(item.notes).toBe("Important");
  });

  it("updates a bookmark", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const item = await repository.saveCurrentTab(
      { title: "Old", url: "https://example.com" },
      {},
      1000
    );
    const updated = await repository.update(item.id, { title: "New", tags: ["updated"] }, 2000);

    expect(updated?.title).toBe("New");
    expect(updated?.tags).toEqual(["updated"]);
    expect(updated?.updatedAt).toBe(2000);
    expect(updated?.createdAt).toBe(1000);
  });

  it("filters bookmarks by workspace", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    await repository.saveCurrentTab(
      { title: "A", url: "https://a.com" },
      { workspaceId: "ws_1" },
      1000
    );
    await repository.saveCurrentTab(
      { title: "B", url: "https://b.com" },
      { workspaceId: "ws_2" },
      1000
    );
    await repository.saveCurrentTab(
      { title: "C", url: "https://c.com" },
      {},
      1000
    );

    const ws1 = await repository.listByWorkspace("ws_1");
    expect(ws1).toHaveLength(1);
    expect(ws1[0].title).toBe("A");

    const ungrouped = await repository.listByWorkspace(null);
    expect(ungrouped).toHaveLength(1);
    expect(ungrouped[0].title).toBe("C");
  });

  it("removes a bookmark by id", async () => {
    const storage = createMemoryStorageArea();
    const repository = new ChromeBookmarkRepository(storage);

    const item = await repository.saveCurrentTab({ title: "Example", url: "https://example.com" }, {}, 1000);
    await repository.remove(item.id);

    expect(await repository.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/repositories/bookmarkRepository.test.ts`
Expected: FAIL — `saveCurrentTab` does not accept options param; `update` and `listByWorkspace` methods not found

- [ ] **Step 3: Extend BookmarkRepository**

Replace `src/repositories/bookmarkRepository.ts`:

```typescript
import { bookmarkFromTab, extractDomain, touchBookmark } from "../domain/bookmark";
import type { BookmarkItem, TabSnapshot } from "../domain/types";

const STORAGE_KEY = "quickmark.bookmarks";

type SaveOptions = {
  tags?: string[];
  workspaceId?: string | null;
  notes?: string;
};

export interface BookmarkRepository {
  list(): Promise<BookmarkItem[]>;
  saveCurrentTab(tab: TabSnapshot, options?: SaveOptions, now?: number): Promise<BookmarkItem>;
  update(id: string, patch: Partial<Omit<BookmarkItem, "id" | "createdAt">>, now?: number): Promise<BookmarkItem | undefined>;
  markVisited(id: string, now?: number): Promise<BookmarkItem | undefined>;
  remove(id: string): Promise<void>;
  listByWorkspace(workspaceId: string | null): Promise<BookmarkItem[]>;
}

export class ChromeBookmarkRepository implements BookmarkRepository {
  constructor(private readonly storage: Pick<chrome.storage.StorageArea, "get" | "set">) {}

  async list(): Promise<BookmarkItem[]> {
    const result = await this.storage.get({ [STORAGE_KEY]: [] });
    const items = Array.isArray(result[STORAGE_KEY]) ? (result[STORAGE_KEY] as BookmarkItem[]) : [];
    return items.map((item) => ({
      tags: [],
      workspaceId: null,
      notes: "",
      ...item
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
          domain: extractDomain(next.url),
          favicon: next.favicon,
          tags: options.tags ?? existing.tags,
          workspaceId: options.workspaceId !== undefined ? options.workspaceId : existing.workspaceId,
          notes: options.notes ?? existing.notes
        })
      : { ...next, ...options };

    await this.write(upsert(items, saved));
    return saved;
  }

  async update(
    id: string,
    patch: Partial<Omit<BookmarkItem, "id" | "createdAt">>,
    now = Date.now()
  ): Promise<BookmarkItem | undefined> {
    const items = await this.list();
    const existing = items.find((item) => item.id === id);

    if (!existing) {
      return undefined;
    }

    const saved = { ...existing, ...patch, updatedAt: now };
    await this.write(upsert(items, saved));
    return saved;
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

  async listByWorkspace(workspaceId: string | null): Promise<BookmarkItem[]> {
    const items = await this.list();
    return items.filter((item) => item.workspaceId === workspaceId);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/repositories/bookmarkRepository.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/repositories/bookmarkRepository.ts src/repositories/bookmarkRepository.test.ts
git commit -m "feat: extend BookmarkRepository with options, update, listByWorkspace"
```

---

### Task 3: Create WorkspaceRepository

**Files:**
- Create: `src/repositories/workspaceRepository.ts`
- Create: `src/repositories/workspaceRepository.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/repositories/workspaceRepository.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createMemoryStorageArea } from "../test/memoryStorage";
import { ChromeWorkspaceRepository } from "./workspaceRepository";

describe("ChromeWorkspaceRepository", () => {
  it("creates and lists workspaces", async () => {
    const storage = createMemoryStorageArea();
    const repo = new ChromeWorkspaceRepository(storage);

    const ws = await repo.create({ name: "Dev", color: "#aec6ff" }, 1000);
    expect(ws.name).toBe("Dev");
    expect(ws.color).toBe("#aec6ff");
    expect(ws.id).toBeDefined();
    expect(ws.createdAt).toBe(1000);

    const all = await repo.list();
    expect(all).toHaveLength(1);
  });

  it("gets a workspace by id", async () => {
    const storage = createMemoryStorageArea();
    const repo = new ChromeWorkspaceRepository(storage);

    const ws = await repo.create({ name: "Dev" }, 1000);
    const found = await repo.get(ws.id);

    expect(found?.name).toBe("Dev");
  });

  it("updates a workspace", async () => {
    const storage = createMemoryStorageArea();
    const repo = new ChromeWorkspaceRepository(storage);

    const ws = await repo.create({ name: "Dev" }, 1000);
    const updated = await repo.update(ws.id, { name: "Development" }, 2000);

    expect(updated?.name).toBe("Development");
    expect(updated?.updatedAt).toBe(2000);
    expect((await repo.get(ws.id))?.name).toBe("Development");
  });

  it("removes a workspace", async () => {
    const storage = createMemoryStorageArea();
    const repo = new ChromeWorkspaceRepository(storage);

    const ws = await repo.create({ name: "Dev" }, 1000);
    await repo.remove(ws.id);

    expect(await repo.list()).toHaveLength(0);
    expect(await repo.get(ws.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/repositories/workspaceRepository.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement WorkspaceRepository**

Create `src/repositories/workspaceRepository.ts`:

```typescript
import type { Workspace } from "../domain/types";

const WORKSPACE_STORAGE_KEY = "quickmark.workspaces";

export interface WorkspaceRepository {
  list(): Promise<Workspace[]>;
  get(id: string): Promise<Workspace | undefined>;
  create(workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">, now?: number): Promise<Workspace>;
  update(id: string, patch: Partial<Omit<Workspace, "id" | "createdAt">>, now?: number): Promise<Workspace | undefined>;
  remove(id: string): Promise<void>;
}

export class ChromeWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly storage: Pick<chrome.storage.StorageArea, "get" | "set">) {}

  async list(): Promise<Workspace[]> {
    const result = await this.storage.get({ [WORKSPACE_STORAGE_KEY]: [] });
    return Array.isArray(result[WORKSPACE_STORAGE_KEY]) ? (result[WORKSPACE_STORAGE_KEY] as Workspace[]) : [];
  }

  async get(id: string): Promise<Workspace | undefined> {
    const items = await this.list();
    return items.find((item) => item.id === id);
  }

  async create(
    workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">,
    now = Date.now()
  ): Promise<Workspace> {
    const items = await this.list();
    const newWorkspace: Workspace = {
      ...workspace,
      id: `ws_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now
    };
    await this.write([...items, newWorkspace]);
    return newWorkspace;
  }

  async update(
    id: string,
    patch: Partial<Omit<Workspace, "id" | "createdAt">>,
    now = Date.now()
  ): Promise<Workspace | undefined> {
    const items = await this.list();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      return undefined;
    }

    const updated = { ...items[index], ...patch, updatedAt: now };
    const copy = [...items];
    copy[index] = updated;
    await this.write(copy);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const items = await this.list();
    await this.write(items.filter((item) => item.id !== id));
  }

  private write(items: Workspace[]): Promise<void> {
    return this.storage.set({ [WORKSPACE_STORAGE_KEY]: items });
  }
}

export function createWorkspaceRepository(): WorkspaceRepository {
  return new ChromeWorkspaceRepository(chrome.storage.local);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/repositories/workspaceRepository.test.ts`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/repositories/workspaceRepository.ts src/repositories/workspaceRepository.test.ts
git commit -m "feat: add WorkspaceRepository with CRUD operations"
```

---

### Task 4: Create Shared Components (TagInput, WorkspaceSelect)

**Files:**
- Create: `src/components/TagInput.tsx`
- Create: `src/components/WorkspaceSelect.tsx`

- [ ] **Step 1: Create TagInput component**

Create `src/components/TagInput.tsx`:

```typescript
import { useState, type KeyboardEvent } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export function TagInput({ tags, onChange, placeholder = "Add tag..." }: TagInputProps) {
  const [input, setInput] = useState("");

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && input.trim()) {
      event.preventDefault();
      const newTag = input.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput("");
    }
    if (event.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded border border-outline-variant/50 bg-surface-container px-2 py-0.5 text-xs text-on-surface"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-on-surface-variant hover:text-on-surface"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[80px] flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create WorkspaceSelect component**

Create `src/components/WorkspaceSelect.tsx`:

```typescript
import { useEffect, useState } from "react";
import type { Workspace } from "../domain/types";
import { createWorkspaceRepository } from "../repositories/workspaceRepository";

const repository = createWorkspaceRepository();

type WorkspaceSelectProps = {
  value: string | null;
  onChange: (workspaceId: string | null) => void;
};

export function WorkspaceSelect({ value, onChange }: WorkspaceSelectProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    repository.list().then(setWorkspaces);
  }, []);

  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
      >
        <option value="">No Workspace</option>
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
        ▼
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors (components are not yet imported anywhere, but they should compile)

- [ ] **Step 4: Commit**

```bash
git add src/components/TagInput.tsx src/components/WorkspaceSelect.tsx
git commit -m "feat: add TagInput and WorkspaceSelect shared components"
```

---

### Task 5: Create SavePanel Component

**Files:**
- Create: `src/save/SavePanel.tsx`

- [ ] **Step 1: Implement SavePanel**

Create `src/save/SavePanel.tsx`:

```typescript
import { useEffect, useRef, useState } from "react";
import type { TabSnapshot } from "../domain/types";
import { TagInput } from "../components/TagInput";
import { WorkspaceSelect } from "../components/WorkspaceSelect";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";

const repository = createBookmarkRepository();

type SavePanelProps = {
  tab: TabSnapshot;
  onSaved: () => void;
  onCancel: () => void;
};

export function SavePanel({ tab, onSaved, onCancel }: SavePanelProps) {
  const [title, setTitle] = useState(tab.title || "");
  const [tags, setTags] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSave() {
    setSaving(true);
    await repository.saveCurrentTab(
      { ...tab, title: title || tab.title },
      { tags, workspaceId, notes }
    );
    setSaving(false);
    onSaved();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      void handleSave();
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-xl border border-[#1F2430] bg-surface shadow-2xl shadow-black/40"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between border-b border-[#1F2430] px-4 py-3">
        <h2 className="text-sm font-semibold text-on-surface">Save Bookmark</h2>
        <button onClick={onCancel} className="text-on-surface-variant hover:text-on-surface">
          ✕
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Title</label>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Workspace</label>
          <WorkspaceSelect value={workspaceId} onChange={setWorkspaceId} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Tags</label>
          <div className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            className="h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[#1F2430] px-4 py-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high"
        >
          Cancel
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors

- [ ] **Step 3: Commit**

```bash
git add src/save/SavePanel.tsx
git commit -m "feat: add SavePanel component"
```

---

### Task 6: Extend Content Script for Save Panel

**Files:**
- Modify: `src/content/index.tsx`

- [ ] **Step 1: Extend content script**

Replace `src/content/index.tsx`:

```typescript
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BookmarkItem, TabSnapshot } from "../domain/types";
import { SearchApp } from "../search/SearchApp";
import { SavePanel } from "../save/SavePanel";

const HOST_ID = "quickmark-overlay-root";
const SAVE_PANEL_HOST_ID = "quickmark-save-panel-root";
const STYLE_ID = "quickmark-overlay-style";

let root: Root | undefined;
let savePanelRoot: Root | undefined;

const state = window as Window & { __quickmarkContentLoaded?: boolean };

if (!state.__quickmarkContentLoaded) {
  state.__quickmarkContentLoaded = true;
  chrome.runtime.onMessage.addListener((message: { type?: string; tab?: TabSnapshot }) => {
    if (message.type === "QUICKMARK_TOGGLE") {
      toggleOverlay();
    }
    if (message.type === "QUICKMARK_OPEN_SAVE_PANEL" && message.tab) {
      openSavePanel(message.tab);
    }
  });
}

// --- Search Overlay ---

function toggleOverlay(): void {
  const existing = document.getElementById(HOST_ID);

  if (existing) {
    closeOverlay();
    return;
  }

  openOverlay();
}

function openOverlay(): void {
  closeSavePanel();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  host.style.display = "flex";
  host.style.alignItems = "flex-start";
  host.style.justifyContent = "center";
  host.style.padding = "8vh 16px 16px";
  host.style.background = "rgba(12, 14, 17, 0.28)";
  host.style.backdropFilter = "blur(6px)";

  const shadow = host.attachShadow({ mode: "open" });
  const styleLink = document.createElement("link");
  styleLink.id = STYLE_ID;
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("assets/search.css");

  const app = document.createElement("div");
  app.style.width = "min(768px, 100%)";

  shadow.append(styleLink, app);
  document.documentElement.appendChild(host);
  document.addEventListener("keydown", handleOverlayKeyDown, true);

  root = createRoot(app);
  root.render(
    <React.StrictMode>
      <SearchApp mode="modal" onClose={closeOverlay} openBookmark={openBookmarkFromContentScript} />
    </React.StrictMode>
  );
}

function closeOverlay(): void {
  document.removeEventListener("keydown", handleOverlayKeyDown, true);
  root?.unmount();
  root = undefined;
  document.getElementById(HOST_ID)?.remove();
}

function handleOverlayKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  closeOverlay();
}

// --- Save Panel Overlay ---

function openSavePanel(tab: TabSnapshot): void {
  closeOverlay();
  closeSavePanel();

  const host = document.createElement("div");
  host.id = SAVE_PANEL_HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  host.style.display = "flex";
  host.style.alignItems = "center";
  host.style.justifyContent = "center";
  host.style.padding = "16px";
  host.style.background = "rgba(12, 14, 17, 0.28)";
  host.style.backdropFilter = "blur(6px)";

  const shadow = host.attachShadow({ mode: "open" });
  const styleLink = document.createElement("link");
  styleLink.id = STYLE_ID;
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("assets/search.css");

  const app = document.createElement("div");
  app.style.width = "min(480px, 100%)";

  shadow.append(styleLink, app);
  document.documentElement.appendChild(host);
  document.addEventListener("keydown", handleSavePanelKeyDown, true);

  savePanelRoot = createRoot(app);
  savePanelRoot.render(
    <React.StrictMode>
      <SavePanel tab={tab} onSaved={closeSavePanel} onCancel={closeSavePanel} />
    </React.StrictMode>
  );
}

function closeSavePanel(): void {
  document.removeEventListener("keydown", handleSavePanelKeyDown, true);
  savePanelRoot?.unmount();
  savePanelRoot = undefined;
  document.getElementById(SAVE_PANEL_HOST_ID)?.remove();
}

function handleSavePanelKeyDown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeSavePanel();
  }
}

// --- Shared ---

async function openBookmarkFromContentScript(item: BookmarkItem, newTab: boolean): Promise<void> {
  if (newTab) {
    await chrome.runtime.sendMessage({ type: "QUICKMARK_OPEN_NEW_TAB", url: item.url });
    return;
  }

  window.location.assign(item.url);
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors

- [ ] **Step 3: Commit**

```bash
git add src/content/index.tsx
git commit -m "feat: extend content script with save panel overlay"
```

---

### Task 7: Update Background Save Flow

**Files:**
- Modify: `src/background/index.ts`

- [ ] **Step 1: Update background script**

Replace `src/background/index.ts`:

```typescript
import { createBookmarkRepository } from "../repositories/bookmarkRepository";

const repository = createBookmarkRepository();

chrome.action.onClicked.addListener(() => {
  void toggleSearchOverlay();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-search") {
    void toggleSearchOverlay();
  }

  if (command === "save-current-page") {
    void saveActiveTab();
  }
});

chrome.runtime.onMessage.addListener((message: { type?: string; url?: string }) => {
  if (message.type === "QUICKMARK_OPEN_NEW_TAB" && message.url) {
    void chrome.tabs.create({ url: message.url, active: true });
  }
});

async function toggleSearchOverlay(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url || isUnsupportedUrl(tab.url)) {
    await showBadge("ERR", "#93000a");
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE" });
  } catch {
    try {
      await injectContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE" });
    } catch {
      await showBadge("ERR", "#93000a");
    }
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["assets/content.js"]
  });
}

async function saveActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url || isUnsupportedUrl(tab.url)) {
    await showBadge("ERR", "#93000a");
    return;
  }

  const settingsResult = await chrome.storage.local.get({
    "quickmark.settings": { showSavePanel: true }
  });
  const settings = settingsResult["quickmark.settings"] as { showSavePanel: boolean };

  if (!settings.showSavePanel) {
    await repository.saveCurrentTab({
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl
    });
    await showBadge("OK", "#00bd85");
    return;
  }

  const tabSnapshot = { title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl };

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "QUICKMARK_OPEN_SAVE_PANEL",
      tab: tabSnapshot
    });
  } catch {
    try {
      await injectContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, {
        type: "QUICKMARK_OPEN_SAVE_PANEL",
        tab: tabSnapshot
      });
    } catch {
      await showBadge("ERR", "#93000a");
    }
  }
}

function isUnsupportedUrl(url: string): boolean {
  return /^(chrome|edge|about|devtools):/i.test(url);
}

async function showBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    void chrome.action.setBadgeText({ text: "" });
  }, 1200);
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors

- [ ] **Step 3: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: background opens save panel on save command; supports quick-save mode"
```

---

### Task 8: Create Popup Navigation

**Files:**
- Create: `popup.html`
- Create: `src/popup/PopupApp.tsx`
- Create: `src/popup/main.tsx`

- [ ] **Step 1: Create popup HTML**

Create `popup.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuickMark</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/popup/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create PopupApp component**

Create `src/popup/PopupApp.tsx`:

```typescript
export function PopupApp() {
  function openPage(page: string) {
    chrome.tabs.create({ url: chrome.runtime.getURL(page) });
    window.close();
  }

  function triggerSearch() {
    chrome.runtime.sendMessage({ type: "QUICKMARK_TOGGLE" });
    window.close();
  }

  return (
    <div className="w-52 bg-surface p-2">
      <div className="mb-1 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-outline">
        QuickMark
      </div>
      <button
        onClick={triggerSearch}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
      >
        <span className="text-on-surface-variant">⌕</span> Search
      </button>
      <button
        onClick={() => openPage("dashboard.html")}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
      >
        <span className="text-on-surface-variant">▤</span> Dashboard
      </button>
      <button
        onClick={() => openPage("workspaces.html")}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
      >
        <span className="text-on-surface-variant">◫</span> Workspaces
      </button>
      <div className="my-1 border-t border-[#1F2430]" />
      <button
        onClick={() => openPage("settings.html")}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      >
        <span>⚙</span> Settings
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create popup entry**

Create `src/popup/main.tsx`:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add popup.html src/popup/PopupApp.tsx src/popup/main.tsx
git commit -m "feat: add popup navigation menu"
```

---

### Task 9: Create Workspaces Page

**Files:**
- Create: `workspaces.html`
- Create: `src/workspaces/WorkspacesApp.tsx`
- Create: `src/workspaces/main.tsx`

- [ ] **Step 1: Create workspaces HTML**

Create `workspaces.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuickMark - Workspaces</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/workspaces/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create WorkspacesApp**

Create `src/workspaces/WorkspacesApp.tsx`:

```typescript
import { useCallback, useEffect, useState } from "react";
import type { BookmarkItem, Workspace } from "../domain/types";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";
import { createWorkspaceRepository } from "../repositories/workspaceRepository";

const bookmarkRepo = createBookmarkRepository();
const workspaceRepo = createWorkspaceRepository();

export function WorkspacesApp() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [wsList, bmList] = await Promise.all([workspaceRepo.list(), bookmarkRepo.list()]);
    setWorkspaces(wsList);
    setBookmarks(bmList);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createWorkspace() {
    if (!newName.trim()) return;
    await workspaceRepo.create({ name: newName.trim() });
    setNewName("");
    await refresh();
  }

  async function deleteWorkspace(id: string) {
    if (!confirm("Delete this workspace? Bookmarks will remain ungrouped.")) return;
    await workspaceRepo.remove(id);
    const items = await bookmarkRepo.list();
    for (const item of items.filter((b) => b.workspaceId === id)) {
      await bookmarkRepo.update(item.id, { workspaceId: null });
    }
    await refresh();
  }

  function getWorkspaceBookmarks(wsId: string) {
    return bookmarks.filter((b) => b.workspaceId === wsId);
  }

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-1 text-xl font-semibold">Workspaces</h1>
        <p className="mb-6 text-sm text-outline">Grouped contexts for focused browsing.</p>

        <div className="mb-6 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void createWorkspace()}
            placeholder="New workspace name..."
            className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary placeholder:text-outline"
          />
          <button
            onClick={() => void createWorkspace()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container"
          >
            Create
          </button>
        </div>

        <div className="space-y-3">
          {workspaces.map((ws) => {
            const wsBookmarks = getWorkspaceBookmarks(ws.id);
            const isExpanded = expandedId === ws.id;

            return (
              <div key={ws.id} className="rounded-xl border border-[#1F2430] bg-surface-container">
                <div
                  className="flex cursor-pointer items-center justify-between px-4 py-3"
                  onClick={() => setExpandedId(isExpanded ? null : ws.id)}
                >
                  <div>
                    <div className="font-medium text-on-surface">{ws.name}</div>
                    <div className="text-xs text-outline">{wsBookmarks.length} bookmarks</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-outline">{isExpanded ? "▲" : "▼"}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteWorkspace(ws.id);
                      }}
                      className="rounded p-1 text-error hover:bg-error-container/10"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#1F2430] px-4 py-2">
                    {wsBookmarks.length === 0 ? (
                      <div className="py-4 text-center text-sm text-outline">No bookmarks in this workspace</div>
                    ) : (
                      wsBookmarks.map((bm) => (
                        <div key={bm.id} className="flex items-center gap-2 py-2">
                          {bm.favicon ? (
                            <img src={bm.favicon} alt="" className="h-4 w-4" />
                          ) : (
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-surface-container-high text-[10px] text-outline">
                              {bm.domain[0]?.toUpperCase()}
                            </span>
                          )}
                          <span className="truncate text-sm text-on-surface">{bm.title}</span>
                          <span className="ml-auto text-xs text-outline">{bm.visitCount} visits</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create workspaces entry**

Create `src/workspaces/main.tsx`:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import { WorkspacesApp } from "./WorkspacesApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WorkspacesApp />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add workspaces.html src/workspaces/WorkspacesApp.tsx src/workspaces/main.tsx
git commit -m "feat: add workspaces management page"
```

---

### Task 10: Create Dashboard Page

**Files:**
- Create: `dashboard.html`
- Create: `src/dashboard/DashboardApp.tsx`
- Create: `src/dashboard/main.tsx`

- [ ] **Step 1: Create dashboard HTML**

Create `dashboard.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuickMark - Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/dashboard/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create DashboardApp**

Create `src/dashboard/DashboardApp.tsx`:

```typescript
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookmarkItem } from "../domain/types";
import { searchBookmarks } from "../domain/search";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";

const repository = createBookmarkRepository();

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function DashboardApp() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setBookmarks(await repository.list());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const results = useMemo(() => searchBookmarks(bookmarks, query), [bookmarks, query]);

  async function deleteBookmark(id: string) {
    if (!confirm("Delete this bookmark?")) return;
    await repository.remove(id);
    await refresh();
  }

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sortedByVisits = [...bookmarks].sort((a, b) => b.visitCount - a.visitCount);
    return {
      total: bookmarks.length,
      thisWeek: bookmarks.filter((b) => b.createdAt > weekAgo).length,
      topVisited: sortedByVisits[0]?.visitCount ?? 0
    };
  }, [bookmarks]);

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Library</h1>
          <p className="text-sm text-outline">Management</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
            <div className="text-2xl font-semibold text-primary">{stats.total}</div>
            <div className="text-xs text-outline">All Bookmarks</div>
          </div>
          <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
            <div className="text-2xl font-semibold text-secondary">{stats.thisWeek}</div>
            <div className="text-xs text-outline">This Week</div>
          </div>
          <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
            <div className="text-2xl font-semibold text-tertiary">{stats.topVisited}</div>
            <div className="text-xs text-outline">Top Visits</div>
          </div>
        </div>

        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-9 pr-3 text-sm text-on-surface outline-none focus:border-primary placeholder:text-outline"
          />
        </div>

        <div className="rounded-xl border border-[#1F2430] bg-surface-container">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1F2430] text-xs text-on-surface-variant">
                <th className="px-4 py-2 w-2/5">Name</th>
                <th className="px-4 py-2 w-1/4">Tags</th>
                <th className="px-4 py-2 text-right">Visits</th>
                <th className="px-4 py-2">Last Visited</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((bm) => (
                <tr key={bm.id} className="border-b border-[#1F2430]/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {bm.favicon ? (
                        <img src={bm.favicon} alt="" className="h-4 w-4 flex-none" />
                      ) : (
                        <span className="flex h-4 w-4 flex-none items-center justify-center rounded bg-surface-container-high text-[10px] text-outline">
                          {bm.domain[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-on-surface">{bm.title}</div>
                        <div className="truncate text-xs text-outline">{bm.domain}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {bm.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-outline-variant/50 bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{bm.visitCount}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {bm.lastVisitedAt ? formatRelativeTime(bm.lastVisitedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void deleteBookmark(bm.id)}
                      className="rounded p-1 text-error hover:bg-error-container/10"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-outline">
                    {query ? "No matching bookmarks." : "No bookmarks yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create dashboard entry**

Create `src/dashboard/main.tsx`:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardApp } from "./DashboardApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add dashboard.html src/dashboard/DashboardApp.tsx src/dashboard/main.tsx
git commit -m "feat: add bookmark management dashboard page"
```

---

### Task 11: Create Settings Page

**Files:**
- Create: `settings.html`
- Create: `src/settings/SettingsApp.tsx`
- Create: `src/settings/main.tsx`

- [ ] **Step 1: Create settings HTML**

Create `settings.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QuickMark - Settings</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/settings/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create SettingsApp**

Create `src/settings/SettingsApp.tsx`:

```typescript
import { useEffect, useState } from "react";

type Settings = {
  showSavePanel: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  showSavePanel: true
};

const SETTINGS_KEY = "quickmark.settings";

export function SettingsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    chrome.storage.local.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS }).then((result) => {
      setSettings(result[SETTINGS_KEY] as Settings);
    });
  }, []);

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  }

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-xl font-semibold">Settings</h1>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-medium text-on-surface">Save Behavior</h2>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#1F2430] bg-surface-container p-4">
              <input
                type="checkbox"
                checked={settings.showSavePanel}
                onChange={(e) => void updateSetting("showSavePanel", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div>
                <div className="text-sm font-medium">Show save panel on every save</div>
                <div className="text-xs text-outline">
                  When enabled, pressing the save shortcut opens a panel to edit tags, workspace, and notes.
                  Disable for silent one-click saving.
                </div>
              </div>
            </label>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-on-surface">Keyboard Shortcuts</h2>
            <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm">Toggle Command Bar</span>
                <div className="flex gap-1">
                  <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant">
                    {isMac ? "⌘" : "Ctrl"}
                  </span>
                  <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant">
                    Shift
                  </span>
                  <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant">
                    K
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Save Active Tab</span>
                <div className="flex gap-1">
                  <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant">
                    {isMac ? "⌘" : "Ctrl"}
                  </span>
                  <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant">
                    Shift
                  </span>
                  <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant">
                    S
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs text-outline">
                To customize shortcuts, visit{" "}
                <a
                  href="chrome://extensions/shortcuts"
                  className="text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
                  }}
                >
                  chrome://extensions/shortcuts
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create settings entry**

Create `src/settings/main.tsx`:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import { SettingsApp } from "./SettingsApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add settings.html src/settings/SettingsApp.tsx src/settings/main.tsx
git commit -m "feat: add settings page with save behavior toggle and shortcuts display"
```

---

### Task 12: Update Vite Config

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add all entry points**

Replace `vite.config.ts`:

```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        search: "search.html",
        background: "src/background/index.ts",
        workspaces: "workspaces.html",
        dashboard: "dashboard.html",
        settings: "settings.html",
        popup: "popup.html"
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]"
      }
    }
  }
});
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS — all entry points build successfully, dist/ contains workspaces.html, dashboard.html, settings.html, popup.html and corresponding assets

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "build: add workspaces, dashboard, settings, popup as vite entry points"
```

---

### Task 13: Update Manifest

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Add popup to action**

Replace `public/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "QuickMark",
  "description": "Keyboard-first local bookmark search for Chrome.",
  "version": "0.1.0",
  "permissions": ["storage", "tabs", "scripting"],
  "host_permissions": ["http://*/*", "https://*/*"],
  "action": {
    "default_title": "Open QuickMark",
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "assets/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["http://*/*", "https://*/*"],
      "js": ["assets/content.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["assets/search.css"],
      "matches": ["http://*/*", "https://*/*"]
    }
  ],
  "commands": {
    "open-search": {
      "suggested_key": {
        "default": "Ctrl+Shift+K",
        "mac": "Command+Shift+K"
      },
      "description": "Open QuickMark search"
    },
    "save-current-page": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Save current page to QuickMark"
    }
  }
}
```

- [ ] **Step 2: Full build and test**

Run: `npm run build`
Expected: PASS — dist/ contains manifest.json, popup.html, workspaces.html, dashboard.html, settings.html, all assets

Run: `npm test`
Expected: PASS — all tests pass

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json
git commit -m "feat: add popup to manifest action config"
```

---

## Self-Review

**1. Spec coverage:**
| Spec Requirement | Task |
|---|---|
| BookmarkItem tags/workspaceId/notes | Task 1 |
| Workspace type | Task 1 |
| Data migration (fallback defaults) | Task 2 (list() method) |
| SavePanel UI (title, workspace, tags, notes) | Task 5 |
| SavePanel trigger flow | Task 6, 7 |
| Quick-save mode | Task 7, 11 |
| Workspaces CRUD | Task 3, 9 |
| Dashboard with stats/table | Task 10 |
| Settings page | Task 11 |
| Popup navigation | Task 8, 13 |
| Vite entry points | Task 12 |

**2. Placeholder scan:** No TBD, TODO, or vague steps found. Every step has complete code.

**3. Type consistency:**
- `BookmarkItem.tags` is `string[]` everywhere
- `BookmarkItem.workspaceId` is `string | null` everywhere
- `BookmarkItem.notes` is `string` everywhere
- `SaveOptions` type matches the `{ tags?, workspaceId?, notes? }` shape used in Task 2 and Task 5
- `chrome.storage.local` settings key is `quickmark.settings` consistently (Task 7, Task 11)
