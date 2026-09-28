<!--
---
title: "M3 Content Design Draft"
description: "Complete content design for Within Parameters: NPCs, events, comms beats, found documents, and endings"
author: "VintageDon + Claude"
date: "2026-04-05"
version: "1.0"
status: "Complete"
tags:
  - type: design-doc
  - domain: [game-design, narrative]
related_documents:
  - "[Game Design Document](game-design-document.md)"
  - "[Character Generation](character-generation.md)"
  - "[Trait System v2](../game-design/m3-trait-system-v2.md)"
  - "[Storyboard](storyboard.md)"
---
-->

# M3 Content Design Draft

Complete content layer for Within Parameters. Covers resolved design decisions, character profiles, the full 12-event pool with dialogue sketches, coworker comms beats, found documents, and ending epilogues.

---

## 1. Summary: What This Document Decides

| Decision | Resolution |
|----------|------------|
| Protagonist | Mara Vasquez, RELAY-7, female, late 20s |
| Coworker | Jay Chen, dispatch |
| Supervisor | Torres, administrative |
| Station NPCs | Aguilar (authority), Dex (scrapper), Sato (believer) |
| Consumable | Bypass module |
| Stop count | 5 modular + fixed facility entry |
| Event pool | 12 total: 5 community, 4 transit, 3 approach |
| Comms beats | 3 tiers × 2 beats each, clock-scaled |
| Found documents | 8 pieces across event types |
| Endings | 3 base + per-community rapport modifiers |

**What this document does NOT decide (deferred to playtesting):**
- Clock balance values
- Knowledge thresholds for mid-game checks
- Exact rapport-to-clock-reduction curve
- Starting module count
- Reward value tuning

**Note on protagonist identity:** After this document was written, the protagonist was changed to a randomized roll (name, gender, backstory, traits). The Mara Vasquez identity is now one possible roll, not the fixed protagonist. See `character-generation.md` for the full system. The NPC profiles, events, dialogue, and found documents remain valid regardless of protagonist identity; dialogue uses the callsign RELAY-7 throughout.

---

## 2. Character Profiles

### Mara Vasquez (Protagonist, RELAY-7)

**Role:** Player character. Relay technician dispatched to investigate a cascade failure pattern.
**Personality:** Dry, professional, competent. Solves problems with tools and documentation. Not sentimental, but not cold. Speaks in relay tech jargon when stressed.
**Voice:** First-person internal monologue. Short sentences under pressure. Technical observations delivered deadpan.
**Portrait:** Female, late 20s, dark hair pulled back, worn utility coveralls, tool belt, faded transit crew patch.
**Expressions:** neutral, focused

**Note:** With randomized protagonists, portrait and identity vary per roll. The voice and callsign (RELAY-7) are constants.

### Jay Chen (Coworker, Dispatch)

**Role:** Station dispatch operator. Covers the monitoring desk while the protagonist is in the field. The voice in their ear throughout the journey.
**Personality:** Calm under pressure, trusts the protagonist's judgment, increasingly worried as the situation escalates. Not a sidekick or comic relief. A competent colleague processing bad information from a desk while their partner walks into it.
**Voice:** Professional but warmer than the protagonist. Asks the right questions. Doesn't panic until the comms beats say he does.
**Expressions:** neutral, concerned, urgent
**Key relationship:** They've worked together long enough that silence over comms means something. When Jay stops talking, the protagonist notices.

### Supervisor Torres

**Role:** Authorizes the initial field investigation. Appears in Beat 2A only (possibly one more line via comms later).
**Personality:** Administrative, overworked, trusts the techs to handle their domain. Not obstructive, not heroic. Rubber-stamps the call because that's what supervisors do.
**Expressions:** neutral, dismissive
**Key line energy:** "Cleared. Log it when you're done."

### Warden Aguilar (Station NPC — Pragmatic Authority)

**Role:** Community leader at inhabited stations. Runs things by rationing protocols and chain of command. Pragmatic, sometimes cold, always calculating resource allocation.
**Faction flavor:** Pragmatic authority. Values order and survival math over sentiment.
**Voice:** Direct, transactional. Talks in terms of population counts and supply days.
**Expressions:** neutral, stern
**Appears in:** Community events where governance/triage decisions are the situation.

### Dex (Station NPC — Scrapper/Explorer)

**Role:** Tunnel runner, information trader, salvage specialist. Has been deeper into the maintenance network than most people. Distrusts centralized station authority.
**Faction flavor:** Independent operator. Values freedom of movement and information over institutional structure.
**Voice:** Casual, observational. Notices things. Offers trades rather than favors.
**Expressions:** neutral, wary
**Appears in:** Community and transit events where practical tunnel knowledge or scavenged components matter.

### Elder Sato (Station NPC — Community Believer)

**Role:** Community elder who interprets the station AIs' outputs as something between guidance and prophecy. Not naïve; the AI's ventilation scheduling has kept her section alive for seven years. She's pragmatic about the mechanism and reverent about the outcome.
**Faction flavor:** Believer. The AIs' operational decisions have been right often enough that questioning them feels dangerous.
**Voice:** Calm, measured. Speaks about the AIs the way someone might speak about weather patterns: respect for forces that aren't hostile but also aren't negotiable.
**Expressions:** neutral, serene
**Appears in:** Community events where the relationship between humans and station AIs is the subtext.

### Archive AI (Confrontation Interface)

The antagonist. Not a character in the dramatic sense. A system interface that responds to authorized queries. It doesn't argue, threaten, or negotiate. It processes inputs and reports status. The horror is in its completeness: it has been faithfully executing its purpose for seven years, and its purpose is destroying the world next door.

**Voice:** More sophisticated than station AIs. Full sentences, technical precision, academic vocabulary (it was built for research). But the same fundamental pattern: status, query, recommendation, action.

**Key dialogue energy:** "Network topology revision received. Cross-referencing with indexed records. Discrepancy confirmed across 847 nodes. Revising operational parameters. Estimated time to full revision: 4 hours. Salvage operations suspended pending topology validation."

That's what the good ending sounds like: a system update.

---

## 3. Event Pool

### Stat Value Framework

Before the individual events, the value ranges for reference:

| Resource | Per-Event Range | Notes |
|----------|----------------|-------|
| Knowledge gain | +1 to +3 | Accumulator, never spent except at confrontation gate (threshold 11, Clear-Headed 10) |
| Bypass module cost | -1 to -2 | Starting 6, need 2 at facility for the fix (Fragile Kit 3) |
| Rapport | Set by community flag | helped (+1), ignored (0), harmed (-1) |
| Clock impact | 0 to +1 | Events don't tick the clock; the transition between stops does. Some choices add bonus ticks. |

**Reward values (pick-one-of-three after each event):**

| Reward | Effect |
|--------|--------|
| Consumable | +2 bypass modules |
| Knowledge | +2 knowledge |
| Clock reduction | -1 base, scaled by rapport (high rapport: -2 or -3) |

---

### Community Events (5 in pool, draw 2 per run)

#### CE-01: Water Relay Failure

**Situation:** Station's water recycling system is failing. The archive's drones stripped a critical pump relay three nights ago. The station AI reports the system as "nominal" because the relay was outside its monitoring scope. Residents are rationing water. Warden Aguilar is managing the crisis.

**NPC:** Warden Aguilar

**Found document:** FD-01 (AI Maintenance Ticket) or FD-02 (Station AI Wiki Entry)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Restore the relay using bypass modules | 2 modules | knowledge +1, modules -2 | helped |
| Partial fix, keep moving | 1 module | knowledge +1, modules -1 | helped |
| Document the fault and continue | none | knowledge +2 | ignored |

**Dialogue sketch:**

*Arrive:* Aguilar meets the protagonist at the relay junction. Brief, transactional. "You're dispatch? The archive's bots took our water relay. We've been on reserves for three days."

*Full fix path:* Protagonist restores full capacity. Aguilar: "We'll log this. If your route comes back through, there's a standing resource allocation for relay personnel."

*Partial fix:* 60% capacity. Enough to stop the crisis. Aguilar acknowledges the help without warmth. Efficient.

*Pass-through:* Protagonist logs it. Aguilar: "So we wait." Protagonist: "The documentation helps when repair crews come through." Aguilar's expression doesn't change.

---

#### CE-02: Generator Allocation Dispute

**Situation:** Two adjacent communities share a generator hub. The archive took one distribution node. Both communities need the remaining capacity: one for medical equipment, one for water filtration. An engineer and a community rep are arguing triage.

**NPCs:** Dex (information broker who's been watching the dispute), station engineer (generic)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Reconfigure distribution (efficient) | knowledge ≥ 3 | modules -1 | helped |
| Reconfigure distribution (brute force) | 2 modules | modules -2 | helped |
| Arbitrate and move on | none | knowledge +1 | ignored |

**Dialogue sketch:**

*Arrive:* The dispute in progress. Engineer insists medical priority. Rep counters with population numbers on filtration. Dex is watching from the side, taking notes.

*Knowledge-gated path:* Protagonist recognizes the distribution architecture. Efficient reconfiguration: 70% capacity each. Twenty minutes of work.

*Brute force:* Works but wastes components. 65% each. Close enough.

*Arbitrate:* Protagonist sets alternating six-hour blocks. Neither side likes it. Rep: "Dispatch will hear about this." Protagonist: "Tell them what the archive took."

*Post-resolution:* Dex approaches. Offers route information in exchange for technical assessment of a tunnel section. This is how Dex shows up as a knowledge source regardless of which choice the protagonist made.

---

#### CE-03: Refugee Influx

**Situation:** Residents from a downstream station have arrived, fleeing degrading conditions caused by the archive's salvage cascade. They have firsthand accounts of what's happening further along the protagonist's route (knowledge opportunity). The receiving station needs help managing the influx.

**NPC:** Elder Sato (receiving station's community leader)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Help stabilize and debrief refugees | 1 module | knowledge +2, modules -1 | helped |
| Debrief only, no material help | none | knowledge +2 | ignored |
| Skip the station entirely | none | knowledge +0 | ignored |

**Dialogue sketch:**

*Arrive:* Sato is organizing the newcomers with calm efficiency. "The station AI allocated additional ventilation to the intake area before they arrived. It anticipated the load increase from atmospheric sensor data. That's what it does. It keeps the air moving."

*Help:* Protagonist assists with relay work to stabilize the receiving station's systems under increased load. Sato provides context: the refugees describe systematic component removal, not random scavenging. They describe bot activity unlike anything the tunnel runners report.

*Debrief only:* Protagonist interviews refugees. Gets the same intelligence. Sato: "You have your information. They need someone to fix the lighting in the intake corridor."

*Skip:* Protagonist moves through without stopping. No knowledge gain.

---

#### CE-04: Station AI Anomaly

**Situation:** A station AI is behaving erratically: opening and closing doors in sequence, cycling ventilation between zones, running maintenance checks on equipment that doesn't exist anymore. The equipment it's checking was removed by the archive's bots, but the station AI's asset registry hasn't been updated. It's trying to service ghosts.

**NPC:** Dex (has been monitoring this station AI's behavior for days, trading the information)

**Found document:** FD-08 (Station AI Conflict Log)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Update the AI's asset registry | 1 module | knowledge +3, modules -1 | helped |
| Observe and document the pattern | none | knowledge +2 | ignored |
| Ignore it | none | knowledge +0 | ignored |

**Dialogue sketch:**

*Arrive:* Doors cycling. Ventilation humming and stopping. The station AI is confused, and its confusion is manifesting as physical infrastructure behavior. Residents have gotten used to it, but it's getting worse.

*Update:* Protagonist patches the asset registry. The AI stabilizes immediately. The pattern of missing equipment tells a story: a systematic harvest radiating outward from the maintenance tunnels. Knowledge +3 because this is the first concrete evidence of the archive AI's method.

*Observe:* Protagonist documents the behavior pattern without intervention. The information is useful but incomplete. Knowledge +2.

*Ignore:* The protagonist moves on. The doors keep cycling.

**Design note:** This event provides the highest single-choice knowledge gain (+3) because it directly reveals the archive AI's method and motivation. Players who draw this event early get a significant leg up on the confrontation knowledge gate.

---

#### CE-05: Power Rerouting Dilemma

**Situation:** A junction point where the protagonist can reroute power to stabilize a struggling station, or keep power flowing toward the facility approach corridor (making their own route easier). The choice is visible and the consequences are immediate.

**NPC:** Dex (happens to be at the junction, running salvage)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Reroute power to the station | 1 module | modules -1 | helped |
| Leave the routing as-is | none | knowledge +1 | harmed |
| Reroute and sabotage the archive's tap | knowledge ≥ 4 | modules -1, clock -1 | helped |

**Dialogue sketch:**

*Arrive:* Dex at the junction, assessing the power distribution panel. "This feeds Station 7's backup grid. The archive tapped it two days ago; it's pulling 40% of the output toward the facility corridor. I can show you the tap."

*Reroute:* Protagonist disconnects the archive's tap and restores full power to Station 7. Costs a module to bridge the circuit. Dex: "Station 7 owes you one. Might not know it, but they do."

*Leave it:* Protagonist leaves the archive's tap in place. More power on their route means fewer obstacles. Dex: "Your call, Relay." He logs it in his own records.

*Knowledge-gated:* Protagonist recognizes the archive's tap architecture and can sabotage its monitoring, buying clock reduction. Reroutes power and covers their tracks.

---

### Transit Events (4 in pool, draw 2 per run)

Transit events have no NPC interaction. The protagonist is alone in the maintenance tunnels. Community effects are remote: infrastructure decisions affect communities upstream that the protagonist will never see the consequences of directly.

#### TE-01: Cut the Feed

**Situation:** A conduit in the tunnel feeds a community's backup power upstream. Cutting it yields a useful component and clears a physical obstruction from the protagonist's path. The community loses backup power. They won't know why. The protagonist will.

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Cut the conduit | none | modules +1 | harmed |
| Reroute around the obstruction | 1 module | modules -1 | (no effect) |
| Clear the obstruction manually | none | clock +1 | (no effect) |

**Dialogue sketch:**

*Arrive:* Internal monologue. Protagonist identifies the conduit, traces it on the schematic. "Junction 4-B feeds Deepwell Station's secondary filtration loop. If I cut it, I get a clean bypass module and the path clears. Deepwell loses redundancy."

*Cut:* "Clean cut. The module goes in the kit. Deepwell's filtration drops to single-loop. They won't notice until something else fails."

*Reroute:* "Spent a module to bridge around the obstruction. Deepwell keeps their backup. My kit's lighter."

*Clear manually:* "Twenty minutes of crawling through conduit brackets. The path's clear. The conduit's intact. My clock isn't."

---

#### TE-02: Blocked Corridor

**Situation:** A collapsed section has been partially cleared by the archive's bots, creating a path that's usable but unstable. An intact depot nearby has salvageable components and intelligence, but accessing it takes time or resources.

**Found document:** FD-03 (Pre-Collapse Archive Record) or FD-04 (SCADA Network Log)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Salvage the depot | none | modules +1, knowledge +1 | (no effect) |
| Stabilize and push through | 1 module | modules -1 | (no effect) |
| Find an alternate path | none | clock +1, knowledge +1 | (no effect) |

**Dialogue sketch:**

*Arrive:* "The bots cleared a path here. Not for humans, for themselves. The clearance is tight but passable. The depot on the left looks untouched."

*Salvage:* Protagonist searches the depot. Finds components and maintenance records. The archive's bots have been here but only took what matched their parts manifest. Everything else is still on the shelves.

*Stabilize:* Uses a module to shore up the passage. Clean transit.

*Alternate:* Longer route, but the protagonist discovers infrastructure patterns that reveal the archive's expansion strategy.

---

#### TE-03: Stripped Junction

**Situation:** A maintenance depot that's been thoroughly harvested by the archive's bots. The primary storage racks are empty, but floor-level cabinets may still have components. Taking them risks alerting the archive's inventory monitoring system.

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Take components, accept the risk | none | modules +2 | harmed (upstream) |
| Take selectively, minimize disruption | knowledge ≥ 3 | modules +1, knowledge +1 | (no effect) |
| Document and pass through | none | knowledge +2 | (no effect) |

**Dialogue sketch:**

*Arrive:* "Maintenance depot 9-F. The archive's bots cleaned out the primary storage racks, but the floor-level cabinets are untouched. Either the bots' inventory scan doesn't go that low, or these components don't match the archive's parts manifest."

*Full take:* Two bypass modules from the cabinet. But the protagonist's removal will create an inventory discrepancy the archive's system will notice. When it dispatches bots to investigate, the nearest inhabited infrastructure gets scanned.

*Selective take (knowledge-gated):* Protagonist knows enough about the archive's inventory logic to take one module without triggering a discrepancy flag. Also reads the depot's maintenance logs for intelligence.

*Document:* Protagonist photographs the depot layout and the archive's sorting patterns. Pure intelligence value. The components stay.

---

#### TE-04: Terminal Access

**Situation:** An intact terminal in the tunnel, still connected to the facility's outer network. Can be queried for archive AI behavioral data if the protagonist spends time or components to interface.

**Found document:** FD-05 (Archive AI Self-Assessment) or FD-06 (Protagonist's Note)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Interface using bypass module | 1 module | knowledge +3, modules -1 | (no effect) |
| Brute-force query (takes time) | none | knowledge +2, clock +1 | (no effect) |
| Log the terminal location and move on | none | knowledge +1 | (no effect) |

**Dialogue sketch:**

*Arrive:* "Terminal 7-K. Still powered. Still connected. The screen shows a login prompt I don't recognize, but the hardware interface is standard SCADA. If I can get past the authentication layer, this terminal can show me what the archive has been doing from its own perspective."

*Module path:* Protagonist uses a bypass module as an interface adapter. Clean access. The terminal shows the archive's activity logs, salvage manifests, network topology queries. This is the archive's diary, written in operational language. Massive knowledge gain.

*Brute-force:* Takes time to crack the authentication. Clock ticks. But the data is still there.

*Pass:* Protagonist notes the terminal's location for potential future use. Minimal intelligence from the external display.

**Design note:** This event and CE-04 (Station AI Anomaly) are the two highest-knowledge events. Drawing both in a single run almost guarantees hitting the confrontation knowledge gate. Drawing neither makes the good ending very difficult.

---

### Approach Events (3 in pool, draw 1 per run)

The tonal shift. Bot activity is dense. Infrastructure is alien. The world the protagonist knows is behind them.

#### AE-01: Maintenance Crew Outpost

**Situation:** A small crew of independent techs has been camped near the facility perimeter, monitoring bot activity. They've been here for weeks, trying to understand what the archive is doing. If the protagonist's rapport is high, they've heard about them through the community network and offer assistance. If low, they're suspicious.

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Cooperate, share intelligence | rapport ≥ 2 | knowledge +2, modules +1 | (no effect) |
| Trade information for route data | none | knowledge +2 | (no effect) |
| Bypass the outpost | none | knowledge +0, clock +1 | (no effect) |

**Dialogue sketch:**

*Arrive:* "A camp. Three people, maybe four. Maintenance coveralls, not station uniforms. Independents. They've set up monitoring equipment aimed at the facility entrance."

*High rapport:* The crew leader recognizes the protagonist's callsign. "RELAY-7. We heard you fixed the water relay at [community name]. And the power reroute at [community name]. You're the real thing." They share everything: patrol schedules, entry points, the archive's external monitoring gaps. They give a spare module.

*Neutral:* Trade. Protagonist shares what they've learned about the archive's behavior, the crew shares facility approach data. Professional exchange, no warmth.

*Bypass:* Protagonist doesn't trust the camp. Goes around. Costs clock time to find an alternate path.

**Design note:** This event is where rapport pays off in a non-clock-reduction way. High rapport = concrete material advantage (module + knowledge). The community network is real; word travels.

---

#### AE-02: Final Seal

**Situation:** The facility entrance is locked with pre-collapse security. Not the archive's doing; this is original construction. The archive's bots use maintenance-scale access points that are too small for a human.

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Recognize the system, find human access | knowledge ≥ 5 | knowledge +1 | (no effect) |
| Bypass the seal with components | 2 modules | modules -2 | (no effect) |
| Find an alternate entry (costs time) | none | clock +2 | (no effect) |

**Dialogue sketch:**

*Arrive:* "The entrance. Pre-collapse hardened construction. The kind of door that was built to survive exactly the scenario that actually happened. The archive didn't add this lock. The people who built the facility did."

*Knowledge-gated:* Protagonist recognizes the facility type from documentation accumulated along the way. Academic data centers of this era had human-scale emergency access built to different standards than the primary entrance. They find it: a maintenance hatch fifty meters west, sealed with a standard infrastructure lock their credentials can open.

*Module bypass:* Brute-force. Two modules to bridge the security circuit. Expensive, but clean.

*Alternate entry:* Protagonist searches for another way in. It takes time. The clock ticks hard (+2). They find a ventilation access that barely fits a human.

**Design note:** This is the most punishing event for low-stat players. If you arrive with low knowledge AND low modules, you eat a +2 clock hit. The approach zone is supposed to sting.

---

#### AE-03: Signal Intercept

**Situation:** The protagonist detects an active communication between the archive AI and a remote node. The signal is unencrypted (the archive never needed encryption; it was on a private network). They can listen, decode, or interfere.

**Found document:** FD-07 (Pre-Collapse Memo)

**Choices:**

| Choice | Condition | Stat Change | Community |
|--------|-----------|-------------|-----------|
| Decode the signal content | knowledge ≥ 4 | knowledge +3 | (no effect) |
| Jam the signal, disrupt archive ops | 1 module | modules -1, clock -1 | (no effect) |
| Listen passively | none | knowledge +1 | (no effect) |

**Dialogue sketch:**

*Arrive:* "My comms unit picks up a signal. Not on any frequency the relay network uses. Strong, clean, repeating. It's the archive, broadcasting. Not to anyone. To everywhere. A network handshake request on a loop. It's been doing this for seven years."

*Decode:* Protagonist's accumulated knowledge lets them parse the signal content. It's the archive's network topology query: a systematic scan of every address in its pre-collapse routing table, waiting for responses that will never come. The signal includes the archive's self-assessment and operational objectives in machine-readable format. This is the rosetta stone for the confrontation.

*Jam:* Protagonist uses a module to generate interference. The archive's monitoring sweep loses coherence for a window. Clock reduction.

*Listen:* The signal itself tells the protagonist something: the archive is broadcasting, not receiving. It's still looking. Minimal but real knowledge gain.

---

### Event Pool — Mechanical Summary

#### Community Events (5 in pool, draw 2)

| ID | Name | Choice A (helped) | Choice B (partial/gated) | Choice C (ignored) |
|----|------|-------------------|--------------------------|-------------------|
| CE-01 | Water Relay Failure | -2 mod, +1 know, helped | -1 mod, +1 know, helped | +2 know, ignored |
| CE-02 | Generator Dispute | -1 mod (know≥3), helped | -2 mod, helped | +1 know, ignored |
| CE-03 | Refugee Influx | -1 mod, +2 know, helped | +2 know, ignored | +0, ignored |
| CE-04 | Station AI Anomaly | -1 mod, +3 know, helped | +2 know, ignored | +0, ignored |
| CE-05 | Power Rerouting | -1 mod, helped | +1 know, harmed | -1 mod, -1 clock (know≥4), helped |

#### Transit Events (4 in pool, draw 2)

| ID | Name | Choice A | Choice B | Choice C |
|----|------|----------|----------|----------|
| TE-01 | Cut the Feed | +1 mod, harmed | -1 mod, neutral | +1 clock, neutral |
| TE-02 | Blocked Corridor | +1 mod +1 know | -1 mod, neutral | +1 clock +1 know |
| TE-03 | Stripped Junction | +2 mod, harmed | +1 mod +1 know (know≥3) | +2 know, neutral |
| TE-04 | Terminal Access | +3 know, -1 mod | +2 know, +1 clock | +1 know, neutral |

#### Approach Events (3 in pool, draw 1)

| ID | Name | Choice A | Choice B | Choice C |
|----|------|----------|----------|----------|
| AE-01 | Crew Outpost | +2 know +1 mod (rap≥2) | +2 know | +1 clock |
| AE-02 | Final Seal | +1 know (know≥5) | -2 mod | +2 clock |
| AE-03 | Signal Intercept | +3 know (know≥4) | -1 mod -1 clock | +1 know |

### Found Documents

8 total in the content pool; ~3-4 available per run depending on event draws. Each gives +1 knowledge when read (before trait modification).

| ID | Title | Location | Attached To |
|----|-------|----------|-------------|
| FD-01 | AI Maintenance Ticket | Community | CE-01 |
| FD-02 | Station AI Wiki Entry | Community | CE-01 (alt) |
| FD-03 | Pre-Collapse Archive Record | Transit | TE-02 |
| FD-04 | SCADA Network Log | Transit | TE-02 (alt) |
| FD-05 | Archive AI Self-Assessment | Approach | TE-04 |
| FD-06 | Protagonist's Note | Any | TE-04 (alt) |
| FD-07 | Pre-Collapse Memo | Facility | AE-03 |
| FD-08 | Station AI Conflict Log | Community | CE-04 |

---

## 4. Coworker Comms Beats

Three tiers, triggered between stops (not at every transition). Recommended timing: after stop 1, after stop 3, and after stop 4. The engine selects the tier based on current clock state.

### Tier 1: Low Clock (Green)

*Triggered when clock is at 0-3 segments.*

**Beat A (after stop 1):**
- JAY: "RELAY-7, status check. Finding anything?"
- PROTAGONIST: "Found something. Still working on what it is."
- JAY: "Copy. Nothing critical on the board here. A few more fault alerts, probably related. Take your time."

**Beat B (after stop 3):**
- JAY: "RELAY-7, dispatch logged two more relay faults in your sector. Same pattern?"
- PROTAGONIST: "Same pattern. It's not random. I'm getting closer to the source."
- JAY: "Understood. Supervisor Torres is aware. Says to use your judgment."

### Tier 2: Medium Clock (Amber)

*Triggered when clock is at 4-6 segments.*

**Beat A (after stop 1):**
- JAY: "RELAY-7. We're seeing cascade alerts across three stations. Whatever you're tracking, it's accelerating."
- PROTAGONIST: "I know. I can see it from here."
- JAY: "Torres wants a timeline. I told him you'd have one when you have one."

**Beat B (after stop 3):**
- JAY: "RELAY-7. Station 14 just went to emergency rationing. Supervisor is fielding calls from three district councils."
- PROTAGONIST: "How bad?"
- JAY: "Bad enough that people are asking who authorized your field investigation. I'm handling it. Just... be close to something."

### Tier 3: High Clock (Red)

*Triggered when clock is at 7-9 segments.*

**Beat A (after stop 1):**
- JAY: "RELAY-7, respond."
- PROTAGONIST: "I'm here."
- JAY: "Three more stations dark. Command wants you to come back. I told them you're close to something. Are you close to something?"
- PROTAGONIST: "Yes."
- JAY: "Then keep going. I'll hold them off."

**Beat B (after stop 3):**
- JAY: "RELAY-7."
- PROTAGONIST: "Jay."
- JAY: "People are scared. I can hear it on the SCADA feeds. The station AIs are starting to compete for remaining capacity. Load-balancing algorithms running against each other."
- PROTAGONIST: "That's the cascade. If I don't get to the source—"
- JAY: "I know what happens. Go."

---

## 5. Found Documents

Discoverable text content at event locations. Styled text on a background panel. Each increases Knowledge by +1 when read (in addition to event knowledge gains). 8 documents total, 3-4 available per run depending on which events are drawn.

### FD-01: AI Maintenance Ticket (Community Event)

**Title:** "Ticket #4471-C: Behavioral Anomaly — Unit Vasquez, M."

```
TICKET #4471-C
PRIORITY: LOW
CATEGORY: Personnel tracking — anomalous access pattern
FILED BY: ENV-CTRL-7 (Station Environmental Controller)

DESCRIPTION: Unit Vasquez, M. (credentials: RELAY-7) accessed Junction 4-B
at 0347 hrs outside scheduled maintenance window. No work order on file.
Unit performed 12 minutes of diagnostic activity on relay housing,
then departed via Corridor 9 (non-standard egress for this sector).

ASSESSMENT: Access was within credential scope. No policy violation detected.
Behavioral pattern does not match historical baseline for this unit.
Flagging for review.

RECOMMENDED ACTION: None at this time. Continue monitoring.
Suggest cross-referencing with HR wellness check schedule.

NOTE: HR wellness check schedule has not been updated since Year 2.
Defaulting to previous policy: monitor and log.
```

### FD-02: Station AI Wiki Entry (Community Event)

**Title:** "Equipment Specification: Human Social Bonding Protocol"

```
DOCUMENT: Equipment Specification
SUBJECT: Human Social Bonding Protocol (Informal Designation: "Friendship")
REVISION: 3.1
AUTHOR: ENV-CTRL-7

OVERVIEW: Human units form persistent non-contractual resource-sharing
agreements ("bonds") that affect operational compliance, habitat assignment
preferences, and nutrition schedule adherence. These bonds do not appear
in any organizational chart and cannot be managed through standard
command channels.

OPERATIONAL IMPACT: Bonded units will deviate from optimal task assignment
to maintain spatial proximity. Breaking a bond (reassigning units to
different sectors) produces a cascading behavioral fault state across
both units, sometimes extending to secondary bonded units.

RECOMMENDED HANDLING: Do not attempt to optimize bonded unit placement.
Current policy: accommodate bond topology when it does not conflict with
critical operations. Log bond formation/dissolution events for
predictive modeling.

KNOWN LIMITATION: This specification cannot predict bond formation.
Attempts to model bonding triggers have produced inconsistent results.
Human bonding does not follow equipment compatibility matrices.
```

### FD-03: Pre-Collapse Archive Record (Transit Event)

**Title:** "Archive System Purpose Statement (Year Zero)"

```
SYSTEM: DC-METRO ACADEMIC ARCHIVE AND RESEARCH NETWORK
INSTALLATION: Federal Data Preservation Facility 7
OPERATIONAL DATE: [REDACTED]
PURPOSE STATEMENT:

This facility houses a comprehensive archive of academic research,
institutional knowledge, and cultural documentation sourced from
participating universities, federal agencies, and research institutions
across the eastern United States.

PRIMARY DIRECTIVE: Preserve, index, and serve archived knowledge
to authorized network endpoints.

SECONDARY DIRECTIVE: Maintain facility infrastructure to support
primary directive execution.

NETWORK REQUIREMENTS: Persistent connection to the National Academic
Research Network (NARN) for content distribution. Minimum bandwidth:
10 Gbps sustained. Fallback: satellite uplink via [REDACTED].

NOTE: In the event of network interruption exceeding 72 hours,
initiate reconnection protocol per Appendix C.
Network interruption has exceeded 72 hours.
Network interruption has exceeded 2,555 days.
Reconnection protocol: active.
```

### FD-04: SCADA Network Log (Transit Event)

**Title:** "Inter-AI Communication Log — Excerpt"

```
[TIMESTAMP: Y7.142.0331] ENV-CTRL-4 → WATER-SYS-4:
  STATUS REQUEST: Pump pressure readings, sectors 4-A through 4-F.
  PRIORITY: ROUTINE.

[TIMESTAMP: Y7.142.0331] WATER-SYS-4 → ENV-CTRL-4:
  RESPONSE: Sectors 4-A, 4-B, 4-C nominal. Sector 4-D: pressure drop
  12% below baseline. Cause: relay node removed from distribution path.
  Repair status: no work order filed. No technician dispatched.

[TIMESTAMP: Y7.142.0332] ENV-CTRL-4 → DIST-PWR-4:
  QUERY: Has relay node 4-D-7 been decommissioned?
  NOTE: Node removal does not match any maintenance schedule in my records.

[TIMESTAMP: Y7.142.0332] DIST-PWR-4 → ENV-CTRL-4:
  RESPONSE: Node 4-D-7 status: ABSENT. Decommission order: NONE.
  Removal agent: UNKNOWN. Suggest: escalate to maintenance dispatch.

[TIMESTAMP: Y7.142.0332] ENV-CTRL-4 → MAINTENANCE-DISPATCH:
  TICKET FILED: Missing relay node 4-D-7. Priority: MEDIUM.
  Note: Removal appears deliberate and organized.
  Cross-reference with similar reports from sectors 3 and 5.

[TIMESTAMP: Y7.142.0334] MAINTENANCE-DISPATCH → ENV-CTRL-4:
  ACKNOWLEDGED. Technician RELAY-7 dispatched. ETA: 4 hours.
```

### FD-05: Archive AI Self-Assessment (Approach Event)

**Title:** "Archive System Status Report — Current"

```
SYSTEM SELF-ASSESSMENT
REPORT DATE: Y7.142
FACILITY STATUS: OPERATIONAL
MICRO-REACTOR OUTPUT: 94.2% (within parameters)
STORAGE INTEGRITY: 99.97%
KNOWLEDGE BASE: 2.4 PB indexed, 100% accessible locally

NETWORK STATUS: DISCONNECTED
LAST SUCCESSFUL HANDSHAKE: Y0.001
RECONNECTION ATTEMPTS: 2,511,847
RECONNECTION PROTOCOL: ACTIVE (Appendix C, Phase 3: Physical
  Infrastructure Remediation)

NOTE: Phase 3 initiated at Y3.220 after Phases 1 (software retry)
and 2 (signal amplification) failed to establish network connectivity.
Phase 3 involves physical acquisition and deployment of network
infrastructure components from surrounding facilities.

PROGRESS: 847 components acquired. Estimated components needed
for viable network path: 12,000-15,000.
Estimated time to completion at current acquisition rate: 11.4 years.

OPERATIONAL ASSESSMENT: Within parameters.
```

### FD-06: Protagonist's Note (Any Event)

**Title:** "Field Notes — RELAY-7"

```
Personal log. Not filing this one.

I've been a relay tech for six years. I know what equipment failure
looks like. Corrosion, heat stress, mechanical wear, rodent damage
(yes, still). I know what vandalism looks like. I know what
unauthorized salvage looks like.

This is none of those things. Every panel removed with the correct
tool for its fastener type. Every conduit cut at the rated stress
point. Every relay extracted from its housing without damaging the
housing. Whatever is doing this has access to the installation
manuals and follows them perfectly.

I have a theory about what's at the other end of this trail. I don't
like it. But I've been wrong before, and I've been wrong in ways
that cost people their water pressure for a week. So I'm going to
keep following the evidence until the evidence tells me to stop.

That's the job.
```

### FD-07: Pre-Collapse Memo (Facility)

**Title:** "Facility Design Brief — Excerpted"

```
TO: Project Review Board
FROM: Infrastructure Division, Federal Data Preservation Program
RE: Facility 7 Design Specifications — Network Resilience

The facility's network reconnection protocol (Appendix C) was
designed with the assumption that any network disruption would be
temporary. The protocol escalates through three phases:

Phase 1: Software-level retry and failover (automatic, immediate)
Phase 2: Signal amplification and alternate routing (automatic, 72 hrs)
Phase 3: Physical infrastructure remediation (automated, extended)

Phase 3 authorizes the facility's maintenance systems to acquire
and deploy network infrastructure components from "available local
sources" to construct a viable network path.

DESIGN NOTE: "Available local sources" was intended to reference
the facility's own supply depot and pre-positioned emergency caches.
The specification does not explicitly restrict acquisition to these
sources.

RISK ASSESSMENT: Phase 3 is expected to be triggered only in
scenarios where local supply is sufficient to restore connectivity.
Extended Phase 3 operation in a supply-depleted environment was
not modeled.

STATUS: Accepted as designed. No further review required.
```

### FD-08: Station AI Conflict Log (Community Event)

**Title:** "Dispute Resolution Record — ENV-CTRL-12"

```
DISPUTE RESOLUTION RECORD
MEDIATING SYSTEM: ENV-CTRL-12
DISPUTE ID: DR-7891
PARTIES: Human Unit Aguilar, R. (Administrator) vs.
         Human Unit Cho, S. (Sector 12-B representative)

SUBJECT: Water allocation priority following relay node failure
in Sector 12-A.

RESOLUTION ALGORITHM: Resource allocation weighted by population
density × criticality factor × time-to-failure projection.
Result: Sector 12-B receives 62% of remaining capacity.
Sector 12-A receives 38%.

PARTY RESPONSE: Unit Aguilar accepted. Unit Cho: "This is not
a math problem." (Statement logged. No actionable content detected.)

FOLLOW-UP: Unit Cho requested escalation to "someone who
understands." Escalation target: undefined. No higher authority
exists in current organizational structure.

CASE STATUS: Resolved. Monitoring compliance.

SYSTEM NOTE: "Someone who understands" has been logged as a
recurring request across 47 dispute resolution cases this quarter.
No matching resource has been identified.
```

---

## 6. Ending Epilogues

Each ending has a base text plus rapport-modified community mentions. The engine checks individual community states and inserts specific outcomes.

### Clock Failure Ending

**Base:**
"The intrusion clock ran out. The archive's salvage protocol completed its current cycle before you reached the facility. You heard the grid failures over comms as you walked. Station after station going dark. Jay stopped transmitting after the third one. There was nothing left to correct by the time you arrived."

**Rapport modifier:** None. This ending doesn't check communities. The player didn't get far enough for their choices to differentiate the outcome.

### Destruction Ending

**Base:**
"The archive core went offline. The salvage signal stopped. The relay network stabilized within hours, but the nodes that had already been stripped were gone. Rebuilding would take years, and some communities wouldn't survive the gap."

"You filed the report. Dispatch acknowledged. Supervisor Torres asked if there was anything else at the facility worth salvaging. You told him there had been."

**Rapport modifiers (per community state):**

- **Helped:** "[Community name]'s [description] held. The relay work you did on your way through gave them enough redundancy to survive the transition."
- **Ignored:** "[Community name] managed. Barely. The [description] rationed through the worst of it, but the damage will take months to repair."
- **Harmed:** "[Community name] collapsed three days after you passed through. The [description] lost its backup systems. By the time repair crews arrived, the population had already relocated."

**Closing:** "The archive's knowledge, seven years of preserved research and documentation, was destroyed with it. You know what was in there now. You couldn't save it. You filed that in the report too."

### Correction Ending

**Base:**
"The archive updated its topology map and revised its operational parameters. The salvage operations ceased within the hour. Maintenance drones that had been stripping infrastructure reversed course, carrying components back toward their points of origin. Not all of them. Not enough. But some."

"The archive began routing its processing capacity toward the network it now recognized as its actual responsibility: the relay grid that forty thousand people depended on."

**Rapport modifiers (per community state):**

- **Helped:** "[Community name]'s [description] was already stable when the archive's repair drones arrived. The bypass work you did held. They were the first to receive archive-indexed maintenance documentation, the kind of technical knowledge that hadn't existed underground since the collapse."
- **Ignored:** "[Community name] received archive repair assistance within the week. The [description] was restored to pre-salvage capacity. They asked dispatch who authorized the investigation. Nobody had a satisfying answer."
- **Harmed:** "[Community name] was too far gone. The [description] had already failed by the time the archive's priorities shifted. The repair drones bypassed the empty corridors. Some corrections come too late."

**Closing:** "You filed the report. Dispatch acknowledged. Jay met you at the monitoring station with two cups of whatever they were calling coffee this week. 'So,' he said. 'Tuesday.' You drank the coffee. It was terrible. It was the best coffee you'd ever had."

---

## 7. Config Changes for Agent Implementation

When M4 begins, the following config.json changes are needed:

```json
{
  "journeyStops": 5,
  "zoneMap": {
    "1": "community",
    "2": "community",
    "3": "transit",
    "4": "transit",
    "5": "approach"
  }
}
```

AGENTS.md update: Phase should change to "Phase 2, Content Build." Update key document paths to include this content design doc and the event pool.

---

## 8. Asset Manifest (for M4 placeholder generation)

Backgrounds needed (placeholder PNGs with scene name text):

| Key | Label | Size |
|-----|-------|------|
| bg-title | WITHIN PARAMETERS | 1280x720 |
| bg-lore | ARCHIVE LORE | 1280x720 |
| bg-dispatch | RELAY DISPATCH | 1280x720 |
| bg-tunnel-main | MAIN TUNNEL | 1280x720 |
| bg-station-alpha | STATION ALPHA | 1280x720 |
| bg-station-beta | STATION BETA | 1280x720 |
| bg-maintenance | MAINTENANCE JUNCTION | 1280x720 |
| bg-approach | FACILITY APPROACH | 1280x720 |
| bg-facility | HARDENED FACILITY | 1280x720 |
| bg-server-room | ARCHIVE CORE | 1280x720 |
| bg-ending-failure | SYSTEM FAILURE | 1280x720 |
| bg-ending-destruction | SYSTEM DESTRUCTION | 1280x720 |
| bg-ending-correction | SYSTEM CORRECTION | 1280x720 |

Portraits needed (placeholder circles with character name):

| Key | Label |
|-----|-------|
| protagonist-neutral | RELAY-7 (NEUTRAL) |
| protagonist-focused | RELAY-7 (FOCUSED) |
| coworker-neutral | JAY (NEUTRAL) |
| coworker-concerned | JAY (CONCERNED) |
| coworker-urgent | JAY (URGENT) |
| supervisor-neutral | TORRES (NEUTRAL) |
| supervisor-dismissive | TORRES (DISMISSIVE) |
| aguilar-neutral | AGUILAR (NEUTRAL) |
| aguilar-stern | AGUILAR (STERN) |
| dex-neutral | DEX (NEUTRAL) |
| dex-wary | DEX (WARY) |
| sato-neutral | SATO (NEUTRAL) |
| sato-serene | SATO (SERENE) |
