---
version: alpha
name: QuickMark
description: "A keyboard-first Chrome Extension command palette for searching local bookmarks and browser history. Built around Material Design 3 tokens softened toward the Arc / Notion aesthetic — bigger rounded corners (2px–16px), translucent borders, floating row cards, and a multi-layer soft shadow on the modal overlay. Light mode is the default palette with a warm-neutral tint (#F7F6F1 canvas); dark mode inverts into a near-black surface (#11131A). The only chromatic accents are the primary blue (royal in light, lavender in dark) for selection and CTAs, a secondary green for success states, and a tertiary orange for search highlights and the 'history' source badge. Typography is Inter at tight tracking with a system mono for keyboard shortcut chips. The entire experience is optimized for keyboard navigation: ArrowUp/Down, Enter, Ctrl/Cmd+Enter, 1–9 direct jump, Esc clear/close, and Ctrl/Cmd+C copy link."

colors:
  # Primary (blue)
  primary-light: "#0058BE"
  primary-dark: "#B0C6FF"
  primary-container-light: "#2671E1"
  primary-container-dark: "#004494"
  primary-fixed-light: "#D8E2FF"
  primary-fixed-dark: "#004494"
  on-primary-light: "#FFFFFF"
  on-primary-dark: "#002D6F"

  # Surfaces (light)
  canvas-light: "#F7F6F1"
  surface-1-light: "#FDFCF8"
  surface-2-light: "#F0EFEA"
  surface-3-light: "#E9E8E2"
  surface-4-light: "#E2E1DB"
  surface-5-light: "#DDDCD6"
  hairline-light: "#C2C6D6"
  hairline-strong-light: "#727785"

  # Surfaces (dark)
  canvas-dark: "#11131A"
  surface-1-dark: "#0C0E14"
  surface-2-dark: "#11131A"
  surface-3-dark: "#1A1C24"
  surface-4-dark: "#242631"
  surface-5-dark: "#2F313D"
  hairline-dark: "#434656"
  hairline-strong-dark: "#8E909F"

  # Text (light)
  ink-light: "#141B2B"
  ink-muted-light: "#424753"
  ink-subtle-light: "#727785"

  # Text (dark)
  ink-dark: "#E1E2EC"
  ink-muted-dark: "#C3C5D5"
  ink-subtle-dark: "#8E909F"

  # Semantic
  secondary: "#006C49"
  secondary-container-light: "#6CF8BB"
  secondary-container-dark: "#005233"
  tertiary: "#8D4B00"
  tertiary-fixed-light: "#FFDCC3"
  tertiary-fixed-dark: "#6E3900"
  error: "#BA1A1A"
  error-container-light: "#FFDAD6"
  error-container-dark: "#93000A"

  # Overlay
  modal-backdrop: "rgba(0, 0, 0, 0.15)"
  shadow-color: "rgba(15, 23, 42, 0.22)"

typography:
  display:
    fontFamily: "Inter"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Inter"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: "0em"
  label-caps:
    fontFamily: "Inter"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 16px
    letterSpacing: "0.05em"
  caption:
    fontFamily: "Inter"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: "0em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: "0em"

rounded:
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  full: 9999px

spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px

components:
  search-header:
    height: 56px
    backgroundColor: "{colors.surface-1-light} / dark:{colors.surface-1-dark}"
    borderBottom: "1px {colors.hairline-light} / dark:1px {colors.hairline-dark}"
    padding: "0 16px"
  search-input:
    fontFamily: "{typography.body.fontFamily}"
    fontSize: 15px
    lineHeight: 24px
    textColor: "{colors.ink-light} / dark:{colors.ink-dark}"
    placeholderColor: "{colors.ink-subtle-light} / dark:{colors.ink-subtle-dark}"
  search-clear-button:
    size: 28px
    rounded: "{rounded.full}"
    iconSize: 14px
    hoverBackground: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
  shortcut-chip:
    border: "1px {colors.hairline-light} / dark:1px {colors.hairline-dark}"
    backgroundColor: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
    fontFamily: "{typography.mono.fontFamily}"
    fontSize: 10.5px
    textColor: "{colors.ink-subtle-light} / dark:{colors.ink-subtle-dark}"
    padding: "0 6px"
  result-row:
    margin: "0 8px"
    padding: "10px 12px"
    rounded: "{rounded.lg}"
    gap: 12px
    hoverBackground: "{colors.surface-2-light} / dark:{colors.surface-2-dark}"
    selectedBackground: "{colors.primary-fixed-light} / dark:{colors.primary-fixed-dark}"
    selectedRing: "1px inset {colors.primary-light} / dark:1px inset {colors.primary-dark}"
  favicon-container:
    size: 36px
    rounded: "{rounded.lg}"
    backgroundColor: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
    ring: "1px {colors.hairline-light} / dark:1px {colors.hairline-dark}"
  number-badge:
    size: 16px
    rounded: "{rounded.md}"
    fontSize: 9.5px
    fontWeight: 600
    selectedBackground: "{colors.primary-light} / dark:{colors.primary-dark}"
    selectedText: "{colors.on-primary-light} / dark:{colors.on-primary-dark}"
    idleBackground: "{colors.surface-4-light} / dark:{colors.surface-4-dark}"
    idleText: "{colors.ink-subtle-light} / dark:{colors.ink-subtle-dark}"
  folder-chip:
    fontSize: 10.5px
    textColor: "{colors.ink-subtle-light} / dark:{colors.ink-subtle-dark}"
    backgroundColor: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
    padding: "2px 6px"
    rounded: "{rounded.md}"
  history-badge:
    fontSize: 10px
    fontWeight: 500
    textColor: "{colors.tertiary} / dark:{colors.tertiary}"
    backgroundColor: "{colors.tertiary-fixed-light} / dark:{colors.tertiary-fixed-dark}"
    padding: "2px 6px"
    rounded: "{rounded.md}"
  action-chip:
    fontFamily: "{typography.mono.fontFamily}"
    fontSize: 10.5px
    selectedBackground: "{colors.primary-light} / dark:{colors.primary-dark}"
    selectedText: "{colors.on-primary-light} / dark:{colors.on-primary-dark}"
    idleBackground: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
    idleText: "{colors.ink-subtle-light} / dark:{colors.ink-subtle-dark}"
    padding: "4px 8px"
    rounded: "{rounded.md}"
  kbd:
    height: 18px
    minWidth: 18px
    fontSize: 10px
    fontWeight: 500
    textColor: "{colors.ink-subtle-light} / dark:{colors.ink-subtle-dark}"
    backgroundColor: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
    border: "1px {colors.hairline-light} / dark:1px {colors.hairline-dark}"
    padding: "0 4px"
    rounded: "{rounded.sm}"
  empty-state-icon:
    size: 48px
    rounded: "{rounded.2xl}"
    backgroundColor: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
    ring: "1px {colors.hairline-light} / dark:1px {colors.hairline-dark}"
  web-search-cta:
    backgroundColor: "{colors.primary-light} / dark:{colors.primary-dark}"
    textColor: "{colors.on-primary-light} / dark:{colors.on-primary-dark}"
    fontSize: 12.5px
    fontWeight: 500
    padding: "8px 14px"
    rounded: "{rounded.lg}"
    hoverBackground: "{colors.primary-container-light} / dark:{colors.primary-container-dark}"
  modal-container:
    maxWidth: 768px
    height: 600px
    rounded: "{rounded.2xl}"
    backgroundColor: "{colors.surface-1-light} / dark:{colors.surface-1-dark}"
    ring: "1px {colors.hairline-light} / dark:1px {colors.hairline-dark}"
    shadow: "0 24px 56px -20px rgba(15,23,42,0.22), 0 8px 24px -12px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04)"
  page-container:
    minHeight: 100vh
    backgroundColor: "{colors.canvas-light} / dark:{colors.canvas-dark}"
  footer:
    height: auto
    padding: "8px 12px"
    borderTop: "1px {colors.hairline-light} / dark:1px {colors.hairline-dark}"
    backgroundColor: "{colors.surface-2-light} / dark:{colors.surface-2-dark}"
    fontSize: 11px
    textColor: "{colors.ink-subtle-light} / dark:{colors.ink-subtle-dark}"
  error-bar:
    margin: "0 12px"
    padding: "12px 16px"
    rounded: "{rounded.xl}"
    border: "1px {colors.error-container-light} / dark:1px {colors.error-container-dark}"
    backgroundColor: "{colors.error-container-light} / dark:{colors.error-container-dark}"
    textColor: "{colors.error} / dark:#FF8A80"
  loading-row-skeleton:
    size: 36px
    rounded: "{rounded.lg}"
    pulseBackground: "{colors.surface-3-light} / dark:{colors.surface-3-dark}"
---

## Overview

QuickMark is a Chrome Extension command palette for searching local bookmarks and browser history. The UI runs in two modes — a **standalone popup page** (`mode="page"`) and a **modal overlay** injected via content script (`mode="modal"`). Both modes share the same component system but differ in container framing: the popup is a full-viewport page; the modal floats with a soft backdrop-blur scrim.

The design language softens Material Design 3 into an Arc / Notion-like aesthetic: bigger rounded corners, translucent hairline borders instead of heavy dividers, floating row cards with inset selection rings, and a multi-layer soft shadow on the modal. The color system preserves MD3 semantics (surface, on-surface, primary, secondary, tertiary, error) but the values are tuned for a developer productivity tool — warm-neutral-tinted light mode and a near-black dark mode.

**Key Characteristics:**
- **Keyboard-first interaction** — every action has a keyboard shortcut; mouse is secondary.
- **Floating row cards** — results are rendered as rounded cards (`rounded-xl`, `mx-2`) with no flat list separators; hover lifts via background tint.
- **Multi-layer modal shadow** — three shadow layers give depth without heaviness: ambient, penumbra, and umbra.
- **Context-aware footer** — shortcut hints change based on selection state and query presence.
- **Esc-to-clear pattern** — Raycast convention: first Escape clears the query, second Escape closes.
- **Minimal chrome** — no sidebar, no navbar, no tabs. Just a search box and results.
- **Light/dark via `data-theme`** — theme is set on `<main data-theme>` and switches the entire subtree.

## Colors

> Source: `src/styles.css` — CSS custom properties mapped to Tailwind theme tokens.

### Brand & Accent
- **Primary Blue** (`{colors.primary-light}` #0058BE / `{colors.primary-dark}` #B0C6FF): The signature accent — selected row background tint, primary CTA buttons, focus states.
- **Primary Container** (`{colors.primary-container-light}` #2671E1 / `{colors.primary-container-dark}` #004494): Hover/active states of primary buttons.
- **Primary Fixed** (`{colors.primary-fixed-light}` #D8E2FF / `{colors.primary-fixed-dark}` #004494): Selected row background (low-opacity tint).
- **Secondary Green** (`{colors.secondary}` #006C49): Semantic success. Used sparingly — not a marketing accent.
- **Tertiary Orange** (`{colors.tertiary}` #8D4B00): Search query highlight background and the "历史" source badge.
- **Error Red** (`{colors.error}` #BA1A1A): Error states and error bar text.

### Surface Ladder
The surface system follows MD3 semantics. In light mode, surfaces ascend from white toward a warm off-white; in dark mode, they descend from near-black toward charcoal.

**Light mode surfaces:**
- **Canvas** (`{colors.canvas-light}` #F7F6F1): Page background (popup standalone mode).
- **Surface 1** (`{colors.surface-1-light}` #FDFCF8): Modal container background, highest lifted surface.
- **Surface 2** (`{colors.surface-2-light}` #F0EFEA): Footer background, history item hover, loading skeleton.
- **Surface 3** (`{colors.surface-3-light}` #E9E8E2): Input background, row hover, Kbd background, favicon container.
- **Surface 4** (`{colors.surface-4-light}` #E2E1DB): Number badge idle background.
- **Surface 5** (`{colors.surface-5-light}` #DDDCD6): Surface variant, used for elevated panels.

**Dark mode surfaces:**
- **Canvas** (`{colors.canvas-dark}` #11131A): Page background.
- **Surface 1** (`{colors.surface-1-dark}` #0C0E14): Modal container.
- **Surface 2** (`{colors.surface-2-dark}` #11131A): Footer, history hover.
- **Surface 3** (`{colors.surface-3-dark}` #1A1C24): Input, row hover, Kbd, favicon.
- **Surface 4** (`{colors.surface-4-dark}` #242631): Number badge idle.
- **Surface 5** (`{colors.surface-5-dark}` #2F313D): Surface variant.

### Text
- **Ink** (`{colors.ink-light}` #141B2B / `{colors.ink-dark}` #E1E2EC): Headlines, result titles, primary body.
- **Ink Muted** (`{colors.ink-muted-light}` #424753 / `{colors.ink-muted-dark}` #C3C5D5): URLs, secondary meta.
- **Ink Subtle** (`{colors.ink-subtle-light}` #727785 / `{colors.ink-subtle-dark}` #8E909F): Placeholders, disabled states, folder paths, shortcut hints.

### Borders
- **Hairline** (`{colors.hairline-light}` #C2C6D6 / `{colors.hairline-dark}` #434656): Default borders — modal ring, row dividers (used sparingly), Kbd borders.
- **Hairline Strong** (`{colors.hairline-strong-light}` #727785 / `{colors.hairline-strong-dark}` #8E909F): Stronger borders for focus states.

### Semantic
- **Error Container** (`{colors.error-container-light}` #FFDAD6 / `{colors.error-container-dark}` #93000A): Error bar background.
- **Tertiary Fixed** (`{colors.tertiary-fixed-light}` #FFDCC3 / `{colors.tertiary-fixed-dark}` #6E3900): "历史" badge background.

## Typography

### Font Family

- **Inter** — Primary typeface for all UI text. Fallback: `ui-sans-serif, system-ui, sans-serif`.
- **System Mono** — `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`. Used exclusively for keyboard shortcut chips (`Kbd`) and action key labels (`↵ 打开`).

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display}` | 20px | 600 | 28px | -0.02em | Empty state title, status text |
| `{typography.headline}` | 16px | 600 | 24px | -0.01em | Section headers (rare) |
| `{typography.body}` | 14px | 400 | 20px | 0em | Default body, result titles, folder chips |
| `{typography.body-sm}` | 13px | 400 | 18px | 0em | History items, meta text |
| `{typography.label-caps}` | 11px | 700 | 16px | 0.05em | Section labels ("最近搜索", status count) |
| `{typography.caption}` | 12px | 400 | 16px | 0em | URLs, error messages, empty state body |
| `{typography.mono}` | 12px | 400 | 16px | 0em | Keyboard shortcuts, action chips |

### Principles

- **Tight tracking on headlines** — `-0.02em` at 20px gives a crisp, modern feel.
- **Zero tracking on body** — Inter reads cleanly at 13–14px without adjustment.
- **Mono is functional, never decorative** — it only appears in `Kbd` chips and action key labels.
- **Label-caps for taxonomy** — uppercase section labels with `0.05em` tracking mark structural separators.

## Layout

### Spacing System

- **Base unit**: 4px.
- **Tokens**: `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 16px · `{spacing.lg}` 24px.
- Result row gap: 12px (internal flex gap between favicon and text).
- Result row margin: `mx-2` (8px horizontal inset) — creates the floating card effect.
- Modal padding: `8vh 16px 16px` (top is viewport-relative for vertical centering).
- Footer padding: `8px 12px`.

### Container

- **Modal**: `max-w-3xl` (768px), fixed height `600px`, centered horizontally, `8vh` from top.
- **Popup page**: `min-h-screen`, `bg-canvas`, content centered with `max-w-3xl`.
- **Content script host**: `position: fixed; inset: 0; z-index: 2147483647`, with `backdrop-filter: blur(6px)` and `background: rgba(0,0,0,0.15)`.

### Whitespace Philosophy

The command palette is dense by design. Vertical space is precious — 600px modal height must show ~8–10 results. Whitespace lives at the edges (8px row margin, 16px horizontal padding) and between structural zones (search header, results list, footer). Within a row, tight 12px gaps keep the scan line compact.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow | Body text, footer text, empty state text |
| 1 (surface lift) | `{colors.surface-1}` background, `1px {colors.hairline}` ring | Modal container, error bar |
| 2 (hover lift) | `{colors.surface-2}` background | Row hover, history item hover, footer |
| 3 (focused lift) | `{colors.surface-3}` background | Input focus area, Kbd chips, favicon container |
| 4 (selected lift) | `{colors.primary-fixed}` background at 40% opacity, `1px inset {colors.primary}` ring | Selected result row |
| 5 (modal depth) | Three-layer shadow on modal container | Only the modal frame |

### Modal Shadow

The modal uses a carefully tuned three-layer shadow to feel lifted but not cartoonish:
```
0 24px 56px -20px rgba(15, 23, 42, 0.22),   /* ambient */
0 8px 24px -12px rgba(15, 23, 42, 0.10),    /* penumbra */
0 1px 2px rgba(15, 23, 42, 0.04)            /* umbra */
```
### Modal Entrance

The overlay opens with a subtle two-part entrance, tuned to feel instant rather than bouncy:

- **Backdrop**: fades in from transparent over 160ms (`ease-out`), applied via the Web Animations API in the content script.
- **Panel**: rises 10px and scales from 0.98 to 1 while fading in over 180ms (`cubic-bezier(0.2, 0.9, 0.3, 1)`), applied via the `.quickmark-modal-enter` CSS animation.

The three-layer shadow itself is **static** — it does not animate. Both entrance animations are skipped under `prefers-reduced-motion` (the global CSS rule collapses the panel animation to instant, and the content script checks the media query before animating the backdrop). Close is instant with no exit animation.

### Overlay Backdrop

The content-script modal host renders a translucent dark scrim (`rgba(0,0,0,0.15)`) with `backdrop-filter: blur(6px)`. This separates the palette from the underlying webpage without obscuring it.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 2px | Tiny chips, sharp edges |
| `{rounded.sm}` | 4px | Kbd chips, small buttons |
| `{rounded.md}` | 8px | Number badges, folder chips, action chips, favicon container |
| `{rounded.lg}` | 12px | Result rows, clear button, CTA buttons, error bar |
| `{rounded.xl}` | 16px | Empty state icon container |
| `{rounded.2xl}` | 24px | Modal container (outer frame) |
| `{rounded.full}` | 9999px | Clear button (circular) |

### Shape Philosophy

QuickMark avoids sharp corners entirely. Even the smallest interactive element (Kbd chip) has 4px rounding. The modal itself is `rounded-2xl` (24px), giving it a friendly, approachable silhouette that contrasts with the often-angular browser chrome around it. This is the Arc/Notion influence: soft edges feel less like "system UI" and more like a floating utility.

## Components

### Search Header

**`search-header`** — Sticky top bar containing the search icon, input, clear button, and shortcut chip.
- Height: 56px. Background `{colors.surface-1}`. Bottom border `1px {colors.hairline}`.
- Padding: `0 16px`. Flex row with `gap-3` (12px).
- **Search icon**: 18px, `{colors.ink-subtle}`.
- **Input**: `font-size: 15px`, `line-height: 24px`, no border, transparent background. Placeholder color `{colors.ink-subtle}` at 80% opacity.
- **Clear button**: 28px circle, appears only when query is non-empty. Hover background `{colors.surface-3}`.
- **Shortcut chip**: `{colors.surface-3}` background, `1px {colors.hairline}` border, `{typography.mono}` at 10.5px. Shows ⌘K (mac) or Ctrl+K (Windows).

### Result Row

**`result-row`** — The primary content unit. A floating card with favicon, title, URL, badges, and action buttons.
- Margin: `0 8px` (floating inset). Padding: `10px 12px`. Rounded `{rounded.lg}` (12px).
- **Idle**: transparent background.
- **Hover**: `bg-surface-2` (`{colors.surface-2}`).
- **Selected**: `bg-primary-fixed/40` + `ring-1 ring-inset ring-primary/15` (`{colors.primary-fixed}` at 40% opacity, `{colors.primary}` ring at 15% opacity).
- **Favicon container**: 36px square, `{rounded.md}`, `{colors.surface-3}` background, `1px {colors.hairline}` ring. Contains a 16–18px favicon image or a fallback globe icon.
- **Number badge**: 16px, `{rounded.md}`, appears top-left of favicon. Hidden unless hovered or selected. Selected: `{colors.primary}` bg, `{colors.on-primary}` text. Idle: `{colors.surface-4}` bg, `{colors.ink-subtle}` text.
- **Title**: `{typography.body}` at 14px, weight 600, truncated. Query matches highlighted with `{colors.tertiary-fixed}` background.
- **Folder chip**: Inline badge after title. `{colors.surface-3}` background, `{colors.ink-subtle}` text, 10.5px. Hidden below `sm` breakpoint.
- **History badge**: Inline "历史" badge. `{colors.tertiary-fixed}` background, `{colors.tertiary}` text, 10px.
- **URL line**: 12px, `{colors.ink-subtle}`, with a link icon prefix. Query matches highlighted.
- **Right action area**: Visit count (hidden, appears on group-hover), copy link button (24px, appears on group-hover), and "↵ 打开" action chip (appears on hover; solid primary background when selected).

### Keyboard Shortcut Chip (Kbd)

**`kbd`** — Small inline chip representing a physical key.
- Height: 18px, min-width: 18px. `{rounded.sm}` (4px).
- Border: `1px {colors.hairline}`. Background: `{colors.surface-3}` at 70% opacity.
- Font: `{typography.mono}` at 10px, weight 500, `{colors.ink-subtle}`.
- Padding: `0 4px`. Centered flex.

### Footer

**`footer`** — Sticky bottom bar showing context-aware keyboard shortcuts.
- Border-top: `1px {colors.hairline}`. Background: `{colors.surface-2}` at 60% opacity.
- Padding: `8px 12px`. Font: 11px, `{colors.ink-subtle}`.
- Left side: shortcut groups — ↑↓ 导航, ↵ 打开/搜索, ⌘↵ 新标签, 1–9 直达, ⌘C 复制链接 (only when a result is selected).
- Right side: theme toggle button (cycles light/dark/system) and Esc hint ("清空" or "关闭" depending on query state).
- Some shortcut groups hide below `sm` breakpoint to avoid overflow.

### Empty State

**`empty-state`** — Centered content shown when no results.
- **Icon container**: 48px, `{rounded.2xl}`, `{colors.surface-3}` at 60% opacity, `1px {colors.hairline}` ring. Contains a 20px icon (search or bookmarks).
- **Title**: `{typography.display}` at 14px, weight 600, `{colors.ink}`.
- **Body**: `{typography.caption}`, `{colors.ink-subtle}`.
- **No-query variant**: "开始输入以搜索" / "还没有书签".
- **No-results variant**: "未找到匹配项" + "用 Google 搜索" CTA button (`web-search-cta`).

### Web Search CTA

**`web-search-cta`** — Primary button inside the no-results empty state.
- Background: `{colors.primary}`. Text: `{colors.on-primary}`. Font: 12.5px, weight 500.
- Padding: `8px 14px`. Rounded `{rounded.lg}`.
- Hover: `{colors.primary-container}`.
- Contains a search icon, text, and a small ↵ Kbd chip inside the button.

### Loading Row

**`loading-row`** — Skeleton placeholder while results load.
- Same outer structure as result-row but with `animate-pulse`.
- Favicon: 36px square skeleton with `{colors.surface-3}` background.
- Title: 3.5px height, 2/5 width, `{colors.surface-3}`.
- URL: 3px height, 3/5 width, `{colors.surface-2}`.

### Error Bar

**`error-bar`** — Inline error message with retry button.
- Margin: `0 12px`. Padding: `12px 16px`. Rounded `{rounded.xl}`.
- Border: `1px {colors.error-container}` at 60% opacity. Background: `{colors.error-container}` at 30% opacity.
- Text: `{typography.caption}`, error-tinted color.
- Retry button: small bordered button with `{colors.error}` text.

## Do's and Don'ts

### Do

- Use `{rounded.2xl}` (24px) for the modal outer frame and `{rounded.lg}` (12px) for result rows.
- Keep result rows as floating cards with `mx-2` — never edge-to-edge flat list items.
- Show the number badge only on hover or selection. Static badges add noise.
- Use `group-hover` for right-action-area buttons (copy, visit count, ↵ 打开) — keep rows clean at rest.
- Respect `prefers-reduced-motion` — the global CSS already nullifies animations/transitions.
- Use the three-layer modal shadow exactly as specified — do not simplify to a single shadow.
- Make keyboard shortcuts discoverable in the footer — every primary action must have a visible shortcut hint.
- Support both `data-theme="dark"` and `prefers-color-scheme: dark`.
- Use `ring-1` borders for subtle elevation rather than heavy drop shadows on cards.
- Highlight query matches with `{colors.tertiary-fixed}` background — consistent across title, URL, and folder path.

### Don't

- Don't use edge-to-edge flat lists with hairline dividers between every row — the floating card pattern is the signature look.
- Don't show all action buttons persistently — right actions should be hover/selection-only.
- Don't use saturated accent colors for decorative purposes. Primary blue is for selection and CTAs only.
- Don't make the entrance animation longer than ~180ms or add bounce/overshoot — it should feel instant, not playful.
- Don't animate modal close — close is instant with no exit transition.
- Don't use true black (`#000000`) for dark mode canvas — the warm-tinted near-black (`#11131A`) is intentional.
- Don't introduce a second font family beyond Inter + system mono.
- Don't make the modal taller than 600px — it must fit within a 13-inch laptop viewport with padding.
- Don't show the folder chip on screens below `sm` — it truncates the title.

## Responsive Behavior

### Breakpoints

QuickMark is a fixed-width command palette, not a fluid layout. Responsive rules are minimal:

| Breakpoint | Key Changes |
|---|---|
| `sm` (640px) | Footer shortcut groups start appearing (⌘↵, 1–9, ⌘C). Folder chips visible on rows. |
| `< sm` | Footer shows only ↑↓ and ↵. Folder chips hidden. Action chips may hide. |

### Container Behavior

- **Modal**: Width is `min(768px, 100%)` — full width on very narrow viewports with 16px side padding, capped at 768px.
- **Popup page**: Content is `max-w-3xl` centered. Same inner layout as modal.

### Touch Targets

- Result rows are the primary touch target — the entire row is clickable, ~56px tall with padding.
- Copy button and clear button are 28px circles — acceptable on desktop, but row-click is the primary interaction on touch.

## Iteration Guide

1. **Reference components by token name** from the `components:` frontmatter section.
2. **Always decide light/dark pair** when introducing a new color — the system is strictly paired.
3. **Default to `{rounded.lg}` (12px)** for new cards or containers. Reserve `{rounded.2xl}` for top-level frames.
4. **Keep rows at `mx-2` + `rounded-xl`/`rounded-lg`** — this is the visual signature.
5. **Add new keyboard shortcuts to the footer** — visibility is part of the design.
6. **Run `npm test`** after any UI change — the test suite uses `renderToStaticMarkup` and will catch `window`/`document` access.
7. **Respect `prefers-reduced-motion`** — never add non-essential animations.

## Known Gaps

- **Form inputs beyond search** — QuickMark has only one text input (the search box). No forms, no textareas, no selects.
- **No marketing pages** — This is a tool UI, not a landing page. The DESIGN.md is optimized for dense utility surfaces.
- **Icon system** — Icons are mapped through `src/components/Icon.tsx` which wraps `lucide-react` with Material-style names. New icons must be added to the map.
- **No toast/notification system** — Copy confirmation, error feedback, and loading states are all inline within the palette.
- **Scrollbar styling** — Custom WebKit scrollbar (`8px`, transparent track, `outline-variant` thumb on hover) is defined in `src/styles.css` and is not theme-switchable via tokens.