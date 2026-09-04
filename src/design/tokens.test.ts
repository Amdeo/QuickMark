import { palette, hexToRgbTriplet, withAlpha, type Palette } from "./tokens";
import { readFileSync } from "node:fs";

// vitest 默认会把 CSS import stub 为空串（含 ?raw），因此直接读源文件。
// 测试通过 `npm test` 在项目根运行，相对路径固定为 src/styles.css。
const stylesCss = readFileSync("src/styles.css", "utf8");

// styles.css 的 Tailwind 三元组变量 → 共享调色板键的映射。
// 这是"单一来源"的守卫：任一侧改色而另一侧未同步，测试即失败。
const STYLESHEET_MAP: Array<[string, keyof Palette]> = [
  ["--color-surface", "canvas"],
  ["--color-surface-container-lowest", "surface1"],
  ["--color-surface-container-low", "surface2"],
  ["--color-surface-container", "surface3"],
  ["--color-surface-container-high", "surface4"],
  ["--color-surface-container-highest", "surface5"],
  ["--color-on-surface", "ink"],
  ["--color-on-surface-variant", "inkMuted"],
  ["--color-outline", "inkSubtle"],
  ["--color-outline-variant", "hairline"],
  ["--color-primary", "primary"],
  ["--color-primary-container", "primaryContainer"],
  ["--color-primary-fixed", "primaryFixed"],
  ["--color-primary-fixed-dim", "primaryFixedDim"],
  ["--color-on-primary", "onPrimary"],
  ["--color-secondary", "secondary"],
  ["--color-secondary-container", "secondaryContainer"],
  ["--color-tertiary", "tertiary"],
  ["--color-tertiary-fixed", "tertiaryFixed"],
  ["--color-error", "error"],
  ["--color-error-container", "errorContainer"],
];

/** 提取亮色（:root）与暗色（@media prefers-color-scheme: dark）两个变量块。 */
function splitThemeBlocks(css: string): { light: string; dark: string } {
  const darkIndex = css.indexOf("@media (prefers-color-scheme: dark)");
  const light = darkIndex === -1 ? css : css.slice(0, darkIndex);
  const dark = darkIndex === -1 ? "" : css.slice(darkIndex);
  return { light, dark };
}

/** 在 CSS 块中读取 --color-xxx: N N N; 的三元组。 */
function readTriplet(block: string, cssVar: string): string | undefined {
  const match = block.match(new RegExp(`${cssVar}:\\s*([\\d\\s]+);`));
  return match?.[1]?.trim();
}

describe("design tokens", () => {
  test("hexToRgbTriplet 把 hex 转成 Tailwind 三元组", () => {
    expect(hexToRgbTriplet("#0058BE")).toBe("0 88 190");
    expect(hexToRgbTriplet("#FFFFFF")).toBe("255 255 255");
    expect(hexToRgbTriplet("#FFDAD6")).toBe("255 218 214");
  });

  test("withAlpha 从 hex 渲染 rgba", () => {
    expect(withAlpha("#0058BE", 0.15)).toBe("rgba(0, 88, 190, 0.15)");
    expect(withAlpha("#D8E2FF", 0.4)).toBe("rgba(216, 226, 255, 0.4)");
    expect(withAlpha("#004494", 0.4)).toBe("rgba(0, 68, 148, 0.4)");
  });

  test("亮色与暗色调色板键集合一致（不允许单侧缺项）", () => {
    expect(Object.keys(palette.light).sort()).toEqual(Object.keys(palette.dark).sort());
  });

  test("styles.css 亮色令牌与共享调色板一致（无漂移）", () => {
    const { light } = splitThemeBlocks(stylesCss);
    for (const [cssVar, key] of STYLESHEET_MAP) {
      const triplet = readTriplet(light, cssVar);
      expect(triplet, `${cssVar} 应在 styles.css 亮色 :root 中定义`).toBeDefined();
      expect(triplet).toBe(hexToRgbTriplet(palette.light[key]));
    }
  });

  test("styles.css 暗色令牌与共享调色板一致（无漂移）", () => {
    const { dark } = splitThemeBlocks(stylesCss);
    for (const [cssVar, key] of STYLESHEET_MAP) {
      const triplet = readTriplet(dark, cssVar);
      expect(triplet, `${cssVar} 应在 styles.css 暗色块中定义`).toBeDefined();
      expect(triplet).toBe(hexToRgbTriplet(palette.dark[key]));
    }
  });
});