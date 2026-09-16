<!--
---
title: "Metrics"
description: "GameUI metrics factory — FPS sparkline, frame-time readout, and consumer-fed numeric stat rows; GPU-agnostic"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-22"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, components]
  - tech: [css-custom-properties, css, javascript, canvas]
related_documents:
  - "[Components](../README.md)"
  - "[Factory Pattern](../../README.md#6-factory-pattern-interactive-components)"
---
-->

# Metrics

[`metrics.css`](metrics.css) and [`metrics.js`](metrics.js) ship three telemetry readouts. Each metric samples `requestAnimationFrame` timestamps in its own loop or accepts a consumer-fed manual series; none touch `navigator.gpu` or assume a WebGPU context. The framework never integrates with the consumer's render loop.

| Factory | Sampling | Returns |
|---------|----------|---------|
| `createFpsSparkline({ accent, source, width, height })` | `source: "raf"` runs an internal rAF loop; `source: "manual"` takes `push(fps)` | `{ el, canvas, start, stop, push, draw, getFps, source }` |
| `createFrameTime({ accent, source })` | same source model; shows current / min / max ms | `{ el, start, stop, push, getStats, source }` |
| `createStatRows({ title, rows })` | consumer-fed via `set(label, value)`; optional per-row sparkline | `{ el, set, setRow, getRow }` |

The `source` split exists so a consumer can drive metrics from a worker, a fixed-tick game loop, or a deterministic test harness, while the default `"raf"` path still proves the self-contained sampling loop. Start and stop are the consumer's responsibility so metrics only run when a panel is visible.

## Related

| Document | Relationship |
|----------|--------------|
| [Parent](../README.md) | Components directory |
| [Token contract](../../tokens/tokens.css) | Accent roles consumed via `var()` |
