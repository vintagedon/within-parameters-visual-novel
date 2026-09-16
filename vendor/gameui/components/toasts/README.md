<!--
---
title: "Toasts"
description: "GameUI toasts — display chrome plus createToaster manager with enqueue, dismiss, dedupe, and timers"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-21"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components, extraction]
  - tech: [css-custom-properties, css, javascript]
related_documents:
  - "[Components](../README.md)"
  - "[Factory Pattern](../../README.md#6-factory-pattern-interactive-components)"
---
-->

# Toasts

[`toasts.css`](toasts.css) ships the toast CSS structure and DOM skeleton, extracted from `achievement-toast-notification-system-html5/`. [`toasts.js`](toasts.js) ships the `createToaster` manager: a fixed-position aria-live region with enqueue, dismiss, clear, auto-dismiss timers, max-visible cap, and dedupe (identical title+type bumps a count badge instead of stacking).

Six canonical type modifiers map to accent roles: achievement (primary), success, info, warning, error (danger), magic. Source-pack type names (quest, reward, save, level, secret, system, item, tip) alias to those six. The source pack's 12 hardcoded-color SVG icons are not vendored; consumers fill `.gui-toast__icon` with their own inline SVG, image, or glyph. See the file header for the full HTML anatomy.

| Factory | Returns |
|---------|---------|
| `createToaster({ position, duration, maxVisible, dedupe, onEnqueue })` | `{ el, enqueue, dismiss, clear, onEnqueue }` |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles and z-index slots |
