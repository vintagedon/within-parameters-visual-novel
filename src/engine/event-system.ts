/**
 * Event pool management and reward cycle.
 * Events are pre-shuffled by zone at run start; drawEvent pulls the next eligible
 * event for the current stop's zone. Rewards are resolved after each event with
 * clock-reduction scaled by the current rapport.
 *
 * The shuffle and reward paths accept an injectable Rng so the replay harness
 * can drive them deterministically. The live engine passes no Rng and gets the
 * default Math.random-backed one.
 *
 * @module engine/event-system
 */

import type {
  EventDef,
  Community,
  CommunityRunState,
  RewardOption,
  GameState,
  GameConfig,
} from '../types/index';
import { calculateClockReduction, applyStatChanges } from './game-state';
import type { Rng } from './rng';
import { defaultRng } from './rng';

export interface EventPoolState {
  /** Events grouped by zone category */
  byZone: {
    community: EventDef[];
    transit: EventDef[];
    approach: EventDef[];
  };
  /** Unused communities available for assignment */
  availableCommunities: Community[];
  /** Events already drawn this run (IDs) */
  usedEventIds: Set<string>;
}

function shuffle<T>(arr: T[], rng: Rng = defaultRng()): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    // biome-ignore lint — deliberate swap
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Partitions all events by zone category and shuffles each pool independently. Communities are also shuffled for random stop assignment. */
export function initEventPool(
  events: EventDef[],
  _config: GameConfig,
  communities: Community[],
  rng: Rng = defaultRng()
): EventPoolState {
  const byZone: EventPoolState['byZone'] = {
    community: shuffle(events.filter((e) => e.category === 'community'), rng),
    transit: shuffle(events.filter((e) => e.category === 'transit'), rng),
    approach: shuffle(events.filter((e) => e.category === 'approach'), rng),
  };

  return {
    byZone,
    availableCommunities: shuffle(communities, rng),
    usedEventIds: new Set(),
  };
}

/**
 * AI NOTE: Falls back to any unused event across all zones if the target zone is exhausted.
 * This prevents hard locks but can violate zone theming — only triggered if content pool is thin.
 */
export function drawEvent(
  pool: EventPoolState,
  stopIndex: number,
  config: GameConfig
): { event: EventDef; community: Community; pool: EventPoolState } {
  const zoneKey = (config.zoneMap[stopIndex] ?? 'community') as keyof EventPoolState['byZone'];
  const zonePool = pool.byZone[zoneKey];

  const eligible = zonePool.filter((e) => !pool.usedEventIds.has(e.id));

  if (eligible.length === 0) {
    // Fallback: any unused event
    const fallback = [
      ...pool.byZone.community,
      ...pool.byZone.transit,
      ...pool.byZone.approach,
    ].find((e) => !pool.usedEventIds.has(e.id));

    if (!fallback) {
      throw new Error(`[event-system] No eligible events for stop ${stopIndex}`);
    }
    return drawEventResult(fallback, pool, config, stopIndex);
  }

  const event = eligible[0]!;
  return drawEventResult(event, pool, config, stopIndex);
}

function drawEventResult(
  event: EventDef,
  pool: EventPoolState,
  _config: GameConfig,
  _stopIndex: number
): { event: EventDef; community: Community; pool: EventPoolState } {
  const community = pool.availableCommunities[0] ?? {
    id: 'community-unknown',
    name: 'Unknown Settlement',
    description: 'an unrecorded community',
  };

  const newUsed = new Set(pool.usedEventIds);
  newUsed.add(event.id);

  const newPool: EventPoolState = {
    byZone: {
      community: pool.byZone.community.filter((e) => e.id !== event.id),
      transit: pool.byZone.transit.filter((e) => e.id !== event.id),
      approach: pool.byZone.approach.filter((e) => e.id !== event.id),
    },
    availableCommunities: pool.availableCommunities.slice(1),
    usedEventIds: newUsed,
  };

  return { event, community, pool: newPool };
}

export function getRewardsForStop(
  event: EventDef,
  state: GameState,
  config: GameConfig
): RewardOption[] {
  return event.rewards.map((reward) => {
    if (reward.type === 'clock-reduction') {
      const reduction = calculateClockReduction(state, config);
      return {
        ...reward,
        baseEffect: { ...reward.baseEffect, clock: -reduction },
        description: reward.description.replace(
          '{amount}',
          String(reduction)
        ),
      };
    }
    return reward;
  });
}

/**
 * Applies a reward to state. Trait bonuses (Quick Study: +knowledge,
 * Field Expedient: +consumables) are added on top of the reward's base effect,
 * matching simulator.py apply_reward.
 */
export function applyReward(
  reward: RewardOption,
  state: GameState,
  config: GameConfig
): GameState {
  if (reward.type === 'clock-reduction') {
    const reduction = calculateClockReduction(state, config);
    return applyStatChanges(state, { clock: -reduction });
  }

  const baseEffect = { ...reward.baseEffect };
  if (reward.type === 'consumable' && baseEffect.consumables !== undefined) {
    baseEffect.consumables = baseEffect.consumables + config.consumableRewardBonus;
  }
  if (reward.type === 'knowledge' && baseEffect.knowledge !== undefined) {
    baseEffect.knowledge = baseEffect.knowledge + config.knowledgeRewardBonus;
  }
  return applyStatChanges(state, baseEffect);
}

export function buildCommunityRunState(
  community: Community,
  stop: number
): CommunityRunState {
  return {
    community,
    state: 'ignored',
    stop,
  };
}
