import type { Workspace } from "../domain/types";

const WORKSPACE_STORAGE_KEY = "quickmark.workspaces";

export interface WorkspaceRepository {
  list(): Promise<Workspace[]>;
  get(id: string): Promise<Workspace | undefined>;
  create(workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">, now?: number): Promise<Workspace>;
  update(id: string, patch: Partial<Omit<Workspace, "id" | "createdAt" | "updatedAt">>, now?: number): Promise<Workspace | undefined>;
  remove(id: string): Promise<void>;
}

export class ChromeWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly storage: Pick<chrome.storage.StorageArea, "get" | "set">) {}

  async list(): Promise<Workspace[]> {
    const result = await this.storage.get({ [WORKSPACE_STORAGE_KEY]: [] });
    const items = Array.isArray(result[WORKSPACE_STORAGE_KEY])
      ? (result[WORKSPACE_STORAGE_KEY] as Workspace[])
      : [];
    return items.map((item) => ({
      description: "",
      color: "",
      ...item
    }));
  }

  async get(id: string): Promise<Workspace | undefined> {
    const items = await this.list();
    return items.find((item) => item.id === id);
  }

  async create(workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">, now = Date.now()): Promise<Workspace> {
    const items = await this.list();
    const id = `ws_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const created: Workspace = {
      ...workspace,
      id,
      createdAt: now,
      updatedAt: now
    };
    await this.write([...items, created]);
    return created;
  }

  async update(id: string, patch: Partial<Omit<Workspace, "id" | "createdAt" | "updatedAt">>, now = Date.now()): Promise<Workspace | undefined> {
    const items = await this.list();
    const existing = items.find((item) => item.id === id);

    if (!existing) {
      return undefined;
    }

    const updated: Workspace = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now
    };

    await this.write(items.map((item) => (item.id === id ? updated : item)));

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
