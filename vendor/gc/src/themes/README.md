<!--
---
title: "Theme Source"
description: "Removable semantic-token theme files for the framework"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: themes
  - tech: [css]
related_documents:
  - "[Token Reference](../../docs/token-reference.md)"
  - "[Project Charter](../../docs/project-charter.md)"
---
-->

# Theme Source

Each file in this directory selects one root `data-gc-theme` value and
populates semantic tokens inside the `theme` layer. Theme files do not declare
primitive tokens, component tokens, selectors for component internals, or
interactive state variants.

---

## 1. Contents

```text
themes/
├── arcade.css    # Square geometry, hard depth, stepped motion
├── fantasy.css   # Weathered geometry, carved depth, editorial type
├── modern.css    # Explicit modern theme; semantic defaults also provide fallback
├── scifi.css     # Chamfered readouts, scanlines, glow, and frosted surfaces
└── README.md     # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [arcade.css](arcade.css) | Square geometry, hard offset depth, uppercase tracked type, and stepped motion | Active |
| [fantasy.css](fantasy.css) | Weathered geometry, carved depth, generated wash, and editorial type | Active |
| [modern.css](modern.css) | Flat surfaces, soft depth, smooth motion, and normal-case type | Active |
| [scifi.css](scifi.css) | Chamfered geometry, generated scanlines and sweep, glow, and frosted surfaces | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Framework Source](../README.md) | Parent directory |
| [Token Reference](../../docs/token-reference.md) | Public roles populated by themes |
