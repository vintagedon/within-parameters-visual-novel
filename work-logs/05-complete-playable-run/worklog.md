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

# WP Complete Playable Run: In-Repo Worklog

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

## Gate 4.1: Live choice resolution through the validated resolver

**Commit:** 2cf6016

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

## Gate 4.2: A single authoritative ending outcome

**Commit:** c83b3f3

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
  knowledge-8 review probe (destruction everywhere, outcome non-null, the
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
  fixCost) while the frozen breakdown reflects the arrival-state cascade,
  identical to simulator arithmetic for correction runs and consistent with
  the authored shutdown fiction for destruction runs.

## Gate 4.3: The 12-event production pool

**Commit:** 499966d

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
## Gate 4.4: Found documents

**Commit:** bfee4c2

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

## Gate 4.5: Comms beats

**Commit:** e5466e2

**Changes:**

- New `data/comms-beats.json`: the three clock-scaled tiers (green 0-3,
  amber 4-6, red 7-9), two Jay Chen beats each (after stop 1, after stop 3),
  full M3 dialogue. Timing (`afterStop`) and bands (`min`/`max`) are data.
- `src/types/scene.ts`: `CommsTierDef` / `CommsBeatDef` / `CommsBeatsData`.
- `src/engine/scene-runner.ts`: the hardcoded
  `shouldTriggerComms(stop, clock)` condition is removed from
  event-system.ts; the runner now consults the registry's comms data on
  every stop transition, selecting the tier whose band contains the live
  clock at trigger time and firing the beat keyed to the completed stop.
  `onCommsInterrupt` carries the beat and tier id.
- `src/ui/screens.ts`: the comms overlay renders the ordered exchange as
  speaker-labeled lines (new `.wp-comms-speaker` accent span; no existing
  visual values touched).
- `src/main.ts`: loads comms-beats.json, wires the callback. Comms speakers
  keep the callsign: the protagonist renders as RELAY-7 on the comms
  channel regardless of the rolled name (frozen boundary). The dev-hook
  comms trigger now renders a real loaded beat instead of a hardcoded
  string.

**Verification evidence:**

- Live-path checks: 19/19. 4.5 additions: beat A fired in all three tiers
  with correct M3 first lines (clock 0 -> green, 3 -> amber, 6 -> red after
  the stop tick); beat B fired after stop 3 with the tier read live at the
  trigger across multiple starting clocks; data check confirms three tiers,
  both beats per tier, full exchanges, and no hardcoded timing.
- Browser smoke (dev server, seeded, no dev hooks): full passage through
  comms interrupts with zero console errors.

## Gate 4.6: Scenes, NPCs, and rapport-modified epilogues

**Commit:** 6e70c5b

**Changes:**

- `data/scenes.json` expanded: the Torres authorization beat (Beat 2A,
  "Cleared. Log it when you're done."), the corrected discovery text (five
  stops plus fixed facility entry; the six-stop text is gone), an expanded
  facility entry and archive-core confrontation in the archive's "system
  update" voice (including the M3 847-node discrepancy dialogue on the
  correction path), and the three ending scenes with M3-flavored moments.
  The dialogue-embedded "CHEN:" prefixes are dropped now that the speaker
  bar carries names.
- `data/characters.json`: the six-NPC roster per M3 (Jay Chen, Torres,
  Aguilar, Dex, Sato, Archive AI) plus the generic engineer, with M3
  expressions and name colors, and the M3 portrait manifest keys. The
  archive renders no portrait (a voice on a terminal).
- `assets/portraits/`: ten missing placeholders generated with the
  established `simulation/generate_placeholders.py` (which skips existing
  files): protagonist-female, protagonist-male, supervisor x2, aguilar x2,
  dex x2, sato x2. Manifest CSV refreshed: 32 placeholder, 4 replaced
  (audio), 2 missing (sfx-click, sfx-alert, enumerated for gate 4.8).
- `src/ui/screens.ts`: `buildEpilogue` now assembles the M3 epilogues:
  base, one line per visited community keyed to helped/ignored/harmed
  (leading article stripped from descriptions for interpolation), then the
  closing; clock-failure carries no community modifiers; the ending is
  read from the persisted outcome. The dossier renders the resolved
  portrait image (initials block only as a missing-file fallback).
- `src/main.ts`: internal-monologue headers show the generated
  protagonist's first name (comms keep RELAY-7; the dialogue bar shows no
  protagonist portrait, which are frozen boundaries).
- `src/ui/dialogue.ts`: the archive speaker hides the portrait area.
- `scripts/run-mutation-checks.mjs`: scratch copies now include vendor/.

**Verification evidence:**

- Live-path checks: 23/23. 4.6 additions: helped-heavy vs harmed-heavy
  correction runs produce epilogues whose five community lines all differ
  (programmatic, not by eye); clock-failure shows no community names; the
  persisted destruction outcome wins over a contradictory passed type;
  scene/beat coverage includes authorization, discovery, facility, and all
  three endings; no scene or event text states six stops; all six NPCs
  exist with M3 expressions and colors; every referenced speaker resolves.
- Browser checks (dev server, seeded, no dev hooks): the dossier renders
  the resolved portrait image; the protagonist header equals the dossier's
  first name and differs between two rolls; comms exchanges show RELAY-7;
  zero console errors.
- `npm run audit:events` still exact; mutation checks still discriminate;
  `tsc --noEmit` clean.

## Gate 4.7: Asset packaging and save/resume

**Commit:** be5e60b

**Changes:**

- `vite.config.ts`: closeBundle now ships the runtime-requested asset
  subtrees (backgrounds, portraits, audio) into dist/assets alongside the
  hashed bundle output.
- New `src/engine/run-rng.ts`: a stateful mulberry32 run RNG
  (getState/setState) in its own module, leaving the validated rng.ts
  untouched.
- `src/engine/scene-runner.ts`: the run RNG drives event-pool shuffles,
  community assignment, and clock ticks; new `snapshot()`/`restoreEngine()`
  capture and rehydrate the RNG stream, Practiced availability, pool
  ordering, and mid-event scene registration.
- `src/types/state.ts`: `SaveSlot.engine?: EngineSnapshot` (the field the
  persisted-resume contract needs); `src/engine/save-manager.ts`: slots
  carry the snapshot; new `loadSlot` returns the full slot.
- `src/ui/hud.ts` + `src/main.ts` + `src/styles.css`: a SAVE action in the
  Route panel opens the save-mode slot modal and writes the slot with the
  engine snapshot; CONTINUE/LOAD resume through `restoreEngine`.
- New `scripts/check-dist-assets.mjs` and `tests/preview_check.py`.
- Known environment defect: `npm run build` failed with `tsc: Permission
  denied`; repaired the launcher exec bit with chmod (recorded; not a code
  defect).
- Baselines re-approved with evidence (art commit 4e9f199): 03 (SAVE
  control + production content), 06 (trait-adjusted HUD values), 07 (comms
  exchange), 08 (M3 epilogue + persisted breakdown), 09/10 (dossier
  portrait image), new 11 (document overlay); 01/02/04/05 unmoved.

**Verification evidence:**

- `npm run build` + `node scripts/check-dist-assets.mjs`: 36/36
  source-present manifest assets in dist/, zero absent; sfx-click and
  sfx-alert enumerated as findings (F-03).
- `tests/preview_check.py` against vite preview: run segment with 28
  same-origin asset/data responses, zero status >= 400, zero console
  errors.
- Live-path checks: 25/25 including slot round-trip field equality and
  same-seed score parity through a fresh runner (destruction 68 == 68).
- Screenshots deterministic after re-approval (capture, check x2 green).

## Gate 4.8: Complete-run verification and review surface

**Commit:** fecfb71

**Changes:**

- `src/engine/live-checks.ts`: three evidence checks (4608-resolution
  live-vs-resolver matrix across 64 combos x 36 choices x both Practiced
  states; 128/128 deadlock-free completions; gated-choice reachability by
  latest drawable stop).
- New `tests/complete_run.py`: complete natural runs against the production
  build (no dev hooks; DEV-gated code absent from the bundle), seeds
  recorded, HTTP status read from responses, baselines hash-guarded.
- New `docs/verification/2026-09-16-complete-run-verification.md`: the
  operator review surface with findings F-01..F-09, each with evidence and
  a closed question.

**Verification evidence (37 completed natural runs):**

- All three endings across the set (11 clock-failure, 24 destruction, 2
  correction); reroll, found-document reads (44), comms at green/amber/red,
  and a save-and-resume whose completed score equals its uninterrupted twin
  (55 C).
- Zero uncaught console errors; zero failed required asset requests by
  HTTP status; no `No eligible events`; tests/baseline/ hash unchanged.
- Spec 03 amendment harness repairs confirmed holding: check mode
  read-only, every declared screen required. The 404-labeling defect is
  repaired in the new harness (status from responses).
- Findings from evidence: F-01 no divergence; F-02 no deadlock; F-03 two
  SFX absent, non-blocking; F-04 all gates reachable; F-05 run length ~5-15
  min vs 25-35 target (volume gap); F-06 red comms tier nearly unreachable
  at authored triggers; F-07 FD-01 fixed-name artifact; F-08 destruction
  inventory accounting; F-09 project-brief disposition.

## Gate 4.9: Documentation reconciliation

**Commit:** ff796e9

**Changes:**

- `AGENTS.md`: repository URL corrected to the live remote
  (vintagedon, verified against `git remote`); SpecSmith link corrected to
  the verified live location (radioastronomyio/specsmith redirects to
  vintagedon/specsmith, title-confirmed); Git Workflow now carries the
  push-and-PR closeout posture (superseding the do-not-push text); the
  Mechanics table reads threshold 11 / Clear-Headed 10 and starting
  modules 6; Phase, Current State, Source Layout, and the spec queue
  refreshed to the post-spec-04 estate, including the open-findings
  pointer to the review surface.
- `game-design/2026-05-18-m3-trait-system-v2.md`: pre-lock values
  corrected to the validated implementation (config block aligned with
  data/config.json: modules 6, jitter 0.35, threshold 11; P6 is -1 not -2;
  P1 total 8; P2/P4 wording under the locked bonus and jitter; P8 is once
  per stop; N7 is +0.25 jitter chance, not forced ticks; summary table
  rows matched).
- `game-design/m3-content-design-draft.md`: stat framework rows corrected
  (threshold 11/Clear-Headed 10; starting 6; Fragile Kit 3).
- `README.md`, `docs/documentation-standards/script-header-*.md`,
  `docs/wp-specsmith-case-study.md`, `docs/README.md`: verified URLs
  corrected; docs index gains the verification directory.
- `data/README.md`, `tests/README.md`: contents refreshed to the
  production data set and the full verification script inventory.
- New `work-logs/05-complete-playable-run/README.md` (interior README
  standard).
- Review surface updated with F-10 (Spec 03 retraction, quoting the
  archived worklog claim verbatim and linking
  `staging/2026-09-13-project-review/natural-run.json` as counter-evidence;
  the archived text itself is untouched) and F-11 (GameUI framework
  repository URL unconfirmed: 404 at both the radioastronomyio and
  vintagedon org paths, recorded rather than guessed).
- Interpretation recorded: historical work logs (04-balance-validation)
  that describe pre-lock values as part of their era's analysis are
  records, not current-state claims, and were left as written; likewise
  pre-existing em dashes in untouched prose of files whose sections I
  edited were left alone. Authored prose in this run's documents contains
  no em dashes.

**Verification:**

- No document outside historical work logs states a knowledge threshold
  or starting module count contradicting `data/config.json` (grep clean).
- `docs/project-brief.md` remains untracked and unmodified; F-09 carries
  its disposition question.

## Gate 4.10: Closeout

**Consistency pass (re-run at closeout):** `tsc --noEmit` clean; live-path
checks 28/28; mutation checks discriminate (5 and 2 failing checks);
event audit 36/36 exact; replay 6/6 criteria with 64/64 combos within 5pp;
build ships 36/36 source-present manifest assets; preview segment zero
failed requests by HTTP status; screenshot check all green; the
complete-run set reproduced identically (11/11 coverage checks, same
outcomes per seed, including seed 615's red-tier beat).

**Harness note:** the screenshot check showed spurious regressions on
03/07 while a complete-run browser verification ran concurrently on the
same host; re-run in isolation it is deterministic and green. Run the
screenshot check without concurrent browser load.

**Publication:** branch pushed; exactly one pull request carries it,
unmerged. Central worklog and registry row written; spec archived.

**Archive-path note:** the spec's gate 4.10 text names
`/opt/agents/repos/spec/2026-06/` as the archive destination while the
closeout skill derives the month from the filename date (2026-09). The
spec's explicit instruction was followed; recorded here and in the defect
register as a spec-internal inconsistency.

**Operator interactions:** none. The run put no question to the operator
(Attended: No; all decisions were spec-pre-decided or executor-scope and
are recorded above). An empty record, stated explicitly.
