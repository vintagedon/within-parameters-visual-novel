<!--
---
title: "Stat Displays"
description: "GameUI stat-display component — linear, segmented, and orb-icon bars"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-21"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components, extraction]
  - tech: [css-custom-properties]
related_documents:
  - "[Components](../README.md)"
---
-->

# Stat Displays

[`stat-displays.css`](stat-displays.css) ships three bar variants:

- **Linear** — `.gui-bar` with `--amount` (0..1) driving an `scaleX` fill transform on `.gui-bar__fill`. Five color modifiers (hp/shield/xp/load/energy) plus aliases (danger/success/magic/warning/info/mana).
- **Segmented** — `.gui-bar--segmented` with N `.gui-bar__pip` elements; the consumer marks the first M with `.is-filled`.
- **Orb-icon** — `.gui-bar--has-orb` prepends a circular icon. The orb image comes from `--gui-stat-orb-*-image` (dark-fantasy wires real webp orbs; neon falls back to a CSS-only colored disc).

Sources: `ui-theme-dark-fantasy/` for the orb-icon pattern and HP/mana/XP roles; `neon-ui-mega-bundle/ui-sliders-and-bars/` for the `--amount` scaleX technique and segmented variants. See the file header for full HTML examples.

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles and the `--gui-stat-orb-*-image` hooks |
