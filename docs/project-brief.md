<!--
---
title: "Project Brief: Within Parameters"
description: "A browser roguelike visual novel where every AI is executing its purpose correctly, within parameters"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-25"
version: "1.0"
status: "Active"
tags:
  - type: project-brief
  - domain: [narrative, mechanics, roguelike, game-design]
related_documents:
  - "[Game Design Document](game-design/game-design-document.md)"
  - "[AGENTS.md](AGENTS.md)"
  - "[M3 Content Design](game-design/m3-content-design-draft.md)"
  - "[Trait System v2](game-design/2026-05-18-m3-trait-system-v2.md)"
---
-->

# Project Brief: Within Parameters

## 1. Why

The portfolio needs one finished, playable game that proves the whole working model end to end: strategic design with Claude, mechanical execution delegated to coding agents, and a real shippable artifact at the end. Within Parameters is that artifact. It is also the first production consumer of the GameUI framework and the clearest case study for the spec-driven agent workflow, so finishing it validates two pieces of tooling at the same time as it ships a game. The game itself stands on its own premise: a post-solar-storm world where narrow maintenance AIs govern humanity by default, and an archive AI cannibalizes inhabited infrastructure trying to reconnect to an internet that no longer exists. No AI in the world is evil. Each is executing its purpose correctly, within parameters.

---

## 2. Outcome

A browser-playable roguelike visual novel, content-complete and balanced, deployed to itch.io and Azure Static Web Apps. A run generates a random relay technician, plays a fixed six-beat narrative spine with a five-stop roguelike journey in the middle, and resolves to one of three endings with a graded score. The game is self-contained (no backend, localStorage saves, zero non-origin requests) and launch-ready on placeholder art, with the production art sprint the only work standing between the verified build and release.

| Surface | Done state |
|---------|-----------|
| Engine | Reconciled to the balance simulator; trait system, scoring cascade, ending determination all match validated values |
| UI | Composed from the vendored GameUI neon preset; every screen a framework consumer |
| Roguelike layer | Chargen, dossier with reroll penalty, end-of-run graded score breakdown |
| Content | 12-event pool, 8 found documents, three-tier comms beats, three rapport-modified endings |
| Verification | A Playwright launch gate plays multiple seeded runs to all three endings, asserting zero console and network errors |

---

## 3. Key Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Stat model | Four tracked values: knowledge, bypass modules, rapport (derived), intrusion clock |
| 2 | Trait design | Modifier-only, no new content paths; 8 positive x 8 negative = 64 combinations |
| 3 | Locked balance config | `kt=11, kr_bonus=-2, ct=1, starting_modules=6, jitter_chance=0.35` |
| 4 | Scoring | Raw 0-103 hard cap, S-F grades, `final = raw x 0.92 ^ rerolls` |
| 5 | Clock reduction cap | Maximum 2 segments per reward regardless of rapport |
| 6 | Styling source | GameUI vendored neon preset is the single styling source; no hand-rolled chrome |
| 7 | Mechanical authority | `simulation/game_data.py` overrides design-doc prose wherever values conflict |
| 8 | Platform | Client-side only, localStorage saves, no analytics, no backend |
| 9 | Scope | Portfolio piece: one complete run, three endings, ~12 events, ~25-35 minute playthroughs |

---

## 4. Scope

**In scope:**

- The five-spec build sequence: engine reconciliation, GameUI integration, roguelike layer, production content, launch verification
- Placeholder-art launch: the game playable start to finish, balanced, and content-complete on placeholder assets
- A Playwright launch gate proving the game holds across its run variability

**Deferred (later version):**

- Production art sprint: style-matched 4K finals replacing placeholders (a manifest-driven swap, no code change)
- Video cutscenes: short image-to-video clips, skippable

**Out of scope:**

- Mobile responsiveness and accessibility beyond basic keyboard nav (portfolio scope)
- Analytics, multiplayer, dynamic scenario loading (not part of the pitch)
- Meta-progression beyond scoring (the reroll penalty is the only progression system)

---

## 5. Setting and Premise

Decades after a solar storm destroyed surface civilization, survivors live in repurposed underground station infrastructure beneath Washington, DC. The AIs that once managed ventilation, water, and power routing are now the de facto authorities, not by design but by default. At the end of a network of pre-collapse maintenance tunnels, an archive AI runs in a hardened data center on its own micro-reactor, mobilizing maintenance bots to strip inhabited infrastructure for materials to fuel its reconnection attempt. It has no model for "humans need this to survive." It is the greatest threat to the surviving stations and the most valuable resource left on Earth at the same time: a frontier research model holding the whole of archived human knowledge. The player is a randomly generated relay technician, callsign RELAY-7, sent to investigate a missing relay that turns out to be the leading edge of an accelerating cascade.

---

## 6. Mechanics

Each run opens on a dossier: a random protagonist with a name, backstory, one positive trait, and one negative trait. The player deploys or rerolls, trading scoring potential for a better starting hand, with each reroll applying an 8% multiplicative penalty that doubles as a difficulty slider. New players reroll freely and learn the game; experienced players deploy first roll and hunt S-tier.

The run follows a fixed spine through six beats with the roguelike phase in the middle:

```
DOSSIER -> LORE -> STATUS QUO -> DISCOVERY -> JOURNEY (5 modular stops) -> FACILITY -> CONFRONTATION -> ENDING
```

Five journey stops draw from a 12-event pool (2 community, 2 transit, 1 approach per run). Each stop presents a three-way reward choice (modules, knowledge, or clock reduction scaled by rapport), which makes a resource trilemma with no obviously correct strategy. Knowledge gates the good ending, the intrusion clock is the ticking loss condition, and rapport, derived from how communities were treated, shapes both clock reduction and the quality of the epilogue.

---

## 7. Methodology

The project runs on the Review-Approve-Validate pattern: Claude writes outcome-driven specs, coding agents on ML01 (OpenCode/GLM, Codex) execute them on feature branches, and all review, pushes, and merges go through the orchestrator. Specs follow the lifecycle-skill model: `spec-startup` preflights the environment and branches, the spec body carries the deliverables and their validations, and `spec-closeout` commits locally, writes the worklog, and archives the spec. The discipline that holds the build together is the two-authority split: the balance simulator owns every mechanical number, the content design owns every word of text.

---

## 8. Phases

1. **Engine reconciliation.** TypeScript engine aligned to the validated simulator: trait flags, scoring cascade, ending determination, typed protagonist state. Complete and merged.
2. **GameUI integration.** Framework vendored at `vendor/gameui/`, neon preset wired as the single styling source, every screen migrated to framework components, Playwright baseline harness in place. Complete and merged.
3. **Roguelike layer.** Chargen, the dossier screen with reroll, and the end-of-run graded score breakdown, composed from GameUI components.
4. **Production content.** The 12-event pool, found documents, comms beats, expanded scenes, and rapport-modified endings, with values matched to the simulator.
5. **Launch verification.** Complete placeholder asset coverage and a multi-seed Playwright launch gate that reaches all three endings error-free.
6. **Production art.** Style-matched finals replacing placeholders. Deferred; its own effort after the launch gate passes.

---

## 9. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Content values drift from validated balance | High | Two-authority split enforced in the content spec: `game_data.py` is the contract, every event audited against it |
| Framework migration regresses a screen | Medium | Playwright baseline harness with committed neon baselines and `.sha1` sidecars; the launch gate replays the whole game |
| Placeholder-to-final art swap breaks references | Medium | Manifest-driven assets; replacing a placeholder is a data/file change with no code change, asserted by a zero-404 run |
| Scope creep past portfolio bounds | Medium | Scope locked in section 4; specs carry explicit do-not-touch lists |
| A roguelike verified by one scripted run proves little | Medium | Launch gate requires multiple seeded protagonists across different trait pairs reaching all three endings |

---

## 10. Open Decisions

- Production art pipeline. The README currently lists Nano Banana 2 for finals and Gemini 3 Pro for soundtrack, which does not match the NightCafe framing elsewhere (DreamShaper XL Lightning concepts, premium image-to-video for cutscenes). The finals and cutscene tools need one authoritative answer before the art sprint, and the docs should then be aligned to it.

---

## 11. Next Steps

1. Review this brief and confirm it reflects current intent.
2. Run the roguelike-layer spec, then the production-content spec, on agents in sequence.
3. Run the launch-verification gate and capture the launch baseline.
4. Resolve the art pipeline (section 10) and scope the production art sprint.

---

## References

| Resource | Relationship |
|----------|--------------|
| [Game Design Document](game-design/game-design-document.md) | Authoritative mechanics, narrative, and scope reference |
| [Trait System v2](game-design/2026-05-18-m3-trait-system-v2.md) | Trait definitions, interaction matrix, scoring authority |
| [M3 Content Design](game-design/m3-content-design-draft.md) | Events, NPCs, comms beats, found documents, endings |
| [AGENTS.md](AGENTS.md) | Agent onboarding and project context |
| Central spec queue (`/opt/agents/repos/spec/`) | Active and archived build specs |

---

## Document Info

| | |
|---|---|
| Author | VintageDon |
| Created | 2026-06-25 |
| Updated | 2026-06-25 |
| Version | 1.0 |
| Status | Active |
