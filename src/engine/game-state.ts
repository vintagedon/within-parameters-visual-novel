/**
 * Game state mutations — pure functions returning new GameState objects.
 * Never mutates state in place. All stat changes, clock ticks, and community
 * state transitions flow through here. Rapport is derived from community states
 * and cached in stats.startingRapport baseline + helped/harmed delta; always
 * update via setCommunityState, never directly.
 *
 * The clock model and clock-reduction mirror simulation/simulator.py:
 * tickClock uses the jitter-chance model (not a uniform 0..max draw) and
 * accepts an injectable Rng so the replay harness can drive it deterministically.
 *
 * @module engine/game-state
 */

import type {
  GameState,
  GameConfig,
  PlayerStats,
  IntrusionClock,
  StatChanges,
  CommunityRunState,
  CommunityState,
  ProtagonistIdentity,
} from '../types/index';
import type { Rng } from './rng';
import { defaultRng } from './rng';

/** Constant callsign across all rolls. */
export const DEFAULT_CALLSIGN = 'RELAY-7';

/** Default protagonist placeholder used until spec A2 chargen fills it in. */
export const DEFAULT_PROTAGONIST: ProtagonistIdentity = {
  callsign: DEFAULT_CALLSIGN,
  name: null,
  gender: null,
  backstoryId: null,
  positiveTrait: null,
  negativeTrait: null,
  station: null,
};

export function initNewGame(config: GameConfig, runNumber: number = 1): GameState {
  const clock: IntrusionClock = {
    current: 0,
    max: config.clockMax,
  };

  const stats: PlayerStats = {
    knowledge: config.startingKnowledge,
    consumables: config.startingConsumables,
    rapport: config.startingRapport,
    startingRapport: config.startingRapport,
  };

  return {
    currentScene: 'scene-lore-01',
    currentBeat: 'lore',
    stats,
    clock,
    currentStop: 0,
    usedEventIds: [],
    communities: [],
    flags: {},
    sceneHistory: [],
    eventPhase: null,
    activeEventId: null,
    timestamp: Date.now(),
    runNumber,
    protagonist: { ...DEFAULT_PROTAGONIST },
    rerollCount: 0,
    outcome: null,
    alive: true,
  };
}

export function applyStatChanges(
  state: GameState,
  changes: Partial<StatChanges>
): GameState {
  const stats = { ...state.stats };

  if (changes.knowledge !== undefined) {
    stats.knowledge = Math.max(0, stats.knowledge + changes.knowledge);
  }
  if (changes.consumables !== undefined) {
    stats.consumables = Math.max(0, stats.consumables + changes.consumables);
  }
  if (changes.rapport !== undefined) {
    stats.startingRapport = stats.startingRapport + changes.rapport;
    // Recompute live rapport from the updated baseline + community deltas,
    // not the baseline alone (matches deriveRapport / simulator.py rapport).
    stats.rapport = deriveRapport({ ...state, stats });
  }

  let clock = state.clock;
  if (changes.clock !== undefined) {
    // Lower-clamp only, matching simulator.py apply_choice / apply_reward.
    // The upper bound is enforced by the post-tick isClockFull() check, so
    // mid-stop clock values may briefly exceed clockMax (Tunnel Nerves can
    // push approach choices past the threshold). Required for statistical
    // parity with the validated Python balance simulator.
    clock = {
      ...state.clock,
      current: Math.max(0, state.clock.current + changes.clock),
    };
  }

  return { ...state, stats, clock, timestamp: Date.now() };
}

/**
 * Apply the per-stop clock tick using the simulator's jitter-chance model:
 *   tick = clockBaseTick
 *   if rng.next() < clockJitterChance: tick += clockJitterAmount
 * The clock can exceed config.clockMax here — the caller checks isClockFull
 * immediately after to drive ending determination. Mirrors simulator.py
 * apply_clock_tick.
 */
export function tickClock(
  state: GameState,
  config: GameConfig,
  rng: Rng = defaultRng()
): GameState {
  let tick = config.clockBaseTick;
  if (rng.next() < config.clockJitterChance) {
    tick += config.clockJitterAmount;
  }
  const newCurrent = state.clock.current + tick;

  return {
    ...state,
    clock: { ...state.clock, current: newCurrent },
    timestamp: Date.now(),
  };
}

export function isClockFull(state: GameState, config: GameConfig): boolean {
  return state.clock.current >= config.clockMax;
}

/**
 * AI NOTE: Recalculates rapport and caches it on stats.rapport after every
 * community state change. Call this rather than mutating communities directly.
 */
export function setCommunityState(
  state: GameState,
  stopIndex: number,
  communityState: CommunityState
): GameState {
  const communities = state.communities.map((c) =>
    c.stop === stopIndex ? { ...c, state: communityState } : c
  );

  const updatedState = { ...state, communities };
  const rapport = deriveRapport(updatedState);

  return {
    ...updatedState,
    stats: { ...updatedState.stats, rapport },
    timestamp: Date.now(),
  };
}

/**
 * Derives live rapport from the protagonist's starting baseline plus the
 * community deltas. Mirrors simulator.py GameState.rapport property:
 *   starting_rapport + communities_helped - communities_harmed
 */
export function deriveRapport(state: GameState): number {
  const delta = state.communities.reduce((acc, c) => {
    if (c.state === 'helped') return acc + 1;
    if (c.state === 'harmed') return acc - 1;
    return acc;
  }, 0);
  return state.stats.startingRapport + delta;
}

/**
 * Computes available clock reduction for the reward cycle. Mirrors simulator.py
 * calc_clock_reduction:
 *   raw = clockReductionBase + floor(rapport * rapportClockScale)
 *   reduction = min(raw, clockReductionMax)
 *   if narrowFocus: reduction = max(0, reduction - 1)
 */
export function calculateClockReduction(state: GameState, config: GameConfig): number {
  const rapport = deriveRapport(state);
  const raw = config.clockReductionBase + Math.floor(rapport * config.rapportClockScale);
  let reduction = Math.min(raw, config.clockReductionMax);
  if (config.narrowFocus) {
    reduction = Math.max(0, reduction - 1);
  }
  return reduction;
}

export function checkKnowledgeGate(state: GameState, threshold: number): boolean {
  return state.stats.knowledge >= threshold;
}

/** Marks the run as aborted by clock failure. The actual ending/score is computed in scoring.ts. */
export function markClockFailure(state: GameState): GameState {
  return { ...state, alive: false, timestamp: Date.now() };
}

export function addToHistory(state: GameState, sceneId: string): GameState {
  return {
    ...state,
    sceneHistory: [...state.sceneHistory, sceneId],
  };
}

export function setFlag(state: GameState, flag: string, value: boolean = true): GameState {
  return {
    ...state,
    flags: { ...state.flags, [flag]: value },
    timestamp: Date.now(),
  };
}

export function addCommunity(state: GameState, community: CommunityRunState): GameState {
  return {
    ...state,
    communities: [...state.communities, community],
    timestamp: Date.now(),
  };
}

export function advanceStop(state: GameState, eventId: string): GameState {
  return {
    ...state,
    currentStop: state.currentStop + 1,
    usedEventIds: [...state.usedEventIds, eventId],
    activeEventId: null,
    eventPhase: null,
    timestamp: Date.now(),
  };
}
