/**
 * Game state type contracts — the full serializable run state for Within Parameters.
 *
 * Schema is reconciled with the Python balance simulator (simulation/game_data.py
 * `Config` dataclass) so the TS engine reproduces the simulator's mechanics
 * exactly. Field names stay in engine style (camelCase, "consumables" for the
 * simulator's "modules"); field values match the locked winning config.
 *
 * GameState is immutable by convention: all mutations return new objects via
 * game-state.ts. PersistentData is stored separately and survives across runs.
 */

import type { CommunityRunState } from './event';

// ─── Trait system ─────────────────────────────────────────────────────────────

/**
 * Positive (P1-P8) and negative (N1-N8) trait IDs, mirroring
 * simulation/game_data.py POSITIVE_TRAITS / NEGATIVE_TRAITS. Trait values are
 * balance-locked; do not retune without orchestrator approval.
 */
export type PositiveTraitId =
  | 'P1' // Well-Supplied
  | 'P2' // Quick Study
  | 'P3' // Networked
  | 'P4' // Steady Hand
  | 'P5' // Field Expedient
  | 'P6' // Clear-Headed
  | 'P7' // Light Foot
  | 'P8'; // Practiced

export type NegativeTraitId =
  | 'N1' // Tunnel Nerves
  | 'N2' // Rough Touch
  | 'N3' // Narrow Focus
  | 'N4' // Distracted
  | 'N5' // Lone Wolf
  | 'N6' // Fragile Kit
  | 'N7' // Exhausted
  | 'N8'; // Stubborn

/** Trait descriptor used by the engine, harness, and (in spec A2) the dossier. */
export interface TraitDef<T extends string = PositiveTraitId | NegativeTraitId> {
  id: T;
  /** Display name (e.g. "Well-Supplied"). */
  name: string;
  /** Short mechanic summary, for tooltips and worklogs. */
  summary: string;
  /** Polarity — drives trait-application order (positive then negative). */
  polarity: 'positive' | 'negative';
}

// ─── Endings & grades ─────────────────────────────────────────────────────────

export type EndingType = 'correction' | 'destruction' | 'clock-failure';

/**
 * Letter grade for a completed run. S/A/B thresholds are pulled from the
 * simulator's report; C/D/F are display-only and do not affect balance:
 *   S >= 90, A >= 75, B >= 60, C >= 45, D >= 30, F < 30.
 */
export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

// ─── Protagonist identity (populated by spec A2) ──────────────────────────────

/**
 * Protagonist identity. Populated by spec A2 (chargen + dossier). Typed here
 * so A2 can fill fields without reshaping GameState.
 */
export interface ProtagonistIdentity {
  /** Callsign is constant across all rolls. */
  callsign: string;
  /** Rolled given name; null until A2 assigns one. */
  name: string | null;
  /** Rolled gender; null until A2 assigns one. */
  gender: 'female' | 'male' | null;
  /** Rolled backstory ID; null until A2 assigns one. */
  backstoryId: string | null;
  /** Rolled positive trait; null until A2 assigns one. */
  positiveTrait: PositiveTraitId | null;
  /** Rolled negative trait; null until A2 assigns one. */
  negativeTrait: NegativeTraitId | null;
  /**
   * Rolled home station (spec A2). Stable per run: resolves the {station}
   * slot in backstory flavor and epilogue text. Null until chargen assigns one.
   */
  station: string | null;
}

// ─── Player stats & clock ─────────────────────────────────────────────────────

/** Player stats tracked during a run */
export interface PlayerStats {
  /** Accumulator — determines options at confrontation. Never spent. */
  knowledge: number;
  /** Spendable resource — relay tech bypass modules (simulator's "modules"). */
  consumables: number;
  /**
   * Live rapport (cached for UI display). Re-derived from startingRapport +
   * community deltas whenever communities change. The authoritative value is
   * always deriveRapport(state); this field is the memoized result.
   */
  rapport: number;
  /** Rapport baseline before community deltas (Networked trait adds +1 here). */
  startingRapport: number;
}

/** The intrusion clock — background timer representing archive AI's salvage acceleration */
export interface IntrusionClock {
  /** Current value (0 to max) */
  current: number;
  /** Maximum before loss (from config) */
  max: number;
}

/** Which phase of the event cycle the player is in at a journey stop */
export type EventPhase =
  | 'arriving'
  | 'situation'
  | 'choice'
  | 'consequence'
  | 'reward-pick'
  | 'transition';

// ─── Final run outcome (computed at ending time) ──────────────────────────────

/**
 * Computed final outcome, available once the run reaches an ending. Score and
 * grade are derived from GameState + config at ending time; they are not
 * authoritative between stops.
 */
export interface RunOutcome {
  ending: EndingType;
  /** Raw score after the tiered cascade, before the reroll multiplier. */
  rawScore: number;
  /** Raw score clamped to maxRawScore. */
  rawScoreClamped: number;
  /** Final score after applying reroll multiplier and flooring. */
  finalScore: number;
  grade: ScoreGrade;
}

// ─── Game state ───────────────────────────────────────────────────────────────

/** Full game state — this is what gets serialized to a save slot */
export interface GameState {
  /** Current scene ID */
  currentScene: string;
  /** Current narrative beat (redundant with scene data but useful for quick checks) */
  currentBeat: string;
  /** Player stats */
  stats: PlayerStats;
  /** Intrusion clock state */
  clock: IntrusionClock;
  /** Current journey stop number (1 to journeyStops, 0 if not in journey phase) */
  currentStop: number;
  /** IDs of events already drawn this run (for no-repeat) */
  usedEventIds: string[];
  /** Community states for this run */
  communities: CommunityRunState[];
  /** Accumulated flags (knowledge checks passed, items found, etc.) */
  flags: Record<string, boolean>;
  /** Scene history for back-reference (dialogue log) */
  sceneHistory: string[];
  /** Current event phase if in journey */
  eventPhase: EventPhase | null;
  /** Active event ID if in journey */
  activeEventId: string | null;
  /** Timestamp for save metadata */
  timestamp: number;
  /** Run number (for stats tracking) */
  runNumber: number;
  /** Protagonist identity (populated by spec A2; placeholder until then). */
  protagonist: ProtagonistIdentity;
  /**
   * Reroll count applied during chargen (spec A2). Each reroll compounds the
   * reroll multiplier against the final score. Default 0 in this spec.
   */
  rerollCount: number;
  /** Run outcome — null until the run reaches an ending. */
  outcome: RunOutcome | null;
  /** Whether the run was aborted by clock failure (drives ending determination). */
  alive: boolean;
}

/** A save slot */
export interface SaveSlot {
  /** Slot index (0-4 for manual, 'auto' for autosave) */
  id: number | 'auto';
  /** Display label */
  label: string;
  /** The saved game state */
  state: GameState;
  /** Save timestamp */
  savedAt: number;
  /** Current scene name for display in save/load UI */
  sceneLabel: string;
  /** Current beat for display */
  beatLabel: string;
}

/** Persistent data across runs (stored separately from saves) */
export interface PersistentData {
  /** Total runs started */
  runsStarted: number;
  /** Total runs completed (reached any ending) */
  runsCompleted: number;
  /** Endings seen (by type) */
  endingsSeen: string[];
  /** Audio muted preference */
  audioMuted: boolean;
  /** Cutscenes setting */
  cutscenesSetting: 'all' | 'none';
}

// ─── Game configuration ───────────────────────────────────────────────────────

/**
 * Balance configuration loaded from data/config.json.
 *
 * Field-by-field mirror of simulation/game_data.py's `Config` dataclass, in
 * engine naming style (camelCase, "consumables" for the simulator's "modules").
 * The locked winning config (v2 sweep, 6/6 validation criteria) ships in
 * data/config.json: knowledgeThreshold=11, knowledgeRewardBonus=-2 (reward
 * total 0), clockBaseTick=1, startingConsumables=6, clockJitterChance=0.35.
 *
 * The behavior-flag booleans (roughTouch, stubborn, etc.) are the trait system's
 * runtime switches. They are optional on the base config (absent ≡ false) and
 * flipped on by the trait application pipeline in src/engine/traits.ts at run
 * start; config.json does not carry them.
 */
export interface GameConfig {
  // ── Resource baselines ──
  /** Starting bypass-module count (simulator: starting_modules). */
  startingConsumables: number;
  /** Starting knowledge. */
  startingKnowledge: number;
  /** Starting rapport baseline (Networked trait adds here). */
  startingRapport: number;

  // ── Intrusion clock model ──
  /** Clock value that triggers loss. */
  clockMax: number;
  /** Deterministic per-stop tick. */
  clockBaseTick: number;
  /** Probability that clockJitterAmount is added on a given stop. */
  clockJitterChance: number;
  /** Extra tick added with probability clockJitterChance. */
  clockJitterAmount: number;

  // ── Clock reduction (reward cycle) ──
  /** Base reduction before rapport scaling. */
  clockReductionBase: number;
  /** Hard cap on per-reward reduction (simulator: clock_reduction_max). */
  clockReductionMax: number;
  /** Rapport → bonus reduction scale. */
  rapportClockScale: number;

  // ── Ending & journey structure ──
  /** Knowledge gate for the correction ending. */
  knowledgeThreshold: number;
  /** Consumables required to execute the facility fix. */
  consumableFixCost: number;
  /** Total journey stops before the facility (simulator: journey_stops). */
  journeyStops: number;

  // ── Scoring envelope ──
  /** Hard cap on raw score before reroll multiplier. */
  maxRawScore: number;
  /** Per-reroll compounding multiplier (0.92 per the locked config). */
  rerollMultiplier: number;

  // ── Reward bonuses (trait-modifiable) ──
  /** Bonus knowledge added on knowledge rewards (Quick Study: +1). */
  knowledgeRewardBonus: number;
  /** Bonus consumables added on consumable rewards (Field Expedient: +1). */
  consumableRewardBonus: number;

  // ── Trait behavior flags (optional on base config; traits flip on at run start) ──
  /** Rough Touch (N2): community-event consumable costs +1. */
  roughTouch?: boolean;
  /** Stubborn (N8): forces highest-affordable-cost community choice. */
  stubborn?: boolean;
  /** Practiced (P8): first consumable-spending choice each stop costs 1 less. */
  practiced?: boolean;
  /** Light Foot (P7): transit-event positive clock changes suppressed. */
  lightFoot?: boolean;
  /** Tunnel Nerves (N1): approach-event clock changes +1. */
  tunnelNerves?: boolean;
  /** Distracted (N4): found-document passive knowledge gain suppressed. */
  distracted?: boolean;
  /** Narrow Focus (N3): clock reduction -1, floor 0. */
  narrowFocus?: boolean;

  // ── Scoring cascade constants ──
  /** Correction ending base score. */
  endingCorrection: number;
  /** Destruction ending base score. */
  endingDestruction: number;
  /** Clock-failure ending base score. */
  endingClockFailure: number;
  /** Per helped community. */
  perCommunityHelped: number;
  /** Per point of positive rapport. */
  perRapportPoint: number;
  /** Tier 1: 1 consumable remaining. */
  perConsumableRemaining: number;
  /** Tier 2: 2 consumables remaining (added on top of tier 1). */
  perConsumableRemainingSurplus: number;
  /** Tier 3: each consumable beyond 2 (added on top of tiers 1+2). */
  perConsumableRemainingSurplus2: number;
  /** Tier 1: 1 knowledge over threshold. */
  perKnowledgeOverThreshold: number;
  /** Tier 2: 2 knowledge over threshold (added on top of tier 1). */
  perKnowledgeOverThresholdSurplus: number;
  /** Tier 3: each knowledge beyond 2 over threshold (added on top of tiers 1+2). */
  perKnowledgeOverThresholdSurplus2: number;
  /** Per remaining clock segment for the first three segments; +1 for the fourth. */
  perClockSegmentRemaining: number;

  // ── Engine/UI constants (not in the simulator's Config) ──
  /** Typewriter text speed (ms per character). */
  typewriterSpeed: number;
  /** BGM crossfade duration (ms). */
  bgmCrossfadeDuration: number;
  /** Zone assignment: which stops map to which event categories (2/2/1). */
  zoneMap: Record<number, string>;
}
