/**
 * Content-extremes analysis (gate 5.1, deliverable 1).
 *
 * Reads data/ and the existing rendering/view-model helpers to report the
 * longest rendered instance of every string class the screens display, with
 * its id, character count, source/helper file, and the producing state.
 * No hand-maintained copies of data strings: every measured string comes
 * from the authoritative data or the same helpers the UI calls
 * (SceneRunner.getChoiceViews, getRewardsForStop, buildEpilogue,
 * buildDossierView, backstoryEpilogue, traitEpilogueLine,
 * buildScoreBreakdown).
 *
 * Invoked by scripts/content-extremes.mjs:
 *   node content-extremes.mjs <repoRoot> <dataDir>
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SceneRunner, buildSceneRegistry } from '../src/engine/scene-runner';
import { buildEffectiveConfig, POSITIVE_TRAITS, NEGATIVE_TRAITS } from '../src/engine/traits';
import { getRewardsForStop } from '../src/engine/event-system';
import { buildEpilogue } from '../src/ui/screens';
import {
  buildDossierView,
  backstoryEpilogue,
  traitEpilogueLine,
  parseProtagonistPool,
  type ProtagonistPool,
} from '../src/engine/chargen';
import { buildScoreBreakdown } from '../src/engine/scoring';
import { initNewGame } from '../src/engine/game-state';
import type {
  Scene,
  EventDef,
  Choice,
  GameState,
  GameConfig,
  Community,
  FoundDocument,
  CharacterManifest,
  CommsBeatsData,
  ProtagonistIdentity,
  CommunityState,
} from '../src/types/index';

const repoRoot = process.argv[2]!;
const dataDir = process.argv[3] ?? join(repoRoot, 'data');

const read = <T>(name: string): T => JSON.parse(readFileSync(join(dataDir, name), 'utf8')) as T;

const config = read<GameConfig>('config.json');
const scenesData = read<{ scenes: Scene[] }>('scenes.json').scenes;
const eventsData = read<{ events: EventDef[] }>('events.json').events;
const charactersData = read<CharacterManifest>('characters.json');
const communitiesData = read<{ communities: Community[] }>('communities.json').communities;
const documentsData = read<{ documents?: FoundDocument[] }>('found-documents.json').documents ?? [];
const commsBeatsData = read<CommsBeatsData>('comms-beats.json');
const pool: ProtagonistPool = parseProtagonistPool(read<unknown>('protagonist-pool.json'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Extreme {
  cls: string;
  id: string;
  chars: number;
  text: string;
  source: string;
  state: string;
}

const extremes: Extreme[] = [];

/** Keeps the longest candidate for one string class. */
function record(cls: string, id: string, text: string, source: string, state: string): void {
  const prev = extremes.find((e) => e.cls === cls);
  if (prev && text.length <= prev.chars) return;
  const entry: Extreme = { cls, id, chars: text.length, text, source, state };
  if (prev) extremes[extremes.indexOf(prev)] = entry;
  else extremes.push(entry);
}

/** Displayed form of an HTML fragment (tags stripped), as the UI shows it. */
function displayed(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

const characterNames = new Map(charactersData.characters.map((c) => [c.id, c.name]));

const STUB_CALLBACKS = {
  onSceneStart: () => {},
  onStateUpdate: () => {},
  onRewardChoice: () => {},
  onEnding: () => {},
  onCommsInterrupt: () => {},
};

/** A runner carrying an arbitrary crafted state, with Practiced unavailable
 *  so choice-cost suffixes render at their maximum (no discount). */
function runnerWithState(state: GameState, effConfig: GameConfig): SceneRunner {
  const registry = buildSceneRegistry(scenesData, eventsData, documentsData, commsBeatsData);
  const runner = new SceneRunner(state, effConfig, registry, communitiesData, STUB_CALLBACKS);
  runner.restoreEngine({ rngState: 0, practicedAvailable: false, eventPool: null, resumePhase: null });
  return runner;
}

const longest = (xs: string[]) => xs.reduce((a, b) => (b.length > a.length ? b : a));
const maxFirstName = () => longest([...pool.names.poolA, ...pool.names.poolB]);
const maxSurname = () => longest(pool.names.surnames);
const maxStation = () => longest(pool.stations);

const communityAt = (state: CommunityState, c: Community, stop: number): GameState['communities'][number] => ({
  community: c,
  state,
  stop,
});

// ─── 1. Typed dialogue line ───────────────────────────────────────────────────

for (const scene of scenesData) {
  scene.dialogue.forEach((line, i) =>
    record('dialogue-line', `${scene.id}#${i}`, line.text, 'data/scenes.json + ui/dialogue.ts typewriter', 'any run rendering this scene')
  );
}
for (const event of eventsData) {
  for (const scene of event.scenes) {
    scene.dialogue.forEach((line, i) =>
      record('dialogue-line', `${scene.id}#${i}`, line.text, 'data/events.json + ui/dialogue.ts typewriter', `event ${event.id} drawn at its zone stop`)
    );
  }
}

// ─── 2. Speaker name (dialogue bar) ───────────────────────────────────────────
// Rendered as character.name, or the protagonist's rolled FIRST name for
// protagonist lines (main.ts splits the pool name). Narrator renders empty.

for (const c of charactersData.characters) {
  record('speaker-name', c.id, c.name, 'data/characters.json + ui/dialogue.ts', 'any line where this character speaks');
}
for (const name of [...pool.names.poolA, ...pool.names.poolB]) {
  record('speaker-name', `protagonist-pool:${name}`, name, 'data/protagonist-pool.json + main.ts first-name split', 'protagonist internal-monologue lines');
}

// ─── 3. Choice label as rendered ──────────────────────────────────────────────
// Real SceneRunner.getChoiceViews. Maximum suffixes need: Rough Touch (N2,
// +1 community module cost), Practiced unavailable, rapport/knowledge above
// every gate, and the facility config with Fragile Kit (N6, fix cost 3) at
// the default (longer) threshold 11.

const maxEventConfig = buildEffectiveConfig(config, 'P1', 'N2');
const facilityConfig = buildEffectiveConfig(config, 'P1', 'N6');

function craftedEventState(eventId: string): GameState {
  const base = initNewGame(config, 1);
  return {
    ...base,
    activeEventId: eventId,
    eventPhase: 'arriving',
    currentStop: 1,
    stats: { knowledge: 99, consumables: 99, rapport: 6, startingRapport: 6 },
    clock: { current: 9, max: config.clockMax },
  };
}

const facilityState: GameState = (() => {
  const base = initNewGame(config, 1);
  return {
    ...base,
    stats: { knowledge: 0, consumables: 0, rapport: 0, startingRapport: 0 },
    clock: { current: 9, max: config.clockMax },
  };
})();

for (const event of eventsData) {
  for (const scene of event.scenes) {
    if (!scene.choices?.length) continue;
    const runner = runnerWithState(craftedEventState(event.id), maxEventConfig);
    for (const view of runner.getChoiceViews(scene)) {
      record(
        'choice-label',
        `${scene.id}#${view.index}`,
        view.label,
        'data/events.json + engine/scene-runner getChoiceViews',
        `event ${event.id} (category ${event.category}), Rough Touch, Practiced spent, stats above all gates`
      );
    }
  }
}
for (const scene of scenesData) {
  if (!scene.choices?.length) continue;
  const isFacility = scene.choices.some((c: Choice) => (c as { facilityAction?: string }).facilityAction);
  const runner = runnerWithState(facilityState, isFacility ? facilityConfig : maxEventConfig);
  for (const view of runner.getChoiceViews(scene)) {
    record(
      'choice-label',
      `${scene.id}#${view.index}`,
      view.label,
      'data/scenes.json + engine/scene-runner getChoiceViews',
      isFacility
        ? 'facility arrival, Fragile Kit (fix cost 3), default threshold 11, empty kit'
        : 'base scene, stats above all gates'
    );
  }
}

// ─── 4. Reward option text ────────────────────────────────────────────────────
// Real getRewardsForStop over the three clock-reduction interpolation
// regimes. The worst description is the exposure case (rapport <= -4, the
// carried no-clamp finding): the clock rises after taking the reward.

function rapportState(startingRapport: number): GameState {
  const base = initNewGame(config, 1);
  return {
    ...base,
    stats: { ...base.stats, rapport: startingRapport, startingRapport },
    clock: { current: 9, max: config.clockMax },
  };
}

const rewardStates: Array<{ label: string; state: GameState }> = [
  { label: 'rapport -5 (five harmed communities), clock 9', state: rapportState(-5) },
  { label: 'rapport -3 (three harmed), clock 9 (zero-reduction regime)', state: rapportState(-3) },
  { label: 'rapport +5 (five helped), clock 9', state: rapportState(5) },
];

for (const event of eventsData) {
  for (const reward of event.rewards) {
    record('reward-label', `${event.id}:${reward.type}`, reward.label, 'data/events.json + ui/screens reward card title', `event ${event.id} reward cycle`);
    for (const rs of rewardStates) {
      const resolved = getRewardsForStop(event, rs.state, config).find((r) => r.type === reward.type)!;
      record(
        'reward-description',
        `${event.id}:${reward.type}`,
        resolved.description,
        'data/events.json + engine/event-system getRewardsForStop',
        `${rs.label} (interpolated card body)`
      );
    }
  }
}

// ─── 5. Found document title and body ─────────────────────────────────────────

for (const doc of documentsData) {
  record('document-title', doc.id, doc.title, 'data/found-documents.json + ui/screens document overlay', 'attached event drawn, document surfaced');
  record('document-body', doc.id, doc.body, 'data/found-documents.json + ui/screens document overlay', 'attached event drawn, document surfaced');
}

// ─── 6. Comms exchange line ───────────────────────────────────────────────────
// Rendered row = resolved speaker prefix + text (main.ts onCommsInterrupt:
// protagonist keeps the RELAY-7 callsign; unknown ids uppercase).

for (const tier of commsBeatsData.commsBeats) {
  for (const beat of tier.beats) {
    for (const line of beat.lines) {
      const speaker =
        line.speaker === 'protagonist'
          ? 'RELAY-7'
          : characterNames.get(line.speaker) ?? line.speaker.toUpperCase();
      record(
        'comms-line',
        `${tier.id}/afterStop${beat.afterStop}:${line.speaker}`,
        `${speaker}: ${line.text}`,
        'data/comms-beats.json + ui/screens comms row',
        `clock in the ${tier.id} band (${tier.min}-${tier.max}) at the afterStop ${beat.afterStop} transition`
      );
    }
  }
}

// ─── 7. Ending text at maximum assembly ───────────────────────────────────────
// buildEpilogue with all five communities present, each at its own longest
// variant. Every stop's community state is independently chosen, so the
// per-community maximum combination is reachable in one run. Paragraphs do
// not interact, so per-community bests from single-community assemblies hold
// in the five-community assembly.

function epilogueDisplayedLen(ending: 'clock-failure' | 'destruction' | 'correction', communities: GameState['communities']): number {
  return displayed(buildEpilogue(ending, { ...initNewGame(config, 1), communities })).length;
}

for (const ending of ['destruction', 'correction'] as const) {
  // A run produces at most journeyStops community lines (one per visited
  // stop). Community assignment is an independent shuffle (drawEvent), so
  // ANY five of the pool can co-occur; the maximum assembly takes the five
  // communities with the longest best-variant paragraphs.
  const ranked = communitiesData
    .map((c) => {
      const best = (['helped', 'harmed', 'ignored'] as const)
        .map((state) => ({ state, len: epilogueDisplayedLen(ending, [communityAt(state, c, 1)]) }))
        .reduce((a, b) => (b.len > a.len ? b : a));
      return { community: c, variant: best.state, len: best.len };
    })
    .sort((a, b) => b.len - a.len)
    .slice(0, config.journeyStops);
  const assembled = ranked.map((r, i) => communityAt(r.variant, r.community, i + 1));
  const text = displayed(buildEpilogue(ending, { ...initNewGame(config, 1), communities: assembled }));
  record(
    'ending-epilogue',
    ending,
    text,
    'ui/screens buildEpilogue + data/communities.json',
    `${ending}; the ${config.journeyStops} communities with the longest paragraphs, each at its longest variant (${assembled.map((a) => `${a.community.name}=${a.state}`).join(', ')})`
  );
}

// Score-panel epilogue-adjacent lines: backstory line and both trait lines.
const protoLongest: ProtagonistIdentity = {
  callsign: 'RELAY-7',
  name: `${maxFirstName()} ${maxSurname()}`,
  gender: 'female',
  backstoryId: pool.backstories[0]!.id,
  positiveTrait: 'P1',
  negativeTrait: 'N1',
  station: maxStation(),
};
for (const bs of pool.backstories) {
  for (const gender of ['female', 'male'] as const) {
    for (const ending of ['correction', 'destruction'] as const) {
      const line = backstoryEpilogue({ ...protoLongest, backstoryId: bs.id, gender }, pool, ending);
      if (line) {
        record('score-backstory-line', `${bs.id}:${ending}:${gender}`, line, 'engine/chargen backstoryEpilogue + data/protagonist-pool.json', `${bs.title}, ${gender}, ${ending}; longest rolled name and station`);
      }
    }
  }
}
for (const t of POSITIVE_TRAITS) record('score-trait-line', `positive:${t.id}`, traitEpilogueLine(t.id)!, 'engine/chargen TRAIT_EPILOGUE', 'any run with this trait committed');
for (const t of NEGATIVE_TRAITS) record('score-trait-line', `negative:${t.id}`, traitEpilogueLine(t.id)!, 'engine/chargen TRAIT_EPILOGUE', 'any run with this trait committed');

// ─── 8. Score breakdown rows ──────────────────────────────────────────────────
// Six cascade rows plus the Raw score row are unconditional; the hard-cap
// note and the reroll-penalty line are conditional. Row count evaluated on a
// documented UPPER BOUND state (per-event knowledge maxima cannot stack
// across stops, so per-stop max x stops is generous), reported as such.

const perStopKnowledgeMax = Math.max(
  0,
  ...eventsData.map((e) => {
    const choiceMax = Math.max(0, ...e.scenes.flatMap((s) => (s.choices ?? []).map((c: Choice) => c.statChanges?.knowledge ?? 0)));
    const rewardMax = Math.max(0, ...e.rewards.map((r) => (r.baseEffect.knowledge ?? 0) + config.knowledgeRewardBonus));
    const docMax = (e.foundDocumentIds?.length ?? 0) > 0 ? 1 : 0;
    return choiceMax + rewardMax + docMax;
  })
);
const upperKnowledge = perStopKnowledgeMax * config.journeyStops;
const upperConsumables = config.startingConsumables + Math.max(0, ...eventsData.map((e) => Math.max(0, ...e.rewards.map((r) => (r.baseEffect.consumables ?? 0) + config.consumableRewardBonus)))) * config.journeyStops;
const upperState: GameState = {
  ...initNewGame(config, 1),
  stats: { knowledge: upperKnowledge, consumables: upperConsumables, rapport: 5, startingRapport: 5 },
  clock: { current: 0, max: config.clockMax },
  communities: communitiesData.map((c, i) => communityAt('helped', c, i + 1)),
};
const upperBreakdown = buildScoreBreakdown(upperState, config, 0);
record(
  'score-row-count',
  'ending-screen breakdown',
  'x'.repeat(upperBreakdown.components.length + 1),
  'ui/screens buildScoreBreakdownHtml + engine/scoring buildScoreBreakdown',
  `always ${upperBreakdown.components.length} cascade rows + Raw score row = ${upperBreakdown.components.length + 1}; cap note ${upperBreakdown.rawScoreClamped < upperBreakdown.rawScore ? 'PRESENT' : 'absent'} on the documented upper-bound state (raw ${upperBreakdown.rawScore} vs cap ${config.maxRawScore}); penalty line present iff rerolls > 0 (unbounded growth, two digits at 13+; harness max 8)`
);

// ─── 9. Dossier trait and backstory text ──────────────────────────────────────

const dossierColors = new Map<string, string>();
for (const bs of pool.backstories) {
  for (const gender of ['female', 'male'] as const) {
    for (const pos of POSITIVE_TRAITS) {
      for (const neg of NEGATIVE_TRAITS) {
        const p: ProtagonistIdentity = { ...protoLongest, backstoryId: bs.id, gender, positiveTrait: pos.id, negativeTrait: neg.id };
        const view = buildDossierView(p, pool, config, dossierColors, 0);
        record('dossier-backstory', `${bs.id}:${gender}`, view.backstoryFlavor, 'engine/chargen buildDossierView + data/protagonist-pool.json', `${bs.title}, ${gender}, longest rolled name and station`);
        record('dossier-backstory-label', `${bs.id}:${gender}`, `BACKSTORY — ${view.backstoryTitle}`, 'ui/screens dossier label + data/protagonist-pool.json', bs.title);
        record('dossier-trait-summary', `positive:${pos.id}`, view.positiveTrait.summary, 'engine/traits + engine/chargen traitCardView', 'any dossier showing this trait');
        record('dossier-trait-summary', `negative:${neg.id}`, view.negativeTrait.summary, 'engine/traits + engine/chargen traitCardView', 'any dossier showing this trait');
      }
    }
  }
}
record('dossier-assignment', 'constant', buildDossierView(protoLongest, pool, config, dossierColors, 0).assignment, 'engine/chargen ASSIGNMENT_LINE', 'constant on every dossier');

// ─── 10. Route stop labels ────────────────────────────────────────────────────

for (const c of communitiesData) {
  record('route-stop-label', `community:${c.id}`, c.name, 'data/communities.json + ui/hud updateTimeline', 'community assigned to its stop');
}
for (let i = 1; i <= config.journeyStops; i++) {
  record('route-stop-label', `placeholder:stop${i}`, `— STOP ${i} —`, 'ui/hud updateTimeline', 'unvisited stop before community assignment');
}

// ─── Report ───────────────────────────────────────────────────────────────────

const order = [
  'dialogue-line',
  'speaker-name',
  'choice-label',
  'reward-label',
  'reward-description',
  'document-title',
  'document-body',
  'comms-line',
  'ending-epilogue',
  'score-backstory-line',
  'score-trait-line',
  'score-row-count',
  'dossier-backstory',
  'dossier-backstory-label',
  'dossier-trait-summary',
  'dossier-assignment',
  'route-stop-label',
];

const sorted = order
  .flatMap((cls) => extremes.filter((e) => e.cls === cls))
  .concat(extremes.filter((e) => !order.includes(e.cls)));

process.stdout.write('Content extremes (longest rendered instance per string class)\n');
process.stdout.write('='.repeat(100) + '\n');
for (const e of sorted) {
  process.stdout.write(`${e.cls.padEnd(24)} ${String(e.chars).padStart(5)}  ${e.id}\n`);
  process.stdout.write(`${' '.repeat(24)} src: ${e.source}\n`);
  process.stdout.write(`${' '.repeat(24)} via: ${e.state}\n`);
}
process.stdout.write('='.repeat(100) + '\n');
process.stdout.write(JSON.stringify({ dataDir, generatedFrom: repoRoot, extremes: sorted }, null, 2) + '\n');
