<!--
---
title: "Tabs"
description: "GameUI tabs factory — three orientations, ARIA tablist semantics, full keyboard navigation"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-22"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components]
  - tech: [css-custom-properties, css, javascript]
related_documents:
  - "[Components](../README.md)"
  - "[Factory Pattern](../../README.md#6-factory-pattern-interactive-components)"
---
-->

# Tabs

[`tabs.css`](tabs.css) and [`tabs.js`](tabs.js) ship a tablist factory with three orientations (top, left, right), full ARIA tablist semantics, and keyboard navigation per the WAI-ARIA authoring guide:

- ArrowLeft / ArrowRight move between tabs (top orientation)
- ArrowUp / ArrowDown move between tabs (side orientations)
- Home / End jump to the first / last enabled tab
- The active tab is the only tab in the tab sequence (roving tabindex); Tab reaches the associated panel

The factory owns DOM, ARIA wiring, and panel switching. `onChange(id)` fires on selection; the consumer loads panel content or triggers logic. Tabs map to the accent roles through the active preset.

| Factory | Returns |
|---------|---------|
| `createTabs({ orientation, accent, tabs, initial, onChange })` | `{ el, select, selected, getPanel, onChange }` |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles consumed via `var()` |
