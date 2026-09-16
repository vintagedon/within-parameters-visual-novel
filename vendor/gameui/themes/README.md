<!--
---
title: "Theme Presets"
description: "Neon and dark-fantasy presets that populate the GameUI token contract, plus self-hosted OFL fonts and skin assets"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-21"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, themes]
  - tech: [css-custom-properties]
related_documents:
  - "[Framework Source Layer](../README.md)"
  - "[Token Contract](../tokens/tokens.css)"
---
-->

# Theme Presets

Two shipped presets, each a single CSS file that populates every token in [`../tokens/tokens.css`](../tokens/tokens.css):

- [`neon.css`](neon.css) — six-color neon on `#020617` dark base. System font stack.
- [`dark-fantasy.css`](dark-fantasy.css) — gold/brown RPG palette with Cinzel display and MedievalSharp body fonts, self-hosted via `@font-face`.

Skin-level assets live alongside:

- [`fonts/`](fonts/) — self-hosted OFL font files (`Cinzel.ttf`, `MedievalSharp.ttf`) and their SIL Open Font License texts. Source: google/fonts OFL release.
- [`dark-fantasy-assets/`](dark-fantasy-assets/) — sanitized webp images (orbs, panel texture, ornamental border) renamed from the source pack's `.png.webp` double extension to clean `.webp`.

Switching a host document between presets is a one-line swap of the preset `<link>` href. No component file changes.

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Framework source layer |
| [Token contract](../tokens/tokens.css) | The vocabulary every preset populates |
