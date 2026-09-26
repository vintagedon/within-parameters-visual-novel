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
spec_ref: "spec/2026-06/2026-09-26-wp-spec-04a-pr6-review-remediation.md"
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

**Commit:** `c4896da` — content corrections (gate A1.4); branch pushed, PR 6 updated in place.

## Gate A1.3: Ending narrative coherence

**Reachable facility states** (derived from the effective configuration, not
literals — the live check reads `knowledgeThreshold` and `consumableFixCost`
off the runner's config and asserts the grid under Clear-Headed (T 10) and
Fragile Kit (F 3)):

| State | Actions enabled | Outcome if withdrawn |
|---|---|---|
| k ≥ T, m ≥ F | correction | — (correction) |
| k < T, m ≥ F | shutdown | — (destruction via shutdown gate) |
| k ≥ T, m < F | **withdraw** | destruction (informed variant) |
| k < T, m < F | **withdraw** | destruction (uninformed variant) |

Withdrawal is reachable in exactly two states; both route to the destruction
ending through the unchanged persisted outcome.

**Repairs.**

- `data/scenes.json`: the withdrawal gate's documentation-inadequacy claim
  and its "the archive keeps processing, within parameters" claim are gone.
  The existing `scene-confrontation-withdraw-gate` keeps (corrected) text
  for the uninformed state; a new `scene-confrontation-withdraw-informed`
  carries text for the informed state. Both are executor-authored bridging
  prose — M3 and the GDD are silent on withdrawal-state variants — and are
  quoted in the review surface for the operator's read, marked as such.
- `src/engine/scene-runner.ts`: `selectFacilityAction` routes the withdraw
  action to the informed or uninformed gate scene from the same
  knowledge-above-threshold boolean the choice views already resolve. The
  outcome derivation (pre-charge persistence, single charge) is untouched;
  no threshold, cost, outcome rule, or scoring constant changed.

**Checks added** (`src/engine/live-checks.ts`): the facility action grid
derived from the effective config; the R3 reproduction (P2/N2, seed 22 from
the discovery scene — facility at knowledge 13, modules 1: informed gate, no
false claims, coherent destruction ending); the uninformed state (P5/N2,
seed 22, clock-reduction rewards with spend-first choices — facility at
knowledge 8, modules 1: documentation claim present, coherent destruction
ending); and a content check that no scene anywhere claims the archive
"keeps processing".

**Review surface:** A1.3 section added to
`docs/verification/2026-09-16-complete-run-verification.md` quoting both
variants and the ending narrative they lead to, with executor-authored prose
marked, and a closed question for the operator.

**Verification:** `tsc --noEmit` clean; `npm run test:live` 38/38;
`npm run test:mutation` 4/4; `npm run replay` 6/6; `npm run audit:events`
36/36; `tests/resume_check.py` 9/9; `npm run build` clean.

**Incident (executor defect, disclosed).** The gate commit (`09bdfbb`)
swept the untracked, operator-owned `docs/project-brief.md` into the branch
via a directory-wide `git add docs/`, contrary to the startup exception.
The file was committed byte-for-byte as it sat on disk (unmodified since
2026-06-25; verified by diff against the working tree) and was removed from
tracking in the immediate follow-up commit (`d5561d0`), leaving it
untracked and unmodified. Force-push is forbidden, so the content remains
visible in the open PR's history for two commits; this is flagged in the PR
comment for the operator's merge decision. Going forward this run stages
only explicitly enumerated paths and verifies `git status` without
filtering.

**Commits:** `09bdfbb` — coherent withdrawal narrative (gate A1.3);
`d5561d0` — operator file tracking correction. Branch pushed; PR 6 updated
in place.

## Gate A1.4: Content corrections

**Changes.**

- `data/scenes.json` (8 lines) and `data/events.json` (23 lines): in-text
  speaker prefixes stripped from every non-narrator dialogue line
  (ARCHIVE ×5, TORRES ×3, DEX ×9, AGUILAR ×7, SATO ×4, ENGINEER ×2,
  CREW LEADER ×1). `data/comms-beats.json` carried none. The nameplate
  identifies the speaker.
- ENGINEER/CREW LEADER mismatch resolved as a new character (executor's
  choice): `crew-leader` added to `data/characters.json` (name CREW
  LEADER, Independent Crew Leader, `#f2c14e`, reusing the npc2 placeholder
  portrait key — no asset-manifest change), and `evt-ae01-a`'s line moved
  to it with the prefix stripped. Nameplate, narrator introduction, and
  text now agree.
- FD-01 (frozen F-07): credentials holder named by callsign only — title
  "Ticket #4471-C: Behavioral Anomaly — RELAY-7", body "Unit RELAY-7
  accessed Junction 4-B…". No rolled-name slotting, no framing text.
- FD-08: the Administrator is now "Human Unit Whitfield, D." — Whitfield
  is in neither the protagonist-pool surnames nor the NPC cast — and the
  Warden's surname no longer appears in a contradicting role.
- `data/comms-beats.json` (frozen F-06): green 0-2, amber 3-5, red 6-9;
  trigger points unchanged.

**Checks added** (`src/engine/live-checks.ts`): prefix scan across all
three dialogue files; nameplate/identity agreement incl. the crew-leader
manifest entry; document surname scan (no pool surnames; FD-08 carries
Whitfield, not Aguilar); comms-band boundary fixtures reading the clock
inside the comms callback after the stop tick — stubbed run RNG (tick 1)
plus clock-reduction rewards net each transition to zero, so callback
clocks 2/3/5/6 occur at both trigger points and tier green/amber/amber/red
under the frozen bands. Controlled fixtures only: no natural-reachability
claim (that is A1.5/F-06 evidence). Harness change: makeHarness accepts a
run-RNG override and the comms callback records the live clock.

**Mutations added** (`scripts/run-mutation-checks.mjs`): reinserting a
TORRES prefix into scenes.json and reinserting Vasquez into FD-01 — each
fails its check.

**Screenshot status (recorded, not re-recorded):** `npm run
test:screens:check` passes 10 of 11 captures; exactly one regression,
`05-save-load-confirm.png`, caused by A1.2's AUTOSAVE-row disable (the
save screen now renders the disabled action with its reason). Recorded
against the unchanged baseline set per the amendment; the re-record and
its before/after pair happen in A1.6 only.

**Verification:** `npm run test:live` 42/42; `npm run test:mutation` 6/6;
`npm run audit:events` 36/36 (prefix removal changed no mechanical value);
`npm run replay` 6/6; `npm run build` clean.

**Commit:** `c4896da` — content corrections (gate A1.4); branch pushed, PR 6 updated in place.

## Gate A1.5: Evidence corrections

**Run-length counter** (`tests/complete_run.py`): every displayed dialogue
occurrence is now counted exactly once by a page-side observer on the
dialogue bar's per-line render cycle (the `.typing` class toggles once per
rendered line — typewriter ticks, harness polling, and repeated identical
lines behave correctly), and instant surfaces (documents, comms exchanges,
epilogue, score breakdown) are reported separately, each counted once.
Comms are counted as exchange line text (excluding speaker labels and panel
chrome) to match the independent trace's methodology.

**Trace reconciliation (seed 555555, knowledge strategy):** typed 6,762 vs
reconciled trace 6,762 (delta 0 — 6879 minus 117 chars of A1.4 prefix
removal itemized across 8 shown scenes); comms 427 == 427; epilogue 1618 ==
1618. Nothing averaged; every scene-level difference itemized in the harness
output. The independent trace is committed as
`tests/fixtures/seed555555-dialogue-count.json` with a provenance note
(cross-check evidence, not authority). Counter mutations (drop ordinary
dialogue counting; drop epilogue counting) each fail the equality assertion
(`scripts/run-counter-mutations.mjs`, 2/2 GOOD).

**Reachability (F-04 restated):** the old zone-wide bound (self-credited,
reward- and doc-blind, "attainable >= gate") is replaced by a corrected
upper bound (self-credit excluded over ordered no-repeat assignments, one
effective config P6/N2, knowledge reward 0 + document +1) plus a legal-path
search through the live runner (150-seed budget, unresolved reported as
unresolved). Result: 5/5 gated choices reachable with reproducible legal
paths and pre-choice states; CE-05[2] (gate 4) and CE-02[0] (gate 3) cross
only via a document read (choices 3 + document 1); 0 proved unreachable; 0
unresolved. The synthetic self-credit event (+15 choice behind its own
gate 10) passes the old calculation and is rejected by the corrected bound.

**Natural-run re-run:** the recorded 37-run inventory re-ran in full on the
post-A1.4 tree with the coverage-based early exits removed. 37/37
completed; every ending/score/grade matches the parent's record exactly
(content changes altered no mechanical outcome); zero console errors; zero
failed same-origin requests; `tests/baseline/` untouched. Comms tier
distribution under the new bands: green 36/37 runs, amber 27/37, red 10/37
(27%) vs 1/37 (2.7%) under the old bands.

**F-05 restated (not decided):** corrected counts over the 36 full runs —
typed median 6,474 (4,833–7,095); instant median 4,254 (1,930–5,882);
typewriter median 194 s at the locked 30 ms/char; attentive duration
(method stated in the review surface: 30 ms/char + 144 wpm instant reading
+ 2.5 s per decision) median ~9.6 min (5.5–12.0); leisured median ~11.8 min
(6.8–15.1). The 25–35 minute target remains unreached; the closed question
is re-asked (a/b/c) for the operator.

**Review surface:** F-04 restated (corrected evidence + path table), F-05
restated (corrected counts + duration method + re-asked question), F-06
restated (tier distribution under the new bands), and the re-run set table
superseding the body table.

**Verification:** `npm run test:live` 43/43; counter mutations 2/2;
complete-run set 12/12 checks; `npm run build` clean.

**Commit:** `1f16b85` — evidence corrections (gate A1.5); branch pushed, PR 6 updated in place.

## Gate A1.6: Baseline disposition

**State found.** Baselines changed only in this gate. Comparison against
the last operator-approved set at `2272814`: captures 03, 06, 07, 08, 09,
10 replaced (by the parent's `4e9f199`), capture 11 new (parent 4.6/4.7),
01/02/04/05 unchanged.

**Correction made in this gate.** A1.2's `openDangerConfirm` refactor had
inadvertently changed the danger-confirm button from the framework default
(solid danger) to an outline variant, which moved capture 05. Restored to
the approved rendering; capture 05 re-recorded byte-identical to
`2272814` (sha1 `48480a19…`) — it moves nothing and needs no approval.
The A1.2 changes themselves (AUTOSAVE-row disable, load-refusal modal) are
not captured by any baseline screen.

**Re-record and verification.** Full record pass: 11/11 captured, exactly
one byte-change (05, restored as above — all other captures re-recorded
byte-identical, deterministic). `npm run test:screens:check` all green;
baseline directory hash unchanged across the check run
(`d8485b8c58be27a5…` before and after).

**Evidence pairs** at
`staging/2026-09-26-a16-baseline-disposition/` (`before-2272814/`,
`after-candidate/`; gitignored, operator-reviewable, not committed into
`tests/baseline/`; the approved versions remain retrievable from
`2272814`).

**Review surface:** A1.6 disposition section added — the parent's
"re-approved with evidence" claim quoted and retracted (sealed parent
worklog untouched), the per-capture table with causing gates and visible
differences, capture 11 marked "new capture; no prior approved version",
every entry pending operator approval with the closed yes/no question, and
the operator answer record extended.

**Commit:** `fc05919` — baseline disposition (gate A1.6); branch pushed, PR 6 updated in place.

## Gate A1.7: Spec defect register rows

Nine rows appended to `/opt/agents/repos/spec/spec-defect-register.md`
(SD-262 through SD-270; the register's next identifiers after SD-261),
following the register's established entry pattern:

- **SD-262** — the uncarried `REP:` prefix (PR 6 as finding source).
  Unassigned candidate row: the second instance of the
  source-requirement-not-transcribed vocabulary gap that SD-173 records;
  per the amendment, no class is invented and creation is the operator's
  call under the promotion rule.
- **SD-263** — the baseline contradiction recurring from Spec 03 Amendment
  A (`spec-internally-inconsistent`), recorded as a recurrence with the
  note that a correction made in one amendment did not reach the next
  spec; parent constraints quoted verbatim (rows 307 and 108).
- **SD-264** — the 4.7 validation enumerated state fields but not
  presentation state or SAVE-reachable phases
  (`validation-drops-required-dimensions`; parent row 231 quoted).
- **SD-265** — the 4.8 coverage requirement satisfied by score parity
  (`detector-not-discriminator`; parent row 257 quoted).
- **SD-266 through SD-270** — the five pre-dispatch acceptance defects
  corrected in v1.1 (PF-01..PF-05 of the preflight), with the pre-review
  04a copy supplying verbatim evidence and the preflight review as the
  finding source; not attributed to the archived parent or an executor.
- The stale archive line is already recorded as SD-199; the entry
  re-confirms it and creates no duplicate.

Class increments recorded in the register's append-count note:
`spec-internally-inconsistent` +3, `validation-drops-required-dimensions`
+2, `detector-not-discriminator` +1, `domain-unenumerated` +1, one
unassigned candidate. No new class value created; no skill repository edit
from this branch. Register frontmatter version 1.52 → 1.53.

**Commit:** the register lives outside the repo; the append rides the
central tree, not this branch. (recorded after the A1.8 closeout commit —
the register is not a git-tracked deliverable of this repo.)

## Gate A1.8: Closeout

**Docs pass.** AGENTS.md: amendment-A completion block added; Known Open
Findings restated (F-04/F-05/F-06 on corrected evidence, capture approvals
pending, parent approval claim retracted); Spec 05 dispatch note corrected
(the old queue file is superseded and must be reconciled first); the
portfolio-scope duration annotated as a target with the measured median.
README.md run-length row annotated the same way. The review surface already
carries the restatements. `docs/project-brief.md` remains untracked and
untouched.

**Consistency pass (re-run at closeout):** `tsc --noEmit` clean; build
clean; `npm run test:live` 43/43; `npm run test:mutation` 6/6; counter
mutations 2/2; `npm run replay` 6/6; `npm run audit:events` 36/36;
`npm run test:screens:check` all green; `tests/resume_check.py` 9/9; the
37-run natural set re-run in A1.5 with 12/12 checks (counter reconciled to
the independent trace at delta 0).

**Operator interactions:** none. The run put no question to the operator
(Attended: No; the closed questions are carried in the review surface for
the operator's merge review, and the executor-scope choices are recorded
per gate above). An empty interaction record, stated explicitly.

**Commits (one per gate):**

- `3863a36` — A1.1 resume checks that can fail
- `033f375` — A1.2 save and resume repairs
- `09bdfbb` + `d5561d0` — A1.3 ending narrative coherence (+ operator-file
  tracking correction, disclosed above)
- `c4896da` — A1.4 content corrections
- `1f16b85` — A1.5 evidence corrections
- `fc05919` — A1.6 baseline disposition
- A1.8: this commit (docs pass and closeout)
- A1.7: the defect register rides the central spec tree (not a git
  repository; no commit exists or is required there)


## Closeout record

**Publication:** branch `agent/wp-spec-04-complete-playable-run` pushed
through `a242815`; PR 6 updated in place (comment + description), unmerged.
Central worklog `2026-09-26-wp-worklog-04a-pr6-review-remediation.md`
written; registry row appended (23 columns, status completed); the defect
register appended in the central spec tree (not a git repository; no commit
applies there).

**Archive:** the amendment moved from the active queue to
`/opt/agents/repos/spec/2026-06/2026-09-26-wp-spec-04a-pr6-review-remediation.md`,
beside the parent at
`/opt/agents/repos/spec/2026-06/2026-09-15-wp-spec-04-complete-playable-run.md`
(parent path verified present before the move, per the amendment's
closeout instruction). The parent's archived text and completion records
are unchanged.

**Status:** completed. All eight gates landed; the consistency pass at
closeout is green across every harness.
