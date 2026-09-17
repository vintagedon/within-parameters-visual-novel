<!--
---
title: "SpecSmith Case Study: Within Parameters"
description: "How spec-driven development shaped a roguelike visual novel from concept through balance validation"
author: "VintageDon + Claude"
date: "2026-04-06"
version: "1.0"
status: "Complete"
tags:
  - type: case-study
  - domain: [methodology, balance]
related_documents:
  - "[SpecSmith Repository](https://github.com/vintagedon/specsmith)"
  - "[Spec 01: Engine Build](../spec/2026-03-15-spec-01-engine-build.md)"
  - "[Spec 02: Balance Simulator](../spec/2026-04-05-spec-02-balance-simulator.md)"
---
-->

# SpecSmith Case Study: Within Parameters

Within Parameters is a roguelike visual novel built as a portfolio piece by a solo developer using spec-driven agentic development. SpecSmith was formalized after the project's core development, but the methodology's principles were already in practice: outcomes defined before implementation, verification criteria before code, and specs as the communication layer between a human orchestrator and AI coding agents.

This case study documents what worked, what didn't, and what the project would look like if the specs had been written in SpecSmith canonical form from the start.

---

## The Project

A browser-based visual novel set in a post-solar-storm underground civilization beneath Washington, DC. The player investigates an archive AI cannibalizing inhabited infrastructure. Roguelike systems (randomized protagonist, trait combinations, modular event pools, scoring cascade) sit inside a narrative framework. Built with Vite + TypeScript, no framework, targeting Azure Static Web Apps and itch.io.

---

## The Pipeline

The developer (an infrastructure engineer, not a game developer) served as orchestrator. Strategic design and architecture happened collaboratively with Claude in Claude.ai Projects. Technical work was captured as specs, then handed to AI coding agents (Claude Code, OpenCode with GLM-5.1) for execution on a bare metal workstation. The developer handled all git pushes and merges; agents branched and committed locally.

| Role | Tool | Scope |
|------|------|-------|
| Orchestrator | Claude.ai Projects | Design, architecture, spec writing, review |
| Coding agent | Claude Code / OpenCode | Implementation from specs |
| Code review | KiloCode + GLM-5 | Post-build bug detection |
| Balance validation | GDR (Gemini Deep Research) | Trait system pre-validation |
| Balance simulation | Python (agent-built) | Monte Carlo parameter sweeps |

---

## What Was Spec-Driven

### Engine Build (Spec 01)

The engine spec was implementation-prescriptive: 22 named files, complete TypeScript interfaces, component behavioral specs, six-phase build order. Claude Code built it in 13 minutes 38 seconds with zero TypeScript errors. A subsequent code review by KiloCode/GLM-5 found five bugs, all in areas where the spec was silent or ambiguous.

**SpecSmith lesson:** The prescriptive spec produced a perfect first build at the cost of constraining the agent's architectural choices. An outcome-driven spec might have required iteration but could have found a better file organization. For a tight-scope portfolio project, the prescriptive approach was the right tradeoff. The five bugs confirmed the SpecSmith axiom: if it's not in the spec, the agent won't infer it.

### Balance Validation (Specs 02-04)

This is where spec-driven development delivered its strongest results. The sequence:

1. **GDR pre-validation:** Gemini Deep Research reviewed the 64-cell trait matrix and identified five critical issues (N7 mathematically unwinnable, P4 trivializing, rapport feedback loop, P1+N2 null pairing, surplus farming). All five were fixed before any simulation code was written.

2. **Simulator build (Spec 02):** Agent built a Monte Carlo simulator from spec. First run proved the game trivially winnable: 99.7% correction rate, 0.9% std dev. The simulator did exactly what it was supposed to do: it surfaced a broken balance before any content was implemented.

3. **Sweep v1 (Spec 03):** 33 configurations tested across three parameter axes. Zero passed all six validation criteria. Best was 4/6. The sweep identified three structural problems (scoring compression, P6 too strong, N7 doesn't scale with clock speed) that no parametric tuning could fix.

4. **Sweep v2 (Spec 04):** Three structural fixes applied, same grid re-swept, plus bounded agent exploration. The agent found a 6/6 configuration in 5 exploratory runs. Total: 25 million simulated game runs across both sweeps, completed in under an hour.

**SpecSmith lesson:** The validate-before-building principle saved weeks. Without the simulator, balance problems would have surfaced during playtesting with full content implemented, making fixes expensive. With the simulator, balance was validated against placeholder data, and fixes were config changes, not content rewrites.

**The agent exploration pattern is notable.** Sweep v2 gave the agent bounded freedom: "run up to 10 additional configs if you're at 5/6, stop if you're at 4/6." The agent used 5 of its 10 permitted runs to find the winning config. It adjusted two parameters (starting modules and jitter chance) on the best structured candidate and crossed the threshold. This is a middle ground between full prescription and full autonomy: the orchestrator sets the boundaries, the agent explores within them.

---

## What Was Not Spec-Driven

### Content Design (M3)

NPC profiles, event dialogue, found documents, and ending epilogues were designed collaboratively in Claude.ai, not via spec. This was the right call: narrative content requires iterative discussion, not outcome-to-verification contracts. You can't write a test gate for "this dialogue feels right."

The mechanical aspects of content (stat tables, event choice costs, community effect flags) were spec-driven via the trait system v2 and mechanical context documents. The simulator consumed these values directly.

### Art Direction

Concept art exploration happened interactively with NightCafe and NB2. Style convergence is a visual judgment call, not a verifiable outcome. The art direction bible documented the results but didn't drive them through specs.

---

## The Retrospective Specs

The `spec/` directory now contains both the original specs (in `spec/archive/`) and SpecSmith canonical rewrites (specs 01-04). The originals show what was actually executed. The rewrites show what the outcome-driven versions would have looked like.

Key differences:

| Aspect | Original Specs | SpecSmith Rewrites |
|--------|---------------|-------------------|
| File organization | Prescribed (22 named files) | Agent decides |
| Type definitions | Complete interfaces in spec | Described in prose, agent derives |
| Agent logic | Priority rules as pseudocode | Behavioral profile in prose |
| Build order | Six explicit phases | Implied by dependency |
| Validation | Separate section, sometimes informal | Test gates table, always concrete |

The originals worked. The question SpecSmith asks is whether they would have worked *better* with more agent autonomy and tighter verification. For this project's scope, probably not. For larger projects with more complex architectures, the outcome-driven approach scales where prescriptive specs become unwieldy.

---

## Metrics

| Metric | Value |
|--------|-------|
| Engine build time (from spec) | 13m 38s |
| Post-build bugs found | 5 (all in spec gaps) |
| Simulator build time | ~20m (single agent session) |
| Sweep v1 runtime | 21m (33 configs, 21.1M runs) |
| Sweep v2 runtime | 25m (38 configs, 24.3M runs) |
| Total simulated game runs | ~45M |
| Winning config criteria | 6/6 |
| GDR findings (pre-sim) | 5 critical issues, all resolved |

---

## Key Takeaways

1. **Validate before building content.** The simulator proved balance was broken using placeholder data. Fixing config values is cheap; rewriting dialogue to accommodate new stat curves is expensive.

2. **Structural problems resist parametric solutions.** Sweep v1 proved that no combination of three tunable parameters could fix issues in the trait definitions and scoring formula. The structural fixes in sweep v2 addressed independent failure modes, then parametric tuning finished the job.

3. **Bounded agent exploration works.** Giving the agent freedom within constraints (10 configs, specific parameter ranges, clear stop conditions) produced a better result than either full prescription or full autonomy.

4. **Spec gaps become bugs, not improvisation.** The five post-build engine bugs and the initial balance failure both trace to things the specs didn't specify. Agents build what you say. They don't fill gaps from domain knowledge you didn't provide.

5. **The Holdfast pattern transfers.** The Monte Carlo balance simulator, the sweep methodology, and the modifier-only trait design all originated in a sibling project. Spec-driven development creates reusable patterns across projects because the specs themselves are the knowledge transfer mechanism.
