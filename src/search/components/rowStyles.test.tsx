// @vitest-environment jsdom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BookmarkItem } from "../../domain/types";
import { BookmarkRow } from "./BookmarkRow";
import { PinnedSites } from "./PinnedSites";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function item(id: string): BookmarkItem {
  return {
    id,
    title: `Page ${id}`,
    url: `https://example.com/${id}`,
    domain: "example.com",
    visitCount: 1,
    source: "bookmark",
  };
}

async function render(node: ReactElement) {
  await act(async () => root.render(node));
}

function resultRow(isSelected: boolean) {
  return (
    <BookmarkRow
      item={item(isSelected ? "selected" : "idle")}
      folderPath={[]}
      query=""
      isSelected={isSelected}
      isCopied={false}
      copyFailed={false}
      isPinned={false}
      pinDisabled={false}
      onMouseEnter={() => {}}
      onOpen={() => {}}
      onCopy={() => {}}
      onTogglePin={() => {}}
    />
  );
}

/** 取 ring 颜色类，跳过 ring-1 / ring-inset 这类宽度与位置类。 */
const RING_META = new Set(["ring-1", "ring-2", "ring-4", "ring-8", "ring-inset"]);
function ringColor(element: HTMLElement): string {
  return element.className.split(/\s+/).find((token) => token.startsWith("ring-") && !RING_META.has(token))!;
}

describe("搜索面板视觉边界", () => {
  test("固定网站图标放大到 24px，但 28px 按钮容器不随之撑高", async () => {
    await render(
      <PinnedSites
        items={[item("pinned")]}
        onOpen={() => {}}
        onUnpin={() => {}}
        onReorder={() => {}}
      />,
    );
    const button = container.querySelector<HTMLButtonElement>('button[aria-label^="打开固定网站"]')!;
    expect(button.className).toContain("h-7");
    expect(button.className).toContain("w-7");
    const icon = button.querySelector<HTMLElement>("img, svg")!;
    const iconSize = icon.tagName === "IMG" ? icon.style.width : icon.getAttribute("width");
    expect(parseFloat(iconSize!)).toBe(24);
    // 图标仍小于 h-7/w-7 的 28px 按钮：不会撑高固定网站行（40px）与 FilterBar（53px）。
    expect(parseFloat(iconSize!)).toBeLessThanOrEqual(28);
  });

  test("每条结果行都有 1px 内描边，选中态用 primary 描边区分", async () => {
    await render(
      <>
        {resultRow(false)}
        {resultRow(true)}
      </>,
    );
    const [idle, selected] = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));

    for (const element of [idle, selected]) {
      expect(element.className).toContain("ring-1");
      expect(element.className).toContain("ring-inset");
    }

    // 未选中态用的是 hairline 令牌；不透明度不低于 50%，保证边界持续可见而不只是几乎看不见的浅描边。
    expect(ringColor(idle)).toContain("outline-variant");
    expect(Number(ringColor(idle).match(/\/(\d+)$/)?.[1] ?? 100)).toBeGreaterThanOrEqual(50);
    expect(ringColor(selected)).toContain("primary");
    expect(selected.className).toContain("bg-primary-fixed/40");
  });
});
