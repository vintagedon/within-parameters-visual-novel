<!--
---
title: "Framework Migration and Stage Composition Worklog"
description: "Per-gate checkpoint worklog for WP milestone 05 (framework migration, stage fit, and industrial composition); mirrored to the central worklog at closeout"
author: "executor agent"
date: "2026-10-04"
version: "1.0"
status: "in-progress"
tags:
  - type: worklog
  - domain: [ui, engine, verification]
  - tech: [typescript, css, python, playwright]
# --- Runtime Context (required) ---
agent: "kilo"
runtime: "kilo"
runtime_version: "kilo"
model: "kilo/zai-coding/glm-5.3-flash"
hostname: "ml01"
spec_ref: "spec/2026-09/2026-09-28-wp-spec-01-framework-migration-and-stage-composition.md"
repo: "within-parameters-visual-novel"
category: "game-design"
# --- Token Usage and Cost ---
token_usage_source: "unavailable"
---
-->

# Worklog: WP Milestone 05, Framework Migration and Stage Composition

Branch: `agent/2026-09-28-wp-01-framework-migration-and-stage-composition`, opened off `main` at `ff9f442` (the PR 6 merge; startup confirmed `main` equals that commit and the tree clean). Staging discipline: explicit paths only. Operator interactions: none so far (the spec declares `Attended: No`; no question has been put to the operator).

Startup prerequisites, all four verified before the first change: (1) WP `main` at `ff9f442`, clean tree; (2) framework `main` at `952ae06e071a326e02f4ecb008256644fe2a5290` (PR #4 merge), coordination decisions verified across charter v1.8, GC-006/CAP-015 metadata in `ui-pack-inventory.json`, and the capability map's section 7 module ladder; charter version fields agree at 1.8; catalog digest `2ecb0ebd...` recomputed and matched; `node --test harness/tests/reference-corpus.test.js` 9/9; (3) pin contains `a678a2b` with an empty `src/` diff (`git diff --stat a678a2b main -- src/` empty); (4) Playwright Chromium 145.0.7632.6 (floor 125).

---

## Gate 5.1: Reference record and content extremes

**Changes.** New `scripts/content-extremes.mjs` (esbuild runner, same pattern as `run-live-checks.mjs`) plus `scripts/content-extremes.entry.ts`: reads `data/` through the existing rendering/view-model helpers (`SceneRunner.getChoiceViews`, `getRewardsForStop`, `buildEpilogue`, `buildDossierView`, `backstoryEpilogue`, `traitEpilogueLine`, `buildScoreBreakdown`) and reports the longest rendered instance per string class with id, count, text, source/helper, and producing state. `package.json`: `extremes` script entry. New `docs/presentation/`: the reference record, the read-only instrumentation diff (harness-only extension extracting the existing Raw score DOM row and redirecting the results path), the immutable parity JSON (SHA-256 `422cf708115ae2df6e4e314f927a7d7ed96ab4e72203cc5f8f91c132e5e119e5`), the complete-run and suite logs, and the machine extremes baseline.

**Reference.** Taken in an isolated worktree at exact `ff9f442` (node_modules linked, fresh `tsc && vite build`, no exec-bit fallback needed). 37 runs, all completed, 37 unique identities; 13 of 13 harness checks PASS. Suite at the same commit: live 52/52; mutation 9/9 named-failure; counter mutations control + 3/3 rejected; audit 36/36; replay 6/6 criteria (CSV parity 64/64 within 5 pp).

**Validation.** Record names commit, diff, hash, and all 37 runs with outcome, grade, raw, final, decisions, character totals. The extremes script runs from `node scripts/content-extremes.mjs`; the mutation check (scratch `data/` copy, `scene-lore-01#0` lengthened to 439) moves the reported extreme from 317/`evt-ce04-arrive#0` to 439/`scene-lore-01#0`. No tracked file under `data/` changed.

**Commit:** this commit (SHA recorded at the next checkpoint)

---

## Gate 5.2: The composition contract

**Changes.** `docs/presentation/composition-contract.md` (written during the 5.1 working session and committed with the 5.1 checkpoint): source dimensions read from the file (1376x768, aspect 1.7917); the aspect difference handled by width-scaling and letterboxing (recorded choice, no crop); journey region bounds tiling 1920x1080 exactly (margins 48; scene 1423 = 78.0% of 1824; rail region 401 = 22.0% with a 24 px internal gutter; upper region 688; gutter 24; full-width band 272; arithmetic recorded); title screen treatment bounds; the type scale with a 20 px floor; control minimums and the 160 px medallion; the palette role map (cyan/amber/red/neutral, green absent, sci-fi theme values, `--gc-status-success` never referenced); and a fit statement for every gate 5.1 extreme with its region. `mockup-normalized-1920x1080.png` and `mockup-normalized-annotated.png` derived from the source image.

**Finding F-P1 (recorded, carried to the review surface).** The band grows from the mockup proportion's 201 px to 272 px: the worst real co-occurrence (`scene-facility-02`: 204-char line + 119-char rendered choice) needs 278 px; the mockup proportion cannot hold it. The upper region shortens 768 to 688 accordingly.

**Validation.** Dimensions stated from the file; bounds tile with recorded arithmetic; every journey/title extreme has a region and a fit statement; the role map covers the journey and title element classes with no green; every control drawn corresponds to an implemented action and the inventory grid is absent; frontmatter and tags follow the standards.

**Commit:** `3997178`

---

## Gate 5.3: Framework pin and vendoring

**Changes.** `vendor/gc/`: the framework's consumable `src/` tree extracted verbatim from `git archive 952ae06e071a326e02f4ecb008256644fe2a5290 src/` (16 files), plus the provenance README recording the full pin SHA, charter version 1.8 at the pin, copy date, refresh procedure, and the MIT license. `scripts/check-vendor-pin.mjs` + `package.json` `check:vendor` entry: SHA-256 comparison of every vendored file against `git cat-file blob <pin>:<path>` with equal file counts. `vendor/README.md` interior readme added. `vendor/gameui/` untouched (retires at gate 5.5).

**Validation.** Pin check OK (16 files byte-identical to the framework checkout at the pin; the pin resolves to a commit reachable from framework `main`, verified at startup). Mutation: a scratch copy with one byte changed in `src/core/components.css` fails the check with a byte mismatch (exit 1), pristine passes. Production build passes with the vendored tree present.

**Commit:** this commit (SHA recorded at the next checkpoint)
