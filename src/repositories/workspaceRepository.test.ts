import { describe, expect, it } from "vitest";
import { createMemoryStorageArea } from "../test/memoryStorage";
import { ChromeWorkspaceRepository } from "./workspaceRepository";
import type { Workspace } from "../domain/types";

function createRepo(initial: Workspace[] = []) {
  const storage = createMemoryStorageArea(
    initial.length > 0 ? { "quickmark.workspaces": initial } : {}
  );
  return new ChromeWorkspaceRepository(storage);
}

describe("ChromeWorkspaceRepository", () => {
  describe("create and list", () => {
    it("creates a workspace and lists it", async () => {
      const repo = createRepo();
      const workspace = await repo.create({ name: "Work" });

      expect(workspace.id).toMatch(/^ws_\d+_[a-z0-9]+$/);
      expect(workspace.name).toBe("Work");
      expect(workspace.createdAt).toBeTypeOf("number");
      expect(workspace.updatedAt).toBeTypeOf("number");

      const list = await repo.list();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(workspace.id);
    });

    it("appends to existing workspaces", async () => {
      const repo = createRepo([
        { id: "ws_1", name: "Personal", createdAt: 1, updatedAt: 1 }
      ]);

      await repo.create({ name: "Work" });
      const list = await repo.list();

      expect(list).toHaveLength(2);
      expect(list.map((w) => w.name)).toEqual(["Personal", "Work"]);
    });

    it("uses provided now for timestamps and id", async () => {
      const repo = createRepo();
      const now = 1234567890;
      const workspace = await repo.create({ name: "Test" }, now);

      expect(workspace.createdAt).toBe(now);
      expect(workspace.updatedAt).toBe(now);
      expect(workspace.id.startsWith(`ws_${now}_`)).toBe(true);
    });

    it("preserves optional fields", async () => {
      const repo = createRepo();
      const workspace = await repo.create({
        name: "Test",
        description: "A test workspace",
        color: "#ff0000"
      });

      expect(workspace.description).toBe("A test workspace");
      expect(workspace.color).toBe("#ff0000");
    });
  });

  describe("get", () => {
    it("returns workspace by id", async () => {
      const repo = createRepo([
        { id: "ws_1", name: "Personal", createdAt: 1, updatedAt: 1 },
        { id: "ws_2", name: "Work", createdAt: 2, updatedAt: 2 }
      ]);

      const workspace = await repo.get("ws_2");
      expect(workspace?.name).toBe("Work");
    });

    it("returns undefined for missing id", async () => {
      const repo = createRepo();
      const workspace = await repo.get("ws_missing");
      expect(workspace).toBeUndefined();
    });
  });

  describe("update", () => {
    it("updates workspace fields", async () => {
      const repo = createRepo([
        { id: "ws_1", name: "Old", description: "Old desc", color: "#000", createdAt: 1, updatedAt: 1 }
      ]);

      const updated = await repo.update("ws_1", { name: "New", description: "New desc" });

      expect(updated?.name).toBe("New");
      expect(updated?.description).toBe("New desc");
      expect(updated?.color).toBe("#000");
      expect(updated?.createdAt).toBe(1);
      expect(updated?.updatedAt).toBeGreaterThan(1);
    });

    it("uses provided now for updatedAt", async () => {
      const repo = createRepo([
        { id: "ws_1", name: "Old", createdAt: 1, updatedAt: 1 }
      ]);

      const updated = await repo.update("ws_1", { name: "New" }, 9999);
      expect(updated?.updatedAt).toBe(9999);
    });

    it("returns undefined for missing id", async () => {
      const repo = createRepo();
      const updated = await repo.update("ws_missing", { name: "New" });
      expect(updated).toBeUndefined();
    });

    it("does not allow updating id or createdAt", async () => {
      const repo = createRepo([
        { id: "ws_1", name: "Old", createdAt: 1, updatedAt: 1 }
      ]);

      const updated = await repo.update("ws_1", { id: "ws_hacked", createdAt: 999 } as Partial<Workspace>);
      expect(updated?.id).toBe("ws_1");
      expect(updated?.createdAt).toBe(1);
    });
  });

  describe("remove", () => {
    it("removes workspace by id", async () => {
      const repo = createRepo([
        { id: "ws_1", name: "Personal", createdAt: 1, updatedAt: 1 },
        { id: "ws_2", name: "Work", createdAt: 2, updatedAt: 2 }
      ]);

      await repo.remove("ws_1");
      const list = await repo.list();

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("ws_2");
    });

    it("is a no-op for missing id", async () => {
      const repo = createRepo([
        { id: "ws_1", name: "Personal", createdAt: 1, updatedAt: 1 }
      ]);

      await repo.remove("ws_missing");
      const list = await repo.list();

      expect(list).toHaveLength(1);
    });
  });
});
