import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookmarkItem, Workspace } from "../domain/types";
import { searchBookmarks } from "../domain/search";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";
import { createWorkspaceRepository } from "../repositories/workspaceRepository";

const repository = createBookmarkRepository();
const workspaceRepository = createWorkspaceRepository();

export function useBookmarks(query: string) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [items, wsList] = await Promise.all([
      repository.list(),
      workspaceRepository.list()
    ]);
    setBookmarks(items);
    setWorkspaces(wsList);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const results = useMemo(
    () => searchBookmarks(bookmarks, query, workspaces),
    [bookmarks, query, workspaces]
  );

  const remove = useCallback(async (id: string) => {
    await repository.remove(id);
    setBookmarks((items) => items.filter((item) => item.id !== id));
  }, []);

  const markVisited = useCallback(async (id: string) => {
    const item = await repository.markVisited(id);
    if (!item) {
      return;
    }

    setBookmarks((items) => items.map((current) => (current.id === id ? item : current)));
  }, []);

  return { bookmarks, results, isLoading, refresh, remove, markVisited };
}
