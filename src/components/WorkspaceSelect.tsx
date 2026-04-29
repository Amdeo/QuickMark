import { useEffect, useState } from "react";
import type { Workspace } from "../domain/types";
import { createWorkspaceRepository } from "../repositories/workspaceRepository";

type WorkspaceSelectProps = {
  value: string | null;
  onChange: (workspaceId: string | null) => void;
};

export function WorkspaceSelect({ value, onChange }: WorkspaceSelectProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    const repo = createWorkspaceRepository();
    repo.list().then(setWorkspaces).catch(() => setWorkspaces([]));
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const selected = event.target.value;
    onChange(selected === "" ? null : selected);
  }

  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={handleChange}
        className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
      >
        <option value="">无工作区</option>
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
