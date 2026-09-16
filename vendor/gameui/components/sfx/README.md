<!--
---
title: "SFX Manager"
description: "GameUI SFX factory — UI sound playback with mute persistence wrapping the sanitized tiny-ui-sfx-pack audio"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-22"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components, extraction]
  - tech: [javascript, html]
related_documents:
  - "[Components](../README.md)"
  - "[Factory Pattern](../../README.md#6-factory-pattern-interactive-components)"
  - "[Source Pack: tiny-ui-sfx-pack](../../../assets/neon-ui-bundle/tiny-ui-sfx-pack/README.md)"
---
-->

# SFX Manager

[`sfx.js`](sfx.js) ships the SFX manager wrapping the sanitized UI sound effects in [`audio/`](audio/). The 23 WAV files in `audio/` were copied from `assets/neon-ui-bundle/tiny-ui-sfx-pack/exports/audio/wav/` (the subset referenced by the pack's `templates/ui-sound-map.json`) with the source's hyphen naming preserved. The full pack (64 files, 1.5 MB) remains as reference material; only the mapped subset ships.

The factory preloads each sound as an `HTMLAudioElement`, exposes a `play(name)` surface keyed to UI event names, and persists the mute flag in LocalStorage so the player's preference survives reloads. No audio is fetched over the network at runtime; every `src` resolves to a local file.

| Factory | Returns |
|---------|---------|
| `createSfxManager({ audioBasePath, mapping, muted, volume, storageKey })` | `{ play, setMuted, isMuted, setVolume, setMapping, preload, getMapping }` |

The default event-to-sound mapping mirrors the pack's `ui-sound-map.json`:

| Event | Files |
|-------|-------|
| `button_hover`, `button_press` | hover-0{1,2,3}, click-0{1,2,3} |
| `confirm`, `cancel` | confirm-0{1,2,3}, cancel-0{1,2} |
| `error`, `warning` | error-0{1,2}, alert-0{1,2} |
| `toggle_on`, `toggle_off` | toggle-0{2,4}, toggle-0{1,3} |
| `panel_open`, `panel_close` | transition-0{2,4}, transition-0{1,3} |

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Bundle inventory](../../../assets/neon-ui-bundle/README.md) | Pack-to-family mapping and sanitization targets |
