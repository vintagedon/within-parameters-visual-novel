<!--
---
title: "WP Complete Playable Run Worklog (in-repo checkpoint)"
description: "Per-gate checkpoint log for spec 2026-09-15-wp-spec-04-complete-playable-run; mirrored to the central worklog at closeout"
author: "executor agent"
date: "2026-09-15"
version: "1.0"
status: "in-progress"
tags:
  - type: worklog
  - domain: [engine, content, narrative, verification]
  - tech: [typescript, json, playwright]
spec_ref: "../spec/2026-09-15-wp-spec-04-complete-playable-run.md"
repo: "within-parameters-visual-novel"
---
-->

# WP Complete Playable Run — In-Repo Worklog

Per-gate checkpoint log. The central worklog (mirroring the spec filename with
`spec` replaced by `worklog`) is written at closeout from this file.

## Startup

- Skill resolution: `spec-startup` and `spec-closeout` resolved from
  `/opt/agents/repos/local-agent-skills/skills/` (ML01 estate; closeout carries
  the astronomy-coding-bot trailer and the central `work-logs/work-registry.csv`).
- Environment: shared venv `/opt/agents/venv` (Python 3.12.3, Playwright 1.58.0
  Chromium), node v22.23.2, project-local node_modules with tsc/vite/esbuild.
- Constraint check: `main` contains `6a47552` (Spec 03 merged via PR #5). Branch
  `agent/wp-spec-04-complete-playable-run` created off `main` at `2272814`.
- Clean tree except untracked, operator-owned `docs/project-brief.md` (carried
  per operator instruction; spec forbids committing, moving, or deleting it).
- Operator interactions: none during gate 4.1 (Attended: No run; the empty
  record is stated here explicitly).

## Gate 4.1 — Live choice resolution through the validated resolver

**Commit:** (recorded at closeout)

**Changes:**

- `src/engine/scene-runner.ts`: `selectChoice` now routes event-phase choices
  through `applyChoiceEffects` (resolution.ts) with the effective trait config,
  the active event's category, and a per-stop `practicedAvailable` flag that
  resets on stop advance. New `getChoiceViews(scene)` produces player-facing
  choice views whose labels carry the effective module cost (Rough Touch +1,
  Practiced -1) and whose availability encodes authored knowledge/rapport
  gates, effective-cost affordability, and the Stubborn (N8) forced choice at
  community events (simulator's selection rule). New `getEffectiveConfig()`
  exposes the same config object the resolver reads. Non-event choices with
  authored `statChanges` are ignored with a warning (no raw-delta path remains
  reachable from a player choice).
- `src/ui/dialogue.ts`: `renderChoices` consumes runner-resolved views instead
  of raw choices + state; the disabled reason surfaces as a tooltip.
- `src/main.ts`: dialogue sequencer asks the runner for views.
- New `src/engine/live-checks.ts` + `scripts/run-live-checks.mjs`
  (`npm run test:live`) and `scripts/run-mutation-checks.mjs`
  (`npm run test:mutation`). No new dependencies (esbuild already present).

**Verification evidence:**

- Pre-change defect reproduction (scratch worktree of `main` at `2272814`,
  probe drove the real `SceneRunner.selectChoice` on real data):
  - Rough Touch community choice from 8 modules: `consumables 8 -> 6`
    (defect; fixed expectation 5)
  - Light Foot transit +1 clock: `clock 0 -> 1` (defect; fixed expectation 0)
  - Tunnel Nerves approach raw clock 0: `clock 0 -> 0` (defect; fixed
    expectation +1)
- Live-path checks (post-change): 7/7 passed, including the three review cases
  now asserting the fixed values (8 -> 5 under Rough Touch; clock unchanged
  under Light Foot; clock +1 under Tunnel Nerves from raw zero), label ==
  affordability == deduction, Practiced first-spend discount, no second-spend
  discount, reset on stop advance, and a no-trait control.
- Mutation check: reverting `selectChoice` to `applyStatChanges` with raw
  authored deltas on a scratch copy makes 4 checks fail (discriminates).
- `npm run replay` (5000/combo): ALL SIX validation criteria PASS; CSV parity
  64/64 combos within 5pp (max delta 1.39pp). Recorded as necessary but not
  sufficient per the spec.
- `tsc --noEmit` clean.

**Findings raised:**

- FINDING 4.1-A (baseline move): screenshot check reports a regression on
  `tests/baseline/06-reward-overlay.png`. Cause: the seeded capture run (seed
  2027) now charges trait-adjusted costs, so HUD values behind the reward
  overlay differ from the scaffold behavior. This is the intended mechanics
  move, not a presentation defect. Per spec constraint the baseline was not
  re-recorded in this gate; journey baselines will move again when gates
  4.3-4.6 land the production content, after which a single evidence-backed
  re-approval (art: commit) refreshes the moved set. Existing approved
  baselines otherwise unchanged (9 of 10 ok).
