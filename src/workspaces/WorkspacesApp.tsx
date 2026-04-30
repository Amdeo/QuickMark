import { useEffect, useState } from "react";
import type { BookmarkItem, Workspace } from "../domain/types";
import { createWorkspaceRepository } from "../repositories/workspaceRepository";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";

const workspaceRepo = createWorkspaceRepository();
const bookmarkRepo = createBookmarkRepository();

export function WorkspacesApp() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadData() {
    const [ws, bm] = await Promise.all([workspaceRepo.list(), bookmarkRepo.list()]);
    setWorkspaces(ws);
    setBookmarks(bm);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await workspaceRepo.create({ name });
    setNewName("");
    await loadData();
  }

  async function handleDelete(workspaceId: string) {
    const confirmed = window.confirm("删除此工作区？关联的书签将变为未分组。");
    if (!confirmed) return;

    await workspaceRepo.remove(workspaceId);

    const affected = bookmarks.filter((b) => b.workspaceId === workspaceId);
    await Promise.all(affected.map((b) => bookmarkRepo.update(b.id, { workspaceId: null })));

    if (expandedId === workspaceId) {
      setExpandedId(null);
    }
    await loadData();
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function getBookmarksForWorkspace(workspaceId: string): BookmarkItem[] {
    return bookmarks.filter((b) => b.workspaceId === workspaceId);
  }

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">工作区</h1>
        <p className="mt-1 text-sm text-outline">将书签分组管理</p>

        <form onSubmit={handleCreate} className="mt-6 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="新建工作区名称..."
            className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-outline"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-container"
          >
            创建
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {workspaces.length === 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container py-8 text-center text-sm text-outline">
              暂无工作区
            </div>
          )}

          {workspaces.map((ws) => {
            const wsBookmarks = getBookmarksForWorkspace(ws.id);
            const isExpanded = expandedId === ws.id;

            return (
              <div key={ws.id} className="rounded-xl border border-outline-variant bg-surface-container transition-shadow hover:shadow-sm">
                <div
                  className="flex cursor-pointer items-center justify-between px-4 py-3"
                  onClick={() => toggleExpand(ws.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-on-surface">{ws.name}</span>
                    <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-outline">{wsBookmarks.length} 个书签</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-outline transition-transform">{isExpanded ? "▾" : "▸"}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(ws.id);
                      }}
                      className="rounded p-1 text-xs text-outline transition-colors hover:bg-surface-container-high hover:text-error"
                      title="删除工作区"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-outline-variant px-4 py-2">
                    {wsBookmarks.length === 0 ? (
                      <div className="py-4 text-center text-sm text-outline">此工作区暂无书签</div>
                    ) : (
                      wsBookmarks.map((bm) => (
                        <div key={bm.id} className="flex items-center gap-2 py-2">
                          <div className="flex h-5 w-5 flex-none items-center justify-center rounded border border-outline-variant bg-surface text-[10px] text-outline">
                            {bm.favicon ? (
                              <img src={bm.favicon} alt="" className="h-3 w-3" />
                            ) : (
                              <span className="font-semibold">{bm.domain.slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="flex-1 truncate text-sm text-on-surface">{bm.title}</span>
                          <span className="text-xs text-outline">{bm.visitCount} 次访问</span>
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
