<!--
---
title: "Buttons"
description: "GameUI button component — 7 accent roles, 5 style modifiers, plus pill/square/icon/tab/status variants, with createButton factory"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-21"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components, extraction]
  - tech: [css-custom-properties, javascript]
related_documents:
  - "[Components](../README.md)"
  - "[Factory Pattern](../../README.md#6-factory-pattern-interactive-components)"
---
-->

# Buttons

[`buttons.css`](buttons.css) ships the GameUI button set, extracted from `neon-ui-mega-bundle/buttons/`. The source pack was already network-isolated (no external URLs, no binary assets); extraction renamed classes to the `gui-` namespace and promoted hardcoded palette literals to accent-role tokens. [`buttons.js`](buttons.js) ships the `createButton` factory that emits the same classes and exposes state hooks (`setLabel`, `setAccent`, `setVariant`, `setDisabled`, `setActive`, `onClick`).

Composition model: every visual variant is the base `.gui-btn` plus a color modifier (one of seven accent roles) and optionally a style modifier (solid, outline, ghost, pill). Status variants (`.gui-btn--status-{success,warning,danger}`) are self-contained presets. See the file header for full HTML examples.

| Factory | Returns |
|---------|---------|
| `createButton({ label, icon, accent, variant, disabled, active, onClick })` | `{ el, setLabel, setIcon, setAccent, setVariant, setDisabled, setActive, onClick }` |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles consumed via `var()` |
