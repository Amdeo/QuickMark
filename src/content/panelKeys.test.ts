// @vitest-environment jsdom
// 回归测试：面板宿主要拦住按键，别让页面级快捷键（如 GitHub 的 s / /）收到并 preventDefault。
import { expect, test, vi } from "vitest";
import { isolatePanelKeys } from "./panelKeys";

function mountPanel() {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const input = document.createElement("input");
  shadow.append(input);
  document.body.append(host);
  return { host, shadow, input };
}

function press(target: Element, key: string): KeyboardEvent {
  // 真实键盘事件是 composed 的，缺少它 jsdom 不会让事件走到宿主之外。
  const event = new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

test("keys typed in the panel do not reach page-level listeners", () => {
  const { host, shadow, input } = mountPanel();
  isolatePanelKeys(host);

  const pageHandler = vi.fn();
  const panelHandler = vi.fn();
  document.addEventListener("keydown", pageHandler);
  shadow.addEventListener("keydown", panelHandler);
  try {
    press(input, "s");
    expect(panelHandler).toHaveBeenCalledTimes(1);
    expect(pageHandler).not.toHaveBeenCalled();
  } finally {
    document.removeEventListener("keydown", pageHandler);
    host.remove();
  }
});

test("page keystrokes outside the panel are untouched", () => {
  const { host } = mountPanel();
  isolatePanelKeys(host);

  const pageHandler = vi.fn();
  document.addEventListener("keydown", pageHandler);
  try {
    press(document.body, "s");
    expect(pageHandler).toHaveBeenCalledTimes(1);
  } finally {
    document.removeEventListener("keydown", pageHandler);
    host.remove();
  }
});

test("panels without isolation leak keys to the page", () => {
  const { host, input } = mountPanel();

  const pageHandler = vi.fn();
  document.addEventListener("keydown", pageHandler);
  try {
    press(input, "s");
    expect(pageHandler).toHaveBeenCalledTimes(1);
  } finally {
    document.removeEventListener("keydown", pageHandler);
    host.remove();
  }
});
