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

## Gate 4.2 — A single authoritative ending outcome

**Commit:** (recorded at closeout)

**Changes:**

- `src/engine/scene-runner.ts`: ending determination is now solely the
  state-based derivation in `scoring.ts` against the effective config. New
  `persistedOutcome()` computes the outcome (with its frozen cascade
  components and reroll multiplier) once and stores it on `GameState.outcome`;
  `triggerEnding` routes by the persisted ending; ending scenes fire
  `onEnding` from the persisted value, never from the authored
  `flags.endingType` (advisory only). Facility choices carry
  `facilityAction: 'correct' | 'shutdown' | 'withdraw'`: gates and labels
  resolve from `config.knowledgeThreshold` / `config.consumableFixCost`
  (trait-adjusted: Clear-Headed, Fragile Kit). The outcome is computed and
  persisted from the PRE-charge arrival state (exactly what the simulator's
  `determine_ending` sees), and the effective repair cost is charged exactly
  once at the point of repair; the frozen breakdown means no ending path or
  score display deducts it again.
- `src/types/scene.ts`: `Choice.facilityAction`, `SceneFlags.determineEnding`;
  `endingType` documented as advisory.
- `src/types/state.ts`: `RunOutcome.components` + `RunOutcome.multiplier`
  (the field the persisted outcome needs so no consumer recomputes).
- `src/ui/screens.ts`: the ending score breakdown renders from the persisted
  outcome (fallback recompute only for legacy dev-hook states without one).
- `src/main.ts`: HUD refresh prefers `runner.getEffectiveConfig()` so the
  knowledge bar's threshold and the ending gate read the same object.
- `data/scenes.json`: the scaffold Knowledge-8 gate and the authored
  `-2` repair statChanges are removed; the facility confrontation offers the
  three config-gated intervention choices.

**Verification evidence:**

- Live-path checks: 12/12 passed. Gate 4.2 additions: threshold boundary
  below/at/above under Clear-Headed (k9 destruction, k10/k11 correction,
  narrative == independently scored == persisted in every case); the
  knowledge-8 review probe (destruction everywhere, outcome non-null — the
  pre-change narrative/scored disagreement is gone); repair charged exactly
  once under Fragile Kit (5 -> 2 at fixCost 3; rawScore equals the pre-charge
  cascade, so no second deduction); clock-failure persisted and consumed
  identically; HUD threshold display flips the gate exactly at the effective
  threshold.
- Mutation check: forcing authored ending routing to override the computed
  outcome makes 2 checks fail (discriminates).
- Grep: no `8`/`11` knowledge-threshold or repair-cost gating comparison
  remains in `src/` (all read from the effective config).
- `tsc --noEmit` clean. Full `npm run replay` (5000/combo): ALL SIX criteria
  pass. (Note: `replay:fast` at 2000/combo can sample S-tier at 20.2%, just
  outside the band; the full run passes at 19.7%. The harness is untouched by
  this gate.)

**Findings raised:**

- FINDING 4.2-A (accounting note for operator confirmation): the simulator
  never models the facility transaction; `determine_ending` runs on the
  arrival state and the destruction cascade counts arrival modules. The live
  engine preserves that exactly by computing and persisting the outcome before
  charging the repair, then charging once at the point of repair. The player's
  post-ending inventory therefore reflects the intervention (arrival minus
  fixCost) while the frozen breakdown reflects the arrival-state cascade —
  identical to simulator arithmetic for correction runs and consistent with
  the authored shutdown fiction for destruction runs.

## Gate 4.3 — The 12-event production pool

**Commit:** (recorded at closeout)

**Changes:**

- `data/events.json` replaced with the full M3 pool: CE-01..CE-05 (community),
  TE-01..TE-04 (transit), AE-01..AE-03 (approach). Situation framing, NPC
  references (Aguilar, Dex, Sato, generic engineer), per-choice consequence
  dialogue, and reward trilemma flavor all from the M3 design; every
  mechanical value from `simulation/game_data.py`. Labels carry no cost or
  gate text (the runtime resolves effective costs and gates into the view).
  Found-document attachment lists (`foundDocumentIds`) match the M3 table:
  CE-01 [FD-01, FD-02], CE-04 [FD-08], TE-02 [FD-03, FD-04], TE-04
  [FD-05, FD-06], AE-03 [FD-07].
- `src/types/event.ts`: `EventDef.foundDocumentIds` (runtime wiring in 4.4).
- `data/characters.json`: speaker entries for aguilar / dex / sato / engineer
  (expressions temporarily map to existing placeholder portrait files until
  4.6 generates dedicated keys).
- New `scripts/audit-events.py` (`npm run audit:events`): imports
  `simulation/game_data.py` directly (no parse heuristics) and diffs every
  choice value.
- Live-checks: new 4.3 pool check; the 4.1 finders now select deterministic
  target events from the full pool.

**Verification evidence:**

- `npm run audit:events`: all 36 choices match game_data.py exactly
  (knowledge, module, clock, community, knowledge_gate, rapport_gate),
  event-by-event rows recorded above in this run's output; pool shape
  5/4/3 with M3 ids; attachments match; every consequence scene carries
  dialogue; no scaffold gate text remains (`Requires Knowledge`,
  `[2 resources]` gone).
- Live-path checks: 13/13 including the pool draw check (20 seeded draws
  through the real `initEventPool`/`drawEvent`: zone-correct 2 community +
  2 transit + 1 approach per run, no repeats within a run, no unfilled stop,
  no `No eligible events`).
- `config.json` zone map confirmed 1-2 community / 3-4 transit / 5 approach.
- `tsc --noEmit` clean; mutation checks still discriminate (4 + 2 failures).

**Findings raised:** none new (the event shortage that killed natural runs at
stop 5 is resolved by filling the pool, not by duplication or fallback
widening).
## Gate 4.4 — Found documents

**Commit:** (recorded at closeout)

**Changes:**

- New `data/found-documents.json`: FD-01..FD-08 with full M3 text and
  `attachedEvent` metadata (CE-01 [FD-01, FD-02], CE-04 [FD-08], TE-02
  [FD-03, FD-04], TE-04 [FD-05, FD-06], AE-03 [FD-07]).
- `src/types/event.ts`: `FoundDocument` contract.
- `src/engine/scene-runner.ts`: documents live on the registry
  (`buildSceneRegistry(scenes, events, documents)`). At an event with
  attached documents, the reward phase first surfaces one document through
  the new `onFoundDocument` callback; acknowledging the panel IS the read:
  the runner applies `applyFoundDocument` (+1 knowledge, suppressed by
  Distracted) exactly once per event, guarded by the `fd-read-{eventId}`
  flag. The surfaced document is picked deterministically from
  `(runNumber + stop) mod ids.length`, so save/resume re-derives the same
  document without extra persisted state.
- `src/ui/screens.ts` + `src/styles.css` (new positioning block only, no
  existing visual values touched): `#document-overlay` renders the title and
  the full preformatted body in a scrollable panel with an ACKNOWLEDGE
  action.
- `src/main.ts`: loads found-documents.json, passes documents into both
  registry constructions, wires `onFoundDocument`.

**Design decisions (recorded):**

- Reading is not optional: the panel surfaces automatically before the
  reward cycle and acknowledging applies the gain. This mirrors the
  simulator (`has_found_document` always grants) rather than adding a
  player decision the validated balance never modeled.
- FD-01 names "Unit Vasquez, M." per the M3 text. Under randomized
  protagonists this is a continuity artifact of the fixed-protagonist era.
  The M3 design owns text, so it ships as authored; raised as a review
  finding for the operator (slot-ifying is a one-line content change if
  wanted).

**Verification evidence:**

- Live-path checks: 16/16. 4.4 additions: reading grants exactly +1 through
  the in-run surface (CE-01 surfaced FD-01); Distracted (N4) gains nothing
  while the document still surfaces; 8 documents exist with full text and
  correct two-way attachment; undocumented events surface nothing
  (availability tracks the draw).
- Browser smoke (Chromium, dev server, seeded runs, no dev hooks): the
  overlay rendered the full FD-01 text (830 chars) with zero console errors
  and zero page errors.

