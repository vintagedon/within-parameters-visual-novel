/**
 * Scoring cascade and ending determination — the term-for-term port of
 * simulation/simulator.py `calculate_score` and `determine_ending`.
 *
 * The cascade order is: ending base, communities helped, positive rapport,
 * tiered consumables-remaining bonus, tiered knowledge-over-threshold bonus,
 * clock-segments-remaining bonus. Then clamp to maxRawScore, then apply the
 * compounding reroll multiplier and floor to an integer.
 *
 * @module engine/scoring
 */

import type {
  GameConfig,
  GameState,
  EndingType,
  ScoreGrade,
  RunOutcome,
} from '../types/index';
import { deriveRapport } from './game-state';

// ─── Ending determination ─────────────────────────────────────────────────────

/**
 * Mirrors simulator.py determine_ending. Clock-failure wins if the run was
 * aborted (state.alive === false). Otherwise correction requires both
 * knowledge ≥ threshold AND consumables ≥ fix_cost; otherwise destruction.
 */
export function determineEnding(state: GameState, config: GameConfig): EndingType {
  if (!state.alive) return 'clock-failure';
  if (
    state.stats.knowledge >= config.knowledgeThreshold &&
    state.stats.consumables >= config.consumableFixCost
  ) {
    return 'correction';
  }
  return 'destruction';
}

// ─── Raw score cascade ────────────────────────────────────────────────────────

/**
 * Consumables-remaining bonus. Three tiers, additive:
 *   ≥1 remaining: perConsumableRemaining
 *   ≥2 remaining: + perConsumableRemainingSurplus
 *   ≥3 remaining: + (remaining - 2) * perConsumableRemainingSurplus2
 */
function consumableRemainingBonus(modulesRemaining: number, config: GameConfig): number {
  let bonus = 0;
  if (modulesRemaining >= 1) bonus += config.perConsumableRemaining;
  if (modulesRemaining >= 2) bonus += config.perConsumableRemainingSurplus;
  if (modulesRemaining >= 3) bonus += (modulesRemaining - 2) * config.perConsumableRemainingSurplus2;
  return bonus;
}

/**
 * Knowledge-over-threshold bonus. Three tiers, additive. Uses the same tiered
 * shape as consumableRemainingBonus.
 */
function knowledgeOverThresholdBonus(knowledgeOver: number, config: GameConfig): number {
  let bonus = 0;
  if (knowledgeOver >= 1) bonus += config.perKnowledgeOverThreshold;
  if (knowledgeOver >= 2) bonus += config.perKnowledgeOverThresholdSurplus;
  if (knowledgeOver >= 3) bonus += (knowledgeOver - 2) * config.perKnowledgeOverThresholdSurplus2;
  return bonus;
}

/**
 * Clock-segments-remaining bonus. First three remaining segments each award
 * perClockSegmentRemaining; the fourth awards +1; nothing beyond. Matches the
 * simulator's `for seg in range(min(clock_remaining, 10))` loop.
 */
function clockSegmentBonus(state: GameState, config: GameConfig): number {
  const clockRemaining = Math.max(0, config.clockMax - state.clock.current);
  let bonus = 0;
  const segments = Math.min(clockRemaining, 10);
  for (let seg = 0; seg < segments; seg++) {
    if (seg < 3) bonus += config.perClockSegmentRemaining;
    else if (seg === 3) bonus += 1;
  }
  return bonus;
}

/**
 * Computes the raw score (before reroll multiplier, before clamp) for a given
 * ending. Public so the harness and tests can inspect the pre-clamp value.
 */
export function calculateRawScore(state: GameState, config: GameConfig, ending: EndingType): number {
  let base: number;
  let modulesRemaining: number;
  if (ending === 'correction') {
    base = config.endingCorrection;
    modulesRemaining = Math.max(0, state.stats.consumables - config.consumableFixCost);
  } else if (ending === 'destruction') {
    base = config.endingDestruction;
    modulesRemaining = Math.max(0, state.stats.consumables);
  } else {
    base = config.endingClockFailure;
    modulesRemaining = Math.max(0, state.stats.consumables);
  }

  let score = base;

  const communitiesHelped = state.communities.filter((c) => c.state === 'helped').length;
  score += communitiesHelped * config.perCommunityHelped;

  const effectiveRapport = Math.max(0, deriveRapport(state));
  score += effectiveRapport * config.perRapportPoint;

  score += consumableRemainingBonus(modulesRemaining, config);

  const knowledgeOver = Math.max(0, state.stats.knowledge - config.knowledgeThreshold);
  score += knowledgeOverThresholdBonus(knowledgeOver, config);

  score += clockSegmentBonus(state, config);

  return score;
}

/**
 * Full scoring cascade. Returns the RunOutcome the engine writes to GameState
 * at ending time. finalScore is `floor(clamp(raw, 0, maxRawScore) * multiplier^rerolls)`.
 */
export function scoreRun(state: GameState, config: GameConfig): RunOutcome {
  const ending = determineEnding(state, config);
  const rawScore = calculateRawScore(state, config, ending);
  const rawScoreClamped = Math.min(rawScore, config.maxRawScore);
  const multiplier = Math.pow(config.rerollMultiplier, state.rerollCount);
  const finalScore = Math.floor(rawScoreClamped * multiplier);
  return {
    ending,
    rawScore,
    rawScoreClamped,
    finalScore,
    grade: gradeForScore(finalScore),
  };
}

// ─── Letter grade ─────────────────────────────────────────────────────────────

/**
 * Map a final score to a letter grade. S/A/B thresholds are pulled from the
 * simulator's report (S >= 90, A >= 75, B >= 60). C/D/F are display-only and
 * do not affect balance; the intervals chosen here are sensible defaults for
 * a 0-103 raw range: C >= 45, D >= 30, F < 30.
 */
export function gradeForScore(score: number): ScoreGrade {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

// ─── Score breakdown (presentation projection) ────────────────────────────────

/** One row of the score breakdown shown on the ending screen. */
export interface ScoreComponent {
  label: string;
  value: number;
}

/**
 * Read-only decomposition of the scoring cascade into its components, plus the
 * reroll multiplier line. This is a pure projection of the cascade already
 * computed by calculateRawScore / scoreRun — it reuses the same private tier
 * helpers and constants, so the components sum exactly to the raw score. It does
 * not retune any value (the design-doc "do not touch scoring" rule applies to
 * mechanics/values, which are unchanged); it only exposes them for display.
 */
export interface ScoreBreakdown {
  ending: EndingType;
  components: ScoreComponent[];
  /** Sum of components — equals calculateRawScore(state, config, ending). */
  rawScore: number;
  rawScoreClamped: number;
  rerollCount: number;
  /** rerollMultiplier ^ rerollCount. */
  multiplier: number;
  finalScore: number;
  grade: ScoreGrade;
}

/**
 * Decomposes a completed run's raw score into its cascade components for the
 * ending-screen breakdown. The component list mirrors calculateRawScore term by
 * term (ending base, communities helped, rapport, modules remaining, knowledge
 * over threshold, clock remaining), so sum(components) === rawScore exactly.
 */
export function buildScoreBreakdown(
  state: GameState,
  config: GameConfig,
  rerollCount: number
): ScoreBreakdown {
  const ending = determineEnding(state, config);
  const rawScore = calculateRawScore(state, config, ending);

  // Ending base + the module-remaining baseline that calculateRawScore uses.
  let base: number;
  let modulesRemaining: number;
  if (ending === 'correction') {
    base = config.endingCorrection;
    modulesRemaining = Math.max(0, state.stats.consumables - config.consumableFixCost);
  } else if (ending === 'destruction') {
    base = config.endingDestruction;
    modulesRemaining = Math.max(0, state.stats.consumables);
  } else {
    base = config.endingClockFailure;
    modulesRemaining = Math.max(0, state.stats.consumables);
  }

  const communitiesHelped = state.communities.filter((c) => c.state === 'helped').length;
  const effectiveRapport = Math.max(0, deriveRapport(state));
  const knowledgeOver = Math.max(0, state.stats.knowledge - config.knowledgeThreshold);

  const components: ScoreComponent[] = [
    { label: 'Ending base', value: base },
    { label: 'Communities helped', value: communitiesHelped * config.perCommunityHelped },
    { label: 'Rapport', value: effectiveRapport * config.perRapportPoint },
    { label: 'Modules remaining', value: consumableRemainingBonus(modulesRemaining, config) },
    { label: 'Knowledge over threshold', value: knowledgeOverThresholdBonus(knowledgeOver, config) },
    { label: 'Clock remaining', value: clockSegmentBonus(state, config) },
  ];

  const rawScoreClamped = Math.min(rawScore, config.maxRawScore);
  const multiplier = Math.pow(config.rerollMultiplier, rerollCount);
  const finalScore = Math.floor(rawScoreClamped * multiplier);

  return {
    ending,
    components,
    rawScore,
    rawScoreClamped,
    rerollCount,
    multiplier,
    finalScore,
    grade: gradeForScore(finalScore),
  };
}
