---
name: Velocity Dark
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#8c909f'
  outline-variant: '#424753'
  surface-tint: '#aec6ff'
  primary: '#aec6ff'
  on-primary: '#002e6a'
  primary-container: '#4e8eff'
  on-primary-container: '#00275d'
  inverse-primary: '#005ac3'
  secondary: '#45dfa4'
  on-secondary: '#003825'
  secondary-container: '#00bd85'
  on-secondary-container: '#00452e'
  tertiary: '#ffb77d'
  on-tertiary: '#4d2600'
  tertiary-container: '#da7702'
  on-tertiary-container: '#432100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#68fcbf'
  secondary-fixed-dim: '#45dfa4'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#111317'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
typography:
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  kbd-label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 12px
  container-padding: 16px
---

## Brand & Style

This design system is engineered for power users who view their browser as a command center. It prioritizes speed, precision, and cognitive ease, evoking a sense of "quiet power." The brand personality is professional and utilitarian, yet elevated through futuristic accents that suggest a high-performance tool.

The aesthetic blends **Minimalism** with **Glassmorphism**. It relies on a restrained dark palette where depth is created through material properties rather than excessive color. The UI is designed to feel like an integrated HUD (Heads-Up Display) within the browser—lightning-fast, unobtrusive, and highly organized. Every interaction is optimized for keyboard-first navigation, ensuring the interface never slows down the user's intent.

## Colors

The palette for this design system is anchored in deep, "ink-trap" blacks and cool grays to minimize eye strain during extended use. 

- **Primary & Success:** The Accent Blue (#4C8DFF) is used sparingly for focus states and primary actions, while Success Green (#34D399) is reserved for confirmations and status indicators.
- **Surface Hierarchy:** The background uses a pure dark base, while surfaces and cards are slightly lifted using a subtle gray-tinted black to create a logical layering of information.
- **Typography Contrast:** Text colors are strictly tiered. Primary text uses a high-contrast off-white to ensure maximum legibility against the dark backdrop, while secondary text is muted to lower the visual noise of metadata.

## Typography

This design system utilizes **Inter** exclusively to maintain a clean, systematic, and utilitarian feel. The typographic scale is optimized for high information density, allowing users to scan large lists of data rapidly.

- **Weight & Emphasis:** Bold weights are used only for headers and UI labels (like keyboard shortcuts) to maintain a professional, editorial look.
- **Density:** Line heights are kept tight to maximize the number of visible items on screen, crucial for a bookmark management extension.
- **Labels:** Uppercase styles with increased letter spacing are used for tertiary metadata to distinguish it from primary content without increasing font size.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** approach specifically tailored for a Chrome extension's dimensions (typically 400px to 800px width). 

- **The Command Bar:** The central layout element is a top-pinned search/input field that dictates the alignment of the list content below.
- **Spacing Rhythm:** A 4px base unit is used. Lists use 8px of vertical padding between items to balance density with clickability.
- **Alignment:** All elements are strictly left-aligned to facilitate fast scanning. Right-hand space is reserved for keyboard shortcut hints (KBD tags) and status icons.

## Elevation & Depth

Hierarchy is conveyed through **Tonal Layers** and **Glassmorphism** rather than traditional heavy shadows.

- **Backdrop Blur:** Modals and pop-overs use a 12px to 20px backdrop blur with a 70% opacity fill of the Surface color.
- **Micro-Shadows:** Active elements (like a selected bookmark) utilize a subtle outer glow using the primary accent color at 15% opacity, combined with a 2px spread shadow to make the element appear "hovering."
- **Borders:** Thin, 1px borders (#1F2430) are used to define boundaries between the sidebar, search bar, and main list, creating a structured, blueprint-like appearance.

## Shapes

The shape language is defined by **Rounded** corners that soften the technical nature of the dark interface.

- **Base Radius:** 0.5rem (8px) is the standard for cards, buttons, and input fields.
- **Large Elements:** Larger containers or modal overlays use 1rem (16px) to create a distinct containerized feel.
- **Interactive Elements:** Active selection states in lists use a slightly smaller radius (6px) to fit neatly within the larger container's padding, creating a nested, concentric visual harmony.

## Components

### Command Bar (Search Input)
The primary interaction point. It features no background border in its default state, but gains a 1px solid Primary Blue border and a subtle inner glow when focused. Placeholder text uses the Muted Text color.

### List Items
The core of the experience. Hover and active states are critical:
- **Selected State:** Background shifts to a subtle gradient or a 10% opacity Primary Blue tint, with a 2px "active indicator" line on the far left.
- **Metadata:** URL and tags are displayed in `body-sm` using Muted Text.

### KBD (Keyboard Tags)
Small, semi-transparent badges that display shortcut keys (e.g., `⌘K`). They feature a #1F2430 background, a 1px border, and 4px rounded corners. These should be visually distinct but lower in contrast than the primary text.

### Buttons
Buttons are primarily "Ghost" or "Outline" style to remain minimalist. The Primary Action button is a solid Primary Blue with white text, using a subtle 8px radius.

### Chips & Tags
Used for bookmark folders. These are low-profile, using a background that is only slightly lighter than the surface color to keep them from distracting from the bookmark titles.

### Active State Glow
When a user navigates via keyboard, the focused element should emit a 10px soft glow using the Primary Blue color at a very low alpha (0.1) to provide immediate visual feedback of focus location.