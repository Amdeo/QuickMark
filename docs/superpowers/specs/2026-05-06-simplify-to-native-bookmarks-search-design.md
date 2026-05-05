# QuickMark Simplification: Native Chrome Bookmarks Search

## Context

QuickMark was originally a full-featured bookmark manager with custom storage (Chrome storage API), workspaces/folders, tags, notes, favorites, unread status, save panel, dashboard, settings, and more. The user wants to radically simplify it to a **read-only search enhancer** for Chrome's native bookmarks — no custom storage, no editing, no management pages.

## Goals

1. **Stop managing bookmarks ourselves** — use Chrome's native `chrome.bookmarks` API as the single source of truth.
2. **Keep only search + sorting** — intelligent fuzzy search (Fuse.js) and history-based recency sorting.
3. **Single UI entry point** — content script overlay triggered by `Ctrl+Shift+K` or clicking the extension icon.
4. **Delete everything else** — dashboard, settings, workspaces, save panel, popup menu, custom repositories.

## Architecture

### Data Flow

```
chrome.bookmarks.getTree()
       │
       ▼
┌─────────────────────┐
│ chromeBookmarks.ts  │  Flatten tree + attach history
│   (adapter)         │
└─────────────────────┘
       │
       ▼
BookmarkItem[]
       │
       ▼
┌─────────────────────┐
│   search.ts         │  Fuse.js fuzzy search + smartScore sorting
│   (domain)          │
└─────────────────────┘
       │
       ▼
SearchApp.tsx
(content script overlay)
```

### BookmarkItem (Simplified)

```typescript
export type BookmarkItem = {
  id: string;              // Chrome bookmark id
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  createdAt?: number;      // Chrome dateAdded
  lastVisitedAt?: number;  // from chrome.history
  visitCount: number;      // from chrome.history, default 0
};
```

Deleted fields: `tags`, `workspaceId`, `notes`, `isFavorite`, `isUnread`, `updatedAt`.

### Chrome Bookmarks Adapter

**File:** `src/adapters/chromeBookmarks.ts`

Responsibility: Convert Chrome's tree-structured bookmarks into a flat `BookmarkItem[]`, enriched with `chrome.history` visit data for sorting.

```typescript
export async function getNativeBookmarks(): Promise<BookmarkItem[]> {
  const [tree, historyItems] = await Promise.all([
    chrome.bookmarks.getTree(),
    chrome.history.search({ text: "", maxResults: 10000, startTime: 0 })
  ]);
  // Flatten tree recursively
  // Map history by URL for visitCount + lastVisitedAt lookup
  // Return BookmarkItem[]
}
```

### Search Algorithm

Reuse existing `domain/search.ts` with minimal changes:
- Input: `BookmarkItem[]` (from adapter instead of repository)
- Fuse.js fuzzy search on `title`, `url`, `domain`
- `smartScore` tie-breaker using `lastVisitedAt`, `visitCount`, `createdAt`
- No tag or workspace filtering (those fields are gone)

## UI Design

### Search Overlay (Only Interface)

```
┌─────────────────────────────────────────┐
│ 🔍 搜索书签...                    ⌘ K   │
├─────────────────────────────────────────┤
│ 历史搜索                                │
│   ├─ 上次搜索关键词                     │
│   └─ ...                                │
├─────────────────────────────────────────┤
│ 书签 24                                 │
│                                         │
│ ▎ 🔖 React Docs      react.dev · 12次  │
│   书签栏 > 前端 > React                 │
│                                         │
│   🔖 GitHub            github.com · 8次 │
│   书签栏 > 开发工具                     │
│                                         │
│   🔖 知乎               zhihu.com · 3次 │
│   其他书签                              │
│                                         │
├─────────────────────────────────────────┤
│ ↑↓ 导航  ·  ↵ 打开  ·  Esc 关闭         │
└─────────────────────────────────────────┘
```

**Key interactions:**
- `↑↓` — Navigate results
- `Enter` — Open selected bookmark (same tab)
- `Ctrl/Cmd + Enter` — Open in new tab
- `1-9` — Direct open top 9 results
- `Esc` — Close overlay

**Changes from current SearchApp:**
- Remove history-mixed results (only Chrome bookmarks)
- Remove tags display
- Remove notes display
- Remove `M` key dashboard shortcut
- Remove save prompt text
- **Add:** Chrome folder path per row (e.g., "书签栏 > 前端")
- **Add:** Numeric badges 1-9 on first 9 results

### Data Loading Strategy

Every time overlay opens:
1. `chrome.bookmarks.getTree()` — read full bookmark tree
2. `chrome.history.search({ text: "", maxResults: 5000 })` — read history for sorting
3. Flatten + enrich → `BookmarkItem[]`
4. Search/sort → render

Expected latency: <100ms for typical bookmark counts (hundreds to low thousands).

## File Changes

### Deleted

```
src/dashboard/              ← entire directory
src/settings/               ← entire directory
src/workspaces/             ← entire directory
src/save/                   ← entire directory
src/search/                 ← search.html standalone page only
src/repositories/           ← bookmarkRepository, workspaceRepository + tests
src/components/TagInput.tsx
src/components/WorkspaceSelect.tsx
src/components/SideNav.tsx
dashboard.html
settings.html
workspaces.html
search.html
```

### Modified

```
src/content/index.tsx        ← remove dashboard/save logic, keep only search overlay
src/search/SearchApp.tsx     ← simplify: remove tags/notes/history-results/dashboard-shortcut
src/search/useBookmarks.ts   ← rewrite: use adapter instead of repository
src/domain/search.ts         ← adjust for simplified BookmarkItem
src/domain/types.ts          ← simplify BookmarkItem
src/background/index.ts      ← remove save/dashboard logic
src/popup/PopupApp.tsx       ← click icon → trigger search overlay directly
src/components/Icon.tsx      ← keep (may need icon cleanup)
public/manifest.json         ← remove storage/scripting/host_permissions, add bookmarks
```

### New

```
src/adapters/chromeBookmarks.ts  ← Chrome bookmarks → BookmarkItem adapter
```

## Manifest Changes

```json
{
  "permissions": ["tabs", "history", "bookmarks"],
  "commands": {
    "open-search": {
      "suggested_key": { "default": "Ctrl+Shift+K", "mac": "Command+Shift+K" },
      "description": "Open QuickMark search"
    }
  }
}
```

Removed: `storage`, `scripting`, `save-current-page`, `open-dashboard` commands, `host_permissions`.

## Migration Notes

- Existing data in `chrome.storage.local` (`quickmark.bookmarks`, `quickmark.workspaces`) becomes orphaned — safe to ignore since we're no longer reading it.
- No data migration needed because we're switching to Chrome's native bookmarks as the source of truth.
- Users who previously saved bookmarks via QuickMark will need to use Chrome's native bookmark manager (or drag the bookmark star) going forward.

## Open Questions

None — design approved by user.
