<!--
---
title: "Panels"
description: "GameUI panel component — 7 color modifiers, header/body/footer anatomy, status dots, and chips"
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

# Panels

[`panels.css`](panels.css) ships the GameUI panel family, extracted from `neon-ui-mega-bundle/panels-and-windows/` (header/body/footer anatomy and the color-modifier vocabulary) and `ui-theme-dark-fantasy/` (textured background and box-shadow border treatment). Both sources are unified under `.gui-panel`; the preset decides whether the panel glows (neon) or carries a texture (dark-fantasy).

Seven color modifiers map to accent roles: primary, magic, success, pink, warning, danger, info. See the file header for the full HTML anatomy.

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles and the `--gui-panel-bg-image` hook |
