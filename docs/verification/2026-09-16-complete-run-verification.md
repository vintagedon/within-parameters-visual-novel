<!--
---
title: "Complete Run Verification"
description: "Gate 4.8 review surface: natural-run evidence and findings for the complete playable run spec"
author: "executor agent"
date: "2026-09-16"
version: "1.0"
status: "Ready for operator review"
tags:
  - type: verification-report
  - domain: [engine, content, verification]
  - tech: [typescript, playwright]
related_documents:
  - "[Spec 04](../../../spec/2026-06/2026-09-15-wp-spec-04-complete-playable-run.md)"
  - "[In-repo worklog](../../work-logs/05-complete-playable-run/worklog.md)"
---
-->

# Complete Run Verification — Gate 4.8 Review Surface

This is the approval artifact for WP Spec 04 (complete playable run on
placeholders). Everything below is drawn from the evidence produced by the
gates, not from the spec's assertions. Reproduction commands are listed with
each check. Every finding ends with a closed question for the operator.

## Verification environment

- Production build (`npm run build`), served by `vite preview`. In the
  production bundle `import.meta.env.DEV` is false, so the `window.__wp`
  development hooks do not exist: no hooks, no injected endings, no forced
  state.
- Harness: `tests/complete_run.py` (Playwright, Chromium headless). Seeds are
  recorded per run in the results below. Screenshot baselines hashed before
  and after every execution.

## Natural-run set (all complete)

37 runs completed; every seed below reproduces its run exactly. Strategies
are click policies over the real UI (reward-card and choice preferences);
they never touch engine state.

| Seed | Strategy | Ending | Score | Docs read | Comms tiers |
|------|----------|--------|-------|-----------|-------------|
| 555555 | knowledge | destruction | 55 C | 0 | green, amber |
| 555555 | knowledge (resumed from slot 1) | destruction | 55 C | 0 | amber |
| 20260916 | knowledge | clock-failure | 35 D | 2 | green, amber |
| 20260916 | consumable | clock-failure | 45 C | 2 | green, amber |
| 7 | clockburn | clock-failure | 11 F | 3 | green, amber |
| 11 | knowledge (1 reroll) | destruction | 50 C | 1 | green, amber |
| 42 | consumable | destruction | 64 B | 3 | green, amber |
| 99 | clockburn | destruction | 36 D | 2 | green, amber |
| 31337 | knowledge | destruction | 61 B | 2 | green, amber |
| 2027 | consumable | destruction | 72 B | 2 | green, amber |
| 12345 | clockburn | clock-failure | 11 F | 3 | green, amber |
| 777 | knowledge | destruction | 61 B | 2 | green, amber |
| 8888 | consumable | destruction | 62 B | 2 | green, amber |
| 90210 | clockburn | destruction | 34 D | 1 | green, amber |
| 60606 | knowledge | destruction | 69 B | 3 | green |
| 40404 | consumable | destruction | 63 B | 1 | green, amber |
| 501-505 | correction | destruction | 59-67 | 1-3 | green, amber |
| 506 | correction | correction | 83 A | 1 | green |
| 601-614 | redhunt (reroll to Exhausted) | mixed | 6-33 | 1-3 | green, amber |
| 615 | redhunt (reroll to Exhausted) | clock-failure | 5 F | 1 | green, red |

Set coverage: all three endings (11 clock-failure, 24 destruction, 2
correction), rerolls, found-document reads (44 across the set), comms at
green, amber, and red, and one mid-run save-and-resume whose completed score
equals its uninterrupted twin (55 C, both).

## Checks

| Check | Result | Reproduction |
|-------|--------|--------------|
| At least ten seeded natural runs complete | PASS (37) | `/opt/agents/venv/bin/python tests/complete_run.py` |
| All three endings reached naturally, each at least once | PASS | same |
| Set covers reroll, found-document read, comms at each tier, save-and-resume | PASS | same |
| Zero uncaught console errors across the set | PASS | same |
| Zero failed required asset requests by HTTP status | PASS | same |
| No run reports `No eligible events` | PASS | same |
| Harness writes nothing into `tests/baseline/` | PASS (dir hash unchanged) | same |
| Live choice resolution matches the resolver for all trait combinations | PASS (4608/4608) | `npm run test:live` |
| All 64 combos complete without deadlock | PASS (128/128 runs) | `npm run test:live` |
| Every gated choice reachable at a legal knowledge value | PASS (5/5 gated choices) | `npm run test:live` |
| Event mechanics match `simulation/game_data.py` exactly | PASS (36/36 choices) | `npm run audit:events` |
| Mutation checks discriminate (4.1 and 4.2) | PASS | `npm run test:mutation` |
| Replay harness still passes 6/6 | PASS | `npm run replay` |
| Production build ships every source-present manifest asset | PASS (36/36) | `npm run build && node scripts/check-dist-assets.mjs` |
| Preview run segment, zero failed requests by HTTP status | PASS | `/opt/agents/venv/bin/python tests/preview_check.py` |
| Screenshot baselines deterministic (capture, check x2) | PASS | `npm run test:screens && npm run test:screens:check` |

Spec 03 amendment harness repairs confirmed holding: check mode is read-only
against `tests/baseline/` (sidecar comparison only), and every declared screen
is required in both modes (the walk fails on any missing step). The third
defect named by this spec is repaired in the new harness: failed asset
requests are determined from `page.on("response")` HTTP status, not from
console-message text (`tests/complete_run.py`, response listener).

## Findings

Each finding carries an ID, a statement, file-and-row evidence, and a closed
question. Confirming or denying the finding is an operator yes/no; follow-up
work belongs to a future spec.

### F-01 — No live/resolver outcome divergence remains

**Statement.** After gate 4.1, no trait combination produces a live outcome
that differs from the resolver's.

**Evidence.** `src/engine/live-checks.ts` (4.8 evidence check) drives the
real `SceneRunner.selectChoice` for all 64 trait combinations x 36 choices x
both Practiced states (4608 resolutions) and compares the resulting state
against a direct `applyChoiceEffects` call: identical in knowledge,
consumables, clock, and community state. The three 2026-09-13 review cases
were reproduced failing against the pre-change tree and pass now.

**Closed question.** Accept the 4608/4608 matrix as sufficient evidence that
the browser and the simulator now agree? (yes/no)

### F-02 — No trait combination deadlocks a run

**Statement.** All 64 trait combinations complete runs without an
unreachable or unaffordable choice deadlocking the player.

**Evidence.** `src/engine/live-checks.ts` (4.8 evidence check): 128/128
full journeys (64 combos x 2 seeds) completed with an enabled choice
available at every decision, including Stubborn-forced community events and
Exhausted jitter. Every event carries at least one free, ungated choice.

**Closed question.** Accept 128/128 as sufficient deadlock evidence?
(yes/no)

### F-03 — Two audio source files remain absent; nothing blocks a run

**Statement.** Exactly two manifest-referenced source files are absent:
`sfx-click.mp3` and `sfx-alert.mp3`. No portrait or background is missing
any more (the dossier portraits were generated in gate 4.6). No absence
blocks a run: the current content never triggers an SFX key, so the files
are never requested.

**Evidence.** `data/characters.json` rows 204-205 (the two audio entries);
`scripts/check-dist-assets.mjs` output (36/36 source-present assets in the
build; the two findings enumerated); the complete-run HTTP log recorded
zero failed requests across 37 runs, and zero requests for the sfx paths.

**Closed question.** Source the two SFX files in the audio pass and keep the
manifest as is? (yes/no)

### F-04 — Every gated choice is reachable

**Statement.** No event contains a choice that is unreachable at every legal
knowledge value.

**Evidence.** `src/engine/live-checks.ts` (4.8 evidence check): the highest
gate is knowledge 5 (`data/events.json`, AE-02 choice A); the knowledge a
legal run can hold by each event's latest drawable stop exceeds every gate
(CE-02 k>=3 vs 4 attainable; CE-05 k>=4 vs 4; TE-03 k>=3 vs 12; AE-02 k>=5
vs 16; AE-03 k>=4 vs 16). Note the margin is thin at community stops: CE-05
requires an exact maximum through two stops, which is part of the validated
difficulty shape.

**Closed question.** Accept reachability-by-latest-draw as the standard?
(yes/no)

### F-05 — The 25-35 minute target is not met; the gap is content volume

**Statement.** A natural run currently exposes roughly 2,100-4,800 dialogue
characters (median 3,380). At the locked typewriter speed (30 ms/char) that
is about 63-144 seconds of typing (median 101 s); adding generous human
dwell time for ~25 decisions and up to three found documents puts an
attentive run around 5-8 minutes, and a leisured one near 15. The 25-35
minute target is not reachable at this content volume. The gap is volume,
not pacing: no artificial slowdown or gate would close it honestly.

**Evidence.** `data/config.json` row 31 (`typewriterSpeed: 30`); the
character counts above from the 37 recorded runs; content volume in
`data/scenes.json`, `data/events.json`, and `data/found-documents.json`.

**Closed question.** Which response do you want: (a) accept shorter runs and
retire the target, (b) commission a content expansion spec (more events,
longer beats, more documents), or (c) slow presentation (typewriter, pacing)
knowing it pads rather than adds? (a/b/c)

### F-06 — The red comms tier is nearly unreachable at the authored trigger points

**Statement.** The red tier's beats (clock 7-9 at trigger) almost never fire
in natural play. After stop 1 the clock cannot exceed 3 (one tick of at most
2 plus at most +1 from a choice), so beat A is always green; amber requires
starting-clock help that natural play does not have. After stop 3, reaching
7 needs the maximum tick on all three stops plus a clock-positive transit
choice; across 15 Exhausted-protagonist clockburn attempts exactly one run
(seed 615) hit red. A third of the authored comms content is effectively
dead.

**Evidence.** `data/comms-beats.json` rows 51+ (red band 7-9) and the
`afterStop: 1` / `afterStop: 3` timing (rows 10, 33, 56); the tick model in
`src/engine/game-state.ts` rows 119-134 (base 1, jitter +1 at 35%);
`data/config.json` rows 6-7. One red occurrence in the run table above.

**Closed question.** Rebalance the tier bands (for example green 0-2, amber
3-5, red 6-9) or move a trigger later, in a content spec? (yes/no)

### F-07 — FD-01 names a fixed protagonist under randomized rolls

**Statement.** The first found document's title and body name "Unit
Vasquez, M." holding the RELAY-7 credentials. Under randomized protagonists
the name matches only one possible roll (Mara Vasquez). It is an artifact
of the fixed-protagonist draft era and reads as a continuity error for
every other roll.

**Evidence.** `data/found-documents.json` rows 6-8 (FD-01 title and body).

**Closed question.** Slot-ify the name to the rolled protagonist, or keep
it as an in-world record of a previous RELAY-7 holder (which would need one
line of framing text)? (slot-ify/keep-with-framing)

### F-08 — Destruction runs reflect the intervention spend in the final inventory

**Statement.** The outcome is computed and frozen from the arrival state
(the state the simulator's ending determination sees), then the effective
repair cost is charged once at the point of repair. For correction runs
this is arithmetically identical to the simulator. For destruction runs the
player's final module count is lower than a hypothetical simulator run by
the fix cost, because the shutdown intervention physically spends it. Score
parity for ending determination is preserved; inventory presentation
differs by intent.

**Evidence.** `src/engine/scene-runner.ts`, `selectFacilityAction` and
`persistedOutcome` (outcome computed pre-charge, single charge after);
`src/engine/scoring.ts` rows 29-38 (locked determination) and 88-118 (locked
cascade, untouched).

**Closed question.** Confirm this accounting is the intended reading of the
single-charge rule? (yes/no)

### F-09 — Disposition question for untracked `docs/project-brief.md`

**Statement.** `docs/project-brief.md` is untracked and operator-owned. Per
the spec it was neither committed, moved, nor deleted by this run.

**Evidence.** `git status` shows the file untracked throughout the branch;
no commit in this spec's chain touches it.

**Closed question.** Where should it live: committed into `docs/`, moved to
the platform docs tree, or left untracked? (commit/move/leave)

## Operator answer record

| Finding | Question | Answer |
|---------|----------|--------|
| F-01 | Matrix sufficient | |
| F-02 | Deadlock evidence sufficient | |
| F-03 | Source SFX in audio pass | |
| F-04 | Reachability standard | |
| F-05 | Run-length response (a/b/c) | |
| F-06 | Rebalance comms tiers | |
| F-07 | FD-01 name handling | |
| F-08 | Accounting confirmed | |
| F-09 | project-brief disposition | |
