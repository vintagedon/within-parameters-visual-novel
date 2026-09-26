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

# Complete Run Verification: Gate 4.8 Review Surface

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

### F-01: No live/resolver outcome divergence remains

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

### F-02: No trait combination deadlocks a run

**Statement.** All 64 trait combinations complete runs without an
unreachable or unaffordable choice deadlocking the player.

**Evidence.** `src/engine/live-checks.ts` (4.8 evidence check): 128/128
full journeys (64 combos x 2 seeds) completed with an enabled choice
available at every decision, including Stubborn-forced community events and
Exhausted jitter. Every event carries at least one free, ungated choice.

**Closed question.** Accept 128/128 as sufficient deadlock evidence?
(yes/no)

### F-03: Two audio source files remain absent; nothing blocks a run

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

### F-04: Every gated choice is reachable

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

### F-05: The 25-35 minute target is not met; the gap is content volume

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

### F-06: The red comms tier is nearly unreachable at the authored trigger points

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

### F-07: FD-01 names a fixed protagonist under randomized rolls

**Statement.** The first found document's title and body name "Unit
Vasquez, M." holding the RELAY-7 credentials. Under randomized protagonists
the name matches only one possible roll (Mara Vasquez). It is an artifact
of the fixed-protagonist draft era and reads as a continuity error for
every other roll.

**Evidence.** `data/found-documents.json` rows 6-8 (FD-01 title and body).

**Closed question.** Slot-ify the name to the rolled protagonist, or keep
it as an in-world record of a previous RELAY-7 holder (which would need one
line of framing text)? (slot-ify/keep-with-framing)

### F-08: Destruction runs reflect the intervention spend in the final inventory

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

### F-09: Disposition question for untracked `docs/project-brief.md`

**Statement.** `docs/project-brief.md` is untracked and operator-owned. Per
the spec it was neither committed, moved, nor deleted by this run.

**Evidence.** `git status` shows the file untracked throughout the branch;
no commit in this spec's chain touches it.

**Closed question.** Where should it live: committed into `docs/`, moved to
the platform docs tree, or left untracked? (commit/move/leave)

### F-10: Spec 03 completion claim retracted

**Statement.** The archived Spec 03 worklog's completion claim that a full
run plays start to finish is retracted: the natural run in the 2026-09-13
project review terminated before stop 5. The original text is unchanged in
the archive; this retraction is the correction of record.

**Evidence.** The claim, quoted verbatim from
`/opt/agents/repos/work-logs/2026-06-25-wp-worklog-03-roguelike-layer.md`
(row 56): "A full run plays start to finish with a generated character:
dossier → lore → journey → ending → graded score, in the neon preset with
placeholder portraits." Counter-evidence:
`staging/2026-09-13-project-review/natural-run.json` (`pageErrors:
["[event-system] No eligible events for stop 5"]`, seed 2027, four-event
scaffold pool). The cause was a four-event pool against a five-stop
journey; gate 4.3 filled the approved 12-event pool and every run in the
table above completes.

**Closed question.** Acknowledge the retraction as the corrected record?
(yes/no)

### F-11: GameUI framework repository URL unconfirmed

**Statement.** The vendored framework doc names
`github.com/radioastronomyio/gameui-browser-gaming-framework` as its source
repository (three references). That URL returns 404, and no live location
could be confirmed (a `vintagedon` owner was also checked and returns 404).
Per the spec, the URL is recorded here rather than guessed at.

**Evidence.** `vendor/gameui/VENDORED.md` rows 14, 21, 27. Checks performed
2026-09-16: both the radioastronomyio and vintagedon org paths return HTTP
404. (The SpecSmith link was verified live and redirects to
`vintagedon/specsmith`; it and this repository's own URL were corrected in
gate 4.9.)

**Closed question.** Provide the framework repository's live URL for a
follow-up docs correction? (provide/leave)

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
| F-10 | Retraction acknowledged | |
| F-11 | Framework URL provided | |

---

# Amendment A (PR 6 review remediation) — updates to this review surface

This section is appended by WP Spec 04 Amendment A
(`2026-09-26-wp-spec-04a-pr6-review-remediation`), which executes on the same
branch and updates PR 6 in place. The body above is the gate 4.8 surface as
it stood at the parent's closeout; restatements below supersede it where they
conflict. Executor-authored bridging prose is marked as such wherever it
appears.

## A1.3: Ending narrative coherence (withdrawal path)

**Reachable facility states.** Derived from the effective configuration
(`knowledgeThreshold` and `consumableFixCost` — no authored literals; e.g.
Clear-Headed moves the threshold to 10, Fragile Kit the fix cost to 3):

| State (knowledge / modules) | correct | shutdown | withdraw | Outcome if withdrawn |
|---|---|---|---|---|
| k ≥ T, m ≥ F | enabled | disabled ("correction is executable") | disabled | — (correction) |
| k < T, m ≥ F | disabled | enabled | disabled | — (destruction, via the shutdown gate) |
| k ≥ T, m < F | disabled | disabled | **enabled** | destruction |
| k < T, m < F | disabled | disabled | **enabled** | destruction |

Withdrawal is reachable in exactly two states, and the locked outcome
derivation routes both to destruction. The prior single withdrawal text made
two claims false or contradictory in those states: "no documentation strong
enough to argue scope" (false when knowledge ≥ threshold) and "the archive
keeps processing, within parameters" (contradicted by the destruction
narrative that follows: "The archive core went offline at 0347"). The
runner now selects the withdrawal gate scene from the knowledge-above-
threshold boolean; both variants carry `determineEnding` and route through
the unchanged persisted outcome.

**Variant 1 — informed withdrawal (k ≥ T, m < F; scene
`scene-confrontation-withdraw-informed`; prose is executor-authored: M3 is
silent on this state):**

> You stand in front of the terminal holding the argument that would end
> this, and no way to hand it over. The correction wants bypass modules to
> bridge its maintenance circuit, and your kit went out keeping stations
> alive on the way here.
>
> "I know exactly what's wrong with you. I just can't afford to fix it."
>
> You log out of the terminal, mark the rack row where it lives, and start
> the long walk back up the way you came.

**Variant 2 — uninformed withdrawal (k < T, m < F; scene
`scene-confrontation-withdraw-gate`; revised from the M3-era text — the
revision is executor-authored):**

> You stand in front of the terminal with nothing that can act on it. You
> don't have the documentation to argue whatever is wrong with this place,
> and you don't have the components to force anything. You mark what you
> found and fall back toward the surface.
>
> "I got here. That's all I got."

**The ending narrative both variants lead to** (unchanged M3-authored
destruction scene and epilogue base):

> The archive core went offline at 0347. The salvage signal stopped
> mid-packet.
>
> [epilogue] The archive core went offline. The salvage signal stopped. The
> relay network stabilized within hours, but the nodes that had already been
> stripped were gone. […]

Neither variant asserts continued processing, and neither names a cause the
ending contradicts: the documentation claim now appears only in the state
where it is true (knowledge below the effective threshold), and the informed
state says truthfully that the correction is unaffordable in modules.

**R3 reproduction (verified).** P2/N2, RNG seed 22 from the discovery
scene, legal choices: the facility is reached at knowledge 13, modules 1,
clock 6 (the review's exact state; effective threshold 11, fix cost 2). It
now renders the informed withdrawal gate and ends in destruction — no
documentation-inadequacy claim, no keeps-processing claim. A second legal
run (P5/N2, seed 22, clock-reduction rewards with spend-first choices)
reaches the uninformed state (knowledge 8, modules 1) and renders the
uninformed gate to the same coherent ending. Both are live-path checks in
`npm run test:live`; the keep-processing phrase survives nowhere in
`data/scenes.json`.

**Closed question.** Approve the two withdrawal variants as the corrected
record for the review's R3? (yes/no)

## A1.4: Content corrections

**Speaker prefixes.** Every non-narrator dialogue line across
`data/scenes.json` (8 lines: ARCHIVE ×5, TORRES ×3) and `data/events.json`
(23 lines: DEX ×9, AGUILAR ×7, SATO ×4, ENGINEER ×2, CREW LEADER ×1) had
its in-text speaker prefix stripped; `data/comms-beats.json` carried none.
The nameplate identifies the speaker. A live-path check scans all three
files (dialogue lines only) for any line opening with a speaker label and
colon, and a data mutation reinserting one prefix makes it fail.

**Crew leader.** The approach-event line whose nameplate said ENGINEER while
its in-text label said CREW LEADER now resolves as its own character: a
`crew-leader` manifest entry (name CREW LEADER, Independent Crew Leader,
distinct name color, placeholder portrait reuse) and the scene's speaker
updated. The nameplate, the narrator's introduction ("The crew leader
recognizes your callsign"), and the text now name the same person.
Executor's choice under the amendment: a new character rather than a prefix
removal, because the narrator names a crew leader and no engineer is
present in that scene.

**FD-01 (frozen F-07).** The credentials holder is named by callsign only,
following FD-06's pattern; no rolled-name slotting, no framing text:

> title: "Ticket #4471-C: Behavioral Anomaly — RELAY-7"
>
> body: "Unit RELAY-7 accessed Junction 4-B at 0347 hrs outside scheduled
> maintenance window. […]"

**FD-08.** The dispute record no longer reuses the Warden's surname
(Aguilar) for an Administrator role. The administrator is "Human Unit
Whitfield, D. (Administrator)"; Whitfield appears in neither
`data/protagonist-pool.json` nor the NPC cast. A live-path check rejects
any pool surname in any document (reinserting Vasquez into FD-01 is a
mutation that fails).

**Comms bands (frozen F-06).** Applied: green 0-2, amber 3-5, red 6-9.
Trigger points unchanged (afterStop 1 and 3). Boundary fixtures assert the
tier at the comms callback — the clock read inside the callback, after the
stop tick — with a stubbed run RNG (tick exactly 1) and clock-reduction
rewards netting the transition to zero: clocks 2 → green, 3 and 5 → amber,
6 → red at BOTH trigger points. Controlled fixtures only; they do not claim
clock 6 is naturally reachable after stop 1 (A1.5 restates F-06 with
natural-run distribution).

**The red beats' text, quoted for the operator's read at clock 6:**

> **After stop 1** —
> JAY CHEN: "RELAY-7, respond." / RELAY-7: "I'm here." / JAY CHEN: "Three
> more stations dark. Command wants you to come back. I told them you're
> close to something. Are you close to something?" / RELAY-7: "Yes." /
> JAY CHEN: "Then keep going. I'll hold them off."
>
> **After stop 3** —
> JAY CHEN: "RELAY-7." / RELAY-7: "Jay." / JAY CHEN: "People are scared. I
> can hear it on the SCADA feeds. The station AIs are starting to compete
> for remaining capacity. Load-balancing algorithms running against each
> other." / RELAY-7: "That's the cascade. If I don't get to the source—" /
> JAY CHEN: "I know what happens. Go."

**Closed question.** Approve the red-tier text as reading correctly at
clock 6 under the rebalanced bands? (yes/no)

## A1.5: Evidence corrections

### F-04 restated — gated-choice reachability

**What was wrong with the prior evidence.** The gate 4.8 reachability check
credited each zone's best knowledge choice at every stop of the event's
zone — including the gated event's own yield before it could have drawn
(the old calculation passes a synthetic event whose own +15 choice carries
its own gate 10). It ignored rewards and documents, and it accepted
"attainable ≥ gate" as reachability, which no legal run needs to realize.
It also rested on an unstated reward value: under the locked winning config
`knowledgeRewardBonus` is −2, so the knowledge reward totals **0** — the
correction-rate evidence never depended on it, but the reachability prose
implicitly did.

**Corrected evidence.** Two instruments, one effective configuration
(P6/N2: threshold 11, no Distracted, so document reads grant +1):

1. **Corrected upper bound.** For each gated choice, the best legal prior
   knowledge over every ordered no-repeat event assignment that draws the
   event at each of its drawable stops, crediting only prior stops' best
   choice yield, the knowledge reward (0), and a document read (+1). An
   upper bound can rule a gate out; exceeding it proves nothing by itself.
2. **Legal-path search through the live runner.** Seeds are driven with a
   max-knowledge policy until the gated choice renders enabled (pre-choice
   knowledge ≥ gate), recording the reproducible path: seed, stop, drawn
   route, pre-choice knowledge, and how much of it came from choices alone.
   A gate whose bound leaves room but whose search finds no path within the
   150-seed budget is reported **unresolved**, not unreachable.

**Result.** 5 gated choices; 5 reachable with legal paths; 0 proved
unreachable; 0 unresolved. One gate is crossed only by a document —
corrected in place by Amendment B (gate A2.4): this section said "two
gates," which the check's own report contradicts
("(1 require rewards/documents)"; the corrected count statement of record
is in the Amendment B A2.4 section):

| Gate | Legal path (reproducible) | Pre-choice knowledge |
|------|---------------------------|----------------------|
| CE-02[0] k≥3 | seed 7, stop 2: CE-04 → CE-02 | 4 (choices 3 + document 1) |
| CE-05[2] k≥4 | seed 13, stop 2: CE-04 → CE-05 | 4 (choices 3 + **document 1 — required**) |
| TE-03[1] k≥3 | seed 1, stop 3: CE-05 → CE-03 | 3 (choices 3) |
| AE-02[0] k≥5 | seed 1, stop 5: CE-05 → CE-03 → TE-03 → TE-02 | 7 (choices 6 + document 1) |
| AE-03[0] k≥4 | seed 7, stop 5: CE-04 → CE-02 → TE-04 → TE-01 | 9 (choices 7 + documents 2) |

The synthetic self-credit fixture (an event whose own +15 choice would
satisfy its own gate 10) passes the old calculation and is rejected by the
corrected bound. Reproduction: `npm run test:live`.

**Closed question (restated).** Accept corrected-bound + legal-path as the
reachability standard, with the five paths above as the evidence? (yes/no)

### F-05 restated — run length on corrected counts

**What was wrong with the prior evidence.** The gate 4.8 counter recorded
the last dialogue line before choices plus document and comms text only:
ordinary advances, most setup/consequence lines, and the epilogue went
uncounted. For seed 555555 it reported 1,326 characters against an
independent scene trace of 6,879 typed characters — 6,092 typed characters
omitted in one run.

**Corrected counter.** `tests/complete_run.py` now counts every displayed
dialogue occurrence exactly once via a page-side observer on the dialogue
bar's per-line render cycle (one line = one render; typewriter ticks,
harness polling, and repeated identical lines behave correctly), and
reports instant surfaces (documents, comms exchanges, epilogue, score
breakdown) separately, each counted once. The unmutated counter reproduces
the independent trace for seed 555555 exactly:

| Surface | Independent trace | Harness (reconciled) |
|---------|-------------------|----------------------|
| Typed dialogue | 6,879 | 6,762 (delta 0 after itemizing −117 chars of A1.4 prefix removal across 8 shown scenes) |
| Comms exchanges | 427 | 427 |
| Epilogue | 1,618 | 1,618 |

Every scene-level difference is itemized in the harness output and is a
stripped speaker-prefix length; nothing is averaged. Two counter mutations
(dropping ordinary-dialogue counting; dropping epilogue counting) each make
the equality assertion fail (`node scripts/run-counter-mutations.mjs`).

**Corrected counts across the re-run set** (36 full runs; the save/resume
twin pair excluded from duration stats as a partial run by design):

| Measure | Min | Median | Max |
|---------|-----|--------|-----|
| Typed dialogue characters | 4,833 | 6,474 | 7,095 |
| Typed lines | 44 | 60 | 64 |
| Instant-surface characters | 1,930 | 4,254 | 5,882 |
| Typewriter time at 30 ms/char | 145 s | 194 s | 213 s |
| Decision points (choices + rewards) | 6 | 11 | 11 |

**Estimated attentive run duration** — method: typed characters at the
locked typewriter pace (30 ms/char), instant surfaces at ~144 wpm attentive
reading (12 chars/s), 2.5 s per decision point; no loadings, menus, or
chargen dwell:

- Attentive: **median ~9.6 minutes** (range 5.5–12.0).
- Leisured (skipping less, ~108 wpm reading, 5 s per decision): **median
  ~11.8 minutes** (range 6.8–15.1).

The closed question is re-asked on the corrected numbers; the operator's
decision is not made here.

**Closed question (restated).** The corrected evidence still does not
reach the 25–35 minute target: an attentive run is ~6–12 minutes and a
leisured one ~7–15. Which response do you want: (a) accept shorter runs
and retire the target, (b) commission a content expansion spec, or (c)
slow presentation knowing it pads rather than adds? (a/b/c)

### F-06 restated — comms tier reachability under the rebalanced bands

The frozen bands (green 0–2, amber 3–5, red 6–9) applied in A1.4, trigger
points unchanged. The re-run set's beat distribution: green 36/37 runs,
amber 27/37, **red 10/37 (27%)** — against 1/37 (2.7%) under the old bands.
The red tier is no longer effectively dead: clockburn and Exhausted-reroll
strategies reach it naturally, and beat B (after stop 3) carries it in
every observing run.

**Closed question (restated).** Accept the rebalanced bands as the fix for
F-06? (yes/no)

### Natural-run set re-run (supersedes the table in the body above)

The recorded inventory re-ran in full against the post-A1.4 tree — every
seed, strategy, reroll, and the save/resume pair reproduced, with the
coverage-based early exits removed so nothing dropped silently. 37/37
completed; zero console errors; zero failed same-origin requests by HTTP
status; `tests/baseline/` untouched. Every ending, score, and grade matches
the parent's record exactly — the A1.2–A1.4 content changes altered no
mechanical outcome (replay 6/6 and event audit 36/36 concur).

| Seed | Strategy | Ending | Score | Docs | Comms tiers (new bands) | Typed chars | Instant chars |
|------|----------|--------|-------|------|--------------------------|-------------|---------------|
| 555555 | knowledge | destruction | 55 C | 0 | green, amber | 6,762 | 2,418 |
| 555555 | knowledge (resumed) | destruction | 55 C | 0 | amber | 3,064 | 2,233 |
| 20260916 | knowledge | clock-failure | 35 D | 2 | green, **red** | 5,576 | 3,081 |
| 20260916 | consumable | clock-failure | 45 C | 2 | green, **red** | 5,576 | 3,082 |
| 7 | clockburn | clock-failure | 11 F | 3 | green, **red** | 5,169 | 4,225 |
| 11 | knowledge (1 reroll) | destruction | 50 C | 1 | green, amber | 6,583 | 3,685 |
| 42 | consumable | destruction | 64 B | 3 | green, **red** | 6,841 | 5,813 |
| 99 | clockburn | destruction | 36 D | 2 | green, amber | 6,399 | 4,320 |
| 31337 | knowledge | destruction | 61 B | 2 | green, amber | 6,885 | 4,699 |
| 2027 | consumable | destruction | 72 B | 2 | green, amber | 7,092 | 4,006 |
| 12345 | clockburn | clock-failure | 11 F | 3 | green, amber | 5,162 | 4,532 |
| 777 | knowledge | destruction | 61 B | 2 | green, amber | 6,723 | 4,359 |
| 8888 | consumable | destruction | 62 B | 2 | green, amber | 6,909 | 4,525 |
| 90210 | clockburn | destruction | 34 D | 1 | green, amber | 6,672 | 3,496 |
| 60606 | knowledge | destruction | 69 B | 3 | green, amber | 6,975 | 5,494 |
| 40404 | consumable | destruction | 63 B | 1 | green, **red** | 6,633 | 3,515 |
| 501 | correction | destruction | 61 B | 1 | green, amber | 6,628 | 3,531 |
| 502 | correction | destruction | 59 C | 2 | green, amber | 6,944 | 4,470 |
| 503 | correction | destruction | 67 B | 3 | green, amber | 6,806 | 5,882 |
| 504 | correction | destruction | 63 B | 2 | green, amber | 7,002 | 4,357 |
| 505 | correction | destruction | 63 B | 3 | green, amber | 7,026 | 5,688 |
| 506 | correction | correction | 83 A | 1 | green, amber | 7,095 | 4,175 |
| 601 | redhunt (reroll) | clock-failure | 11 F | 1 | green, **red** | 5,002 | 2,308 |
| 602 | redhunt (reroll) | clock-failure | 11 F | 2 | green, **red** | 5,043 | 3,033 |
| 603 | redhunt (reroll) | destruction | 33 D | 3 | green, amber | 6,447 | 5,300 |
| 604 | redhunt (reroll) | destruction | 28 F | 1 | green, amber | 6,438 | 3,434 |
| 605 | redhunt (reroll) | correction | 29 F | 2 | green, **red** | 6,945 | 5,139 |
| 606 | redhunt (reroll) | destruction | 23 F | 3 | green, amber | 6,206 | 5,567 |
| 607 | redhunt (reroll) | clock-failure | 6 F | 2 | green, amber | 5,183 | 3,302 |
| 608 | redhunt (reroll) | clock-failure | 6 F | 1 | green, amber | 4,833 | 1,930 |
| 609 | redhunt (reroll) | clock-failure | 6 F | 3 | green, **red** | 4,998 | 3,953 |
| 610 | redhunt (reroll) | clock-failure | 7 F | 1 | green, amber | 4,959 | 2,043 |
| 611 | redhunt (reroll) | destruction | 20 F | 3 | green, amber | 6,403 | 5,478 |
| 612 | redhunt (reroll) | destruction | 33 D | 2 | green, amber | 6,346 | 4,449 |
| 613 | redhunt (reroll) | destruction | 21 F | 3 | green, amber | 6,501 | 5,574 |
| 614 | redhunt | destruction | 40 D | 2 | green, amber | 6,315 | 4,284 |
| 615 | redhunt (reroll) | clock-failure | 5 F | 1 | green, **red** | 4,833 | 2,300 |

No additional coverage runs were required: the fixed inventory covers all
three endings, rerolls, document reads, and all three tiers. Reproduction:
`npm run build && /opt/agents/venv/bin/python tests/complete_run.py`.

## A1.6: Baseline disposition (pending operator approval)

**Retraction.** The parent worklog's gate 4.10 section states: "Baselines
re-approved with evidence (art commit 4e9f199): 03 (SAVE control +
production content), 06 (trait-adjusted HUD values), 07 (comms exchange),
08 (M3 epilogue + persisted breakdown), 09/10 (dossier portrait image), new
11 (document overlay); 01/02/04/05 unmoved."
([work-logs/05-complete-playable-run/worklog.md, line 362](../../work-logs/05-complete-playable-run/worklog.md)).
That claim is **retracted**: attribution of each change to a causing gate
explains the change; it does not approve one. Approval is the operator's.
The archived worklog text is sealed and left untouched; this retraction is
the correction of record. Every executor-recorded capture below is a
**candidate**, not an approved baseline.

**Evidence pairs.** Before-and-after images live in
`staging/2026-09-26-a16-baseline-disposition/` (`before-2272814/` = the
last operator-approved versions at `2272814`, `after-candidate/` = the
current captures); they are deliberately not committed into
`tests/baseline/`. The prior approved versions remain retrievable from
`2272814` and are copied into the pairs. The committed set passes a full
screenshot check (`npm run test:screens:check`, all green) and the check
leaves the baseline directory hash unchanged.

| Capture | Status vs `2272814` | Causing gate(s) | What visibly differs |
|---------|--------------------|-----------------|----------------------|
| 01-title | unchanged | — | — |
| 02-lore-card | unchanged | — | — |
| 03-hud-midrun | replaced | parent 4.7 | SAVE button added to the Route panel footer |
| 04-settings | unchanged | — | — |
| 05-save-load-confirm | **verified unchanged** | — (an A1.2 refactor briefly moved the danger-confirm button style; corrected in this gate; the committed capture is byte-identical to `2272814`, sha1 `48480a19…`) | — |
| 06-reward-overlay | replaced | parent 4.4–4.6 | M3-authored reward cards (Engineering Cache / Dex's Route Intel / Dead Power Run, CE-02 at Station Beta) replace placeholder-era rewards; SAVE visible behind the overlay |
| 07-comms-interrupt | replaced | parent 4.3, 4.5 | M3 three-line comms exchange with JAY CHEN / RELAY-7 nameplates replaces the single-line placeholder beat; "five stops" replaces "six stops" |
| 08-ending | replaced | parent 4.2, 4.6 | M3 epilogue text and the persisted score breakdown (grade, component rows, reroll penalty, trait lines) replace the draft ending; the candidate renders beneath a reward overlay — an artifact of the capture harness's ending trigger, recorded honestly |
| 09-dossier | replaced | parent 4.6 | generated placeholder portrait image replaces the initials block |
| 10-dossier-reroll | replaced | parent 4.6 | generated placeholder portrait image replaces the initials block (same rolled candidate, same reroll state) |
| 11-document-overlay | **new capture; no prior approved version** | parent 4.6, 4.7 | the M3 found-document surface (Equipment Specification: Human Social Bonding Protocol) at the 1440x900 harness viewport |

**Closed question for each row:** "Approve this capture as the new
baseline? (yes/no)" — for capture 11: "Approve this capture as a new
baseline? (yes/no)". Every replacement and addition above is **pending
operator approval**; none is approved by this amendment.

**Operator answer record (A1.6 additions):**

| Capture | Approve as new baseline? |
|---------|--------------------------|
| 03-hud-midrun | |
| 06-reward-overlay | |
| 07-comms-interrupt | |
| 08-ending | |
| 09-dossier | |
| 10-dossier-reroll | |
| 11-document-overlay (new) | |

---

# Amendment B (PR 6 second review remediation) — updates to this review surface

This section is appended by WP Spec 04 Amendment B
(`2026-09-26-wp-spec-04b-pr6-second-review-remediation`), which executes on
the same branch at `03893f4` and updates PR 6 in place. The body above is
the surface as Amendment A left it; restatements below supersede it where
they conflict. Executor-authored prose is marked as such wherever it
appears. This is the final Spec 04 amendment (operator decision,
2026-09-26): findings outside its acceptance criteria and below P1 are
recorded for Spec 05 or a backlog, not remediated here.

## A2.1: Withdrawal text asserts nothing false

**The defect.** The informed withdrawal variant asserted a history the
player may not have: "your kit went out keeping stations alive on the way
here." The review's zero-help reproduction — P2/N6, RNG seed 34 from the
discovery scene, legal choices CE-02[2], CE-03[1], TE-02[1], TE-04[0],
AE-02[1] with knowledge rewards — reaches the informed withdrawal state
(knowledge 13 ≥ effective threshold 11; modules 2 < effective fix cost 3;
rapport 0; **all five communities ignored**). Amendment A's validation had
checked only the documentation-inadequacy claim, so the invented history
escaped it.

**Final withdrawal variants** (both variants and the bridge are
executor-authored: M3 and the GDD are silent on withdrawal-state prose; the
bridge is new in this amendment):

Variant 1 — informed withdrawal (renders only when k ≥ T, m < F; scene
`scene-confrontation-withdraw-informed`):

> You stand in front of the terminal holding the argument that would end
> this, and no way to hand it over. The correction wants bypass modules to
> bridge its maintenance circuit, and your kit can't cover it.
>
> "I know exactly what's wrong with you. I just can't afford to fix it."
>
> You log out of the terminal, mark the rack row where it lives, and start
> the long walk back up the way you came.
>
> The mark you leave is not a fix. It is a map for the crew that comes down
> here with a full kit.

Variant 2 — uninformed withdrawal (renders only when k < T, m < F; scene
`scene-confrontation-withdraw-gate`):

> You stand in front of the terminal with nothing that can act on it. You
> don't have the documentation to argue whatever is wrong with this place,
> and you don't have the components to force anything. You mark what you
> found and fall back toward the surface.
>
> "I got here. That's all I got."
>
> The mark you leave is not a fix. It is a map for the crew that comes down
> here with a full kit.

**The bridge.** Both variants now end with the same narrator line — "The
mark you leave is not a fix. It is a map for the crew that comes down here
with a full kit." The destruction ending that follows both withdrawal
routes ("The archive core went offline at 0347") now follows from the mark
and the report the epilogue already describes ("You filed the report.
Dispatch acknowledged."). No threshold, cost, outcome rule, or scoring
constant changed; `scene-ending-destruction` itself is untouched.

**Sentence-by-sentence truth conditions.** The worklog
(`work-logs/05b-pr6-second-review-remediation/worklog.md`, gate A2.1) lists
every sentence of both variants with the state condition under which it is
true. Summary: every historical claim in the informed variant reduces to
its render conditions (knowledge ≥ T for the argument, modules < F for the
can't-cover claim); the uninformed variant's claims reduce to knowledge < T
and modules < F; the bridge lines assert no run history at all — they
describe the mark the player just left and state its purpose.

**Guard.** `npm run test:live` now drives both reproductions and asserts no
community-help claim (`/keeping stations alive|kept (the )?stations?|kit
went out (on|for|keeping)|spent (your |the )?kit (on|helping)|helped (the
)?(stations|communities)/i`) appears in either variant's text. The
zero-help check pins the recorded path exactly (knowledge 13, modules 2,
rapport 0, five communities ignored) so the reproduction cannot silently
drift into a state where the old claim would be true. A data mutation
reinserting "keeping stations alive" into the informed variant fails two
live checks (`npm run test:mutation`, 7/7 mutations rejected).

## A2.2: Journey audio restored on load

**The defect.** Event scenes select no music, and the load path restored
the HUD but not the audio: a journey saved while `bgm-ambient.ogg` played
loaded with `bgm-title.ogg` still playing (the review measured it at
volume 0.6, persisting until a scene changed music). Visible HUD and score
parity could not detect it. Attribution: Amendment A's A1.1 enumerated
restored state as "sidebar, clock, stats, route, SAVE" — audio was never
listed in either amendment, so this gap is the spec's/author's, not an
executor slip against written scope.

**The repair.** `startGameFromState` now restores the journey ambient
track instantly, before the first loaded scene starts, so a scene that
declares its own track — the facility's `bgm-tension` loop, which
`scene-facility-01` carries — crossfades over it with a single fade. Two
synchronous fades would overlap: the manager's fade timers are not
cancelled, and a stale timer pauses the incoming track (observed directly
during development: a crossfade-then-restore left both loops paused). The
instant default cannot collide with a scene fade, and `playBGM` no-ops
when the scene declares the ambient loop itself. Muted players restore at
zero volume; the saved mute preference is preserved. The manager itself is
unchanged (read-only for this amendment).

**Browser coverage** (production build, real controls;
`/opt/agents/venv/bin/python tests/resume_check.py`, 11/11 phases): the
suite wraps the `Audio` constructor before app scripts and asserts real
playback state. Every LOAD/CONTINUE phase captures the uninterrupted
track at the save point (settled past any in-flight crossfade — the
facility save sits mid-fade between the ambient and tension loops), then
after LOAD requires exactly one music track playing, equal to the
uninterrupted track at the same phase (event-choice, event-consequence,
comms: ambient; facility-entry: tension), with every other music element
paused once the configured 2 s crossfade completes. CONTINUE from
autosave is checked identically. `audio-muted-load` restores the track at
zero volume under a saved `audioMuted: true`. Phases where the UI offers
no SAVE keep their existing policy (no audio assertion).
`title-dossier-no-journey-audio` asserts the title and dossier surfaces
start no journey track; no title/dossier load fixtures were invented.

**Mutation evidence.** `node scripts/run-audio-mutation.mjs`: the
unmutated focused phase (event-choice) passes; removing the restore line
from `src/main.ts` and rebuilding makes the same phase fail with the
focused `audio:` assertion while every presentation assertion still
passes — an unrelated browser failure is not accepted as evidence, and
the working tree and build are restored afterwards.

## A2.3: Clock reduction parity and truthful reward text

**The rounding repair.** `calculateClockReduction`
(`src/engine/game-state.ts`) now mirrors the validated simulator exactly:
`Math.trunc(rapport × rapportClockScale)` (Python `int()` truncates toward
zero) where it previously used `Math.floor`. At negative rapport they
diverged — the review's examples: rapport −1/−2/−3 produced live 0/0/−1
against simulator 1/0/0. The docstring states the parity and why there is
no clamp. Attribution from history is recorded in the defect register
(A2.6). The mutation `A2.3 reverts clock reduction to Math.floor` makes
the parity check fail with `rapport -1 without Narrow Focus: expected 1,
got 0` (`npm run test:mutation`, 8/8 mutations rejected).

**Executed expectations.** The parity check
(`npm run test:live`, 46/46) does not contain hand-written numbers: it
spawns the simulator itself
(`simulation/simulator.py::calc_clock_reduction` via
`simulation/game_data.py::DEFAULT_CONFIG`) and compares the engine at
every rapport −6…+6 under both default and Narrow Focus configurations.
The mutation runner copies the two simulator modules into its scratch
tree so the discriminating run also executes the real Python.

**Truthful reward text.** The clock-reduction card's displayed amount is
now the reward's immediate applied effect — after the existing zero floor
in `applyStatChanges`, before the separate stop tick/jitter. `applyReward`
is untouched; no clamp was added; no reward was disabled. The presentation
lives in `getRewardsForStop` (`src/engine/event-system.ts`):

| State (base config) | Reduction | Immediate effect | Card text now says |
|---|---|---|---|
| rapport 0, clock 4 | 1 | 4 → 3 | "buying 1 clock unit" |
| rapport −2, clock 4 | 0 | 4 → 4 | "buying nothing — the intrusion clock holds at 4" |
| rapport −5, clock 2 | −1 | 2 → 3 | "buying nothing but exposure — the intrusion clock rises by 1 to 3" |
| rapport 0, clock 0 | 1 | 0 → 0 | "buying nothing — the intrusion clock holds at 0" |
| rapport 2, clock 1 | 2 > clock | 1 → 0 (floor) | "buying 1 clock unit" (not 2) |

The defect case is gone: nothing renders "buying −1 clock units" for a
reward that adds a segment. Engine-level sweep: the A2.3 live check
compares displayed text and real `applyReward` deltas across 91 boundary
states (rapport −6…+6 × clock 0…3). Browser coverage:
`tests/reward_boundary_check.py` (dev build; the trigger is the DEV-gated
`__wp.triggerReward`, stripped from production) drives the five cases in
the table through the real `showRewardOverlay` card renderer and real
`applyReward`, reading the HUD clock before and after the pick — **5/5
boundary cases pass**. These are boundary fixtures, not natural-run
reachability evidence; no production-only hooks were added.

**Mechanical parity re-verified.** `npm run replay` passes 6/6 criteria
(5,000-run default mode) with CSV parity 64/64 combos within 5 pp;
`npm run audit:events` reports 36/36 choices matching `game_data.py`.

## Known issues carried out of Amendment B (recorded, not fixed)

**Clock-reduction clamp question (carried).** The validated simulator's
`apply_reward` computes `max(0, clock − reduction)`, so a negative
reduction raises the clock there too; the parity-repaired engine now does
the same. Clamping the reduction at zero would alter validated behavior
and requires a re-sweep, so it is carried, not fixed. Ranges derived by
executing the simulator function (rapport −8…+6):
under the **default** configuration the reduction is 0 at rapport −3…−2
and **negative from rapport ≤ −4** (−4/−5 → −1, −6/−7 → −2, −8 → −3,
deepening without bound as rapport falls); under **Narrow Focus** the
reduction is 0 for every rapport ≤ 1 and never negative. Live reachability:
five communities bound rapport to [−5, +5] (+1 under Networked), so
negative reductions are reachable in live play — a clock-reduction card
taken at rapport ≤ −4 adds intrusion-clock segments, and the text now says
so. The F-05 product decision and everything in Spec 05 remain as carried
elsewhere in this section.

## A2.4: Regression guards that guard

**The duration guard validates the aggregate it uses.** `instant_chars`
drives the duration estimate, but the seed-555555 reference assertions read
the breakdown fields — the review demonstrated that dropping the epilogue
from `instant_chars` (2,418 → 800) left every reference assertion passing.
The counter now also asserts, for every run, that the aggregate equals the
sum of its validated categories (`instant_chars == Σ instant_breakdown`).
The review's exact aggregate mutation is mutation 3 in
`node scripts/run-counter-mutations.mjs`: it removes only the epilogue's
contribution to the aggregate, the category references stay intact, and
the named aggregate assertion fails (3/3 counter mutations rejected, each
against its named check).

**Correction-strategy decisions.** The correction branch handled reward
picks without incrementing `decisions`, undercounting every
correction-policy run by exactly its five reward picks (seed 506 recorded
6 against 5 event choices + 5 reward choices + the facility choice). The
branch now counts the pick. All six correction runs report **11 decisions**
— event choices, reward choices, and the facility choice actually reached
(501–505 end destruction at the facility; 506 reaches the correction
ending; no facility decision is added to a run that ended earlier).

**F-05 figures refreshed** (same seeds, strategies, rerolls, resume
inventory; corrected build and counter; 37/37 completed, zero console
errors, zero failed same-origin requests by HTTP status; the aggregate
assertion passes on every run):

| Measure | Min | Median | Max |
|---------|-----|--------|-----|
| Typed dialogue characters | 4,833 | 6,474 | 7,095 |
| Typed lines | 44 | 60 | 64 |
| Instant-surface characters | 1,930 | 4,254 | 5,882 |
| Typewriter time at 30 ms/char | 145 s | 194 s | 213 s |
| Decision points (choices + rewards) | 10 | 11 | 11 |

- Attentive (method unchanged): **median ~9.6 minutes** (range 5.5–12.0).
- Leisured (~108 wpm reading, 5 s per decision): **median ~11.9 minutes**
  (range 6.8–15.2).

**Rounding vs measurement, separated.** Every ending, score, and grade in
the inventory reproduces the recorded table exactly (36/36 full runs) —
the A2.3 rounding repair changed no outcome in the set. What moved is
measurement only: correction-run decision counts 6 → 11 (the
increment fix; the old minimum of 6 was an undercounted correction run,
not an early run), the decisions minimum 6 → 10 (a redhunt early-ender,
previously hidden by the undercount), and the leisured median 11.84 →
11.94 minutes. Console/HTTP-status coverage is preserved (both zero) and
the F-05 closed question stands as restated in Amendment A, unanswered.

**The reachability fixture drives the real evaluator.** The synthetic
self-credit fixture previously computed its own `bestOther + 2 + 1` bound,
so reintroducing self-credit into the real evaluator left both reachability
checks passing. The corrected bound and the assignment enumeration are now
shared functions (`correctedUpperBoundFor`, `zoneAssignmentsFor`); the live
check and the fixture both drive them. Mutation
`A2.4 reintroduces self-credit into the shared reachability evaluator`
makes the fixture fail with `bound 21 >= gate 10`
(`npm run test:mutation`, 9/9 mutations rejected).

**F-04 statement of record.** The check reports **one** gated choice
requiring rewards or documents (CE-05[2] gate 4: best legal choices-only
knowledge 3 < 4, crossed by the document's +1). The prior narrative's
"two gates" was an error against the check's own report; the A1.5 section
carries the in-place correction.

**Five positive legal-path proofs.** The corrected-bound check still
resolves all five gated choices with legal paths — the refactor moved the
bound and assignment construction into shared functions without changing
their output (`npm run test:live`, 46/46).

## A2.5: Unobscured ending capture and evidence refresh

**The harness fix (not a game change).** The walk can return while the
run's next reward surface has already opened — the acked document's
consequence flows straight into a reward pick — and `triggerEnding()`
then rendered the ending screen beneath it. `tests/capture.py` now
dismisses any open reward surface through the real controls before
triggering, and asserts no reward surface is visible in the DOM at
capture time (`ending: reward surface visible in the DOM at capture
time` is a harness failure). Nothing in `src/` changed for this gate.

**Capture 08 — new candidate, unobscured.** The candidate shows the
correction ending screen only: the M3 epilogue with the three community
paragraphs, the filed-report line, the persisted score breakdown (grade
A, final score 76, component rows, reroll penalty ×92%, backstory and
trait lines), and the NEW RUN / TITLE action row. No reward overlay is
present; the DOM assertion ran at capture. Before/after pair:
`staging/2026-09-26-a25-ending-capture/` (`before-head/08-ending.png` =
the A1.6 candidate at the gate start; `after-candidate/08-ending.png` =
this capture).

**Capture 06 — changed by the demonstrated A2.3 cause.** The captured
reward surface offers Dead Power Run (clock suppression) at a moment the
intrusion clock reads 0/10 (the HUD behind the overlay shows it). The
A2.3 truthful-text repair changes that card's body from "buying 1 clock
units" — false at clock 0 — to "buying nothing — the intrusion clock
holds at 0." The other two cards are byte-identical. Before/after pair:
same directory (`06-reward-overlay.png` in `before-head/` and
`after-candidate/`).

**Status: pending operator approval.** Both candidates replace the A1.6
candidates for their captures; the A1.6 rows for captures other than 06
and 08 are untouched and remain pending as they were. Approval is never
inferred from a passing screenshot comparison.

**Operator answer record (A2.5 additions; supersedes the 08 and 06 rows
above for these new candidates):**

| Capture | Approve as new baseline? |
|---------|--------------------------|
| 08-ending (A2.5 candidate — unobscured) | |
| 06-reward-overlay (A2.5 candidate — truthful clock text) | |

**Stale evidence copy of capture 05 refreshed.** The A1.6 pair directory's
`after-candidate/05-save-load-confirm.png` had depicted the interim style
change. It now matches the committed file byte-for-byte, and the committed
file is unchanged from `main` at `2272814` (sha1 `48480a19…` in all three
places). No new baseline approval is needed for unchanged 05.

**Regression evidence.** Capture mode regenerated all 11 baselines; only
`06-reward-overlay.png`, `08-ending.png`, and their `.sha1` sidecars
differ from the gate-start head — all nine other committed baseline files
are byte-identical. Check mode is all green (11/11) and leaves the
baseline directory hash unchanged across the run; expected differences
were recorded here before the check ran, and none remain unexplained.
