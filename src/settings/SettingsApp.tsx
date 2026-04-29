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
        `导入 ${result.importedBookmarks} 个书签` +
          (result.importedWorkspaces > 0 ? `、${result.importedWorkspaces} 个工作区` : "") +
          (result.skipped > 0 ? `，跳过 ${result.skipped} 个重复项` : "")
      );
    } catch {
      setImportStatus("导入失败，请检查文件格式。");
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
      <h1 className="mb-6 text-xl font-semibold text-on-surface">设置</h1>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-on-surface">保存行为</h2>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#1F2430] bg-surface-container p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={settings.showSavePanel}
            onChange={handleToggle}
          />
          <div>
            <div className="font-medium text-on-surface">每次保存时显示保存面板</div>
            <div className="mt-1 text-xs text-outline">
              开启后，按保存快捷键会弹出面板以编辑标签、工作区和备注。关闭则一键静默保存。
            </div>
          </div>
        </label>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-on-surface">数据</h2>
        <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-on-surface">导出书签</div>
              <div className="text-xs text-outline">将所有书签和工作区导出为 JSON</div>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high"
            >
              导出
            </button>
          </div>

          <div className="my-2 border-t border-[#1F2430]" />

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-on-surface">导入书签</div>
              <div className="text-xs text-outline">从 QuickMark JSON 或浏览器 HTML 书签文件导入</div>
            </div>
            <button
              type="button"
              onClick={handleImportClick}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high"
            >
              导入
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
        <h2 className="mb-3 text-sm font-medium text-on-surface">键盘快捷键</h2>
        <div className="rounded-xl border border-[#1F2430] bg-surface-container p-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-on-surface">打开搜索</span>
            <div className="flex items-center gap-1">
              <ShortcutBadge>{isMac ? "⌘" : "Ctrl"}</ShortcutBadge>
              <ShortcutBadge>Shift</ShortcutBadge>
              <ShortcutBadge>K</ShortcutBadge>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-on-surface">保存当前标签页</span>
            <div className="flex items-center gap-1">
              <ShortcutBadge>{isMac ? "⌘" : "Ctrl"}</ShortcutBadge>
              <ShortcutBadge>Shift</ShortcutBadge>
              <ShortcutBadge>S</ShortcutBadge>
            </div>
          </div>
          <div className="mt-3 text-xs text-outline">
            自定义快捷键请访问{" "}
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
