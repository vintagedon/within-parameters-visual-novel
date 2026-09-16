/**
 * Event type contracts — defines the roguelike event system in Beat 4.
 * Events are drawn from a zone-filtered pool (community → transit → approach).
 * Each event contains its own scenes plus three reward options.
 */

import type { Scene, StatChanges } from './scene';

/** Event category determines which zone it can appear in */
export type EventCategory = 'community' | 'transit' | 'approach';

/** The three reward types available after each event */
export type RewardType = 'consumable' | 'knowledge' | 'clock-reduction';

/** Tracked state of a community the player encounters */
export type CommunityState = 'helped' | 'ignored' | 'harmed';

/** A reward option presented after an event resolves */
export interface RewardOption {
  type: RewardType;
  /** Display label */
  label: string;
  /** Description text */
  description: string;
  /** Base stat change — clock-reduction is modified by rapport at runtime */
  baseEffect: Partial<StatChanges>;
}

/** A modular event definition — drawn from the pool during Beat 4 */
export interface EventDef {
  /** Unique event ID */
  id: string;
  /** Event category — determines zone eligibility */
  category: EventCategory;
  /** Display name for the event */
  name: string;
  /** The scenes that make up this event (arrive → situation → choice → consequence) */
  scenes: Scene[];
  /** Entry scene ID (first scene of this event) */
  entryScene: string;
  /** The three reward options presented after the event resolves */
  rewards: [RewardOption, RewardOption, RewardOption];
  /** Scene ID for the reward selection screen */
  rewardScene: string;
  /**
   * Found documents attached to this event (FD ids in
   * data/found-documents.json). At most one is surfaced per run at this
   * event; availability tracks the event draw.
   */
  foundDocumentIds?: string[];
}

/** A community from the name pool, assigned to a stop at runtime */
export interface Community {
  /** Unique community ID */
  id: string;
  /** Display name */
  name: string;
  /** Brief description for epilogue context */
  description: string;
}

/** Runtime state of a community during a run */
export interface CommunityRunState {
  community: Community;
  state: CommunityState;
  /** Which stop (1-6) this community was encountered at */
  stop: number;
}
