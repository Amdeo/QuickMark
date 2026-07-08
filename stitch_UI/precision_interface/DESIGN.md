---
name: Precision Interface
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#424753'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac3'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2671e1'
  on-primary-container: '#fefcff'
  inverse-primary: '#aec6ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#8d4b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b15f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  h1:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 16px
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
  code:
    fontFamily: system-ui-mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  container-padding: 12px
  element-gap: 8px
---

## Brand & Style

This design system is engineered for high-velocity workflows within a Chrome extension environment. The personality is disciplined, utilitarian, and sophisticated, drawing heavily from **Apple-inspired Minimalism** and **Corporate Modern** aesthetics. 

The target audience consists of power users who require a high-density information display without cognitive overload. The UI evokes a sense of "digital calm" through generous use of white space, crisp borders, and a restricted but vibrant color palette that directs attention to actionable data.

## Colors

The palette is optimized for clarity and professional rigor. 
- **Primary Canvas**: A subtle off-white background (`#F9FAFB`) provides a soft foundation that allows pure white (`#FFFFFF`) surface cards to "pop" with minimal shadow.
- **Accents**: The Vibrant Blue is used exclusively for primary actions and focus states. Emerald Green is reserved for success indicators and positive data trends.
- **Typography**: A Deep Navy/Black ensures maximum legibility for primary content, while Medium Gray handles metadata and secondary labeling to maintain visual hierarchy.

## Typography

This design system utilizes **Inter** for its exceptional legibility in small-scale browser extensions. 
- **Scale**: The type scale is compact to support high-density layouts. 
- **Hierarchy**: Use `h1` for panel headers and `h2` for section titles. 
- **Labels**: Use `label-caps` (uppercase) for table headers and category tags to differentiate them from interactive body text.
- **Rendering**: Font-smoothing should be set to `antialiased` to maintain the crisp, Apple-like appearance on high-DPI displays.

## Layout & Spacing

The layout follows a **Fluid Grid** model within the constraints of the extension's popup or side-panel width. 
- **Density**: A strict 4px baseline grid ensures alignment. Use `12px` for global container padding to maximize screen real estate while preventing content from touching the browser edges.
- **Rhythm**: Component spacing should favor `8px` (2 units) for related items and `16px` (4 units) for distinct sections.
- **Scrolling**: For long lists, use a "fading edge" or a clear 1px border at the top of the scroll container to indicate depth.

## Elevation & Depth

Visual hierarchy is established through **Ambient Shadows** and **Tonal Layering**:
- **Level 0 (Background)**: `#F9FAFB` - The base layer of the extension.
- **Level 1 (Surface)**: `#FFFFFF` - Used for cards, inputs, and primary panels. These feature a `1px` border in `#E5E7EB`.
- **Shadows**: Use a single, highly diffused shadow for floating elements (like dropdowns or tooltips): `0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02)`.
- **Interactions**: Buttons should "lift" slightly on hover using a subtle increase in shadow opacity, rather than a change in size.

## Shapes

The design system uses a **Soft** shape language (`0.25rem` or `4px` base radius). This provides a professional, geometric feel that isn't as aggressive as sharp corners, nor as casual as pill shapes.
- **Standard Radius**: 4px for buttons, input fields, and checkboxes.
- **Large Radius**: 8px for cards and modal containers.
- **Full Radius**: Reserved exclusively for status indicators or notification dots.

## Components

- **Buttons**: Primary buttons use the Accent Color with white text. Secondary buttons use a white background with a `#E5E7EB` border and Primary Text. Use a `px-3 py-1.5` padding for a compact, high-productivity feel.
- **Input Fields**: Height should be fixed at `32px` for density. Use `#FFFFFF` fill with a `#E5E7EB` border. On focus, the border transitions to the Accent Color with a 1px outer glow.
- **Chips/Tags**: Use a light gray background (`#F3F4F6`) with `body-sm` text. For "Success" states, use a 10% opacity Emerald Green fill with 100% opacity green text.
- **Lists**: Item rows should be `36px` to `40px` high. Use a subtle `#F9FAFB` hover state. Separate items with a `1px` horizontal line only if the content is multi-line.
- **Cards**: Use white backgrounds with 8px corner radius and a 1px border. Avoid heavy shadows unless the card is draggable.
- **Navigation**: Use a vertical sidebar or top-tab system with 2px bottom/side borders in the Accent Color for active states.