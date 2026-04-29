import React, { useEffect, useRef, useState } from "react";
import { exportBookmarks, importFromJson, importFromHtml } from "./importExport";

interface Settings {
  showSavePanel: boolean;
}

const DEFAULT_SETTINGS: Settings = { showSavePanel: true };
const STORAGE_KEY = "quickmark.settings";

export function SettingsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
      setSettings(result[STORAGE_KEY]);
    });
  }, []);

  const handleToggle = () => {
    const next = { ...settings, showSavePanel: !settings.showSavePanel };
    setSettings(next);
    chrome.storage.local.set({ [STORAGE_KEY]: next });
  };

  const handleExport = () => {
    void exportBookmarks();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = file.name.endsWith(".html")
        ? await importFromHtml(file)
        : await importFromJson(file);

      setImportStatus(
        `Imported ${result.importedBookmarks} bookmarks` +
          (result.importedWorkspaces > 0 ? `, ${result.importedWorkspaces} workspaces` : "") +
          (result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : "")
      );
    } catch {
      setImportStatus("Import failed. Check file format.");
    }

    event.target.value = "";
  };

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  const ShortcutBadge = ({ children }: { children: React.ReactNode }) => (
    <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-xs text-on-surface-variant">
      {children}
    </span>
  );

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-xl font-semibold text-on-surface">Settings</h1>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-on-surface">Save Behavior</h2>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#1F2430] bg-surface-container p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={settings.showSavePanel}
            onChange={handleToggle}
          />
          <div>
            <div className="font-medium text-on-surface">Show save panel on every save</div>
            <div className="mt-1 text-xs text-outline">
              When enabled, pressing the save shortcut opens a panel to edit tags, workspace, and
              notes. Disable for silent one-click saving.
            </div>
          </div>
        </label>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-on-surface">Data</h2>
        <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-on-surface">Export Bookmarks</div>
              <div className="text-xs text-outline">Download all bookmarks and workspaces as JSON</div>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high"
            >
              Export
            </button>
          </div>

          <div className="my-2 border-t border-[#1F2430]" />

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-on-surface">Import Bookmarks</div>
              <div className="text-xs text-outline">Import from QuickMark JSON or browser HTML</div>
            </div>
            <button
              type="button"
              onClick={handleImportClick}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high"
            >
              Import
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.html"
            onChange={handleFileChange}
            className="hidden"
          />

          {importStatus && (
            <div className="mt-2 text-xs text-secondary">{importStatus}</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-on-surface">Keyboard Shortcuts</h2>
        <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-on-surface">Open Search</span>
            <div className="flex items-center gap-1">
              <ShortcutBadge>{isMac ? "⌘" : "Ctrl"}</ShortcutBadge>
              <ShortcutBadge>Shift</ShortcutBadge>
              <ShortcutBadge>K</ShortcutBadge>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-on-surface">Save Active Tab</span>
            <div className="flex items-center gap-1">
              <ShortcutBadge>{isMac ? "⌘" : "Ctrl"}</ShortcutBadge>
              <ShortcutBadge>Shift</ShortcutBadge>
              <ShortcutBadge>S</ShortcutBadge>
            </div>
          </div>
          <div className="mt-3 text-xs text-outline">
            To customize shortcuts, visit{" "}
            <a
              href="chrome://extensions/shortcuts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
              onClick={(e) => {
                e.preventDefault();
                chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
              }}
            >
              chrome://extensions/shortcuts
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
