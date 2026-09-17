<!--
---
title: "Documentation"
description: "Documentation standards, methodology notes, and reference materials for Within Parameters"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-18"
version: "2.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: documentation
---
-->

# Documentation

This directory contains documentation standards and project-level methodology references. Design documents live in `game-design/`; executable and retrospective specs live in `spec/`.

---

## 1. Contents

```
docs/
├── documentation-standards/       # Templates, tagging rules, and writing guidance
│   ├── code-commenting-dual-audience.md
│   ├── general-kb-template.md
│   ├── interior-readme-template.md
│   ├── primary-readme-template.md
│   ├── script-header-powershell.md
│   ├── script-header-python.md
│   ├── script-header-shell.md
│   ├── tagging-strategy.md
│   ├── worklog-readme-template.md
│   ├── writing-style-guide.md
│   └── README.md
├── balance-methodology.html       # Balance methodology reference page
├── wp-specsmith-case-study.md     # SpecSmith project case study
├── verification/                  # Verification review surfaces (operator approval artifacts)
│   └── 2026-09-16-complete-run-verification.md
└── README.md                      # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [balance-methodology.html](balance-methodology.html) | HTML reference for the balance methodology used during simulator and sweep work | Active |
| [wp-specsmith-case-study.md](wp-specsmith-case-study.md) | Case study on how SpecSmith shaped the project workflow | Active |

---

## 3. Subdirectories

| Directory | Description |
|-----------|-------------|
| [documentation-standards/](documentation-standards/README.md) | Template library, controlled tags, script headers, and prose rules |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory |
| [Game Design](../game-design/README.md) | Design working directory |
| [Spec](../spec/README.md) | Specification directory |
| [AGENTS.md](../AGENTS.md) | Agent context for this project |
