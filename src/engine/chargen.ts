/**
 * Character generation — random protagonist rolls and presentation-view
 * resolution (spec A2 / wp-spec-03 roguelike layer).
 *
 * Pure data + pure functions, no DOM. Consumes the reconciled engine's typed
 * protagonist state and the balance-locked trait catalogue; it never touches
 * trait math, scoring constants, or the reroll multiplier (those live in
 * traits.ts / scoring.ts / config.json). The UI layer calls these to build the
 * dossier and the ending score breakdown.
 *
 * Generation sequence (game-design/character-generation.md §1):
 *   gender (50/50) → first name from the gendered pool → shared surname →
 *   backstory → positive trait → negative trait. Callsign is always RELAY-7.
 *
 * Backstory text carries controlled {slots} resolved at render time:
 *   {name}/{Name}            first name
 *   {pronoun}/{Pronoun}      subject (she/he) — only used in modal/past forms
 *   {pronoun_obj}            object (her/him)
 *   {pronoun_poss}           possessive (her/his)
 *   {station}/{Station}      rolled home station
 * A leading uppercase letter in the token capitalizes the substitution.
 *
 * @module engine/chargen
 */

import type {
  ProtagonistIdentity,
  PositiveTraitId,
  NegativeTraitId,
  GameConfig,
  EndingType,
} from '../types/index';
import type { Rng } from './rng';
import { POSITIVE_TRAITS, NEGATIVE_TRAITS } from './traits';
import { DEFAULT_CALLSIGN } from './game-state';

// ─── Pool data contract (data/protagonist-pool.json) ──────────────────────────

/** Backstory flavor + per-ending epilogue, with {slots}. */
export interface BackstoryDef {
  id: string;
  title: string;
  flavor: string;
  epilogue: {
    correction: string;
    destruction: string;
  };
}

/** Parsed protagonist generation pool. */
export interface ProtagonistPool {
  names: {
    poolA: string[]; // female-presenting first names (8)
    poolB: string[]; // male-presenting first names (8)
    surnames: string[]; // shared (10)
  };
  stations: string[];
  backstories: BackstoryDef[];
  /**
   * Name-index → portrait-asset key, per gender. Minimum-viable maps every
   * index to a single base portrait per gender; swapping in the 8-face ideal
   * tier is a data-only change here (no code).
   */
  portraitKeys: {
    female: string[];
    male: string[];
  };
}

// ─── Pool parsing / validation ────────────────────────────────────────────────

/**
 * Parses and validates the raw JSON pool. Throws on shape/count violations so
 * a malformed pool fails loudly at boot rather than rendering broken dossiers.
 */
export function parseProtagonistPool(data: unknown): ProtagonistPool {
  const d = data as Partial<ProtagonistPool> & { names?: ProtagonistPool['names'] };
  const names = d.names;
  const backstories = d.backstories;
  const stations = d.stations;
  const portraitKeys = d.portraitKeys;

  if (
    !names ||
    !Array.isArray(names.poolA) ||
    !Array.isArray(names.poolB) ||
    !Array.isArray(names.surnames) ||
    !Array.isArray(backstories) ||
    !Array.isArray(stations) ||
    !portraitKeys ||
    !Array.isArray(portraitKeys.female) ||
    !Array.isArray(portraitKeys.male)
  ) {
    throw new Error('[chargen] protagonist pool has an invalid shape');
  }
  if (names.poolA.length !== 8 || names.poolB.length !== 8) {
    throw new Error(
      `[chargen] each first-name pool must have 8 entries (got ${names.poolA.length}/${names.poolB.length})`
    );
  }
  if (names.surnames.length !== 10) {
    throw new Error(`[chargen] surnames must have 10 entries (got ${names.surnames.length})`);
  }
  if (backstories.length !== 6) {
    throw new Error(`[chargen] backstories must have 6 entries (got ${backstories.length})`);
  }
  if (portraitKeys.female.length < 8 || portraitKeys.male.length < 8) {
    throw new Error('[chargen] portraitKeys must map all 8 name indices per gender');
  }

  return {
    names: { poolA: names.poolA, poolB: names.poolB, surnames: names.surnames },
    stations,
    backstories,
    portraitKeys,
  };
}

// ─── Generation ───────────────────────────────────────────────────────────────

/**
 * Rolls a fresh protagonist. Gender is 50/50; the first name is drawn from the
 * matching gendered pool; the surname from the shared pool; then one backstory,
 * one positive trait, and one negative trait. Callsign is always RELAY-7. The
 * rolled home station is stored for stable backstory/epilogue slot resolution.
 */
export function generateProtagonist(pool: ProtagonistPool, rng: Rng): ProtagonistIdentity {
  const female = rng.next() < 0.5;
  const gender: 'female' | 'male' = female ? 'female' : 'male';
  const firstPool = female ? pool.names.poolA : pool.names.poolB;
  const firstName = firstPool[rng.intBelow(firstPool.length)]!;
  const surname = pool.names.surnames[rng.intBelow(pool.names.surnames.length)]!;
  const backstoryId = pool.backstories[rng.intBelow(pool.backstories.length)]!.id;
  const positiveTrait = POSITIVE_TRAITS[rng.intBelow(POSITIVE_TRAITS.length)]!.id;
  const negativeTrait = NEGATIVE_TRAITS[rng.intBelow(NEGATIVE_TRAITS.length)]!.id;
  const station = pool.stations[rng.intBelow(pool.stations.length)]!;

  return {
    callsign: DEFAULT_CALLSIGN,
    name: `${firstName} ${surname}`,
    gender,
    backstoryId,
    positiveTrait,
    negativeTrait,
    station,
  };
}

// ─── Slot resolution ──────────────────────────────────────────────────────────

export interface PronounSet {
  /** subject: she / he */
  subject: string;
  /** object: her / him */
  object: string;
  /** possessive: her / his */
  possessive: string;
}

export function pronounsFor(gender: 'female' | 'male'): PronounSet {
  return gender === 'female'
    ? { subject: 'she', object: 'her', possessive: 'her' }
    : { subject: 'he', object: 'him', possessive: 'his' };
}

/**
 * Resolves controlled {slots} against the protagonist's identity. A token whose
 * first letter is uppercase capitalizes the substitution (e.g. {Name}, {Station},
 * {Pronoun}). Unknown tokens are left intact so a malformed pool surfaces as a
 * literal {token} in the rendered text rather than silently dropping content.
 */
export function resolveSlots(text: string, p: ProtagonistIdentity): string {
  const first = (p.name ?? '').split(' ')[0] ?? '';
  const pronouns = p.gender ? pronounsFor(p.gender) : { subject: 'they', object: 'them', possessive: 'their' };
  const vars: Record<string, string> = {
    name: first,
    pronoun: pronouns.subject,
    pronoun_obj: pronouns.object,
    pronoun_poss: pronouns.possessive,
    station: p.station ?? '',
  };

  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key.toLowerCase()];
    if (value === undefined) return match;
    const capitalize = key.charAt(0) !== key.charAt(0).toLowerCase();
    return capitalize ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  });
}

// ─── Portrait + trait lookups ─────────────────────────────────────────────────

/** Returns true if any {slot} remains unresolved in the text. */
export function hasUnresolvedSlots(text: string): boolean {
  return /\{\w+\}/.test(text);
}

/**
 * Derives the portrait-asset key from the protagonist's first name (looked up in
 * the matching gendered pool) via the pool's name-index map. Data-driven: the
 * 8-face ideal tier is a data change to portraitKeys, not a code change.
 */
export function resolvePortraitKey(p: ProtagonistIdentity, pool: ProtagonistPool): string {
  if (!p.gender || !p.name) return 'protagonist-neutral';
  const firstPool = p.gender === 'female' ? pool.names.poolA : pool.names.poolB;
  const firstName = p.name.split(' ')[0] ?? '';
  const index = firstPool.indexOf(firstName);
  const keys = p.gender === 'female' ? pool.portraitKeys.female : pool.portraitKeys.male;
  if (index < 0) return keys[0] ?? 'protagonist-neutral';
  return keys[index] ?? keys[0] ?? 'protagonist-neutral';
}

function getBackstory(pool: ProtagonistPool, id: string | null): BackstoryDef | null {
  if (!id) return null;
  return pool.backstories.find((b) => b.id === id) ?? null;
}

// ─── Trait epilogue run-summary lines ─────────────────────────────────────────
//
// Short run-summary lines for the score breakdown (game-design/
// character-generation.md §6). The four authored in the design doc are
// preserved verbatim; the remaining twelve are written in the same voice.

export const TRAIT_EPILOGUE: Record<PositiveTraitId | NegativeTraitId, string> = {
  P1: 'Well-Supplied: started with extra modules. You spent them well.',
  P2: 'Quick Study: knowledge rewards ran hot all run.',
  P3: 'Networked: you walked in with a contact\u2019s trust already.',
  P4: 'Steady Hand: the clock kept its rhythm under a steady hand.',
  P5: 'Field Expedient: you made more of every resupply.',
  P6: 'Clear-Headed: your instincts opened doors others would have missed.',
  P7: 'Light Foot: you moved through the transit sections clean.',
  P8: 'Practiced: the first module spent each stop cost you nothing.',
  N1: 'Tunnel Nerves: the approach ground the clock forward.',
  N2: 'Rough Touch: community work cost extra every time.',
  N3: 'Narrow Focus: clock recovery was blunted.',
  N4: 'Distracted: found documents offered nothing usable.',
  N5: 'Lone Wolf: you started with nothing. You earned everything.',
  N6: 'Fragile Kit: the fix demanded more than most could carry.',
  N7: 'Exhausted: the clock was never on your side. Every stop carried a heightened risk of the clock ticking twice.',
  N8: 'Stubborn: the choices were made for you at the communities.',
};

// ─── Dossier view ─────────────────────────────────────────────────────────────

/** Resolved trait descriptor for a dossier trait card. */
export interface TraitCardView {
  id: PositiveTraitId | NegativeTraitId;
  name: string;
  summary: string;
  polarity: 'positive' | 'negative';
  /** GameUI accent: success for positive, danger for negative. */
  accent: 'success' | 'danger';
}

/**
 * Everything the dossier screen needs to render, with every slot already
 * resolved (no {tokens}). Built once per roll; rebuilt on reroll.
 */
export interface DossierView {
  fullName: string;
  callsign: string;
  gender: 'female' | 'male';
  portraitKey: string;
  /** Manifest placeholder color fallback for the portrait block. */
  portraitPlaceholderColor: string;
  assignment: string;
  backstoryTitle: string;
  /** Resolved backstory flavor paragraph. */
  backstoryFlavor: string;
  positiveTrait: TraitCardView;
  negativeTrait: TraitCardView;
  rerollCount: number;
  /** 0.92 ^ rerollCount, as a whole-percent ceiling. */
  rerollCeilingPercent: number;
}

/** Constant assignment line (design doc dossier mockup). */
export const ASSIGNMENT_LINE =
  'Field investigation \u2014 infrastructure anomaly, eastern maintenance corridor';

/**
 * The compounding reroll ceiling as a percentage: round(rerollMultiplier ^
 * rerollCount * 100). Compounds past reroll 4 (no floor), matching the engine's
 * scoring.ts and agreeing with the design doc's stepped table to displayed
 * precision for the first several rerolls.
 */
export function rerollCeilingPercent(rerollCount: number, config: GameConfig): number {
  return Math.round(Math.pow(config.rerollMultiplier, rerollCount) * 100);
}

function traitCardView(
  id: PositiveTraitId | NegativeTraitId,
  polarity: 'positive' | 'negative'
): TraitCardView {
  const def =
    polarity === 'positive'
      ? POSITIVE_TRAITS.find((t) => t.id === id as PositiveTraitId)
      : NEGATIVE_TRAITS.find((t) => t.id === id as NegativeTraitId);
  const name = def?.name ?? id;
  const summary = def?.summary ?? '';
  return { id, name, summary, polarity, accent: polarity === 'positive' ? 'success' : 'danger' };
}

/**
 * Builds the dossier view for a candidate protagonist. `portraitColors` is the
 * assetKey → placeholder-color map (built from characters.json by main.ts).
 */
export function buildDossierView(
  protagonist: ProtagonistIdentity,
  pool: ProtagonistPool,
  config: GameConfig,
  portraitColors: Map<string, string>,
  rerollCount: number
): DossierView {
  const backstory = getBackstory(pool, protagonist.backstoryId);
  const portraitKey = resolvePortraitKey(protagonist, pool);
  const flavor = backstory ? resolveSlots(backstory.flavor, protagonist) : '';

  return {
    fullName: protagonist.name ?? protagonist.callsign,
    callsign: protagonist.callsign,
    gender: protagonist.gender ?? 'female',
    portraitKey,
    portraitPlaceholderColor:
      portraitColors.get(portraitKey) ?? portraitColors.get('protagonist-neutral') ?? 'var(--gui-surface-strong)',
    assignment: ASSIGNMENT_LINE,
    backstoryTitle: backstory?.title ?? '',
    backstoryFlavor: flavor,
    positiveTrait: protagonist.positiveTrait
      ? traitCardView(protagonist.positiveTrait, 'positive')
      : traitCardView('P1', 'positive'),
    negativeTrait: protagonist.negativeTrait
      ? traitCardView(protagonist.negativeTrait, 'negative')
      : traitCardView('N1', 'negative'),
    rerollCount,
    rerollCeilingPercent: rerollCeilingPercent(rerollCount, config),
  };
}

// ─── Ending epilogue resolution ───────────────────────────────────────────────

/**
 * Resolves the protagonist's backstory epilogue line for the achieved ending.
 * Returns null when there is no line for the ending type (the design doc defines
 * correction and destruction lines only; clock-failure has none) or when the
 * protagonist has no committed backstory.
 */
export function backstoryEpilogue(
  protagonist: ProtagonistIdentity,
  pool: ProtagonistPool,
  ending: EndingType
): string | null {
  if (ending === 'clock-failure') return null;
  const backstory = getBackstory(pool, protagonist.backstoryId);
  if (!backstory) return null;
  const raw = backstory.epilogue[ending];
  return raw ? resolveSlots(raw, protagonist) : null;
}

/** The run-summary line for a single trait, or null if the trait id is unknown. */
export function traitEpilogueLine(id: PositiveTraitId | NegativeTraitId | null): string | null {
  if (!id) return null;
  return TRAIT_EPILOGUE[id] ?? null;
}

