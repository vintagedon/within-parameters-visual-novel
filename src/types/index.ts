/**
 * Type barrel — re-exports all public type contracts for the Within Parameters engine.
 * Import from here rather than from individual type modules.
 */
export type { BeatType, DialogueLine, Choice, ChoiceCondition, StatChanges, Scene, SceneFlags, CommsTierDef, CommsBeatDef, CommsBeatsData } from './scene';
export type { EventCategory, RewardType, CommunityState, RewardOption, EventDef, Community, CommunityRunState, FoundDocument } from './event';
export type {
  PositiveTraitId,
  NegativeTraitId,
  TraitDef,
  EndingType,
  ScoreGrade,
  ProtagonistIdentity,
  PlayerStats,
  IntrusionClock,
  EventPhase,
  RunOutcome,
  GameState,
  SaveSlot,
  PersistentData,
  GameConfig,
} from './state';
export type { Character, PortraitAsset, BackgroundAsset, AudioAsset, CharacterManifest } from './characters';
