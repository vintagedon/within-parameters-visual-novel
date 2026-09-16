<!--
---
title: "Vendored GameUI Framework"
description: "Provenance and refresh procedure for the pinned GameUI framework copy consumed by Within Parameters"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-22"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, vendoring, dependencies]
  - tech: [css, javascript]
related_documents:
  - "[Framework Source Layer](https://github.com/radioastronomyio/gameui-browser-gaming-framework)"
  - "[Spec 02: GameUI Consumer Integration](../../spec/spec-02-gameui-consumer-integration.md)"
---
-->

# Vendored GameUI Framework

Within Parameters is the first real consumer of the [GameUI](https://github.com/radioastronomyio/gameui-browser-gaming-framework) zero-build-step UI framework. This directory is a pinned, verbatim copy of the framework's consumable `ui/` tree. It is the **only** runtime dependency WP has on the framework; the game never references the framework repository by path at runtime. To retheme WP, swap the preset `<link>` in `index.html` (see `themes/`).

## Provenance

| Field | Value |
|-------|-------|
| Source repository | `https://github.com/radioastronomyio/gameui-browser-gaming-framework` |
| Source path (at copy time) | `/opt/agents/repos/gameui-browser-gaming-framework/ui/` |
| Framework version | 1.0 (from `ui/README.md` frontmatter, dated 2026-06-21) |
| Copy date | 2026-06-22 |
| Vendored by | Spec 02 — WP GameUI Consumer Integration |

## What was copied

A verbatim copy of the framework's consumable layers (structure + skin + contract):

| Tree | Purpose |
|------|---------|
| `tokens/` | The token contract (`tokens.css`) — semantic custom properties binding structure to skin |
| `themes/` | Presets: `neon.css` (active in WP), `dark-fantasy.css`, plus `themes/fonts/` (self-hosted OFL Cinzel/MedievalSharp) and `themes/dark-fantasy-assets/` (webp textures) so a one-link preset swap works |
| `components/` | All 12 component families — structure CSS plus JS factories where interactive |
| `FRAMEWORK-README.md` | The framework's own `ui/README.md`, retained for load-order, factory, and theme-authoring reference |

The framework's own `gallery/` and `tests/` directories are its validation/demo harness, not runtime consumables, and are intentionally **not** vendored. Copying them would add the framework's gallery styles (explicitly "not component skin") and its Playwright baseline PNGs to WP's tree.

## Wiring (load order)

`index.html` loads, in this order: `tokens/tokens.css` → `themes/neon.css` → the component CSS families WP uses → `src/styles.css`. The JS factories are imported from TypeScript under `src/ui/` (buttons, modals, settings, cards). See the framework README §4 (Consumption) and §6 (Factory Pattern).

## Refresh procedure

When upgrading the pinned framework version:

1. Re-copy `tokens/`, `themes/`, `components/`, and `FRAMEWORK-README.md` from the updated source `ui/` tree over this directory. Use `cp -r` (verbatim); do not hand-merge.
2. Update the version and copy-date rows in the table above from the source `ui/README.md` frontmatter.
3. Re-run the WP Playwright capture harness (`tests/capture.py`) and review the baseline diffs under `tests/baseline/`. A framework change that alters component rendering will move the baselines; confirm the diff is intentional.
4. Run `npx tsc --noEmit` and `npm run build` to confirm the factory imports and token references still resolve.
5. Commit the refreshed tree and new baselines together on a feature branch.
