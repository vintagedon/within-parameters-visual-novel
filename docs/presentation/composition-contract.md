<!--
---
title: "WP Composition Contract: Journey and Title at 1920x1080"
description: "Normalized region bounds, type scale, control sizes, and palette role map for the industrial composition, derived from the NB2 mockup and the gate 5.1 content extremes"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-10-04"
version: "1.0"
status: "Active"
tags:
  - type: specification
  - domain: [ui]
  - tech: [css, typescript]
related_documents:
  - "[NB2 UI mockup](../../assets/concept-artwork/ui/ui-mockup-nano-banana-pro-2.png)"
  - "[Annotated normalization](mockup-normalized-annotated.png)"
  - "[Gate 5.1 reference record](gate-5.1-reference-record.md)"
  - "[Framework charter 4.1.1](../../../html5-game-ui-framework/docs/project-charter.md)"
---
-->

# WP Composition Contract: Journey and Title at 1920x1080

This contract normalizes the NB2 mockup into logical pixels at 1920x1080 and binds every region to the gate 5.1 content extremes that render in it. Gates 5.5 and 5.6 implement against it; the gate 5.6 geometry, palette, and type checks measure from it. Region arithmetic tiles the stage exactly.

---

## 1. Source image and normalization

Read from the file, not from the spec: the mockup at `assets/concept-artwork/ui/ui-mockup-nano-banana-pro-2.png` is **1376 x 768 pixels**, aspect 1.7917. That is slightly wider than 16:9 (1.7778) by 0.78 percent. It is not a 1440p image and no 1440p conversion applies.

**Recorded choice for the aspect difference: letterbox, not crop.** The mockup is scaled by width (1920 / 1376 = 1.3953) to 1920 x 1072 and centered on a 1920 x 1080 near-black stage, leaving 4-pixel bars top and bottom. Cropping would have removed 15 columns, and the mockup's rail and band sit against their edges; letterboxing loses no content and the 4-pixel remainder is absorbed into the contract's 48-pixel outer margins. The clean normalized image is `mockup-normalized-1920x1080.png`; the annotated derivation is `mockup-normalized-annotated.png`.

The mockup's inventory grid (bottom right) is omitted by frozen decision. The dialogue band spans the full content width in its place.

---

## 2. Journey screen region bounds (logical pixels)

Horizontal, at any y:

| Region | x range | width | share |
|---|---|---|---|
| Left margin | 0..48 | 48 | |
| Scene region | 48..1471 | 1423 | 78.0% of 1824 |
| Rail region (incl. its 24 px left gutter) | 1471..1872 | 401 | 22.0% of 1824 |
| Right margin | 1872..1920 | 48 | |

Arithmetic: 48 + 1423 + 401 + 48 = 1920. Content width 1920 - 96 = 1824; 1824 x 0.78 = 1422.7 rounds to 1423; rail = 1824 - 1423 = 401. The rail panel proper starts at x 1495 (region minus the 24 px gutter), width 377. The 78/22 split is the authored starting point and is checked against real text in gate 5.6 (review question V-03).

Vertical:

| Region | y range | height |
|---|---|---|
| Top margin | 0..48 | 48 |
| Upper region (scene and rail) | 48..736 | 688 |
| Gutter | 736..760 | 24 |
| Dialogue band (full width, x 48..1872) | 760..1032 | 272 |
| Bottom margin | 1032..1080 | 48 |

Arithmetic: 48 + 688 + 24 + 272 + 48 = 1080.

**Deviation from the mockup proportion, recorded as finding F-P1 (carried to the review surface).** Normalized mockup proportions are: upper region y 43..811 (height 768), band y 839..1039 (height 201). The contract band is 272, about 35 percent taller than the mockup's 201; the upper region is 688, about 10 percent shorter. Evidence: the band must hold its worst real co-occurrence, `scene-facility-02`: a 204-character dialogue line plus a 119-character rendered choice label (`Execute the correction...` with the Fragile-Kit suffix `[Knowledge 11] [3 modules]`). At the contract's type scale that is 3 text lines (109 px) plus a 3-line choice button (117 px), 278 px of content; the mockup proportion's 201 px cannot hold it. The band never scrolls; its content fits at base size. The scene region aspect becomes 1423:688 = 2.07, against the mockup's 2.24; the scene is a gradient-rendered placeholder in this unit and the change is composition, not content.

### Rail internal layout (panel x 1495..1872, width 377, y 48..736)

- Intrusion clock: vertical segmented meter at the rail's left edge, column x 1495..1551 (width 56), spanning the stat rows block y 64..312 (height 248). `--gc-meter-count` equals the effective clock maximum; filled segments equal the live clock.
- Stat column x 1563..1856 (width 293), four rows of height 56 with 8 px gaps, y 64..312: INTRUSION readout, KNOWLEDGE continuous meter with threshold marker, RAPPORT meter, RESOURCES pips.
- Route tracker y 324..532 (header 28 + five rows of 36).
- SAVE action pinned at the panel bottom, y 664..720, height 56.
- Overflow rule: the route tracker scrolls internally if its rows exceed their box; every control (SAVE) stays pinned and reachable. At the current five-stop route the rows fit without scrolling (5 x 36 = 180 within 208).

---

## 3. Title screen region bounds

No title design exists in the source image; the title inherits the documented palette, type, and frame treatment. All title candidates are reviewed against this section, never against the mockup.

- Frame treatment: the same panel chrome, chamfered corners, and 48 px margins as the journey.
- Logo block: centered column x 660..1260, y 200..400: title display line and subtitle line, both centered.
- Menu stack: centered column, y 480..880: NEW GAME, CONTINUE, LOAD GAME, SETTINGS; buttons 560 px wide, 72 px tall, 24 px gaps; disabled CONTINUE renders disabled with its state, never hidden.
- Build identifier: centered line y 1000..1032, height 32, populated by gate 5.7 (short SHA and dirty marker visible, full values in the DOM).

---

## 4. Type scale

All values are logical pixels at scale 1. **Floor: no text shrinks below 20.**

| Role | Size | Line height | Face | Notes |
|---|---|---|---|---|
| Dialogue body | 28 | 1.3 | mono | mono advance 0.602 em = 16.86 px/char |
| Speaker label (inline prefix) | 26 | 1.3 | mono | rendered inline at the text block's start, amber |
| Choice label | 26 | 1.3 | mono | wraps inside the button |
| Rail stat labels | 22 | 1.2 | mono | caps |
| Meter readouts | 22 | 1.2 | mono | `N / M` forms |
| Route stop labels | 20 | 1.3 | mono | community names or `STOP N` forms |
| Title display | 96 | 1.0 | display | WITHIN PARAMETERS |
| Title subtitle | 28 | 1.2 | mono | a relay technician's log |
| Build identifier | 20 | 1.2 | mono | muted |

Face: a single self-hosted mono face for UI text plus a display face for the title, self-hosted under `assets/` with their OFL license text (gate 5.6 records the exact files). No font CDN, no external requests.

---

## 5. Control minimums and the portrait medallion

| Control | Minimum |
|---|---|
| Choice button | 360 x 64, max width 760 (two per row plus 24 px gap inside the 1592 px text column; three choices render 360+ wide in one row: 3 x 360 + 48 = 1128 within 1592) |
| Menu button (title) | 560 x 72 |
| SAVE button | 160 x 56 |
| Settings/save-slot controls | framework defaults, inside their panels |
| Reward card | 440 x 280, three across with 24 px gaps inside the stage |

Portrait medallion: circle of 152 px diameter inside a square 160 x 160 frame with 4 px cyan border, positioned at the dialogue band's left edge, x 72..232, vertically centered in the band (y 816..976). Text column starts at x 256, width 1592 (to x 1848).

---

## 6. Palette role map

Roles: **cyan** for systems, **amber** for inhabited and human, **red** for danger, **neutral** for structure and text. Green is absent: no role maps to HSL hue 90..160 at saturation 25 percent or above. Framework status token `--gc-status-success` (oklch 68% 0.16 150, green) is never referenced by any journey or title element class; WP compositions bind roles through WP override tokens in the `overrides` cascade layer, never by editing the vendored framework.

Base theme: `data-gc-theme="sci-fi"`. Values below are the sci-fi theme values the role map binds.

| Element class | Role | Token | Value |
|---|---|---|---|
| Stage background, letterbox bars | neutral | `--wp-stage-bg` (WP token) | `oklch(8% 0.025 250)` |
| Scene region frame | cyan | `--gc-accent` | `oklch(78% 0.18 195)` |
| Scene region backdrop fill | neutral | `--gc-surface-sunken` | `oklch(8% 0.025 250)` |
| Rail/panel surfaces | neutral | `--gc-surface-raised` | scifi 90 surface (translucent frost) |
| Panel borders (rail, band) | neutral | `--gc-border-default` | `oklch(45% 0.03 250)` scifi 45 |
| Clock meter fill segments | red | `--gc-status-danger` | `oklch(50% 0.22 27)` |
| Clock meter track | neutral | `--gc-surface-sunken` | as above |
| Clock readout, safe state | cyan | `--gc-accent` | as above |
| Clock readout/panel, warn state (>=40%) | amber | `--gc-status-warning` | `oklch(79% 0.15 88)` |
| Clock readout/panel, danger state (>=70%) | red | `--gc-status-danger` | `oklch(50% 0.22 27)` |
| Knowledge meter fill and threshold readout | cyan | `--gc-accent` | as above |
| Knowledge threshold marker | amber | `--gc-status-warning` | `oklch(79% 0.15 88)` |
| Rapport fill, net positive | amber | `--gc-status-warning` | `oklch(79% 0.15 88)` |
| Rapport fill, net negative | red | `--gc-status-danger` | `oklch(50% 0.22 27)` |
| Resources pips (bypass modules) | amber | `--gc-status-warning` | `oklch(79% 0.15 88)` |
| Route tracker: dots, visited and upcoming labels | cyan | `--gc-accent` (muted variants via `--gc-text-secondary`) | as above |
| Route tracker: current stop label | amber | `--gc-status-warning` | as above |
| SAVE button | cyan | `--gc-accent` outline | as above |
| Dialogue band border | cyan | `--gc-accent` | as above |
| Speaker label | amber | `--gc-status-warning` | as above |
| Dialogue body text | neutral | `--gc-text-primary` | `oklch(97% 0.02 210)` |
| Choice buttons: border and label | cyan | `--gc-accent` outline | as above |
| Choice buttons: disabled | neutral | `--gc-text-disabled` | scifi 70 |
| Title logo | cyan | `--gc-accent` | as above |
| Title subtitle | neutral | `--gc-text-secondary` | scifi 20 |
| Title menu: NEW GAME (solid) | cyan | `--gc-accent` fill, `--gc-on-accent` text | as above |
| Title menu: outline/ghost items | cyan | `--gc-accent` outline | as above |
| Build identifier | neutral | `--gc-text-muted` | scifi 45 |
| Focus ring (all controls) | cyan | `--gc-focus-ring` | as above |

Collisions are intentional: the palette has three hues plus neutrals, and role discipline, not hue uniqueness, distinguishes elements (rapport and resources share amber as human-economy roles; meter shapes differ).

---

## 7. Fit statements: gate 5.1 extremes by region

Every extreme that renders on the journey or title screen, with its region and fit. Character-count arithmetic uses the mono advance from section 4. Pixel truth is verified live in gates 5.5 and 5.6.

| Class (chars) | Region | Fit statement |
|---|---|---|
| dialogue-line (317, `evt-ce04-arrive#0`) | Dialogue band text column | Fits at base size: 317 + ~13-char speaker prefix = 330 chars x 16.86 = 5564 px / 1592 = 3.5, so 4 lines x 36.4 = 146 px; with no choices in that scene the band holds 20 + 146 + 20 = 186 of 272 |
| speaker-name (11, `crew-leader`) | Dialogue band, inline prefix | Fits: 13 chars incl. `: ` prefix, negligible width |
| choice-label (119, `scene-facility-02#0`) | Dialogue band choices row | Fits at base size: 119 x 15.65 = 1862 px wraps to 3 lines at 26 px in a 760 px button; button 117 px tall; the same scene's text is 204 chars = 3 lines (109 px); total 278 of 272 is the F-P1 evidence case, held by the 272 px band with the 10 px slack from the 20 px paddings measured live in gate 5.6 |
| reward-label (23, `CE-01:knowledge`) | Reward overlay (full-stage) | Fits: card title row, single line at 26 px = 360 px within the 440 px card |
| reward-description (152, `CE-04:clock-reduction`, rapport -5 exposure case) | Reward overlay card body | Fits: 152 x 12.04 (20 px body) = 1830 / 400 = 4.6, 5 lines x 26 = 130 px within the 280 px card |
| document-title (54, `FD-02`) | Document overlay header | Fits: 54 x 15.65 = 845 px within the 1592 px panel header |
| document-body (1194, `FD-07`) | Document overlay body | Scrolls intentionally: the body panel scrolls inside the stage-centered overlay; ACKNOWLEDGE stays pinned and reachable |
| comms-line (180, `red/afterStop3:coworker`) | Comms overlay row | Fits: 190 chars incl. prefix x 16.86 = 3203 / 1400 = 2.3, 3 lines x 36.4 = 109 px per row; the beat's rows stack and the panel scrolls internally with ACKNOWLEDGE pinned |
| ending-epilogue (2443, correction max assembly) | Ending screen (outside this unit's composition scope) | Works inside the stage: the ending panel scrolls internally; no bespoke composition until the follow-up unit |
| score-backstory-line (75) / score-trait-line (109, N7) | Ending score panel | Inherit framework defaults inside the ending panel; outside this unit's composition scope |
| score-row-count (7 rows + 2 conditional lines) | Ending score panel | Rows render inside the ending panel; outside composition scope |
| dossier-backstory (290) / trait summaries (42) / label (34) | Dossier screen | Works inside the stage with framework defaults; scrolls internally if needed; outside composition scope |
| route-stop-label (19, Irongate Settlement) | Rail route tracker | Fits: 19 x 12.04 (20 px) = 229 + 40 dot and gap = 269 within the 293 px stat column; placeholder form `STOP 5` is shorter |
| Meter readouts (`10 / 10` max forms) | Rail stat rows | Fits: 6 chars x 13.24 = 79 px within 293 |

Title screen strings (logo, four menu labels, build identifier) are constants under 20 characters each; all fit their section 3 bounds at the section 4 sizes.

The reward, comms, document, dossier, and ending surfaces are enumerated and overflow-checked as full-stage overlays in gate 5.5; the table above is their contract-level fit, not their composition.

---

## 8. What this contract freezes

Region bounds and arithmetic; the type scale and its 20 px floor; control minimums and medallion geometry; the role map and its green absence; the no-inventory full-width band; the recorded normalization choice; and the F-P1 band deviation with its evidence. The 78/22 split stays at its authored starting point pending the live text check (V-03). Route reveal behavior is untouched by this contract (V-04 is gameplay design).
