---
name: TaskHub Precision Workspace
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system targets small, agile teams of up to three members who require maximum clarity with minimal operational noise. The design language is rooted in **modern minimalism combined with corporate precision**: crisp structural geometry, high legibility, deliberate whitespace, and zero visual clutter.

The interface evokes focus, calm command, and operational velocity. Interactions feel instantaneous and lightweight. By eliminating non-essential UI features (specifically file attachments, complex media wrappers, and multi-tier hierarchies), the layout prioritizes text, status visibility, links, and immediate collaboration.

Key visual attributes:
- Razor-sharp structural grid with hairline dividers.
- Tactile, muted surfaces using discrete elevation rather than heavy drop shadows.
- Micro-interactions focused on status shifts (pending, active, resolved).

## Colors

The color architecture is built upon a high-contrast neutral ladder offset by functional status accents.

- **Primary Canvas & Surfaces**: Crisp white (`#FFFFFF`) for elevated cards and modals, paired with cold off-white canvas (`#F8FAFC`).
- **Borders & Dividers**: Hairline borders strictly set to slate-200 (`#E2E8F0`).
- **Neutrals (Text & Structure)**: 
  - Slate-900 (`#0F172A`) for primary headers and dominant labels.
  - Slate-800 (`#1E293B`) for body text and interactive headings.
  - Slate-700 (`#334155`) for secondary metadata, subheadings, and icons.
  - Slate-400 (`#94A3B8`) for placeholder text and disabled states.
- **Primary Accent**: Indigo (`#4F46E5`) paired with a lighter interactive state (`#6366F1`) used for primary actions, focused input rings, and active navigation indicators.
- **Functional Semantics**:
  - **Emerald Green (`#10B981`)**: Dedicated to completed task states, verified checkmarks, and active shared URLs.
  - **Warm Amber (`#F59E0B`)**: Dedicated to upcoming milestones, imminent deadlines (≤ 24h), and priority flags.
  - **Rose (`#EF4444`)**: Reserved strictly for critical overdue warnings and destructive item removal.

## Typography

The design system uses **Inter** across all UI tiers to create visual consistency and data density. Strict tabular alignment and negative tracking are applied to headlines to ensure a clean, editorial SaaS profile.

- Headings use weight 600 or 700 with optical negative letter spacing (`-0.01em` to `-0.025em`) to prevent glyph scattering at larger sizes.
- Body copy relies on weight 400 with a strict 1.4–1.5x line height ratio to guarantee scanning ease in multi-line task descriptions and note bodies.
- Badges and micro-labels leverage uppercase or title-case text with weight 600 and a `+0.02em` tracking adjustment to maintain legibility at sub-12px sizes.

## Layout & Spacing

The layout is built on a responsive 12-column grid optimized for three-person workflow distribution:
- **Desktop (1280px+)**: Fixed-width or constrained max-width container (1440px max) featuring a 240px static utility sidebar, flanked by a 3-column project/task split (e.g., Member 1, Member 2, Member 3 or Backlog, In-Progress, Closed). Column gutter is `1.5rem` (`24px`).
- **Tablet (768px - 1024px)**: Collapsible sidebar, horizontal scroll or multi-row card stacks with `1rem` gutters.
- **Mobile (< 768px)**: Single column with segmented navigation controls to toggle between views. Outer margin compresses to `1rem` (`16px`).

Vertical rhythm uses a standard 4px/8px modular base scale. Interactive element gaps (e.g., task metadata icons, member presence markers) strictly adhere to `space-xs` (4px) and `space-sm` (8px). Structural card spacing uses `space-md` (16px) or `space-lg` (24px).

## Elevation & Depth

Visual hierarchy uses crisp hairline borders and minimal ambient shadows rather than heavy skeuomorphic drop shadows.

- **Base Canvas**: Flat `#F8FAFC`, no shadow, zero elevation.
- **Cards & List Rows**: Elevated on `#FFFFFF` using a 1px solid border (`#E2E8F0`) and `shadow-sm` (`0 1px 2px 0 rgba(15, 23, 42, 0.05)`). Hover states transition border-color to `#CBD5E1` and lift slightly via a subtle offset (`0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`).
- **Interactive Flyouts & Dropdowns**: Background `#FFFFFF`, border 1px `#E2E8F0`, elevation `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`.
- **Modals & Dialogs**: Centered modal cards sit above an ambient scrim (`#0F172A` at 40% opacity with `backdrop-blur-sm`). The modal surface uses a 1px border (`#E2E8F0`) with a focused drop shadow (`0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`).
- **Prohibited**: Heavy multi-colored glow effects, inner-shadow extrusions, and deep un-tinted black shadows.

## Shapes

The design system enforces a **Soft (1)** shape language:
- **Cards, Panels, and Modals**: `rounded-md` (6px) or `rounded-lg` (8px) for clean, geometric structure without appearing sharp or aggressive.
- **Inputs & Buttons**: `rounded-md` (6px) to match card geometry.
- **Status Pills & Member Avatars**: Exception to the scale — pill badges use `rounded-full` (9999px) to contrast with the rectangular grid of cards and inputs. Member avatars are circular (`rounded-full`) with a 2px outer border to separate overlapping states.

## Components

### Buttons
- **Primary**: Solid background `#4F46E5`, text `#FFFFFF`, border transparent, `rounded-md`, 8px 16px padding. Hover: `#4338CA`. Active: scale 0.99. Focus ring: 2px `#6366F1` with 2px offset.
- **Secondary**: Surface `#FFFFFF`, border 1px `#E2E8F0`, text `#1E293B`. Hover: `#F8FAFC`, border `#CBD5E1`.
- **Ghost/Tertiary**: Background transparent, text `#334155`. Hover: background `#F1F5F9`, text `#0F172A`.
- **Destructive**: Text `#EF4444`, hover surface `#FEF2F2`.

### Status Badges & Pills
- Pill-shaped (`rounded-full`), padding `2px 8px`, typography `label-sm`.
- **Completed**: `#ECFDF5` background, `#065F46` text, `#A7F3D0` border.
- **Deadline/Urgent**: `#FFFBEB` background, `#92400E` text, `#FDE68A` border.
- **Neutral/Member**: `#F1F5F9` background, `#334155` text, `#E2E8F0` border.

### Inputs & Text Areas
- Single-line and multi-line inputs feature a `#FFFFFF` surface, 1px `#E2E8F0` border, `rounded-md`, and 8px 12px padding.
- Focus: Border `#4F46E5`, ring 1px `#4F46E5`.
- Placeholder text in slate-400 (`#94A3B8`).

### Modals (Notes, Links, Tasks)
- Header with title, close button (`X`), and metadata indicator.
- Structured form fields for title, note markdown, URL destination, assignee selector (Team Members 1, 2, or 3), and deadline picker.
- Explicitly excluded: Drag-and-drop dropzones, file attachment buttons, or asset upload previews.

### Cards (Task & Link Units)
- Solid `#FFFFFF` surface, 1px solid `#E2E8F0` border, `rounded-lg`, `16px` internal padding.
- Header row: Assignee avatar (small 24px circle) + Status Badge.
- Content row: Task/Link title in `headline-sm`, optional external link preview chip with an arrow icon.
- Footer row: Deadline indicator with amber alert if within 24 hours, and quick status check toggle.

### Checkboxes & Radios
- Checkbox: 16x16px square, `rounded` (4px), border 1.5px `#CBD5E1`. Checked state: background `#10B981` (Emerald), border `#10B981`, with crisp white SVG check icon.