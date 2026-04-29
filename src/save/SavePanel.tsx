import { useEffect, useRef, useState } from "react";
import type { TabSnapshot } from "../domain/types";
import { TagInput } from "../components/TagInput";
import { WorkspaceSelect } from "../components/WorkspaceSelect";
import { createBookmarkRepository } from "../repositories/bookmarkRepository";

type SavePanelProps = {
  tab: TabSnapshot;
  onSaved: () => void;
  onCancel: () => void;
};

export function SavePanel({ tab, onSaved, onCancel }: SavePanelProps) {
  const [title, setTitle] = useState(tab.title ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const repository = createBookmarkRepository();
      await repository.saveCurrentTab(
        { ...tab, title },
        { tags, workspaceId, notes }
      );
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
    if (event.key === "Enter") {
      const target = event.target as HTMLElement;
      if (target.tagName !== "TEXTAREA") {
        event.preventDefault();
        void handleSave();
      }
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-xl border border-[#1F2430] bg-surface shadow-2xl shadow-black/40"
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-14 items-center justify-between border-b border-[#1F2430] px-4">
        <h2 className="text-sm font-medium text-on-surface">Save Bookmark</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">
            Title
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">
            Workspace
          </label>
          <WorkspaceSelect value={workspaceId} onChange={setWorkspaceId} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">
            Tags
          </label>
          <div className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
            <TagInput tags={tags} onChange={setTags} placeholder="Add tags..." />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes..."
            className="h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[#1F2430] px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
