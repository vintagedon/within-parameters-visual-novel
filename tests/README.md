<!--
---
title: "Tests"
description: "Playwright regression and verification harnesses for the Within Parameters UI on the gc framework inside the 1920x1080 stage"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-10-04"
version: "2.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [testing, ui]
  - tech: [playwright, python, chromium, typescript]
related_documents:
  - "[Composition contract](../docs/presentation/composition-contract.md)"
  - "[Gate 5.1 reference record](../docs/presentation/gate-5.1-reference-record.md)"
  - "[Vendor provenance](../vendor/gc/README.md)"
  - "[Presentation review surface](../docs/verification/2026-10-04-presentation-review.md)"
---
-->

# Tests

Playwright (Chromium headless) verification harnesses for the migrated UI: the gc framework inside the WP stage. Screenshot regression with a status manifest, natural-run inventories, resume and boundary checks, stage-fit and composition checks, and the build-identifier check against the served preview.

## Scripts

| Script | Purpose |
|--------|---------|
| [`capture.py`](capture.py) | Capture the 1920x1080 baseline set plus `baseline/manifest.json`, and assert the network rule and coverage. `--check` compares against committed `.sha1` sidecars and never writes `baseline/`. |
| [`complete_run.py`](complete_run.py) | The fixed 37-run natural inventory against the production build: three endings, reroll coverage, documents, comms tiers, a save/resume pair; extracts outcome, grade, raw score, final score, decision count, and character totals per run. |
| [`resume_check.py`](resume_check.py) | Production-build SAVE/LOAD/CONTINUE through real controls across every SAVE-enabled phase, including the comms window, inherited facility music, mute preference, and restored presentation. |
| [`preview_check.py`](preview_check.py) | A run segment against the production build with zero failed same-origin asset requests by HTTP status. |
| [`reward_boundary_check.py`](reward_boundary_check.py) | The five clock-reduction boundary cases through the real card renderer and `applyReward` (DEV-gated trigger). |
| [`stage_fit_check.py`](stage_fit_check.py) | Stage host conformance: charter scale targets, host-fit set, centering, bars, and input alignment. |
| [`screen_walk_check.py`](screen_walk_check.py) | Walks every screen with its extremes; enumerates full-stage overlays from the DOM; checks overflow behavior, control reachability, fractional and letterboxed clicks, and production hook hygiene. |
| [`composition_check.py`](composition_check.py) | Contract regions within 2 px; live meter mechanics and the threshold marker under both configurations; PA-003 fill width; the no-green palette walk; live control actions; contract type sizes. |
| [`build_id_check.py`](build_id_check.py) | The served page's build identifier equals the expected commit and dirty flag. |

## Running

```bash
# From the repo root. Playwright lives in the shared venv at /opt/agents/venv.
npm run test:screens           # capture baselines + manifest (via the venv python)
npm run test:screens:check     # regression check against committed .sha1 sidecars
npm run test:stage-fit         # stage host conformance (dev server, isolated port)
npm run test:screens:walk      # screen walk with overlay enumeration
npm run build && /opt/agents/venv/bin/python tests/composition_check.py

npm run build                  # the production-build checks require a fresh build
/opt/agents/venv/bin/python tests/preview_check.py
/opt/agents/venv/bin/python tests/complete_run.py
/opt/agents/venv/bin/python tests/resume_check.py
/opt/agents/venv/bin/python tests/reward_boundary_check.py
/opt/agents/venv/bin/python tests/build_id_check.py   # hosted preview by default

# Node-side checks (no browser):
npm run test:live              # live-path checks driving the real SceneRunner
npm run test:mutation          # mutation discrimination checks
npm run audit:events           # events.json vs simulation/game_data.py audit
npm run replay                 # replay parity vs the simulator and committed CSV
node scripts/run-counter-mutations.mjs   # unmutated control + named counter failures
node scripts/run-audio-mutation.mjs      # audio-restore mutation discrimination
node scripts/check-dist-assets.mjs       # manifest assets packaged in dist/
```

**Harness environment limitation:** this harness is an ML01 estate tool. It depends on the ML01 shared venv at `/opt/agents/venv` (hardcoded interpreter path) and on whatever Playwright version that venv carries. Runs on other hosts require adapting the interpreter path and providing a Playwright install themselves.

The harnesses start their own servers (via `node node_modules/vite/bin/vite.js`; the `.bin/vite` symlink lacks the exec bit on this host). Exit code is non-zero on any failure.

## Harness Configuration

- **Browser:** `chromium`, `headless=True`
- **Default viewport:** 1920 x 1080 at device scale factor 1, for every ordinary capture and gameplay run. The named exceptions are the stage-fit check's bounded host-fit matrix (1920x1200, 2560x1080, 1600x900, 1366x768, plus the three charter targets) and its fractional/letterboxed input-alignment sizes.
- **Dev server:** isolated OS-allocated port, started and torn down per run
- **Baselines:** twelve PNGs under `baseline/` with `.sha1` sidecars, plus `manifest.json`

## Status manifest

`baseline/manifest.json` records every capture as `pending-approval` (this unit's candidates: `01-title.png`, `12-journey-midrun.png`) or `interim` (a regression reference for this unit only, re-established by the presentation follow-up unit). None is approved; approval is recorded at the review surface, never in the manifest. Capture mode rewrites the manifest; check mode never writes to `baseline/`.

The build identifier changes with every commit, so the capture harness masks it to a fixed token after asserting it present and non-empty on the title screen; capture hashes are thereby independent of the identifier, and `build_id_check.py` asserts the identifier against the served preview.

## Screens Captured

| Step | Baseline | Status | How reached |
|------|----------|--------|-------------|
| title | `01-title.png` | pending-approval | Boot (build id masked) |
| settings | `04-settings.png` | interim | SETTINGS from title |
| save-load-confirm | `05-save-load-confirm.png` | interim | LOAD GAME, occupied autosave slot (dev hook) |
| dossier | `09-dossier.png` | interim | NEW GAME, chargen dossier |
| dossier-reroll | `10-dossier-reroll.png` | interim | REROLL on the dossier |
| lore-card | `02-lore-card.png` | interim | DEPLOY into the lore card |
| hud-midrun | `03-hud-midrun.png` | interim | Walk to the first event (rail visible) |
| journey-midrun | `12-journey-midrun.png` | pending-approval | Mid-run with choices showing and the clock at a middle value (real HUD path) |
| comms-interrupt | `07-comms-interrupt.png` | interim | Dev hook (comms is clock-gated; unreachable in short runs) |
| document-overlay | `11-document-overlay.png` | interim | Walk to a documented event |
| reward-overlay | `06-reward-overlay.png` | interim | Walk to stop 1's reward |
| ending | `08-ending.png` | interim | Dev hook (natural run flow stalls at the approach-event reward) |

### Dev-only hooks

Surfaces that balance gating or run length put out of natural reach are rendered through `window.__wp`, present **only when `import.meta.env.DEV`** (stripped from production builds): `triggerComms`, `triggerEnding`, `triggerReward`, `seedAutosave`, `setClock`, `setKnowledge`, `setModules` (presentation probes through the real HUD path), `dossierExtreme`, `showDocument`, `gotoScene`, `hideOverlays`, and `stageFixture` (the isolated bare-stage host). They drive presentation overlays, the real HUD refresh path, and real save-manager calls only: no engine mechanics, and the production page exposes no `__wp` control object (asserted by the screen-walk check).

## Network rule

Every same-origin request that fails is a failure. A response with HTTP status 400 or above fails; a transport failure (`requestfailed`) fails with its actual reason recorded, except for one narrow evidenced class: BGM media loads under `/assets/audio/` aborted in transport (`net::ERR_ABORTED`, no HTTP status) are the audio crossfade cancelling in-flight loads, classified and reported, never treated as asset defects. Because the dev server SPA-fallbacks missing files (a missing asset returns 200 text/html rather than a 404), an asset or data path answered as HTML is also a failure carrying its actual status. Zero non-origin requests remain the self-contained contract.

## Related

| Document | Relationship |
|----------|--------------|
| [Composition contract](../docs/presentation/composition-contract.md) | The regions, type scale, and palette the checks measure |
| [Gate 5.1 reference record](../docs/presentation/gate-5.1-reference-record.md) | The parity baseline the harness outputs compare against |
| [Vendor provenance](../vendor/gc/README.md) | The pinned framework tree the UI consumes |
| [Presentation review surface](../docs/verification/2026-10-04-presentation-review.md) | Where the candidate captures await the operator |
