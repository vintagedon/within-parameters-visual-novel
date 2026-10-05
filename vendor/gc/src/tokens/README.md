<!--
---
title: "Token Source"
description: "Three-tier CSS custom property contract for framework foundations"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: foundations
  - tech: [css]
related_documents:
  - "[Token Reference](../../docs/token-reference.md)"
  - "[Project Charter](../../docs/project-charter.md)"
---
-->

# Token Source

The token contract flows in one direction: primitive literals feed semantic
roles, and semantic roles feed component defaults. Framework rules may consume
semantic or component tokens but never primitive tokens directly.

---

## 1. Contents

```text
tokens/
├── primitives.css   # Internal literal values
├── semantic.css     # Frozen public semantic vocabulary
├── components.css   # Component defaults and shared state recipes
└── README.md        # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [primitives.css](primitives.css) | Internal literal scales and theme palettes | Active |
| [semantic.css](semantic.css) | Frozen public semantic contract with modern defaults | Active |
| [components.css](components.css) | Defaults for registered core specimens | Active |

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Framework Source](../README.md) | Parent directory |
| [Token Reference](../../docs/token-reference.md) | Vocabulary boundary definitions |
