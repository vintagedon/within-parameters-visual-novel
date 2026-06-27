<!--
---
title: "Modals and Dialogs"
description: "GameUI modal and dialog — chrome plus createModal factory with focus trap, Esc-to-close, and restore-focus"
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

# Modals and Dialogs

[`modals.css`](modals.css) ships modal and dialog chrome, extracted from `neon-ui-mega-bundle/panels-and-windows/` (the `.overlay-demo`/`.overlay-window` pattern). [`modals.js`](modals.js) ships the `createModal` factory that wires behavior around the `.is-open` class toggle: open/close, focus trap (Tab cycles within the dialog), focus restore to the opener, Escape-to-close, and backdrop-click dismissal.

Color modifiers (success/warning/danger/magic) tint the dialog border and glow to convey severity. The `--dialog` variant shrinks the window for confirm/alert flows; the factory picks `role=alertdialog` automatically for dialog and danger/warning variants. See the file header for the full HTML anatomy.

| Factory | Returns |
|---------|---------|
| `createModal({ title, body, variant, accent, closable, buttons, onOpen, onClose })` | `{ el, open, close, isOpen, setContent, setTitle, setButtons, onOpen, onClose }` |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles and z-index slots |
