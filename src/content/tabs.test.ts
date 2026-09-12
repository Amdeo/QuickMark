// @vitest-environment jsdom
// 回归测试：键盘编辑分支（Backspace/←→ 放行输入框）、Esc 两段式、
// MRU 排序、当前 tab 角标与 aria-activedescendant。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// jsdom 中 closed shadowRoot 不可从外部访问，测试改为 open。
const nativeAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (options: ShadowRootInit): ShadowRoot {
  return nativeAttachShadow.call(this, { ...options, mode: "open" });
};

const TABS = [
  { id: 1, index: 0, windowId: 10, title: "GitHub", url: "https://github.com/example", pinned: true, lastAccessed: 100 },
  { id: 2, index: 1, windowId: 10, title: "Stack Overflow", url: "https://stackoverflow.com", pinned: false, lastAccessed: 200 },
  { id: 3, index: 2, windowId: 10, title: "Vite", url: "https://vitejs.dev", pinned: false, lastAccessed: 300 },
];

const HOST_ID = "quickmark-tabs-root";

let sentMessages: string[];
let toggleTabsOverlay: () => Promise<void>;

beforeEach(async () => {
  // jsdom 未实现 scrollIntoView，导航逻辑依赖它。
  Element.prototype.scrollIntoView = () => {};
  sentMessages = [];
  (globalThis as { chrome: unknown }).chrome = {
    runtime: {
      id: "test-ext",
      getURL: (path: string) => path,
      sendMessage: (message: { type: string }, callback: (response: unknown) => void) => {
        sentMessages.push(message.type);
        if (message.type === "QUICKMARK_LIST_TABS") {
          callback({ tabs: TABS, activeId: 2 });
        } else {
          callback({ ok: true });
        }
      },
    },
  };
  vi.resetModules();
  ({ toggleTabsOverlay } = await import("./tabs"));
  await toggleTabsOverlay();
});

afterEach(async () => {
  if (document.getElementById(HOST_ID)) {
    await toggleTabsOverlay();
  }
});

function shadow(): ShadowRoot {
  const host = document.getElementById(HOST_ID);
  if (!host?.shadowRoot) throw new Error("overlay not mounted");
  return host.shadowRoot;
}

function input(): HTMLInputElement {
  const element = shadow().querySelector<HTMLInputElement>("input");
  if (!element) throw new Error("input not found");
  return element;
}

function list(): HTMLDivElement {
  const element = shadow().querySelector<HTMLDivElement>(".qt-list");
  if (!element) throw new Error("list not found");
  return element;
}

function titles(): string[] {
  return [...list().querySelectorAll(".qt-item .qt-tname")].map((el) => el.textContent ?? "");
}

function press(key: string, target: Element): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("tabs overlay", () => {
  test("renders tabs with current-tab dot on activeId and aria-activedescendant", () => {
    expect(titles()).toEqual(["GitHub", "Stack Overflow", "Vite"]);
    expect(shadow().querySelector(".qt-dot")?.closest(".qt-item")?.querySelector(".qt-tname")?.textContent).toBe("Stack Overflow");
    expect(input().getAttribute("aria-activedescendant")).toBe("qt-option-0");
    expect(shadow().querySelector(".qt-wins")?.textContent).toBe("1 个窗口");
  });

  test("backspace with text in the input edits instead of closing a tab", () => {
    input().value = "git";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    press("Backspace", input());
    expect(sentMessages).not.toContain("QUICKMARK_CLOSE_TAB");
  });

  test("arrow keys with text in the input move the caret, not the selection", () => {
    input().value = "git";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    press("ArrowLeft", input());
    press("ArrowRight", input());
    expect(input().getAttribute("aria-activedescendant")).toBe("qt-option-0");
  });

  test("backspace with an empty input closes the selected tab", async () => {
    press("Backspace", input());
    expect(sentMessages).toContain("QUICKMARK_CLOSE_TAB");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(titles()).toEqual(["Stack Overflow", "Vite"]);
  });

  test("escape clears the query first, then closes the overlay", () => {
    input().value = "git";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    press("Escape", input());
    expect(input().value).toBe("");
    expect(document.getElementById(HOST_ID)).toBeTruthy();
    press("Escape", input());
    expect(document.getElementById(HOST_ID)).toBeNull();
  });

  test("recent filter sorts by lastAccessed descending", () => {
    const button = [...shadow().querySelectorAll<HTMLButtonElement>(".qt-filter")].find(
      (b) => b.dataset.filter === "recent",
    );
    button?.click();
    expect(titles()).toEqual(["Vite", "Stack Overflow", "GitHub"]);
    expect(button?.getAttribute("aria-pressed")).toBe("true");
  });

  test("query filters the list and resets selection", () => {
    input().value = "stack";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    expect(titles()).toEqual(["Stack Overflow"]);
    expect(input().getAttribute("aria-activedescendant")).toBe("qt-option-0");
  });

  test("page-level shortcut handlers never see keystrokes typed in the overlay", () => {
    const pageHandler = vi.fn();
    document.addEventListener("keydown", pageHandler);
    try {
      // 真实键盘事件是 composed 的，缺少它 jsdom 不会让事件走到宿主之外。
      const typed = new KeyboardEvent("keydown", { key: "s", bubbles: true, composed: true, cancelable: true });
      input().dispatchEvent(typed);
      expect(pageHandler).not.toHaveBeenCalled();
      // 面板内部照旧处理按键：Esc 仍然生效。
      press("Escape", input());
      expect(document.getElementById(HOST_ID)).toBeNull();
    } finally {
      document.removeEventListener("keydown", pageHandler);
    }
  });
});

test("a previous overlay's pending tab list cannot replace a reopened overlay", async () => {
  await toggleTabsOverlay();
  const pending: Array<(response: unknown) => void> = [];
  const originalSend = chrome.runtime.sendMessage;
  const pendingSend = vi.fn((_message, callback) => { pending.push(callback); });
  // The overlay uses Chrome's callback overload, not its Promise overloads.
  chrome.runtime.sendMessage = pendingSend as unknown as typeof chrome.runtime.sendMessage;
  try {
    await toggleTabsOverlay();
    await toggleTabsOverlay();
    await toggleTabsOverlay();
    pending[1]({ tabs: [{ ...TABS[0], title: "Fresh tab" }], activeId: 1 });
    await Promise.resolve();
    expect(titles()).toEqual(["Fresh tab"]);
    pending[0]({ tabs: TABS, activeId: 2 });
    await Promise.resolve();
    expect(titles()).toEqual(["Fresh tab"]);
  } finally {
    chrome.runtime.sendMessage = originalSend;
  }
});

test("Enter on a focused close button never activates another tab", () => {
  const closeButton = shadow().querySelector<HTMLButtonElement>(".qt-close")!;
  closeButton.focus();
  press("Enter", closeButton);
  expect(sentMessages).not.toContain("QUICKMARK_ACTIVATE_TAB");
  expect(document.getElementById(HOST_ID)).not.toBeNull();
});
