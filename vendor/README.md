<!--
---
title: "vendor"
description: "Vendored third-party source trees consumed verbatim by WP"
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

# vendor

Vendored source trees, consumed verbatim. WP never edits a vendored tree; it overrides through its own files.

| Directory | Contents | Provenance |
|---|---|---|
| `gc/` | `html5-game-ui-framework` consumable `src/` at the reviewed pin, plus WP's provenance README | see `gc/README.md`; verified by `npm run check:vendor` |
| `gameui/` | `gameui-browser-gaming-framework` predecessor copy (2026-06-22); retired by gate 5.5 and moved to the ignored `recycle-bin/` | historical; see the phase worklog |
