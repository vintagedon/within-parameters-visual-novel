<!--
---
title: "Settings Controls"
description: "GameUI settings factory — toggle, switch, slider, and select controls returning live controls with onChange hooks"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-22"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components]
  - tech: [css-custom-properties, css, javascript]
related_documents:
  - "[Components](../README.md)"
  - "[Factory Pattern](../../README.md#6-factory-pattern-interactive-components)"
---
-->

# Settings Controls

[`settings.css`](settings.css) and [`settings.js`](settings.js) ship four interactive controls for settings panels. Each factory wraps a real form control (or a `role=switch` element), so ARIA and keyboard behavior come from the platform. The factory layers state hooks and the consumer-facing `onChange` surface; it never reads or writes game state.

| Factory | Wraps | Returns |
|---------|-------|---------|
| `createToggle` | `<button role="switch">` | `{ el, isChecked, setChecked, toggle, onChange }` |
| `createSwitch` | `<span role="switch">` sliding track | `{ el, isChecked, setChecked, toggle, setDisabled, onChange }` |
| `createSlider` | `<input type="range">` | `{ el, input, getValue, setValue, setDisabled, onChange }` |
| `createSelect` | `<select>` | `{ el, select, getValue, setValue, setDisabled, onChange }` |

Accent modifiers (`.gui-toggle--{accent}`, etc.) map to the seven accent roles through tokens; no skin value lives in the CSS or JS.

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles consumed via `var()` |
| [Framework README §6](../../README.md#6-factory-pattern-interactive-components) | Factory pattern convention |
