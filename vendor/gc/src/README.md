<!--
---
title: "Framework Source"
description: "Consumable CSS and ESM source for the game UI framework"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-14"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: foundations
  - tech: [css, javascript]
related_documents:
  - "[Project Charter](../docs/project-charter.md)"
  - "[Token Reference](../docs/token-reference.md)"
---
-->

# Framework Source

This directory contains the text-only source that a game consumes. Token,
core, module, and theme paths remain separate so dependency and asset metrics
can scan explicit boundaries.

---

## 1. Contents

```text
src/
├── core/         # Domain-neutral primitives and base behavior
├── modules/      # Reserved module boundary; empty until consumer pressure
├── themes/       # Removable semantic-token theme files
├── tokens/       # Primitive, semantic, and component token tiers
├── gc.css        # Public entry and single cascade layer order
├── gc.js         # Public ESM entry; injects shared SVG defs (e.g. filter refs)
└── README.md     # This file
```

## 2. Consumption

A consuming page loads the CSS entry and imports the ESM entry. The CSS carries
all tokens, layers, and component defaults; the ESM injects the shared SVG
`<defs>` that some surface techniques reference by bare fragment (currently
`#gc-edge-distress`, the fantasy weathered-edge filter). Without the ESM import
those references resolve to nothing in a document that did not also copy the
defs inline, so the two files together are the complete consumption story:

```html
<link rel="stylesheet" href="./src/gc.css">
<script type="module" src="./src/gc.js"></script>
```

No build step, no bundler, no external network request.

The [game display contract](../docs/project-charter.md#411-game-display-contract)
defines one 1920x1080 logical stage scaled to the three supported 16:9 targets.
The current entries supply tokens, primitives, themes, and shared SVG defs;
the shared stage host is pending implementation. Consumers must not infer
automatic viewport fitting from these imports. Existing vendored pins remain
unchanged until each game's authorized migration.

---

## 3. Subdirectories

| Directory | Description |
|-----------|-------------|
| [core/](core/README.md) | Domain-neutral framework defaults and primitives |
| [modules/](modules/README.md) | Game-pattern source and dependency scan boundary |
| [themes/](themes/README.md) | Root-attribute themes that override semantic roles only |
| [tokens/](tokens/README.md) | Three-tier token contract and state recipes |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository README](../README.md) | Repository orientation |
| [Token Reference](../docs/token-reference.md) | Semantic vocabulary and boundaries |
