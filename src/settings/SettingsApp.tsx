import React, { useEffect, useState } from "react";

interface Settings {
  showSavePanel: boolean;
}

const DEFAULT_SETTINGS: Settings = { showSavePanel: true };
const STORAGE_KEY = "quickmark.settings";

export function SettingsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

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
