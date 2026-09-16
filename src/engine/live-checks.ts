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

function eventsByCategory(category: EventCategory): EventDef[] {
  return eventsData.filter((e) => e.category === category);
}

// ─── Runner scaffolding ───────────────────────────────────────────────────────

interface Harness {
  runner: SceneRunner;
  queue: Scene[];
  pendingReward: { rewards: unknown[]; onSelect: (index: number) => void } | null;
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
  const registry = buildSceneRegistry(scenesData, opts.events);
  const queue: Scene[] = [];
  let pendingReward: Harness['pendingReward'] = null;
  const callbacks: SceneRunnerCallbacks = {
    onSceneStart: (scene) => {
      queue.push(scene);
    },
    onStateUpdate: () => {},
    onRewardChoice: (rewards, onSelect) => {
      pendingReward = { rewards, onSelect };
    },
    onEnding: () => {},
    onCommsInterrupt: (_state, onContinue) => {
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

/** Case: Rough Touch charges community costs +1; label, gate, and deduction agree. */
check('4.1 rough-touch: community cost +1, label == affordability == deduction', () => {
  const events = eventsByCategory('community');
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
  const events = eventsByCategory('community');
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
  const events = eventsByCategory('transit');
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
  const events = eventsByCategory('transit');
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

// ─── Report ───────────────────────────────────────────────────────────────────

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
