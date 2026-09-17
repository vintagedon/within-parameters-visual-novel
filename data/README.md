<!--
---
title: "Data"
description: "Game data JSON files consumed by the Within Parameters engine"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-18"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: data
  - tech: json
---
-->

# Data

Game data JSON files consumed by the Within Parameters engine at runtime. All files are typed against the contracts in `src/types/`.

---

## 1. Contents

| File | Description | Status |
|------|-------------|--------|
| [config.json](config.json) | Baseline game config for trait-modifiable values: starting modules, clock base, reward amounts, and score thresholds | Active |
| [characters.json](characters.json) | Character roster (six NPCs, protagonist, archive, engineer) plus portrait, background, and audio manifests that reference asset paths | Active |
| [communities.json](communities.json) | Community name pool for random assignment at run start | Active |
| [protagonist-pool.json](protagonist-pool.json) | Chargen pools: names, surnames, stations, backstories, portrait-key map | Active |
| [scenes.json](scenes.json) | Scene and dialogue data: lore, dispatch and authorization, discovery framing, facility confrontation, three endings | Active |
| [events.json](events.json) | The 12-event production pool (CE-01..CE-05, TE-01..TE-04, AE-01..AE-03); mechanics audited against `simulation/game_data.py` via `npm run audit:events` | Active |
| [found-documents.json](found-documents.json) | The eight M3 found documents (FD-01..FD-08) with event attachments | Active |
| [comms-beats.json](comms-beats.json) | Three clock-scaled Jay Chen comms tiers, two beats each, with data-driven trigger timing and bands | Active |

---

## 2. Notes

`scenes.json` and `events.json` carry the production content from
`game-design/m3-content-design-draft.md` (text) and `simulation/game_data.py`
(numbers). All files reflect the current locked design.

`config.json` is the single source of truth for all trait-modifiable numeric values. Traits reference these values by key rather than hardcoding numbers.

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Engine Spec](../spec/archive/engine-spec.md) | Data schema definitions and engine expectations |
| [M3 Content Design Draft](../game-design/m3-content-design-draft.md) | Source for the events.json and scenes.json rewrite |
| [Trait System v2](../game-design/m3-trait-system-v2.md) | Defines which config.json values traits modify |
