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

**Commit:** `8250ff1`

---


## Gate 5.4: The stage host

**Changes.** `src/ui/stage.ts`: the WP-owned stage host, self-contained and free of game concepts (parameterized logical size, default 1920x1080): continuous `s = min(W/1920, H/1080)`, centered via 50%/50% origin-center transform, ResizeObserver + window resize refit. `src/ui/wp.css`: new WP overrides-layer stylesheet importing the vendored framework first (its first statement declares the shared layer order), WP theme tokens (stage geometry and type scale from the composition contract), and the stage-host rules. `src/main.ts`: imports wp.css and the host; DEV-only `__wp.stageFixture()` mounts the bare host with representative controls (buttons, vertical segmented and continuous meters, text) after removing the app's body-mounted overlays, for isolated measurement. `tests/stage_fit_check.py`: measures the displayed stage at the three charter targets (scale 1, 4/3, 2, no bars), the bounded host-fit set (min-fit within 0.001, centered within 1 px, equal opposing bars), and elementFromPoint input alignment at a non-unit and a letterboxed size. `scripts/scan-viewport-units.mjs`: active-declaration scan for viewport units and width/height/orientation breakpoints.

**Validation.** All scale, centering, bar, and input-alignment checks PASS on the unmutated build. Named mutations each fail their named checks in a scratch copy: min replaced with max (4 failures), width-only fit (3), centering translate removed (14, the centering assertions); the unmutated control passes again after restore. Input alignment is asserted independently of the centering checks, so a misplaced control cannot satisfy both. The host files scan clean for viewport units and layout breakpoints.

**Commit:** `d6873c0`

---

## Gate 5.5: Every screen on the new framework, inside the stage

**Changes.** `src/ui/gameui.ts` rewritten as the WP composition bridge over the gc primitives: the same factory shapes WP already consumes (button, modal, switch, toggle, card), emitting gc classes plus `wp-*` compositions; accents collapse to the contract roles via `data-wp-accent` (primary/info/magic to cyan, success/warning to amber, danger to red). `src/ui/layout.ts` mounts the stage host and the journey DOM inside it; screens and modals mount inside the stage (the transformed stage is their containing block). `src/ui/hud.ts` rebuilt on the meter family (segmented clock, continuous knowledge and rapport, pips for resources; values ride `--gc-meter-value`). `src/styles.css` reworked: every `--gui-*` token replaced with gc/wp equivalents, the 33vh/100vh/80vh geometry replaced with contract stage regions, the full-stage overlay rule made uniform (`.wp-overlay`, overflow-y auto, safe centering), the dossier breakpoint removed. `src/ui/wp.css` gains the composition layer: accent scoping, button variants, panel headers, meter label rows, modal, card, switch/toggle, and the stage-root pin of the one viewport-bearing framework token. `src/engine/chargen.ts`: the single authorized presentation-token literal migrated (`var(--gui-surface-strong)` to `var(--gc-surface-raised)`); no gameplay change. `index.html`: predecessor stylesheet links removed. `vendor/gameui/`: tracked removal staged; the working copy moved to the ignored `recycle-bin/vendor-gameui-retired-2026-10-04/`. Harness selectors migrated (`.gui-btn` to `.gc-button`, `.gui-card` to `.wp-card`, `.gui-modal` to `.wp-modal`, plus switch, toggle, panel, and bar equivalents). New `tests/screen_walk_check.py`: walks every screen with its extremes, enumerates full-stage overlays from the DOM (position:fixed covering the stage; never a named list), asserts scroll behavior and top-surface control reachability, clicks for real at a fractional and a letterboxed size, and asserts the production page exposes no `__wp` control object. New DEV-only walk fixtures (`dossierExtreme`, `showDocument`, `gotoScene`, `hideOverlays`). tsconfig note: its include list named `vendor/gameui/**/*.d.ts`; that pattern now matches nothing, which tsc tolerates, so tsconfig stayed untouched.

**Validation.** gui-token counts across src/tests/scripts/index.html: 425 `gui-` and 251 `--gui-` before, 0 and 0 after; `vendor/gameui` references 19 before (runtime includes), 2 after (both stale documentation links in tests/README.md, refreshed at gate 5.11); the chargen exception migrated. `vendor/gameui/` absent from the tree, present in history. The screen walk passes with the required surface inventory reconciled; the ending overlay exercises the real scroll path. Mutation: removing the overflow mechanism the reward overlay actually uses (the shared `.wp-overlay` rule) fails the check (15 failures); the unmutated control passes. The application-wide scan (`src` + `index.html`, 29 files) finds no active viewport unit or layout breakpoint; the stage root pins the vendored `--gc-font-size-xl` clamp. Production build passes; `npm run test:live` 46/46.

**Commit:** `7db6bed`

---

## Gate 5.6: Industrial composition of the journey and title screens

**Changes.** The status rail rebuilt to the contract: the intrusion clock is a vertical segmented meter at the rail's left edge spanning the stat rows (`--gc-meter-count` = the clock maximum, fill = the live clock, segments red at every urgency; the panel border and readout carry the cyan/amber/red urgency ramp); knowledge is a continuous meter against a fixed visual scale (twice the default threshold) with an amber threshold marker positioned by the effective trait-adjusted threshold, so Clear-Headed moves it; rapport amber or red by sign; resources as amber pips with the exact count in the readout and the pip capacity documented on the element. The dialogue band: circular 160 px portrait medallion at the left edge, the speaker label rendered inline at the text block's start (amber), the text row scrolling internally on overflow, and choices as large buttons pinned beneath the text. The title: 96 px display line, 28 px subtitle, 560x72 menu buttons, and the empty `#build-id` element gate 5.7 fills. Fonts: the composition uses the framework's technical mono stack; no additional face is required, so no font file ships (the contract's only-if clause).

**Validation.** New `tests/composition_check.py`: journey and title regions match the contract within 2 logical px at 1920x1080; in a live run the clock's quantized fill reads zero segments at start with count = clockMax; the knowledge marker sits at the effective threshold both under the default configuration (50.5 percent measured against the fixed scale) and under Clear-Headed (46.0 percent); modules above eight render capped pips with the exact readout; the PA-003 confirmation measures the vertical fill at the track's inner width (excluding border) within 1 logical px at clock 0, 4, and 10; the palette walk samples every visible element's color, background, border, and outline on the journey and title and finds no green; enabled controls perform their documented actions in the live run (settings, load, new game, band advance, save, choice, reward pick) and the disabled CONTINUE retains its state; dialogue body and title display compute at the contract sizes. Mutations in a scratch copy: hardcoding the threshold marker to the default threshold fails the Clear-Headed marker assertion; assigning a green (`rgb(34, 197, 94)`) to a rail label fails the palette check. An earlier mutation attempt with `oklch(70% 0.17 140)` was correctly NOT flagged: it computes to HSL saturation below the contract's 25 percent green threshold. Unmutated controls pass. Screen walk and stage-fit checks still pass.

**Commit:** `fee41c0`

---

## Gate 5.7: Build identifier and the ML01 preview

**Changes.** `vite.config.ts`: build-time injection of `__WP_BUILD__` (full HEAD SHA plus a dirty flag; staged and unstaged tracked changes make a build dirty, and so does untracked runtime source under src/data/assets/public; ignored evidence and build output do not; a build outside git context labels itself unknown/dirty rather than clean). `src/main.ts`: renders the identifier at boot: visible short SHA (and any dirty marker) in the title's `#build-id` element, full values in `data-build` on the root element; the dev server shows a `dev:` marker with the SHA. `tests/build_id_check.py`: asserts the served page's DOM-reported SHA equals the expected commit with the expected dirty flag and the visible short SHA; parameterized base and expected SHA.

**Validation.** Dev rendering verified (`dev:fee41c0`, dirty true on the uncommitted working tree: the dirty-detection mutation evidence). The hosted verification runs after this commit's clean rebuild: the served preview at `https://within.donfather.site/` must report this commit's SHA with dirty false; recorded with the next checkpoint. Preview-reversal baseline: the starting main commit is `ff9f442`; withdrawing the candidate means rebuilding that revision from a clean checkout into the existing `dist/` target, no nginx or symlink change.

**Commit:** `8414184` (the hosted preview reports this SHA with dirty false, verified through https://within.donfather.site/ after the commit's clean rebuild; the wrong-expected-SHA mutation fails the check)

---

## Gate 5.8: The harnesses at the stage, and the carried harness defects

**Changes.** Every ordinary capture/gameplay harness defaults to 1920x1080 at device scale factor 1 (`capture.py`, `complete_run.py`, `preview_check.py`, `resume_check.py`, `reward_boundary_check.py`; the stage-fit host-fit matrix and the deliberately constrained fixtures are the named exceptions). `capture.py`'s network rule replaced: every same-origin response with HTTP status 400 or above is a failure; the `/assets/` warning downgrade and its justification comment are gone; transport failures are recorded with their actual failure reason and never labeled HTTP statuses. `resume_check.py`'s 2560x1440 workaround viewports removed: the comms overlay is a full-stage surface whose scrim no longer occludes the sidebar SAVE control, so every phase runs at the default viewport (`#comms-overlay` scrim is pointer-events none, its panel interactive: the comms window stays save-enabled). The HUD stats column carries `#stat-panel` again (lost in the gate 5.6 rail restructure; restored). New `12-journey-midrun.png` captures the composed journey mid-run with choices showing and the clock at a middle value via the real HUD path; the build identifier is masked to a fixed token before capture after asserting it present and non-empty. `tests/baseline/manifest.json` written in capture mode: `01-title` and `12-journey-midrun` are this unit's `pending-approval` candidates; every other capture is `interim`. Check mode never writes the baseline directory.

**Carried defects.** (1) The dev ambient-audio "404": reproduced and classified with evidence: the request for `/assets/audio/bgm-ambient.ogg` never receives an HTTP status; the browser reports `requestfailed` with `net::ERR_ABORTED` when the BGM crossfade cancels the in-flight media load; the file itself serves HTTP 200 with a valid OggS signature. The harness classifies exactly that shape (same-origin `.ogg` under `/assets/audio/` aborted in transport) and nothing else; no application audio change. (2) A missing-asset mutation exposed a second masked path: the dev server SPA-fallbacks missing files, so a missing asset arrives as 200 text/html rather than a 404; asset paths answered as HTML are recorded as failures carrying their actual status. The missing-portraits mutation now fails the check (18 fallback failures); with no mutation the harness reports zero same-origin failures, zero transport failures, and zero warnings. (3) The `07-comms-interrupt` transient: not reproduced (five consecutive green check runs, baseline hash unchanged each time). Timing evidence: the comms hook's render-plus-visibility over 20 trials is 2.3 to 16.9 ms (median 3.4) against the harness's 400 ms pre-assertion wait, a 24x margin; the step is synchronous DOM construction followed by a fixed wait. The plausible cause class is harness scheduling under host load exceeding that window, recorded as a hypothesis, not a demonstrated cause: the acceptance item stays unresolved for the review surface.

**Validation.** Five consecutive `--check` runs green with the baseline directory hash unchanged; the manifest lists every capture pending-approval or interim, none approved; the mutation and control evidence above; `resume_check` 12/12; `reward_boundary_check` 5/5; `preview_check` green; walk, composition, and stage-fit checks green after the fixes.

**Commit:** `372ecdc` (worklog checkpoint committed separately after the gate commit omitted it; the repair changes the worklog only)

