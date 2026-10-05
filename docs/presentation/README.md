<!--
---
title: "docs/presentation"
description: "Presentation-unit artifacts: composition contract, normalized mockup derivations, and the gate 5.1 parity reference record"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-10-04"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [ui]
  - tech: [css, typescript]
---
-->

# docs/presentation

Artifacts from the framework-migration presentation unit (milestone 05). The composition contract is the build authority for the journey and title screens; the reference record is the parity baseline every later gate compares against.

| File | Purpose |
|---|---|
| `composition-contract.md` | 1920x1080 region bounds, type scale, control minimums, palette role map |
| `mockup-normalized-1920x1080.png` | NB2 mockup scaled by width to 1920x1072, letterboxed into the 1080 stage |
| `mockup-normalized-annotated.png` | the normalization with contract region bounds annotated |
| `gate-5.1-reference-record.md` | ff9f442 parity record: 37 identified runs, suite counts, extremes baseline |
| `gate-5.1-instrumentation.diff` | the read-only harness extension, recorded separately from the unchanged application |
| `ff9f442-parity-reference.json` | the immutable 37-run results JSON (SHA-256 in the record) |
| `gate-5.1-content-extremes.json` | machine output of the content-extremes script at the baseline |
| `gate-5.1-complete-run-log.txt` | complete-run harness output at ff9f442 |
| `gate-5.1-suite-log.txt` | live/mutation/counter/audit/replay output at ff9f442 |
