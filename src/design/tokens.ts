// 设计令牌单一来源：与 DESIGN.md `colors:` 段逐项对应，但**数值以
// src/styles.css 实际定义为事实源**（DESIGN.md 部分颜色只有单值，
// 暗色变体见 styles.css 的 @media / [data-theme] 块）。
// 搜索面板（styles.css 的 Tailwind RGB 三元组）与
// 标签切换器（src/content/tabs.ts 的 Shadow DOM）都从这里取色，
// 避免两套 UI 各自硬编码导致主题漂移。守卫测试 src/design/tokens.test.ts
// 会校验 styles.css ↔ palette 逐键一致，任一侧改色都必须同步另一侧。
//
// 修改颜色：改这里 + 同步 DESIGN.md + 更新 styles.css，再跑 npm test 验收。
//
// 用法：
//   palette.light.primary        → "#0058BE"
//   withAlpha(palette.dark.primary, 0.15) → "rgba(176, 198, 255, 0.15)"
//   hexToRgbTriplet(...)          → Tailwind 的 "0 88 190" 三元组

export type Theme = "light" | "dark";

export interface Palette {
  /** 页面画布底色。 */
  canvas: string;
  /** surface-1：模态容器/最高层级表面。 */
  surface1: string;
  /** surface-2：底栏、行 hover、footer。 */
  surface2: string;
  /** surface-3：输入框、Kbd、favicon 容器。 */
  surface3: string;
  /** surface-4：数字徽章 idle 背景。 */
  surface4: string;
  /** surface-5：surface-variant，浮起面板。 */
  surface5: string;
  /** hairline：默认边框。 */
  hairline: string;
  /** hairline-strong：焦点态强边框。 */
  hairlineStrong: string;
  /** ink：主文字。 */
  ink: string;
  /** ink-muted：URL、次要元信息。 */
  inkMuted: string;
  /** ink-subtle：占位、禁用、提示。 */
  inkSubtle: string;
  /** primary：选中态/CTA 强调蓝。 */
  primary: string;
  /** primary-container：primary hover 态。 */
  primaryContainer: string;
  /** primary-fixed：选中行背景（低透明度叠加用）。 */
  primaryFixed: string;
  /** primary-fixed-dim。 */
  primaryFixedDim: string;
  /** on-primary：primary 上的文字。 */
  onPrimary: string;
  /** secondary：成功语义绿。 */
  secondary: string;
  /** secondary-container。 */
  secondaryContainer: string;
  /** tertiary：搜索高亮/历史徽章橙。 */
  tertiary: string;
  /** tertiary-fixed：高亮与徽章背景。 */
  tertiaryFixed: string;
  /** error：错误语义红。 */
  error: string;
  /** error-container：错误条背景。 */
  errorContainer: string;
  /** 模态遮罩。 */
  modalBackdrop: string;
  /** 阴影基色。 */
  shadowColor: string;
}

export const palette: Record<Theme, Palette> = {
  light: {
    canvas: "#F7F6F1",
    surface1: "#FDFCF8",
    surface2: "#F0EFEA",
    surface3: "#E9E8E2",
    surface4: "#E2E1DB",
    surface5: "#DDDCD6",
    hairline: "#C2C6D6",
    hairlineStrong: "#727785",
    ink: "#141B2B",
    inkMuted: "#424753",
    inkSubtle: "#727785",
    primary: "#0058BE",
    primaryContainer: "#2671E1",
    primaryFixed: "#D8E2FF",
    primaryFixedDim: "#AEC6FF",
    onPrimary: "#FFFFFF",
    secondary: "#006C49",
    secondaryContainer: "#6CF8BB",
    tertiary: "#8D4B00",
    tertiaryFixed: "#FFDCC3",
    error: "#BA1A1A",
    errorContainer: "#FFDAD6",
    modalBackdrop: "rgba(0, 0, 0, 0.15)",
    shadowColor: "rgba(15, 23, 42, 0.22)",
  },
  dark: {
    canvas: "#11131A",
    surface1: "#0C0E14",
    surface2: "#11131A",
    surface3: "#1A1C24",
    surface4: "#242631",
    surface5: "#2F313D",
    hairline: "#434656",
    hairlineStrong: "#8E909F",
    ink: "#E1E2EC",
    inkMuted: "#C3C5D5",
    inkSubtle: "#8E909F",
    primary: "#B0C6FF",
    primaryContainer: "#004494",
    primaryFixed: "#004494",
    primaryFixedDim: "#004494",
    onPrimary: "#002D6F",
    secondary: "#6CF8BB",
    secondaryContainer: "#005233",
    tertiary: "#FFB77D",
    tertiaryFixed: "#6E3900",
    error: "#FFB4AB",
    errorContainer: "#93000A",
    modalBackdrop: "rgba(0, 0, 0, 0.15)",
    shadowColor: "rgba(15, 23, 42, 0.22)",
  },
};

/** "#0058BE" → "0 88 190"（Tailwind 的 `rgb(var(--x) / a)` 三元组格式）。 */
export function hexToRgbTriplet(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** "#0058BE" + 0.15 → "rgba(0, 88, 190, 0.15)"。 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
