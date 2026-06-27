<!--
---
title: "Tests"
description: "Playwright regression harness and neon baseline capture for the GameUI-migrated Within Parameters UI"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-22"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [testing, ui, design-system]
  - tech: [playwright, python, chromium]
related_documents:
  - "[Spec 02: GameUI Consumer Integration](../spec/spec-02-gameui-consumer-integration.md)"
  - "[Vendored GameUI Framework](../vendor/gameui/VENDORED.md)"
---
-->

# Tests

Playwright (Chromium headless) regression harness for the GameUI-migrated UI. The harness boots the Vite dev server on an isolated port, walks every migrated screen from title to ending, captures a neon baseline screenshot per screen, asserts the framework component is present on each, and enforces the self-contained network contract (zero non-origin requests, zero console errors).

## Scripts

| Script | Purpose |
|--------|---------|
| [`capture.py`](capture.py) | Capture neon baselines + run framework/network/console assertions. Supports `--check` for regression comparison against committed `.sha1` sidecars. |

## Running

```bash
# From the repo root. Playwright lives in the shared venv at /opt/agents/venv.
npm run test:screens           # capture baselines (via the venv python)
npm run test:screens:check     # regression check against committed .sha1 sidecars

# Or directly:
/opt/agents/venv/bin/python tests/capture.py
/opt/agents/venv/bin/python tests/capture.py --check
```

The harness starts the dev server itself (via `node node_modules/vite/bin/vite.js`; the `.bin/vite` symlink lacks the exec bit on this host), so no manual `npm run dev` is required. Exit code is non-zero on any failure: a missing framework component, a console error, a non-origin request, or (in `--check`) a baseline regression.

## Harness Configuration

The Playwright configuration is inline in `capture.py` (no separate `playwright.config.js`):

- **Browser:** `chromium`, `headless=True`
- **Viewport:** 1440 × 900
- **Dev server:** isolated OS-allocated port, started and torn down per run
- **Baselines:** eight PNGs under `baseline/`, with `.sha1` sidecars for regression

## Screens Captured

| Step | Baseline | How reached |
|------|----------|-------------|
| title | `01-title.png` | Boot |
| settings | `04-settings.png` | SETTINGS from title |
| save-load-confirm | `05-save-load-confirm.png` | LOAD GAME → occupied slot (autosave seeded via dev hook) |
| lore-card | `02-lore-card.png` | NEW GAME (dossier-absent run start) |
| hud-midrun | `03-hud-midrun.png` | Walk to the discovery scene |
| comms-interrupt | `07-comms-interrupt.png` | Dev hook (comms is balance-gated; unreachable in short runs) |
| reward-overlay | `06-reward-overlay.png` | Walk to stop 1's reward |
| ending | `08-ending.png` | Dev hook (natural run flow stalls at the approach-event reward) |

### Dev-only hooks

Two migrated surfaces (comms, ending) and the save/load confirm's occupied-slot prerequisite cannot be reached through natural gameplay alone within the harness, so `src/main.ts` exposes `window.__wp` **only when `import.meta.env.DEV`** (stripped from production builds): `triggerComms()`, `triggerEnding()`, and `seedAutosave()`. These drive presentation overlays and real save-manager calls only — no engine mechanics. See the Spec 02 notes for the rationale.

## Extending (Spec 03)

The harness is step-structured. Spec 03 appends its new screens (dossier, score breakdown) to the `SCREENS` and `VERIFY` maps and adds their drivers — extending the walk is a small edit, not a rewrite.

## Network note

The migration's contract is zero non-origin requests (the framework is self-contained; the neon preset uses the system font stack and no skin assets). The harness fails on any non-origin request or console error. Same-origin `/assets/audio/*.ogg` 404s are reported as warnings: the audio files exist under the repo-root `assets/` dir but the Vite dev server does not auto-serve that directory, so they 404 pre-existingly. This predates the GameUI migration and is out of scope for Spec 02.

## Related

| Document | Relationship |
|----------|--------------|
| [Spec 02](../spec/spec-02-gameui-consumer-integration.md) | The migration this harness validates |
| [Vendored framework](../vendor/gameui/VENDORED.md) | Provenance of the GameUI tree WP consumes |
