import { useEffect, useMemo, useRef, useState } from "react";
import type { BookmarkItem } from "../domain/types";
import { searchBookmarks } from "../domain/search";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";
import { TagInput } from "../components/TagInput";
import { WorkspaceSelect } from "../components/WorkspaceSelect";

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
  const [isLoading, setIsLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const editTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const items = await repository.list();
      setBookmarks(items);
      setIsLoading(false);
    }
    void load();
  }, []);

  const results = useMemo(() => searchBookmarks(bookmarks, query), [bookmarks, query]);

  const stats = useMemo(() => {
    const total = bookmarks.length;
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const thisWeek = bookmarks.filter((b) => b.createdAt >= oneWeekAgo).length;
    const topVisits = bookmarks.length > 0 ? Math.max(...bookmarks.map((b) => b.visitCount)) : 0;
    return { total, thisWeek, topVisits };
  }, [bookmarks]);

  function startEdit(item: BookmarkItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.url);
    setEditTags(item.tags);
    setEditWorkspaceId(item.workspaceId);
    setEditNotes(item.notes);
    setTimeout(() => editTitleRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
    setEditTags([]);
    setEditWorkspaceId(null);
    setEditNotes("");
  }

  async function handleUpdate() {
    if (!editingId) return;
    setEditSaving(true);
    const updated = await repository.update(editingId, {
      title: editTitle,
      url: editUrl,
      tags: editTags,
      workspaceId: editWorkspaceId,
      notes: editNotes
    });
    setEditSaving(false);
    if (updated) {
      setBookmarks((items) => items.map((item) => (item.id === editingId ? updated : item)));
    }
    cancelEdit();
  }

  async function handleRemove(id: string) {
    if (!confirm("Delete this bookmark?")) {
      return;
    }
    await repository.remove(id);
    setBookmarks((items) => items.filter((item) => item.id !== id));
  }

  function handleEditKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      void handleUpdate();
    }
  }

  return (
    <main className="min-h-screen bg-surface p-6 text-on-surface">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-xl font-semibold">Dashboard</h1>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
            <div className="text-2xl font-semibold text-primary">{stats.total}</div>
            <div className="mt-1 text-xs text-outline">Total Bookmarks</div>
          </div>
          <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
            <div className="text-2xl font-semibold text-secondary">{stats.thisWeek}</div>
            <div className="mt-1 text-xs text-outline">This Week</div>
          </div>
          <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
            <div className="text-2xl font-semibold text-tertiary">{stats.topVisits}</div>
            <div className="mt-1 text-xs text-outline">Top Visits</div>
          </div>
        </div>

        <div className="relative mb-4">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-9 pr-3 text-sm text-on-surface outline-none focus:border-primary placeholder:text-outline"
            spellCheck={false}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-[#1F2430]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1F2430] text-xs text-on-surface-variant">
                <th className="px-4 py-3 font-medium">Bookmark</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Visits</th>
                <th className="px-4 py-3 font-medium">Last Visited</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.id} className="border-b border-[#1F2430]/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 flex-none items-center justify-center rounded border border-[#1F2430] bg-surface-container">
                        {item.favicon ? (
                          <img src={item.favicon} alt="" className="h-4 w-4" />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase text-outline">
                            {item.domain.slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="text-xs text-outline">{item.domain}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.visitCount}</td>
                  <td className="px-4 py-3">
                    {item.lastVisitedAt ? formatRelativeTime(item.lastVisitedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-on-surface-variant transition-colors hover:text-primary"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemove(item.id)}
                        className="text-on-surface-variant transition-colors hover:text-error"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && results.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-on-surface-variant">
              {query ? "No matching bookmarks found." : "No bookmarks yet."}
            </div>
          )}
        </div>
      </div>

      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(12, 14, 17, 0.28)", backdropFilter: "blur(6px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelEdit();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#1F2430] bg-surface shadow-2xl shadow-black/40"
            onKeyDown={handleEditKeyDown}
          >
            <div className="flex h-14 items-center justify-between border-b border-[#1F2430] px-4">
              <h2 className="text-sm font-medium text-on-surface">Edit Bookmark</h2>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Title</label>
                <input
                  ref={editTitleRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">URL</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Workspace</label>
                <WorkspaceSelect value={editWorkspaceId} onChange={setEditWorkspaceId} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Tags</label>
                <div className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
                  <TagInput tags={editTags} onChange={setEditTags} placeholder="Add tags..." />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#1F2430] px-4 py-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpdate()}
                disabled={editSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
