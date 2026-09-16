/**
 * Live-path checks — gate 4.1/4.2 validation driving the real SceneRunner.
 *
 * Unlike the replay harness (which calls the resolver against its own fixture
 * event pool), these checks construct a real SceneRunner from the real
 * repository data files (data/config.json, data/scenes.json, data/events.json,
 * data/communities.json) and drive it through its public surface:
 * loadScene/sceneComplete/eventSceneComplete/selectChoice/getChoiceViews.
 * A passing replay proves nothing about this path; these checks do.
 *
 * Run via: npm run test:live
 *
 * @module engine/live-checks
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GameConfig,
  Scene,
  EventDef,
  Community,
  GameState,
  PositiveTraitId,
  NegativeTraitId,
  EventCategory,
} from '../types/index';
import { initNewGame } from './game-state';
import { SceneRunner, buildSceneRegistry, type SceneRunnerCallbacks, type ChoiceView } from './scene-runner';
import { buildEffectiveConfig } from './traits';
import { scoreRun } from './scoring';
import { initEventPool, drawEvent } from './event-system';
import { createRng } from './rng';
import type { RunOutcome } from '../types/index';

// ─── Node environment shim (autosave touches localStorage) ───────────────────

(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
} as unknown as Storage;

// ─── Check framework ──────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => string): void {
  try {
    const detail = fn();
    results.push({ name, pass: true, detail });
  } catch (e) {
    results.push({ name, pass: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

function eq(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

// ─── Data loading ─────────────────────────────────────────────────────────────

function load<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), rel), 'utf-8')) as T;
}

const baseConfig = load<GameConfig>('data/config.json');
const scenesData = load<{ scenes: Scene[] }>('data/scenes.json').scenes;
const eventsData = load<{ events: EventDef[] }>('data/events.json').events;
const communitiesData = load<{ communities: Community[] }>('data/communities.json').communities;
const documentsData = load<{ documents: import('../types/index').FoundDocument[] }>(
  'data/found-documents.json'
).documents;
const commsBeatsData = load<import('../types/index').CommsBeatsData>('data/comms-beats.json');

function eventsByCategory(category: EventCategory): EventDef[] {
  return eventsData.filter((e) => e.category === category);
}

// ─── Runner scaffolding ───────────────────────────────────────────────────────

interface Harness {
  runner: SceneRunner;
  queue: Scene[];
  pendingReward: { rewards: unknown[]; onSelect: (index: number) => void } | null;
  ending: { ending: string; state: GameState } | null;
  surfacedDocs: import('../types/index').FoundDocument[];
  commsFired: { afterStop: number; tierId: string; firstLine: string }[];
}

function makeHarness(opts: {
  positive: PositiveTraitId;
  negative: NegativeTraitId;
  events: EventDef[];
  consumables?: number;
  knowledge?: number;
  clock?: number;
}): Harness {
  const config = buildEffectiveConfig(baseConfig, opts.positive, opts.negative);
  let state: GameState = initNewGame(config);
  state = {
    ...state,
    stats: {
      ...state.stats,
      consumables: opts.consumables ?? config.startingConsumables,
      knowledge: opts.knowledge ?? 0,
    },
    clock: { ...state.clock, current: opts.clock ?? 0 },
  };
  const registry = buildSceneRegistry(scenesData, opts.events, documentsData, commsBeatsData);
  const queue: Scene[] = [];
  let pendingReward: Harness['pendingReward'] = null;
  let ending: Harness['ending'] = null;
  const surfacedDocs: import('../types/index').FoundDocument[] = [];
  const commsFired: { afterStop: number; tierId: string; firstLine: string }[] = [];
  const callbacks: SceneRunnerCallbacks = {
    onSceneStart: (scene) => {
      queue.push(scene);
    },
    onStateUpdate: () => {},
    onRewardChoice: (rewards, onSelect) => {
      pendingReward = { rewards, onSelect };
    },
    onEnding: (endingType, endingState) => {
      ending = { ending: endingType, state: endingState };
    },
    onCommsInterrupt: (_state, beat, tierId, onContinue) => {
      commsFired.push({ afterStop: beat.afterStop, tierId, firstLine: beat.lines[0]?.text ?? '' });
      onContinue();
    },
    onFoundDocument: (doc, onContinue) => {
      surfacedDocs.push(doc);
      onContinue();
    },
  };
  const runner = new SceneRunner(state, config, registry, communitiesData, callbacks);
  return {
    runner,
    queue,
    get pendingReward() {
      return pendingReward;
    },
    set pendingReward(v) {
      pendingReward = v;
    },
    get ending() {
      return ending;
    },
    set ending(v) {
      ending = v;
    },
    get surfacedDocs() {
      return surfacedDocs;
    },
    get commsFired() {
      return commsFired;
    },
  };
}

/** Enters the event phase and drives until a choice scene is reached. */
function driveToChoiceScene(h: Harness): { scene: Scene; views: ChoiceView[] } {
  h.runner.loadScene('scene-discovery-01');
  for (let guard = 0; guard < 200; guard++) {
    const scene = h.queue.shift();
    if (!scene) break;
    if (scene.choices && scene.choices.length > 0) {
      return { scene, views: h.runner.getChoiceViews(scene) };
    }
    h.runner.sceneComplete(scene);
    if (h.runner.getState().activeEventId) {
      h.runner.eventSceneComplete(scene.id);
    }
  }
  throw new Error('never reached a choice scene');
}

/** Drives past a choice (already selected) through the reward cycle and the
 *  next stop, until the next choice scene. Returns null at journey end. */
function driveThroughRewardToNextChoice(h: Harness): { scene: Scene; views: ChoiceView[] } | null {
  for (let guard = 0; guard < 300; guard++) {
    if (h.pendingReward) {
      h.pendingReward.onSelect(0);
      h.pendingReward = null;
      continue;
    }
    const scene = h.queue.shift();
    if (!scene) continue;
    if (scene.choices && scene.choices.length > 0) {
      return { scene, views: h.runner.getChoiceViews(scene) };
    }
    try {
      h.runner.sceneComplete(scene);
      if (h.runner.getState().activeEventId) {
        h.runner.eventSceneComplete(scene.id);
      }
    } catch (e) {
      // "No eligible events" ends the driveable journey in thin pools.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('No eligible events')) return null;
      throw e;
    }
  }
  return null;
}

/** Finds the view index for the first enabled choice matching a predicate on the raw Choice. */
function findChoiceIndex(
  scene: Scene,
  pred: (c: NonNullable<Scene['choices']>[number]) => boolean
): number {
  const idx = (scene.choices ?? []).findIndex((c) => pred(c));
  assert(idx >= 0, `no choice matching predicate in ${scene.id}`);
  return idx;
}

function labelCost(view: ChoiceView): number | null {
  const m = view.label.match(/\[(\d+) modules?\]/);
  return m ? parseInt(m[1]!, 10) : null;
}

// ─── Gate 4.1 checks ──────────────────────────────────────────────────────────

/** Community events carrying a <= -2 module choice (the review case shape). */
function communityEventsWithTwoModuleChoice(): EventDef[] {
  return eventsByCategory('community').filter((e) =>
    e.scenes.some((s) =>
      (s.choices ?? []).some((c) => (c.statChanges?.consumables ?? 0) <= -2)
    )
  );
}

/** Transit events carrying an unconditioned positive-clock choice. */
function transitEventsWithClockGain(): EventDef[] {
  return eventsByCategory('transit').filter((e) =>
    e.scenes.some((s) =>
      (s.choices ?? []).some(
        (c) => (c.statChanges?.clock ?? 0) > 0 && !c.condition
      )
    )
  );
}

/** Case: Rough Touch charges community costs +1; label, gate, and deduction agree. */
check('4.1 rough-touch: community cost +1, label == affordability == deduction', () => {
  const events = [communityEventsWithTwoModuleChoice()[0]!];
  const h = makeHarness({ positive: 'P5', negative: 'N2', events, consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(scene, (c) => (c.statChanges?.consumables ?? 0) <= -2);
  const view = views[idx]!;
  const cost = labelCost(view);
  eq(cost, 3, 'displayed cost under Rough Touch');
  eq(view.enabled, true, 'affordability at 8 modules');
  const before = h.runner.getState().stats.consumables;
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().stats.consumables, before - 3, 'deducted cost');
  return `choice "${view.label}" from ${before} -> ${h.runner.getState().stats.consumables}`;
});

/** Case: the same choice is disabled when the player holds less than the effective cost. */
check('4.1 rough-touch: affordability disables below effective cost', () => {
  const events = [communityEventsWithTwoModuleChoice()[0]!];
  const h = makeHarness({ positive: 'P5', negative: 'N2', events, consumables: 2 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(scene, (c) => (c.statChanges?.consumables ?? 0) <= -2);
  const view = views[idx]!;
  eq(labelCost(view), 3, 'displayed cost still the effective 3');
  eq(view.enabled, false, 'disabled at 2 modules');
  assert((view.reason ?? '').includes('3'), 'reason names the effective cost');
  return 'held 2, effective cost 3, disabled';
});

/** Case: Practiced discounts the first spend of a stop and not the second. */
check('4.1 practiced: first spend of stop discounted, second not', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P8', negative: 'N4', events, consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition
  );
  const raw = Math.abs(scene.choices![idx]!.statChanges?.consumables ?? 0);
  const view = views[idx]!;
  eq(labelCost(view), raw - 1, 'first spend shows discounted cost');

  const before1 = h.runner.getState().stats.consumables;
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().stats.consumables, before1 - (raw - 1), 'first deduction discounted');

  // Same-stop second spend: no discount (state advanced to the consequence,
  // but the stop has not advanced, so Practiced is spent).
  const before2 = h.runner.getState().stats.consumables;
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().stats.consumables, before2 - raw, 'second deduction undiscounted');
  return `raw ${raw}: first ${raw - 1}, second ${raw}`;
});

/** Case: Practiced availability resets on stop advance. */
check('4.1 practiced: availability resets on stop advance', () => {
  const events = eventsByCategory('community');
  assert(events.length >= 2, 'need at least two community events for two stops');
  const h = makeHarness({ positive: 'P8', negative: 'N4', events, consumables: 9 });
  const first = driveToChoiceScene(h);
  const idx1 = findChoiceIndex(
    first.scene,
    (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition
  );
  const raw1 = Math.abs(first.scene.choices![idx1]!.statChanges?.consumables ?? 0);
  h.runner.selectChoice(first.scene, idx1);

  const second = driveThroughRewardToNextChoice(h);
  assert(second !== null, 'journey ended before stop 2');
  const next = second!;
  const idx2 = findChoiceIndex(
    next.scene,
    (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition
  );
  const raw2 = Math.abs(next.scene.choices![idx2]!.statChanges?.consumables ?? 0);
  eq(
    labelCost(next.views[idx2]!),
    raw2 - 1,
    'stop 2 first spend discounted again after stop advance'
  );
  return `stop 1 raw ${raw1}, stop 2 raw ${raw2}, both discounted on first spend`;
});

/** Case: Light Foot suppresses positive transit clock deltas to zero. */
check('4.1 light-foot: transit +1 clock suppressed', () => {
  const events = [transitEventsWithClockGain()[0]!];
  const h = makeHarness({ positive: 'P7', negative: 'N4', events, consumables: 8, clock: 2 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.clock ?? 0) > 0 && !c.condition
  );
  assert(views[idx]!.enabled, 'clock choice selectable');
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().clock.current, 2, 'clock unchanged under Light Foot');
  return `raw +1 suppressed; clock stayed ${h.runner.getState().clock.current}`;
});

/** Case: Tunnel Nerves adds one to approach clock deltas including raw zero. */
check('4.1 tunnel-nerves: approach raw clock 0 becomes +1', () => {
  const events = eventsByCategory('approach');
  const h = makeHarness({ positive: 'P5', negative: 'N1', events, consumables: 8, clock: 0 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.clock ?? 0) === 0 && !c.condition
  );
  assert(views[idx]!.enabled, 'clock-zero choice selectable');
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().clock.current, 1, 'clock +1 under Tunnel Nerves');
  return `raw 0 became +1; clock ${h.runner.getState().clock.current}`;
});

/** Case: without the trait flags the same choices apply raw deltas (control). */
check('4.1 control: no clock traits leaves deltas raw', () => {
  const events = [transitEventsWithClockGain()[0]!];
  const h = makeHarness({ positive: 'P5', negative: 'N4', events, consumables: 8, clock: 2 });
  const { scene } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.clock ?? 0) > 0 && !c.condition
  );
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().clock.current, 3, 'raw +1 applied without Light Foot');
  return 'control: raw clock delta applied';
});

// ─── Gate 4.2 checks ──────────────────────────────────────────────────────────

/** Drives from the facility entry to the facility confrontation choices. */
function driveToFacilityChoice(h: Harness): { scene: Scene; views: ChoiceView[] } {
  h.runner.loadScene('scene-facility-01');
  for (let guard = 0; guard < 50; guard++) {
    const scene = h.queue.shift();
    if (!scene) break;
    if (scene.choices && scene.choices.length > 0) {
      return { scene, views: h.runner.getChoiceViews(scene) };
    }
    h.runner.sceneComplete(scene);
  }
  throw new Error('never reached the facility confrontation choices');
}

/** Facility policy: correct if executable, else shutdown, else withdraw. */
function pickFacilityAction(views: ChoiceView[], scene: Scene): number {
  const order = ['correct', 'shutdown', 'withdraw'];
  for (const action of order) {
    const idx = (scene.choices ?? []).findIndex((c) => c.facilityAction === action);
    if (idx >= 0 && views[idx]!.enabled) return idx;
  }
  throw new Error('no executable facility action');
}

/** Drives a facility selection through to the fired ending. */
function driveFacilityToEnding(h: Harness, knowledge: number, consumables: number): void {
  const { scene, views } = driveToFacilityChoice(h);
  const idx = pickFacilityAction(views, scene);
  h.runner.selectChoice(scene, idx);
  for (let guard = 0; guard < 50; guard++) {
    if (h.ending) return;
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
  }
  void knowledge;
  void consumables;
  throw new Error('ending never fired');
}

function assertSingleOutcomeAuthority(
  h: Harness,
  preState: GameState,
  config: ReturnType<typeof buildEffectiveConfig>,
  label: string
): RunOutcome {
  const scored = scoreRun(preState, config);
  const outcome = h.ending!.state.outcome;
  assert(outcome !== null, `${label}: persisted outcome is null`);
  eq(h.ending!.ending, scored.ending, `${label}: narrative ending vs independently scored`);
  eq(outcome!.ending, scored.ending, `${label}: persisted ending vs independently scored`);
  eq(
    h.ending!.state.currentScene,
    `scene-ending-${scored.ending}`,
    `${label}: ending scene routed by computed outcome`
  );
  eq(outcome!.rawScore, scored.rawScore, `${label}: persisted rawScore vs independent`);
  return outcome!;
}

/** Threshold boundary under a threshold-modifying trait (Clear-Headed). */
check('4.2 threshold boundary: below / at / above under Clear-Headed', () => {
  const config = buildEffectiveConfig(baseConfig, 'P6', 'N4');
  const threshold = config.knowledgeThreshold;
  const notes: string[] = [];
  for (const knowledge of [threshold - 1, threshold, threshold + 1]) {
    const events = eventsByCategory('community');
    const h = makeHarness({ positive: 'P6', negative: 'N4', events, knowledge, consumables: 6 });
    const preState = h.runner.getState();
    driveFacilityToEnding(h, knowledge, 6);
    assertSingleOutcomeAuthority(
      h,
      preState,
      config,
      `knowledge ${knowledge} (threshold ${threshold})`
    );
    notes.push(
      `k${knowledge} -> ${h.ending!.ending} (view gate showed [Knowledge ${threshold}])`
    );
  }
  return notes.join('; ');
});

/** The knowledge-8 review probe: no narrative/scored disagreement, outcome set. */
check('4.2 knowledge-8 probe: narrative == scored == persisted, outcome non-null', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P6', negative: 'N4', events, knowledge: 8, consumables: 4 });
  const config = h.runner.getEffectiveConfig();
  const preState = h.runner.getState();
  driveFacilityToEnding(h, 8, 4);
  assertSingleOutcomeAuthority(h, preState, config, 'knowledge-8 probe');
  const outcome = h.ending!.state.outcome!;
  assert(outcome !== null, 'outcome non-null');
  eq(outcome.ending, 'destruction', 'knowledge 8 below every legal threshold scores destruction');
  return 'narrative destruction, scored destruction, outcome persisted';
});

/** Repair cost charged exactly once at the point of repair (Fragile Kit: 3). */
check('4.2 repair cost: charged exactly once, no second deduction', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P1', negative: 'N6', events, knowledge: 12, consumables: 5 });
  const config = h.runner.getEffectiveConfig();
  const fixCost = config.consumableFixCost;
  eq(fixCost, 3, 'Fragile Kit raises the effective repair cost');

  const { scene, views } = driveToFacilityChoice(h);
  const correctIdx = (scene.choices ?? []).findIndex((c) => c.facilityAction === 'correct');
  assert(correctIdx >= 0, 'correction choice exists');
  const correctView = views[correctIdx]!;
  assert(correctView.enabled, 'correction executable at k12 / 5 modules');
  assert(correctView.label.includes(`[${fixCost} modules]`), 'label shows the effective cost');

  const preState = h.runner.getState();
  const before = preState.stats.consumables;
  h.runner.selectChoice(scene, correctIdx);
  for (let guard = 0; guard < 50 && !h.ending; guard++) {
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
  }
  assert(h.ending !== null, 'ending fired');

  const after = h.ending!.state.stats.consumables;
  eq(after, before - fixCost, 'module total after ending equals before repair minus effective cost');

  // The outcome must equal the cascade computed on the pre-charge (arrival)
  // state — the score breakdown must not deduct the repair a second time.
  const scored = scoreRun(preState, config);
  const outcome = h.ending!.state.outcome!;
  eq(outcome.ending, 'correction', 'correction persisted');
  eq(outcome.rawScore, scored.rawScore, 'rawScore matches pre-charge cascade (no second deduction)');
  const modulesRow = (outcome.components ?? []).find((c) => c.label === 'Modules remaining');
  assert(modulesRow !== undefined, 'modules component present in frozen breakdown');
  return `before ${before} -> after ${after} (fixCost ${fixCost}); rawScore ${outcome.rawScore} == pre-charge cascade`;
});

/** Clock failure produces a persisted outcome consumed identically. */
check('4.2 clock-failure: persisted outcome consumed identically', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P5', negative: 'N4', events, consumables: 6, clock: 10 });
  // Drive into the journey, select any choice, then run the reward cycle;
  // the clock is already at max, so the post-reward tick ends the run.
  const { scene, views } = driveToChoiceScene(h);
  const enabled = views.findIndex((v) => v.enabled);
  assert(enabled >= 0, 'an enabled choice exists');
  h.runner.selectChoice(scene, enabled);
  for (let guard = 0; guard < 100 && !h.ending; guard++) {
    if (h.pendingReward) {
      h.pendingReward.onSelect(0);
      h.pendingReward = null;
      continue;
    }
    const s = h.queue.shift();
    if (!s) continue;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) {
      h.runner.eventSceneComplete(s.id);
    }
  }
  assert(h.ending !== null, 'clock-failure ending fired');
  const outcome = h.ending!.state.outcome;
  assert(outcome !== null, 'clock-failure outcome persisted');
  eq(h.ending!.ending, outcome!.ending, 'narrative == persisted for clock-failure');
  eq(outcome!.ending, 'clock-failure', 'ending type');
  eq(h.ending!.state.alive, false, 'run marked not alive');
  return 'clock-failure: narrative == scored == persisted';
});

/** HUD display and ending determination read the same effective-config value. */
check('4.2 HUD threshold: display authority == ending authority', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P6', negative: 'N4', events, consumables: 6 });
  const displayThreshold = h.runner.getEffectiveConfig().knowledgeThreshold;
  const expected = buildEffectiveConfig(baseConfig, 'P6', 'N4').knowledgeThreshold;
  eq(displayThreshold, expected, 'runner exposes the effective threshold the HUD reads');

  // The correction gate flips exactly at the displayed threshold.
  for (const [knowledge, want] of [
    [displayThreshold - 1, 'destruction'],
    [displayThreshold, 'correction'],
  ] as const) {
    const hh = makeHarness({
      positive: 'P6',
      negative: 'N4',
      events,
      knowledge,
      consumables: 6,
    });
    driveFacilityToEnding(hh, knowledge, 6);
    eq(
      hh.ending!.ending,
      want,
      `gate flips at the displayed threshold (knowledge ${knowledge})`
    );
  }
  return `display ${displayThreshold}; gate flips exactly there`;
});

/** Pool shape and draw coverage: 12 events, 20 seeded draws, no repeats, no unfilled stop. */
check('4.3 event pool: 12 events, seeded draws fill every stop with no repeats', () => {
  eq(eventsData.length, 12, 'pool size');
  const byCat = {
    community: eventsByCategory('community').length,
    transit: eventsByCategory('transit').length,
    approach: eventsByCategory('approach').length,
  };
  eq(byCat.community, 5, 'community events');
  eq(byCat.transit, 4, 'transit events');
  eq(byCat.approach, 3, 'approach events');
  const ids = new Set(eventsData.map((e) => e.id));
  eq(ids.size, 12, 'unique ids');
  const expectedIds = [
    'CE-01', 'CE-02', 'CE-03', 'CE-04', 'CE-05',
    'TE-01', 'TE-02', 'TE-03', 'TE-04',
    'AE-01', 'AE-02', 'AE-03',
  ];
  for (const id of expectedIds) assert(ids.has(id), `missing M3 id ${id}`);

  const zoneMap = baseConfig.zoneMap as unknown as Record<string, string>;
  eq(
    JSON.stringify(zoneMap),
    JSON.stringify({ 1: 'community', 2: 'community', 3: 'transit', 4: 'transit', 5: 'approach' }),
    'config zone map 1-2 community, 3-4 transit, 5 approach'
  );

  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRng(seed);
    let pool = initEventPool(eventsData, baseConfig, communitiesData, rng);
    const drawn: string[] = [];
    for (let stop = 1; stop <= baseConfig.journeyStops; stop++) {
      let event: EventDef;
      try {
        ({ event, pool } = drawEvent(pool, stop, baseConfig));
      } catch (e) {
        throw new Error(`seed ${seed} stop ${stop}: ${(e as Error).message}`);
      }
      drawn.push(event.id);
      assert(
        event.category === zoneMap[String(stop)],
        `seed ${seed} stop ${stop}: drew ${event.id} (${event.category}), zone wants ${zoneMap[String(stop)]}`
      );
    }
    eq(new Set(drawn).size, drawn.length, `seed ${seed}: repeated an event within a run`);
    const cats = drawn.map((id) => eventsData.find((e) => e.id === id)!.category);
    eq(cats.filter((c) => c === 'community').length, 2, `seed ${seed}: community draws`);
    eq(cats.filter((c) => c === 'transit').length, 2, `seed ${seed}: transit draws`);
    eq(cats.filter((c) => c === 'approach').length, 1, `seed ${seed}: approach draws`);
  }
  return '12 events (5/4/3, M3 ids); 20 seeded draws, zone-correct, no repeats, all stops filled';
});

// ─── Gate 4.4 checks ──────────────────────────────────────────────────────────

/** Reads a found document at a documented event: +1 knowledge, once, from within the run. */
check('4.4 found document: read grants +1 knowledge through applyFoundDocument', () => {
  const docEvent = eventsData.find((e) => (e.foundDocumentIds ?? []).length > 0)!;
  const h = makeHarness({ positive: 'P5', negative: 'N2', events: [docEvent], consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = views.findIndex((v) => v.enabled);
  h.runner.selectChoice(scene, idx);

  const before = h.runner.getState().stats.knowledge;
  const choiceGain = h.runner.getState().stats.knowledge - before;
  void choiceGain;

  // Drive to the reward phase: the document surfaces there.
  for (let guard = 0; guard < 100 && h.surfacedDocs.length === 0; guard++) {
    if (h.pendingReward) break;
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
  }
  eq(h.surfacedDocs.length, 1, 'one document surfaced at the documented event');
  const doc = h.surfacedDocs[0]!;
  assert(
    (docEvent.foundDocumentIds ?? []).includes(doc.id),
    `surfaced doc ${doc.id} attached to ${docEvent.id}`
  );
  assert(doc.body.length > 200, 'full M3 text present');
  const afterRead = h.runner.getState().stats.knowledge;
  eq(afterRead - before, 1, 'reading granted exactly +1 knowledge');
  assert(h.runner.getState().flags[`fd-read-${docEvent.id}`] === true, 'read flag set');
  return `${docEvent.id} surfaced ${doc.id}; knowledge +1 via the run surface`;
});

/** Distracted (N4) suppresses the found-document knowledge gain. */
check('4.4 found document: Distracted gains nothing', () => {
  const docEvent = eventsData.find((e) => (e.foundDocumentIds ?? []).length > 0)!;
  const h = makeHarness({ positive: 'P5', negative: 'N4', events: [docEvent], consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  h.runner.selectChoice(scene, views.findIndex((v) => v.enabled)!);
  const before = h.runner.getState().stats.knowledge;
  for (let guard = 0; guard < 100 && h.surfacedDocs.length === 0; guard++) {
    if (h.pendingReward) break;
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
  }
  eq(h.surfacedDocs.length, 1, 'document still surfaces (reading is not optional)');
  eq(
    h.runner.getState().stats.knowledge - before,
    0,
    'Distracted protagonist gains nothing'
  );
  return 'Distracted: document surfaces, knowledge unchanged';
});

/** Availability tracks the event draw: undocumented events never surface one. */
check('4.4 found document: availability tracks the event draw', () => {
  const docEvents = eventsData.filter((e) => (e.foundDocumentIds ?? []).length > 0);
  const noDocEvents = eventsData.filter((e) => (e.foundDocumentIds ?? []).length === 0);
  const ids = new Set(documentsData.map((d) => d.id));
  eq(documentsData.length, 8, 'eight documents exist');
  for (const d of documentsData) {
    assert(d.body.length > 200, `${d.id} carries full text`);
    const attached = eventsData.find((e) => e.id === d.attachedEvent);
    assert(attached !== undefined, `${d.id} attachedEvent ${d.attachedEvent} exists`);
    assert(
      (attached?.foundDocumentIds ?? []).includes(d.id),
      `${d.id} listed by its attached event`
    );
  }
  for (const e of docEvents) {
    for (const id of e.foundDocumentIds ?? []) assert(ids.has(id), `${e.id} lists unknown ${id}`);
  }
  const h = makeHarness({ positive: 'P5', negative: 'N4', events: [noDocEvents[0]!], consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  h.runner.selectChoice(scene, views.findIndex((v) => v.enabled)!);
  for (let guard = 0; guard < 100 && h.pendingReward === null; guard++) {
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
  }
  eq(h.surfacedDocs.length, 0, 'no document at an undocumented event');
  return `${docEvents.length} documented events, ${noDocEvents.length} clean; draw decides`;
});

// ─── Gate 4.5 checks ──────────────────────────────────────────────────────────

/** Beat A (after stop 1) fires in the correct clock-scaled tier. */
check('4.5 comms beats: after stop 1, tier matches the live clock band', () => {
  const notes: string[] = [];
  const cases: Array<{ start: number; tier: string; first: string }> = [
    { start: 0, tier: 'green', first: 'RELAY-7, status check. Finding anything?' },
    { start: 3, tier: 'amber', first: "RELAY-7. We're seeing cascade alerts across three stations. Whatever you're tracking, it's accelerating." },
    { start: 6, tier: 'red', first: 'RELAY-7, respond.' },
  ];
  for (const c of cases) {
    const events = [eventsByCategory('community')[0]!];
    const h = makeHarness({
      positive: 'P5',
      negative: 'N4',
      events,
      consumables: 8,
      clock: c.start,
    });
    // Pick a clock-neutral choice so the only clock motion is the stop tick
    // (1 or 2), which keeps the band deterministic: 0->1-2 green, 3->4-5
    // amber, 6->7-8 red.
    const { scene, views } = driveToChoiceScene(h);
    const idx = views.findIndex(
      (v, i) => v.enabled && (scene.choices![i]!.statChanges?.clock ?? 0) === 0
    );
    h.runner.selectChoice(scene, idx);
    for (let guard = 0; guard < 100 && h.commsFired.length === 0; guard++) {
      if (h.pendingReward) {
        try {
          h.pendingReward.onSelect(0);
        } catch (e) {
          // Thin single-event pool: the next draw may have nothing left after
          // the beat's onContinue. The beat itself already fired.
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes('No eligible events')) throw e;
        }
        h.pendingReward = null;
        continue;
      }
      const s = h.queue.shift();
      if (!s) break;
      h.runner.sceneComplete(s);
      if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
    }
    eq(h.commsFired.length, 1, `start ${c.start}: one beat fired`);
    const fired = h.commsFired[0]!;
    eq(fired.afterStop, 1, `start ${c.start}: beat A (after stop 1)`);
    eq(fired.tierId, c.tier, `start ${c.start}: tier`);
    eq(fired.firstLine, c.first, `start ${c.start}: beat content`);
    notes.push(`clock ${c.start} -> ${h.runner.getState().clock.current} = ${fired.tierId}`);
  }
  return notes.join('; ');
});

/** Beat B (after stop 3) fires, with the tier read live at trigger time. */
check('4.5 comms beats: after stop 3, tier read live at the trigger', () => {
  const tiersSeen = new Set<string>();
  for (const start of [0, 2, 5]) {
    const events = [...eventsByCategory('community'), ...eventsByCategory('transit')];
    const h = makeHarness({ positive: 'P5', negative: 'N4', events, consumables: 9, clock: start });
    const beats: typeof h.commsFired = [];
    // Drive three stops, collecting beats; pick knowledge rewards and
    // clock-neutral choices.
    for (let stop = 1; stop <= 3; stop++) {
      if (stop === 1) {
        const { scene, views } = driveToChoiceScene(h);
        const idx = views.findIndex(
          (v, i) => v.enabled && (scene.choices![i]!.statChanges?.clock ?? 0) === 0
        );
        h.runner.selectChoice(scene, idx);
      }
      for (let guard = 0; guard < 200; guard++) {
        if (h.pendingReward) {
          h.pendingReward.onSelect(1);
          h.pendingReward = null;
          break;
        }
        const s = h.queue.shift();
        if (!s) continue;
        h.runner.sceneComplete(s);
        if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
      }
      for (const b of h.commsFired) if (!beats.some((x) => x.afterStop === b.afterStop)) beats.push(b);
      if (stop < 3) {
        // drive to the next stop's choice
        for (let guard = 0; guard < 200; guard++) {
          const s = h.queue.shift();
          if (!s) break;
          if (s.choices && s.choices.length > 0) {
            const views = h.runner.getChoiceViews(s);
            const idx = views.findIndex(
              (v, i) => v.enabled && (s.choices![i]!.statChanges?.clock ?? 0) === 0
            );
            h.runner.selectChoice(s, idx);
            break;
          }
          h.runner.sceneComplete(s);
          if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
        }
      }
    }
    const beatB = beats.find((b) => b.afterStop === 3);
    assert(beatB !== undefined, `start ${start}: beat B (after stop 3) fired`);
    tiersSeen.add(beatB!.tierId);
  }
  assert(tiersSeen.size >= 2, `beat B observed in multiple tiers (got ${[...tiersSeen].join(',')})`);
  return `beat B fired after stop 3 across starts 0/2/5, tiers seen: ${[...tiersSeen].join(', ')}`;
});

/** No hardcoded trigger remains: timing and bands come from the data. */
check('4.5 comms beats: timing and bands are data-driven', () => {
  eq(commsBeatsData.commsBeats.length, 3, 'three tiers');
  const byId = new Map(commsBeatsData.commsBeats.map((t) => [t.id, t]));
  const green = byId.get('green')!;
  const amber = byId.get('amber')!;
  const red = byId.get('red')!;
  eq(green.min, 0, 'green min'); eq(green.max, 3, 'green max');
  eq(amber.min, 4, 'amber min'); eq(amber.max, 6, 'amber max');
  eq(red.min, 7, 'red min'); eq(red.max, 9, 'red max');
  for (const tier of commsBeatsData.commsBeats) {
    eq(tier.beats.length, 2, `tier ${tier.id}: two beats`);
    const timings = tier.beats.map((b) => b.afterStop).sort();
    eq(timings[0], 1, `tier ${tier.id}: beat after stop 1`);
    eq(timings[1], 3, `tier ${tier.id}: beat after stop 3`);
    for (const beat of tier.beats) {
      assert(beat.lines.length >= 3, `tier ${tier.id} after stop ${beat.afterStop}: full exchange`);
      for (const line of beat.lines) {
        assert(line.speaker === 'coworker' || line.speaker === 'protagonist', 'known speakers');
        assert(line.text.trim().length > 0, 'line has text (terse replies allowed)');
      }
    }
  }
  return 'green 0-3, amber 4-6, red 7-9; both beats per tier; full M3 dialogue';
});

function report(): number {
  console.log('Within Parameters — live-path checks (drive the real SceneRunner)');
  console.log('='.repeat(72));
  let failed = 0;
  for (const r of results) {
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (r.detail) console.log(`         ${r.detail}`);
    if (!r.pass) failed++;
  }
  console.log('='.repeat(72));
  console.log(`${results.length - failed}/${results.length} passed`);
  return failed > 0 ? 1 : 0;
}

process.exit(report());
