<!--
---
title: "Gate 5.1 Reference Record: ff9f442 Parity Baseline and Content Extremes"
description: "The unchanged-application parity record (37 identified runs, raw score extracted by read-only harness instrumentation) plus the verification suite counts and the content-extremes baseline taken before any presentation change"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-10-04"
version: "1.0"
status: "Active"
tags:
  - type: report
  - domain: [ui, engine]
  - tech: [typescript, python, playwright]
related_documents:
  - "[Composition contract](composition-contract.md)"
  - "[Instrumentation diff](gate-5.1-instrumentation.diff)"
  - "[Parity reference JSON](ff9f442-parity-reference.json)"
  - "[Content extremes baseline](gate-5.1-content-extremes.json)"
---
-->

# Gate 5.1 Reference Record

The parity reference for this unit, taken from an isolated, exact `ff9f442` source tree before any presentation or harness change on the working branch. Gate 5.9 compares against this record; any difference is a failure to fix, not a finding.

---

## 1. Application identity

| Item | Value |
|---|---|
| Application commit | `ff9f442f93f0205d3ed863cd08f94de6f858578b` (PR 6 merge; WP `main` at startup) |
| Source tree | isolated git worktree at that commit, built fresh (`tsc && vite build`, no exec-bit fallback needed) |
| Application diff | none: every tracked file at the working tree matches the commit |
| Instrumentation | read-only harness extension to `tests/complete_run.py` only (extracts the existing `Raw score` DOM row into the results JSON; adds the `WP_COMPLETE_RUN_OUT` output-path redirect so later one-run traces cannot overwrite this record) |
| Instrumentation diff | `gate-5.1-instrumentation.diff` (48 lines, harness file only, recorded separately from the unchanged application) |
| Output | `ff9f442-parity-reference.json` |
| Output SHA-256 | `422cf708115ae2df6e4e314f927a7d7ed96ab4e72203cc5f8f91c132e5e119e5` |
| Complete-run verdict | 13 of 13 harness checks PASS, exit 0 (`gate-5.1-complete-run-log.txt`) |

---

## 2. The 37 identified runs

Identity is seed + policy + reroll status + resumed/uninterrupted. All 37 completed. Columns: outcome, grade, raw score (instrumentation extraction), final score, decision count, typed characters/lines, instant characters.

| # | Seed | Policy | Identity | Rerolled | Outcome | Grade | Raw | Final | Decisions | Typed | Instant |
|---|---|---|---|---|---|---|---|---|---|---|---|

|  1 | 555555 | knowledge | uninterrupted | no | destruction | C | 55 | 55 | 11 | 6762/62 | 2418 |
|  2 | 555555 | knowledge | resumed | no | destruction | C | 55 | 55 | 7 | 3064/26 | 2233 |
|  3 | 20260916 | knowledge | uninterrupted | no | clock-failure | D | 35 | 35 | 10 | 5576/49 | 3081 |
|  4 | 20260916 | consumable | uninterrupted | no | clock-failure | C | 45 | 45 | 10 | 5576/49 | 3082 |
|  5 | 7 | clockburn | uninterrupted | no | clock-failure | F | 11 | 11 | 10 | 5169/47 | 4225 |
|  6 | 11 | knowledge | uninterrupted | yes | destruction | C | 55 | 50 | 11 | 6583/61 | 3685 |
|  7 | 42 | consumable | uninterrupted | no | destruction | B | 64 | 64 | 11 | 6841/60 | 5813 |
|  8 | 99 | clockburn | uninterrupted | no | destruction | D | 36 | 36 | 11 | 6399/56 | 4320 |
|  9 | 31337 | knowledge | uninterrupted | no | destruction | B | 61 | 61 | 11 | 6885/62 | 4699 |
| 10 | 2027 | consumable | uninterrupted | no | destruction | B | 72 | 72 | 11 | 7092/62 | 4006 |
| 11 | 12345 | clockburn | uninterrupted | no | clock-failure | F | 11 | 11 | 10 | 5162/52 | 4532 |
| 12 | 777 | knowledge | uninterrupted | no | destruction | B | 61 | 61 | 11 | 6723/63 | 4359 |
| 13 | 8888 | consumable | uninterrupted | no | destruction | B | 62 | 62 | 11 | 6909/62 | 4525 |
| 14 | 90210 | clockburn | uninterrupted | no | destruction | D | 34 | 34 | 11 | 6672/64 | 3496 |
| 15 | 60606 | knowledge | uninterrupted | no | destruction | B | 69 | 69 | 11 | 6975/60 | 5494 |
| 16 | 40404 | consumable | uninterrupted | no | destruction | B | 63 | 63 | 11 | 6633/61 | 3515 |
| 17 | 501 | correction | uninterrupted | no | destruction | B | 61 | 61 | 11 | 6628/62 | 3531 |
| 18 | 502 | correction | uninterrupted | no | destruction | C | 59 | 59 | 11 | 6944/59 | 4470 |
| 19 | 503 | correction | uninterrupted | no | destruction | B | 67 | 67 | 11 | 6806/63 | 5882 |
| 20 | 504 | correction | uninterrupted | no | destruction | B | 63 | 63 | 11 | 7002/59 | 4357 |
| 21 | 505 | correction | uninterrupted | no | destruction | B | 63 | 63 | 11 | 7026/61 | 5688 |
| 22 | 506 | correction | uninterrupted | no | correction | A | 83 | 83 | 11 | 7095/60 | 4175 |
| 23 | 601 | redhunt | uninterrupted | yes | clock-failure | F | 13 | 11 | 10 | 5002/45 | 2308 |
| 24 | 602 | redhunt | uninterrupted | yes | clock-failure | F | 13 | 11 | 10 | 5043/44 | 3033 |
| 25 | 603 | redhunt | uninterrupted | yes | destruction | D | 40 | 33 | 11 | 6447/63 | 5300 |
| 26 | 604 | redhunt | uninterrupted | yes | destruction | F | 34 | 28 | 11 | 6438/62 | 3434 |
| 27 | 605 | redhunt | uninterrupted | yes | correction | F | 57 | 29 | 11 | 6945/63 | 5139 |
| 28 | 606 | redhunt | uninterrupted | yes | destruction | F | 46 | 23 | 11 | 6206/57 | 5567 |
| 29 | 607 | redhunt | uninterrupted | yes | clock-failure | F | 13 | 6 | 10 | 5183/52 | 3302 |
| 30 | 608 | redhunt | uninterrupted | yes | clock-failure | F | 13 | 6 | 10 | 4833/45 | 1930 |
| 31 | 609 | redhunt | uninterrupted | yes | clock-failure | F | 13 | 6 | 10 | 4998/46 | 3953 |
| 32 | 610 | redhunt | uninterrupted | yes | clock-failure | F | 11 | 7 | 10 | 4959/44 | 2043 |
| 33 | 611 | redhunt | uninterrupted | yes | destruction | F | 40 | 20 | 11 | 6403/57 | 5478 |
| 34 | 612 | redhunt | uninterrupted | yes | destruction | D | 39 | 33 | 11 | 6346/61 | 4449 |
| 35 | 613 | redhunt | uninterrupted | yes | destruction | F | 42 | 21 | 11 | 6501/62 | 5574 |
| 36 | 614 | redhunt | uninterrupted | no | destruction | D | 40 | 40 | 11 | 6315/59 | 4284 |
| 37 | 615 | redhunt | uninterrupted | yes | clock-failure | F | 11 | 5 | 10 | 4833/45 | 2300 |
<!-- RUN-TABLE -->

Coverage: all three endings present; reroll runs present; a mid-run save and resume pair present (rows 1 and 2 share seed 555555 and twin-match at 55/C). The counter cross-check against the independent seed-555555 trace reconciled to delta 0 on typed characters and exact matches on comms and epilogue counts.

---

## 3. Verification suite at the same commit

Ran in the same isolated worktree, sequential, all exit 0 (`gate-5.1-suite-log.txt`).

| Suite | Verdict |
|---|---|
| Live checks (`npm run test:live`) | 52 of 52 PASS |
| Mutation checks (`npm run test:mutation`) | 9 of 9 named mutations each failed their named behavioral assertion; no import or build errors accepted as evidence |
| Counter mutations (`node scripts/run-counter-mutations.mjs`) | unmutated control passed; all 3 named mutations rejected by their named equality checks |
| Event audit (`npm run audit:events`) | all 36 choices match `simulation/game_data.py` exactly |
| Replay (`npm run replay`) | 6 of 6 validation criteria passed; CSV parity 64/64 combos within 5 pp correction rate (max delta 1.39 pp) |

---

## 4. Content extremes

Script: `scripts/content-extremes.mjs` (esbuild runner) + `scripts/content-extremes.entry.ts` (analysis). One documented command:

```bash
node scripts/content-extremes.mjs [--data <dir>]
```

The script reads `data/` and the existing rendering/view-model helpers (`SceneRunner.getChoiceViews`, `getRewardsForStop`, `buildEpilogue`, `buildDossierView`, `backstoryEpilogue`, `traitEpilogueLine`, `buildScoreBreakdown`) and reports, per string class, the id, character count, measured text, source/helper file, and the producing state. It hand-maintains no data strings. Baseline output: `gate-5.1-content-extremes.json` (also `docs/presentation/gate-5.1-content-extremes.json`).

**Headlines** (full detail in the JSON): dialogue line 317 (`evt-ce04-arrive#0`); rendered choice label 119 (`scene-facility-02#0`, facility suffix under Fragile Kit at threshold 11); reward description 152 (`CE-04` clock-reduction, the rapport -5 exposure interpolation, reachable at five harmed communities); document body 1194 (`FD-07`); comms line 180 (red band, afterStop 3); correction epilogue at maximum assembly 2443 displayed characters (five communities, each at its longest variant); score rows 7 plus two conditional lines; route label 19 (`Irongate Settlement`).

**Deliberately synthetic, not playable content:** the score-row cap-note probe uses a documented upper-bound state (per-event knowledge maxima stacked across all five stops, raw 210 against the 103 cap); the reroll-penalty line is measured at the harness maximum of 8 rerolls and grows without bound beyond two digits at 13+. The score cap-note condition is reported as an upper-bound analysis, not a reachable run state.

**Mutation evidence (validation):** a scratch copy of `data/` with `scene-lore-01#0` lengthened from 67 to 439 characters reports the dialogue-line extreme as 439 at `scene-lore-01#0`, while the pristine run reports 317 at `evt-ce04-arrive#0`. The script reads the data; a list would have kept the old answer.

**No tracked file under `data/` changed** (working-tree `git status` on `data/` is empty).

---

## 5. Replay instructions

```bash
git worktree add <dir> ff9f442
ln -s <repo>/node_modules <dir>/node_modules
cd <dir> && npm run build
# apply gate-5.1-instrumentation.diff to tests/complete_run.py
WP_COMPLETE_RUN_OUT=<path> /opt/agents/venv/bin/python tests/complete_run.py
sha256sum <path>   # must equal the hash in section 1
```
