// 轻量 boot 入口：仅注册消息监听。收到 QUICKMARK_TOGGLE 时先渲染
// 极简骨架面板（纯 DOM，无 React），同时按需动态加载搜索 UI 大包
// （assets/content-search.js），就绪后无缝替换。大包内含 React、Fuse.js
// 与 pinyin-pro 字典，日常浏览零成本，只有真正打开面板才解析。

// 与大包 src/content/search.tsx 中的 HOST_ID 保持一致，
// 用于判断大包是否已挂载。
const HOST_ID = "quickmark-overlay-root";
const SKELETON_HOST_ID = "quickmark-skeleton-root";

type SearchModule = {
  toggleSearchOverlay: () => void;
};

let searchModulePromise: Promise<SearchModule> | undefined;

chrome.runtime.onMessage.addListener((message: { type?: string }, sender: chrome.runtime.MessageSender) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message.type === "QUICKMARK_TOGGLE") {
    void handleToggle();
  }
});

async function handleToggle(): Promise<void> {
  // 大包已挂载：交大包处理开关切换（重复按键关闭面板）。
  if (document.getElementById(HOST_ID)) {
    const module = await loadSearchModule();
    module.toggleSearchOverlay();
    return;
  }
  // 骨架面板显示中：忽略重复按键，等待大包加载。
  if (document.getElementById(SKELETON_HOST_ID)) {
    return;
  }
  showSkeleton();
  try {
    const module = await loadSearchModule();
    // 骨架可能已被用户通过 Esc / 点击遮罩关闭，此时放弃打开。
    if (!document.getElementById(SKELETON_HOST_ID)) {
      return;
    }
    hideSkeleton();
    module.toggleSearchOverlay();
  } catch {
    hideSkeleton();
  }
}

function loadSearchModule(): Promise<SearchModule> {
  if (!searchModulePromise) {
    searchModulePromise = import(chrome.runtime.getURL("assets/content-search.js"))
      .then((module) => module as SearchModule)
      .catch((error) => {
        // 加载失败时重置缓存，允许下一次按键重试。
        searchModulePromise = undefined;
        throw error;
      });
  }
  return searchModulePromise;
}

// 骨架面板样式与 DESIGN.md 的模态容器保持一致：
// 24px 圆角、三层阴影、浅色 #FDFCF8 / 深色 #0C0E14，跟随系统主题。
const SKELETON_CSS = `
  .qm-skel-panel {
    width: min(768px, 100%);
    border-radius: 24px;
    background: #FDFCF8;
    box-shadow: 0 24px 56px -20px rgba(15,23,42,0.22), 0 8px 24px -12px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04);
    overflow: hidden;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .qm-skel-header {
    height: 56px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    border-bottom: 1px solid #E9E8E2;
  }
  .qm-skel-icon { width: 18px; height: 18px; border-radius: 6px; flex: none; }
  .qm-skel-input { width: 40%; height: 14px; }
  .qm-skel-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px;
    padding: 10px 12px;
  }
  .qm-skel-favicon { width: 36px; height: 36px; border-radius: 12px; flex: none; }
  .qm-skel-text { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .qm-skel-line { border-radius: 5px; background: #E9E8E2; animation: qm-skel-pulse 1.2s ease-in-out infinite; }
  .qm-skel-line-1 { width: 55%; height: 12px; }
  .qm-skel-line-2 { width: 35%; height: 10px; }
  .qm-skel-box { background: #E9E8E2; animation: qm-skel-pulse 1.2s ease-in-out infinite; }
  @keyframes qm-skel-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
  @media (prefers-color-scheme: dark) {
    .qm-skel-panel { background: #0C0E14; }
    .qm-skel-header { border-color: #242631; }
    .qm-skel-line, .qm-skel-box { background: #242631; }
  }
  @media (prefers-reduced-motion: reduce) {
    .qm-skel-line, .qm-skel-box { animation: none; }
  }
`;

function showSkeleton(): void {
  const host = document.createElement("div");
  host.id = SKELETON_HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  host.style.display = "flex";
  host.style.alignItems = "flex-start";
  host.style.justifyContent = "center";
  host.style.padding = "8vh 16px 16px";
  host.style.background = "rgba(0, 0, 0, 0.15)";
  host.style.backdropFilter = "blur(6px)";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = SKELETON_CSS;

  const panel = document.createElement("div");
  panel.className = "qm-skel-panel";

  const header = document.createElement("div");
  header.className = "qm-skel-header";
  const iconBox = document.createElement("div");
  iconBox.className = "qm-skel-box qm-skel-icon";
  const inputLine = document.createElement("div");
  inputLine.className = "qm-skel-line qm-skel-input";
  header.append(iconBox, inputLine);
  panel.append(header);

  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.className = "qm-skel-row";
    const favicon = document.createElement("div");
    favicon.className = "qm-skel-box qm-skel-favicon";
    const text = document.createElement("div");
    text.className = "qm-skel-text";
    const line1 = document.createElement("div");
    line1.className = "qm-skel-line qm-skel-line-1";
    const line2 = document.createElement("div");
    line2.className = "qm-skel-line qm-skel-line-2";
    text.append(line1, line2);
    row.append(favicon, text);
    panel.append(row);
  }

  shadow.append(style, panel);
  document.documentElement.appendChild(host);
  host.addEventListener("click", hideSkeleton);
  document.addEventListener("keydown", onSkeletonKeyDown, true);
}

function hideSkeleton(): void {
  const host = document.getElementById(SKELETON_HOST_ID);
  if (host) {
    host.removeEventListener("click", hideSkeleton);
  }
  document.removeEventListener("keydown", onSkeletonKeyDown, true);
  host?.remove();
}

function onSkeletonKeyDown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    hideSkeleton();
  }
}
