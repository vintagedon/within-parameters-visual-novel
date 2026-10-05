<!--
---
title: "vendor/gc: vendored html5-game-ui-framework"
description: "Provenance for the pinned, verbatim copy of the framework's consumable src/ tree"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-10-04"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [ui]
  - tech: [css, typescript]
related_documents:
  - "[Framework repository](https://github.com/vintagedon/html5-game-ui-framework)"
  - "[Composition contract](../../docs/presentation/composition-contract.md)"
---
-->

# vendor/gc

A pinned, verbatim copy of the `html5-game-ui-framework` consumable `src/` tree. WP overrides the framework only through its own files, following the framework's override contract (`docs/cascade-and-overrides.md` in the framework repository): consumer rules go in the `overrides` cascade layer, and no edit inside this directory is ever made. A patched vendor tree makes the recorded pin false.

| Field | Value |
|---|---|
| Framework | `html5-game-ui-framework` |
| Pin (full SHA) | `952ae06e071a326e02f4ecb008256644fe2a5290` |
| Charter version at the pin | 1.8 |
| Copied | 2026-10-04 |
| Copy method | `git archive <pin> src/` extracted verbatim |
| License | MIT (the framework's `LICENSE`); framework data content under `LICENSE-DATA` is not part of `src/` |
| Verification | `npm run check:vendor` (byte-identical hash comparison against `git cat-file` at the pin, equal file counts) |

## Contents

`src/gc.css` (cascade entry: `@layer reset, tokens, core, modules, theme, overrides`), `src/gc.js` (ESM entry injecting shared SVG filter defs on import), `src/tokens/`, `src/core/` (panel, button, input, the meter family), `src/themes/` (modern, arcade, sci-fi, fantasy; WP uses `data-gc-theme="sci-fi"`), `src/modules/` (documentation only at this pin; the framework publishes no dialogue, modal, card, settings, or stage-host module, so WP authors those as `wp-*` compositions in its own files).

## Refresh procedure

A new pin requires an operator-authorized reviewed framework change. Then: update the pin SHA in this file and in `scripts/check-vendor-pin.mjs`, re-extract with `git -C <framework checkout> archive <new-pin> src/ | tar -x -C vendor/gc`, run `npm run check:vendor`, and re-run the full gate 5.9 parity set. The pin stays fixed through this unit and its presentation follow-up otherwise.
