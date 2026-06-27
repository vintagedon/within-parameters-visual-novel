<!--
---
title: "Loading States"
description: "GameUI loading factory — three pure-CSS spinner variants and a full-screen loading overlay with optional progress"
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

# Loading States

[`loading.css`](loading.css) and [`loading.js`](loading.js) ship the loading family, built from scratch (charter §2 v1: the loading pack is pending acquisition). Three spinner variants ship, all pure CSS animation: ring, dot, and pulse. The loading overlay factory produces a full-screen, role=dialog blocker with optional message and progress bar.

Animations respect `prefers-reduced-motion`; the CSS layer collapses them to a static frame. Spinner color and glow flow through the active accent token.

| Factory | Returns |
|---------|---------|
| `createSpinner({ variant, accent, size, label })` | `{ el }` |
| `createLoadingOverlay({ title, message, accent, progress, showPercent })` | `{ el, show, hide, isOpen, setProgress, setMessage, setTitle }` |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles consumed via `var()` |
