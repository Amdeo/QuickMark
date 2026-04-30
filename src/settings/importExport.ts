import type { BookmarkItem, Workspace } from "../domain/types";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";
import { createWorkspaceRepository } from "../repositories/workspaceRepository";
import { extractDomain } from "../domain/bookmark";

const bookmarkRepository = createBookmarkRepository();
const workspaceRepository = createWorkspaceRepository();

export type ExportData = {
  version: number;
  bookmarks: BookmarkItem[];
  workspaces: Workspace[];
};

export async function exportBookmarks(): Promise<void> {
  const [bookmarks, workspaces] = await Promise.all([
    bookmarkRepository.list(),
    workspaceRepository.list()
  ]);

  const data: ExportData = {
    version: 1,
    bookmarks,
    workspaces
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `quickmark-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

type ImportResult = {
  importedBookmarks: number;
  importedWorkspaces: number;
  skipped: number;
};

export async function importFromJson(file: File): Promise<ImportResult> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<ExportData>;

  const incomingBookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
  const incomingWorkspaces = Array.isArray(data.workspaces) ? data.workspaces : [];

  return mergeData(incomingBookmarks, incomingWorkspaces);
}

export async function importFromHtml(file: File): Promise<ImportResult> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const links = doc.querySelectorAll("a[href]");
  const now = Date.now();
  const bookmarks: BookmarkItem[] = [];

  for (const link of links) {
    const url = link.getAttribute("href");
    const title = link.textContent?.trim() || url || "";

    if (!url || url.startsWith("javascript:") || url.startsWith("data:")) {
      continue;
    }

    const id = `bm_${now}_${Math.random().toString(36).slice(2, 8)}`;
    bookmarks.push({
      id,
      title,
      url,
      domain: extractDomain(url),
      createdAt: now,
      updatedAt: now,
      visitCount: 0,
      tags: [],
      workspaceId: null,
      notes: "",
      isFavorite: false,
      isUnread: false
    });
  }

  return mergeData(bookmarks, []);
}

async function mergeData(
  incomingBookmarks: BookmarkItem[],
  incomingWorkspaces: Workspace[]
): Promise<ImportResult> {
  const [existingBookmarks, existingWorkspaces] = await Promise.all([
    bookmarkRepository.list(),
    workspaceRepository.list()
  ]);

  const existingUrls = new Set(existingBookmarks.map((b) => b.url));
  const existingWsIds = new Set(existingWorkspaces.map((w) => w.id));

  const newBookmarks = incomingBookmarks.filter((b) => !existingUrls.has(b.url));
  const newWorkspaces = incomingWorkspaces.filter((w) => !existingWsIds.has(w.id));

  const mergedBookmarks = [...existingBookmarks, ...newBookmarks];
  const mergedWorkspaces = [...existingWorkspaces, ...newWorkspaces];

  await chrome.storage.local.set({
    "quickmark.bookmarks": mergedBookmarks,
    "quickmark.workspaces": mergedWorkspaces
  });

  return {
    importedBookmarks: newBookmarks.length,
    importedWorkspaces: newWorkspaces.length,
    skipped: incomingBookmarks.length - newBookmarks.length
  };
}
