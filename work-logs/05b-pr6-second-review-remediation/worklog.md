<!--
---
title: "PR 6 Second Review Remediation Worklog"
description: "Per-gate checkpoint worklog for WP spec 04 amendment B (PR 6 second review remediation); mirrored to the central worklog at closeout"
author: "executor agent"
date: "2026-09-26"
version: "1.1"
status: "completed"
tags:
  - type: worklog
  - domain: [engine, content, verification]
  - tech: [typescript, json, python, playwright]
# --- Runtime Context (required) ---
agent: "kilo"
runtime: "kilo"
runtime_version: "kilo"
model: "kilo/zai-coding/glm-5.3-flash"
hostname: "ml01"
spec_ref: "spec/2026-06/2026-09-15-wp-spec-04b-pr6-second-review-remediation.md"
repo: "within-parameters-visual-novel"
category: "game-design"
# --- Token Usage and Cost ---
token_usage_source: "unavailable"
---

# Worklog: WP Spec 04 Amendment B — PR 6 Second Review Remediation

Branch: `agent/wp-spec-04-complete-playable-run` (parent's branch, reused per
the amendment's startup exception; PR 6 open against `main`). Starting head:
`03893f4` (confirmed exact match at startup). Base for the parent branch:
`2272814`. Working tree clean except the known untracked operator-owned
`docs/project-brief.md` (excluded via `.git/info/exclude`; bytes preserved,
sha256 `f0f3431ef020c57cda2bb73e5567e678e0b9947a95a0744b94546795d2b558a7`
at startup). Staging discipline for this amendment: explicit paths only.

Startup environment: shared venv active (`/opt/agents/venv/bin/python`,
3.12.3); skills resolved from
`/opt/agents/repos/local-agent-skills/skills/` with ML01 identity confirmed
in `spec-closeout`. Review evidence used as cross-check only (gitignored,
not committed, not cited as authority):
`staging/2026-09-26-pr6a-review/`.

-->

## Gate A2.1: Withdrawal text asserts nothing false

**Changes.** `data/scenes.json`: the informed variant's invented history
("your kit went out keeping stations alive on the way here") replaced with
state-neutral wording ("your kit can't cover it" — true exactly when
modules < F, the render condition); both variants gained the same bridge
narrator line ("The mark you leave is not a fix. It is a map for the crew
that comes down here with a full kit.") so the destruction ending's archive
shutdown follows from the mark and the report. `src/engine/live-checks.ts`:
`driveToWithdrawGate` gained an optional scripted-choice policy; the
community-help-claim regex guards all three withdrawal checks; the new
zero-help check pins the review's recorded reproduction exactly.
`scripts/run-mutation-checks.mjs`: mutation A2.1 reinserts the false claim
into the informed variant.

**Sentence-by-sentence truth conditions.** Every sentence in each variant,
with the state condition under which it is true. "Renders" = the runner
selects the variant from the knowledge-above-threshold boolean
(`scene-runner.ts`); the withdrawal action is only enabled when k < T or
m < F blocks both executable actions, and the informed variant renders only
when k ≥ T while the uninformed renders only when k < T.

Variant 1 — informed (renders iff knowledge ≥ T and modules < F):

| # | Sentence | True when |
|---|----------|-----------|
| 1 | "You stand in front of the terminal holding the argument that would end this, and no way to hand it over." | knowledge ≥ T (the player holds the argument — the render condition) and modules < F (no way to hand it over — the other render condition). Both are guaranteed by the render rule. |
| 2 | "The correction wants bypass modules to bridge its maintenance circuit, and your kit can't cover it." | The correction's cost F is a config constant (always "wants modules"); "can't cover it" ⟺ modules < F — the render condition. |
| 3 | "I know exactly what's wrong with you. I just can't afford to fix it." | knowledge ≥ T and modules < F — the render conditions. |
| 4 | "You log out of the terminal, mark the rack row where it lives, and start the long walk back up the way you came." | Present-tense narration of the player's own action at this scene; asserts no run history. Unconditionally true. |
| 5 | "The mark you leave is not a fix. It is a map for the crew that comes down here with a full kit." | Refers to the mark just made (sentence 4) and states its purpose; asserts no run history. Unconditionally true. Bridge: the full-kit crew acting on the mark is what the destruction ending's "went offline at 0347" follows from. |

Variant 2 — uninformed (renders iff knowledge < T and modules < F):

| # | Sentence | True when |
|---|----------|-----------|
| 1 | "You stand in front of the terminal with nothing that can act on it." | No facility action is enabled (correct needs k ≥ T; shutdown needs m ≥ F; withdrawal is the only enabled action) — guaranteed in every state that renders this variant with the withdrawal choice taken. |
| 2 | "You don't have the documentation to argue whatever is wrong with this place" | knowledge < T — the render condition. |
| 3 | "and you don't have the components to force anything" | modules < F — the render condition. |
| 4 | "You mark what you found and fall back toward the surface." | Present-tense narration of the player's own action; "what you found" names nothing specific about run history. Unconditionally true. |
| 5 | "I got here. That's all I got." | The run did reach the facility (this scene). Unconditionally true. |
| 6 | "The mark you leave is not a fix. It is a map for the crew that comes down here with a full kit." | As informed #5. Unconditionally true; the bridge. |

**Validation evidence (gate A2.1).**

- `npm run test:live`: 44/44 (was 43/43). New: `A2.1 withdrawal: the
  zero-help reproduction renders no community-help claim` — P2/N6, seed 34,
  scripted recorded choices, reward index 1 (knowledge), reproduces the
  review's exact state (knowledge 13, modules 2, rapport 0, five
  communities ignored), renders the informed gate, no community-help claim,
  routes to a coherent destruction.
- `npm run test:mutation`: 7/7 rejected. New mutation
  `A2.1 reinserts the community-help claim into the informed withdrawal
  text` fails 2 live checks (the R3 informed check and the zero-help
  check).
- `npx tsc --noEmit`: clean.
- No threshold, cost, outcome rule, or scoring constant changed: the diff
  touches `data/scenes.json` text, live-check harness code, and the
  mutation script only.

**Commit:** `957bdc2` — feat: withdrawal text asserts nothing false, zero-help guard and bridge (gate A2.1); branch pushed, PR 6 updated in place.

<!--
Checkpoint discipline: one commit per gate, referencing the gate number,
staging explicit paths only. Update the commit SHA line above at commit
time.
-->

## Gate A2.2: Journey audio restored on load

**Changes.** `src/main.ts` (`startGameFromState` only): the load path now
calls `Audio.playBGM('bgm-ambient', false)` before the first loaded scene
starts. The instant (no-fade) restore cannot collide with a scene-declared
fade: `scene-facility-01` carries `bgm-tension`, which now crossfades over
the restored ambient loop exactly once — two synchronous fades leave a
stale timer that pauses the incoming track (observed during development
when the first cut restored ambient with a crossfade after `start()`:
facility-entry loaded with both loops paused). `playBGM` no-ops when the
loaded scene declares the ambient loop itself, so lore/status/discovery
resumes are unchanged. Muted preference preserved (volume 0). The audio
manager is untouched.

**Changes.** `tests/resume_check.py`: an `Audio`-constructor wrapper
(injected before app scripts) exposes real playback state; every
LOAD/CONTINUE phase captures the uninterrupted track at its save point and
requires the loaded run to converge on exactly that track (exactly one
music element playing, all others paused, post-crossfade); a new
`audio-muted-load` phase proves the muted preference restores at zero
volume; a new `title-dossier-no-journey-audio` phase proves title and
dossier navigation starts no journey audio (no load fixtures invented at
those surfaces). `scripts/run-audio-mutation.mjs` (new): the focused
event-choice phase passes unmutated; removing the restore line makes the
same phase fail with the focused `audio:` assertion and nothing else,
then restores the tree and rebuilds.

**Validation evidence (gate A2.2).**

- Full suite: 11/11 phases (`event-choice`, `event-consequence`, `comms`,
  `facility-entry`, `audio-muted-load`, `save-menu-policy`,
  `load-refusal`, `legacy-comms-slot`, `document-scroll`,
  `autosave-continue`, `title-dossier-no-journey-audio`).
- Mutation: `[GOOD] A2.2 dropping the journey audio restore: the focused
  audio assertion failed as required (presentation assertions still pass)`.
- `npx tsc --noEmit`: clean; production build clean.
- The two development findings recorded for the record: (1) the facility
  save point sits mid-crossfade (ambient→tension both playing), so the
  uninterrupted fixture settles before capture; (2) the manager's fade
  timers do not cancel, which is why the restore is instant.

**Commit:** `983202e` — feat: journey audio restored on load with browser and mutation coverage (gate A2.2); branch pushed, PR 6 updated in place.

## Gate A2.3: Clock reduction parity and truthful reward text

**Changes.**

- `src/engine/game-state.ts` (`calculateClockReduction` and its
  documentation only): `Math.floor` → `Math.trunc`, mirroring the
  simulator's `int()` truncation toward zero; docstring states the parity,
  the A2.3 repair, and why no clamp is added (the validated simulator's
  `apply_reward` applies `max(0, clock − reduction)`; changing that is a
  carried balance decision).
- `src/engine/event-system.ts` (`getRewardsForStop` only): the
  clock-reduction card's description is substituted from the immediate
  applied delta — `max(0, clock − reduction) − clock` — instead of the raw
  reduction. Removal shows the applied count (floored at what exists);
  zero shows "holds at N"; negative reduction shows "rises by N to M".
  `applyReward` untouched; the baseEffect is still `{ clock: −reduction }`.
- `src/engine/live-checks.ts`: new A2.3 section — the parity check spawns
  the simulator (`simulation/simulator.py` + `game_data.py`) and compares
  `calculateClockReduction` at rapport −6…+6 for default and Narrow Focus
  (executed expectations, not literals), with the review's named rapport-−1
  cell as a leading assertion; the text-agreement check sweeps 91 boundary
  states (rapport × clock) asserting displayed text == real `applyReward`
  delta.
- `scripts/run-mutation-checks.mjs`: mutation A2.3 reverts the trunc to
  `Math.floor`; the scratch tree now also copies the two simulator modules.
- `src/main.ts`: DEV-gated `__wp.triggerReward` boundary-fixture trigger
  (same class as `triggerComms`/`triggerEnding`; stripped from production)
  rendering the real reward overlay from controlled states.
- `tests/reward_boundary_check.py` (new): 5 browser boundary cases through
  the real card renderer and real `applyReward`.

**Validation evidence (gate A2.3).**

- `npm run test:live`: 46/46 (both A2.3 checks pass).
- `npm run test:mutation`: 8/8 rejected; the A2.3 mutation fails with
  `rapport -1 without Narrow Focus: expected 1, got 0` (verified from the
  mutated run's output, not inferred).
- `npm run replay`: 6/6 criteria; CSV parity 64/64 within 5 pp.
- `npm run audit:events`: 36/36 choices match.
- `tests/reward_boundary_check.py`: 5/5 (remove, zeroReduction,
  negativeReduction, clockEmpty, capped).
- `npx tsc --noEmit`: clean; production build clean.
- Review surface: carried clamp question recorded with simulator-derived
  ranges (zero at −3…−2 default; negative from ≤ −4; Narrow Focus zero
  for ≤ 1, never negative).
- Downstream note for A2.5: capture 06's rendered clock card ("Dead Power
  Run") will change wording — regeneration with attribution happens there
  or 06 is preserved, per the demonstrated-difference rule.

**Commit:** `a9b3b6d` — feat: clock reduction parity with the simulator and truthful reward text (gate A2.3); branch pushed, PR 6 updated in place.

## Gate A2.4: Regression guards that guard

**Changes.**

- `tests/complete_run.py`: (1) the correction strategy's reward branch now
  increments `decisions` (it had bypassed the increment, undercounting
  every correction-policy run by its five reward picks); (2) a new check
  asserts `instant_chars == Σ instant_breakdown` for every run — the
  aggregate that drives the duration estimate is validated against the
  same categories the reference assertions read.
- `scripts/run-counter-mutations.mjs`: mutation 3 reproduces the review's
  aggregate mutation (drops only the epilogue's contribution to
  `instant_chars`); each mutation now names the assertion that must fail,
  and mutation 3's named assertion is the aggregate check — the category
  references stay intact under it.
- `src/engine/live-checks.ts`: the corrected bound and the ordered
  assignment enumeration are extracted into `correctedUpperBoundFor` and
  `zoneAssignmentsFor`; the live reachability check drives them, and the
  synthetic self-credit fixture now passes its catalog through the SAME
  functions instead of computing a `bestOther + 2 + 1` replica. The
  fixture's rejection assert names self-credit leakage explicitly.
- `scripts/run-mutation-checks.mjs`: mutation A2.4 reintroduces self-credit
  into the shared evaluator.
- Review surface: F-04's "two gates" corrected in place (the check reports
  one — CE-05[2]); Amendment B section carries the refreshed F-05 table,
  the rounding/measurement separation, and the statement of record.

**Validation evidence (gate A2.4).**

- Full inventory re-run on the corrected build and counter: 37/37
  completed; 13/13 checks PASS including the new aggregate assertion;
  zero console errors; zero failed same-origin requests;
  `tests/baseline/` untouched.
- Outcome stability: all 36 full runs reproduce the recorded endings,
  scores, and grades exactly (verified programmatically against the
  recorded table) — the rounding repair changed no outcomes; the deltas
  are measurement-only (correction decisions 6 → 11; decisions minimum
  6 → 10; leisured median 11.84 → 11.94 minutes; attentive median 9.57 ≈
  9.6 unchanged).
- Seed 506 decisions: 11 = 5 event choices + 5 reward choices + the
  facility choice, as the review projected.
- `node scripts/run-counter-mutations.mjs`: 3/3 rejected, each against its
  named assertion.
- `npm run test:mutation`: 9/9 rejected; the A2.4 mutation fails the
  self-credit fixture (`bound 21 >= gate 10`) — verified from the mutated
  run's output. Unmutated fixture: `shared corrected evaluator bound
  6 < 10 (rejected)`.
- `npm run test:live`: 46/46 (the five positive legal-path proofs still
  pass through the shared evaluator).
- `npx tsc --noEmit`: clean; production build clean.

**Commit:** `a799f5b` — test: regression guards that guard, corrected counter, F-04/F-05 refresh (gate A2.4); branch pushed, PR 6 updated in place.

## Gate A2.5: Unobscured ending capture and evidence refresh

**Changes.**

- `tests/capture.py` (`capture_ending` only): dismiss any open reward
  surface through the real controls before `triggerEnding()`, and fail the
  harness if a reward surface is visible in the DOM at capture time. The
  game was not changed to suit the harness.
- `tests/baseline/`: 08-ending and 06-reward-overlay regenerated with their
  sidecars. 06's change is the demonstrated A2.3 cause: the captured Dead
  Power Run card reads "buying nothing — the intrusion clock holds at 0"
  (clock 0/10 visible behind the overlay) where the prior candidate said
  "buying 1 clock units". 08 is the ending screen unobscured. The other
  nine baseline files are byte-identical to the gate-start head.
- Evidence: `staging/2026-09-26-a25-ending-capture/` (before-head /
  after-candidate pairs for 06 and 08); the A1.6 pair directory's stale
  `after-candidate/05-save-load-confirm.png` refreshed in place — now
  byte-identical to the committed file and to `2272814` (sha1
  `48480a19…`).

**Validation evidence (gate A2.5).**

- Capture run: all green, zero non-origin requests, the DOM assertion
  (no reward surface at capture) passed on the 08 capture.
- Check run: 11/11 ok, baseline directory hash unchanged across the run.
- `git status tests/baseline/`: only `06-reward-overlay.png(.sha1)` and
  `08-ending.png(.sha1)` modified.
- Visual verification of both candidates (read as images): 08 shows
  epilogue + full breakdown + action row with no overlay; 06 shows the
  truthful clock text change.
- Review surface: A2.5 section with both pairs, pending-approval status,
  and the operator answer rows for the two new candidates.

**Commit:** `4adf537` — art: unobscured ending capture and truthful reward-text capture (gate A2.5); branch pushed, PR 6 updated in place.

## Gate A2.6: Spec defect register rows

**Changes.** Central register `/opt/agents/repos/spec/spec-defect-register.md`
(shared platform surface — no commit; frontmatter version 1.53 → 1.54):
appended SD-277 through SD-288.

- SD-277–SD-281: the five author defects from Amendment B's "Whose defect
  this is", source = PR 6's second review, evidence = executed Amendment A
  v1.1 quoted verbatim (A1.3 false-cause requirement and its single-claim
  validation; A1.1's five-element restored-state line; A1.5's counter
  validation; A1.5's synthetic-fixture validation; A1.6's pair-and-cause
  validation). Classes: `validation-drops-required-dimensions` ×3,
  `validation-scoped-by-artifact-not-property` ×1 (fourth instance; patch
  already owed), `detector-not-discriminator` ×1 (SD-167/168 lineage).
- SD-282: the rounding mismatch, attributed from the diff: `Math.floor`
  entered at `7f1d81d` (initial commit, engine build, pre-spec-driven
  history); commit `9d22488` (Spec 01 engine reconciliation, PR #3) rewrote
  `calculateClockReduction`, added the "Mirrors simulator.py" docstring,
  and kept `Math.floor` against the simulator's `int()`; its parity
  instrument was aggregate statistical replay, which a sign-dependent
  rounding difference cannot move. Class `detector-not-discriminator`.
- SD-283–SD-288: the six 04b pre-dispatch acceptance defects (preflight
  PF-01…PF-06), verbatim evidence from the preserved v1.0 snapshot
  (`reviews/2026-09-26-wp-spec-04b/original.md`). Classes:
  `validation requiring an unspecified contract change` (SD-283 — reaches
  the two-instance promotion threshold; patch owed to the skill repo),
  `spec-asserts-unverified-artifact-shape` (SD-284 — same, threshold
  reached, patch owed), `spec-internally-inconsistent` ×2 (SD-285, SD-286),
  `spec-asserts-unverified-state` (SD-287), `spec-contract-drift` (SD-288).

**Executor defects NOT registered.** The four executor defects against
clear text (the `docs/project-brief.md` sweep into `09bdfbb`, the
correction decision undercount, F-04's two-gates narrative, the stale 05
evidence copy) are named in the register entry as triaged
executor-attributed and deliberately carry no rows — registering them as
spec defects would claim the specs permitted them.

**Duplicate check.** SD-262–SD-270, SD-199, and the SD-173 vocabulary-gap
row checked before allocation; no duplicates. Existing classes only; no
vocabulary gap found that the existing classes do not cover, and none
invented. Append-count note records the increments (including the two
newly reached promotion thresholds as owed patches); class-table rows left
to the next full reconciliation per the register's derived-count
convention. The central spec tree is not a git repository, so the append
is recorded here rather than committed.

**Commit:** `3631659` — docs: spec defect register rows SD-277 through SD-288 (gate A2.6); branch pushed, PR 6 updated in place.

## Gate A2.7: Closeout

**Consistency pass (final head `3631659` + docs).** Fresh production build
clean; `npm run test:live` 46/46; `npm run audit:events` 36/36; screenshot
check (`--check`, read-only) 11/11 all green on run and re-run with the
baseline directory hash unchanged — a single transient
`07-comms-interrupt.png` regression appeared in one check run and passed
on immediate re-run; the baseline was untouched (check mode is read-only)
and no game or content change is involved. Recorded as a sub-P1 harness
observation carried to **Spec 05** (which already re-establishes every
baseline and moves the stage to 1920x1080); it is not remediated here.
Reused from unchanged suites per the amendment's reuse rule:
`npm run test:mutation` 9/9 and counter mutations 3/3 (A2.4/A2.5-final
code), `npm run replay` 6/6 (A2.3; replay inputs unchanged since),
`tests/complete_run.py` 13/13 on 37/37 runs (A2.4; final counter),
`tests/reward_boundary_check.py` 5/5 (A2.3), browser resume suite 11/11
(A2.2; `main.ts` and `resume_check.py` unchanged in effect since — the
A2.3 `main.ts` delta is a DEV-gated hook stripped from the production
build the suite runs).

**Operator interaction record.** No question was put to the operator
during this run. Every discretionary point (withdrawal and bridge wording,
reward-text wording, track resolution, aggregate design, helper naming,
test organization) was spec-delegated to the executor. The brief
disposition and preflight corrections were obtained by the preflight
before dispatch and are recorded there and in the review surface, not by
this run.

**Deviations noted (spec-closeout on the reused branch, per the
amendment's startup exception).**

1. The six gate commits reference their gate numbers and stage explicit
   paths only, but none carries the estate's attestation trailer; the
   Amendment A gate commits carried the `Co-authored-by` line. History is
   not rewritten (a constraint of this amendment); the closeout commit
   carries the full three-trailer block, and this deviation is the record.
2. The archive target named by the spec
   (`spec/2026-06/2026-09-15-wp-spec-04b-pr6-second-review-remediation.md`)
   carries the parent's date prefix while the active file is dated
   2026-09-26. The spec's explicit archive path is followed verbatim
   (placement beside the parent and Amendment A is the stated intent); the
   naming is recorded here.
3. Pre-existing drift recorded, not repaired (outside this amendment's
   scope): AGENTS.md's Key Documents table references
   `spec/archive/engine-spec.md`, `wp-simulator-spec.md`, `wp-sweep-spec.md`,
   and `wp-sweep-v2-spec.md`, but the repository's `spec/archive/` is empty
   and no central `spec/archive/` exists — the parent and Amendment A
   archives live at `/opt/agents/repos/spec/2026-06/`. Flagged for the
   operator; not silently edited.

**Docs pass.** AGENTS.md Current State: Amendment B added to Complete;
Known Open Findings restated (F-05 refreshed figures, F-04's one-gate
count, the carried clamp ranges, the A2.5 capture candidates superseding
the 06/08 rows). `work-logs/05b-pr6-second-review-remediation/README.md`
added per the worklog-directory convention. No interior README otherwise
touched by the spec's changes required refreshing; no standing platform
path changed.

**Closeout actions.** Branch pushed; PR 6 updated in place with a summary
comment naming the pending capture approvals and the carried clamp issue;
central worklog mirrored; registry row appended; spec archived to
`spec/2026-06/2026-09-15-wp-spec-04b-pr6-second-review-remediation.md`,
beside the parent and Amendment A, out of the active queue.

**Commit:** this commit — docs: amendment B closeout (gate A2.7).
