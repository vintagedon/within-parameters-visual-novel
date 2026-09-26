<!--
---
title: "PR 6 Second Review Remediation Worklog"
description: "Per-gate checkpoint worklog for WP spec 04 amendment B (PR 6 second review remediation); mirrored to the central worklog at closeout"
author: "executor agent"
date: "2026-09-26"
version: "1.0"
status: "active"
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

Commit: (pending — recorded at commit)

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

Commit: (pending — recorded at commit)
