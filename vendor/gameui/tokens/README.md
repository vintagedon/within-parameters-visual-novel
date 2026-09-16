<!--
---
title: "Tokens"
description: "The GameUI token contract — semantic custom properties that bind component structure to theme skin"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-21"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, tokens]
  - tech: [css-custom-properties]
related_documents:
  - "[Framework Source Layer](../README.md)"
  - "[Neon Preset](../themes/neon.css)"
  - "[Dark-Fantasy Preset](../themes/dark-fantasy.css)"
---
-->

# Tokens

The single source of truth for the GameUI semantic vocabulary. [`tokens.css`](tokens.css) declares every custom property the components consume, grouped into ten sections: surface/text, accents, typography, borders, glow, spacing, shadow, motion, z-index, and component asset hooks. Each property carries a structural fallback default so the components render even without a preset loaded.

A theme preset overrides these values at `:root`; it never declares new properties and never introduces selectors. Authoring a new preset is documented in [`../README.md`](../README.md) §3.

## Related

| Document | Relationship |
|----------|--------------|
| [tokens.css](tokens.css) | The contract |
| [Parent](../README.md) | Framework source layer |
| [Neon preset](../themes/neon.css) | Populates the contract with the neon palette |
| [Dark-fantasy preset](../themes/dark-fantasy.css) | Populates the contract with the gold/brown RPG palette |
