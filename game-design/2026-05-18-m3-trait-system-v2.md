# Within Parameters — Trait System v2 (Post-GDR Revision)

**Supersedes:** m3-trait-matrix-and-scoring.md, m3-character-generation-addendum.md
**Revision basis:** Gemini Deep Research balance analysis (April 2026)
**Status:** Design final pending simulator validation

---

## 1. Changes from v1

| Item | v1 | v2 | Rationale |
|------|----|----|-----------|
| N7 Exhausted | clockJitterChance +0.25 | Jitter chance 0.6 instead of 0.35 | v1 forced every tick and clocked out deterministically. v2 raises expected ticks over 5 stops from about 6.75 to 8 (survivable with clock reduction). |
| P4 Steady Hand | Jitter forced to 0 | Jitter probability halved (25% instead of 50%) | v1 eliminated all clock variance, turning the game into a solved optimization puzzle. v2 reduces variance without removing it. |
| Clock reduction | No cap, scales with rapport | Hard cap at 2 segments per reward | v1 allowed rapport 4+ to erase 3+ segments in a single reward, trivializing the loss condition via exponential feedback loop. |
| N2 Rough Touch | +1 module cost per community event | +1 per module spent at community events | v1 exactly offset P1 Well-Supplied (+2 modules across 2 events = +2 cost). v2 scales with investment: a 2-module choice costs 3. |
| Raw score | Soft ceiling ~103 | Hard cap at 103 before reroll multiplier | Prevents surplus-stat farming from breaking the scoring cascade. |
| Surplus scoring | Linear per-point | Diminishing returns | First surplus point: full value. Second: half. Third+: zero. Prevents single-stat optimization. |

---

## 2. Revised Positive Traits

| # | Name | Axis | Effect |
|---|------|------|--------|
| P1 | **Well-Supplied** | starting resources | +2 starting bypass modules (8 total) |
| P2 | **Quick Study** | knowledge income | +1 knowledge from knowledge rewards (nets 1 instead of 0 under the locked -2 reward bonus) |
| P3 | **Networked** | social baseline | +1 starting rapport |
| P4 | **Steady Hand** | clock variance | Jitter probability halved: 17.5% chance of +1 instead of 35% |
| P5 | **Field Expedient** | reward efficiency | +1 modules from consumable rewards (3 instead of 2) |
| P6 | **Clear-Headed** | competence gates | Knowledge threshold -1 (confrontation: 10 instead of 11) |
| P7 | **Light Foot** | transit safety | Transit event choices: no bonus clock costs |
| P8 | **Practiced** | spending efficiency | First module spent per stop: cost -1 (min 0). Once per stop. |

---

## 3. Revised Negative Traits

| # | Name | Axis | Effect |
|---|------|------|--------|
| N1 | **Tunnel Nerves** | approach pressure | Approach event choices: +1 clock on all options |
| N2 | **Rough Touch** | community costs | +1 per module spent at community events (2-mod choice costs 3, 1-mod costs 2) |
| N3 | **Narrow Focus** | clock recovery | Clock reduction rewards: -1 effectiveness (min 0) |
| N4 | **Distracted** | passive knowledge | Found documents: +0 knowledge (readable for flavor, no stat gain) |
| N5 | **Lone Wolf** | social scaling | Rapport-to-clock-reduction scaling: halved (0.25 instead of 0.5) |
| N6 | **Fragile Kit** | endgame cost | Facility fix costs 3 modules instead of 2 |
| N7 | **Exhausted** | clock variance | Jitter chance +0.25 (0.6 under the locked 0.35 base; 5 stops expect about 8 ticks) |
| N8 | **Stubborn** | choice restriction | Must choose highest-cost option at community events |

---

## 4. Revised Interaction Matrix

### Rating Key

- **[+]** Positive synergy: negative hurts less because positive compensates, or combo enables a clear strategy
- **[○]** Neutral: orthogonal, both matter independently
- **[−]** Negative synergy: negative compounds or undermines positive

### The 8×8 Grid

```
              N1          N2          N3          N4          N5          N6          N7          N8
            Tunnel      Rough      Narrow     Distracted   Lone       Fragile    Exhausted   Stubborn
            Nerves      Touch      Focus                   Wolf       Kit        (jitter=1)
P1 Well-    [○]         [−]        [○]         [○]         [○]        [−]         [○]         [−]
   Supplied  Modules     Extra mod   Clock and   Modules     Modules    More mods   Extra mods  Forced
             and appr    but scaled  modules     and docs    and rap    but fix     cushion     spending
             are diff    drain now   diff axes   are diff    are diff   eats 3      jitter      eats them

P2 Quick    [○]         [○]        [○]         [+]         [○]        [○]         [○]         [○]
   Study     Knowledge   Knowledge   Knowledge   Compensate  Knowledge   Knowledge   Knowledge   Knowledge
             and clock   and module  and clock   for lost    and rap    and fix     and clock   and choice
             are diff    costs diff  are diff    doc know    are diff   are diff    are diff    are diff

P3 Network  [○]         [+]        [+]         [○]         [−]        [○]         [+]         [+]
   -ed       Rapport     Rapport     Rapport     Rapport     More rap   Rapport     Rapport     Rapport
             and appr    eases the   makes clk   and docs    but it's   and fix     makes clk   eases
             are diff    scaled      reduc       are diff    worth      are diff    reduc       forced
                         drain       viable                  less                   critical    spend pain

P4 Steady   [+]         [○]        [○]         [○]         [○]        [○]         [+]         [○]
   Hand      Reduced     Jitter     Reduced     Jitter      Jitter     Jitter      Opposing    Jitter
   (25%)     variance    and costs  variance    and docs    and rap    and fix     variance    and choice
             helps plan  are diff   still has   are diff    are diff   are diff    controls:   are diff
             approach                some risk                                     25% vs 100%

P5 Field    [○]         [○]        [+]         [○]         [○]        [+]         [○]         [○]
   Expedient Mod reward  Mod reward  Extra mods   Mod reward  Mod reward  Extra mods  Mod reward  Mod reward
             and appr    and comm    offset weak  and docs    and rap    offset     and clock   and choice
             are diff    costs diff  clock reduc  are diff    are diff   fix cost   are diff    are diff

P6 Clear-   [○]         [+]        [○]         [−]         [○]        [○]         [○]         [+]
   Headed    Thresholds  Lower      Thresholds   Lower      Thresholds  Thresholds  Thresholds  Lower
             and appr    gates      and clock    gates but   and rap    and fix     and clock   gates
             are diff    save mod   are diff     no passive  are diff   are diff    are diff    offset
                         vs drain                know gain                                     forced
                                                                                               spending

P7 Light    [○]         [○]        [○]         [○]         [○]        [○]         [+]         [○]
   Foot      Transit     Transit    Transit     Transit     Transit    Transit     Free tran   Transit
             and appr    and comm   and clock   and docs    and rap    and fix     vs forced   and choice
             diff zones  costs diff are diff     are diff    are diff   are diff    jitter:     are diff
                                                                                  mitigates
                                                                                  2 of 5 stops

P8 Pract-   [○]         [+]        [○]         [○]         [○]        [−]         [○]         [+]
   iced      Efficiency  Offsets    Efficiency   Efficiency  Efficiency  Save on     Efficiency  Free first
             and appr    the per-   and clock    and docs    and rap    events      and clock   spend
             are diff    module     are diff     are diff    are diff   but fix     are diff    offsets
                         surcharge                                     still                   forced
                                                                       costs 3                 cost
```

### Revised Synergy Distribution

| Type | Count | Percentage |
|------|-------|------------|
| [+] Positive synergy | 14 | 22% |
| [○] Neutral | 39 | 61% |
| [−] Negative synergy | 11 | 17% |

Distribution unchanged from v1. The revised traits maintain the same interaction shape while eliminating the degenerate cells (P4+anything was too easy; N7+anything was too hard).

### Degenerate Cells Eliminated

| v1 Cell | v1 Problem | v2 Status |
|---------|------------|-----------|
| P4+N4 (Steady Hand + Distracted) | Trivially easiest: perfect clock info + knowledge rewards replace docs | Now [○] neutral: reduced variance still leaves uncertainty; player must still manage jitter risk |
| P5+N7 (Field Expedient + Exhausted) | Systematically unwinnable: N7 guaranteed death, P5 irrelevant | Now [○] neutral: N7 creates tight clock pressure; P5 gives module runway to invest in clock reduction |
| P2+N7 (Quick Study + Exhausted) | Near-unwinnable: 3+ of 5 rewards forced to clock reduction | Now [○] neutral: same pressure but survivable; P2 makes 2 knowledge rewards yield 6, achievable alongside 2-3 clock reductions |
| P1+N2 (Well-Supplied + Rough Touch) | Exact cancel: +2 modules exactly offset by +2 cost | Now [−] negative: per-module surcharge scales with investment, creating real drain |

---

## 5. Revised Config Values

```json
{
  "startingConsumables": 6,
  "startingKnowledge": 0,
  "clockMax": 10,
  "clockBaseTick": 1,
  "clockJitterChance": 0.35,
  "clockJitterAmount": 1,
  "clockReductionBase": 1,
  "clockReductionMax": 2,
  "rapportClockScale": 0.5,
  "knowledgeGoodEndingThreshold": 11,
  "consumableFixCost": 2,
  "journeyStops": 5,
  "zoneMap": {
    "1": "community",
    "2": "community",
    "3": "transit",
    "4": "transit",
    "5": "approach"
  },
  "scoring": {
    "endingCorrection": 40,
    "endingDestruction": 20,
    "endingClockFailure": 0,
    "perCommunityHelped": 8,
    "perRapportPoint": 5,
    "perModuleRemaining": 4,
    "perModuleRemainingSurplus": 2,
    "perKnowledgeOverThreshold": 3,
    "perKnowledgeOverThresholdSurplus": 1,
    "perClockSegmentRemaining": 3,
    "maxRawScore": 103,
    "rerollMultiplier": 0.92,
    "grades": {
      "S": 90,
      "A": 75,
      "B": 60,
      "C": 45,
      "D": 30
    }
  }
}
```

### Trait-Modified Values

Traits modify these at game start:

| Trait | Modifies | Change |
|-------|----------|--------|
| P1 Well-Supplied | startingConsumables | +2 |
| P3 Networked | startingRapport | +1 |
| P4 Steady Hand | clockJitterChance | ×0.5 (0.175) |
| P6 Clear-Headed | knowledgeGoodEndingThreshold | -1 |
| N2 Rough Touch | community consumable costs | +1 flat |
| N5 Lone Wolf | rapportClockScale | ×0.5 (0.25) |
| N6 Fragile Kit | consumableFixCost | +1 |
| N7 Exhausted | clockJitterChance | +0.25 (0.6) |

---

## 6. Scoring System (Revised)

### Components with Diminishing Returns

Surplus scoring uses a two-tier system: first surplus point at full value, second at half, third+ at zero. This prevents single-stat farming from inflating raw score above 103.

**Modules remaining (after fix cost deducted):**
- Module 1: 4 points
- Module 2: 2 points
- Module 3+: 0 points
- Max from modules: 6 points (realistic: 4-6)

**Knowledge above threshold:**
- Point 1 over: 3 points
- Point 2 over: 1 point
- Point 3+: 0 points
- Max from surplus knowledge: 4 points (realistic: 3-4)

**Clock segments remaining:**
- Segment 1: 3 points
- Segment 2: 3 points
- Segment 3: 3 points
- Segment 4: 1 point
- Segment 5+: 0 points
- Max from clock: 10 points (realistic: 6-9)

### Revised Perfect Run Ceiling

| Component | Points |
|-----------|--------|
| Correction ending | 40 |
| Communities helped (×2) | 16 |
| Rapport (net ~3) | 15 |
| Modules remaining (2 after fix, dim returns) | 6 |
| Surplus knowledge (2 over threshold) | 4 |
| Clock remaining (3-4 segments) | 10 |
| **Hard cap applied** | **→ 91-103** |

The ceiling compresses to a realistic range. A truly perfect run hits ~91-97. The theoretical 103 cap prevents exploits but a player scoring above 97 requires exceptional play AND a favorable event draw. S-tier at 90 remains tight.

### Cascade Re-verification

| Rerolls | Multiplier | Near-Perfect (97) | S (90)? | A (75)? |
|---------|------------|-------------------|---------|---------|
| 0 | ×1.000 | 97 | Yes (7 padding) | Yes |
| 1 | ×0.920 | 89.2 | No (need 98+) | Yes |
| 2 | ×0.846 | 82.1 | No | Yes (7 padding) |
| 3 | ×0.779 | 75.6 | No | Yes (barely) |
| 4 | ×0.716 | 69.5 | No | No |

**Revision note:** With diminishing returns compressing the realistic ceiling, S-tier after 1 reroll now requires a near-perfect run (raw 98+). This is tighter than v1 but matches the design intent: "S-tier, 1 reroll, you can only miss 1 choice." At 0 rerolls, the player has 7 points of padding (~1.5 misses). The cascade still works.

---

## 7. Clock Reduction Formula (Revised)

```
reduction = min(clockReductionBase + floor(rapport × rapportClockScale), clockReductionMax)
```

| Rapport | Raw Reduction | After Cap |
|---------|--------------|-----------|
| 0 | 1 + 0 = 1 | 1 |
| 1 | 1 + 0 = 1 | 1 |
| 2 | 1 + 1 = 2 | 2 |
| 3 | 1 + 1 = 2 | 2 |
| 4 | 1 + 2 = 3 | **2** (capped) |
| 5 | 1 + 2 = 3 | **2** (capped) |

The cap bites at rapport 4+. High rapport still provides maximum clock reduction (2 vs 1 at rapport 0), but the exponential feedback loop is eliminated. Players can no longer ignore the clock for 4 stops and erase it with one reward.

With Lone Wolf (N5), rapportClockScale halves to 0.25:

| Rapport | Raw Reduction | After Cap |
|---------|--------------|-----------|
| 0 | 1 + 0 = 1 | 1 |
| 2 | 1 + 0 = 1 | 1 |
| 4 | 1 + 1 = 2 | 2 |

Lone Wolf makes the cap irrelevant since rapport scaling alone caps at 2 only at rapport 4+, which requires helping all communities. The trait forces the player to work much harder for the same maximum reduction.

---

## 8. Character Generation (Unchanged from v1)

All generation mechanics (name pools, backstory templates, dossier screen, portrait strategy) remain as specified in the character generation addendum. Only the trait definitions and scoring have been revised.

---

## 9. Document Hierarchy

This document is the authoritative trait system reference. It supersedes:

- `m3-character-generation-addendum.md` (trait definitions section only; generation mechanics remain valid)
- `m3-trait-matrix-and-scoring.md` (entirely superseded)

The following documents remain current and unmodified:

- `m3-content-design-draft.md` (narrative content, events, NPCs, comms beats, found documents, endings)
- `wp-mechanical-design-context.md` (needs update to reflect v2 trait values before simulator build)
