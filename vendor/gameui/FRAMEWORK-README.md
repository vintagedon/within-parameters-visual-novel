<!--
---
title: "GameUI Framework Source Layer"
description: "Layout of the zero-build-step framework: token contract, theme presets, static-structure components, gallery, and screenshot harness"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-21"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, tokens, themes, extraction, components, gallery]
  - tech: [css-custom-properties, css, javascript, html, playwright]
related_documents:
  - "[Token Contract](tokens/tokens.css)"
  - "[Neon Preset](themes/neon.css)"
  - "[Dark-Fantasy Preset](themes/dark-fantasy.css)"
  - "[Gallery](gallery/index.html)"
  - - "[Project Charter §2](../internal-files/project-charter.md)"
  - "[AGENTS.md](../AGENTS.md)"
---
-->

# GameUI Framework Source Layer

The shipped framework lives here. Plain CSS files and vanilla JS modules, no bundler, no npm install, no framework runtime. A consumer vendors this directory by file copy and wires it into their game with `<link>` and `<script>` tags. `publish.sh` copies this tree verbatim to `/opt/agents/www/gameui/` to serve the live gallery at `https://gameui.donfather.site`.

The architecture is one separation: **structure** lives in `components/`, **skin** lives in `themes/`, and `tokens/tokens.css` is the contract that binds them. A component never hardcodes a skin value; every themeable property flows through `var()`. Switching a game from neon to dark fantasy means swapping one `<link>` in the host document; no component file changes.

---

## 1. Contents

```
ui/
├── tokens/
│   └── tokens.css                       # Token contract: semantic custom properties (structure)
├── themes/
│   ├── neon.css                         # Neon preset: populates every token
│   ├── dark-fantasy.css                 # Dark-fantasy preset: populates every token + @font-face
│   ├── dark-fantasy-assets/             # Dark-fantasy skin assets (sanitized from source pack)
│   │   ├── panel-bg.webp                #   panel background texture (was ui-panel-bg.png.webp)
│   │   ├── ornate-border.webp           #   panel border decoration (was ornate-border.png.webp)
│   │   ├── health-orb.webp              #   health stat orb (was health-orb.png.webp)
│   │   └── mana-orb.webp                #   mana stat orb (was mana-orb.png.webp)
│   └── fonts/                           # Self-hosted OFL fonts
│       ├── Cinzel.ttf                   #   Variable weight 400–900 (headings)
│       ├── Cinzel-OFL.txt               #   SIL Open Font License
│       ├── MedievalSharp.ttf            #   Regular weight (body)
│       └── MedievalSharp-OFL.txt        #   SIL Open Font License
├── components/
│   ├── buttons/{buttons.css,buttons.js} # Button set + factory (createButton)
│   ├── panels/panels.css                # Panels, windows, modal chrome (extracted, structure-only)
│   ├── stat-displays/stat-displays.css  # Stat bars, segmented bars, orb-icon bars (structure-only)
│   ├── modals/{modals.css,modals.js}    # Modal + dialog chrome and createModal factory
│   ├── toasts/{toasts.css,toasts.js}    # Toast chrome and createToaster manager
│   ├── settings/{settings.css,settings.js}    # Toggle/switch/slider/select factories
│   ├── tabs/{tabs.css,tabs.js}                # Tablist factory, three orientations, ARIA + keyboard
│   ├── loading/{loading.css,loading.js}       # Spinner + loading-overlay factories
│   ├── cards/{cards.css,cards.js}             # Card primitive factory
│   ├── metrics/{metrics.css,metrics.js}       # FPS sparkline, frame-time, stat-row factories
│   ├── layout/{layout.css,layout.js}          # Shell + flyout drawer factories
│   └── sfx/{sfx.js,audio/}                    # SFX manager factory + sanitized UI sounds
├── gallery/
│   ├── index.html                       # Kitchen-sink + worked-example, both presets
│   ├── gallery.css                      # Gallery shell styles (not component skin)
│   ├── gallery.js                       # Preset swap, view swap, toast demo trigger
│   └── assets/                          # Gallery-only assets (SVG icons for toasts)
└── tests/
    ├── playwright.config.js             # Chromium-headless config
    ├── screenshots.js                   # Baseline capture + regression script
    └── baseline/                        # Committed reference screenshots
```

---

## 2. Layout Choice

This spec picks `ui/` as the framework root and separates the four concerns the charter §2 critical constraints require:

| Subdirectory | Concern | Layer |
|--------------|---------|-------|
| `tokens/` | Semantic role names that bind structure to skin | Contract |
| `themes/` | Palette, typography, borders, glow per preset | Skin |
| `components/` | Layout, spacing, states, focus, ARIA, animation timing | Structure |
| `gallery/` | Reference harness and itch.io demo | Validation |
| `tests/` | Playwright screenshot harness | Validation |

Consumers (Within Parameters, Holdfast, webgpu-projects, materialoids) vendor a pinned copy of this tree by path. The tree is the public surface; nothing outside `ui/` ships.

---

## 3. Authoring a New Theme Preset

A preset is one CSS file that assigns a value to every token declared in `tokens/tokens.css`. No new properties, no new selectors — only value assignments.

1. Copy `themes/neon.css` to `themes/<your-preset>.css`.
2. Replace every value on the right-hand side of the custom property declarations. RGB triplet tokens (`--gui-accent-*-rgb`) must match their hex counterpart.
3. If your preset uses custom fonts, declare `@font-face` rules at the top of the file and ship the font files under `themes/fonts/` (or your own asset directory).
4. If your preset needs skin assets (textures, icons), place them under `themes/<your-preset>-assets/` and reference them only from the preset file via `var()`.
5. Load the preset in your host document after `tokens/tokens.css`. Components pick up the values automatically.

A component renders correctly under any preset that populates the contract. The gallery is the proof: it loads every component under both shipped presets with zero component changes.

---

## 4. Consumption

In any host HTML document, in this order:

```html
<link rel="stylesheet" href="ui/tokens/tokens.css">
<link rel="stylesheet" href="ui/themes/neon.css">           <!-- or dark-fantasy.css -->
<link rel="stylesheet" href="ui/components/panels/panels.css">
<link rel="stylesheet" href="ui/components/buttons/buttons.css">
<!-- ...only the component families the game uses -->
```

The static-structure layer needs no JavaScript. Interactive families ship as
ES module factories loaded with a `<script type="module">` block (or an import
map; see the factory pattern in §6). There is no build step. Total payload is
the sum of the CSS and JS files the game actually references.

---

## 5. Sanitization Provenance

Every extracted file is a clean derivative. The framework makes zero network requests at runtime: no `esm.sh`, no `fonts.googleapis.com`, no `rosebud.ai`, no Phaser/Three/Tone importmaps. Self-hosted OFL fonts (`themes/fonts/`) replace Google Fonts hot-links. Dark-fantasy assets in `themes/dark-fantasy-assets/` are renamed from the source pack's `.png.webp` double extension to clean `.webp`. The sanitization targets recorded in `assets/neon-ui-bundle/README.md` §3 are executed against every file ported in `components/`.

---

## 6. Factory Pattern (Interactive Components)

Static-structure components (panels, stat displays) ship as CSS only; they have no behavior. Every interactive family ships as a JS factory: a plain ES module exporting a `create<Family>(options)` function that returns a control object. The factory owns DOM creation, ARIA wiring, and internal state; it never reads or writes game state. The consumer wires callbacks (`onChange`, `onClick`, `onSelect`) to whatever downstream they have.

### Convention

| Rule | Why |
|------|-----|
| One factory per family, co-located with its CSS | A consumer copying one component directory gets both structure and behavior |
| `create<Family>(options)` returns a control object | The live DOM node is on `.el`; methods and event hooks hang off the same object |
| Factories expose callbacks, never push state | `onChange(value)` fires; the consumer decides what to do with it |
| Every themeable property flows through `var()` | A factory never sets a palette color, font, or radius directly; classes map to accent roles |
| ES modules, import-map loadable | `<script type="module">` or an import map entry; no bundler |

### End-to-end example

```html
<link rel="stylesheet" href="ui/tokens/tokens.css">
<link rel="stylesheet" href="ui/themes/neon.css">
<link rel="stylesheet" href="ui/components/settings/settings.css">

<script type="module">
  import { createSlider } from "./ui/components/settings/settings.js";

  const volume = createSlider({
    label: "Volume",
    min: 0,
    max: 100,
    value: 72,
    accent: "magic",
    onChange: (v) => audio.setMasterVolume(v / 100),
  });
  document.getElementById("settings-panel").appendChild(volume.el);
</script>
```

With an import map (consumers who prefer bare specifiers):

```html
<script type="importmap">
  { "imports": { "gameui/": "./ui/" } }
</script>
<script type="module">
  import { createSlider } from "gameui/components/settings/settings.js";
  // ...
</script>
```

### Factory index

| Family | Factory | Returns |
|--------|---------|---------|
| Buttons | `createButton` (`buttons/buttons.js`) | `{ el, setLabel, setAccent, setVariant, setDisabled, setActive, onClick }` |
| Settings | `createToggle`, `createSwitch`, `createSlider`, `createSelect` (`settings/settings.js`) | `{ el, ...state getters/setters, onChange }` |
| Tabs | `createTabs` (`tabs/tabs.js`) | `{ el, select, selected, getPanel, onChange }` |
| Toasts | `createToaster` (`toasts/toasts.js`) | `{ el, enqueue, dismiss, clear, onEnqueue }` |
| Modals | `createModal` (`modals/modals.js`) | `{ el, open, close, isOpen, setContent, setTitle, setButtons, onClose }` |
| Loading | `createSpinner`, `createLoadingOverlay` (`loading/loading.js`) | `{ el, ...state setters }` |
| Cards | `createCard` (`cards/cards.js`) | `{ el, setSelected, setDisabled, setTitle, setBody, setTag, onClick, onSelect }` |
| Metrics | `createFpsSparkline`, `createFrameTime`, `createStatRows` (`metrics/metrics.js`) | `{ el, start, stop, ...readouts }` |
| Layout | `createShell`, `createDrawer` (`layout/layout.js`) | `{ el, ...slots / show, hide, toggle }` |
| SFX | `createSfxManager` (`sfx/sfx.js`) | `{ play, setMuted, isMuted, setVolume, setMapping, preload }` |

---

## 7. Related

| Document | Relationship |
|----------|--------------|
| [Token Contract](tokens/tokens.css) | The semantic role names every preset must populate |
| [Neon Preset](themes/neon.css) | Six-color neon on `#020617` dark base |
| [Dark-Fantasy Preset](themes/dark-fantasy.css) | Gold/brown RPG palette with Cinzel + MedievalSharp |
| [Gallery](gallery/index.html) | Kitchen-sink + worked-example, both presets |
| [Parent README](../README.md) | Repository root |
| [Project Charter §2](../internal-files/project-charter.md) | Scope authority for the v1 component set |
| [AGENTS.md](../AGENTS.md) | Architectural constraints |
