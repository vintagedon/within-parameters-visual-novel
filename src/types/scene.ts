/**
 * Scene type contracts — the atomic unit of narrative content in Within Parameters.
 * Scenes are authored in scenes.json and consumed by SceneRunner via the scene registry.
 * DialogueLine, Choice, and SceneFlags compose the Scene interface.
 */

/** Which narrative beat this scene belongs to */
export type BeatType =
  | 'lore'          // Beat 1 — skippable lore card
  | 'status-quo'    // Beat 2 — linear narrative, inciting incident
  | 'discovery'     // Beat 3 — trail investigation, event system activates
  | 'journey'       // Beat 4 — roguelike systems phase (6 modular stops)
  | 'facility'      // Beat 5 — facility penetration (stat-gated)
  | 'confrontation' // Beat 6 — ending determination
  | 'ending';       // Beat 6b — ending + epilogue

/** A single line of dialogue or narration */
export interface DialogueLine {
  /** Character ID speaking, or 'narrator' for narration */
  speaker: string;
  /** The text content */
  text: string;
  /** Optional expression override for the speaking character */
  expression?: string;
  /** Optional background change triggered by this line */
  background?: string;
  /** Optional BGM change triggered by this line */
  bgm?: string;
  /** Optional SFX triggered by this line */
  sfx?: string;
}

/** A player choice within a scene */
export interface Choice {
  /** Display text for the choice button */
  label: string;
  /** Scene ID to transition to when chosen */
  nextScene: string;
  /** Optional stat modifications applied when chosen */
  statChanges?: Partial<StatChanges>;
  /** Optional community state change */
  communityEffect?: 'helped' | 'harmed';
  /** Optional — only show this choice if a condition is met */
  condition?: ChoiceCondition;
  /**
   * Facility confrontation semantics (Beat 5): gates and costs resolve from
   * the effective config at runtime, never from authored literals.
   *   - 'correct': the repair; requires knowledge >= threshold and
   *     consumables >= fixCost; charges fixCost once at the point of repair.
   *   - 'shutdown': the forced shutdown; requires consumables >= fixCost and
   *     is only offered when the correction is not executable; charges fixCost.
   *   - 'withdraw': the no-action fallback when nothing can be executed.
   */
  facilityAction?: 'correct' | 'shutdown' | 'withdraw';
}

/** Condition for a choice to be visible */
export interface ChoiceCondition {
  /** Stat to check */
  stat: 'knowledge' | 'consumables' | 'rapport';
  /** Minimum value required */
  min: number;
}

/** Stat changes applied by a choice or event consequence */
export interface StatChanges {
  knowledge: number;
  consumables: number;
  /** Direct rapport change (rare — usually derived from community state) */
  rapport: number;
  /** Intrusion clock change (positive = tick forward, negative = reduce) */
  clock: number;
}

/** A scene definition — the atomic unit of narrative content */
export interface Scene {
  /** Unique scene ID — referenced by choices and transitions */
  id: string;
  /** Which narrative beat this scene belongs to */
  beat: BeatType;
  /** Background image key (maps to asset manifest) */
  background: string;
  /** BGM track key (maps to asset manifest) — null to continue current */
  bgm?: string | null;
  /** Dialogue lines in sequence */
  dialogue: DialogueLine[];
  /** Player choices at end of dialogue (if any) — omit for auto-advance */
  choices?: Choice[];
  /** If no choices, the next scene ID to auto-advance to */
  next?: string;
  /** Special scene behaviors */
  flags?: SceneFlags;
}

/** Special behaviors for a scene */
export interface SceneFlags {
  /** This is a skippable scene (lore card, cutscene) */
  skippable?: boolean;
  /** Show the three-pane game UI (false = full-screen narrative) */
  showGameUI?: boolean;
  /** This scene triggers the event system (Beat 4 entry) */
  enterEventPhase?: boolean;
  /** This scene is an ending — show ending screen after */
  isEnding?: boolean;
  /** Ending type for ending scenes (advisory; the persisted computed outcome routes) */
  endingType?: 'clock-failure' | 'destruction' | 'correction';
  /**
   * This scene's completion determines the ending: the runner computes and
   * persists the state-derived outcome and routes to the matching ending
   * scene. Used by the facility intervention consequences.
   */
  determineEnding?: boolean;
  /** Trigger autosave after this scene completes */
  autosave?: boolean;
  /** This scene triggers a coworker comms beat */
  commsInterrupt?: boolean;
}
