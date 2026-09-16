<!--
---
title: "Layout"
description: "GameUI layout factory — two-pane session shell and flyout drawer with ARIA landmarks and keyboard handling"
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

# Layout

[`layout.css`](layout.css) and [`layout.js`](layout.js) ship two structural primitives. The two-pane shell is the session container: a configurable side column (left or right, width via a CSS custom property) plus a main viewport, with banner / complementary / main ARIA landmarks. The flyout drawer is an overlay panel for settings, inventory, or party management.

The drawer is non-modal (`aria-modal="false"`) by design; pair with `createModal` for blocking flows. It exposes show / hide / toggle, restores focus to the opener on close, and closes on Escape.

| Factory | Returns |
|---------|---------|
| `createShell({ side, sideWidth, header, sideContent, mainContent })` | `{ el, header, side, main, setSideWidth }` |
| `createDrawer({ side, title, accent, content, closable, onShow, onHide })` | `{ el, show, hide, toggle, isOpen, setContent, onShow, onHide }` |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles consumed via `var()` |
