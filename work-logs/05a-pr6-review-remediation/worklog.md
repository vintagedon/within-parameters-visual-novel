<!--
---
title: "PR 6 Review Remediation Worklog"
description: "Per-gate checkpoint worklog for WP spec 04 amendment A (PR 6 review remediation); mirrored to the central worklog at closeout"
author: "executor agent"
date: "2026-09-26"
version: "1.0"
status: "active"
tags:
  - type: worklog
  - domain: [engine, content, verification]
  - tech: [typescript, json, playwright]
# --- Runtime Context (required) ---
agent: "kilo"
runtime: "kilo"
runtime_version: "kilo"
model: "kilo/zai-coding/glm-5.3"
hostname: "ml01"
spec_ref: "spec/2026-09 (active queue; archive destination spec/2026-06/2026-09-26-wp-spec-04a-pr6-review-remediation.md per gate A1.8)"
repo: "within-parameters-visual-novel"
category: "game-design"
# --- Token Usage and Cost ---
token_usage_source: "unavailable"
---

# Worklog: WP Spec 04 Amendment A — PR 6 Review Remediation

Branch: `agent/wp-spec-04-complete-playable-run` (parent's branch, reused per
the amendment's startup exception; PR 6 open against `main`). Starting head:
`c1e19e0` (confirmed exact match at startup). Base for the parent branch:
`2272814`. Working tree clean except the known untracked operator-owned
`docs/project-brief.md`, untouched.

Independent review evidence used as cross-check only (gitignored, not
committed, not cited as authority): `staging/2026-09-17-pr6-review/`.

## SAVE-phase enumeration (A1.1 input, recorded before the checks)

SAVE lives in the journey HUD sidebar (`#hud-save`). It is reachable exactly
when the sidebar is visible and no inset-covering overlay is up:

| # | Phase | SAVE reachable? | Mechanism |
|---|-------|-----------------|-----------|
| 1 | Event dialogue — arriving / situation (mid-event, before a choice) | yes | bottom-bar advance leaves sidebar free |
| 2 | Event choice point | yes | choices render in the bottom bar |
| 3 | Consequence dialogue (after a choice, before reward selection) | yes | bottom-bar advance |
| 4 | Reward selection | no | `#reward-overlay` is `position: fixed; inset: 0` and covers the sidebar |
| 5 | Found document | no | `#document-overlay` is `position: fixed; inset: 0` and covers the sidebar |
| 6 | Comms window (after a reward, before the next stop draws) | yes | `#comms-overlay` is a 320 px corner panel; sidebar stays free |
| 7 | Facility scenes (entry, confrontation choices, consequence) | yes | journey HUD scenes |
| 8 | Ending screen | no | `onEnding` switches the layout to fullscreen; HUD hidden |
| — | Chargen dossier | no | fullscreen layout before the HUD exists |

Phases 4 and 5 are listed for completeness: the UI never offers SAVE there
(inset-covering overlays), and the engine-level check still proves a save
taken in those states resumes correctly, so a future UI change cannot
reintroduce the defect silently.

## Gate A1.1: A resume check that can fail

**Changes.**

- `src/engine/live-checks.ts`: the Node localStorage shim is now a real
  in-memory store so `SaveManager` writes round-trip. The clone-only "restored
  state matches field by field" check (which compared a JSON clone of a save
  with its own source and never built a runner) is replaced by a real resume
  suite:
  - `A1.1 save/resume: every SAVE-enabled phase restores field-by-field from
    a SaveManager slot and completes at twin parity` — for each phase in
    `SAVE_PHASES`: drive to the phase point, save through `saveToSlot`, load
    back through `loadSlot`, discard the runner, rebuild one exactly as the
    LOAD path does (fresh registry, effective config re-derived from the
    saved protagonist, stateless RNG, `restoreEngine`), assert the restored
    set (stats, clock, stop, communities, protagonist and traits, effective
    config re-derivation, RNG state, pool and used ids, Practiced
    availability, reroll count, persisted outcome, registered renderable
    current scene), then complete to parity with an uninterrupted twin
    (ending, score, grade, and reward-grant count — a second grant fails).
  - `A1.1 save/resume: advanced-RNG fixture restores the exact stream
    position` (P5/N7 Exhausted jitter, saved at a stop-3 choice) and
    `A1.1 save/resume: Practiced fixture restores the consumed-discount
    state` (P8/N2, saved after the discount was consumed). Both pass
    unmutated; dropping the respective restoration makes the same check fail.
  - Fixture phases stamp the traits onto the run state exactly as
    `deployProtagonist` does, so slots carry the protagonist the config came
    from.
- Dead assertions removed per the amendment: the always-true
  `... || true` sanity line at the 4.6 epilogue check (replaced with two
  assertions that can fail), the tautological
  `buildEffectiveConfig(baseConfig,'P2','N4')` self-comparison (the whole
  clone-only check it lived in is gone), and the dead `knowledge`/
  `consumables` parameters of `driveFacilityToEnding`. A search for `|| true`
  and for self-comparisons of pure calls returns nothing.
- `scripts/run-mutation-checks.mjs`: two mutations added — dropping the RNG
  stream restoration and dropping the Practiced availability restoration in
  `restoreEngine`. Verified by hand on scratch copies: the RNG mutation fails
  `advanced-RNG fixture restores the exact stream position`; the Practiced
  mutation fails `Practiced fixture restores the consumed-discount state`.
- `tests/resume_check.py` (new): browser-level resume check on the production
  build through real controls only — HUD SAVE, reload, LOAD GAME, CONFIRM,
  and CONTINUE from the discovery-scene autosave. Asserts per phase: journey
  layout (no `fullscreen`), sidebar, clock, stats, route, and SAVE visible;
  saved HUD readings restored; an actionable continuation (dialogue/choices/
  comms overlay) that advances when acted on.

**Discriminating evidence against the pre-A1.2 tree (recorded before any
A1.2 repair):**

- Engine-level: the phase suite fails at exactly the comms window —
  `comms: current scene evt-ce02-reward is registered` — the R1 stale
  event-scene id with nothing registered in a fresh registry. Every other
  phase (including reward-pick and document at the engine level) passes, and
  the twin-parity assertions hold where resume works.
- Browser-level (seed 555555, production build):
  `event-choice` and `event-consequence` fail with
  `#game-container still fullscreen after load`, and the comms phase fails
  the same way at 2560x1440 (the viewport the independent review used to
  reach the occluded SAVE control) — R2. `facility-entry` and
  `autosave-continue` pass pre-repair because `scene-facility-01` and
  `scene-discovery-01` carry `showGameUI`, which restores the layout on
  scene start; R2 is specific to event-scene resumes, and both entry points
  are still guarded by the check so a regression cannot slip through.
- Harness note: at the 1440x900 harness viewport the corner comms panel
  physically occludes the sidebar SAVE control, so the comms phase is
  exercised at 2560x1440 and recorded here. Reward-pick and document are not
  exercisable through real controls at any viewport (inset-covering
  overlays); they are exercised at the engine level.

**Verification at the gate boundary:** `tsc --noEmit` clean;
`npm run test:live` 29/30 with only the expected comms-phase failure;
`npm run test:mutation` 4/4 mutations discriminate;
`npm run replay` 6/6; `npm run build` clean.

**Commit:** `3863a36` — test: resume checks that can fail (gate A1.1); branch pushed, PR 6 updated in place.

## Gate A1.2: Save and resume repairs

**Final SAVE policy per phase** (the A1.1 list; every phase resumes — no
phase needed SAVE disabled, and the one action that could not do what it
said was the AUTOSAVE row, now disabled with a reason):

| Phase | Policy | Resumable continuation |
|-------|--------|------------------------|
| Event dialogue / choice / consequence | SAVE enabled; resumes | `activeEventId` re-registers the event's scenes on restore; the saved scene reloads and the run continues |
| Reward selection | SAVE not offered (inset-covering overlay) | engine-level: resumes and re-offers the same rewards; nothing granted before the pick |
| Found document | SAVE not offered (inset-covering overlay) | engine-level: resumes and re-surfaces the unread document; the read applies exactly once |
| Comms window | SAVE enabled (corner panel; reachable at larger viewports) | snapshot `resumePhase: 'comms'` — the saved current scene anchors to the registered `scene-journey-transition` hold scene; resume re-enters the stop transition, the beat re-fires, and the already-taken reward is not re-granted |
| Facility scenes | SAVE enabled; resumes | base scenes; the persisted outcome authority is untouched |
| Ending | SAVE not offered (fullscreen; HUD hidden) | n/a |

**Repairs.**

- `src/engine/scene-runner.ts`: comms-hold anchoring and resume — the hold
  scene is registered by every runner; `beginCommsHold()` sets
  `resumePhase: 'comms'` on the snapshot and anchors `currentScene`/
  `currentBeat`/`eventPhase` to the hold; `start()` resumes a comms marker
  through the stop transition (refreshing the HUD first, since no scene
  loads before the player acknowledges); `restoreEngine` recognizes legacy
  pre-amendment comms saves by shape (mid-journey, no active event,
  `eventPhase` null, current scene unresolvable) and resumes them the same
  way, so a pre-amendment slot neither stalls nor duplicates effects. Pool
  ids missing from the loaded data are dropped from the restored pool (no
  `undefined` can enter it). New exported `slotResumeProblem()` is the one
  validation shared by the UI and the engine: it accepts every resumable
  shape (base scene, active-event scene, comms snapshot, legacy comms) and
  refuses a save whose active event is absent from the build's data.
- `src/main.ts`: `startGameFromState` restores the journey layout
  (`setGameUI`) before the first scene renders — a loaded run shows sidebar,
  clock, stats, route, and SAVE exactly like an unsaved run (R2). All three
  load entry points (title LOAD, title CONTINUE, ending-screen title LOAD)
  route through `loadSlotGuarded`: a refused load shows a visible
  `LOAD FAILED` dialog naming the problem, preserves the slot byte-for-byte,
  and leaves the title and its LOAD control usable. No silent no-ops remain.
- `src/ui/screens.ts`: the AUTOSAVE row's action is disabled in save mode
  with the reason "written automatically at journey points" — visible, not
  hidden; there is no path that closes an overwrite confirm without effect.
  `showDocumentOverlay` resets `#document-body.scrollTop` after the overlay
  becomes visible (scroll writes on a `display:none` element are ignored and
  the browser restores the old position on show — the original reset was a
  no-op twice over).
- `src/types/state.ts`: `EngineSnapshot.resumePhase` for the resume
  contract (explicitly permitted type change).

**Checks added** (`src/engine/live-checks.ts`): nonexistent pooled event id
degrades (dropped from the pool, no `undefined`, remaining route completes);
nonexistent active event id is refused by `slotResumeProblem` (names the
missing id, slot untouched); a legacy pre-amendment comms slot (stale
`evt-*-reward` id, `resumePhase` stripped, `eventPhase` null) resumes
through the transition to twin parity with no second grant; the shared
validation accepts every resumable shape and refuses unresolvable ones.

**Browser phases added** (`tests/resume_check.py`, real controls on the
production build): save-menu policy (AUTOSAVE action disabled and visible
with its reason; an enabled SLOT 2 save writes and closes); load refusal
(poisoned slot → CONFIRM → `LOAD FAILED` naming `CE-99` → OK → title usable,
slot preserved); legacy comms slot (real comms save mutated to the R1 shape
→ LOAD → CONFIRM → journey HUD visible, comms overlay re-fires, run
continues); document scroll (first long document scrolled to a non-zero
offset, closed, second long document opens at `#document-body.scrollTop`
0; the phase constrains the body's height because real bodies do not
overflow at the harness viewport — geometry is the fixture, the reset is
the behavior under test).

**Verification:** `tsc --noEmit` clean; `npm run test:live` 34/34;
`npm run test:mutation` 4/4 discriminate; `npm run replay` 6/6;
`npm run audit:events` 36/36; `tests/resume_check.py` 9/9 phases on the
production build.

**Commit:** (recorded after commit)
