<!--
---
title: "Core Source"
description: "Domain-neutral framework primitives and shared base behavior"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-25"
version: "1.2"
status: "Active"
tags:
  - type: directory-readme
  - domain: core
  - tech: [css]
related_documents:
  - "[Framework Source](../README.md)"
  - "[Cascade and Overrides](../../docs/cascade-and-overrides.md)"
---
-->

# Core Source

This directory contains domain-neutral CSS primitives. Every default selector
is wrapped in `:where()` so consumers can override it without specificity
escalation.

---

## 1. Contents

```text
core/
├── base.css          # Reset, document defaults, and specificity probe
├── components.css    # Registered core primitives and state bindings
└── README.md         # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [base.css](base.css) | Layered base rules and core defaults | Active |
| [components.css](components.css) | Button, panel, input, the meter family, and zero-raster spike styles | Active |

---

## 3. Registered core primitives

`components.css` publishes `.gc-panel`, `.gc-button`, `.gc-input`, and `.gc-meter`
plus the `.gc-spike` zero-raster specimen. `.gc-meter` is a family: `data-shape`
(`continuous`, `segmented`, `pips`) and `data-orientation` (`horizontal`,
`vertical`) on the element, an optional `.gc-meter__trail` secondary band
expressing recent loss, and unit counts carried by the token-valued
`--gc-meter-count` channel rather than markup. Quantized geometry is pure CSS,
so segmented and pip fills always land on whole units. They are registered
scenarios in the conformance harness (`harness/registry/scenarios.js`), so they
carry declared layer membership, required tokens, theme and viewport coverage,
scripted interactions, and named capture checkpoints. The reference application
and the Playwright runner render and drive them from that single declaration.

Per `AGENTS.md`, a component without a registered scenario is incomplete
regardless of whether it renders. These primitives were provisional and
unregistered during Phase 1 because the foundations spec forbade the registry;
Phase 2 Gate 2.2 registers them, which lifts the provisional qualifier.

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Framework Source](../README.md) | Parent directory |
| [Cascade and Overrides](../../docs/cascade-and-overrides.md) | Consumer override contract |
