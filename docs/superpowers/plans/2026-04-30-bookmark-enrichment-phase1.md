# Bookmark Enrichment Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-later/favorite status and bulk operations to bookmark management.

**Architecture:** Extend BookmarkItem type with two boolean flags, update repository for migration and defaults, add status UI indicators and filters to Dashboard/Search, implement checkbox selection with floating bulk action bar.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Chrome Extension Manifest V3 + chrome.storage.local

---

## File Structure

| File | Responsibility |
|---|---|
| `src/domain/types.ts` | BookmarkItem type extension |
| `src/domain/bookmark.ts` | Default values for new fields in bookmarkFromTab and touchBookmark |
| `src/repositories/bookmarkRepository.ts` | Migration in list(), defaults in saveCurrentTab(), bulkUpdate method |
| `src/repositories/bookmarkRepository.test.ts` | Tests for migration, defaults, bulkUpdate |
| `src/search/useBookmarks.ts` | toggleFavorite, toggleUnread, markRead helpers |
| `src/search/SearchApp.tsx` | Status indicators on search results, auto-mark-read |
| `src/dashboard/DashboardApp.tsx` | Status filters, indicators, bulk selection, bulk action bar (page + modal) |

---

### Task 1: Extend BookmarkItem type and repository

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/bookmark.ts`
- Modify: `src/repositories/bookmarkRepository.ts`
- Test: `src/repositories/bookmarkRepository.test.ts`

- [ ] **Step 1: Add isFavorite and isUnread to BookmarkItem**

```typescript
// src/domain/types.ts
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
  isFavorite: boolean;
  isUnread: boolean;
};
```

- [ ] **Step 2: Update bookmarkFromTab with defaults**

```typescript
// src/domain/bookmark.ts — in bookmarkFromTab return object, append:
    isFavorite: false,
    isUnread: true,
```

- [ ] **Step 3: Update touchBookmark to accept status fields in patch**

```typescript
// src/domain/bookmark.ts — expand the Pick type:
  patch: Partial<
    Pick<BookmarkItem, "title" | "domain" | "favicon" | "url" | "tags" | "workspaceId" | "notes" | "isFavorite" | "isUnread">
  > = {}
```

- [ ] **Step 4: Update repository list() with migration**

```typescript
// src/repositories/bookmarkRepository.ts — in list() map callback:
return items.map((item) => ({
  ...item,
  tags: item.tags ?? [],
  workspaceId: item.workspaceId ?? null,
  notes: item.notes ?? "",
  isFavorite: item.isFavorite ?? false,
  isUnread: item.isUnread ?? (item.visitCount === 0 ? true : false),
}));
```

- [ ] **Step 5: Add bulkUpdate to repository interface and implementation**

```typescript
// src/repositories/bookmarkRepository.ts — add to interface:
bulkUpdate(ids: string[], patch: Partial<Omit<BookmarkItem, "id" | "createdAt" | "lastVisitedAt" | "visitCount">>): Promise<void>;

// Add to ChromeBookmarkRepository class:
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
```

- [ ] **Step 6: Add tests**

```typescript
// src/repositories/bookmarkRepository.test.ts — append:

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
        visitCount: 0,
      },
      {
        id: "https://old-read.com",
        title: "Old Read",
        url: "https://old-read.com",
        domain: "old-read.com",
        createdAt: 100,
        updatedAt: 100,
        visitCount: 3,
      },
    ],
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
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: All tests pass, including the 3 new ones.

- [ ] **Step 8: Commit**

```bash
git add src/domain/types.ts src/domain/bookmark.ts src/repositories/bookmarkRepository.ts src/repositories/bookmarkRepository.test.ts
git commit -m "feat: add isFavorite and isUnread to BookmarkItem with migration and bulkUpdate"
```

---

### Task 2: Add status helpers to useBookmarks hook

**Files:**
- Modify: `src/search/useBookmarks.ts`

- [ ] **Step 1: Add toggleFavorite, toggleUnread, and markRead**

```typescript
// src/search/useBookmarks.ts — add inside useBookmarks, before return:

const toggleFavorite = useCallback(async (id: string) => {
  const items = await repository.list();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const updated = await repository.update(id, { isFavorite: !item.isFavorite });
  if (updated) {
    setBookmarks((prev) => prev.map((current) => (current.id === id ? updated : current)));
  }
}, []);

const toggleUnread = useCallback(async (id: string) => {
  const items = await repository.list();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const updated = await repository.update(id, { isUnread: !item.isUnread });
  if (updated) {
    setBookmarks((prev) => prev.map((current) => (current.id === id ? updated : current)));
  }
}, []);

const markRead = useCallback(async (id: string) => {
  const updated = await repository.update(id, { isUnread: false });
  if (updated) {
    setBookmarks((prev) => prev.map((current) => (current.id === id ? updated : current)));
  }
}, []);
```

- [ ] **Step 2: Expose them in return**

```typescript
return { bookmarks, results, isLoading, refresh, remove, markVisited, toggleFavorite, toggleUnread, markRead };
```

- [ ] **Step 3: Commit**

```bash
git add src/search/useBookmarks.ts
git commit -m "feat: add toggleFavorite, toggleUnread, markRead to useBookmarks"
```

---

### Task 3: Add status indicators to SearchApp

**Files:**
- Modify: `src/search/SearchApp.tsx`

- [ ] **Step 1: Destructure new helpers from useBookmarks**

```typescript
const { results, isLoading, remove, markVisited, toggleFavorite, toggleUnread, markRead } = useBookmarks(query);
```

- [ ] **Step 2: Auto-mark as read when opening**

```typescript
// In openSelected function, after markVisited:
async function openSelected(newTab: boolean) {
  if (!selected) return;
  await markVisited(selected.id);
  await markRead(selected.id);
  await openBookmark(selected, newTab);
  onClose?.();
}
```

- [ ] **Step 3: Add status indicators to BookmarkRow**

Update the BookmarkRow props to accept `onToggleFavorite` and `onToggleUnread`:

```typescript
function BookmarkRow({
  item,
  isSelected,
  onMouseEnter,
  onOpen,
  onToggleFavorite,
  onToggleUnread,
}: {
  item: BookmarkItem;
  isSelected: boolean;
  onMouseEnter: () => void;
  onOpen: (newTab: boolean) => void;
  onToggleFavorite: () => void;
  onToggleUnread: () => void;
}) {
```

Update the BookmarkRow JSX. Before the favicon div, add an unread dot:

```tsx
<div className="relative mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded border border-outline-variant bg-surface-container">
  {item.isUnread && (
    <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
  )}
  {item.favicon ? (
    <img src={item.favicon} alt="" className="h-4 w-4" />
  ) : (
    <span className="text-[10px] font-semibold uppercase text-outline">{item.domain.slice(0, 1)}</span>
  )}
</div>
```

After the info div, add a star button:

```tsx
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
  className={["flex-none text-sm transition-colors", item.isFavorite ? "text-primary" : "text-outline hover:text-primary"].join(" ")}
  title={item.isFavorite ? "取消收藏" : "收藏"}
>
  {item.isFavorite ? "★" : "☆"}
</button>
```

- [ ] **Step 4: Pass handlers to BookmarkRow instances**

```tsx
<BookmarkRow
  key={item.id}
  item={item}
  isSelected={index === selectedIndex}
  onMouseEnter={() => setSelectedIndex(index)}
  onOpen={(newTab) => void openSelected(newTab)}
  onToggleFavorite={() => void toggleFavorite(item.id)}
  onToggleUnread={() => void toggleUnread(item.id)}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/search/SearchApp.tsx
git commit -m "feat: add favorite/unread indicators to search overlay"
```

---

### Task 4: Add status filters and indicators to Dashboard page

**Files:**
- Modify: `src/dashboard/DashboardApp.tsx`

- [ ] **Step 1: Add statusFilter state**

```typescript
const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "favorite">("all");
```

- [ ] **Step 2: Update results useMemo to filter by status**

```typescript
const results = useMemo(() => {
  const searched = searchBookmarks(bookmarks, query, workspaces);
  let filtered = searched;
  if (workspaceFilter !== "all") {
    filtered = filtered.filter((item) => item.workspaceId === workspaceFilter);
  }
  if (statusFilter === "unread") {
    filtered = filtered.filter((item) => item.isUnread);
  }
  if (statusFilter === "favorite") {
    filtered = filtered.filter((item) => item.isFavorite);
  }
  return filtered;
}, [bookmarks, query, workspaces, workspaceFilter, statusFilter]);
```

- [ ] **Step 3: Add async toggle helpers**

```typescript
async function toggleFavorite(id: string) {
  const items = await repository.list();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const updated = await repository.update(id, { isFavorite: !item.isFavorite });
  if (updated) {
    setBookmarks((prev) => prev.map((current) => (current.id === id ? updated : current)));
  }
}

async function toggleUnread(id: string) {
  const items = await repository.list();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const updated = await repository.update(id, { isUnread: !item.isUnread });
  if (updated) {
    setBookmarks((prev) => prev.map((current) => (current.id === id ? updated : current)));
  }
}
```

- [ ] **Step 4: Update handleOpen to auto-mark-read**

```typescript
async function handleOpen(item: BookmarkItem) {
  const updated = await repository.markVisited(item.id);
  if (updated) {
    setBookmarks((items) => items.map((i) => (i.id === item.id ? updated : i)));
  }
  await repository.update(item.id, { isUnread: false });
  setBookmarks((prev) =>
    prev.map((current) => (current.id === item.id ? { ...current, isUnread: false } : current))
  );
  window.open(item.url, "_blank", "noopener,noreferrer");
}
```

- [ ] **Step 5: Add status filter buttons below the search bar**

After the workspace select in the filter row, add:

```tsx
<div className="flex gap-1">
  {(["all", "unread", "favorite"] as const).map((key) => (
    <button
      key={key}
      type="button"
      onClick={() => setStatusFilter(key)}
      className={[
        "rounded-lg px-3 py-2 text-sm transition-colors",
        statusFilter === key
          ? "bg-primary text-on-primary"
          : "border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high"
      ].join(" ")}
    >
      {key === "all" && "全部"}
      {key === "unread" && "未读"}
      {key === "favorite" && "收藏"}
    </button>
  ))}
</div>
```

- [ ] **Step 6: Add unread dot and star to table rows**

In the table row's favicon cell, add an unread dot overlay:

```tsx
<div className="relative flex h-6 w-6 flex-none items-center justify-center rounded border border-outline-variant bg-surface-container">
  {item.isUnread && (
    <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
  )}
  {item.favicon ? (
    <img src={item.favicon} alt="" className="h-4 w-4" />
  ) : (
    <span className="text-[10px] font-semibold uppercase text-outline">{item.domain.slice(0, 1)}</span>
  )}
</div>
```

In the title cell, after the domain div, add a star toggle:

```tsx
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); void toggleFavorite(item.id); }}
  className={["ml-2 text-sm transition-colors", item.isFavorite ? "text-primary" : "text-outline hover:text-primary"].join(" ")}
  title={item.isFavorite ? "取消收藏" : "收藏"}
>
  {item.isFavorite ? "★" : "☆"}
</button>
```

Wait — putting the star in the title cell might make the layout crowded. Better to put it in the action cell, next to the edit/delete buttons. Let me adjust:

In the "操作" cell:

```tsx
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); void toggleFavorite(item.id); }}
  className={["rounded p-1 text-sm transition-colors", item.isFavorite ? "text-primary" : "text-on-surface-variant hover:text-primary"].join(" ")}
  title={item.isFavorite ? "取消收藏" : "收藏"}
>
  {item.isFavorite ? "★" : "☆"}
</button>
```

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/DashboardApp.tsx
git commit -m "feat: add status filters and indicators to dashboard page"
```

---

### Task 5: Add bulk operations to Dashboard page

**Files:**
- Modify: `src/dashboard/DashboardApp.tsx`

- [ ] **Step 1: Add selection state**

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: Add selection helpers**

```typescript
function toggleSelection(id: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function selectAll() {
  setSelectedIds(new Set(results.map((r) => r.id)));
}

function deselectAll() {
  setSelectedIds(new Set());
}

const allSelected = results.length > 0 && results.every((r) => selectedIds.has(r.id));
```

- [ ] **Step 3: Add checkbox column to table header and rows**

In the table header (`<thead>`), add a checkbox cell before "书签":

```tsx
<th className="px-2 py-3">
  <input
    type="checkbox"
    checked={allSelected}
    onChange={() => (allSelected ? deselectAll() : selectAll())}
    className="h-4 w-4 accent-primary"
  />
</th>
```

In each table row, add a checkbox cell:

```tsx
<td className="px-2 py-3">
  <input
    type="checkbox"
    checked={selectedIds.has(item.id)}
    onChange={() => toggleSelection(item.id)}
    className="h-4 w-4 accent-primary"
  />
</td>
```

- [ ] **Step 4: Add bulk action bar component inside the table wrapper**

After the table and empty state, add a floating bar:

```tsx
{selectedIds.size > 0 && (
  <div className="sticky bottom-0 flex items-center gap-3 border-t border-outline-variant bg-surface-container px-4 py-2 text-sm">
    <span className="text-on-surface-variant">已选 {selectedIds.size} 项</span>
    <div className="h-4 w-px bg-outline-variant" />
    <button
      type="button"
      onClick={() => {
        if (confirm(`确定删除选中的 ${selectedIds.size} 个书签？`)) {
          void Promise.all([...selectedIds].map((id) => repository.remove(id))).then(() => {
            setBookmarks((prev) => prev.filter((item) => !selectedIds.has(item.id)));
            setSelectedIds(new Set());
          });
        }
      }}
      className="rounded px-2 py-1 text-error transition-colors hover:bg-error/10"
    >
      删除
    </button>
    <button
      type="button"
      onClick={() => {
        void repository.bulkUpdate([...selectedIds], { isUnread: false }).then(() => {
          setBookmarks((prev) => prev.map((item) => selectedIds.has(item.id) ? { ...item, isUnread: false } : item));
        });
      }}
      className="rounded px-2 py-1 text-on-surface transition-colors hover:bg-surface-container-high"
    >
      标记已读
    </button>
    <button
      type="button"
      onClick={() => {
        void repository.bulkUpdate([...selectedIds], { isUnread: true }).then(() => {
          setBookmarks((prev) => prev.map((item) => selectedIds.has(item.id) ? { ...item, isUnread: true } : item));
        });
      }}
      className="rounded px-2 py-1 text-on-surface transition-colors hover:bg-surface-container-high"
    >
      标记未读
    </button>
    <button
      type="button"
      onClick={() => {
        void repository.bulkUpdate([...selectedIds], { isFavorite: true }).then(() => {
          setBookmarks((prev) => prev.map((item) => selectedIds.has(item.id) ? { ...item, isFavorite: true } : item));
        });
      }}
      className="rounded px-2 py-1 text-on-surface transition-colors hover:bg-surface-container-high"
    >
      收藏
    </button>
    <button
      type="button"
      onClick={() => {
        void repository.bulkUpdate([...selectedIds], { isFavorite: false }).then(() => {
          setBookmarks((prev) => prev.map((item) => selectedIds.has(item.id) ? { ...item, isFavorite: false } : item));
        });
      }}
      className="rounded px-2 py-1 text-on-surface transition-colors hover:bg-surface-container-high"
    >
      取消收藏
    </button>
  </div>
)}
```

- [ ] **Step 5: Add "移动工作区" bulk action**

This needs a dropdown in the bulk action bar. Add it after the "取消收藏" button:

```tsx
<select
  value=""
  onChange={(e) => {
    const wsId = e.target.value || null;
    if (wsId === "") return;
    void repository.bulkUpdate([...selectedIds], { workspaceId: wsId }).then(() => {
      setBookmarks((prev) => prev.map((item) => selectedIds.has(item.id) ? { ...item, workspaceId: wsId } : item));
    });
    e.target.value = "";
  }}
  className="rounded border border-outline-variant bg-surface px-2 py-1 text-xs text-on-surface outline-none"
>
  <option value="">移动工作区...</option>
  <option value="">未分组</option>
  {workspaces.map((ws) => (
    <option key={ws.id} value={ws.id}>{ws.name}</option>
  ))}
</select>
```

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/DashboardApp.tsx
git commit -m "feat: add bulk operations to dashboard page"
```

---

### Task 6: Add status + bulk to Dashboard modal

**Files:**
- Modify: `src/dashboard/DashboardApp.tsx`

- [ ] **Step 1: Add statusFilter and selection state to DashboardModal**

Add to DashboardModalProps and destructuring:

```typescript
interface DashboardModalProps {
  // ... existing props
  statusFilter: "all" | "unread" | "favorite";
  setStatusFilter: (v: "all" | "unread" | "favorite") => void;
}
```

Also pass `selectedIds`, `toggleSelection`, `selectAll`, `deselectAll`, and bulk action handlers from the parent, OR manage them inside DashboardModal.

For simplicity, manage them inside DashboardModal since the modal is a self-contained component.

Add inside DashboardModal:

```typescript
const [modalStatusFilter, setModalStatusFilter] = useState<"all" | "unread" | "favorite">("all");
const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());

const modalResults = useMemo(() => {
  let filtered = results;
  if (modalStatusFilter === "unread") filtered = filtered.filter((i) => i.isUnread);
  if (modalStatusFilter === "favorite") filtered = filtered.filter((i) => i.isFavorite);
  return filtered;
}, [results, modalStatusFilter]);

function modalToggleSelection(id: string) {
  setModalSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function modalSelectAll() {
  setModalSelectedIds(new Set(modalResults.map((r) => r.id)));
}

function modalDeselectAll() {
  setModalSelectedIds(new Set());
}

const modalAllSelected = modalResults.length > 0 && modalResults.every((r) => modalSelectedIds.has(r.id));
```

Wait — this duplicates a lot of logic. But since the modal is a separate component with its own render, it makes sense to have its own state. The `results` prop already includes workspace filtering from the parent. We just add status filtering on top.

- [ ] **Step 2: Update modal results mapping**

Use `modalResults` instead of `results` throughout the modal's list rendering. Also update `statusText` to use `modalResults.length`.

- [ ] **Step 3: Add status filter buttons to modal header**

Add next to the "书签管理" title:

```tsx
<div className="flex items-center gap-1">
  {(["all", "unread", "favorite"] as const).map((key) => (
    <button
      key={key}
      type="button"
      onClick={() => setModalStatusFilter(key)}
      className={[
        "rounded px-2 py-0.5 text-[11px] transition-colors",
        modalStatusFilter === key
          ? "bg-primary text-on-primary"
          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
      ].join(" ")}
    >
      {key === "all" && "全部"}
      {key === "unread" && "未读"}
      {key === "favorite" && "收藏"}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Add checkboxes to modal list items**

Before the favicon in each list item:

```tsx
<input
  type="checkbox"
  checked={modalSelectedIds.has(item.id)}
  onChange={(e) => { e.stopPropagation(); modalToggleSelection(item.id); }}
  className="h-4 w-4 flex-none accent-primary"
/>
```

- [ ] **Step 5: Add bulk action bar to modal footer**

Replace the keyboard hints footer with a conditional bulk action bar when items are selected:

```tsx
{modalSelectedIds.size > 0 ? (
  <div className="flex flex-none items-center gap-2 border-t border-outline-variant bg-surface-container px-4 py-2 text-xs">
    <span className="text-on-surface-variant">已选 {modalSelectedIds.size} 项</span>
    <span>·</span>
    <button type="button" onClick={() => { if (confirm(`删除 ${modalSelectedIds.size} 项？`)) { void Promise.all([...modalSelectedIds].map((id) => repository.remove(id))).then(() => { setBookmarks((prev) => prev.filter((i) => !modalSelectedIds.has(i.id))); setModalSelectedIds(new Set()); }); } }} className="text-error hover:underline">删除</button>
    <span>·</span>
    <button type="button" onClick={() => { void repository.bulkUpdate([...modalSelectedIds], { isUnread: false }); setBookmarks((prev) => prev.map((i) => modalSelectedIds.has(i.id) ? { ...i, isUnread: false } : i)); }} className="text-on-surface hover:underline">已读</button>
    <span>·</span>
    <button type="button" onClick={() => { void repository.bulkUpdate([...modalSelectedIds], { isFavorite: true }); setBookmarks((prev) => prev.map((i) => modalSelectedIds.has(i.id) ? { ...i, isFavorite: true } : i)); }} className="text-on-surface hover:underline">收藏</button>
  </div>
) : (
  <div className="flex flex-none items-center gap-2 border-t border-outline-variant bg-surface-container-low px-4 py-2 text-xs text-outline">
    <span>↑↓ 选择</span>
    <span>·</span>
    <span>Enter 打开</span>
    <span>·</span>
    <span>E 编辑</span>
    <span>·</span>
    <span>Delete 删除</span>
    <span>·</span>
    <span>Esc 关闭</span>
  </div>
)}
```

- [ ] **Step 6: Add star/unread indicators to modal list items**

Add unread dot to favicon (same as SearchApp), and star button next to the actions.

- [ ] **Step 7: Add Space keyboard shortcut for selection**

In modal's `handleKeyDown`:

```tsx
if (event.key === " " && document.activeElement !== inputRef.current) {
  event.preventDefault();
  if (selectedItem) modalToggleSelection(selectedItem.id);
}
```

- [ ] **Step 8: Commit**

```bash
git add src/dashboard/DashboardApp.tsx
git commit -m "feat: add status filters and bulk operations to dashboard modal"
```

---

### Task 7: Build and verify

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Manual verification checklist**

1. Reload extension in Chrome
2. Open Dashboard page — old bookmarks should show correct migration status (unread if never visited)
3. Save a new bookmark — should show unread dot
4. Click to open a bookmark — dot should disappear
5. Click star — should toggle
6. Click "未读" filter — only unread bookmarks shown
7. Click "收藏" filter — only favorites shown
8. Select multiple bookmarks via checkboxes — bulk action bar appears
9. Bulk delete — confirm dialog, bookmarks removed
10. Bulk mark as read — dots disappear
11. Open Dashboard modal via popup or shortcut — same status/bulk features work
12. Search overlay — star and unread indicators visible, opening auto-marks as read

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete bookmark enrichment phase 1 — status and bulk operations"
```

---

## Spec Coverage Self-Review

| Spec Requirement | Implementing Task |
|---|---|
| `isFavorite` / `isUnread` fields on BookmarkItem | Task 1 |
| Migration: old bookmarks get defaults | Task 1 Step 4 |
| `bookmarkFromTab` defaults | Task 1 Step 2 |
| `saveCurrentTab` preserves status on upsert | Task 1 (touchBookmark handles it) |
| `bulkUpdate` repository method | Task 1 Step 5 |
| SearchApp star/unread indicators | Task 3 |
| SearchApp auto-mark-read on open | Task 3 Step 2 |
| Dashboard page status filters | Task 4 |
| Dashboard page row indicators | Task 4 |
| Dashboard page auto-mark-read | Task 4 Step 4 |
| Dashboard page bulk selection | Task 5 |
| Dashboard page bulk actions | Task 5 |
| Dashboard modal status + bulk | Task 6 |

No placeholders found. All type names and signatures are consistent.
