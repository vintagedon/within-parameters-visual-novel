<!--
---
title: "Components"
description: "Static-structure component CSS — layout, states, focus, ARIA, animation timing. Skin flows through tokens only."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-21"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components, extraction]
  - tech: [css-custom-properties]
related_documents:
  - "[Framework Source Layer](../README.md)"
  - "[Token Contract](../tokens/tokens.css)"
  - "[Neon-UI Bundle Inventory](../../assets/neon-ui-bundle/README.md)"
---
-->

# Components

Static-structure CSS plus JS factories. Each family is one directory holding the CSS (and, where the family is interactive, the ES module factory). The structure/skin separation is non-negotiable: a component file declares layout, spacing, states, focus-visible rings, ARIA scaffolding, and animation timing, never palette colors, font families, glow colors, or border radii. Every themeable property flows through `var()`. Audit with:

```bash
grep -rEn "#[0-9a-fA-F]{3,8}" components/
# expects zero matches outside comment blocks
```

The factory pattern is documented in [the framework README §6](../README.md#6-factory-pattern-interactive-components). Every factory exports a `create<Family>(options)` function returning a control object whose live node is `.el`; factories expose callbacks (`onChange`, `onClick`, `onSelect`) and never touch game state.

| Family | Files | Scope |
|--------|-------|-------|
| Buttons | [`buttons/`](buttons/README.md) | 7 accent roles × 5 style modifiers, plus pill/square/icon/tab/status variants; `createButton` factory |
| Panels | [`panels/panels.css`](panels/panels.css) | 7 color modifiers, header/body/footer anatomy, status dots, chips (structure-only) |
| Stat displays | [`stat-displays/stat-displays.css`](stat-displays/stat-displays.css) | Linear, segmented, and orb-icon bars via `--amount`/pip rendering (structure-only) |
| Modals | [`modals/`](modals/README.md) | Modal and dialog chrome + `createModal` factory (focus trap, restore focus, Esc-to-close) |
| Toasts | [`toasts/`](toasts/README.md) | Display chrome + `createToaster` manager (enqueue, dismiss, dedupe, timers) |
| Settings | [`settings/`](settings/README.md) | `createToggle`, `createSwitch`, `createSlider`, `createSelect` factories |
| Tabs | [`tabs/`](tabs/README.md) | `createTabs` factory, three orientations, ARIA tablist, full keyboard nav |
| Loading | [`loading/`](loading/README.md) | `createSpinner` (ring/dot/pulse) and `createLoadingOverlay` factories |
| Cards | [`cards/`](cards/README.md) | `createCard` primitive with slots, selectable, disabled states |
| Metrics | [`metrics/`](metrics/README.md) | `createFpsSparkline`, `createFrameTime`, `createStatRows` (GPU-agnostic, own rAF loop) |
| Layout | [`layout/`](layout/README.md) | `createShell` two-pane container and `createDrawer` flyout |
| SFX | [`sfx/`](sfx/README.md) | `createSfxManager` wrapping sanitized UI sounds; mute persistence |

Extracted families were sanitized from `assets/neon-ui-bundle/` per the inventory README: Rosebud artifacts, Phaser/Three.js/Tone.js importmaps, and Google Fonts hot-links were stripped from the source material; `.png.webp` double extensions were renamed to clean `.webp`; OFL fonts were self-hosted in [`../themes/fonts/`](../themes/fonts/). New-construction families (loading, cards, metrics, layout) are original framework code; the SFX audio was copied and name-normalized from `tiny-ui-sfx-pack`.

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Framework source layer |
| [Token contract](../tokens/tokens.css) | The vocabulary these components consume |
| [Bundle inventory](../../assets/neon-ui-bundle/README.md) | Source pack-to-family mapping and sanitization targets |
