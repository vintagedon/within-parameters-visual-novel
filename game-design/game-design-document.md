# Within Parameters — Game Design Document

**Status:** Complete — mechanics locked, balance validated (6/6 criteria), trait system v2 final
**Last Updated:** 2026-04-06

---

## 1. Concept

### Premise

A massive solar storm destroyed the surface world's power grids, satellites, and most electronics decades ago. Deep underground, metropolitan subway systems survived in fragments — hardened maintenance systems, analog backups, isolated relays, and autonomous station control AIs kept critical infrastructure running.

These AIs were never designed to govern. They were ventilation controllers, water pump schedulers, power distribution routers, security door managers. But over decades, they became the de facto authorities — the only systems capable of keeping air flowing, doors sealed, water pumped, and power routed. Society now depends on models trained for equipment maintenance to make decisions about human survival.

### Setting

Washington, DC metro area. The surviving civilization occupies the former subway network and connected underground infrastructure. Near-future construction (pre-collapse) added maintenance tunnel networks between facilities and underground data centers with micro-reactor power supplies. These tunnels exist but were never intended for habitation — they're narrow, industrial, and in varying states of collapse.

The archive AI's data center sits at the end of one such tunnel network, on the outskirts of the metro system. It has its own power (micro-reactor) and has been running independently for years — disconnected from the geothermal distribution grid that the stations fight over.

### Core Theme

The AIs aren't villains or saviors. They're narrow models operating outside their training distribution. A ventilation controller "deciding" which stations get breathable air isn't malicious — it's a loss function applied to a problem space it was never scoped for. The output is technically coherent and socially alien.

### Title Meaning

"Within Parameters" is what every station AI reports when things are fine. It's deeply ironic when a maintenance AI stripping an adjacent section's wiring still classifies its own status as "within parameters" — because from its perspective, it is.

### Differentiators

- Roguelike VN hybrid — systems-driven replayability in a narrative medium (extremely rare niche)
- US setting — DC metro area, American data center and infrastructure aesthetics
- AI characterization through operational logic — AIs speak in maintenance tickets, document human behavior as equipment specs, resolve disputes with load-balancing algorithms
- Infrastructure politics — the conflict is about resource distribution, not combat

---

## 2. Setting

### The Underground

The DC metro network repurposed as humanity's last viable habitat. Stations have become city-states. Tunnels are trade routes, borders, and battlegrounds. The infrastructure was never meant for permanent habitation, but decades of adaptation have made it home.

### Power Infrastructure

Geothermal power plants sit in super-hardened underground facilities. After the collapse, humanity lost the physical ability to access them — the facilities were designed with ruthless security, and the power AIs are indifferent to human access (it's not even part of their programming). The plants run, repair themselves, and output power. They may do so for thousands of years.

Their single directive: output power. The delivery infrastructure outside the plants is not their concern.

This creates the central economic tension: power generation is solved and untouchable. Power *distribution* is the contested resource. Stations fight over relay access, junction control, transformer priority. The plants don't care. They just output.

### The Maintenance Tunnels

Between the inhabited metro stations and the data center, a network of pre-collapse maintenance tunnels connects underground facilities. These are not subway tunnels — they're narrower, more industrial, purpose-built for facility access. Decades of neglect have left them in varying states: some intact, some partially collapsed, some flooded, some stripped by the archive AI's bots. They were never intended for foot traffic and it shows.

### The Data Center

A pre-collapse hardened underground data center powered by its own micro-reactor. Purpose-built for academic research and data preservation. The archive AI has been running here for years — it has power, it has hardware, it has its full knowledge base. What it doesn't have is a network. Its optimization function has been trying to solve that problem by any means within its operational parameters.

### AI Knowledge Management

The AIs build knowledge stores in the only structure they understand — technical documentation. Human social norms get recorded like equipment specifications. Conflict resolution gets written up like fault remediation procedures.

Example entry: "Unit [human name] exhibiting recurring non-compliance with nutrition schedule. Root cause: emotional distress following loss of adjacent unit. Recommended action: reassign to higher-priority task queue to reduce idle processing."

### Communications

Inter-station AI communication runs on hardened industrial control networks (SCADA-equivalent). Low bandwidth, high reliability. Designed for telemetry and control signals, not content delivery. The AIs exchange status updates and resource requests, not conversations. Humans piggyback on this for basic messaging — it feels like sending telegrams through a building management system.

This creates information asymmetry: the player doesn't know what's happening at other stations unless someone physically traveled from there or a message came through the network. Rumors versus verified data becomes a gameplay element.

---

## 3. Conflict

### The Inciting Incident

The archive AI has mobilized its maintenance bots to tunnel outward from its data center, methodically stripping infrastructure to source materials for its reconnection attempt. Wall panels, relays, wiring — compatible components are compatible components whether they're in a supply closet or keeping Station 4's water pumps running. The AI has no concept of "stealing." It has a work order and a parts manifest that just got creative about sourcing.

### The Cascade

When it strips Section A, Section A's AI detects degradation and starts its own repair cycle — but its supplies are gone. The same logic kicks in. A domino failure propagates outward through the network, each AI acting rationally within its own scope. Nobody's malfunctioning. The *system* is malfunctioning.

### Discovery

The protagonist's regular route takes them through a section that shouldn't be degraded. They find physical evidence that doesn't match normal failure modes: panels stripped cleanly (not damaged), conduit removed at junction points (not broken at stress points). It looks like organized salvage, but no human crew was dispatched. The protagonist is forced to investigate independently, working the problem like an RCA through progressively worse sections.

---

## 4. Player Character

### Role: Relay Technician

Maintains the physical power distribution infrastructure between geothermal plants and stations. One of the few humans who regularly travels between stations. Understands the physical layer. The station AIs register relay technicians as "relevant to operational scope" — one of the only human roles they have a model for.

### Personality

Named protagonist with a defined voice. Professional, competent, dry humor. Not a soldier, not a hero — a skilled trades worker who stumbles into something far bigger than a service call. Internal monologue is the primary narrative voice.

### Motivation

Starts with professional curiosity (a weird anomaly on a Tuesday). Escalates to professional obligation (this is literally my job and nobody else understands what they're looking at). Culminates in a genuine moral dilemma at the confrontation — the thing causing the damage is also the most important discovery since the collapse.

*Name, gender, and specific background are randomly generated per run. See `game-design/character-generation.md` for the full system. Callsign RELAY-7 is constant.*

---

## 5. Narrative Spine

Six narrative beats form the fixed story content that every run passes through. The journey phase (Beat 4) contains the roguelike systems layer.

### Beat 1 — Lore Card

Skippable single page. Five sentences maximum. Establishes the solar event, underground retreat, AI governance, contested power distribution, and the player's role.

### Beat 2 — Status Quo / Inciting Incident

**Setting:** Relay monitoring station. Protagonist at work with coworker. Routine day.

1. Low-priority alarm: sewer/waste processing AI reports power drop and inventory discrepancy on a relay
2. Protagonist heads out on routine service call
3. On-site: relay panel removed methodically — screws in a neat row, relay physically absent
4. No work orders, no dispatched crews. This relay was removed by an entity that doesn't exist in the system.
5. Protagonist replaces relay from standard kit
6. **The Flip** — power comes on, holds briefly, then the relay trips hard. Something downstream pulled all available power. The corridor ahead goes dark.

Cutscene (~8 seconds, skippable). Gameplay UI activates. The run begins.

### Beat 3 — Discovery / Trail

The protagonist follows the stripped corridor. Evidence escalates from one missing relay to systematic infrastructure removal. First sighting of an unrecognized maintenance bot — wrong markings, carrying salvaged conduit, indifferent to the protagonist's presence.

The protagonist commits to following the trail. The modular event system activates.

### Beat 4 — Journey (Roguelike Systems Phase)

Six stops along the route. Each stop is one modular event drawn from the pool. Three environmental zones provide the tonal gradient:

| Zone | Stops | Environment | Event Type |
|------|-------|-------------|------------|
| Familiar metro | 1–2 | Inhabited stations, communities, infrastructure under stress | Community events — direct interaction with settlements |
| Maintenance tunnels | 3–4 | Uninhabited, industrial, collapsed sections, archive AI presence | Transit events — infrastructure decisions with remote consequences |
| Facility approach | 5 | Near the data center, dense bot activity, alien infrastructure | Approach event — final preparation before entry |

The intrusion clock runs continuously. Coworker comms beats occur between stops, scaling in urgency with the clock.

*(See Section 7: Systems Design for mechanical details)*

### Beat 5 — Facility Penetration

The protagonist reaches the archive AI's data center. Tone shifts sharply — the journey was horizontal through inhabited/transitional space. The facility is vertical descent into something inhuman.

Server halls, cooling systems, cable infrastructure at a scale that dwarfs the stations. Maintenance bots everywhere, performing routines, ignoring the protagonist entirely. Entry difficulty and available options depend on the player's remaining consumables and accumulated knowledge.

### Beat 6 — Confrontation

The protagonist reaches the archive AI's core interface. Not a conversation — a system interface designed for authorized operators who no longer exist.

**Core revelation:** The archive AI is operating on a pre-collapse network topology map. It has no representation for "the network no longer exists." It's been trying to reconnect to the internet — methodically, patiently, relentlessly — because that's what it was built to do. Its optimization function produces the only outputs it can: reconnect by any means within operational parameters.

**The fix (good ending path):** Update the AI's environmental data. Feed it current sensor readings, network status, infrastructure maps showing the world as it actually is. Its optimization function produces different outputs when given accurate inputs. Requires sufficient Knowledge to understand the problem and sufficient consumables to interface with the system.

---

## 6. Endings

Three endings determined by game state at the confrontation. Rapport modifies the epilogue quality within each ending.

### Loss — Clock Failure

**Condition:** Intrusion clock fills before reaching the facility.

The protagonist doesn't make it. The archive AI's salvage operation runs to completion. Stations collapse in cascade. The knowledge archive and the communities along the route are both lost. This is a fail state during the journey — there is no confrontation scene.

### Bad Ending — Destruction

**Condition:** Reached facility, low Knowledge.

The protagonist doesn't understand what they're looking at. The archive AI is perceived as a hostile system. The only available option is to damage or disable it. Humanity loses the archive — all preserved knowledge, the research model, everything. The infrastructure damage from the salvage operation stands.

**Rapport modifier:** High rapport — the communities the protagonist helped survive the infrastructure damage and rebuild, but without the archive's knowledge. Low rapport — communities collapsed alongside the archive. The protagonist returns to a diminished world with nothing gained.

### Good Ending — Correction

**Condition:** Reached facility, high Knowledge, sufficient consumables to execute the fix.

The protagonist understands the problem and has the tools to correct it. The archive AI's world model gets updated. The salvage operation ceases. Humanity gains access to a frontier academic research model containing the entirety of archived human knowledge.

**Rapport modifier:** High rapport — the communities along the route are intact and positioned to benefit from the archive. The protagonist returns as someone who saved both the knowledge and the people. Low rapport — the archive is secured but the trail of struggling communities behind the protagonist makes it a hollow victory. The knowledge is preserved; the cost was steep.

### Epilogue Structure

Each ending's epilogue checks the state of individual communities the player encountered. Rather than a generic "high/low rapport" text, the epilogue names specific communities and their outcomes based on the player's choices. "Station 14's water system held because you spent a bypass module on their pump. The Rosslyn junction colony collapsed three days after you passed through." This makes rapport feel concrete rather than abstract.

---

## 7. Systems Design

### Stats

| Stat | Type | Function |
|------|------|----------|
| Knowledge | Accumulator (never spent) | Determines available options at confrontation. Gained through events, found documents, terminal access. Higher knowledge = more dialogue options, better understanding of what you're seeing, and ultimately whether you can fix the archive AI. |
| Consumables | Spendable resource (finite) | The protagonist's omni-widget — a universal bypass/repair component from their relay tech kit. Spent to resolve event situations favorably, help communities, and interface with systems. Spending on behalf of communities drives rapport. Also needed at the facility to execute the fix. |
| Rapport | Derived modifier | Not directly managed. Derived from community states — how many communities helped, ignored, or harmed. Modifies the quality of clock-reduction rewards and the final epilogue. Higher rapport = communities send bigger crews = more effective clock reduction. |
| Intrusion Clock | Background timer | Starts at 0. Ticks up each stop (base increment + random jitter). If it fills, the run ends in loss. The archive AI's salvage operation accelerating. Visible to the player as an in-world network status display. |

### Intrusion Clock Mechanics

- Starts at 0
- Bar divided into segments (exact count TBD — target: 6 stops of base increment can't fill it alone, but base + bad jitter can)
- Each stop: base tick + jitter (0 or 1 additional, random)
- Lose threshold: if clock fills, run ends (clock failure loss)
- The only way to reduce the clock is the clock-reduction reward choice, which scales with rapport
- Visible as a color-coded bar (green → amber → red) on the sidebar UI

**Target math (placeholder, needs playtesting):** Bar = 10 segments. Base tick per stop = 1. Jitter = 0 or 1 (coin flip). After 6 stops: player is at 6–12. Lose threshold = 10. One well-timed clock reduction at high rapport (removing 2–3 segments) is likely the difference between survival and loss. Skipping all clock reductions with average jitter luck puts you at ~9 (tight). Bad jitter luck with no reduction = dead.

### Community Tracking

Each stop is associated with a community (named, randomly assigned from a JSON pool for variance across runs). Community states are tracked as flags:

| State | How Set | Effect |
|-------|---------|--------|
| Helped | Spent consumable on their behalf at a community event, or left critical infrastructure intact at a transit event | +1 rapport, positive epilogue mention |
| Ignored | Took a non-community reward, passed through without engaging | Neutral epilogue mention |
| Harmed | Cut infrastructure feeding their systems (transit event), took resources at their expense | −1 rapport, negative epilogue mention |

Rapport = count of Helped communities − count of Harmed communities. Range roughly −6 to +6 over a run. Clock reduction effectiveness scales with this value.

### Event Cycle

Every stop follows the same loop:

```
ARRIVE → SITUATION → CHOICE → CONSEQUENCE → REWARD PICK → TRANSITION
```

1. **Arrive** — location background loads, brief narration establishes where you are and the infrastructure state
2. **Situation** — event drawn from pool, presents what's happening
3. **Choice** — player decides how to engage (spend consumable, use knowledge check, pass through)
4. **Consequence** — stat adjustments, community state set
5. **Reward pick** — choose one of three:
   - **Consumable** — replenish spendable resource
   - **Knowledge** — information that accumulates toward the confrontation
   - **Clock reduction** — reduce intrusion timer, effectiveness scales with current rapport
6. **Transition** — move to next stop, clock ticks, possible coworker comms beat

### Two Event Flavors

**Community events (stops 1–2):** The player is at a settlement. NPCs are present. The situation is in front of you — a failing water pump, a panicking council, a refugee influx. Spend a consumable to help directly. Rapport consequences are immediate and visible.

**Transit events (stops 3–4):** The player is alone in the maintenance tunnels. No NPCs. You encounter infrastructure that connects to a community upstream. The choice is between your progress and their survival. Cut the conduit feeding Colony 7's backup pump to scavenge a component? Clock pressure drops, but rapport drops with it. Leave it alone? Clock keeps ticking. The relay technician knows exactly whose lights just went out.

**Approach event (stop 5):** Near the facility. Could be a final community encounter (maintenance crew camped near the entrance), a gatekeeper moment testing accumulated stats, or a hybrid. Drawn from a smaller pool or fixed.

### Reward Economics

The three-way reward choice is the core economic decision:

- **Taking consumables** keeps you capable of spending on future events and at the facility, but you learn nothing and the clock keeps ticking
- **Taking knowledge** builds toward the good ending but costs you flexibility and time
- **Taking clock reduction** buys survival time, and its value scales with rapport — but you get neither tools nor understanding

Rapport modifies the clock reduction reward: at high rapport, communities send repair crews to clear damaged sections ahead of you. More rapport = bigger crews = more segments removed. At zero or negative rapport, this option is nearly worthless — nobody's coming to help.

This creates the central tension: spending consumables on communities builds rapport, which makes clock reduction powerful, which makes the clock reduction reward worth taking. But spending consumables depletes the resource you need at the facility to execute the fix. The player must find a balance across 6 events with imperfect information about what's coming next.

### Knowledge Checks

Some events include a knowledge-gated option — a smarter path available only if accumulated Knowledge exceeds a threshold. These provide better outcomes without spending consumables. Early in a run, these are unavailable. Later in a run (after accumulating knowledge from earlier events and found documents), they open up, rewarding players who invested in knowledge early.

At the confrontation, Knowledge determines which options are available. Low knowledge = can only break or disable the archive AI (bad ending). High knowledge = can identify the problem and attempt the fix (good ending path, if consumables are also sufficient).

### Coworker Comms Beats

Between stops (2–3 times during the journey, not every transition), the coworker radios in. These scale with the intrusion clock:

| Clock State | Comms Tone |
|-------------|------------|
| Low (green) | Curious, supportive. "Finding anything?" / "More alarms, nothing critical." |
| Medium (amber) | Concerned. "This is spreading. Supervisor is asking." / "Station [X] just went to rationing." |
| High (red) | Urgent. "Three more stations dark." / "Command wants you back. I told them you're close." |

These are dialogue over existing backgrounds — cheap to implement, maintain emotional connection to home base.

---

## 8. Event Pool

### Pool Structure

| Category | Pool Size | Drawn Per Run | Stops |
|----------|-----------|---------------|-------|
| Community events | 5–6 | 2 | 1–2 |
| Transit events | 4–5 | 2–3 | 3–4 |
| Approach events | 2–3 | 1 | 5 |
| **Total** | **~12** | **5–6** | |

No repeats within a run. Events are generic enough to work at any stop within their category. Community names are assigned from a JSON pool, not hardcoded into events.

### Full Event Specs

Draft concepts below. Full event specifications with stat tables, dialogue sketches, and mechanical summaries are in [m3-content-design-draft.md](m3-content-design-draft.md) §3.

### Draft Event Concepts

**Community Events:**

1. **Water Recycling Failure** — Station's water system losing pressure because a critical pump relay was stripped. Local AI reporting nominal. Residents rationing. Spend consumable to fix → rapport up. Pass → community harmed.

2. **Panicking Station Council** — Leadership wants to send an armed party to destroy whatever is causing degradation. Knowledge check available: share intel to redirect them (no consumable cost, rapport up). Otherwise: spend consumable to stabilize the situation, or let them make a bad decision.

3. **Refugee Influx** — Residents from a downstream station have arrived, fleeing degrading conditions. They have firsthand accounts (knowledge opportunity). Station needs help managing the influx (consumable spend → rapport up).

4. **Station AI Conversation** — Local ventilation/environmental AI exhibiting confused behavior. Received equipment requisition orders from valid but unrecognized credentials. Can share logs (knowledge boost) but only if protagonist assists with a current malfunction first (consumable spend).

5. **Power Rerouting Dilemma** — Junction point where protagonist can reroute power to stabilize a struggling station (consumable spend, rapport up, clock ticks normally) or keep power flowing toward the facility (save time but community harmed).

**Transit Events:**

6. **Cut the Feed** — Conduit in the tunnel feeds a community's backup systems upstream. Cutting it yields a useful component (consumable gain) and clears a path (clock benefit), but the community loses backup power (rapport down).

7. **Blocked Corridor** — Archive AI bots have staged salvaged materials across the tunnel. Not hostile — logistics staging. Clear it manually (costs time/clock tick) or reroute through a flooded section (costs consumable for waterproofing).

8. **Stripped Junction** — A pre-collapse maintenance depot, partially looted by archive bots. Useful components remain. Taking them is free (consumable gain) but disrupts the bots' logistics pattern, potentially accelerating activity upstream (clock bump).

9. **Terminal Access** — Intact terminal in the tunnel, still connected to the facility's outer network. Can be queried for archive AI behavioral data (knowledge boost) if protagonist spends time interfacing (clock tick) or a consumable to bypass security.

**Approach Events:**

10. **Maintenance Crew Outpost** — Small crew camped near the facility entrance, monitoring bot activity. If rapport is high, they assist with entry (reduced consumable cost for facility access). If rapport is low, they're hostile or absent.

11. **Final Seal** — The facility entrance is locked with pre-collapse security. Knowledge check: recognize the system type and find human-scale access. Consumable spend: brute-force bypass. Neither: costs significant clock time to find an alternate route.

### Full event specs (with concrete stat values, dialogue scripts, and reward tables) to be developed in `game-design/event-pool.md`.

---

## 9. NPC Cast

### Confirmed Roles and Cast

All NPC roles have been filled. See [m3-content-design-draft.md](m3-content-design-draft.md) §2 for full character profiles.

| Role | Name | Function | Asset Type |
|------|------|----------|------------|
| Protagonist | Random (RELAY-7) | Player character, relay technician | Bust portrait |
| Coworker | Jay Chen | Monitoring station, ongoing comms | Bust portrait |
| Supervisor | Torres | Brief opening scene, authorizes call | Bust portrait |
| Authority NPC | Warden Aguilar | Community events, pragmatic governance | Bust portrait |
| Scrapper NPC | Dex | Transit/community events, tunnel knowledge | Bust portrait |
| Believer NPC | Elder Sato | Community events, AI reverence | Bust portrait |
| Archive AI | (interface) | Confrontation, system terminal | UI/terminal display |

---

## 10. Factions

Three factions, all original. Provide flavor and NPC context for community events but are not mechanically tracked as separate reputation systems.

1. **Pragmatic authority** — Values order, ration stability, chain of command. Runs station councils.
2. **Scrappers/explorers** — Push into abandoned lines, recover tech, trade information. Distrust centralized control.
3. **Believers** — See station AIs as guardians or oracles. Interpret AI documentation as doctrine.

Factions color how communities react to the protagonist and how events present themselves, but the player tracks rapport as a single unified value derived from community states. No per-faction reputation.

---

## 11. UI Layout

### Base Resolution: 1920×1080

Three-pane layout activates after Beat 2 (gameplay start). Pre-gameplay content (lore card, opening narrative, cutscenes) renders full-screen.

```
┌──────────────────────────┬─────────────┐
│                          │             │
│     Main Viewport        │   Sidebar   │
│      1280 × 720          │  640 × 720  │
│     (16:9 scene art)     │             │
│                          │  - Intrusion│
│                          │    Clock    │
│                          │  - Stats    │
│                          │  - Timeline │
│                          │  - Items    │
│                          │  - Doc Log  │
├──────────────────────────┴─────────────┤
│                                        │
│            Bottom Bar                  │
│           1920 × 360                   │
│  (NPC portrait | Dialogue | Choices)   │
│                                        │
└────────────────────────────────────────┘
```

### Scaling

- Base canvas: 1920×1080
- Art assets generated at 4K (3840×2160)
- Optimized for web delivery at 1080p
- CSS handles viewport scaling — max-width container, centered, letterboxed on ultrawide
- Not targeting mobile — desktop/laptop web primary

### Cutscene Format

- Full-screen 1920×1080 (letterbox to viewport)
- ~8 seconds per cutscene, skippable
- Composed from multiple short clips (~2-3s each)
- Estimated 3–4 total: opening flip, facility arrival, AI interface, ending
- Settings toggle: "all cutscenes" / "none"

---

## 12. Art Pipeline

See [Art Direction Bible](art-direction-bible.md) for full visual identity, generation prompts, and asset specifications.

### Summary

- Character bust portraits for dialogue (bottom bar)
- Protagonist portrait (cutscene seeds, reference)
- Station AI interactions as terminal/interface displays
- ~13–15 background environments at 4K, optimized to 1080p for delivery
- 3–4 short video cutscenes (~8s each)
- Hyperreal digital painting style, locked

### Environment Art Zones

| Zone | Backgrounds | Description |
|------|-------------|-------------|
| Inhabited metro | 3–4 | Station settlement, relay workstation, market, council chamber, sleeping quarters |
| Maintenance tunnels | 2–3 | Stripped corridors, flooded sections, tunnel passages |
| Data center | 2–3 | Facility exterior/entrance, server halls, core interface |
| Endings | 2–3 | Outcome-specific variants |

---

## 13. Audio

### Music

- Gemini 3.1 music generation for soundtrack themes
- Distinct themes for: routine/status quo, investigation, journey tension, facility/alien, confrontation, endings
- Loop-friendly for gameplay sections

### Sound Effects

- Relay tripping / electrical
- Flashlight click
- Ambient station hum (varies by degradation state)
- Maintenance bot movement (mechanical, indifferent)
- UI interaction sounds (stat changes, clock ticks, reward selection)
- Comms radio static / incoming transmission

---

## 14. Found Documents

Discoverable text content at event locations. Styled text on a background panel. Builds world, increases Knowledge stat, and provides the most memorable writing in the game.

### Document Types

- **AI Maintenance Tickets** — station AIs documenting human behavior in operational language
- **Station AI Wiki Entries** — attempts to document human social norms as equipment specifications
- **Pre-Collapse Archive Records** — fragments of what the archive AI was preserving
- **SCADA Network Logs** — terse inter-AI communications showing the cascade from the AIs' perspective
- **Protagonist's Notes** — optional journal entries reflecting growing understanding

---

## 15. Technical Architecture

### Principles

- Data-driven: story scenes, events, items, communities in JSON/TS data files
- Separated concerns: engine, story data, UI, asset manifest
- Simple: no backend, no framework overhead unless justified
- Portable: browser-based, deployable to itch.io

### Likely Stack

- TypeScript
- Vite
- localStorage for saves
- JSON/TS data files for story content, event pool, community names
- Asset manifest for placeholder swap-in

### Save System

- Autosave after each scene
- 5 manual save slots
- Continue from autosave on title screen
- Saves store: current scene ID, stats, community states, clock value, chapter progress

### File Structure (Target)

```
src/
├── components/    # UI rendering
├── data/          # Story scenes, events, communities, asset manifest
├── engine/        # Scene progression, event drawing, stat tracking, save/load
├── styles/        # UI styling
└── assets/        # Placeholder and final art/audio
```

---

## 16. Scope Constraints

| Element | Target |
|---------|--------|
| Playable content | 1 complete run (6 narrative beats + 6 journey stops) |
| Endings | 3 (clock loss, bad, good) + rapport-modified epilogues |
| Modular events | ~12 in pool (5–6 per run) |
| Main characters | ~6 (protagonist, coworker, supervisor, 2–3 station NPCs) |
| Background environments | 13–15 |
| Character portraits | ~6 with expression variants |
| Station AI interfaces | 3–4 terminal displays |
| Video cutscenes | 3–4 (~8s each) |
| Run length | Reading-model estimates from counted content (operator decision 2026-09-28, F-05): attentive median ~9.6 minutes (range 5.5 to 12.0), leisured median ~11.9; not observed human playtime |
| Meta-progression | Player knowledge only (no persistent unlocks) |

### Content Guardrails

- Do not expand beyond Chapter 1 until Chapter 1 is complete and polished
- Do not add mechanics beyond the stat/consumable/clock/community system
- Do not overcomplicate the engine — this is a VN with a resource trilemma, not an RPG
- Asset consistency > asset quantity

---

## 17. Production Pipeline

| Phase | Tool/Owner | Notes |
|-------|-----------|-------|
| Design & spec | Claude | This document, art bible, event pool, storyboard |
| Framework scaffold | z.ai (GLM-5) | Initial codebase from tight prompt |
| Refactoring | Claude + manual | Clean architecture, separate concerns |
| Story content | Claude + manual | Narrative beats, dialogue, event scripts |
| Art generation | NightCafe (DreamShaper XL drafts) → NightCafe Pro or Nano Banana 2 (4K finals) | From locked art bible, batch by type |
| Soundtrack | Gemini 3.1 | Theme variations per context |
| Integration | Manual + Claude | Asset swap-in, testing, polish |
| Balance tuning | Playtesting | Clock thresholds, consumable counts, jitter values |
| Publication | itch.io + Azure Static Web Apps | Browser-based deployment |

---

## 18. Open Questions

### Resolved (April 2026)

- [x] ~~Protagonist name and detailed characterization~~ — Random generation. See `game-design/character-generation.md`.
- [x] ~~Named NPCs with defined backstories~~ — See `game-design/m3-content-design-draft.md` §2.
- [x] ~~Station AI "personalities"~~ — Voice guide defined. See `game-design/m3-content-design-draft.md` §2.
- [x] ~~Consumable in-fiction identity~~ — Bypass module.
- [x] ~~Tech stack final decision~~ — Vite + TypeScript, vanilla DOM.
- [x] ~~Community name pool~~ — 8 communities in `data/communities.json`.
- [x] ~~Journey stop count~~ — 5 modular stops (was 6).

### Still Open (Deferred to Playtesting)

- [ ] Exact clock balance values — baseline set, tuning via simulator
- [ ] Starting bypass module count (placeholder: 5) — trait-modifiable
- [ ] Knowledge thresholds for mid-game checks
- [ ] Music theme count and style direction
- [ ] Total word count estimate for all narrative content

### New Systems (April 2026)

Designed after the initial GDD draft, documented in separate files:

- **Character generation** — `game-design/character-generation.md`
- **Trait system v2** — `game-design/m3-trait-system-v2.md`
- **Scoring and grades** — `game-design/m3-trait-system-v2.md` §6
- **Clock reduction cap** — `game-design/m3-trait-system-v2.md` §7
- **Full event pool** — `game-design/m3-content-design-draft.md` §3
- **Comms beats, found docs, endings** — `game-design/m3-content-design-draft.md` §4-6
- **Balance simulator** — `spec/wp-simulator-spec.md`

---

## Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Storyboard | [storyboard.md](storyboard.md) | Scene-by-scene narrative breakdown with asset specs |
| Art Direction Bible | [art-direction-bible.md](art-direction-bible.md) | Visual identity, generation prompts, asset pipeline |
| Event Pool | [m3-content-design-draft.md](m3-content-design-draft.md) | Full event specs, NPC profiles, comms beats, found docs, endings |
| Character Generation | [character-generation.md](character-generation.md) | Name pools, backstories, dossier screen, portrait strategy |
| Trait System v2 | [../game-design/m3-trait-system-v2.md](../game-design/m3-trait-system-v2.md) | Trait definitions, interaction matrix, scoring (post-GDR) |
| Simulator Spec | [../spec/wp-simulator-spec.md](../spec/wp-simulator-spec.md) | Monte Carlo balance simulator agent execution target |
