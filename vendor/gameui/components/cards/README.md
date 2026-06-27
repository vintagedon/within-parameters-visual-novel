<!--
---
title: "Card Primitive"
description: "GameUI card factory — frame with title, type-tag, body, footer slots; selectable and disabled states; composes with other factories"
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

# Card Primitive

[`cards.css`](cards.css) and [`cards.js`](cards.js) ship the card family, the structural backbone for Holdfast entity panels and Within Parameters dossier entries. A card is a frame with title, subtitle, type-tag, body, and optional footer slots. The body and footer accept any HTMLElement, so a card composes cleanly with other factories: a card containing a stat bar, a card containing a button row, a card holding metrics output.

Selectable cards are focusable (tabindex=0) and toggle `.is-selected` on click, Enter, or Space. Disabled cards dim and drop out of interaction. Accent tint flows through `var()` against the active preset.

| Factory | Returns |
|---------|---------|
| `createCard({ title, subtitle, tag, body, footer, accent, selectable, selected, disabled, onClick, onSelect })` | `{ el, setSelected, isSelected, setDisabled, setTitle, setSubtitle, setBody, setTag, onClick, onSelect }` |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles consumed via `var()` |
