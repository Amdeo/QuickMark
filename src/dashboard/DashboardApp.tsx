import { useEffect, useMemo, useRef, useState } from "react";
import type { BookmarkItem, Workspace } from "../domain/types";
import { searchBookmarks } from "../domain/search";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";
import { createWorkspaceRepository } from "../repositories/workspaceRepository";
import { TagInput } from "../components/TagInput";
import { WorkspaceSelect } from "../components/WorkspaceSelect";

const repository = createBookmarkRepository();
const workspaceRepository = createWorkspaceRepository();

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString();
}

type DashboardAppProps = {
  mode?: "page" | "modal";
  onClose?: () => void;
};

export function DashboardApp({ mode = "page", onClose }: DashboardAppProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [query, setQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "favorite">("all");
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
      const [items, wsList] = await Promise.all([
        repository.list(),
        workspaceRepository.list()
      ]);
      setBookmarks(items);
      setWorkspaces(wsList);
      setIsLoading(false);
    }
    void load();
  }, []);

  useEffect(() => {
    if (mode !== "modal") return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [mode, onClose]);

  const workspaceMap = useMemo(() => {
    const map = new Map<string, Workspace>();
    for (const ws of workspaces) {
      map.set(ws.id, ws);
    }
    return map;
  }, [workspaces]);

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

  const stats = useMemo(() => {
    const total = bookmarks.length;
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const thisWeek = bookmarks.filter((b) => b.createdAt >= oneWeekAgo).length;
    const topVisits = bookmarks.length > 0 ? Math.max(...bookmarks.map((b) => b.visitCount)) : 0;
    return { total, thisWeek, topVisits };
  }, [bookmarks]);

  async function handleOpen(item: BookmarkItem) {
    const updated = await repository.markVisited(item.id);
    if (updated) {
      setBookmarks((items) => items.map((i) => (i.id === item.id ? updated : i)));
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
  }

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
    if (!confirm("确定删除此书签？")) {
      return;
    }
    await repository.remove(id);
    setBookmarks((items) => items.filter((item) => item.id !== id));
  }

  async function toggleFavorite(id: string) {
    const item = bookmarks.find((i) => i.id === id);
    if (!item) return;
    const updated = await repository.update(id, { isFavorite: !item.isFavorite });
    if (updated) {
      setBookmarks((prev) => prev.map((current) => (current.id === id ? updated : current)));
    }
  }

  async function toggleUnread(id: string) {
    const item = bookmarks.find((i) => i.id === id);
    if (!item) return;
    const updated = await repository.update(id, { isUnread: !item.isUnread });
    if (updated) {
      setBookmarks((prev) => prev.map((current) => (current.id === id ? updated : current)));
    }
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

  const inner = (
    <>
      <h1 className="mb-6 text-xl font-semibold">书签管理</h1>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container p-4">
          <div className="text-2xl font-semibold text-primary">{stats.total}</div>
          <div className="mt-1 text-xs text-outline">全部书签</div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container p-4">
          <div className="text-2xl font-semibold text-secondary">{stats.thisWeek}</div>
          <div className="mt-1 text-xs text-outline">本周新增</div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container p-4">
          <div className="text-2xl font-semibold text-tertiary">{stats.topVisits}</div>
          <div className="mt-1 text-xs text-outline">最高访问</div>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索书签..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container py-2 pl-9 pr-3 text-sm text-on-surface outline-none focus:border-primary placeholder:text-outline"
            spellCheck={false}
          />
        </div>
        <select
          value={workspaceFilter}
          onChange={(e) => setWorkspaceFilter(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
        >
          <option value="all">全部工作区</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["all", "unread", "favorite"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              aria-current={statusFilter === key ? "true" : undefined}
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
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs text-on-surface-variant">
              <th className="px-4 py-3 font-medium">书签</th>
              <th className="px-4 py-3 font-medium">工作区</th>
              <th className="px-4 py-3 font-medium">标签</th>
              <th className="px-4 py-3 font-medium">访问</th>
              <th className="px-4 py-3 font-medium">最后访问</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.id} className="border-b border-outline-variant/50 transition-colors hover:bg-surface-container-high">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-6 w-6 flex-none items-center justify-center rounded border border-outline-variant bg-surface-container">
                      {item.isUnread && (
                        <span className="absolute -left-0.5 -top-0.5 z-10 h-2 w-2 rounded-full bg-primary" />
                      )}
                      {item.favicon ? (
                        <img src={item.favicon} alt="" className="h-4 w-4" />
                      ) : (
                        <span className="text-[10px] font-semibold uppercase text-outline">
                          {item.domain.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => void handleOpen(item)}
                        className="truncate font-medium text-left hover:text-primary"
                      >
                        {item.title}
                      </button>
                      <div className="text-xs text-outline">{item.domain}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {item.workspaceId ? (workspaceMap.get(item.workspaceId)?.name ?? "—") : "—"}
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void toggleFavorite(item.id); }}
                      className={["rounded p-1 text-sm transition-colors", item.isFavorite ? "text-primary" : "text-on-surface-variant hover:text-primary"].join(" ")}
                      title={item.isFavorite ? "取消收藏" : "收藏"}
                      aria-pressed={item.isFavorite}
                    >
                      {item.isFavorite ? "★" : "☆"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded p-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                      title="编辑"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(item.id)}
                      className="rounded p-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
                      title="删除"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && results.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-on-surface-variant">
            {query ? "未找到匹配的书签。" : "暂无书签。"}
          </div>
        )}
      </div>

      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.15)", backdropFilter: "blur(6px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelEdit();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-outline-variant bg-surface shadow-2xl shadow-black/40"
            onKeyDown={handleEditKeyDown}
          >
            <div className="flex h-14 items-center justify-between border-b border-outline-variant px-4">
              <h2 className="text-sm font-medium text-on-surface">编辑书签</h2>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                aria-label="关闭"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">标题</label>
                <input
                  ref={editTitleRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">链接</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">工作区</label>
                <WorkspaceSelect value={editWorkspaceId} onChange={setEditWorkspaceId} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">标签</label>
                <div className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
                  <TagInput tags={editTags} onChange={setEditTags} placeholder="添加标签..." />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">备注</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="可选备注..."
                  className="h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-outline-variant px-4 py-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleUpdate()}
                disabled={editSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                {editSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (mode === "modal") {
    return <DashboardModal
      bookmarks={bookmarks}
      workspaces={workspaces}
      workspaceMap={workspaceMap}
      query={query}
      setQuery={setQuery}
      workspaceFilter={workspaceFilter}
      setWorkspaceFilter={setWorkspaceFilter}
      isLoading={isLoading}
      results={results}
      onClose={onClose}
      onOpen={handleOpen}
      onEdit={startEdit}
      onRemove={handleRemove}
      editingId={editingId}
      editTitle={editTitle}
      setEditTitle={setEditTitle}
      editUrl={editUrl}
      setEditUrl={setEditUrl}
      editTags={editTags}
      setEditTags={setEditTags}
      editWorkspaceId={editWorkspaceId}
      setEditWorkspaceId={setEditWorkspaceId}
      editNotes={editNotes}
      setEditNotes={setEditNotes}
      editSaving={editSaving}
      onSave={handleUpdate}
      onCancelEdit={cancelEdit}
      editTitleRef={editTitleRef}
    />;
  }

  return (
    <main className="min-h-screen bg-surface p-6 text-on-surface">
      <div className="mx-auto max-w-5xl">
        {inner}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal-only redesign                                               */
/* ------------------------------------------------------------------ */

interface DashboardModalProps {
  bookmarks: BookmarkItem[];
  workspaces: Workspace[];
  workspaceMap: Map<string, Workspace>;
  query: string;
  setQuery: (v: string) => void;
  workspaceFilter: string;
  setWorkspaceFilter: (v: string) => void;
  isLoading: boolean;
  results: BookmarkItem[];
  onClose?: () => void;
  onOpen: (item: BookmarkItem) => void;
  onEdit: (item: BookmarkItem) => void;
  onRemove: (id: string) => void;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editUrl: string;
  setEditUrl: (v: string) => void;
  editTags: string[];
  setEditTags: (v: string[]) => void;
  editWorkspaceId: string | null;
  setEditWorkspaceId: (v: string | null) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
  editSaving: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
  editTitleRef: React.RefObject<HTMLInputElement>;
}

function DashboardModal(props: DashboardModalProps) {
  const {
    workspaces, workspaceMap, query, setQuery,
    workspaceFilter, setWorkspaceFilter, isLoading, results,
    onClose, onOpen, onEdit, onRemove,
    editingId, editTitle, setEditTitle, editUrl, setEditUrl,
    editTags, setEditTags, editWorkspaceId, setEditWorkspaceId,
    editNotes, setEditNotes, editSaving, onSave, onCancelEdit, editTitleRef
  } = props;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedItem = results[selectedIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, workspaceFilter]);

  useEffect(() => {
    if (selectedIndex > Math.max(results.length - 1, 0)) {
      setSelectedIndex(Math.max(results.length - 1, 0));
    }
  }, [results.length, selectedIndex]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (selectedItem) {
        void onOpen(selectedItem);
        onClose?.();
      }
    }
    if (event.key === "e" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      if (selectedItem) onEdit(selectedItem);
    }
    if ((event.key === "Backspace" && (event.metaKey || event.ctrlKey)) || event.key === "Delete") {
      event.preventDefault();
      if (selectedItem) void onRemove(selectedItem.id);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
    }
  }

  useEffect(() => {
    if (!listRef.current || !selectedItem) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, selectedItem]);

  const statusText = isLoading ? "加载中" : results.length === 0 ? (query ? "无结果" : "无书签") : `${results.length} 个书签`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.15)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full max-w-3xl flex-col rounded-xl border border-outline-variant bg-surface shadow-2xl shadow-black/40" style={{ maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex h-14 flex-none items-center justify-between border-b border-outline-variant px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-on-surface">书签管理</span>
            <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[11px] text-on-surface-variant">{statusText}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-none items-center gap-2 border-b border-outline-variant bg-surface-container px-4 py-2">
          <span className="text-lg text-outline">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索书签... (#标签 @工作区)"
            className="h-8 flex-1 border-none bg-transparent p-0 text-sm text-on-surface outline-none placeholder:text-outline"
            spellCheck={false}
          />
          <select
            value={workspaceFilter}
            onChange={(e) => setWorkspaceFilter(e.target.value)}
            className="h-8 rounded border border-outline-variant bg-surface px-2 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="all">全部工作区</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {results.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={item.id}
                data-index={index}
                onMouseEnter={() => setSelectedIndex(index)}
                className={[
                  "group flex cursor-pointer items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 transition-colors",
                  isSelected
                    ? "border-primary bg-primary-container/10"
                    : "border-transparent hover:bg-surface-container-high"
                ].join(" ")}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    void onOpen(item);
                  }
                }}
              >
                {/* Favicon */}
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded border border-outline-variant bg-surface-container">
                  {item.favicon ? (
                    <img src={item.favicon} alt="" className="h-4 w-4" />
                  ) : (
                    <span className="text-[10px] font-semibold uppercase text-outline">
                      {item.domain.slice(0, 1)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className={["truncate text-sm font-medium", isSelected ? "text-primary" : "text-on-surface"].join(" ")}>
                    {item.title}
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-outline">
                    <span className="truncate">{item.domain}</span>
                    {item.tags.length > 0 && (
                      <>
                        <span className="h-0.5 w-0.5 flex-none rounded-full bg-outline" />
                        <span className="truncate">{item.tags.join(", ")}</span>
                      </>
                    )}
                    {item.workspaceId && (
                      <>
                        <span className="h-0.5 w-0.5 flex-none rounded-full bg-outline" />
                        <span className="truncate">{workspaceMap.get(item.workspaceId)?.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-none items-center gap-3 text-xs text-outline">
                  <span>{item.visitCount} 次</span>
                  {item.lastVisitedAt && <span>{formatRelativeTime(item.lastVisitedAt)}</span>}
                </div>

                {/* Actions (visible on selected) */}
                <div className={["flex flex-none items-center gap-1", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"].join(" ")}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="rounded p-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                    title="编辑"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void onRemove(item.id); }}
                    className="rounded p-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}

          {!isLoading && results.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-on-surface-variant">
              {query ? "未找到匹配的书签。" : "暂无书签。"}
            </div>
          )}
        </div>

        {/* Footer hints */}
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
      </div>

      {/* Edit modal */}
      {editingId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.15)", backdropFilter: "blur(6px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancelEdit();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-outline-variant bg-surface shadow-2xl shadow-black/40"
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onCancelEdit(); }
              if (e.key === "Enter" && e.target instanceof HTMLInputElement) { e.preventDefault(); void onSave(); }
            }}
          >
            <div className="flex h-14 items-center justify-between border-b border-outline-variant px-4">
              <h2 className="text-sm font-medium text-on-surface">编辑书签</h2>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                aria-label="关闭"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">标题</label>
                <input
                  ref={editTitleRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">链接</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">工作区</label>
                <WorkspaceSelect value={editWorkspaceId} onChange={setEditWorkspaceId} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">标签</label>
                <div className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
                  <TagInput tags={editTags} onChange={setEditTags} placeholder="添加标签..." />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-on-surface-variant">备注</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="可选备注..."
                  className="h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-outline-variant px-4 py-3">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={editSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                {editSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
