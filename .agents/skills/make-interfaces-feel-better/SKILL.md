---
name: make-interfaces-feel-better
description: Polish Margarita Arte & Deco React interfaces through typography, spacing, surfaces, interaction states, and subtle motion. Use when building or reviewing UI components, hover and focus states, shadows, borders, micro-interactions, animations, optical alignment, or visual details. Always preserve AGENTS.md, docs/DESIGN-SYSTEM.md, and existing CSS tokens.
---

# Details that make interfaces feel better

Great interfaces rarely come from a single thing. It's usually a collection of small details that compound into a great experience. Apply these principles when building or reviewing UI code.

## Project constraints

- Read `AGENTS.md`, `docs/DESIGN-SYSTEM.md`, and `docs/CONVENTIONS.md` before applying a recommendation.
- Use plain CSS classes and variables from `frontend/src/styles/variables.css`; Tailwind snippets in references are conceptual examples only.
- Use only Lucide React icons and Framer Motion. Do not add dependencies.
- Do not introduce dark mode, saturated colors, arbitrary breakpoints, inline styles, or hardcoded visual values.
- If a needed token or rule is absent, report the proposal before changing documentation or code.
- For public-facing copy, also read `docs/CONTENT-STRATEGY.md`.

## Quick Reference

| Category | When to Use |
| --- | --- |
| [Typography](typography.md) | Text wrapping, font smoothing, tabular numbers |
| [Surfaces](surfaces.md) | Border radius, optical alignment, shadows, image outlines, hit areas |
| [Animations](animations.md) | Interruptible animations, enter/exit transitions, icon animations, scale on press |
| [Performance](performance.md) | Transition specificity, `will-change` usage |

## Core Principles

### 1. Concentric Border Radius

Outer radius = inner radius + padding. Mismatched radii on nested elements is the most common thing that makes interfaces feel off.

### 2. Optical Over Geometric Alignment

When geometric centering looks off, align optically. Buttons with icons, play triangles, and asymmetric icons all need manual adjustment.

### 3. Use Documented Surfaces

Use the single subtle elevation documented for cards and containers. Keep accessible borders for inputs and focus states. Never replace a documented border or shadow by preference alone.

### 4. Interruptible Animations

Use CSS transitions for interactive state changes — they can be interrupted mid-animation. Reserve keyframes for staged sequences that run once.

### 5. Split and Stagger Enter Animations

Don't animate a single container. Break content into semantic chunks and keep the complete sequence within the documented 200–500 ms window.

### 6. Subtle Exit Animations

Use a small fixed `translateY` instead of full height. Exits should be softer than enters.

### 7. Contextual Icon Animations

Animate icons only when it improves comprehension. Use Framer Motion or an existing CSS transition, stay within 200–500 ms, avoid bounce, and preserve a reduced-motion alternative. Do not invent blur, scale, or easing values outside the Design System without prior approval.

### 8. Font Smoothing

Apply `-webkit-font-smoothing: antialiased` to the root layout on macOS for crisper text.

### 9. Tabular Numbers

Use `font-variant-numeric: tabular-nums` for any dynamically updating numbers to prevent layout shift.

### 10. Text Wrapping

Use `text-wrap: balance` on headings. Use `text-wrap: pretty` for body text to avoid orphans.

### 11. Image Outlines

Add an image outline only when the Design System defines an appropriate token for that component. This project has no dark mode. Otherwise preserve the existing image treatment and report the proposed token first.

### 12. Scale on Press

Use press feedback only when it matches the documented component behavior. Never animate disabled controls, and do not introduce an undocumented scale value.

### 13. Skip Animation on Page Load

Use `initial={false}` on `AnimatePresence` to prevent enter animations on first render. Verify it doesn't break intentional entrance animations.

### 14. Never Use `transition: all`

Always specify exact properties, such as `transition-property: transform, opacity`. Use the project's CSS classes rather than Tailwind utilities.

### 15. Use `will-change` Sparingly

Only for `transform`, `opacity`, `filter` — properties the GPU can composite. Never use `will-change: all`. Only add when you notice first-frame stutter.

### 16. Minimum Hit Area

Interactive elements need at least 44×44px hit area. Extend with a pseudo-element if the visible element is smaller. Never let hit areas of two elements overlap.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Same border radius on parent and child | Calculate `outerRadius = innerRadius + padding` |
| Icons look off-center | Adjust optically with padding or fix SVG directly |
| Hard borders between sections | Use layered `box-shadow` with transparency |
| Jarring enter/exit animations | Split, stagger, and keep exits subtle |
| Numbers cause layout shift | Apply `tabular-nums` |
| Heavy text on macOS | Apply `antialiased` to root |
| Animation plays on page load | Add `initial={false}` to `AnimatePresence` |
| `transition: all` on elements | Specify exact properties |
| First-frame animation stutter | Add `will-change: transform` (sparingly) |
| Tiny hit areas on small controls | Extend with pseudo-element to 44×44px |

## Review Output Format

Always present changes as a markdown table with **Before** and **After** columns. Include every change you made — not just a subset. Never list findings as separate "Before:" / "After:" lines outside of a table. Group changes by principle using a heading above each table, and keep each row focused on a single diff so the reader can scan the whole list quickly.

### Example

#### Concentric border radius
| Before | After |
| --- | --- |
| `rounded-xl` on card + `rounded-xl` on inner button (`p-2`) | `rounded-2xl` on card (`12 + 8`), `rounded-lg` on inner button |
| `border-radius: 16px` on both nested surfaces | Outer `24px`, inner `16px` with `8px` padding |

#### Tabular numbers
| Before | After |
| --- | --- |
| `<span>{count}</span>` on animated counter | `<span className="tabular-nums">{count}</span>` |
| Default numerals on timer | Added `font-variant-numeric: tabular-nums` to root |

#### Scale on press
| Before | After |
| --- | --- |
| Button without press feedback | Added the documented active state when appropriate |
| Undocumented press scale | Removed it and preserved the Design System behavior |

Rows should cite the specific file and the specific property that changed when it isn't obvious from the snippet. If a principle was reviewed but nothing needed to change, omit that table entirely — empty tables add noise.

## Review Checklist

- [ ] Nested rounded elements use concentric border radius
- [ ] Icons are optically centered, not just geometrically
- [ ] Shadows used instead of borders where appropriate
- [ ] Enter animations are split and staggered
- [ ] Exit animations are subtle
- [ ] Dynamic numbers use tabular-nums
- [ ] Font smoothing is applied
- [ ] Headings use text-wrap: balance
- [ ] Images have subtle outlines
- [ ] Buttons use scale on press where appropriate
- [ ] AnimatePresence uses `initial={false}` for default-state elements
- [ ] No `transition: all` — only specific properties
- [ ] `will-change` only on transform/opacity/filter, never `all`
- [ ] Interactive elements have at least 44×44px hit area

## Reference Files

- [typography.md](typography.md) — Text wrapping, font smoothing, tabular numbers
- [surfaces.md](surfaces.md) — Border radius, optical alignment, shadows, image outlines
- [animations.md](animations.md) — Interruptible animations, enter/exit transitions, icon animations, scale on press
- [performance.md](performance.md) — Transition specificity, `will-change` usage
