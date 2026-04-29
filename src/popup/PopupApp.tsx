export function PopupApp() {
  const handleSearch = () => {
    chrome.runtime.sendMessage({ type: "QUICKMARK_TRIGGER_SEARCH" });
    window.close();
  };

  const openPage = (page: string) => {
    chrome.tabs.create({ url: chrome.runtime.getURL(page) });
    window.close();
  };

  return (
    <div className="w-52 bg-surface p-2">
      <div className="mb-1 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-outline">
        QuickMark
      </div>

      <button
        onClick={handleSearch}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
      >
        <span className="text-on-surface-variant">&#x2305;</span>
        搜索
      </button>

      <button
        onClick={() => openPage("dashboard.html")}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
      >
        <span className="text-on-surface-variant">&#x29C4;</span>
        书签管理
      </button>

      <button
        onClick={() => openPage("workspaces.html")}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
      >
        <span className="text-on-surface-variant">&#x25EB;</span>
        工作区
      </button>

      <div className="my-1 border-t border-[#1F2430]" />

      <button
        onClick={() => openPage("settings.html")}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      >
        <span className="text-on-surface-variant">&#x2699;</span>
        设置
      </button>
    </div>
  );
}
